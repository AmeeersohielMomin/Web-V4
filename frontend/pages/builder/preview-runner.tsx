import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';

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

    const createMockModule = (ReactRuntime: any, moduleName: string) => {
      return new Proxy(
        {},
        {
          get: (_, key) => {
            if (key === '__esModule') return true;
            if (key === 'default') {
              return (props: any) =>
                ReactRuntime.createElement(
                  'div',
                  {
                    ...props,
                    className: `${props?.className || ''} rounded border border-zinc-600 bg-zinc-900/70 px-2 py-1 text-[10px] text-zinc-300`
                  },
                  `Mock: ${moduleName}`
                );
            }
            return () => ReactRuntime.createElement('span', { className: 'inline-block' });
          }
        }
      );
    };

    const createAxiosMockModule = () => {
      const responseFactory = (data: any = {}) =>
        Promise.resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {}
        });

      const axiosInstance: any = {
        defaults: {},
        interceptors: {
          request: { use: () => 0, eject: () => {} },
          response: { use: () => 0, eject: () => {} }
        },
        request: () => responseFactory(),
        get: () => responseFactory(),
        delete: () => responseFactory(),
        head: () => responseFactory(),
        options: () => responseFactory(),
        post: () => responseFactory(),
        put: () => responseFactory(),
        patch: () => responseFactory(),
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
              return ({ children, ...props }: any) =>
                ReactRuntime.createElement('div', props, children);
            }
            return ({ children, ...props }: any) =>
              ReactRuntime.createElement('div', props, children);
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

    const renderCode = (payload: PreviewMessage) => {
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

        // Keep a stable mount node/root to avoid React DOM removal races between rapid renders.
        if (!mountNodeRef.current) {
          const mountNode = document.createElement('div');
          mountNode.className = 'preview-instance min-h-screen w-full';
          mountContainer.appendChild(mountNode);
          mountNodeRef.current = mountNode;
        }

        if (!rootRef.current) {
          rootRef.current = ReactDOMRuntime.createRoot(mountNodeRef.current);
        }

        const normalizedFiles = (files || []).map((f) => ({
          path: normalizePath(f.path),
          content: f.content
        }));

        const styleExtensions = ['.css', '.scss', '.sass', '.less'];

        const moduleCache = new Map<string, any>();
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

          const localRequire = (request: string) => {
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
                throw new Error(`Cannot resolve local import "${request}" from "${normalizedModulePath}".`);
              }

              if (styleExtensions.some((ext) => file.path.endsWith(ext))) {
                return {};
              }

              return compileModule(file.content, file.path);
            }

            if (request.startsWith('@/')) {
              const file = findFile(request, normalizedModulePath);
              if (!file) {
                throw new Error(`Cannot resolve aliased import "${request}" from "${normalizedModulePath}".`);
              }

              if (styleExtensions.some((ext) => file.path.endsWith(ext))) {
                return {};
              }

              return compileModule(file.content, file.path);
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

        const entryExports = compileModule(code, normalizePath(filePath));
        const candidate =
          entryExports?.default ||
          entryExports?.App ||
          Object.values(entryExports || {}).find((value: any) => typeof value === 'function');

        if (!candidate) {
          throw new Error("No renderable component found. Use default export, named App, or a React component export.");
        }

        const RuntimeErrorBoundary = createRuntimeErrorBoundary(ReactRuntime);

        if (ReactRuntime.isValidElement(candidate)) {
          rootRef.current.render(
            ReactRuntime.createElement(RuntimeErrorBoundary, null, candidate)
          );
        } else {
          rootRef.current.render(
            ReactRuntime.createElement(
              RuntimeErrorBoundary,
              null,
              ReactRuntime.createElement(candidate)
            )
          );
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

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;

      const payload = event.data as PreviewMessage;
      if (payload?.type !== 'UPDATE_PREVIEW' || !payload.code) return;

      if (isReadyRef.current) {
        renderCode(payload);
      } else {
        pendingMessageRef.current = payload;
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
