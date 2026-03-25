import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import api, { API_BASE_URL } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import VersionHistory from '@/components/VersionHistory';
import DeviceFrame from '@/components/DeviceFrame';
import { generateDockerfile, generateDockerCompose, generateGitHubActions, generateTestFile } from '@/lib/exportUtils';
import type { RequirementsDocument } from '../../types/generation';
import SandpackSandbox from '@/components/builder/SandpackSandbox';
interface GeneratedFile {
    path: string;
    content: string;
    language: string;
}

interface GeneratedProject {
    projectName: string;
    description: string;
    files: GeneratedFile[];
    projectId?: string | null;
    envVars?: { backend: Record<string, string>; frontend: Record<string, string> };
    dependencies?: { backend: Record<string, string>; frontend: Record<string, string> };
    setupInstructions?: string[];
}

interface ChatHistoryEntry {
    type: 'generate' | 'refine';
    prompt: string;
    createdAt: string;
}


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

function buildRefineContextFiles(files: GeneratedFile[], prompt: string): Array<{ path: string; content: string }> {
    const normalizedPrompt = String(prompt || '').toLowerCase();
    const terms = normalizedPrompt.split(/[^a-z0-9]+/i).filter((t) => t.length > 2);

    const scoreFile = (file: GeneratedFile): number => {
        const path = String(file.path || '').toLowerCase();
        let score = 0;
        if (/frontend\//.test(path)) score += 3;
        if (/backend\//.test(path)) score += 2;
        if (/pages\//.test(path)) score += 3;
        if (/service/.test(path)) score += 2;
        if (/controller|routes|schema|model/.test(path)) score += 1;
        if (/index\.|dashboard\.|server\./.test(path)) score += 2;
        for (const term of terms) {
            if (path.includes(term)) score += 4;
        }
        return score;
    };

    const sorted = [...(files || [])].sort((a, b) => scoreFile(b) - scoreFile(a));
    const selected = sorted.slice(0, 18);

    const maxCharsPerFile = 1400;
    const maxTotalChars = 22000;
    let totalChars = 0;

    const result: Array<{ path: string; content: string }> = [];
    for (const file of selected) {
        if (totalChars >= maxTotalChars) break;
        const raw = String(file.content || '');
        const remaining = Math.max(0, maxTotalChars - totalChars);
        const limit = Math.min(maxCharsPerFile, remaining);
        const content = raw.length > limit ? `${raw.slice(0, limit)}\n// ...truncated for refine context` : raw;
        totalChars += content.length;
        result.push({ path: file.path, content });
    }

    return result;
}

function buildChatProjectContext(files: GeneratedFile[]): { fileCount: number; keyFiles: string[]; modules: string[] } {
    const paths = (files || []).map((f) => String(f.path || ''));
    const moduleSet = new Set<string>();
    for (const path of paths) {
        const normalized = path.replace(/\\/g, '/').toLowerCase();
        const match = normalized.match(/^backend\/src\/modules\/([^/]+)\//);
        if (match?.[1]) moduleSet.add(match[1]);
    }

    const keyFiles = paths.slice(0, 40);
    return {
        fileCount: paths.length,
        keyFiles,
        modules: Array.from(moduleSet).slice(0, 20)
    };
}

function isRefinementIntent(message: string): boolean {
    const text = String(message || '').toLowerCase();
    return /(add|update|change|modify|fix|refactor|implement|create|remove|rename|improve|integrate|build|make|generate|code|api|page|component|route|schema|model)/.test(text);
}

function resolveModelForProvider(providerRaw: string, modelRaw?: string): string {
    const provider = String(providerRaw || 'gemini').trim().toLowerCase();
    const model = String(modelRaw || '').trim().replace(/^\/+/, '');

    if (provider === 'github') {
        if (/^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(model)) return model;
        if (/^gpt-/i.test(model)) return `openai/${model}`;
        if (/^llama-4-maverick$/i.test(model)) return 'meta/llama-4-maverick';
        return 'openai/gpt-4.1';
    }

    if (provider === 'openai') {
        const normalized = model.replace(/^openai\//i, '');
        if (!normalized || /^(gemini|claude|meta\/|nvidia\/|qwen|llama)/i.test(normalized)) {
            return 'gpt-4.1';
        }
        return normalized;
    }

    if (provider === 'gemini') {
        if (!model || /^(openai\/|meta\/|nvidia\/|claude|gpt-|qwen|llama)/i.test(model)) {
            return 'gemini-2.5-flash';
        }
        return model;
    }

    return model || 'gemini-2.5-flash';
}

export default function AIGenerate() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [projectData, setProjectData] = useState<any>(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamedText, setStreamedText] = useState('');
    const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [projectRequirements, setProjectRequirements] = useState<RequirementsDocument | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState(0);
    const streamBoxRef = useRef<HTMLDivElement>(null);
    const projectFinalizedRef = useRef(false);
    const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

    // ─── New feature state ───
    const [chatPanelOpen, setChatPanelOpen] = useState(true);
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]); 
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatBackendOfflineUntil, setChatBackendOfflineUntil] = useState<number>(0);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
    const [inviting, setInviting] = useState(false);
    const [inviteMsg, setInviteMsg] = useState('');
    const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [useV2Generation] = useState(true);
    const [generationPhase, setGenerationPhase] = useState('');
    const [generationMessage, setGenerationMessage] = useState('');
    const [generationProgress, setGenerationProgress] = useState(0);
    const [plannedModules, setPlannedModules] = useState<string[]>([]);
    const [completedModules, setCompletedModules] = useState<string[]>([]);
    const [generationStatus, setGenerationStatus] = useState<any>({ lastFailover: null });

    useEffect(() => {
        const init = async () => {
            if (!router.isReady) {
                return;
            }

            const existingProjectId =
                typeof router.query.projectId === 'string' ? router.query.projectId : null;

            if (existingProjectId) {
                try {
                    const response = await api.get(`/api/platform/projects/${existingProjectId}`);
                    const project = response.data?.data?.project;
                    const files = Array.isArray(project?.files) ? project.files : [];
                    const hydrated: GeneratedProject = {
                        projectName: String(project?.name || 'Saved Project'),
                        description: String(project?.description || ''),
                        files,
                        projectId: existingProjectId
                    };
                    setGeneratedProject(hydrated);
                    setChatHistory(
                        Array.isArray(project?.chatHistory)
                            ? project.chatHistory
                                  .filter((entry: any) => entry && typeof entry.prompt === 'string')
                                  .map((entry: any) => ({
                                      type: entry.type === 'refine' ? 'refine' : 'generate',
                                      prompt: String(entry.prompt),
                                      createdAt: String(entry.createdAt || new Date().toISOString())
                                  }))
                            : []
                    );
                    setProjectData({
                        projectName: hydrated.projectName,
                        modules: Array.isArray(project?.modules) ? project.modules : ['auth'],
                        aiProvider: project?.provider || 'gemini',
                        buildPath: 'ai'
                    });
                    setUserPrompt(
                        `Build a ${hydrated.projectName} with ${
                            Array.isArray(project?.modules) && project.modules.length > 0
                                ? project.modules.join(', ')
                                : 'auth'
                        } functionality`
                    );
                    if (files.length > 0) {
                        setActiveFile(files[0].path);
                    }
                    return;
                } catch {
                    // Fall back to localStorage flow if project fetch fails.
                }
            }

            const saved = localStorage.getItem('builderProject');
            if (!saved) {
                router.push('/builder/new');
                return;
            }
            const data = JSON.parse(saved);
            const storedRequirements = data?.requirements || null;
            setProjectRequirements(storedRequirements);

            const normalizedProvider = String(data.aiProvider || data.provider || 'gemini').toLowerCase();
            const normalizedModel = resolveModelForProvider(normalizedProvider, data.aiModel || data.model);
            data.aiProvider = normalizedProvider;
            data.provider = normalizedProvider;
            data.aiModel = normalizedModel;
            data.model = normalizedModel;

            setProjectData(data);
            if (Array.isArray(data.chatHistory)) {
                setChatHistory(data.chatHistory);
            }

            const requirementsPrompt = storedRequirements
                ? [
                    storedRequirements.compiledSummary,
                    Array.isArray(storedRequirements.coreFeatures) && storedRequirements.coreFeatures.length > 0
                        ? `Must-have features:\n${storedRequirements.coreFeatures.map((f: string) => `- ${f}`).join('\n')}`
                        : '',
                    storedRequirements.themeMode ? `Theme: ${storedRequirements.themeMode}` : '',
                    storedRequirements.techPreferences ? `Tech preferences: ${storedRequirements.techPreferences}` : ''
                ].filter(Boolean).join('\n\n')
                : '';

            setUserPrompt(
                data.userPrompt || requirementsPrompt ||
                `Build a complete full-stack ${data.projectName || 'web app'} based on the provided idea`
            );
        };

        void init();
    }, [router.isReady, router.query.projectId]);

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

        const endpoint = isRefinement
            ? '/api/ai/refine'
            : (useV2Generation ? '/api/ai/generate/v2' : '/api/ai/generate');
        const body = isRefinement
            ? {
                provider: projectData.aiProvider || 'gemini',
                apiKey: projectData.aiApiKey || undefined,
                model: resolveModelForProvider(projectData.aiProvider || 'gemini', projectData.aiModel),
                previousCode: buildRefineContextFiles(generatedProject?.files || [], prompt),
                refinementRequest: prompt,
                projectId: generatedProject?.projectId || null
            }
            : {
                provider: projectData.aiProvider || 'gemini',
                apiKey: projectData.aiApiKey || undefined,
                model: resolveModelForProvider(projectData.aiProvider || 'gemini', projectData.aiModel),
                userPrompt: prompt,
                selectedModules: Array.isArray(projectData.modules) ? projectData.modules : [],
                projectName: projectData.projectName,
                requirements: projectRequirements ?? undefined
            };

        try {
            if (!isRefinement) {
                setGenerationPhase('planning');
                setGenerationMessage('Preparing generation...');
                setGenerationProgress(1);
                setPlannedModules([]);
                setCompletedModules([]);
            }
            const token = getToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                let message = `Server error: ${response.status}`;
                try {
                    const errData = await response.json();
                    if (errData?.error) {
                        message = String(errData.error);
                    }
                } catch {
                    // Keep fallback message if response is not JSON.
                }
                throw new Error(message);
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';
            const receivedFiles: GeneratedFile[] = [];
            let projectMeta = {
                projectName: projectData?.projectName || 'My Project',
                description: '',
                projectId: null as string | null
            };

            const processSSELine = (line: string) => {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) return;
                const dataStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed.slice(5);
                try {
                    const data = JSON.parse(dataStr);
                    const eventType = String(data?.type || '');

                    if (eventType === 'phase') {
                        if (typeof data.phase === 'string') setGenerationPhase(data.phase);
                        if (typeof data.message === 'string') setGenerationMessage(data.message);
                        if (typeof data.progress === 'number') setGenerationProgress(data.progress);
                    }

                    if (eventType === 'plan') {
                        if (Array.isArray(data.modules)) setPlannedModules(data.modules.map((m: any) => String(m)));
                    }

                    if (eventType === 'module_complete' && typeof data.module === 'string') {
                        setCompletedModules((prev) => prev.includes(data.module) ? prev : [...prev, data.module]);
                    }

                    if (eventType === 'failover') {
                        const { phase, from, to, reason } = data;
                        setGenerationStatus((prev: any) => ({
                            ...prev,
                            lastFailover: { phase, from, to, reason, timestamp: Date.now() },
                        }));
                    }

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
                    if (eventType === 'complete' || data.fileCount !== undefined || data.tokensUsed !== undefined) {
                        if (data.projectName) projectMeta.projectName = data.projectName;
                        if (data.description) projectMeta.description = data.description;
                        if (typeof data.projectId === 'string' || data.projectId === null) {
                            projectMeta.projectId = data.projectId;
                        }
                        if (receivedFiles.length > 0) {
                            projectFinalizedRef.current = true;
                            finalizeProject({
                                projectName: projectMeta.projectName,
                                description: projectMeta.description,
                                files: receivedFiles,
                                projectId: projectMeta.projectId
                            });

                            // Auto-select the best file to preview after generation completes
                            const selectBestPreviewFile = (files: GeneratedFile[]): string | null => {
                                // Priority 1: main entry pages
                                const mainPage = files.find(f =>
                                    f.path.includes('/login') ||
                                    f.path.includes('/dashboard') ||
                                    f.path.includes('/index')
                                );
                                if (mainPage) return mainPage.path;

                                // Priority 2: any frontend TSX component
                                const frontendTsx = files.find(f =>
                                    f.path.startsWith('frontend/') && f.path.endsWith('.tsx')
                                );
                                if (frontendTsx) return frontendTsx.path;

                                // Priority 3: first file
                                return files[0]?.path || null;
                            };

                            const bestPreviewPath = selectBestPreviewFile(receivedFiles);
                            if (bestPreviewPath) {
                                // Use the same setter that clicking a file in the tree uses
                                // This triggers the existing postMessage to preview-runner.tsx
                                setActiveFile(bestPreviewPath);
                                setViewMode('preview');
                            }
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
                console.warn('[ai-generate] No files from server SSE. Attempting client-side JSON extraction...');
                console.log('[ai-generate] fullText length:', fullText.length);
                const parsed = extractJSON(fullText);
                if (parsed && parsed.files && parsed.files.length > 0) {
                    console.log('[ai-generate] Client-side JSON parse succeeded:', parsed.files.length, 'files');
                    projectFinalizedRef.current = true;
                    finalizeProject(parsed);
                } else {
                    // Try regex-based file extraction for truncated JSON
                    console.warn('[ai-generate] JSON.parse failed. Trying regex file extraction...');
                    const regexFiles: GeneratedFile[] = [];
                    const filePattern = /\{\s*"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"language"\s*:\s*"([^"]*)")?\s*\}/g;
                    let match;
                    while ((match = filePattern.exec(fullText)) !== null) {
                        try {
                            regexFiles.push({
                                path: match[1],
                                content: JSON.parse(`"${match[2]}"`),
                                language: match[3] || 'text'
                            });
                        } catch { /* skip malformed */ }
                    }

                    if (regexFiles.length > 0) {
                        console.log('[ai-generate] Regex extraction found', regexFiles.length, 'files');
                        // Try to get projectName from the text
                        const nameMatch = fullText.match(/"projectName"\s*:\s*"([^"]+)"/);
                        const descMatch = fullText.match(/"description"\s*:\s*"([^"]+)"/);
                        projectFinalizedRef.current = true;
                        finalizeProject({
                            projectName: nameMatch?.[1] || projectData?.projectName || 'My App',
                            description: descMatch?.[1] || prompt,
                            files: regexFiles
                        });
                    } else {
                        console.warn('[ai-generate] All extraction methods failed. Saving as raw text.');
                        finalizeProject({
                            projectName: projectData?.projectName || 'My App',
                            description: prompt,
                            files: [{ path: 'generated-output.txt', content: fullText, language: 'text' }]
                        });
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Generation failed. Check your connection.');
        } finally {
            setIsGenerating(false);
            setIsRefining(false);
            setProgress(100);
            setGenerationProgress(100);
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
        setChatHistory((current) => [
            ...current,
            {
                type: 'generate',
                prompt: userPrompt.trim(),
                createdAt: new Date().toISOString()
            }
        ]);
        generate(userPrompt);
    };

    const handleRefine = () => {
        if (!refinementPrompt.trim() || isRefining || !generatedProject) return;
        setChatHistory((current) => [
            ...current,
            {
                type: 'refine',
                prompt: refinementPrompt.trim(),
                createdAt: new Date().toISOString()
            }
        ]);
        generate(refinementPrompt, true);
        setRefinementPrompt('');
    };

    const handleDeploy = () => {
        if (generatedProject) {
            const saved = localStorage.getItem('builderProject');
            if (saved) {
                const data = JSON.parse(saved);
                data.generatedCode = generatedProject;
                data.projectId = generatedProject.projectId || null;
                data.chatHistory = chatHistory;
                data.buildPath = 'ai';
                localStorage.setItem('builderProject', JSON.stringify(data));
            }
            router.push('/builder/deployment');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // ─── Chat panel handlers ───
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleChatSend = async () => {
        if (!chatInput.trim() || chatLoading || !generatedProject) return;
        const msg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date() }]);
        setChatLoading(true);

        try {
            if (isRefinementIntent(msg)) {
                setChatHistory(current => [...current, { type: 'refine', prompt: msg, createdAt: new Date().toISOString() }]);
                await generate(msg, true);
                setChatMessages(prev => [...prev, { role: 'assistant', content: 'Code updated based on your request.', timestamp: new Date() }]);
            } else {
                if (Date.now() < chatBackendOfflineUntil) {
                    setChatMessages(prev => [
                        ...prev,
                        {
                            role: 'assistant',
                            content: 'AI chat is temporarily unavailable because backend API is offline. Start backend on http://localhost:5000 and retry in a few seconds.',
                            timestamp: new Date()
                        }
                    ]);
                    return;
                }

                const token = getToken();
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers.Authorization = `Bearer ${token}`;

                const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        provider: projectData.aiProvider || 'gemini',
                        apiKey: projectData.aiApiKey || undefined,
                        model: resolveModelForProvider(projectData.aiProvider || 'gemini', projectData.aiModel),
                        message: msg,
                        projectContext: {
                            projectName: generatedProject.projectName,
                            description: generatedProject.description,
                            ...buildChatProjectContext(generatedProject.files || [])
                        }
                    })
                });

                if (!response.ok) {
                    let errorMessage = `Chat request failed (${response.status})`;
                    try {
                        const errData = await response.json();
                        if (errData?.error) errorMessage = String(errData.error);
                    } catch {
                        // Keep default error message.
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                const reply = data?.data?.reply || 'I could not generate a response right now.';
                setChatMessages(prev => [...prev, { role: 'assistant', content: String(reply), timestamp: new Date() }]);
            }
        } catch (err: any) {
            const message = err?.message || 'Something went wrong while processing your request.';

            const lowered = String(message).toLowerCase();
            const isConnectivityError =
                lowered.includes('failed to fetch') ||
                lowered.includes('networkerror') ||
                lowered.includes('err_connection_refused') ||
                lowered.includes('connection refused');

            if (isConnectivityError) {
                // Pause chat network requests for a short window to avoid repeated console/network spam.
                setChatBackendOfflineUntil(Date.now() + 30_000);
            }

            setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${message}`, timestamp: new Date() }]);
        } finally {
            setChatLoading(false);
        }
    };

    // ─── Export handlers ───
    const downloadTextFile = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    const handleExportDocker = () => {
        const files = generatedProject?.files?.map(f => ({ path: f.path, content: f.content })) || [];
        downloadTextFile(generateDockerfile(files), 'Dockerfile');
    };

    const handleExportCompose = () => {
        downloadTextFile(generateDockerCompose(projectData?.projectName || 'app'), 'docker-compose.yml');
    };

    const handleExportCICD = () => {
        downloadTextFile(generateGitHubActions(projectData?.projectName || 'app'), 'ci.yml');
    };

    const handleExportTests = () => {
        downloadTextFile(generateTestFile(projectData?.projectName || 'app'), 'app.test.ts');
    };

    // ─── Publish toggle ───
    const handlePublishToggle = async () => {
        if (!generatedProject?.projectId) return;
        try {
            await api.patch(`/api/platform/projects/${generatedProject.projectId}/public`, { isPublic: !isPublished });
            setIsPublished(!isPublished);
        } catch { /* silently fail */ }
    };

    // ─── Invite handler ───
    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setInviteMsg('');
        try {
            await api.post('/api/platform/teams/invite', { email: inviteEmail.trim(), role: inviteRole });
            setInviteMsg('Invite sent!');
            setInviteEmail('');
        } catch (err: any) {
            setInviteMsg(err?.response?.data?.error || 'Failed to send invite');
        } finally {
            setInviting(false);
        }
    };

    // Persist builder state continuously so refresh/navigation does not lose chats or generated files.
    useEffect(() => {
        if (!projectData) return;

        try {
            const saved = localStorage.getItem('builderProject');
            const existing = saved ? JSON.parse(saved) : {};

            const next = {
                ...existing,
                ...projectData,
                requirements: projectRequirements ?? existing.requirements,
                chatHistory,
                generatedCode: generatedProject ?? existing.generatedCode,
                projectId: generatedProject?.projectId ?? existing.projectId ?? null,
                buildPath: 'ai'
            };

            localStorage.setItem('builderProject', JSON.stringify(next));
        } catch {
            // Ignore persistence failures in preview/session flow.
        }
    }, [projectData, projectRequirements, generatedProject, chatHistory]);

    const providerLabel = projectData?.aiProvider === 'openai'
        ? 'OpenAI'
        : projectData?.aiProvider === 'anthropic'
            ? 'Claude'
            : projectData?.aiProvider === 'github'
                ? 'GitHub Models'
                : projectData?.aiProvider === 'nvidia'
                    ? 'NVIDIA NIM'
                    : projectData?.aiProvider === 'ollama'
                        ? 'Ollama'
                        : 'Gemini';

    const activeFileContent = generatedProject?.files.find(f => f.path === activeFile)?.content || '';
    const fileTree = generatedProject ? buildFileTree(generatedProject.files) : [];

    const previewEntryPath = useMemo(() => {
        if (!generatedProject?.files?.length) return null;

        const isRenderable = (path: string) =>
            path.startsWith('frontend/') && /\.(tsx|ts|jsx|js)$/i.test(path);

        if (activeFile && isRenderable(activeFile)) return activeFile;

        const candidates = generatedProject.files.map((f) => f.path);
        return (
            candidates.find((p) => p === 'frontend/src/app/page.tsx') ||
            candidates.find((p) => p.includes('/app/') && p.endsWith('/page.tsx')) ||
            candidates.find((p) => p === 'frontend/src/pages/index.tsx') ||
            candidates.find((p) => p.endsWith('/App.tsx')) ||
            candidates.find((p) => p.endsWith('/app.tsx')) ||
            candidates.find((p) => isRenderable(p)) ||
            null
        );
    }, [generatedProject, activeFile]);

    // ─── Render file tree recursively ───

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
                        className="w-full text-left flex items-center py-1 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
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
                        ? 'bg-slate-100 text-slate-900 border-r-2 border-slate-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                style={{ paddingLeft: `${8 + indent}px` }}
            >
                <span className="mr-1.5 text-[10px]">{getFileIcon(node.path)}</span>
                <span className="truncate">{node.name}</span>
            </button>
        );
    };

    return (
        <ProtectedRoute>
            <div className="h-screen max-h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden">
                {user && <Navbar user={user} onLogout={logout} />}

            {/* Top Bar */}
            <div className="relative border-b border-slate-200 bg-white flex-shrink-0 z-10">
                <div className="px-4 py-2.5 flex items-center justify-between">
                    <button onClick={() => router.push('/builder/select-ai')} className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 transition-colors group text-sm">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-slate-900">{projectData?.projectName}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-medium">
                            {providerLabel} · {projectData?.aiModel || 'gemini-2.5-flash'}
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        {generatedProject && (
                            <>
                                {/* Team avatar + Invite */}
                                {user?.teamId && (
                                    <div className="flex items-center mr-1">
                                        <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold border border-violet-200">
                                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowInviteModal(!showInviteModal)}
                                    className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-all"
                                >
                                    👥 Invite
                                </button>

                                {/* Publish toggle */}
                                {generatedProject.projectId && (
                                    <button
                                        onClick={() => void handlePublishToggle()}
                                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                            isPublished
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {isPublished ? '📢 Published' : '📢 Publish'}
                                    </button>
                                )}

                                {/* Export dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowExportMenu(!showExportMenu)}
                                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-all"
                                    >
                                        📦 Export ▾
                                    </button>
                                    {showExportMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                                            <button onClick={handleExportDocker} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">🐳 Dockerfile</button>
                                            <button onClick={handleExportCompose} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">🐳 Docker Compose</button>
                                            <button onClick={handleExportCICD} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">🔄 GitHub Actions CI/CD</button>
                                            <button onClick={handleExportTests} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">🧪 Test File</button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => { setGeneratedProject(null); setStreamedText(''); setActiveFile(null); }}
                                    className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-all"
                                >
                                    ↻ Regenerate
                                </button>

                                {/* Chat panel toggle */}
                                <button
                                    onClick={() => setChatPanelOpen(!chatPanelOpen)}
                                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                                        chatPanelOpen
                                            ? 'bg-slate-900 text-white'
                                            : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    💬 Chat
                                </button>

                                <button
                                    onClick={handleDeploy}
                                    className="text-xs px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all flex items-center space-x-1"
                                >
                                    <span>🚀 Deploy</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                {(isGenerating || isRefining) && (
                    <div className="h-0.5 bg-slate-200">
                        <div className="h-full bg-slate-900 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="absolute top-14 right-4 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Invite Team Member</h3>
                        <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-700 text-xs">✕</button>
                    </div>
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="teammate@email.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 mb-2 focus:outline-none focus:border-slate-500"
                    />
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 mb-3 focus:outline-none"
                    >
                        <option value="editor">Editor — can edit code</option>
                        <option value="viewer">Viewer — read only</option>
                    </select>
                    <button
                        onClick={() => void handleInvite()}
                        disabled={inviting || !inviteEmail.trim()}
                        className="w-full py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-40"
                    >
                        {inviting ? 'Sending...' : 'Send Invite'}
                    </button>
                    {inviteMsg && <p className="text-xs mt-2 text-emerald-600">{inviteMsg}</p>}
                </div>
            )}

            {/* Main Content */}
            <div className="relative flex-1 flex flex-col overflow-hidden">
                {/* ─── Prompt View (before generation) ─── */}
                {!generatedProject && !isGenerating && (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="max-w-2xl w-full">
                            <div className="text-center mb-8">
                                <div className="text-5xl mb-4">✨</div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                    What do you want to build?
                                </h1>
                                <p className="text-slate-600">Describe your app and AI will generate the complete codebase with proper folder structure.</p>
                            </div>

                            <div className="relative mb-4">
                                <textarea
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    placeholder="e.g. Build a SaaS task manager with user auth, workspaces, and a dashboard with charts..."
                                    rows={4}
                                    className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500 transition-all resize-none text-base leading-relaxed"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                {['Add user roles & permissions', 'Include dashboard with charts', 'Add email notifications', 'Include file upload'].map((s) => (
                                    <button key={s} onClick={() => setUserPrompt(prev => prev + '. ' + s)} className="text-[11px] px-3 py-1.5 bg-white text-slate-600 rounded-lg border border-slate-200 hover:border-slate-400 hover:text-slate-900 transition-all">
                                        + {s}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!userPrompt.trim()}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-lg rounded-2xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-3"
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
                                <p className="text-sm text-slate-600">{generationMessage || 'AI is writing your code... this may take 20-30 seconds'}</p>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>{generationPhase || 'generating'}</span>
                                    <span>{generationProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-900 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max(0, Math.min(100, generationProgress))}%` }}
                                    />
                                </div>
                            </div>

                            {plannedModules.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center mb-4">
                                    {plannedModules.map((moduleName) => {
                                        const done = completedModules.includes(moduleName);
                                        const active = generationMessage.toLowerCase().includes(moduleName.toLowerCase());
                                        return (
                                            <span
                                                key={moduleName}
                                                className={`text-xs px-2.5 py-1 rounded-full border ${
                                                    done
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : active
                                                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                {done ? '✓ ' : ''}{moduleName}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {generationStatus?.lastFailover && (
                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-4">
                                    <span>⚡</span>
                                    <span>
                                        Switched to <strong>{generationStatus.lastFailover.to.split('/').pop()}</strong>
                                        {' '}during {generationStatus.lastFailover.phase} phase
                                        {' '}({generationStatus.lastFailover.reason})
                                    </span>
                                </div>
                            )}

                            <div
                                ref={streamBoxRef}
                                className="h-72 bg-white border border-slate-300 rounded-xl p-4 overflow-auto font-mono text-xs text-slate-700 leading-relaxed"
                            >
                                {streamedText || <span className="text-slate-400">Initializing generation...</span>}
                                <span className="inline-block w-2 h-4 bg-slate-700 animate-pulse ml-0.5 align-middle" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Code Viewer (Lovable-style split panel) ─── */}
                {generatedProject && (
                    <div className="flex-1 flex overflow-hidden">

                        {/* Code Panel */}
                        <div className="flex-1 flex flex-col min-w-0 bg-[#151515]">
                            {generatedProject.files.length > 0 ? (
                                <SandpackSandbox 
                                    files={generatedProject.files}
                                    activeFile={activeFile || undefined}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-500 bg-white">
                                    <div className="text-center">
                                        <div className="text-4xl mb-3">📂</div>
                                        <p className="text-sm">No files generated yet</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── Right Panel: AI Chat ─── */}
                        {chatPanelOpen && (
                            <div className="w-80 flex-shrink-0 border-l border-slate-200 flex flex-col bg-white">
                                {/* Chat header */}
                                <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-semibold text-slate-900">💬 AI Chat</span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-medium">
                                            {chatMessages.length + chatHistory.length} messages
                                        </span>
                                    </div>
                                    <button onClick={() => setChatPanelOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs">✕</button>
                                </div>

                                {/* Version History */}
                                {generatedProject.projectId && (
                                    <div className="border-b border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.03)] z-10 bg-slate-50">
                                        <div className="max-h-[140px] overflow-auto px-2 py-1">
                                            <VersionHistory projectId={generatedProject.projectId} />
                                        </div>
                                    </div>
                                )}

                                {/* Chat messages */}
                                <div className="flex-1 overflow-auto p-3 space-y-3">
                                    {/* Show saved chat history first */}
                                    {chatHistory.map((entry, index) => (
                                        <div key={`hist-${index}`} className={`flex ${entry.type === 'refine' ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${entry.type === 'refine' ? 'bg-slate-100 text-slate-700' : 'bg-sky-50 text-sky-800 border border-sky-100'}`}>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className={`text-[9px] font-bold uppercase ${entry.type === 'refine' ? 'text-emerald-600' : 'text-sky-600'}`}>
                                                        {entry.type === 'refine' ? '✨ Refine' : '🔨 Generate'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                                <p className="leading-relaxed">{entry.prompt}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Real-time chat messages */}
                                    {chatMessages.map((msg, i) => (
                                        <div key={`chat-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${
                                                msg.role === 'user'
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                            }`}>
                                                <p className="leading-relaxed">{msg.content}</p>
                                                <p className="text-[9px] opacity-60 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Loading indicator */}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-500">
                                                <div className="flex space-x-1">
                                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat input */}
                                <div className="border-t border-slate-200 p-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleChatSend()}
                                            placeholder="Ask AI to refine code..."
                                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                                        />
                                        <button
                                            onClick={() => void handleChatSend()}
                                            disabled={chatLoading || !chatInput.trim()}
                                            className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-30 transition-all"
                                        >
                                            ↑
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-full mx-auto p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center space-x-2 z-20">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-700">✕</button>
                    </div>
                )}
            </div>
        </div>
        </ProtectedRoute>
    );
}
