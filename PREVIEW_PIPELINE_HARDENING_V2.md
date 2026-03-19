# Preview Pipeline — Multi-Stack Production Hardening Report
> Agent Execution Document
> Version: 2.0 | Date: 2026-03-19
> Supersedes: PREVIEW_PIPELINE_HARDENING.md v1.0
> Target files: frontend/pages/builder/preview-runner.tsx
>               frontend/pages/builder/ai-generate.tsx
>               frontend/lib/previewUtils.ts (new — replaces v1 version)

---

## ═══════════════════════════════════════════════
## MASTER AGENT INSTRUCTIONS — READ COMPLETELY
## BEFORE TOUCHING ANY FILE
## ═══════════════════════════════════════════════

### What You Are
You are an AI coding agent hardening the IDEA Platform's preview pipeline
so it works reliably across ALL generated stacks — not just Next.js.

### What This Document Adds vs v1.0
Version 1.0 of this document covered React/Next.js only. This version adds:
- Stack detection (React+Vite vs Next.js vs Vue 3 vs plain HTML)
- Vue 3 runtime loading and compile path
- Vue-specific mocks (vue-router, pinia, @vueuse/core, etc.)
- React+Vite specific entry patterns (src/main.tsx, src/App.tsx)
- Plain HTML / vanilla JS direct injection renderer
- Per-stack CDN loading (Vue CDN alongside React CDN)
- Updated entry file selector covering all four stacks
- All fixes from v1.0 are preserved and extended

### Agent Rules — Absolute

```
RULE 1 — READ BEFORE WRITE
  Before editing any file, read it fully first.
  Confirm every variable name, function name, and class name you plan to
  reference actually exists in that file. Never assume names from this
  document are accurate — this document describes intent. The file is truth.

RULE 2 — ONE FIX AT A TIME
  Complete one numbered step fully. Run its verification. Confirm pass.
  Only then start the next step. Never batch steps together.

RULE 3 — SCOPE: THREE FILES ONLY
  frontend/lib/previewUtils.ts            — utility file (replace v1 entirely)
  frontend/pages/builder/preview-runner.tsx  — iframe runtime (modify)
  frontend/pages/builder/ai-generate.tsx     — parent orchestrator (modify)
  Do not touch any other file.

RULE 4 — NEVER REWRITE ENTIRE FILES
  preview-runner.tsx and ai-generate.tsx are large and partially working.
  Make surgical edits only. Tags:
  [NEW FILE]        = file does not exist, create it fresh
  [REPLACE FILE]    = replace the entire file (only for previewUtils.ts)
  [FIND+REPLACE]    = locate exact string, replace only that string
  [FIND+INSERT after]  = locate anchor string, insert immediately after
  [FIND+INSERT before] = locate anchor string, insert immediately before
  [APPEND to function] = find named function, add code at end of its body

RULE 5 — STOP CONDITIONS
  Stop and report to the user if:
  - A variable/function is named differently than this document expects
  - Any CDN URL already exists in a different form that would conflict
  - A stack detection step would require touching a file outside scope
  - Any step would break existing React/Next.js preview behavior

RULE 6 — VERIFY BEFORE PROCEEDING
  Every step ends with [VERIFY]. Run it. If it fails, fix only that step.
  Do not proceed with a failing verification.

RULE 7 — PRESERVE v1 FIXES
  All 11 fixes from v1.0 (CDN fallback, timeout, cache clear, debounce,
  React mocks, compile events, security guards, base CSS, message queue,
  heartbeat, status indicator) remain in place. This document extends them,
  never removes them.
```

### Tag Legend

| Tag | Meaning |
|-----|---------|
| `[NEW FILE]` | File does not exist. Create at exact path given. |
| `[REPLACE FILE]` | Entirely replace the named file with the given content. |
| `[FIND+REPLACE]` | Locate exact string in file. Replace only that string. |
| `[FIND+INSERT after]` | Locate anchor string. Insert new code immediately after it. |
| `[FIND+INSERT before]` | Locate anchor string. Insert new code immediately before it. |
| `[APPEND to function]` | Find named function. Add code at end of its body. |
| `[VERIFY]` | Run this check. Must pass before next step. |
| `[STOP IF]` | Condition requiring halt and user report. |

---

## ═══════════════════════════════════════════════
## PART 1 — STACK COVERAGE GAP ANALYSIS
## (Why v1.0 was incomplete)
## ═══════════════════════════════════════════════

### What the IDEA Platform Generates

The platform generates four distinct frontend stacks:

| Stack | Entry File Pattern | Runtime API | Module System |
|---|---|---|---|
| Next.js Pages Router | `frontend/pages/index.tsx`, `pages/login.tsx` | `ReactDOM.createRoot` | CommonJS via Babel |
| Next.js App Router | `frontend/src/app/page.tsx`, `app/layout.tsx` | `ReactDOM.createRoot` | CommonJS via Babel |
| React + Vite | `frontend/src/main.tsx`, `src/App.tsx` | `ReactDOM.createRoot` | CommonJS via Babel |
| Vue 3 | `frontend/src/main.ts`, `src/App.vue` | `Vue.createApp` | CommonJS via Babel + Vue transform |
| Plain HTML/JS | `index.html`, `frontend/index.html` | `innerHTML` injection | None |

