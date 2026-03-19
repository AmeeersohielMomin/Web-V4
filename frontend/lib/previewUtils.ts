// frontend/lib/previewUtils.ts
// Version 2.0 — Multi-stack preview utilities
// Shared between ai-generate.tsx (parent) and preview-runner.tsx (child iframe)

// ─── MESSAGE CONTRACT ─────────────────────────────────────────────────────

/** All postMessage types between parent and child */
export const PREVIEW_MSG = {
  // Child → Parent
  READY:          'PREVIEW_READY',
  PONG:           'PREVIEW_PONG',
  COMPILE_START:  'PREVIEW_COMPILE_START',
  COMPILE_DONE:   'PREVIEW_COMPILE_DONE',
  COMPILE_ERROR:  'PREVIEW_COMPILE_ERROR',
  RENDER_DONE:    'PREVIEW_RENDER_DONE',
  STACK_DETECTED: 'PREVIEW_STACK_DETECTED',
  // Parent → Child
  UPDATE:         'UPDATE_PREVIEW',
  PING:           'PREVIEW_PING',
} as const;

// ─── TIMING CONSTANTS ─────────────────────────────────────────────────────

/** How long (ms) to wait for CDN scripts before timeout */
export const PREVIEW_INIT_TIMEOUT_MS = 12_000;

/** Debounce (ms) between receiving UPDATE_PREVIEW and starting compile */
export const PREVIEW_DEBOUNCE_MS = 300;

/** How often parent sends PING */
export const PREVIEW_PING_INTERVAL_MS = 5_000;

/** How many missed PONGs before parent force-reloads iframe */
export const PREVIEW_MAX_MISSED_PONGS = 2;

// ─── CDN URLS — PRIORITY ORDER (first that loads wins) ───────────────────

export const CDN_BABEL = [
  'https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.0/babel.min.js',
  'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js',
];

export const CDN_REACT = [
  'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
];

export const CDN_REACT_DOM = [
  'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
];

export const CDN_VUE = [
  'https://cdn.jsdelivr.net/npm/vue@3.4.21/dist/vue.global.prod.js',
  'https://unpkg.com/vue@3.4.21/dist/vue.global.prod.js',
];

export const CDN_VUE_COMPILER = [
  'https://cdn.jsdelivr.net/npm/@vue/compiler-dom@3.4.21/dist/compiler-dom.global.prod.js',
  'https://unpkg.com/@vue/compiler-dom@3.4.21/dist/compiler-dom.global.prod.js',
];

export const CDN_TAILWIND = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/src/index.js',
];

// ─── STACK TYPES ─────────────────────────────────────────────────────────

export type PreviewStack =
  | 'nextjs'        // Next.js pages or app router
  | 'react-vite'    // React + Vite (src/main.tsx pattern)
  | 'vue'           // Vue 3
  | 'html'          // Plain HTML/CSS/JS
  | 'unknown';      // Fallback — try React renderer

// ─── STACK DETECTION ─────────────────────────────────────────────────────

/**
 * Detect which frontend stack the generated files represent.
 * Call this in the preview runner BEFORE loading any runtimes.
 * The result determines which CDNs to load and which renderer to use.
 */
