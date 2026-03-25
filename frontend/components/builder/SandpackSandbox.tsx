import React, { useMemo, useState, useEffect } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  SandpackFileExplorer
} from '@codesandbox/sandpack-react';

interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

interface SandpackSandboxProps {
  files: GeneratedFile[];
  activeFile?: string;
}

export default function SandpackSandbox({ files, activeFile }: SandpackSandboxProps) {
  // We MUST debounce the files because the AI streams characters every 50ms.
  // Sandpack will crash with "dispatch in idle mode" if we DOS it with constant updates.
  const [debouncedFiles, setDebouncedFiles] = useState<GeneratedFile[]>(files);
  const [viewMode, setViewMode] = useState<'code' | 'split' | 'preview'>('split');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFiles(files), 2500);
    return () => clearTimeout(timer);
  }, [files]);

  // Convert our flat AI file array into Sandpack's required Virtual File System map.
  const sandpackFiles = useMemo(() => {
    const virtualFiles: Record<string, string> = {};
    let hasPackageJson = false;

    debouncedFiles.forEach((f) => {
      // Sandpack requires absolute paths starting with '/'
      let fp = f.path.startsWith('/') ? f.path : `/${f.path}`;
      
      // Our AI generates paths like 'frontend/pages/index.tsx', but Sandpack's Next.js template
      // expects 'pages/index.tsx' at the root. We strip the 'frontend/' prefix.
      if (fp.startsWith('/frontend/')) {
        fp = fp.replace('/frontend/', '/');
      }
      
      // completely ignore a generated package.json so Sandpack can manage its own internal Next.js environment
      if (fp.includes('package.json') || fp.includes('package-lock.json')) return;
      virtualFiles[fp] = f.content;
    });

    // Force Tailwind CSS CDN injection exactly into the Next.js Document root,
    // bypassing Sandpack's CSP restrictions.
    if (!virtualFiles['/pages/_document.tsx'] && !virtualFiles['/pages/_document.js']) {
      virtualFiles['/pages/_document.tsx'] = `
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`;
    }

    return virtualFiles;
  }, [debouncedFiles]);

  // Determine the file to open in the active code editor tab
  const activePath = activeFile 
      ? activeFile.replace(/^frontend\//, '/').replace(/^\/?/, '/') 
      : '/pages/index.tsx';

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-gray-800 min-h-0">
      <style>{`
        .sp-wrapper,
        .sp-layout,
        .sp-stack,
        .sp-preview,
        .sp-preview-container,
        .sp-preview-iframe {
          height: 100% !important;
          min-height: 0 !important;
          flex: 1 1 100% !important;
        }
      `}</style>
      
      {/* UI Mode Toggle Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#151515] border-b border-[#333]">
        <div className="text-xs font-semibold text-gray-400">Sandbox Environment</div>
        <div className="flex bg-[#222] rounded-lg p-0.5 border border-gray-800 flex-shrink-0">
          <button 
            onClick={() => setViewMode('code')} 
            className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'code' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Code
          </button>
          <button 
            onClick={() => setViewMode('split')} 
            className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'split' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Split
          </button>
          <button 
            onClick={() => setViewMode('preview')} 
            className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Preview
          </button>
        </div>
      </div>

      <SandpackProvider
        template="nextjs"
        theme="dark"
        files={sandpackFiles}
        options={{
          activeFile: activePath,
          visibleFiles: Object.keys(sandpackFiles),
          autorun: true,
          recompileMode: "delayed",
          recompileDelay: 500
        }}
        customSetup={{
          dependencies: {
            "lucide-react": "latest",
            "axios": "0.27.2",
            "typescript": "latest",
            "@types/react": "latest",
            "@types/node": "latest",
            "@types/react-dom": "latest"
          }
        }}
      >
        <div className="flex w-full h-full border-none overflow-hidden min-h-0">
          {/* FAR LEFT: Native Sandpack File Tree */}
          <div className={`w-52 border-r border-[#333] h-full shrink-0 bg-[#151515] flex-col overflow-hidden min-h-0 ${viewMode === 'preview' ? 'hidden' : 'flex'}`}>
            <div className="px-3 py-1.5 text-xs font-mono text-gray-400 uppercase tracking-wider border-b border-[#333] shrink-0 bg-[#1e1e1e]">
              Explorer
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 relative custom-scrollbar-dark">
              <SandpackFileExplorer autoHiddenFiles={true} />
            </div>
          </div>

          {/* MIDDLE: Code Editor View */}
          <div className={`flex-1 border-r border-[#333] h-full shrink-0 overflow-hidden min-h-0 flex flex-col ${viewMode === 'preview' ? 'hidden' : 'flex'}`}>
            <div className="flex-1 overflow-hidden min-h-0 relative">
              <SandpackCodeEditor 
                style={{ height: '100%', minHeight: 0 }} 
                showTabs={true} 
                showLineNumbers={true} 
                showInlineErrors={true}
              />
            </div>
          </div>
          
          {/* RIGHT: Preview Window and Terminal Console */}
          <div className={`flex-[1.25] flex flex-col h-full bg-[#151515] overflow-hidden min-h-0 ${viewMode === 'code' ? 'hidden' : 'flex'}`}>
            <div className={`relative overflow-hidden bg-white shrink-0 flex flex-col min-h-0 ${viewMode === 'preview' ? 'h-full flex-1' : 'h-[85%]'}`}>
                <SandpackPreview 
                  style={{ flex: 1, minHeight: 0, height: '100%' }} 
                  showOpenInCodeSandbox={false} 
                  showRefreshButton={true} 
                />
            </div>
            
            {/* Terminal Console */}
            <div className={`border-t border-[#333] overflow-hidden flex-col bg-[#1e1e1e] shrink-0 min-h-0 ${viewMode === 'preview' ? 'hidden' : 'flex h-[15%]'}`}>
              <div className="flex-1 overflow-y-auto min-h-0 relative">
                <SandpackConsole style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              </div>
            </div>
          </div>
        </div>
      </SandpackProvider>
    </div>
  );
}