### What v1.0 Covered vs What Was Missing

| Feature | v1.0 Status | v2.0 |
|---|---|---|
| React CDN loading | ✅ Covered | Extended with fallbacks |
| ReactDOM rendering | ✅ Covered | Extended |
| Next.js import mocks | ✅ Covered | Preserved |
| Vue CDN loading | ❌ MISSING | Added |
| Vue runtime detection | ❌ MISSING | Added |
| Vue single-file component (.vue) | ❌ MISSING | Added |
| Vue 3 createApp rendering | ❌ MISSING | Added |
| vue-router mock | ❌ MISSING | Added |
| pinia mock | ❌ MISSING | Added |
| @vueuse/core mock | ❌ MISSING | Added |
| React+Vite entry detection | ❌ MISSING | Added |
| Vite-specific imports (`virtual:`, `/@vite/`) | ❌ MISSING | Added |
| Plain HTML direct injection | ❌ MISSING | Added |
| Stack auto-detection from files | ❌ MISSING | Added |
| Per-stack entry file selector | Partial | Complete |
| Other language stacks (Angular, Svelte) | ❌ MISSING | Graceful fallback added |

### How Stack Detection Works

The preview pipeline detects the stack from the generated files list
before selecting an entry file and loading runtimes. Detection priority:

```
1. Vue stack    → any file ending in .vue exists in the files list
                  OR src/main.ts imports from 'vue'
                  OR any file contains 'createApp' from 'vue'

2. Next.js stack → any file path contains /pages/ or /app/
                   OR next.config.js or next.config.ts exists
                   OR any file imports from 'next/'

3. React+Vite   → src/main.tsx or src/main.jsx exists
                  OR vite.config.ts/js exists
                  OR package.json references "vite"

4. Plain HTML   → index.html exists at root or frontend/ level

5. Unknown      → try React rendering as best-effort fallback
                  log warning to console
```

---

## ═══════════════════════════════════════════════
## PART 2 — REPLACE previewUtils.ts (COMPLETE FILE)
## ═══════════════════════════════════════════════

## STEP-0 — Replace previewUtils.ts

**Action:** [REPLACE FILE]
**File:** `frontend/lib/previewUtils.ts`

If this file exists from v1.0, replace it entirely.
If it does not exist, create it.

```typescript
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
    .w-full{width:100%}.w-auto{width:auto}.w-screen{width:100vw}.w-1\\/2{width:50%}.w-1\\/3{width:33.333333%}.w-2\\/3{width:66.666667%}
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
    .hover\\:bg-gray-50:hover{background-color:#f9fafb}.hover\\:bg-gray-100:hover{background-color:#f3f4f6}
    .hover\\:bg-blue-600:hover{background-color:#2563eb}.hover\\:bg-blue-700:hover{background-color:#1d4ed8}
    .hover\\:bg-indigo-700:hover{background-color:#4338ca}
    .hover\\:text-gray-900:hover{color:#111827}.hover\\:text-indigo-600:hover{color:#4f46e5}
    .hover\\:underline:hover{text-decoration:underline}
    .hover\\:shadow-md:hover{box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}
    .hover\\:scale-105:hover{transform:scale(1.05)}
    .focus\\:outline-none:focus{outline:none}
    .focus\\:ring-2:focus{box-shadow:0 0 0 2px rgba(99,102,241,0.4)}
    .focus\\:ring-indigo-500:focus{box-shadow:0 0 0 2px rgba(99,102,241,0.5)}
    .focus\\:border-indigo-500:focus{border-color:#6366f1}
    .active\\:scale-95:active{transform:scale(0.95)}
    .disabled\\:opacity-50:disabled{opacity:0.5}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}
    @media (min-width:640px){.sm\\:flex{display:flex}.sm\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.sm\\:px-6{padding-left:1.5rem;padding-right:1.5rem}}
    @media (min-width:768px){.md\\:flex{display:flex}.md\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.md\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.md\\:hidden{display:none}.md\\:block{display:block}.md\\:px-8{padding-left:2rem;padding-right:2rem}.md\\:text-4xl{font-size:2.25rem}}
    @media (min-width:1024px){.lg\\:flex{display:flex}.lg\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.lg\\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.lg\\:px-8{padding-left:2rem;padding-right:2rem}}
  `;
}
```

### [VERIFY] STEP-0
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "previewUtils"
# Expected: no errors referencing previewUtils.ts
# If v1 file exists and this replaces it, confirm the new exports
# (detectStack, selectEntryFile, getBasePreviewCSS) are present
```

---

## ═══════════════════════════════════════════════
## PART 3 — PREVIEW-RUNNER.TSX MODIFICATIONS
## ═══════════════════════════════════════════════

## STEP-1 — Update Imports in preview-runner.tsx

**Action:** [FIND+REPLACE]
**File:** `frontend/pages/builder/preview-runner.tsx`

