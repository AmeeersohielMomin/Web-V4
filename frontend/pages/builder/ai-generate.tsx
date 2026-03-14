import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

interface GeneratedFile {
    path: string;
    content: string;
    language: string;
}

interface GeneratedProject {
    projectName: string;
    description: string;
    files: GeneratedFile[];
    envVars?: { backend: Record<string, string>; frontend: Record<string, string> };
    dependencies?: { backend: Record<string, string>; frontend: Record<string, string> };
    setupInstructions?: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

// ─── Robust JSON extractor ───
function extractJSON(raw: string): GeneratedProject | null {
    // Try direct parse first
    try { return JSON.parse(raw.trim()); } catch {}

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = raw;
    // Remove opening fences like ```json or ```
    cleaned = cleaned.replace(/^[\s\S]*?```(?:json)?\s*\n?/i, '');
    // Remove closing fences
    cleaned = cleaned.replace(/\n?\s*```[\s\S]*$/, '');
    cleaned = cleaned.trim();
    try { return JSON.parse(cleaned); } catch {}

    // Try to find first { and last } 
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { return JSON.parse(raw.substring(firstBrace, lastBrace + 1)); } catch {}
    }

    return null;
}

// ─── File icon helper ───
function getFileIcon(path: string): string {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return '📘';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return '📙';
    if (path.endsWith('.json')) return '⚙️';
    if (path.endsWith('.css') || path.endsWith('.scss')) return '🎨';
    if (path.endsWith('.html')) return '🌐';
    if (path.endsWith('.md')) return '📝';
    if (path.includes('.env')) return '🔐';
    if (path.endsWith('.yml') || path.endsWith('.yaml')) return '📋';
    return '📄';
}

// ─── Build folder tree from flat paths ───
interface TreeNode {
    name: string;
    path: string;
    isFolder: boolean;
    children: TreeNode[];
}

function buildFileTree(files: GeneratedFile[]): TreeNode[] {
    const root: TreeNode[] = [];
    for (const file of files) {
        const parts = file.path.split('/');
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            const existingIdx = current.findIndex(n => n.name === part);
            if (existingIdx !== -1) {
                if (!isLast) current = current[existingIdx].children;
            } else {
                const node: TreeNode = {
                    name: part,
                    path: isLast ? file.path : parts.slice(0, i + 1).join('/'),
                    isFolder: !isLast,
                    children: []
                };
                current.push(node);
                if (!isLast) current = node.children;
            }
        }
    }
    // Sort: folders first, then alphabetical
    const sortTree = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach(n => sortTree(n.children));
    };
    sortTree(root);
    return root;
}

