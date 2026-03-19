# Own Preview Pipeline (Local Runner) - Full Technical Documentation

Last updated: 2026-03-19

## 1. Purpose

This document explains the current preview system used by the IDEA builder after Sandpack removal.

Goal:
- Render generated frontend code inside the app itself.
- Avoid dependency on CodeSandbox infrastructure.
- Keep preview resilient when generated code has missing imports or partial output.

Non-goals:
- Perfectly emulate a full Next.js runtime.
- Run backend APIs or server-side rendering in preview.

## 2. Current Architecture

The preview pipeline now has two parts:

1. Parent orchestrator page:
- File: frontend/pages/builder/ai-generate.tsx
- Responsibilities:
  - Choose which generated file should be used as preview entry.
  - Host an iframe pointing to /builder/preview-runner.
  - Send generated files and active entry source to iframe using postMessage.

2. Local runtime iframe page:
- File: frontend/pages/builder/preview-runner.tsx
- Responsibilities:
  - Initialize browser-side compile/runtime tools.
  - Compile TS/TSX/JSX modules using Babel standalone.
  - Resolve imports from in-memory generated files.
  - Mock unsupported modules.
  - Render the chosen component to the iframe DOM.

## 3. Runtime Flow (End-to-End)

### 3.1 High-level sequence

1. User generates code in ai-generate page.
2. Generated files are stored in memory as generatedProject.files.
3. User switches to Preview mode (or auto-preview selects a file).
4. ai-generate computes previewEntryPath.
5. iframe loads /builder/preview-runner.
6. preview-runner initializes scripts and posts PREVIEW_READY to parent.
7. parent receives PREVIEW_READY and sets previewRunnerReady=true.
8. parent posts UPDATE_PREVIEW payload with:
   - code (entry file source)
   - filePath (entry file path)
   - files[] (all generated files)
9. preview-runner compiles entry and transitive imports.
10. preview-runner renders component into iframe root.

### 3.2 Event contract

Message from child to parent:
- type: PREVIEW_READY

Message from parent to child:
- type: UPDATE_PREVIEW
- code: string
- filePath: string
- files: Array<{ path: string; content: string }>

## 4. Parent Orchestrator Details (ai-generate.tsx)

### 4.1 Entry file selection

Selection logic:
1. If current active file is frontend renderable (.tsx/.ts/.jsx/.js), use it.
2. Else prefer:
   - frontend/src/app/page.tsx
   - any /app/**/page.tsx
   - frontend/src/pages/index.tsx
   - any */App.tsx
   - any */app.tsx
   - first renderable frontend source file

This allows preview to work even when user has not manually selected a file.

### 4.2 Iframe mounting

The parent renders:
- iframe src=/builder/preview-runner
- sandbox=allow-scripts allow-same-origin allow-forms

On iframe onLoad:
- parent resets previewRunnerReady=false

After PREVIEW_READY:
- parent sends UPDATE_PREVIEW payload.

### 4.3 Local-only diagnostics

Preview header currently reports:
- selected entry path
- count of frontend-mapped files
- local runner mode label

## 5. Local Runtime Details (preview-runner.tsx)

## 5.1 Initialization

At startup, preview-runner loads:
- @babel/standalone from jsdelivr
- React UMD from jsdelivr
- ReactDOM UMD from jsdelivr
- Tailwind CDN script

If initialization succeeds:
- isReady=true
- child posts PREVIEW_READY to parent

If initialization fails:
- runner shows Initialization Failed error screen.

## 5.2 Compiler mode

Babel transform config:
- presets: react, typescript
- plugin: transform-modules-commonjs
- sourceType: module

This allows compiling TS/TSX modules into executable CommonJS-style functions in browser.

## 5.3 In-memory module system

The runner builds an internal module loader:
- Normalizes paths to forward-slash style.
- Resolves relative imports from importer directory.
- Resolves alias imports starting with @/ by probing candidate paths:
  - frontend/src/<alias>
  - frontend/<alias>
  - <alias>
- Supports extension probing:
  - .tsx, .ts, .jsx, .js, .json
  - index.* variants

It compiles modules lazily and memoizes exports using moduleCache.

## 5.4 Source sanitization

Before Babel transform:
- Removes UTF-8 BOM.
- Normalizes line endings.
- Fixes occasional malformed model output where declarations are prefixed with stray backslashes.

## 5.5 Runtime mocks