Find the existing import from previewUtils (added in v1.0). Replace it
with the extended import that includes new v2 exports:

```typescript
// FIND (the existing previewUtils import, may look like one of these):
import {
  loadScriptWithFallback,
  CDN_BABEL, CDN_REACT, CDN_REACT_DOM, CDN_TAILWIND,
  PREVIEW_MSG, PREVIEW_DEBOUNCE_MS, PREVIEW_INIT_TIMEOUT_MS,
  debounce
} from '../../lib/previewUtils';

// REPLACE WITH:
import {
  loadScriptWithFallback,
  CDN_BABEL, CDN_REACT, CDN_REACT_DOM, CDN_TAILWIND,
  CDN_VUE, CDN_VUE_COMPILER,
  PREVIEW_MSG, PREVIEW_DEBOUNCE_MS, PREVIEW_INIT_TIMEOUT_MS,
  debounce,
  detectStack, selectEntryFile, getBasePreviewCSS,
  type PreviewStack,
} from '../../lib/previewUtils';
```

[STOP IF] previewUtils is not yet imported in this file (v1.0 was not applied).
In that case, add this import as a new line near the top of the file.

### [VERIFY] STEP-1
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors
```

---

## STEP-2 — Add Stack Detection State Variable

**Action:** [FIND+INSERT after]
**File:** `frontend/pages/builder/preview-runner.tsx`

Find the state variable that tracks whether the runner is initialized.
It will look like:
```typescript
let isReady = false;
// OR:
const [isReady, setIsReady] = useState(false);
// OR:
let previewRunnerReady = false;
```

Insert immediately after it:
```typescript
// [INSERT AFTER isReady / previewRunnerReady declaration]
// Track which stack this preview session is running
let currentStack: PreviewStack = 'unknown';
// Track which Vue CDN libs loaded (only relevant for Vue stack)
let vueLoaded = false;
```

### [VERIFY] STEP-2
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors
```

---

## STEP-3 — Add Vue CDN Loading to Initialization

**Action:** [FIND+INSERT after]
**File:** `frontend/pages/builder/preview-runner.tsx`

The initialization function currently loads Babel, React, ReactDOM, and Tailwind.
Vue loading must NOT happen at startup (it's a large download and unnecessary for
React apps). Instead, Vue loads on-demand when the first UPDATE_PREVIEW message
arrives and the stack is detected as 'vue'.

Find the end of the Tailwind loading line inside the initialization function.
Insert a helper function for on-demand Vue loading:

```typescript
// [INSERT AFTER the Tailwind CDN loading block, still inside the file
//  but OUTSIDE the initialization function — as a standalone async function]

/**
 * Load Vue 3 + Vue compiler on demand.
 * Only called when detectStack() returns 'vue'.
 * Idempotent — safe to call multiple times.
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
    console.warn('[preview] Vue compiler CDN failed — template-only .vue files may not render');
    // Non-fatal — Options API and Composition API without templates still work
  }

  vueLoaded = true;
  console.log('[preview] Vue 3 loaded successfully');
  return true;
}
```

### [VERIFY] STEP-3
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors
```

---

## STEP-4 — Add Stack Detection to UPDATE_PREVIEW Handler

**Action:** [FIND+INSERT after]
**File:** `frontend/pages/builder/preview-runner.tsx`

Read the file. Find the UPDATE_PREVIEW message handler. At the very start of
its body (after cache clearing from v1.0 fix), add stack detection:

```typescript
// [INSERT AFTER the moduleCache.clear() line at the start of UPDATE_PREVIEW handler]

// Detect the stack from the received files
const receivedFiles = (data.files || []) as Array<{ path: string; content: string }>;
currentStack = detectStack(receivedFiles);
console.log(`[preview] Stack detected: ${currentStack}`);

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
      filePath: data.filePath || 'unknown',
      error: 'Vue 3 runtime failed to load. Check your internet connection.',
      line: null,
    }, '*');
    return;
  }
}
```

[STOP IF] The UPDATE_PREVIEW handler does not have direct access to `data.files`
at the point you are inserting. Read the handler structure and find where `files`
is extracted from the message, then insert after that extraction.

### [VERIFY] STEP-4
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors
```

---

## STEP-5 — Add Vue-Aware Entry File Selection

**Action:** [FIND+REPLACE]
**File:** `frontend/pages/builder/preview-runner.tsx`

The current entry file selection logic is React/Next.js biased. Replace it
with the `selectEntryFile` function from previewUtils which is stack-aware.

Find the entry file selection logic in the UPDATE_PREVIEW handler. It will
look something like:

```typescript
// FIND (the existing entry selection — pattern varies):
const entryPath = data.filePath || selectBestFile(files) || files[0]?.path;
// OR:
let previewEntryPath = data.filePath;
if (!previewEntryPath) {
  previewEntryPath = files.find(f => f.path.includes('login') || ...) ...
}
```

Replace the entry selection with:

```typescript
// [REPLACE existing entry selection with:]
const entryPath = data.filePath
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
```