export default function AIGenerate() {
    const router = useRouter();
    const [projectData, setProjectData] = useState<any>(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamedText, setStreamedText] = useState('');
    const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState(0);
    const streamBoxRef = useRef<HTMLDivElement>(null);
    const projectFinalizedRef = useRef(false);
    const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('builderProject');
        if (!saved) { router.push('/builder/new'); return; }
        const data = JSON.parse(saved);
        setProjectData(data);
        setUserPrompt(`Build a ${data.projectName || 'web app'} with ${(data.modules || ['auth']).join(', ')} functionality`);
    }, []);

    useEffect(() => {
        if (streamBoxRef.current) streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
    }, [streamedText]);

    // Progress simulation
    useEffect(() => {
        if (!isGenerating) { setProgress(0); return; }
        const interval = setInterval(() => {
            setProgress(p => Math.min(p + Math.random() * 3, 90));
        }, 500);
        return () => clearInterval(interval);
    }, [isGenerating]);

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };


    const generate = async (prompt: string, isRefinement = false) => {
        setError('');
        setStreamedText('');
        if (!isRefinement) setGeneratedProject(null);
        projectFinalizedRef.current = false;
        isRefinement ? setIsRefining(true) : setIsGenerating(true);

        const endpoint = isRefinement ? '/api/ai/refine' : '/api/ai/generate';
        const body = isRefinement
            ? {
                provider: projectData.aiProvider || 'gemini',
                apiKey: projectData.aiApiKey || undefined,
                model: projectData.aiModel || 'gemini-2.5-flash',
                previousCode: streamedText,
                refinementRequest: prompt
            }
            : {
                provider: projectData.aiProvider || 'gemini',
                apiKey: projectData.aiApiKey || undefined,
                model: projectData.aiModel || 'gemini-2.5-flash',
                userPrompt: prompt,
                selectedModules: projectData.modules || ['auth'],
                projectName: projectData.projectName
            };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';
            const receivedFiles: GeneratedFile[] = [];
            let projectMeta = { projectName: projectData?.projectName || 'My Project', description: '' };

            const processSSELine = (line: string) => {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) return;
                const dataStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed.slice(5);
                try {
                    const data = JSON.parse(dataStr);

                    // Stream chunk (for the live preview)
                    if (data.text) {
                        fullText += data.text;
                        setStreamedText(fullText);
                    }

                    // Individual file from server-side parsing
                    if (data.path && data.content !== undefined) {
                        receivedFiles.push({
                            path: data.path,
                            content: data.content,
                            language: data.language || 'text'
                        });
                        // Update UI with files in real-time
                        setGeneratedProject(prev => {
                            const updated: GeneratedProject = prev ? { ...prev } : {
                                projectName: projectMeta.projectName,
                                description: projectMeta.description,
                                files: []
                            };
                            updated.files = [...receivedFiles];
                            return updated;
                        });
                        if (receivedFiles.length === 1) {
                            setActiveFile(data.path);
                        }
                        // Expand the folder for this file
                        setExpandedFolders(prev => {
                            const next = new Set(prev);
                            const parts = data.path.split('/');
                            for (let i = 1; i < parts.length; i++) {
                                next.add(parts.slice(0, i).join('/'));
                            }
                            return next;
                        });
                    }

                    // Complete event
                    if (data.fileCount !== undefined || data.tokensUsed !== undefined) {
                        if (data.projectName) projectMeta.projectName = data.projectName;
                        if (data.description) projectMeta.description = data.description;
                        if (receivedFiles.length > 0) {
                            projectFinalizedRef.current = true;
                            finalizeProject({
                                projectName: projectMeta.projectName,
                                description: projectMeta.description,
                                files: receivedFiles
                            });
                        }
                    }

                    // Error event
                    if (data.message && !data.text && (
                        data.message.toLowerCase().includes('error') ||
                        data.message.toLowerCase().includes('quota') ||
                        data.message.toLowerCase().includes('failed')
                    )) {
                        setError(data.message);
                    }
                } catch { }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    processSSELine(line);
                }
            }

            // CRITICAL: Flush remaining buffer after stream ends
            if (buffer.trim()) {
                processSSELine(buffer);
            }

            // Final fallback: if no files from server, try client-side parsing
            if (!projectFinalizedRef.current && receivedFiles.length === 0 && fullText.trim()) {
                const parsed = extractJSON(fullText);
                if (parsed && parsed.files && parsed.files.length > 0) {
                    projectFinalizedRef.current = true;
                    finalizeProject(parsed);
                } else {
                    // Absolute last resort — shouldn't happen with new server-side parsing
                    finalizeProject({
                        projectName: projectData?.projectName || 'My App',
                        description: prompt,
                        files: [{ path: 'generated-output.txt', content: fullText, language: 'text' }]
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Generation failed. Check your connection.');
        } finally {
            setIsGenerating(false);
            setIsRefining(false);
            setProgress(100);
        }
    };

    const finalizeProject = (project: GeneratedProject) => {
        setGeneratedProject(project);
        setProgress(100);
        if (project.files.length > 0) {
            setActiveFile(project.files[0].path);
            // Auto-expand all top-level folders
            const folders = new Set<string>();
            project.files.forEach(f => {
                const parts = f.path.split('/');
                if (parts.length > 1) folders.add(parts[0]);
                if (parts.length > 2) folders.add(parts.slice(0, 2).join('/'));
            });
            setExpandedFolders(folders);
        }
    };

    const handleGenerate = () => {
        if (!userPrompt.trim() || isGenerating) return;
        generate(userPrompt);
    };

    const handleRefine = () => {
        if (!refinementPrompt.trim() || isRefining || !generatedProject) return;
        generate(refinementPrompt, true);
        setRefinementPrompt('');
    };

    const handleDeploy = () => {
        if (generatedProject) {
            const saved = localStorage.getItem('builderProject');
            if (saved) {
                const data = JSON.parse(saved);
                data.generatedCode = generatedProject;
                data.buildPath = 'ai';
                localStorage.setItem('builderProject', JSON.stringify(data));
            }
            router.push('/builder/deployment');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const providerLabel = projectData?.aiProvider === 'openai' ? 'GPT-4o' : projectData?.aiProvider === 'anthropic' ? 'Claude' : 'Gemini';

    const activeFileContent = generatedProject?.files.find(f => f.path === activeFile)?.content || '';

    // Update preview when code or active file changes
    useEffect(() => {
        if (viewMode !== 'preview' || !iframeRef.current || !activeFileContent || !activeFile) return;

        // Only preview frontend files (tsx/jsx/html)
        const isFrontend =
            activeFile.includes('frontend') &&
            (activeFile.endsWith('.tsx') || activeFile.endsWith('.jsx') || activeFile.endsWith('.html'));

        if (!isFrontend) return;

        iframeRef.current.contentWindow?.postMessage(
            {
                type: 'UPDATE_PREVIEW',
                code: activeFileContent,
                files: generatedProject?.files || [],
                filePath: activeFile
            },
            '*'
        );
    }, [viewMode, activeFile, activeFileContent, generatedProject]);

    // Listen for messages from preview runner
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== 'PREVIEW_READY' || !activeFileContent || !activeFile) return;

            const isFrontend =
                activeFile.includes('frontend') &&
                (activeFile.endsWith('.tsx') || activeFile.endsWith('.jsx') || activeFile.endsWith('.html'));

            if (!isFrontend) return;

            iframeRef.current?.contentWindow?.postMessage(
                {
                    type: 'UPDATE_PREVIEW',
                    code: activeFileContent,
                    files: generatedProject?.files || [],
                    filePath: activeFile
                },
                '*'
            );
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [activeFileContent, activeFile, generatedProject]);
    const fileTree = generatedProject ? buildFileTree(generatedProject.files) : [];

    // ─── Render file tree recursively ───
    const renderTreeNode = (node: TreeNode, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.path);
        const isActive = activeFile === node.path;
        const indent = depth * 16;

        if (node.isFolder) {
            return (
                <div key={node.path}>
                    <button
                        onClick={() => toggleFolder(node.path)}
                        className="w-full text-left flex items-center py-1 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/[0.03] transition-all"
                        style={{ paddingLeft: `${8 + indent}px` }}
                    >
                        <svg className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="mr-1">{isExpanded ? '📂' : '📁'}</span>
                        <span className="font-medium">{node.name}</span>
                    </button>
                    {isExpanded && node.children.map(child => renderTreeNode(child, depth + 1))}
                </div>
            );
        }

        return (
            <button
                key={node.path}
                onClick={() => setActiveFile(node.path)}
                className={`w-full text-left flex items-center py-1 px-2 text-xs transition-all ${
                    isActive
                        ? 'bg-violet-500/15 text-violet-300 border-r-2 border-violet-500'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}
                style={{ paddingLeft: `${8 + indent}px` }}
            >
                <span className="mr-1.5 text-[10px]">{getFileIcon(node.path)}</span>
                <span className="truncate">{node.name}</span>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,70,255,0.1),transparent)]" />

            {/* Top Bar */}
            <div className="relative border-b border-white/5 flex-shrink-0 z-10">
                <div className="px-4 py-2.5 flex items-center justify-between">
                    <button onClick={() => router.push('/builder/select-ai')} className="flex items-center space-x-1.5 text-gray-400 hover:text-white transition-colors group text-sm">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-white">{projectData?.projectName}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded border border-violet-500/30 font-medium">
                            {providerLabel} · {projectData?.aiModel || 'gemini-2.5-flash'}
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        {generatedProject && (
                            <>
                                <button
                                    onClick={() => { setGeneratedProject(null); setStreamedText(''); setActiveFile(null); }}
                                    className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-all"
                                >
                                    ↻ Regenerate
                                </button>
                                <button
                                    onClick={handleDeploy}
                                    className="text-xs px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center space-x-1"
                                >
                                    <span>🚀 Deploy</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                {(isGenerating || isRefining) && (
                    <div className="h-0.5 bg-white/5">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="relative flex-1 flex flex-col overflow-hidden">
                {/* ─── Prompt View (before generation) ─── */}
                {!generatedProject && !isGenerating && (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="max-w-2xl w-full">
                            <div className="text-center mb-8">
                                <div className="text-5xl mb-4">✨</div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    What do you want to build?
                                </h1>
                                <p className="text-gray-400">Describe your app and AI will generate the complete codebase with proper folder structure.</p>
                            </div>

                            <div className="relative mb-4">
                                <textarea
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    placeholder="e.g. Build a SaaS task manager with user auth, workspaces, and a dashboard with charts..."
                                    rows={4}
                                    className="w-full px-5 py-4 bg-white/[0.04] border border-white/15 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all resize-none text-base leading-relaxed"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                {['Add user roles & permissions', 'Include dashboard with charts', 'Add email notifications', 'Include file upload'].map((s) => (
                                    <button key={s} onClick={() => setUserPrompt(prev => prev + '. ' + s)} className="text-[11px] px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg border border-white/10 hover:border-violet-500/30 hover:text-violet-400 transition-all">
                                        + {s}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!userPrompt.trim()}
                                className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold text-lg rounded-2xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-3 shadow-2xl shadow-violet-500/20"
                            >
                                <span>✨ Generate Full-Stack App</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Generating View (streaming) ─── */}
                {isGenerating && !generatedProject && (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="max-w-2xl w-full">
                            <div className="text-center mb-6">
                                <div className="flex space-x-1.5 justify-center mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <p className="text-sm text-gray-400">AI is writing your code... this may take 20-30 seconds</p>
                            </div>

                            <div
                                ref={streamBoxRef}
                                className="h-72 bg-zinc-950 border border-white/10 rounded-xl p-4 overflow-auto font-mono text-xs text-green-400/80 leading-relaxed"
                            >
                                {streamedText || <span className="text-gray-600">Initializing generation...</span>}
                                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5 align-middle" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Code Viewer (Lovable-style split panel) ─── */}
                {generatedProject && (
                    <div className="flex-1 flex overflow-hidden">
                        {/* File Explorer */}
                        <div className="w-60 flex-shrink-0 border-r border-white/5 flex flex-col bg-zinc-950/50">
                            {/* File count header */}
                            <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-semibold text-white">Files</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded font-medium">
                                        {generatedProject.files.length}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        // Expand/collapse all
                                        if (expandedFolders.size > 0) {
                                            setExpandedFolders(new Set());
                                        } else {
                                            const all = new Set<string>();
                                            generatedProject.files.forEach(f => {
                                                const parts = f.path.split('/');
                                                for (let i = 1; i < parts.length; i++) {
                                                    all.add(parts.slice(0, i).join('/'));
                                                }
                                            });
                                            setExpandedFolders(all);
                                        }
                                    }}
                                    className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    {expandedFolders.size > 0 ? '⊟ Collapse' : '⊞ Expand'}
                                </button>
                            </div>

                            {/* Tree */}
                            <div className="flex-1 overflow-auto py-1">
                                {fileTree.map(node => renderTreeNode(node))}
                            </div>

                            {/* Project info footer */}
                            <div className="border-t border-white/5 px-3 py-2">
                                <p className="text-[10px] text-gray-600 truncate">{generatedProject.description?.substring(0, 60)}</p>
                            </div>
                        </div>

                        {/* Code Panel */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {activeFile ? (
                                <>
                                    {/* File header with Toggle */}
                                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/30 flex-shrink-0">
                                        <div className="flex items-center space-x-4 min-w-0">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <span className="text-sm">{getFileIcon(activeFile)}</span>
                                                <span className="text-xs font-mono text-gray-400 truncate">{activeFile}</span>
                                            </div>
                                            
                                            {/* Code/Preview Toggle */}
                                            {activeFile.includes('frontend') && (activeFile.endsWith('.tsx') || activeFile.endsWith('.jsx') || activeFile.endsWith('.html')) && (
                                                <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5 mx-2">
                                                    <button
                                                        onClick={() => setViewMode('code')}
                                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${viewMode === 'code' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        Code
                                                    </button>
                                                    <button
                                                        onClick={() => setViewMode('preview')}
                                                        className={`px-3 py-1 text-[10px] rounded-md transition-all ${viewMode === 'preview' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        Preview
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            <span className="text-[10px] text-gray-600">{activeFileContent.split('\n').length} lines</span>
                                            <button
                                                onClick={() => copyToClipboard(activeFileContent)}
                                                className="text-[10px] px-2 py-0.5 text-gray-500 hover:text-white border border-white/10 rounded hover:border-white/20 transition-all"
                                            >
                                                📋 Copy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content (Code or Preview) */}
                                    <div className="flex-1 overflow-hidden bg-zinc-950/50 relative">
                                        {/* Code View */}
                                        <div className={`h-full overflow-auto ${viewMode === 'code' ? 'block' : 'hidden'}`}>
                                            <pre className="p-4 text-xs font-mono leading-relaxed">
                                                {activeFileContent.split('\n').map((line, i) => (
                                                    <div key={i} className="flex hover:bg-white/[0.02]">
                                                        <span className="inline-block w-10 text-right pr-4 text-gray-700 select-none flex-shrink-0">{i + 1}</span>
                                                        <code className="text-gray-300 flex-1 whitespace-pre-wrap break-all">{line || ' '}</code>
                                                    </div>
                                                ))}
                                            </pre>
                                        </div>

                                        {/* Preview View (Pre-warmed) */}
                                        <div className={`h-full w-full bg-black relative ${viewMode === 'preview' ? 'block' : 'absolute inset-0 pointer-events-none opacity-0'}`}>
                                            <iframe
                                                ref={iframeRef}
                                                src="/builder/preview-runner"
                                                className="w-full h-full border-none"
                                                title="Live Preview"
                                            />
                                            {viewMode === 'preview' && !activeFileContent && (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-black/80">
                                                    Preparing preview...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-600">
                                    <div className="text-center">
                                        <div className="text-4xl mb-3">📂</div>
                                        <p className="text-sm">Select a file from the explorer</p>
                                    </div>
                                </div>
                            )}

                            {/* Refinement bar at bottom */}
                            <div className="border-t border-white/5 p-3 flex gap-2 flex-shrink-0">
                                <input
                                    type="text"
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                    placeholder="Ask AI to refine... e.g. Add dark mode toggle, add Stripe payments..."
                                    className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all text-sm"
                                />
                                <button
                                    onClick={handleRefine}
                                    disabled={isRefining || !refinementPrompt.trim()}
                                    className="px-4 py-2.5 bg-violet-500/20 border border-violet-500/30 text-violet-400 font-semibold rounded-xl transition-all disabled:opacity-30 text-sm hover:bg-violet-500/30"
                                >
                                    {isRefining ? '⏳' : '✨'} Refine
                                </button>
                                <button
                                    onClick={handleDeploy}
                                    className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl transition-all text-sm hover:from-green-600 hover:to-emerald-600"
                                >
                                    🚀 Deploy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-full mx-auto p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center space-x-2 z-20">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="text-red-400/50 hover:text-red-400">✕</button>
                    </div>
                )}
            </div>
        </div>
    );
}