Built-in direct mocks include:
- axios
- @mui/material/styles
- @mui/material/*
- @mui/icons-material/*
- next/head
- next/link
- next/image
- next/router
- next/navigation
- @/contexts/AuthContext and related suffix variants
- lucide-react

Fallback behavior:
- Missing local or alias imports are replaced with generic visual mock modules instead of hard crash.
- Style imports (.css/.scss/.sass/.less) return empty object.
- JSON imports are parsed; invalid JSON returns empty object with warning.

## 5.6 Navigation safety

To keep preview contained, runtime blocks:
- window.location assignments/navigation
- window.open
- anchor navigation (non-hash href)
- form submit navigation

Blocked actions log warnings to console.

## 5.7 Error boundary

Rendered component is wrapped in RuntimeErrorBoundary so component runtime failures are shown in UI instead of white screen.

## 6. Rendering Strategy

After compiling the entry module, preview-runner chooses render target in this order:
1. default export
2. named export App
3. first exported function value

If no candidate is found:
- runner throws a clear error: no renderable component found.

## 7. Why This Replaced Sandpack

Previous issues with Sandpack path:
- External dependency fetch failures (403/500/timeouts).
- Vendor infrastructure dependency (col.csbops.io and package registry fetches).
- Preview breakage due to network instability.

Current local runner benefits:
- No CodeSandbox runtime dependency.
- Better control over module resolution and fallbacks.
- Easier to patch unsupported import patterns quickly.

## 8. Important Limitations

1. This is a client-side approximation, not full Next.js runtime.
2. Server-only features will not behave exactly like production.
3. Dynamic imports with unusual patterns may need extra handling.
4. Runtime still depends on CDN script load for Babel/React/Tailwind.
5. CSS behavior can differ from full app pipeline (PostCSS/Tailwind build-time transforms are not fully reproduced).

## 9. Troubleshooting Guide

## 9.1 Blank preview

Check:
1. iframe loaded /builder/preview-runner.
2. child posted PREVIEW_READY.
3. parent sent UPDATE_PREVIEW.
4. selected entry file actually exports a component.

## 9.2 Module not found

Expected behavior now:
- Most missing imports are mocked.

If still failing:
1. Check exact failing import string in console.
2. Add explicit mock branch in localRequire in preview-runner.tsx.
3. Re-test with same generated output.

## 9.3 Initialization failed

Likely causes:
- jsdelivr blocked/unreachable.

Actions:
1. Check network for babel/react/react-dom CDN requests.
2. Retry once.
3. If persistent, switch to locally bundled runtime assets in future enhancement.

## 9.4 Styling looks off

Likely causes:
- Build-time CSS toolchain not fully represented.
- Global styles not present in generated files.

Actions:
1. Verify style imports exist in generated frontend files.
2. Verify Tailwind classes are present in markup.
3. Add mock/theme fallbacks if specific framework assumptions exist.

## 10. Security and Isolation Notes

Current iframe sandbox flags:
- allow-scripts
- allow-same-origin
- allow-forms

Runner also blocks navigation side effects in code.

Recommendation:
- Keep runtime-only mocks strict and avoid exposing parent app state into iframe.

## 11. Operational Checklist (For Future Changes)

When changing preview behavior:
1. Update parent event payload shape and child handler together.
2. Keep UPDATE_PREVIEW backward compatible where possible.
3. Add explicit mocks before adding heavy dependency loaders.
4. Verify with at least:
   - Next pages-style app
   - app router-style app
   - auth context imports
   - axios calls
   - MUI imports

## 12. Suggested Future Enhancements

1. Bundle Babel/React runtime locally to remove CDN dependency.
2. Add telemetry events for preview compile stages.
3. Add preview profile mode that logs module resolution tree.
4. Add optional strict mode to fail on unresolved imports for debugging.
5. Add CSS pipeline adapter for closer parity with production styling.

## 13. Files Involved

Primary files:
- frontend/pages/builder/ai-generate.tsx
- frontend/pages/builder/preview-runner.tsx

Related types and generation context:
- frontend/types/generation.ts
- frontend/hooks/useRequirementsFlow.ts

Removed dependency path:
- @codesandbox/sandpack-react has been removed from frontend package dependencies.

## 14. Quick Reference

Parent route:
- /builder/ai-generate

Iframe route:
- /builder/preview-runner

Child ready signal:
- PREVIEW_READY

Parent update message:
- UPDATE_PREVIEW

Payload minimum required:
- code
- filePath
- files[]

If all above are present and runtime initialized, preview should render without Sandpack.