### [VERIFY] STEP-5
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors
```

---

## STEP-6 — Add Per-Stack Renderer

**Action:** [FIND+INSERT after]
**File:** `frontend/pages/builder/preview-runner.tsx`

This is the core multi-stack addition. After the entry file is selected and
compiled, the rendering step must branch by stack. The current code calls
`ReactDOM.createRoot()` unconditionally. Replace or wrap this with a
stack-aware dispatcher.

Find the render call. It will look like one of:

```typescript
// Pattern A:
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Component));

// Pattern B:
ReactDOM.render(React.createElement(Component), document.getElementById('root'));
```

**Insert this full renderer dispatcher function BEFORE the render call,
then replace the render call with `renderByStack(compiledModule)`:**

```typescript
// [INSERT BEFORE the existing ReactDOM render call — as a standalone function]

/**
 * Render the compiled module using the appropriate runtime for the detected stack.
 * This function handles React (Next.js + Vite), Vue 3, and plain HTML.
 */
async function renderByStack(
  compiledModuleExports: Record<string, any>,
  stack: PreviewStack,
  entryPath: string,
  allFiles: Array<{ path: string; content: string }>
): Promise<void> {

  const rootEl = document.getElementById('root') || document.getElementById('app') || document.body;

  // ── REACT renderer (Next.js pages, Next.js app router, React+Vite, unknown) ──
  if (stack === 'nextjs' || stack === 'react-vite' || stack === 'unknown') {
    const React_r = (window as any).React;
    const ReactDOM_r = (window as any).ReactDOM;

    if (!React_r || !ReactDOM_r) {
      throw new Error('React runtime not loaded. This should not happen after initialization.');
    }

    // Find the component to render
    const Component =
      compiledModuleExports.default ||
      compiledModuleExports.App ||
      Object.values(compiledModuleExports).find(v => typeof v === 'function');

    if (!Component) {
      throw new Error(
        `No renderable React component found in ${entryPath}. ` +
        `Make sure the file has a default export or a named "App" export.`
      );
    }

    // For Next.js app router — detect if it uses metadata export (server component pattern)
    // Wrap with a minimal client-side layout approximation
    const isAppRouterPage = entryPath.includes('/app/') && entryPath.endsWith('page.tsx');

    // Use createRoot (React 18) or fall back to legacy render
    if (ReactDOM_r.createRoot) {
      const root = ReactDOM_r.createRoot(rootEl);
      root.render(React_r.createElement(Component));
    } else {
      ReactDOM_r.render(React_r.createElement(Component), rootEl);
    }

    window.parent.postMessage({ type: PREVIEW_MSG.RENDER_DONE }, '*');
    return;
  }

  // ── VUE 3 renderer ──────────────────────────────────────────────────────
  if (stack === 'vue') {
    const Vue_v = (window as any).Vue;

    if (!Vue_v) {
      throw new Error('Vue 3 runtime not loaded.');
    }

    let AppComponent: any = null;

    // Case 1: The compiled module exports a Vue options/composition component
    if (compiledModuleExports.default && typeof compiledModuleExports.default === 'object') {
      AppComponent = compiledModuleExports.default;
    }
    // Case 2: The entry is a .vue SFC — need to parse template + script
    else if (entryPath.endsWith('.vue')) {
      AppComponent = await compileSFC(entryPath, allFiles, Vue_v);
    }
    // Case 3: Exported setup function or defineComponent
    else if (typeof compiledModuleExports.default === 'function') {
      AppComponent = { setup: compiledModuleExports.default };
    }
    // Case 4: Named export
    else {
      const namedExport = Object.values(compiledModuleExports).find(
        v => v && typeof v === 'object' && (v.setup || v.template || v.render || v.components)
      );
      if (namedExport) AppComponent = namedExport;
    }

    if (!AppComponent) {
      throw new Error(
        `No renderable Vue component found in ${entryPath}. ` +
        `Make sure the file has a default export of a Vue component.`
      );
    }

    // Mount — clear any previous Vue app first
    rootEl.innerHTML = '';
    const vueApp = Vue_v.createApp(AppComponent);

    // Install commonly generated Vue plugins (mocked)
    installVuePlugins(vueApp);

    vueApp.mount(rootEl);
    window.parent.postMessage({ type: PREVIEW_MSG.RENDER_DONE }, '*');
    return;
  }

  // ── PLAIN HTML renderer ─────────────────────────────────────────────────
  if (stack === 'html') {
    const htmlFile = allFiles.find(
      f => f.path === 'index.html' || f.path === 'frontend/index.html' || f.path.endsWith('/index.html')
    );
    if (!htmlFile) {
      throw new Error('No index.html file found for HTML stack preview.');
    }

    // Inline all referenced JS and CSS files into the HTML
    let htmlContent = htmlFile.content;

    // Replace <link rel="stylesheet" href="..."> with inline <style>
    htmlContent = htmlContent.replace(
      /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (_, href) => {
        const cssFile = allFiles.find(f => f.path.endsWith(href.split('/').pop() || ''));
        return cssFile ? `<style>${cssFile.content}</style>` : '';
      }
    );

    // Replace <script src="..."> with inline <script> for local files
    htmlContent = htmlContent.replace(
      /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi,
      (original, src) => {
        if (src.startsWith('http') || src.startsWith('//')) return original; // keep CDN scripts
        const jsFile = allFiles.find(f => f.path.endsWith(src.split('/').pop() || ''));
        return jsFile ? `<script>${jsFile.content}</script>` : '';
      }
    );

    // Write the full HTML to the iframe document
    document.open();
    document.write(htmlContent);
    document.close();

    window.parent.postMessage({ type: PREVIEW_MSG.RENDER_DONE }, '*');
    return;
  }
}