export function detectStack(
  files: Array<{ path: string; content: string }>
): PreviewStack {
  const paths = files.map(f => f.path.toLowerCase());
  const allContent = files.map(f => f.content || '').join('\n');

  // Vue detection — most specific first
  const hasVueFiles = paths.some(p => p.endsWith('.vue'));
  const hasVueImport = /from ['"]vue['"]/m.test(allContent);
  const hasCreateApp = /createApp\s*\(/.test(allContent);
  if (hasVueFiles || hasVueImport || hasCreateApp) return 'vue';

  // Next.js detection
  const hasNextConfig = paths.some(p => p.includes('next.config'));
  const hasPagesDir = paths.some(p => p.includes('/pages/') || p.startsWith('pages/'));
  const hasAppDir = paths.some(p => p.includes('/app/page.') || p.includes('/app/layout.'));
  const hasNextImport = /from ['"]next\//m.test(allContent);
  if (hasNextConfig || hasPagesDir || hasAppDir || hasNextImport) return 'nextjs';

  // React + Vite detection
  const hasViteConfig = paths.some(p => p.includes('vite.config'));
  const hasSrcMain = paths.some(p =>
    p === 'frontend/src/main.tsx' || p === 'frontend/src/main.jsx' ||
    p === 'src/main.tsx' || p === 'src/main.jsx'
  );
  const hasViteImport = /from ['"]vite['"]/m.test(allContent);
  const hasReactDomRender = /ReactDOM\.(createRoot|render)\s*\(/.test(allContent);
  if (hasViteConfig || hasSrcMain || hasViteImport || hasReactDomRender) return 'react-vite';

  // Plain HTML detection
  const hasHtmlFile = paths.some(p =>
    p === 'index.html' || p === 'frontend/index.html' || p.endsWith('/index.html')
  );
  if (hasHtmlFile) return 'html';

  // Unknown — default to React best-effort
  return 'unknown';
}

// ─── ENTRY FILE SELECTION ─────────────────────────────────────────────────

/**
 * Select the best entry file for preview based on detected stack and files.
 * Returns the path of the best file or null if nothing suitable is found.
 */
export function selectEntryFile(
  files: Array<{ path: string; content: string }>,
  stack: PreviewStack,
  activeFilePath?: string
): string | null {

  const paths = files.map(f => f.path);

  // If user has manually selected a renderable file, use it
  if (activeFilePath) {
    const lower = activeFilePath.toLowerCase();
    const isRenderable =
      lower.endsWith('.tsx') || lower.endsWith('.jsx') ||
      lower.endsWith('.ts') || lower.endsWith('.js') ||
      lower.endsWith('.vue') || lower.endsWith('.html');
    if (isRenderable && paths.includes(activeFilePath)) {
      return activeFilePath;
    }
  }

  // Stack-specific priority lists
  const NEXTJS_PATTERNS = [
    'frontend/pages/index.tsx', 'frontend/pages/index.jsx',
    'frontend/src/pages/index.tsx', 'frontend/src/pages/index.jsx',
    'frontend/src/app/page.tsx', 'frontend/src/app/page.jsx',
    'pages/index.tsx', 'pages/index.jsx',
  ];

  const REACT_VITE_PATTERNS = [
    'frontend/src/App.tsx', 'frontend/src/App.jsx',
    'frontend/src/app.tsx', 'frontend/src/app.jsx',
    'src/App.tsx', 'src/App.jsx',
    'frontend/src/main.tsx', 'frontend/src/main.jsx',
  ];

  const VUE_PATTERNS = [
    'frontend/src/App.vue', 'src/App.vue',
    'frontend/src/app.vue', 'src/app.vue',
    'frontend/App.vue', 'App.vue',
  ];

  const HTML_PATTERNS = [
    'frontend/index.html', 'index.html',
    'frontend/public/index.html', 'public/index.html',
  ];

  // Try stack-specific patterns first
  let patterns: string[] = [];
  switch (stack) {
    case 'nextjs':   patterns = [...NEXTJS_PATTERNS, ...REACT_VITE_PATTERNS]; break;
    case 'react-vite': patterns = [...REACT_VITE_PATTERNS, ...NEXTJS_PATTERNS]; break;
    case 'vue':      patterns = VUE_PATTERNS; break;
    case 'html':     patterns = HTML_PATTERNS; break;
    default:         patterns = [...NEXTJS_PATTERNS, ...REACT_VITE_PATTERNS, ...VUE_PATTERNS];
  }

  for (const p of patterns) {
    if (paths.includes(p)) return p;
  }

  // Fuzzy fallback — find any file matching common entry names
  const entryNames = ['App.tsx', 'App.jsx', 'App.vue', 'page.tsx', 'index.tsx', 'index.jsx', 'index.html'];
  for (const name of entryNames) {
    const match = paths.find(p => p.endsWith(`/${name}`) || p === name);
    if (match) return match;
  }

  // Last resort — first renderable file
  const renderable = paths.find(p => {
    const l = p.toLowerCase();
    return (l.endsWith('.tsx') || l.endsWith('.jsx') || l.endsWith('.vue') || l.endsWith('.html'))
      && !l.includes('node_modules')
      && !l.includes('.d.ts');
  });
  return renderable || null;
}

// ─── SCRIPT LOADING UTILITIES ─────────────────────────────────────────────

/** Load a single script URL. Returns true if loaded, false if failed/timed out. */
export function loadScript(url: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) { resolve(true); return; }

    const script = document.createElement('script');
    const timer = setTimeout(() => {
      script.remove();
      resolve(false);
    }, timeoutMs);
    script.onload = () => { clearTimeout(timer); resolve(true); };
    script.onerror = () => { clearTimeout(timer); resolve(false); };
    script.src = url;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  });
}

/** Try a list of URLs in order. Return true if any succeeded. */
export async function loadScriptWithFallback(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    const ok = await loadScript(url);
    if (ok) return true;
    console.warn(`[preview] ${url} failed — trying fallback...`);
  }
  return false;
}

// ─── DEBOUNCE ─────────────────────────────────────────────────────────────

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// ─── BASE CSS ─────────────────────────────────────────────────────────────

/**
 * Returns a comprehensive CSS string that covers essential Tailwind utilities
 * and a CSS reset. Inject into iframe <head> so layout works even if
 * Tailwind CDN fails or hasn't loaded yet.
 */
export function getBasePreviewCSS(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.5; color: #111827; background: #ffffff; }
    #root, #app { min-height: 100vh; }
    img { max-width: 100%; display: block; }
    a { color: inherit; text-decoration: none; }
    button { cursor: pointer; font-family: inherit; border: none; background: none; }
    input, textarea, select { font-family: inherit; }

    /* Tailwind core utilities — essential set */
    .flex{display:flex}.flex-col{flex-direction:column}.flex-row{flex-direction:row}
    .flex-wrap{flex-wrap:wrap}.flex-1{flex:1 1 0%}.flex-none{flex:none}.flex-shrink-0{flex-shrink:0}
    .items-center{align-items:center}.items-start{align-items:flex-start}.items-end{align-items:flex-end}.items-stretch{align-items:stretch}
    .justify-center{justify-content:center}.justify-between{justify-content:space-between}.justify-end{justify-content:flex-end}.justify-start{justify-content:flex-start}
    .self-center{align-self:center}.self-start{align-self:flex-start}.self-end{align-self:flex-end}
    .grid{display:grid}.block{display:block}.inline{display:inline}.inline-block{display:inline-block}.inline-flex{display:inline-flex}.hidden{display:none}
    .w-full{width:100%}.w-auto{width:auto}.w-screen{width:100vw}.w-1\/2{width:50%}.w-1\/3{width:33.333333%}.w-2\/3{width:66.666667%}
    .h-full{height:100%}.h-auto{height:auto}.min-h-screen{min-height:100vh}.h-screen{height:100vh}
    .p-1{padding:0.25rem}.p-2{padding:0.5rem}.p-3{padding:0.75rem}.p-4{padding:1rem}.p-5{padding:1.25rem}.p-6{padding:1.5rem}.p-8{padding:2rem}.p-10{padding:2.5rem}.p-12{padding:3rem}
    .px-2{padding-left:0.5rem;padding-right:0.5rem}.px-3{padding-left:0.75rem;padding-right:0.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.px-8{padding-left:2rem;padding-right:2rem}
    .py-1{padding-top:0.25rem;padding-bottom:0.25rem}.py-2{padding-top:0.5rem;padding-bottom:0.5rem}.py-3{padding-top:0.75rem;padding-bottom:0.75rem}.py-4{padding-top:1rem;padding-bottom:1rem}.py-6{padding-top:1.5rem;padding-bottom:1.5rem}
    .pt-4{padding-top:1rem}.pb-4{padding-bottom:1rem}.pl-4{padding-left:1rem}.pr-4{padding-right:1rem}
    .m-0{margin:0}.m-auto{margin:auto}.mx-auto{margin-left:auto;margin-right:auto}
    .mt-1{margin-top:0.25rem}.mt-2{margin-top:0.5rem}.mt-3{margin-top:0.75rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.mt-8{margin-top:2rem}
    .mb-1{margin-bottom:0.25rem}.mb-2{margin-bottom:0.5rem}.mb-3{margin-bottom:0.75rem}.mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.mb-8{margin-bottom:2rem}
    .ml-2{margin-left:0.5rem}.ml-4{margin-left:1rem}.mr-2{margin-right:0.5rem}.mr-4{margin-right:1rem}
    .gap-1{gap:0.25rem}.gap-2{gap:0.5rem}.gap-3{gap:0.75rem}.gap-4{gap:1rem}.gap-6{gap:1.5rem}.gap-8{gap:2rem}
    .space-y-1>*+*{margin-top:0.25rem}.space-y-2>*+*{margin-top:0.5rem}.space-y-3>*+*{margin-top:0.75rem}.space-y-4>*+*{margin-top:1rem}.space-y-6>*+*{margin-top:1.5rem}
    .space-x-2>*+*{margin-left:0.5rem}.space-x-3>*+*{margin-left:0.75rem}.space-x-4>*+*{margin-left:1rem}
    .text-xs{font-size:0.75rem;line-height:1rem}.text-sm{font-size:0.875rem;line-height:1.25rem}.text-base{font-size:1rem}.text-lg{font-size:1.125rem}.text-xl{font-size:1.25rem}.text-2xl{font-size:1.5rem}.text-3xl{font-size:1.875rem}.text-4xl{font-size:2.25rem}.text-5xl{font-size:3rem}
    .font-light{font-weight:300}.font-normal{font-weight:400}.font-medium{font-weight:500}.font-semibold{font-weight:600}.font-bold{font-weight:700}.font-extrabold{font-weight:800}
    .text-center{text-align:center}.text-left{text-align:left}.text-right{text-align:right}.text-justify{text-align:justify}
    .text-white{color:#ffffff}.text-black{color:#000000}
    .text-gray-400{color:#9ca3af}.text-gray-500{color:#6b7280}.text-gray-600{color:#4b5563}.text-gray-700{color:#374151}.text-gray-800{color:#1f2937}.text-gray-900{color:#111827}
    .text-red-500{color:#ef4444}.text-red-600{color:#dc2626}
    .text-green-500{color:#22c55e}.text-green-600{color:#16a34a}
    .text-blue-500{color:#3b82f6}.text-blue-600{color:#2563eb}
    .text-indigo-600{color:#4f46e5}.text-indigo-700{color:#4338ca}
    .text-purple-600{color:#9333ea}.text-yellow-500{color:#eab308}.text-orange-500{color:#f97316}
    .bg-transparent{background-color:transparent}
    .bg-white{background-color:#ffffff}.bg-black{background-color:#000000}
    .bg-gray-50{background-color:#f9fafb}.bg-gray-100{background-color:#f3f4f6}.bg-gray-200{background-color:#e5e7eb}.bg-gray-800{background-color:#1f2937}.bg-gray-900{background-color:#111827}
    .bg-red-50{background-color:#fef2f2}.bg-red-500{background-color:#ef4444}.bg-red-600{background-color:#dc2626}
    .bg-green-50{background-color:#f0fdf4}.bg-green-500{background-color:#22c55e}
    .bg-blue-50{background-color:#eff6ff}.bg-blue-500{background-color:#3b82f6}.bg-blue-600{background-color:#2563eb}
    .bg-indigo-50{background-color:#eef2ff}.bg-indigo-600{background-color:#4f46e5}.bg-indigo-700{background-color:#4338ca}
    .bg-purple-600{background-color:#9333ea}.bg-yellow-400{background-color:#facc15}
    .border{border-width:1px;border-style:solid}.border-0{border-width:0}.border-2{border-width:2px;border-style:solid}.border-t{border-top-width:1px;border-top-style:solid}.border-b{border-bottom-width:1px;border-bottom-style:solid}
    .border-gray-100{border-color:#f3f4f6}.border-gray-200{border-color:#e5e7eb}.border-gray-300{border-color:#d1d5db}.border-gray-400{border-color:#9ca3af}
    .border-blue-500{border-color:#3b82f6}.border-indigo-500{border-color:#6366f1}.border-red-300{border-color:#fca5a5}.border-green-300{border-color:#86efac}
    .rounded-none{border-radius:0}.rounded-sm{border-radius:0.125rem}.rounded{border-radius:0.25rem}.rounded-md{border-radius:0.375rem}.rounded-lg{border-radius:0.5rem}.rounded-xl{border-radius:0.75rem}.rounded-2xl{border-radius:1rem}.rounded-3xl{border-radius:1.5rem}.rounded-full{border-radius:9999px}
    .shadow-none{box-shadow:none}.shadow-sm{box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}.shadow{box-shadow:0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)}.shadow-md{box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}.shadow-lg{box-shadow:0 10px 15px -3px rgba(0,0,0,0.1)}.shadow-xl{box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)}.shadow-2xl{box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)}
    .overflow-hidden{overflow:hidden}.overflow-auto{overflow:auto}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.overflow-scroll{overflow:scroll}
    .relative{position:relative}.absolute{position:absolute}.fixed{position:fixed}.sticky{position:sticky}.static{position:static}
    .top-0{top:0}.right-0{right:0}.bottom-0{bottom:0}.left-0{left:0}.inset-0{inset:0}
    .z-0{z-index:0}.z-10{z-index:10}.z-20{z-index:20}.z-50{z-index:50}
    .max-w-xs{max-width:20rem}.max-w-sm{max-width:24rem}.max-w-md{max-width:28rem}.max-w-lg{max-width:32rem}.max-w-xl{max-width:36rem}.max-w-2xl{max-width:42rem}.max-w-3xl{max-width:48rem}.max-w-4xl{max-width:56rem}.max-w-5xl{max-width:64rem}.max-w-6xl{max-width:72rem}.max-w-7xl{max-width:80rem}.max-w-full{max-width:100%}
    .grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.grid-cols-6{grid-template-columns:repeat(6,minmax(0,1fr))}.grid-cols-12{grid-template-columns:repeat(12,minmax(0,1fr))}
    .col-span-1{grid-column:span 1/span 1}.col-span-2{grid-column:span 2/span 2}.col-span-3{grid-column:span 3/span 3}.col-span-full{grid-column:1/-1}
    .cursor-pointer{cursor:pointer}.cursor-not-allowed{cursor:not-allowed}.cursor-default{cursor:default}
    .select-none{user-select:none}.select-text{user-select:text}
    .opacity-0{opacity:0}.opacity-50{opacity:0.5}.opacity-75{opacity:0.75}.opacity-100{opacity:1}
    .truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.whitespace-nowrap{white-space:nowrap}.whitespace-pre-wrap{white-space:pre-wrap}.break-words{overflow-wrap:break-word}
    .transition{transition-property:color,background-color,border-color,box-shadow,transform;transition-duration:150ms;transition-timing-function:cubic-bezier(0.4,0,0.2,1)}
    .transition-all{transition:all 150ms ease}.transition-colors{transition:color 150ms,background-color 150ms,border-color 150ms}.transition-transform{transition:transform 150ms ease}
    .duration-100{transition-duration:100ms}.duration-150{transition-duration:150ms}.duration-200{transition-duration:200ms}.duration-300{transition-duration:300ms}
    .ease-in-out{transition-timing-function:cubic-bezier(0.4,0,0.2,1)}
    .scale-95{transform:scale(0.95)}.scale-100{transform:scale(1)}.scale-105{transform:scale(1.05)}
    .rotate-90{transform:rotate(90deg)}.rotate-180{transform:rotate(180deg)}
    .list-none{list-style:none}.list-disc{list-style:disc}.list-decimal{list-style:decimal}
    .divide-y>*+*{border-top-width:1px;border-style:solid;border-color:#e5e7eb}
    .animate-spin{animation:spin 1s linear infinite}.animate-ping{animation:ping 1s cubic-bezier(0,0,0.2,1) infinite}.animate-pulse{animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite}.animate-bounce{animation:bounce 1s infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes ping{75%,100%{transform:scale(2);opacity:0}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    @keyframes bounce{0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(0.8,0,1,1)}50%{transform:none;animation-timing-function:cubic-bezier(0,0,0.2,1)}}
    .hover\:bg-gray-50:hover{background-color:#f9fafb}.hover\:bg-gray-100:hover{background-color:#f3f4f6}
    .hover\:bg-blue-600:hover{background-color:#2563eb}.hover\:bg-blue-700:hover{background-color:#1d4ed8}
    .hover\:bg-indigo-700:hover{background-color:#4338ca}
    .hover\:text-gray-900:hover{color:#111827}.hover\:text-indigo-600:hover{color:#4f46e5}
    .hover\:underline:hover{text-decoration:underline}
    .hover\:shadow-md:hover{box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}
    .hover\:scale-105:hover{transform:scale(1.05)}
    .focus\:outline-none:focus{outline:none}
    .focus\:ring-2:focus{box-shadow:0 0 0 2px rgba(99,102,241,0.4)}
    .focus\:ring-indigo-500:focus{box-shadow:0 0 0 2px rgba(99,102,241,0.5)}
    .focus\:border-indigo-500:focus{border-color:#6366f1}
    .active\:scale-95:active{transform:scale(0.95)}
    .disabled\:opacity-50:disabled{opacity:0.5}.disabled\:cursor-not-allowed:disabled{cursor:not-allowed}
    @media (min-width:640px){.sm\:flex{display:flex}.sm\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.sm\:px-6{padding-left:1.5rem;padding-right:1.5rem}}
    @media (min-width:768px){.md\:flex{display:flex}.md\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.md\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.md\:hidden{display:none}.md\:block{display:block}.md\:px-8{padding-left:2rem;padding-right:2rem}.md\:text-4xl{font-size:2.25rem}}
    @media (min-width:1024px){.lg\:flex{display:flex}.lg\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.lg\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.lg\:px-8{padding-left:2rem;padding-right:2rem}}
  `;
}
