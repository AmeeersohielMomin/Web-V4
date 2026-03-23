import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import {
  loadScriptWithFallback,
  CDN_BABEL, CDN_REACT, CDN_REACT_DOM, CDN_TAILWIND,
  CDN_VUE, CDN_VUE_COMPILER,
  PREVIEW_MSG, PREVIEW_DEBOUNCE_MS, PREVIEW_INIT_TIMEOUT_MS,
  debounce,
  detectStack, selectEntryFile, getBasePreviewCSS,
  type PreviewStack,
} from '../../lib/previewUtils';

/**
 * PreviewRunner - Stable iframe runtime for AI-generated frontend files.
 * Compiles TS/JSX modules with Babel and executes them in a controlled CommonJS sandbox.
 */
export default function PreviewRunner() {
  type PreviewFile = { path: string; content: string };
  type PreviewMessage = {
    type?: string;
    code?: string;
    files?: PreviewFile[];
    filePath?: string;
  };

  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // Track which stack this preview session is running
  let currentStack: PreviewStack = 'unknown';
  // Track which Vue CDN libs loaded (only relevant for Vue stack)
  let vueLoaded = false;
  const containerRef = useRef<HTMLDivElement>(null);
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<any>(null);
  const isReadyRef = useRef(false);
  const pendingMessageRef = useRef<PreviewMessage | null>(null);

  useEffect(() => {
    const loadScript = (id: string, src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${id}`));
        document.head.appendChild(script);
      });
    };

    const normalizePath = (input: string): string => {
      const normalized = input.replace(/\\/g, '/').replace(/^\.\//, '');
      const parts = normalized.split('/');
      const stack: string[] = [];

      for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (stack.length > 0) stack.pop();
          continue;
        }
        stack.push(part);
      }

      return stack.join('/');
    };

    const dirname = (path: string): string => {
      const normalized = normalizePath(path);
      const idx = normalized.lastIndexOf('/');
      return idx === -1 ? '' : normalized.slice(0, idx);
    };

    const resolveImportPath = (importerPath: string, request: string): string => {
      if (!request.startsWith('.')) return normalizePath(request);
      const importerDir = dirname(importerPath);
      return normalizePath(`${importerDir}/${request}`);
    };

    const getRuntime = () => {
      const Babel = (window as any).Babel;
      const ReactRuntime = (window as any).React;
      const ReactDOMRuntime = (window as any).ReactDOM;
      return { Babel, ReactRuntime, ReactDOMRuntime };
    };

    let reactUseContextPatched = false;
    const previewContextFallback = {
      user: {
        id: 'preview-user',
        name: 'Preview User',
        email: 'preview@example.com'
      },
      token: 'preview-token',
      loading: false,
      isAuthenticated: true,
      login: () => {},
      signup: async () => ({ success: true }),
      logout: () => {},
      refreshAuth: async () => ({ success: true })
    };

    const ensureSafeUseContext = (ReactRuntime: any) => {
      if (reactUseContextPatched || typeof ReactRuntime?.useContext !== 'function') return;

      const originalUseContext = ReactRuntime.useContext.bind(ReactRuntime);
      ReactRuntime.useContext = (context: any) => {
        if (!context || (typeof context !== 'object' && typeof context !== 'function')) {
          return previewContextFallback;
        }

        try {
          return originalUseContext(context);
        } catch (err: any) {
          const message = err?.message || '';
          if (message.includes('_context')) {
            console.warn('[PreviewEngine] Invalid context object passed to useContext; using fallback context value.');
            return previewContextFallback;
          }
          throw err;
        }
      };

      reactUseContextPatched = true;
    };

    const moduleCache = new Map<string, any>();

    const createConstructableMockComponent = (
      ReactRuntime: any,
      renderer: (props: any) => any,
      displayName: string
    ) => {
      function MockComponent(props: any) {
        return renderer(props);
      }
      (MockComponent as any).displayName = displayName;
      return MockComponent;
    };

    const createMockModule = (ReactRuntime: any, moduleName: string) => {
      return new Proxy(
        {},
        {
          get: (_, key) => {
            if (key === '__esModule') return true;
            if (key === 'default') {
              return createConstructableMockComponent(
                ReactRuntime,
                (props: any) =>
                ReactRuntime.createElement(
                  'div',
                  {
                    ...props,
                    className: `${props?.className || ''} rounded border border-zinc-600 bg-zinc-900/70 px-2 py-1 text-[10px] text-zinc-300`
                  },
                  `Mock: ${moduleName}`
                ),
                `MockDefault(${moduleName})`
              );
            }
            return createConstructableMockComponent(
              ReactRuntime,
              () => ReactRuntime.createElement('span', { className: 'inline-block' }),
              `MockNamed(${moduleName})`
            );
          }
        }
      );
    };

    const createAxiosMockModule = () => {
      const mockAssetRows = [
        {
          _id: 'asset-1',
          name: 'Heritage Villa',
          assetType: 'real_estate',
          legalOwner: 'Family Trust',
          conditionGrade: 'A'
        },
        {
          _id: 'asset-2',
          name: 'Gold Collection',
          assetType: 'jewelry',
          legalOwner: 'Primary Nominee',
          conditionGrade: 'A'
        }
      ];

      const responseFactory = (payload: any = {}) => {
        const isArrayPayload = Array.isArray(payload);
        const safeObjectPayload =
          payload && typeof payload === 'object' && !isArrayPayload ? payload : {};

        const normalizedData = {
          success: true,
          data: payload,
          error: null,
          ...safeObjectPayload,
          ...(isArrayPayload
            ? {
                items: payload,
                rows: payload,
                list: payload,
                results: payload,
                total: payload.length
              }
            : {})
        };

        Promise.resolve({
          data: normalizedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {}
        });
      };

      const inferMockData = (urlLike: any, method: string): any => {
        const url = String(urlLike || '').toLowerCase();
        const isStats = /\/stats\b/.test(url) || /stats/.test(url);
        if (isStats) {
          return {
            total: 12,
            pending: 3,
            completed: 7,
            recent: 4,
            active: 9,
            count: 12
          };
        }

        if (method === 'get') {
          if (/\bassets\b/.test(url)) return mockAssetRows;
          if (/\b(provenance|transfers|valuations|events|records)\b/.test(url)) {
            return [
              { _id: 'row-1', name: 'Sample Record', title: 'Sample Record', status: 'active' }
            ];
          }
          return [];
        }

        if (method === 'post' || method === 'put' || method === 'patch') {
          return { success: true };
        }

        return {};
      };

      const axiosInstance: any = {
        defaults: {},
        interceptors: {
          request: { use: () => 0, eject: () => {} },
          response: { use: () => 0, eject: () => {} }
        },
        request: (config: any = {}) => {
          const method = String(config?.method || 'get').toLowerCase();
          return responseFactory(inferMockData(config?.url, method));
        },
        get: (url?: string) => responseFactory(inferMockData(url, 'get')),
        delete: (url?: string) => responseFactory(inferMockData(url, 'delete')),
        head: () => responseFactory(),
        options: () => responseFactory(),
        post: (url?: string) => responseFactory(inferMockData(url, 'post')),
        put: (url?: string) => responseFactory(inferMockData(url, 'put')),
        patch: (url?: string) => responseFactory(inferMockData(url, 'patch')),
        create: () => axiosInstance
      };

      return {
        __esModule: true,
        default: axiosInstance,
        ...axiosInstance
      };
    };

    const createMuiTheme = () => ({
      palette: {
        mode: 'light',
        common: { black: '#000000', white: '#ffffff' },
        primary: { main: '#6366f1', contrastText: '#ffffff' },
        secondary: { main: '#0ea5e9', contrastText: '#ffffff' },
        background: { default: '#ffffff', paper: '#f8fafc' },
        text: { primary: '#111827', secondary: '#4b5563' }
      }
    });

    const createMUIStylesModule = (ReactRuntime: any) => {
      const theme = createMuiTheme();

      const ThemeProvider = ({ children }: any) =>
        ReactRuntime.createElement(ReactRuntime.Fragment, null, children);

      return {
        __esModule: true,
        createTheme: () => theme,
        ThemeProvider,
        styled: (Component: any) => () => Component,
        useTheme: () => theme,
        default: {
          createTheme: () => theme,
          ThemeProvider,
          styled: (Component: any) => () => Component,
          useTheme: () => theme
        }
      };
    };

    const createMUIComponentModule = (ReactRuntime: any) => {
      return new Proxy(
        {
          __esModule: true
        },
        {
          get: (_target, key) => {
            if (key === '__esModule') return true;
            if (key === 'default') {
              return createConstructableMockComponent(
                ReactRuntime,
                ({ children, ...props }: any) => ReactRuntime.createElement('div', props, children),
                'MockMUIDefault'
              );
            }
            return createConstructableMockComponent(
              ReactRuntime,
              ({ children, ...props }: any) => ReactRuntime.createElement('div', props, children),
              `MockMUI(${String(key)})`
            );
          }
        }
      );
    };

    const createRuntimeErrorBoundary = (ReactRuntime: any) => {
      return class RuntimeErrorBoundary extends ReactRuntime.Component<
        { children: any },
        { error: string | null }
      > {
        constructor(props: any) {
          super(props);
          this.state = { error: null };
        }

        static getDerivedStateFromError(error: any) {
          return { error: error?.message || String(error) };
        }

        componentDidCatch(error: any) {
          console.error('[PreviewEngine] Component render error:', error);
        }

        render() {
          if (this.state.error) {
            return ReactRuntime.createElement(
              'div',
              {
                className:
                  'm-4 rounded border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-300'
              },
              `Preview error: ${this.state.error}`
            );
          }

          return this.props.children;
        }
      };
    };

    const ensureAuthContextModuleShape = (moduleExports: any, ReactRuntime: any) => {
      const fallbackAuthValue = {
        user: {
          id: 'preview-user',
          name: 'Preview User',
          email: 'preview@example.com'
        },
        token: 'preview-token',
        loading: false,
        isAuthenticated: true,
        login: () => {},
        signup: async () => ({ success: true }),
        logout: () => {},
        refreshAuth: async () => ({ success: true })
      };

      const createContextFallback = () => ReactRuntime.createContext(fallbackAuthValue);
      const defaultExport = moduleExports?.default;

      const isLikelyContext = (value: any) =>
        value && typeof value === 'object' && (
          '_currentValue' in value ||
          '_currentValue2' in value ||
          'Provider' in value ||
          'Consumer' in value
        );

      if (!moduleExports?.AuthContext && isLikelyContext(defaultExport)) {
        moduleExports.AuthContext = defaultExport;
      }

      if (!moduleExports?.AuthContext && defaultExport?.AuthContext && isLikelyContext(defaultExport.AuthContext)) {
        moduleExports.AuthContext = defaultExport.AuthContext;
      }

      if (!moduleExports?.AuthContext) {
        moduleExports.AuthContext = createContextFallback();
      }

      if (!moduleExports?.AuthProvider && defaultExport?.AuthProvider) {
        moduleExports.AuthProvider = defaultExport.AuthProvider;
      }

      if (!moduleExports?.AuthProvider) {
        moduleExports.AuthProvider = ({ children }: any) =>
          ReactRuntime.createElement(
            moduleExports.AuthContext.Provider,
            { value: fallbackAuthValue },
            children
          );
      }

      if (!moduleExports?.useAuth && typeof defaultExport?.useAuth === 'function') {
        moduleExports.useAuth = defaultExport.useAuth;
      }

      if (!moduleExports?.useAuth) {
        moduleExports.useAuth = () => fallbackAuthValue;
      }

      if (!moduleExports.default) {
        moduleExports.default = moduleExports.AuthContext;
      }

      return moduleExports;
    };

    const renderCode = async (payload: PreviewMessage) => {
      try {
        setError(null);
        const mountContainer = containerRef.current;
        if (!mountContainer) return;

        const { code, files = [], filePath = 'preview.tsx' } = payload;
        if (!code) return;

        const { Babel, ReactRuntime, ReactDOMRuntime } = getRuntime();
        if (!Babel || !ReactRuntime || !ReactDOMRuntime) {
          throw new Error('Preview runtime not initialized yet.');
        }
        ensureSafeUseContext(ReactRuntime);

        // Inject base preview styles so layout works before Tailwind CDN loads
        if (!document.getElementById('preview-base-styles')) {
          const baseStyles = document.createElement('style');
          baseStyles.id = 'preview-base-styles';
          baseStyles.textContent = getBasePreviewCSS();
          document.head.appendChild(baseStyles);
        }

        // Keep a stable mount node/root to avoid React DOM removal races between rapid renders.
        if (!mountNodeRef.current) {
          const mountNode = document.createElement('div');
          mountNode.className = 'preview-instance min-h-screen w-full';
          mountContainer.appendChild(mountNode);
          // Add #app div for Vue 3 stack (Vue uses #app by convention)
          if (!document.getElementById('app')) {
            const appDiv = document.createElement('div');
            appDiv.id = 'app';
            appDiv.style.minHeight = '100vh';
            appDiv.style.width = '100%';
            document.body.appendChild(appDiv);
          }
          mountNodeRef.current = mountNode;
        }

        const mountNodeAny = mountNodeRef.current as any;
        if (!rootRef.current && mountNodeAny?.__previewReactRoot) {
          rootRef.current = mountNodeAny.__previewReactRoot;
        }

        const normalizedFiles = (files || []).map((f) => ({
          path: normalizePath(f.path),
          content: f.content
        }));

        const styleExtensions = ['.css', '.scss', '.sass', '.less'];
        let authContextModuleSingleton: any | null = null;

        const mockProcess = {
          env: {
            NODE_ENV: 'development'
          },
          cwd: () => '/',
          nextTick: (cb: (...args: any[]) => void, ...args: any[]) => Promise.resolve().then(() => cb(...args))
        };

        const mockLocation = {
          href: 'about:preview',
          origin: window.location.origin,
          pathname: '/',
          search: '',
          hash: '',
          assign: (_url?: string) => {
            console.warn('[PreviewEngine] Navigation blocked: location.assign');
          },
          replace: (_url?: string) => {
            console.warn('[PreviewEngine] Navigation blocked: location.replace');
          },
          reload: () => {
            console.warn('[PreviewEngine] Navigation blocked: location.reload');
          },
          toString: () => 'about:preview'
        };

        const previewWindowProxy = new Proxy(window, {
          get(target, key) {
            if (key === 'location') return mockLocation;
            if (key === 'open') {
              return () => {
                console.warn('[PreviewEngine] Navigation blocked: window.open');
                return null;
              };
            }
            return (target as any)[key];
          },
          set(target, key, value) {
            if (key === 'location') {
              console.warn('[PreviewEngine] Navigation blocked: window.location set');
              return true;
            }
            (target as any)[key] = value;
            return true;
          }
        });

        const findFile = (request: string, importer: string): PreviewFile | null => {
          if (request.startsWith('@/')) {
            const aliasSuffix = normalizePath(request.replace(/^@\//, ''));
            const aliasBases = [
              normalizePath(`frontend/src/${aliasSuffix}`),
              normalizePath(`frontend/${aliasSuffix}`),
              normalizePath(aliasSuffix)
            ];

            for (const base of aliasBases) {
              const aliasCandidates = [
                base,
                `${base}.tsx`,
                `${base}.ts`,
                `${base}.jsx`,
                `${base}.js`,
                `${base}/index.tsx`,
                `${base}/index.ts`,
                `${base}/index.jsx`,
                `${base}/index.js`
              ];

              const aliasFile = normalizedFiles.find((f) => aliasCandidates.includes(f.path));
              if (aliasFile) return { path: aliasFile.path, content: aliasFile.content };

              const aliasBySuffix = normalizedFiles.find((f) =>
                aliasCandidates.some((c) => f.path.endsWith(`/${c}`) || f.path === c)
              );
              if (aliasBySuffix) return { path: aliasBySuffix.path, content: aliasBySuffix.content };
            }
          }

          const base = resolveImportPath(importer, request);
          const candidates = [
            base,
            `${base}.tsx`,
            `${base}.ts`,
            `${base}.jsx`,
            `${base}.js`,
            `${base}.json`,
            `${base}/index.tsx`,
            `${base}/index.ts`,
            `${base}/index.jsx`,
            `${base}/index.js`
          ];

          const byExact = normalizedFiles.find((f) => candidates.includes(f.path));
          if (byExact) return { path: byExact.path, content: byExact.content };

          const bySuffix = normalizedFiles.find((f) => candidates.some((c) => f.path.endsWith(`/${c}`) || f.path === c));
          if (bySuffix) return { path: bySuffix.path, content: bySuffix.content };

          return null;
        };

        /**
         * Returns a mock for Vue ecosystem libraries.
         * Returns null if the library is not a Vue-specific one (caller should proceed normally).
         */
        function getVueMock(id: string): any {
          if (id === 'vue') {
            const Vue = (window as any).Vue;
            if (Vue) return Vue;
            console.error('[preview] Vue core requested but not loaded yet');
            return { ref: () => ({ value: null }), reactive: (o: any) => o, computed: (fn: any) => ({ value: fn() }), onMounted: () => {}, defineComponent: (o: any) => o, createApp: () => ({ mount: () => {}, use: () => {} }) };
          }

          if (id === 'vue-router') {
            const Vue_vr = (window as any).Vue;
            const noopRoute = { path: '/', params: {}, query: {}, hash: '', fullPath: '/', matched: [], name: null, meta: {}, redirectedFrom: undefined };
            return {
              createRouter: (options: any) => ({
                install: (_app: any) => {},
                push: async () => {},
                replace: async () => {},
                go: () => {},
                back: () => {},
                forward: () => {},
                currentRoute: { value: noopRoute },
                options,
              }),
              createWebHistory: (base?: string) => ({ base: base || '/' }),
              createWebHashHistory: () => ({}),
              createMemoryHistory: () => ({}),
              useRouter: () => ({
                push: async () => {},
                replace: async () => {},
                go: () => {},
                back: () => {},
                forward: () => {},
                currentRoute: { value: noopRoute },
              }),
              useRoute: () => noopRoute,
              RouterView: Vue_vr ? { template: '<div><slot /></div>' } : () => null,
              RouterLink: Vue_vr
                ? { props: ['to'], template: '<a href="#"><slot /></a>' }
                : ({ children }: any) => children,
              RouterLinkWithSlot: Vue_vr
                ? { props: ['to'], template: '<a href="#"><slot /></a>' }
                : () => null,
            };
          }

          if (id === 'pinia') {
            const stores = new Map<string, any>();
            return {
              createPinia: () => ({
                install: () => {},
                _s: stores,
                state: { value: {} },
              }),
              defineStore: (idOrOptions: string | object, setup?: Function) => {
                const storeId = typeof idOrOptions === 'string' ? idOrOptions : 'store';
                return () => {
                  if (stores.has(storeId)) return stores.get(storeId);
                  const storeData = typeof setup === 'function'
                    ? setup()
                    : (typeof idOrOptions === 'object' ? (idOrOptions as any).state?.() || {} : {});
                  const store = new Proxy(storeData, {
                    get: (t, k) => (k in t ? t[k as any] : () => {}),
                    set: (t, k, v) => { t[k as any] = v; return true; },
                  });
                  stores.set(storeId, store);
                  return store;
                };
              },
              storeToRefs: (store: any) => {
                const Vue_pr = (window as any).Vue;
                if (!Vue_pr) return store;
                return Object.fromEntries(
                  Object.entries(store).map(([k, v]) => [k, Vue_pr.ref(v)])
                );
              },
            };
          }

          if (id === '@vueuse/core') {
            const Vue_vu = (window as any).Vue;
            const ref = Vue_vu?.ref || ((v: any) => ({ value: v }));
            const computed = Vue_vu?.computed || ((fn: any) => ({ value: fn() }));
            return {
              useLocalStorage: (_key: string, defaultVal: any) => ref(defaultVal),
              useSessionStorage: (_key: string, defaultVal: any) => ref(defaultVal),
              useDark: () => ref(false),
              useToggle: (init = false) => { const v = ref(init); return [v, () => { v.value = !v.value; }]; },
              useWindowSize: () => ({ width: ref(window.innerWidth), height: ref(window.innerHeight) }),
              useMousePosition: () => ({ x: ref(0), y: ref(0) }),
              useDebounce: (v: any) => v,
              useThrottle: (v: any) => v,
              useFetch: (_url: string) => ({ data: ref(null), error: ref(null), isFetching: ref(false) }),
              useClipboard: () => ({ copy: async () => {}, copied: ref(false), text: ref('') }),
              useTitle: (title?: string) => { if (title) document.title = title; return ref(title || ''); },
              useBreakpoints: () => ({ sm: ref(true), md: ref(true), lg: ref(true), xl: ref(false) }),
              useIntersectionObserver: (_target: any, _fn: any) => ({ stop: () => {} }),
              onClickOutside: (_target: any, _fn: any) => ({ stop: () => {} }),
              useEventListener: () => ({ stop: () => {} }),
              refDebounced: (v: any) => v,
              whenever: () => {},
              watch: Vue_vu?.watch || (() => () => {}),
              watchEffect: Vue_vu?.watchEffect || (() => () => {}),
              useVModel: (props: any, key: string) => computed(() => props[key]),
            };
          }

          if (id === '@vueuse/head' || id === '@unhead/vue') {
            return {
              createHead: () => ({ install: () => {} }),
              useHead: () => {},
              useSeoMeta: () => {},
            };
          }

          if (id === 'vue-i18n') {
            const translationFn = (key: string) => key;
            return {
              createI18n: (_options: any) => ({
                install: (app: any) => {
                  app.config = app.config || {};
                  app.config.globalProperties = app.config.globalProperties || {};
                  app.config.globalProperties.$t = translationFn;
                },
                global: { t: translationFn, locale: { value: 'en' } },
              }),
              useI18n: () => ({ t: translationFn, locale: { value: 'en' }, n: (v: number) => String(v) }),
            };
          }

          if (id === 'vee-validate') {
            const Vue_vv = (window as any).Vue;
            const ref = Vue_vv?.ref || ((v: any) => ({ value: v }));
            return {
              useForm: () => ({
                handleSubmit: (fn: Function) => (e: Event) => { e?.preventDefault?.(); fn({}); },
                values: {},
                errors: ref({}),
                isSubmitting: ref(false),
                resetForm: () => {},
                setFieldValue: () => {},
              }),
              useField: (_name: string) => ({
                value: ref(''),
                errorMessage: ref(''),
                handleChange: () => {},
                handleBlur: () => {},
                meta: { valid: true, dirty: false, touched: false },
              }),
              Field: Vue_vv ? { props: ['name', 'rules'], template: '<div><slot :field="{}" :meta="{}" /></div>' } : () => null,
              Form: Vue_vv ? { template: '<form @submit.prevent><slot /></form>' } : () => null,
              ErrorMessage: Vue_vv ? { props: ['name'], template: '<span class="text-red-500 text-sm">{{ name }}</span>' } : () => null,
              defineRule: () => {},
              configure: () => {},
            };
          }

          if (id === 'axios') {
            if (currentStack !== 'vue') {
              return null;
            }
            const noop = async () => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
            const axiosMock: any = noop;
            axiosMock.get = noop; axiosMock.post = noop; axiosMock.put = noop;
            axiosMock.patch = noop; axiosMock.delete = noop;
            axiosMock.create = () => axiosMock;
            axiosMock.defaults = { headers: { common: {} } };
            axiosMock.interceptors = {
              request: { use: () => 0, eject: () => {} },
              response: { use: () => 0, eject: () => {} }
            };
            return { default: axiosMock, ...axiosMock };
          }

          if (id.startsWith('virtual:') || id.startsWith('/@vite/') || id.startsWith('/@fs/')) {
            console.warn(`[preview] Vite virtual module "${id}" mocked`);
            return {};
          }

          return null;
        }

        const compileModule = (sourceCode: string, modulePath: string) => {
          const normalizedModulePath = normalizePath(modulePath);
          if (moduleCache.has(normalizedModulePath)) {
            return moduleCache.get(normalizedModulePath);
          }

          const sanitizeSourceCode = (input: string): string => {
            let output = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

            // Some model outputs occasionally prefix declarations with a stray backslash
            // (e.g. "\\export"), which breaks Babel parsing.
            output = output.replace(
              /(^|\n)([ \t]*)\\+(?=(export|import|const|let|var|function|class|interface|type|enum)\b)/g,
              '$1$2'
            );

            return output;
          };

          const module = { exports: {} as any };
          moduleCache.set(normalizedModulePath, module.exports);

          const isAuthContextRequest = (value: string): boolean => {
            const normalizedValue = normalizePath(value || '');
            if (/auth[-_]?context/i.test(normalizedValue)) return true;
            return /(^|\/)(context|contexts)\/auth[-_]?context(\.[a-z]+)?$/i.test(normalizedValue);
          };

          const createAuthContextMockModule = () => {
            if (authContextModuleSingleton) {
              return authContextModuleSingleton;
            }

            const mockAuthValue = {
              user: {
                id: 'preview-user',
                name: 'Preview User',
                email: 'preview@example.com'
              },
              token: 'preview-token',
              loading: false,
              isAuthenticated: true,
              login: async () => ({ success: true }),
              signup: async () => ({ success: true }),
              logout: () => {},
              refreshAuth: async () => ({ success: true })
            };

            const AuthContext = ReactRuntime.createContext(mockAuthValue);
            const AuthProvider = ({ children }: any) =>
              ReactRuntime.createElement(
                AuthContext.Provider,
                { value: mockAuthValue },
                children
              );

            const defaultAuthExport = Object.assign(AuthContext, {
              AuthContext,
              AuthProvider,
              useAuth: () => mockAuthValue
            });

            authContextModuleSingleton = {
              __esModule: true,
              AuthContext,
              AuthProvider,
              useAuth: () => mockAuthValue,
              default: defaultAuthExport
            };

            return authContextModuleSingleton;
          };

          const localRequire = (request: string) => {
            // Check Vue-specific mocks first (returns null if not a Vue library)
            const vueMockResult = getVueMock(request);
            if (vueMockResult !== null) return vueMockResult;

            if (request === 'react') return ReactRuntime;
            if (request === 'react-dom') return ReactDOMRuntime;
            if (request === 'process' || request === 'node:process') return mockProcess;
            if (request === 'axios') return createAxiosMockModule();
            if (request === '@mui/material/styles') {
              return createMUIStylesModule(ReactRuntime);
            }
            if (request === '@mui/material' || request.startsWith('@mui/material/')) {
              return createMUIComponentModule(ReactRuntime);
            }
            if (request.startsWith('@mui/icons-material')) {
              return createMUIComponentModule(ReactRuntime);
            }
            if (request === 'next/head') {
              return ({ children }: any) => ReactRuntime.createElement(ReactRuntime.Fragment, null, children);
            }
            if (request === 'next/link') {
              return ({ children, href, ...rest }: any) =>
                ReactRuntime.createElement(
                  'a',
                  {
                    href: href || '#',
                    ...rest,
                    onClick: (event: any) => {
                      event?.preventDefault?.();
                      event?.stopPropagation?.();
                      console.warn('[PreviewEngine] Navigation blocked: next/link click');
                      if (typeof rest?.onClick === 'function') {
                        try {
                          rest.onClick(event);
                        } catch {
                          // Ignore user click handler errors in sandbox mocks.
                        }
                      }
                    }
                  },
                  children
                );
            }
            if (request === 'next/image') {
              return ({ alt = '', ...rest }: any) =>
                ReactRuntime.createElement('img', { alt, ...rest });
            }
            if (request === 'next/router') {
              return {
                useRouter: () => ({
                  push: () => {},
                  replace: () => {},
                  back: () => {},
                  prefetch: async () => {},
                  pathname: '/',
                  route: '/',
                  query: {},
                  asPath: '/'
                })
              };
            }
            if (request === 'next/navigation') {
              return {
                useRouter: () => ({
                  push: () => {},
                  replace: () => {},
                  back: () => {},
                  refresh: () => {}
                }),
                usePathname: () => '/',
                useSearchParams: () => new URLSearchParams()
              };
            }

            if (isAuthContextRequest(request)) {
              return createAuthContextMockModule();
            }

            if (
              request === '@/contexts/AuthContext' ||
              request === '@/context/AuthContext' ||
              request.endsWith('/contexts/AuthContext') ||
              request.endsWith('/context/AuthContext') ||
              request.endsWith('/contexts/AuthContext.tsx') ||
              request.endsWith('/contexts/AuthContext.ts') ||
              request.endsWith('/context/AuthContext.tsx') ||
              request.endsWith('/context/AuthContext.ts')
            ) {
              const mockAuthValue = {
                user: {
                  id: 'preview-user',
                  name: 'Preview User',
                  email: 'preview@example.com'
                },
                token: 'preview-token',
                loading: false,
                isAuthenticated: true,
                login: async () => ({ success: true }),
                signup: async () => ({ success: true }),
                logout: () => {},
                refreshAuth: async () => ({ success: true })
              };

              const AuthContext = ReactRuntime.createContext(mockAuthValue);

              const AuthProvider = ({ children }: any) =>
                ReactRuntime.createElement(
                  AuthContext.Provider,
                  { value: mockAuthValue },
                  children
                );

              const defaultAuthExport = Object.assign(AuthContext, {
                AuthContext,
                AuthProvider,
                useAuth: () => mockAuthValue
              });

              return {
                __esModule: true,
                AuthContext,
                AuthProvider,
                useAuth: () => mockAuthValue,
                default: defaultAuthExport
              };
            }

            if (styleExtensions.some((ext) => request.endsWith(ext))) {
              return {};
            }

            if (request === 'lucide-react') {
              return new Proxy(
                {},
                {
                  get: () =>
                    (props: any) =>
                      ReactRuntime.createElement('span', {
                        ...props,
                        className: `${props?.className || ''} inline-block h-4 w-4 rounded-sm bg-zinc-700`
                      })
                }
              );
            }

            if (request.startsWith('.') || request.startsWith('/')) {
              const file = findFile(request, normalizedModulePath);
              if (!file) {
                if (isAuthContextRequest(request)) {
                  console.warn(`[PreviewEngine] Missing AuthContext module replaced with stable mock: ${request}`);
                  return createAuthContextMockModule();
                }
                console.warn(`[PreviewEngine] Missing local import mocked: ${request} from ${normalizedModulePath}`);
                return createMockModule(ReactRuntime, `local:${request}`);
              }

              if (styleExtensions.some((ext) => file.path.endsWith(ext))) {
                return {};
              }

              if (file.path.endsWith('.json')) {
                try {
                  return JSON.parse(file.content || '{}');
                } catch {
                  console.warn(`[PreviewEngine] Invalid JSON module mocked: ${file.path}`);
                  return {};
                }
              }

              const compiledModule = compileModule(file.content, file.path);
              if (isAuthContextRequest(file.path)) {
                return ensureAuthContextModuleShape(compiledModule, ReactRuntime);
              }

              return compiledModule;
            }

            if (request.startsWith('@/')) {
              const file = findFile(request, normalizedModulePath);
              if (!file) {
                if (isAuthContextRequest(request)) {
                  console.warn(`[PreviewEngine] Missing aliased AuthContext module replaced with stable mock: ${request}`);
                  return createAuthContextMockModule();
                }
                console.warn(`[PreviewEngine] Missing aliased import mocked: ${request} from ${normalizedModulePath}`);
                return createMockModule(ReactRuntime, `alias:${request}`);
              }

              if (styleExtensions.some((ext) => file.path.endsWith(ext))) {
                return {};
              }

              if (file.path.endsWith('.json')) {
                try {
                  return JSON.parse(file.content || '{}');
                } catch {
                  console.warn(`[PreviewEngine] Invalid JSON module mocked: ${file.path}`);
                  return {};
                }
              }

              const compiledModule = compileModule(file.content, file.path);
              if (isAuthContextRequest(file.path)) {
                return ensureAuthContextModuleShape(compiledModule, ReactRuntime);
              }

              return compiledModule;
            }

            return createMockModule(ReactRuntime, request);
          };

          const transformed = Babel.transform(sanitizeSourceCode(sourceCode), {
            presets: ['react', 'typescript'],
            plugins: ['transform-modules-commonjs'],
            filename: normalizedModulePath,
            sourceType: 'module'
          })?.code;

          if (!transformed) {
            throw new Error(`Failed to compile module ${normalizedModulePath}`);
          }

          const executor = new Function('require', 'module', 'exports', 'process', 'global', 'globalThis', 'window', 'location', transformed);
          executor(
            localRequire,
            module,
            module.exports,
            mockProcess,
            previewWindowProxy,
            previewWindowProxy,
            previewWindowProxy,
            mockLocation
          );
          moduleCache.set(normalizedModulePath, module.exports);
          return module.exports;
        };

        function showRenderError(message: string): void {
          const root = document.getElementById('root') || document.getElementById('app') || document.body;
          root.innerHTML = `
            <div style="padding:2rem;font-family:system-ui,sans-serif;background:#fef2f2;min-height:100vh;color:#991b1b;">
              <p style="font-weight:600;font-size:1rem;margin-bottom:0.5rem;">⚠ Render error</p>
              <pre style="font-size:0.75rem;white-space:pre-wrap;opacity:0.8;line-height:1.5;">${message}</pre>
            </div>
          `;
        }

        function createRequireForVue(
          _allFiles: Array<{ path: string; content: string }>
        ): (id: string) => any {
          return (id: string) => {
            const Vue = (window as any).Vue;
            if (id === 'vue' && Vue) return Vue;
            return {};
          };
        }

        function installVuePlugins(_app: any): void {
          // Plugins are installed via mocks in localRequire/getVueMock.
        }

        async function compileSFC(
          entryPath: string,
          allFiles: Array<{ path: string; content: string }>,
          _Vue: any
        ): Promise<any> {
          const file = allFiles.find((f) => f.path === entryPath);
          if (!file) throw new Error(`SFC file not found: ${entryPath}`);

          const source = file.content;
          const scriptMatch =
            source.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/i) ||
            source.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/i);
          const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

          if (styleMatch?.[1]) {
            const style = document.createElement('style');
            style.textContent = styleMatch[1];
            document.head.appendChild(style);
          }

          let componentOptions: any = {};
          if (scriptMatch?.[1]) {
            try {
              const compiled = (window as any).Babel.transform(scriptMatch[1], {
                presets: ['react', 'typescript'],
                plugins: ['transform-modules-commonjs'],
                sourceType: 'module',
                filename: entryPath.replace('.vue', '.ts')
              });

              const fn = new Function('require', 'exports', 'module', compiled.code);
              const mod: any = { exports: {} };
              fn(createRequireForVue(allFiles), mod.exports, mod);
              componentOptions = mod.exports.default || mod.exports;
            } catch (err: any) {
              console.warn(`[preview] SFC script compile error: ${err.message}`);
            }
          }

          if (templateMatch?.[1] && !componentOptions.template && !componentOptions.render) {
            componentOptions.template = templateMatch[1];
          }

          return componentOptions;
        }

        async function renderByStack(
          compiledModuleExports: Record<string, any>,
          stack: PreviewStack,
          entryPath: string,
          allFiles: Array<{ path: string; content: string }>
        ): Promise<void> {
          const rootEl = mountNodeRef.current || document.getElementById('root') || document.getElementById('app') || document.body;

          if (stack === 'nextjs' || stack === 'react-vite' || stack === 'unknown') {
            const React_r = (window as any).React;
            const ReactDOM_r = (window as any).ReactDOM;

            if (!React_r || !ReactDOM_r) {
              throw new Error('React runtime not loaded. This should not happen after initialization.');
            }

            const Component =
              compiledModuleExports.default ||
              compiledModuleExports.App ||
              Object.values(compiledModuleExports).find((v: any) => typeof v === 'function');

            if (!Component) {
              throw new Error(
                `No renderable React component found in ${entryPath}. ` +
                `Make sure the file has a default export or a named "App" export.`
              );
            }

            const RuntimeErrorBoundary = createRuntimeErrorBoundary(React_r);
            const getFallbackPageComponent = (): any => {
              const preferredPageNames = ['pages/index', 'pages/dashboard', 'pages/home', 'pages/login'];
              const renderablePage = allFiles.find((f) => {
                const normalizedPath = normalizePath(f.path).toLowerCase();
                if (!/\.(tsx|jsx|ts|js)$/.test(normalizedPath)) return false;
                if (!normalizedPath.includes('/pages/')) return false;
                if (normalizedPath.endsWith('/_app.tsx') || normalizedPath.endsWith('/_app.jsx')) return false;
                if (preferredPageNames.some((name) => normalizedPath.includes(name))) return true;
                return normalizedPath.endsWith('/index.tsx') || normalizedPath.endsWith('/dashboard.tsx');
              });

              if (renderablePage) {
                try {
                  const pageModule = compileModule(renderablePage.content, renderablePage.path);
                  const pageComp = pageModule?.default || pageModule?.Page || Object.values(pageModule || {}).find((v: any) => typeof v === 'function');
                  if (typeof pageComp === 'function') {
                    return pageComp;
                  }
                } catch (err) {
                  console.warn('[PreviewEngine] Failed to compile fallback page component for Next _app render.', err);
                }
              }

              return () =>
                React_r.createElement(
                  'div',
                  { className: 'p-6 text-sm text-zinc-300' },
                  'Preview page component is unavailable.'
                );
            };

            const buildPreviewProps = () => {
              const componentSource = typeof Component === 'function' ? String(Component) : '';
              const looksLikeNextApp =
                /\bMyApp\b/.test(componentSource) ||
                /\bComponent\b/.test(componentSource) ||
                entryPath.toLowerCase().endsWith('/_app.tsx') ||
                entryPath.toLowerCase().endsWith('/_app.jsx');

              if (!looksLikeNextApp) return {};

              return {
                Component: getFallbackPageComponent(),
                pageProps: {}
              };
            };

            const isAsyncComponent =
              typeof Component === 'function' &&
              Component.constructor &&
              Component.constructor.name === 'AsyncFunction';

            const previewProps = buildPreviewProps();

            const AsyncComponentBridge = ({ Comp }: { Comp: any }) => {
              const [resolvedNode, setResolvedNode] = React_r.useState(
                React_r.createElement('div', { className: 'p-4 text-sm text-zinc-300' }, 'Loading async component...')
              );

              React_r.useEffect(() => {
                let isMounted = true;

                Promise.resolve()
                  .then(() => Comp({}))
                  .then((value: any) => {
                    if (!isMounted) return;

                    if (React_r.isValidElement(value)) {
                      setResolvedNode(value);
                      return;
                    }

                    if (typeof value === 'function') {
                      setResolvedNode(React_r.createElement(value));
                      return;
                    }

                    if (value === null || value === undefined || value === false) {
                      setResolvedNode(null);
                      return;
                    }

                    if (typeof value === 'string' || typeof value === 'number') {
                      setResolvedNode(React_r.createElement('div', null, value));
                      return;
                    }

                    setResolvedNode(
                      React_r.createElement(
                        'pre',
                        {
                          className: 'm-4 rounded border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200 whitespace-pre-wrap'
                        },
                        `Async component returned unsupported value:\n${String(value)}`
                      )
                    );
                  })
                  .catch((err: any) => {
                    if (!isMounted) return;
                    setResolvedNode(
                      React_r.createElement(
                        'div',
                        {
                          className: 'm-4 rounded border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-300'
                        },
                        `Async component error: ${err?.message || String(err)}`
                      )
                    );
                  });

                return () => {
                  isMounted = false;
                };
              }, [Comp]);

              return resolvedNode;
            };

            const element = React_r.isValidElement(Component)
              ? React_r.createElement(RuntimeErrorBoundary, null, Component)
              : isAsyncComponent
                ? React_r.createElement(RuntimeErrorBoundary, null, React_r.createElement(AsyncComponentBridge, {
                    Comp: (props: any) => Component({ ...previewProps, ...(props || {}) })
                  }))
                : React_r.createElement(RuntimeErrorBoundary, null, React_r.createElement(Component, previewProps));

            const reactMountNode = mountNodeRef.current;
            if (!reactMountNode) {
              throw new Error('Preview mount node is unavailable for React render.');
            }

            if (ReactDOM_r.createRoot) {
              if (!rootRef.current) {
                rootRef.current = ReactDOM_r.createRoot(reactMountNode);
                (reactMountNode as any).__previewReactRoot = rootRef.current;
              }
              rootRef.current.render(element);
            } else {
              ReactDOM_r.render(element, reactMountNode);
            }

            window.parent.postMessage({ type: PREVIEW_MSG.RENDER_DONE }, '*');
            return;
          }

          if (stack === 'vue') {
            const Vue_v = (window as any).Vue;
            if (!Vue_v) {
              throw new Error('Vue 3 runtime not loaded.');
            }

            let AppComponent: any = null;
            if (compiledModuleExports.default && typeof compiledModuleExports.default === 'object') {
              AppComponent = compiledModuleExports.default;
            } else if (entryPath.endsWith('.vue')) {
              AppComponent = await compileSFC(entryPath, allFiles, Vue_v);
            } else if (typeof compiledModuleExports.default === 'function') {
              AppComponent = { setup: compiledModuleExports.default };
            } else {
              const namedExport = Object.values(compiledModuleExports).find(
                (v: any) => v && typeof v === 'object' && (v.setup || v.template || v.render || v.components)
              );
              if (namedExport) AppComponent = namedExport;
            }

            if (!AppComponent) {
              throw new Error(
                `No renderable Vue component found in ${entryPath}. ` +
                `Make sure the file has a default export of a Vue component.`
              );
            }

            rootEl.innerHTML = '';
            const vueApp = Vue_v.createApp(AppComponent);
            installVuePlugins(vueApp);
            vueApp.mount(rootEl);
            window.parent.postMessage({ type: PREVIEW_MSG.RENDER_DONE }, '*');
            return;
          }

          if (stack === 'html') {
            const htmlFile = allFiles.find(
              (f) => f.path === 'index.html' || f.path === 'frontend/index.html' || f.path.endsWith('/index.html')
            );
            if (!htmlFile) {
              throw new Error('No index.html file found for HTML stack preview.');
            }

            let htmlContent = htmlFile.content;
            htmlContent = htmlContent.replace(
              /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
              (_, href) => {
                const cssFile = allFiles.find((f) => f.path.endsWith(href.split('/').pop() || ''));
                return cssFile ? `<style>${cssFile.content}</style>` : '';
              }
            );

            htmlContent = htmlContent.replace(
              /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi,
              (original, src) => {
                if (src.startsWith('http') || src.startsWith('//')) return original;
                const jsFile = allFiles.find((f) => f.path.endsWith(src.split('/').pop() || ''));
                return jsFile ? `<script>${jsFile.content}</script>` : '';
              }
            );

            document.open();
            document.write(htmlContent);
            document.close();
            window.parent.postMessage({ type: PREVIEW_MSG.RENDER_DONE }, '*');
            return;
          }
        }

        const entryPath = normalizePath(filePath);
        const compiledExports = compileModule(code, entryPath);

        try {
          await renderByStack(compiledExports, currentStack, entryPath, normalizedFiles);
        } catch (renderErr: any) {
          window.parent.postMessage({
            type: PREVIEW_MSG.COMPILE_ERROR,
            filePath: entryPath,
            error: renderErr.message || 'Render failed',
            line: null,
          }, '*');
          showRenderError(renderErr.message || 'Render failed');
        }
      } catch (err: any) {
        console.error('[PreviewEngine] Render failure:', err);
        setError(err?.message || 'Failed to render preview');
      }
    };

    const initEngine = async () => {
      try {
        await Promise.all([
          loadScript('babel-script', 'https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.0/babel.min.js'),
          loadScript('react-script', 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js'),
          loadScript('react-dom-script', 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js'),
          loadScript('tailwind-script', 'https://cdn.tailwindcss.com/3.4.1')
        ]);

        isReadyRef.current = true;
        setIsReady(true);
        console.log('[PreviewEngine] All scripts loaded successfully.');
        window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');

        if (pendingMessageRef.current) {
          renderCode(pendingMessageRef.current);
          pendingMessageRef.current = null;
        }
      } catch (err: any) {
        setError(`Initialization Failed: ${err.message}`);
      }
    };

    /**
     * Load Vue 3 + Vue compiler on demand.
     * Only called when detectStack() returns 'vue'.
     * Idempotent - safe to call multiple times.
     */
    async function ensureVueLoaded(): Promise<boolean> {
      if (vueLoaded) return true;

      const vueOk = await loadScriptWithFallback(CDN_VUE);
      if (!vueOk) {
        console.error('[preview] Vue 3 CDN failed to load from all sources');
        return false;
      }

      // Vue compiler needed to compile template strings in non-.vue SFCs
      const compilerOk = await loadScriptWithFallback(CDN_VUE_COMPILER);
      if (!compilerOk) {
        console.warn('[preview] Vue compiler CDN failed - template-only .vue files may not render');
        // Non-fatal - Options API and Composition API without templates still work
      }

      vueLoaded = true;
      console.log('[preview] Vue 3 loaded successfully');
      return true;
    }

    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== window.parent) return;

      const payload = event.data as PreviewMessage;
      if (payload?.type === 'UPDATE_PREVIEW' && payload.code) {

      // Clear stale compiled modules from previous generation
      // Prevents old module versions rendering after refine/regenerate
      if (typeof moduleCache !== 'undefined') {
        if (moduleCache instanceof Map) {
          moduleCache.clear();
        } else if (moduleCache !== null && typeof moduleCache === 'object') {
          Object.keys(moduleCache).forEach(k => delete (moduleCache as any)[k]);
        }
      }

      // Detect the stack from the received files
      const receivedFiles = (payload.files || []) as Array<{ path: string; content: string }>;
      currentStack = detectStack(receivedFiles);
      console.log(`[preview] Stack detected: ${currentStack}`);

      const entryPath = payload.filePath
        || selectEntryFile(receivedFiles, currentStack)
        || receivedFiles[0]?.path;

      if (!entryPath) {
        window.parent.postMessage({
          type: PREVIEW_MSG.COMPILE_ERROR,
          filePath: 'none',
          error: 'No renderable entry file found in generated output.',
          line: null,
        }, '*');
        return;
      }

      const entryFile = receivedFiles.find(f => f.path === entryPath);
      if (!entryFile) {
        window.parent.postMessage({
          type: PREVIEW_MSG.COMPILE_ERROR,
          filePath: entryPath,
          error: `Entry file not found in generated files: ${entryPath}`,
          line: null,
        }, '*');
        return;
      }

      const resolvedPayload: PreviewMessage = {
        ...payload,
        filePath: entryPath,
        code: entryFile.content,
        files: receivedFiles
      };

      // Notify parent which stack was detected
      window.parent.postMessage({
        type: PREVIEW_MSG.STACK_DETECTED,
        stack: currentStack
      }, '*');

      // If Vue stack, load Vue runtime before proceeding
      if (currentStack === 'vue') {
        const vueReady = await ensureVueLoaded();
        if (!vueReady) {
          window.parent.postMessage({
            type: PREVIEW_MSG.COMPILE_ERROR,
            filePath: payload.filePath || 'unknown',
            error: 'Vue 3 runtime failed to load. Check your internet connection.',
            line: null,
          }, '*');
          return;
        }
      }

      if (isReadyRef.current) {
        renderCode(resolvedPayload);
      } else {
        pendingMessageRef.current = resolvedPayload;
      }
      return;
      }

      // Respond to parent heartbeat ping
      if (event.data?.type === PREVIEW_MSG.PING ||
          event.data?.type === 'PREVIEW_PING') {
        window.parent.postMessage(
          { type: PREVIEW_MSG.PONG },
          '*'
        );
        return;
      }
    };

    const blockAnchorNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = (anchor.getAttribute('href') || '').trim();
      if (!href || href === '#' || href.startsWith('#')) return;

      event.preventDefault();
      event.stopPropagation();
      console.warn(`[PreviewEngine] Navigation blocked: anchor click -> ${href}`);
    };

    const blockFormNavigation = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;

      event.preventDefault();
      event.stopPropagation();
      const action = (form.getAttribute('action') || '').trim() || '(current route)';
      console.warn(`[PreviewEngine] Navigation blocked: form submit -> ${action}`);
    };

    initEngine();
    window.addEventListener('message', handleMessage);
    document.addEventListener('click', blockAnchorNavigation, true);
    document.addEventListener('submit', blockFormNavigation, true);

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('click', blockAnchorNavigation, true);
      document.removeEventListener('submit', blockFormNavigation, true);
      if (rootRef.current) {
        try {
          rootRef.current.unmount();
        } catch {
          // Ignore teardown races on fast navigation.
        }
      }
      rootRef.current = null;
      mountNodeRef.current = null;
      isReadyRef.current = false;
      pendingMessageRef.current = null;
    };
  }, []);

  return (
    <div className="preview-runner-container w-full h-screen bg-black text-white">
      <Head><title>Preview Engine</title></Head>
      {error ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-red-500 bg-red-950/20">
           <h2 className="font-bold mb-2">Build Error</h2>
           <pre className="text-[10px] whitespace-pre-wrap text-left max-w-full overflow-auto bg-black p-4 rounded border border-red-900/50">{error}</pre>
           <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-900 text-white text-xs rounded border border-red-700 hover:bg-red-800">Fix & Refresh Sandbox</button>
        </div>
      ) : !isReady ? (
        <div className="flex flex-col items-center justify-center h-full space-y-3">
           <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-zinc-600 text-xs font-mono">Preparing sandbox environment...</p>
        </div>
      ) : (
        <div className="w-full h-full relative">
          <div ref={containerRef} id="preview-container" className="w-full h-full" />
           {/* If you see this but no code, React failed to attach to the mount point silently */}
           <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/10 text-green-500 text-[10px] rounded-sm uppercase tracking-wider font-bold z-[9999] pointer-events-none">
              Sandbox Active
           </div>
        </div>
      )}
    </div>
  );
}