/**
 * Compile a Vue Single File Component (.vue) into a component options object.
 * Uses @vue/compiler-dom if available, otherwise extracts script block manually.
 */
async function compileSFC(
  filePath: string,
  allFiles: Array<{ path: string; content: string }>,
  Vue: any
): Promise<any> {

  const file = allFiles.find(f => f.path === filePath);
  if (!file) throw new Error(`SFC file not found: ${filePath}`);

  const source = file.content;

  // Extract <script> / <script setup> block
  const scriptMatch =
    source.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/i) ||
    source.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

  // Extract <template> block
  const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/i);

  // Extract <style> block
  const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

  if (styleMatch) {
    const style = document.createElement('style');
    style.textContent = styleMatch[1];
    document.head.appendChild(style);
  }

  let componentOptions: any = {};

  if (scriptMatch) {
    // Compile the script block with Babel
    const scriptCode = scriptMatch[1];
    try {
      const compiled = (window as any).Babel.transform(scriptCode, {
        presets: ['react', 'typescript'],
        plugins: ['transform-modules-commonjs'],
        sourceType: 'module',
        filename: filePath.replace('.vue', '.ts'),
      });

      const fn = new Function('require', 'exports', 'module', compiled.code);
      const mod: any = { exports: {} };
      fn(createRequireForVue(allFiles), mod.exports, mod);
      componentOptions = mod.exports.default || mod.exports;
    } catch (err: any) {
      console.warn(`[preview] SFC script compile error: ${err.message}`);
    }
  }

  // Add template if present and not already defined in script
  if (templateMatch && !componentOptions.template && !componentOptions.render) {
    componentOptions.template = templateMatch[1];
  }

  return componentOptions;
}

/**
 * Create a require function scoped to the Vue SFC context.
 * Reuses the same mock infrastructure as the React path.
 */
function createRequireForVue(
  allFiles: Array<{ path: string; content: string }>
): (id: string) => any {
  return (id: string) => {
    // Vue-specific mocks first, then fall through to existing localRequire
    const vueMock = getVueMock(id);
    if (vueMock !== null) return vueMock;

    // Fall back to the existing localRequire logic
    // [NOTE TO AGENT: call the existing localRequire function here
    //  if it is accessible in this scope. If not, inline the call.]
    return (typeof localRequire !== 'undefined')
      ? localRequire(id, '', allFiles)
      : {};
  };
}

/**
 * Install commonly generated Vue plugins into a Vue app instance.
 * Called before app.mount().
 */
function installVuePlugins(app: any): void {
  // Install vue-router mock
  const routerMock = getVueMock('vue-router');
  if (routerMock?.createRouter) {
    try {
      const router = routerMock.createRouter({
        history: routerMock.createWebHistory('/'),
        routes: [{ path: '/', component: { template: '<div />' } }]
      });
      app.use(router);
    } catch { /* ignore */ }
  }

  // Install pinia mock
  const piniaMock = getVueMock('pinia');
  if (piniaMock?.createPinia) {
    try {
      app.use(piniaMock.createPinia());
    } catch { /* ignore */ }
  }
}
```

**Now replace the existing render call with the dispatcher:**

```typescript
// [FIND the existing ReactDOM render call and REPLACE with:]
try {
  await renderByStack(compiledExports, currentStack, entryPath, receivedFiles);
} catch (renderErr: any) {
  window.parent.postMessage({
    type: PREVIEW_MSG.COMPILE_ERROR,
    filePath: entryPath,
    error: renderErr.message || 'Render failed',
    line: null,
  }, '*');
  // Also show error in the iframe itself
  showRenderError(renderErr.message);
}
```

**Add `showRenderError` helper:**

```typescript
// [APPEND near other error display helpers in preview-runner.tsx]
function showRenderError(message: string): void {
  const root = document.getElementById('root') || document.getElementById('app') || document.body;
  root.innerHTML = `
    <div style="padding:2rem;font-family:system-ui,sans-serif;background:#fef2f2;min-height:100vh;color:#991b1b;">
      <p style="font-weight:600;font-size:1rem;margin-bottom:0.5rem;">⚠ Render error</p>
      <pre style="font-size:0.75rem;white-space:pre-wrap;opacity:0.8;line-height:1.5;">${message}</pre>
    </div>
  `;
}
```

[STOP IF] The existing render call variable name for the compiled module exports
is different from `compiledExports`. Read the file, find the actual variable name,
and use that in the `renderByStack(compiledExports, ...)` call.

### [VERIFY] STEP-6
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors
# If there are errors about 'localRequire' not found in scope,
# read the file and replace the localRequire call with the actual function name
```

