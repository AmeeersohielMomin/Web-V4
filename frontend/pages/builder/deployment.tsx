import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import JSZip from 'jszip';

interface GeneratedFile {
    path: string;
    content: string;
    language: string;
}

export default function Deployment() {
    const router = useRouter();
    const [projectData, setProjectData] = useState<any>(null);
    const [deploymentMethod, setDeploymentMethod] = useState<'download' | 'github'>('download');
    const [githubRepo, setGithubRepo] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiPath, setIsAiPath] = useState(false);

    // Code viewer state
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'frontend' | 'backend' | 'config'>('frontend');
    const [showCodeViewer, setShowCodeViewer] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('builderProject');
        if (saved) {
            const data = JSON.parse(saved);
            const aiGenerated = data.buildPath === 'ai' || !!data.generatedCode;
            setIsAiPath(aiGenerated);

            if (!aiGenerated && !data.backends) {
                router.push('/builder/select-backend');
                return;
            }
            if (aiGenerated && !data.generatedCode) {
                router.push('/builder/ai-generate');
                return;
            }
            setProjectData(data);

            // Auto-select first file for AI projects
            if (aiGenerated && data.generatedCode?.files?.length > 0) {
                setActiveFile(data.generatedCode.files[0].path);
            }
        } else {
            router.push('/builder/new');
        }
    }, []);

    // ─── File filtering for code viewer ───
    const getFilteredFiles = (tab: 'frontend' | 'backend' | 'config'): GeneratedFile[] => {
        if (!projectData?.generatedCode?.files) return [];
        return projectData.generatedCode.files.filter((f: GeneratedFile) => {
            if (tab === 'frontend') return f.path.includes('frontend') || f.path.includes('pages') || f.path.includes('components') || f.path.endsWith('.tsx') || f.path.endsWith('.jsx') || f.path.endsWith('.css') || f.path.endsWith('.html');
            if (tab === 'backend') return f.path.includes('backend') || f.path.includes('server') || f.path.includes('routes') || f.path.includes('service') || f.path.includes('controller') || f.path.includes('model') || f.path.includes('middleware');
            return f.path.includes('json') || f.path.includes('env') || f.path.includes('config') || f.path.includes('md') || f.path.includes('docker') || f.path.includes('gitignore');
        });
    };

    const activeFileContent = projectData?.generatedCode?.files?.find((f: GeneratedFile) => f.path === activeFile)?.content || '';

    const getFileIcon = (path: string) => {
        if (path.endsWith('.ts') || path.endsWith('.tsx')) return '📘';
        if (path.endsWith('.js') || path.endsWith('.jsx')) return '📙';
        if (path.endsWith('.json')) return '🔧';
        if (path.endsWith('.css')) return '🎨';
        if (path.endsWith('.html')) return '🌐';
        if (path.endsWith('.md')) return '📝';
        if (path.endsWith('.env') || path.includes('env')) return '🔐';
        return '📄';
    };

    // ─── AI Path: Download as proper ZIP ───
    const handleAiDownload = async () => {
        if (!projectData?.generatedCode?.files) return;
        setIsGenerating(true);

        try {
            const zip = new JSZip();
            const files: GeneratedFile[] = projectData.generatedCode.files;
            const projectName = projectData.projectName || 'ai-project';

            // Add each file to the ZIP with its proper path
            files.forEach((file: GeneratedFile) => {
                zip.file(file.path, file.content);
            });

            // Add a README if one doesn't exist
            if (!files.some((f: GeneratedFile) => f.path.toLowerCase().includes('readme'))) {
                const readme = `# ${projectName}\n\nGenerated with IDEA AI Builder.\n\n## Setup\n\n\`\`\`bash\n# Install backend dependencies\ncd backend\nnpm install\n\n# Install frontend dependencies\ncd ../frontend\nnpm install\n\n# Start development\nnpm run dev\n\`\`\`\n\n## Files\n\n${files.map((f: GeneratedFile) => `- \`${f.path}\``).join('\n')}\n`;
                zip.file('README.md', readme);
            }

            // Generate and download the ZIP
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('ZIP creation error:', error);
            alert('❌ Failed to create ZIP. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ─── Template Path: Generate from backend API ───
    const handleTemplateDownload = async () => {
        if (!projectData) return;
        setIsGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/project/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    projectName: projectData.projectName,
                    modules: projectData.modules,
                    templates: projectData.templates,
                    backends: projectData.backends
                })
            });
            if (!response.ok) throw new Error('Generation failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectData.projectName}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            alert('✅ Project generated and downloaded!');
            localStorage.removeItem('builderProject');
            router.push('/dashboard');
        } catch (error) {
            alert('❌ Failed to generate project.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        isAiPath ? handleAiDownload() : handleTemplateDownload();
    };

    // ─── GitHub Push ───
    const handlePushToGithub = async () => {
        if (!projectData || !githubRepo || !githubToken) {
            alert('Please provide GitHub repository name and personal access token');
            return;
        }
        const sanitizedRepo = githubRepo.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_.]/g, '').replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9]+$/, '');
        if (!sanitizedRepo) { alert('❌ Invalid repository name.'); return; }
        if (sanitizedRepo !== githubRepo && !window.confirm(`Repo name will be: "${sanitizedRepo}"\n\nContinue?`)) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/project/deploy-github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    projectName: projectData.projectName,
                    modules: projectData.modules || [],
                    templates: projectData.templates || {},
                    backends: projectData.backends || {},
                    generatedCode: isAiPath ? projectData.generatedCode : undefined,
                    buildPath: isAiPath ? 'ai' : 'template',
                    githubRepo: sanitizedRepo,
                    githubToken
                })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(err.error || 'Failed');
            }
            const result = await response.json();
            if (result.success) {
                alert(`✅ Pushed to GitHub!\n\nRepo: ${result.data.repoUrl}\n\ngit clone ${result.data.cloneUrl}`);
                localStorage.removeItem('builderProject');
                router.push('/dashboard');
            }
        } catch (error: any) {
            alert(`❌ ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBack = () => {
        router.push(isAiPath ? '/builder/ai-generate' : '/builder/select-backend');
    };

    const copyFile = () => {
        navigator.clipboard.writeText(activeFileContent);
    };

    if (!projectData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
                <div className="relative"><div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" /></div>
            </div>
        );
    }

    const aiFiles: GeneratedFile[] = projectData?.generatedCode?.files || [];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.08),transparent)]" />

            {/* Top Navigation */}
            <div className="relative border-b border-white/5">
                <div className="max-w-full px-6 py-3 flex items-center justify-between">
                    <button onClick={handleBack} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm">Back</span>
                    </button>
                    <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-white">{projectData.projectName}</span>
                        {isAiPath && (
                            <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded border border-violet-500/30 font-medium">
                                ✨ AI Generated · {aiFiles.length} files
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        {isAiPath && (
                            <button
                                onClick={() => setShowCodeViewer(!showCodeViewer)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showCodeViewer ? 'bg-violet-500/20 border-violet-500/30 text-violet-400' : 'border-white/10 text-gray-400 hover:text-white'}`}
                            >
                                {showCodeViewer ? '📁 Hide Code' : '📁 View Code'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="h-0.5 bg-gradient-to-r from-violet-500 to-green-500" />
            </div>

            <div className="relative flex h-[calc(100vh-52px)]">
                {/* ─── Left: Code Viewer (AI projects) ─── */}
                {isAiPath && showCodeViewer && (
                    <div className="flex-1 flex flex-col border-r border-white/5 min-w-0">
                        {/* File Tabs */}
                        <div className="flex items-center border-b border-white/5 px-3 py-2 gap-2 flex-shrink-0">
                            <div className="flex rounded-lg overflow-hidden border border-white/10">
                                {(['frontend', 'backend', 'config'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            const files = getFilteredFiles(tab);
                                            if (files.length > 0) setActiveFile(files[0].path);
                                        }}
                                        className={`px-3 py-1 text-[11px] font-medium transition-all ${activeTab === tab ? 'bg-violet-500/20 text-violet-400' : 'text-gray-600 hover:text-gray-400'}`}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[10px] text-gray-600 ml-auto">
                                {getFilteredFiles(activeTab).length} files
                            </span>
                        </div>

                        <div className="flex flex-1 min-h-0">
                            {/* File Tree */}
                            <div className="w-52 flex-shrink-0 border-r border-white/5 overflow-auto py-1">
                                {getFilteredFiles(activeTab).map((file) => (
                                    <button
                                        key={file.path}
                                        onClick={() => setActiveFile(file.path)}
                                        className={`w-full text-left px-3 py-1.5 text-xs font-mono truncate transition-all flex items-center space-x-1.5 ${
                                            activeFile === file.path
                                                ? 'bg-violet-500/15 text-violet-300 border-r-2 border-violet-500'
                                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        <span>{getFileIcon(file.path)}</span>
                                        <span className="truncate">{file.path.split('/').pop()}</span>
                                    </button>
                                ))}
                                {getFilteredFiles(activeTab).length === 0 && (
                                    <p className="text-xs text-gray-700 p-3">No {activeTab} files</p>
                                )}
                            </div>

                            {/* Code Panel */}
                            <div className="flex-1 flex flex-col min-w-0">
                                {activeFile && (
                                    <>
                                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/30 flex-shrink-0">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <span className="text-[10px] text-gray-600">📂</span>
                                                <span className="text-xs font-mono text-gray-400 truncate">{activeFile}</span>
                                            </div>
                                            <button onClick={copyFile} className="text-[10px] px-2 py-0.5 text-gray-600 hover:text-gray-300 border border-white/10 rounded transition-all hover:border-white/20 flex-shrink-0">
                                                Copy
                                            </button>
                                        </div>
                                        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-300 leading-relaxed bg-zinc-950/50">
                                            <code>{activeFileContent}</code>
                                        </pre>
                                    </>
                                )}
                                {!activeFile && (
                                    <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                                        Select a file to view its code
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Right: Deployment Options ─── */}
                <div className={`${isAiPath && showCodeViewer ? 'w-[420px]' : 'flex-1 max-w-3xl mx-auto'} flex-shrink-0 overflow-auto p-6`}>
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-4 text-xl">
                            🚀
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Deploy your project</h1>
                        <p className="text-sm text-gray-400">
                            {isAiPath
                                ? `${aiFiles.length} files ready to download or push to GitHub`
                                : 'Choose how to receive your project'}
                        </p>
                    </div>

                    {/* Project Info Card */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-white">{projectData.projectName}</span>
                            {isAiPath && (
                                <span className="text-[10px] px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded font-medium">AI</span>
                            )}
                        </div>
                        {isAiPath ? (
                            <div className="flex flex-wrap gap-1.5">
                                {aiFiles.slice(0, 6).map((f: GeneratedFile, i: number) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-500 rounded font-mono">
                                        {f.path.split('/').pop()}
                                    </span>
                                ))}
                                {aiFiles.length > 6 && (
                                    <span className="text-[10px] px-2 py-0.5 text-gray-600">+{aiFiles.length - 6} more</span>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {(projectData.modules || []).map((m: string) => (
                                    <span key={m} className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded capitalize">{m}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Deploy Methods */}
                    <div className="space-y-3 mb-6">
                        {/* Download */}
                        <button
                            onClick={() => setDeploymentMethod('download')}
                            className={`w-full text-left p-4 rounded-xl transition-all flex items-center space-x-4 ${
                                deploymentMethod === 'download'
                                    ? 'bg-green-500/[0.08] border-2 border-green-500 shadow-lg shadow-green-500/10'
                                    : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="text-3xl">📦</div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white text-sm">Download ZIP</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {isAiPath ? 'Get all files as a proper ZIP with directory structure' : 'Download complete project as ZIP'}
                                </p>
                            </div>
                            {deploymentMethod === 'download' && (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        {/* GitHub */}
                        <button
                            onClick={() => setDeploymentMethod('github')}
                            className={`w-full text-left p-4 rounded-xl transition-all flex items-center space-x-4 ${
                                deploymentMethod === 'github'
                                    ? 'bg-blue-500/[0.08] border-2 border-blue-500 shadow-lg shadow-blue-500/10'
                                    : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="text-3xl">🐙</div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white text-sm">Push to GitHub</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Create a repo and push all code automatically</p>
                            </div>
                            {deploymentMethod === 'github' && (
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* GitHub Config */}
                    {deploymentMethod === 'github' && (
                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-2">Repository Name</label>
                                <input
                                    type="text"
                                    value={githubRepo}
                                    onChange={(e) => setGithubRepo(e.target.value)}
                                    placeholder="my-awesome-project"
                                    className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                {githubRepo && (
                                    <p className="text-[10px] text-blue-400 mt-1.5">
                                        → {githubRepo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_.]/g, '')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-2">Personal Access Token</label>
                                <input
                                    type="password"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Create token</a> with &apos;repo&apos; scope
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        {deploymentMethod === 'download' ? (
                            <button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Creating ZIP...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📦 Download ZIP ({aiFiles.length || '?'} files)</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handlePushToGithub}
                                disabled={isGenerating || !githubRepo || !githubToken}
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Pushing to GitHub...</span>
                                    </>
                                ) : (
                                    <span>🐙 Push to GitHub</span>
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleBack}
                            disabled={isGenerating}
                            className="w-full h-10 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white font-medium rounded-xl transition-all text-sm disabled:opacity-50"
                        >
                            ← Back to {isAiPath ? 'Generator' : 'Configure'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