---

## STEP-7 — Add Vue-Specific Mocks to localRequire

**Action:** [FIND+INSERT after]
**File:** `frontend/pages/builder/preview-runner.tsx`

Read the file. Find the `localRequire` function (or whatever the internal
module resolver is called). After the last existing mock block (the universal
fallback added in v1.0), insert the `getVueMock` function alongside new
Vue-specific entries.

**Add this function OUTSIDE localRequire (as a standalone function in the file):**

```typescript
// [INSERT as a standalone function, accessible to localRequire and createRequireForVue]

/**
 * Returns a mock for Vue ecosystem libraries.
 * Returns null if the library is not a Vue-specific one (caller should proceed normally).
 */
function getVueMock(id: string): any {
  // Vue core — NOT mocked, must be real (loaded from CDN)
  // We return null so the caller loads the real Vue
  if (id === 'vue') {
    const Vue = (window as any).Vue;
    if (Vue) return Vue;
    console.error('[preview] Vue core requested but not loaded yet');
    return { ref: () => ({ value: null }), reactive: (o: any) => o, computed: (fn: any) => ({ value: fn() }), onMounted: () => {}, defineComponent: (o: any) => o, createApp: () => ({ mount: () => {}, use: () => {} }) };
  }

  // vue-router
  if (id === 'vue-router') {
    const Vue_vr = (window as any).Vue;
    const noopRoute = { path: '/', params: {}, query: {}, hash: '', fullPath: '/', matched: [], name: null, meta: {}, redirectedFrom: undefined };
    return {
      createRouter: (options: any) => ({
        install: (app: any) => {
          app.config = app.config || {};
          app.provide = app.provide || (() => {});
          // Provide mock router globally
        },
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

  // pinia
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
            get: (t, k) => k in t ? t[k] : () => {},
            set: (t, k, v) => { t[k] = v; return true; },
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

  // @vueuse/core
  if (id === '@vueuse/core') {
    const Vue_vu = (window as any).Vue;
    const ref = Vue_vu?.ref || ((v: any) => ({ value: v }));
    const computed = Vue_vu?.computed || ((fn: any) => ({ value: fn() }));
    return {
      useLocalStorage: (key: string, defaultVal: any) => ref(defaultVal),
      useSessionStorage: (key: string, defaultVal: any) => ref(defaultVal),
      useDark: () => ref(false),
      useToggle: (init = false) => { const v = ref(init); return [v, () => { v.value = !v.value; }]; },
      useWindowSize: () => ({ width: ref(window.innerWidth), height: ref(window.innerHeight) }),
      useMousePosition: () => ({ x: ref(0), y: ref(0) }),
      useDebounce: (v: any) => v,
      useThrottle: (v: any) => v,
      useFetch: (url: string) => ({ data: ref(null), error: ref(null), isFetching: ref(false) }),
      useClipboard: () => ({ copy: async () => {}, copied: ref(false), text: ref('') }),
      useTitle: (title?: string) => { if (title) document.title = title; return ref(title || ''); },
      useBreakpoints: () => ({ sm: ref(true), md: ref(true), lg: ref(true), xl: ref(false) }),
      useIntersectionObserver: (target: any, fn: any) => ({ stop: () => {} }),
      onClickOutside: (target: any, fn: any) => ({ stop: () => {} }),
      useEventListener: () => ({ stop: () => {} }),
      refDebounced: (v: any) => v,
      whenever: () => {},
      watch: Vue_vu?.watch || (() => () => {}),
      watchEffect: Vue_vu?.watchEffect || (() => () => {}),
      useVModel: (props: any, key: string) => computed(() => props[key]),
    };
  }

  // @vueuse/head (SEO meta management)
  if (id === '@vueuse/head' || id === '@unhead/vue') {
    return {
      createHead: () => ({ install: () => {} }),
      useHead: () => {},
      useSeoMeta: () => {},
    };
  }

  // vue-i18n
  if (id === 'vue-i18n') {
    const translationFn = (key: string) => key;
    return {
      createI18n: (options: any) => ({
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

  // vee-validate (form validation for Vue)
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
      useField: (name: string) => ({
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

  // axios (same mock as React path but needs to be accessible in Vue context)
  if (id === 'axios') {
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

  // Vite virtual modules and special imports
  if (id.startsWith('virtual:') || id.startsWith('/@vite/') || id.startsWith('/@fs/')) {
    console.warn(`[preview] Vite virtual module "${id}" mocked`);
    return {};
  }

  // Not a Vue-specific mock — return null so caller proceeds to React mocks
  return null;
}
```

**Also update `localRequire` to call `getVueMock` first:**

```typescript
// [FIND+INSERT before the first existing mock check in localRequire]
// e.g., find: if (id === 'axios') {
// INSERT BEFORE it:

// Check Vue-specific mocks first (returns null if not a Vue library)
const vueMockResult = getVueMock(id);
if (vueMockResult !== null) return vueMockResult;
```

### [VERIFY] STEP-7
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors
```

---

## STEP-8 — Inject Base CSS for All Stacks

**Action:** [FIND+REPLACE]
**File:** `frontend/pages/builder/preview-runner.tsx`

In v1.0 the base CSS was hardcoded inline. Replace the hardcoded CSS string
with a call to `getBasePreviewCSS()` from previewUtils:

```typescript
// FIND (the hardcoded CSS block from v1.0):
baseStyles.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ...long CSS string...
`;

// REPLACE WITH:
baseStyles.textContent = getBasePreviewCSS();
```

Also ensure the `#app` root div exists in the iframe for Vue (which uses `#app`
by convention) alongside the React `#root`:

```typescript
// FIND: document.body.innerHTML = '<div id="root"></div>';
// OR: rootEl.id = 'root';
// REPLACE WITH (add both):
document.body.innerHTML = '<div id="root"></div><div id="app" style="display:none"></div>';
// Vue renderer will set #app to display:block when it mounts
```

[STOP IF] The iframe body setup uses a different pattern. Read the file and
report the actual pattern used to set up the root container.

### [VERIFY] STEP-8
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors
```

---

## ═══════════════════════════════════════════════
## PART 4 — AI-GENERATE.TSX MODIFICATIONS
## ═══════════════════════════════════════════════

## STEP-9 — Handle STACK_DETECTED Message in Parent

**Action:** [FIND+INSERT after]
**File:** `frontend/pages/builder/ai-generate.tsx`

The parent now receives a `STACK_DETECTED` message from the child. Handle it
to update the preview panel label and inform the user which stack is previewing.

Find the message listener in the parent. Inside it, after the existing
PREVIEW_READY / COMPILE_START handlers, add:

```typescript
// [INSERT inside the parent's message listener]
if (event.data?.type === PREVIEW_MSG.STACK_DETECTED) {
  setPreviewStack(event.data.stack as PreviewStack);
}
```

**Add state declaration:**

```typescript
// [INSERT near other preview state declarations]
import type { PreviewStack } from '../../lib/previewUtils';
// ...
const [previewStack, setPreviewStack] = useState<PreviewStack>('unknown');
```

**Update preview panel header to show stack badge:**

```tsx
{/* [INSERT in preview panel header JSX, near the existing "Local Runner" label] */}
{previewStack !== 'unknown' && (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
    previewStack === 'vue'        ? 'bg-green-100 text-green-700' :
    previewStack === 'nextjs'     ? 'bg-black text-white' :
    previewStack === 'react-vite' ? 'bg-blue-100 text-blue-700' :
    previewStack === 'html'       ? 'bg-orange-100 text-orange-700' :
    'bg-gray-100 text-gray-600'
  }`}>
    {previewStack === 'vue'        && '⬡ Vue 3'}
    {previewStack === 'nextjs'     && '▲ Next.js'}
    {previewStack === 'react-vite' && '⚡ React+Vite'}
    {previewStack === 'html'       && '◇ HTML'}
  </span>
)}
```

### [VERIFY] STEP-9
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors
```

---

## ═══════════════════════════════════════════════
## PART 5 — FULL VERIFICATION
## ═══════════════════════════════════════════════

### BUILD CHECK
```bash
cd frontend && npm run build 2>&1 | tail -15
# Expected: build succeeds
# preview-runner, ai-generate, select-ai pages in page list
# 0 TypeScript errors
```

### MANUAL TEST MATRIX — ALL STACKS

Run each scenario. All must pass.

```
━━━ NEXT.JS STACK ━━━

SCENARIO N1: Next.js pages router auth form
  Action: Generate "auth app with login and signup" — default settings
  Expected: Stack badge shows "▲ Next.js" in preview header
  Expected: Login form renders with Tailwind styling
  Expected: "Live" green badge appears after rendering

SCENARIO N2: Next.js app router page
  Action: Generate an app that uses app router (src/app/page.tsx)
  Expected: Preview renders the app router page
  Expected: Stack badge shows "▲ Next.js"

━━━ REACT + VITE STACK ━━━

SCENARIO R1: React+Vite app detection
  Action: Generate a React app where the AI creates src/main.tsx + src/App.tsx
  Expected: Stack badge shows "⚡ React+Vite"
  Expected: App.tsx component renders in preview

SCENARIO R2: Vite virtual module handling
  Action: Generate code that imports from 'virtual:' or '@vite/client'
  Expected: Preview renders WITHOUT crash (Vite virtual imports are mocked)
  Expected: Console shows "[preview] Vite virtual module mocked" warning

━━━ VUE 3 STACK ━━━

SCENARIO V1: Vue 3 composition API detection
  Action: Generate a Vue app (prompt: "build a Vue 3 todo app")
  Expected: Stack badge shows "⬡ Vue 3"
  Expected: Vue CDN loads (check Network tab — vue.global.prod.js should load)
  Expected: Vue component renders in the #app div

SCENARIO V2: Vue component with vue-router
  Action: Generate Vue app with routing (includes vue-router import)
  Expected: Preview renders without crash
  Expected: vue-router is mocked (no real routing, no crash)

SCENARIO V3: Vue component with pinia
  Action: Generate Vue app with pinia store
  Expected: Preview renders without crash
  Expected: Store is mocked (no real persistence, but no crash)

SCENARIO V4: Vue SFC (.vue file) rendering
  Action: Generate Vue app where AI outputs App.vue with <template> + <script>
  Expected: Template renders in preview
  Expected: <style> block in SFC is injected into iframe head

━━━ PLAIN HTML STACK ━━━

SCENARIO H1: Static HTML page
  Action: Generate a static landing page (AI outputs index.html + style.css)
  Expected: Stack badge shows "◇ HTML"
  Expected: index.html renders in preview with styles
  Expected: CSS file is inlined into the HTML

━━━ CROSS-STACK RESILIENCE ━━━

SCENARIO X1: Unknown stack fallback
  Action: Provide generated files with no identifiable stack markers
  Expected: Stack detection returns 'unknown'
  Expected: React renderer is attempted as fallback
  Expected: Console shows "[preview] Stack detected: unknown"

SCENARIO X2: Stack switch between generations
  Action: Generate a Next.js app (stack = nextjs)
  Action: Then immediately generate a Vue app (stack = vue)
  Expected: moduleCache is cleared between generations
  Expected: Vue runtime loads for second generation
  Expected: "⬡ Vue 3" badge replaces "▲ Next.js" badge
  Expected: Vue component renders (not the old React one)

SCENARIO X3: Vue CDN fallback
  Action: Block jsdelivr.net in DevTools → Network
  Action: Generate a Vue app
  Expected: unpkg.com Vue CDN is attempted as fallback
  Expected: If both CDNs fail: clear error message about Vue not loading
  Expected: NOT a silent blank screen

SCENARIO X4: React mock coverage (from v1.0)
  Action: Generate React app using react-hook-form
  Expected: Preview renders — form mock is present
SCENARIO X5: framer-motion mock
  Action: Generate React app using framer-motion
  Expected: Preview renders — motion.div renders as plain div
```

---

## ═══════════════════════════════════════════════
## PART 6 — COMPLETE FILES CHANGED SUMMARY
## ═══════════════════════════════════════════════

| File | Action | What Changed |
|------|--------|-------------|
| `frontend/lib/previewUtils.ts` | **REPLACED** | Added: `detectStack`, `selectEntryFile`, `getBasePreviewCSS`, `CDN_VUE`, `CDN_VUE_COMPILER`, `PreviewStack` type, `STACK_DETECTED` message type, extended base CSS covering Vue `#app` root |
| `frontend/pages/builder/preview-runner.tsx` | **MODIFIED** | Added: `ensureVueLoaded()`, `renderByStack()`, `compileSFC()`, `createRequireForVue()`, `installVuePlugins()`, `getVueMock()`, `showRenderError()`, stack detection state, `getVueMock` hook in `localRequire`, Vue CDN imports, `#app` root div, `STACK_DETECTED` postMessage, updated entry file selector |
| `frontend/pages/builder/ai-generate.tsx` | **MODIFIED** | Added: `previewStack` state, `STACK_DETECTED` handler, stack badge JSX in preview header |

### Files NOT touched
```
frontend/pages/builder/preview.tsx
frontend/pages/builder/deployment.tsx
frontend/pages/builder/select-ai.tsx
frontend/pages/builder/new.tsx
frontend/pages/builder/select-modules.tsx
frontend/pages/builder/select-templates.tsx
frontend/pages/builder/select-backend.tsx
backend/*  — no backend changes whatsoever
```

---

## ═══════════════════════════════════════════════
## PART 7 — WHAT EACH STACK REQUIRES (REFERENCE)
## ═══════════════════════════════════════════════

This table is for understanding. The agent should already handle these
via the code added above. It serves as a verification checklist.

| Requirement | Next.js | React+Vite | Vue 3 | Plain HTML |
|---|---|---|---|---|
| Babel compiler | ✅ Required | ✅ Required | ✅ Required | ❌ Not needed |
| React CDN | ✅ Required | ✅ Required | ❌ Not needed | ❌ Not needed |
| Vue CDN | ❌ Not needed | ❌ Not needed | ✅ Required | ❌ Not needed |
| Vue compiler CDN | ❌ Not needed | ❌ Not needed | ✅ For SFCs | ❌ Not needed |
| Root div id | `#root` | `#root` | `#app` | N/A (full doc) |
| Render API | `ReactDOM.createRoot` | `ReactDOM.createRoot` | `Vue.createApp` | `document.write` |
| Entry pattern | `pages/index.tsx` | `src/App.tsx` | `src/App.vue` | `index.html` |
| Router mock | `next/router` ✅ | `react-router-dom` ✅ | `vue-router` ✅ | N/A |
| State mock | React hooks ✅ | Zustand ✅ | Pinia ✅ | N/A |

---

*End of document. Version 2.0. Agent-optimized. Multi-stack. Generated: 2026-03-19.*
*Scope: frontend/lib/previewUtils.ts + frontend/pages/builder/preview-runner.tsx*
*       + frontend/pages/builder/ai-generate.tsx*
