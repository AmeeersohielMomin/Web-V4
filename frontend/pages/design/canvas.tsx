import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Component Definitions ────────────────────────────────────────────────────
interface CanvasComponent {
    id: string;
    type: string;
    label: string;
    icon: string;
    props: Record<string, any>;
    x: number;
    y: number;
    width: number;
    height: number;
}

const COMPONENT_LIBRARY = [
    { type: 'hero', label: 'Hero Section', icon: '🚀', defaultWidth: 800, defaultHeight: 160, color: 'from-violet-500/20 to-purple-500/20', border: 'border-violet-500/30' },
    { type: 'navbar', label: 'Navigation', icon: '🧭', defaultWidth: 800, defaultHeight: 60, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
    { type: 'features', label: 'Feature Grid', icon: '✨', defaultWidth: 800, defaultHeight: 180, color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' },
    { type: 'card', label: 'Card', icon: '🃏', defaultWidth: 240, defaultHeight: 140, color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30' },
    { type: 'cta', label: 'CTA Section', icon: '📣', defaultWidth: 800, defaultHeight: 120, color: 'from-orange-500/20 to-amber-500/20', border: 'border-orange-500/30' },
    { type: 'pricing', label: 'Pricing Table', icon: '💳', defaultWidth: 800, defaultHeight: 200, color: 'from-yellow-500/20 to-lime-500/20', border: 'border-yellow-500/30' },
    { type: 'form', label: 'Contact Form', icon: '📝', defaultWidth: 400, defaultHeight: 280, color: 'from-indigo-500/20 to-violet-500/20', border: 'border-indigo-500/30' },
    { type: 'gallery', label: 'Gallery', icon: '🖼️', defaultWidth: 800, defaultHeight: 160, color: 'from-red-500/20 to-pink-500/20', border: 'border-red-500/30' },
    { type: 'testimonials', label: 'Testimonials', icon: '💬', defaultWidth: 800, defaultHeight: 140, color: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/30' },
    { type: 'stats', label: 'Stats Bar', icon: '📊', defaultWidth: 800, defaultHeight: 100, color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
    { type: 'footer', label: 'Footer', icon: '🏠', defaultWidth: 800, defaultHeight: 120, color: 'from-gray-500/20 to-zinc-500/20', border: 'border-gray-500/30' },
    { type: 'button', label: 'Button', icon: '🔘', defaultWidth: 160, defaultHeight: 48, color: 'from-blue-500/20 to-violet-500/20', border: 'border-blue-500/30' },
    { type: 'text', label: 'Text Block', icon: '📄', defaultWidth: 400, defaultHeight: 80, color: 'from-gray-500/10 to-zinc-500/10', border: 'border-gray-500/20' },
    { type: 'divider', label: 'Divider', icon: '➖', defaultWidth: 800, defaultHeight: 24, color: 'from-gray-500/10 to-zinc-500/10', border: 'border-gray-500/20' },
    { type: 'spacer', label: 'Spacer', icon: '⬜', defaultWidth: 800, defaultHeight: 48, color: 'from-gray-800/50 to-gray-900/50', border: 'border-gray-800/50' },
];

const DEFAULT_PROPS: Record<string, Record<string, any>> = {
    hero: { headline: 'Build Something Amazing', subheadline: 'Your platform description here', ctaText: 'Get Started', ctaColor: 'violet' },
    navbar: { brand: 'MyApp', links: ['Features', 'Pricing', 'Docs'], ctaText: 'Sign Up' },
    features: { title: 'Everything You Need', columns: 3, items: ['⚡ Fast', '🔒 Secure', '📱 Responsive', '🚀 Scalable', '💡 Smart', '🎨 Beautiful'] },
    card: { title: 'Card Title', description: 'Card description goes here', hasImage: true },
    cta: { headline: 'Ready to Get Started?', subheadline: 'Join thousands of users today', ctaText: 'Start Free Trial', bgColor: 'gradient' },
    pricing: { tiers: ['Free', 'Pro', 'Enterprise'], prices: ['$0', '$29', '$99'], highlight: 1 },
    form: { title: 'Contact Us', fields: ['Name', 'Email', 'Message'], submitText: 'Send Message' },
    gallery: { columns: 4, items: 8 },
    testimonials: { count: 3, layout: 'grid' },
    stats: { items: ['10K+ Users', '99.9% Uptime', '50+ Features', '24/7 Support'] },
    footer: { columns: 4, showCopyright: true },
    button: { text: 'Click Me', style: 'primary', size: 'md' },
    text: { heading: 'Section Title', body: 'Add your content here.' },
    divider: { style: 'solid' },
    spacer: { size: 'md' }
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

// ─── Canvas Component Preview ─────────────────────────────────────────────────
function ComponentPreview({ comp, isSelected, onClick, onDragStart }: {
    comp: CanvasComponent;
    isSelected: boolean;
    onClick: () => void;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const def = COMPONENT_LIBRARY.find(c => c.type === comp.type)!;
    return (
        <div
            onClick={onClick}
            draggable
            onDragStart={onDragStart}
            style={{ left: comp.x, top: comp.y, width: comp.width, height: comp.height }}
            className={`absolute rounded-lg border-2 transition-all cursor-move flex flex-col items-center justify-center bg-gradient-to-br ${def?.color} ${isSelected ? 'border-violet-500 shadow-lg shadow-violet-500/30 ring-1 ring-violet-500/50' : `${def?.border} hover:border-white/30`
                }`}
        >
            {isSelected && (
                <div className="absolute -top-6 left-0 flex items-center space-x-1 bg-violet-500 text-white text-[10px] px-2 py-0.5 rounded-t-md font-medium">
                    <span>{def?.icon}</span>
                    <span>{comp.label}</span>
                </div>
            )}
            <span className="text-2xl mb-1">{def?.icon}</span>
            <span className="text-xs font-medium text-white/70">{comp.label}</span>
            {comp.props.headline && <span className="text-[10px] text-white/40 mt-1 truncate px-2 max-w-full">{comp.props.headline}</span>}
        </div>
    );
}

// ─── Properties Panel ─────────────────────────────────────────────────────────
function PropertiesPanel({ comp, onUpdate, onDelete }: {
    comp: CanvasComponent | null;
    onUpdate: (id: string, props: Partial<CanvasComponent>) => void;
    onDelete: (id: string) => void;
}) {
    if (!comp) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="text-4xl mb-3">👆</div>
                <p className="text-sm text-gray-500">Click a component on the canvas to edit its properties</p>
            </div>
        );
    }
    const def = COMPONENT_LIBRARY.find(c => c.type === comp.type)!;
    return (
        <div className="p-4 overflow-auto h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <span className="text-lg">{def?.icon}</span>
                    <span className="text-sm font-semibold text-white">{comp.label}</span>
                </div>
                <button onClick={() => onDelete(comp.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-all">
                    Delete
                </button>
            </div>

            {/* Dimensions */}
            <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Size & Position</label>
                <div className="grid grid-cols-2 gap-2">
                    {[['W', 'width'], ['H', 'height'], ['X', 'x'], ['Y', 'y']].map(([label, key]) => (
                        <div key={key} className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                            <span className="text-[10px] text-gray-600 px-2 py-2 border-r border-white/10 bg-white/5">{label}</span>
                            <input
                                type="number"
                                value={(comp as any)[key]}
                                onChange={(e) => onUpdate(comp.id, { [key]: parseInt(e.target.value) || 0 })}
                                className="flex-1 bg-transparent text-xs text-white px-2 py-2 focus:outline-none min-w-0"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Component-specific Props */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Content</label>
                <div className="space-y-2">
                    {Object.entries(comp.props).map(([key, value]) => {
                        if (typeof value === 'boolean') {
                            return (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400 capitalize">{key}</span>
                                    <button
                                        onClick={() => onUpdate(comp.id, { props: { ...comp.props, [key]: !value } })}
                                        className={`w-8 h-4 rounded-full transition-all ${value ? 'bg-violet-500' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full bg-white shadow mx-0.5 transition-all ${value ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            );
                        }
                        if (typeof value === 'string') {
                            return (
                                <div key={key}>
                                    <label className="block text-[10px] text-gray-600 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => onUpdate(comp.id, { props: { ...comp.props, [key]: e.target.value } })}
                                        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
                                    />
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Main Canvas Page ────────────────────────────────────────────────────────
export default function DesignCanvas() {
    const [components, setComponents] = useState<CanvasComponent[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingType, setDraggingType] = useState<string | null>(null);
    const [exportedCode, setExportedCode] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);
    const [showCodePanel, setShowCodePanel] = useState(false);
    const [designName, setDesignName] = useState('My Design');
    const canvasRef = useRef<HTMLDivElement>(null);

    const addComponent = useCallback((type: string, x: number, y: number) => {
        const def = COMPONENT_LIBRARY.find(c => c.type === type)!;
        const id = `${type}-${Date.now()}`;
        const newComp: CanvasComponent = {
            id, type,
            label: def.label,
            icon: def.icon,
            props: { ...DEFAULT_PROPS[type] },
            x, y,
            width: def.defaultWidth,
            height: def.defaultHeight
        };
        setComponents(prev => [...prev, newComp]);
        setSelectedId(id);
    }, []);

    const updateComponent = useCallback((id: string, updates: Partial<CanvasComponent>) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates, props: updates.props ? { ...c.props, ...updates.props } : c.props } : c));
    }, []);

    const deleteComponent = useCallback((id: string) => {
        setComponents(prev => prev.filter(c => c.id !== id));
        setSelectedId(null);
    }, []);

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggingType || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.max(0, e.clientX - rect.left - 100);
        const y = Math.max(0, e.clientY - rect.top - 30);
        addComponent(draggingType, x, y);
        setDraggingType(null);
    };

    const handleExportCode = async () => {
        if (components.length === 0) return;
        setIsExporting(true);
        setShowCodePanel(true);
        setExportedCode('');

        const designJSON = {
            name: designName,
            components: components.map(c => ({
                type: c.type,
                label: c.label,
                props: c.props,
                position: { x: c.x, y: c.y },
                size: { width: c.width, height: c.height }
            })),
            order: [...components].sort((a, b) => a.y - b.y).map(c => c.type)
        };

        try {
            const response = await fetch(`${API_BASE}/api/ai/design-to-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'gemini',
                    designJSON,
                    designDescription: `${designName} — a web page with: ${components.map(c => c.label).join(', ')}`
                })
            });

            if (!response.ok) throw new Error('Export failed');

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let fullCode = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            const data = JSON.parse(line.slice(5));
                            if (data.text) { fullCode += data.text; setExportedCode(fullCode); }
                            if (data.fullCode) setExportedCode(data.fullCode || fullCode);
                        } catch { }
                    }
                }
            }
        } catch (err: any) {
            setExportedCode(`// Export failed: ${err.message}\n// Please check your connection and try again.`);
        } finally {
            setIsExporting(false);
        }
    };

    const selectedComp = components.find(c => c.id === selectedId) || null;

    return (
        <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center space-x-4">
                    <Link href="/design" className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div className="w-px h-5 bg-white/10" />
                    <div className="flex items-center space-x-2">
                        <span className="text-lg">🎨</span>
                        <input
                            value={designName}
                            onChange={(e) => setDesignName(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-violet-500/50 pb-px transition-all"
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{components.length} components</span>
                    <button
                        onClick={() => { setComponents([]); setSelectedId(null); }}
                        className="text-xs px-2 py-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleExportCode}
                        disabled={components.length === 0}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed text-sm"
                    >
                        {isExporting ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : <span>✨</span>}
                        <span>{isExporting ? 'Generating code...' : 'Export Code'}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Component Library */}
                <div className="w-52 flex-shrink-0 bg-zinc-900 border-r border-white/10 overflow-auto">
                    <div className="px-3 py-3 border-b border-white/5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Components</p>
                    </div>
                    <div className="p-2 space-y-1">
                        {COMPONENT_LIBRARY.map((comp) => (
                            <div
                                key={comp.type}
                                draggable
                                onDragStart={() => setDraggingType(comp.type)}
                                className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                            >
                                <span className="text-base">{comp.icon}</span>
                                <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{comp.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Canvas */}
                <div className="flex-1 overflow-auto bg-zinc-950 relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleCanvasDrop}
                    onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-bg')) setSelectedId(null); }}
                >
                    {/* Canvas Grid Background */}
                    <div
                        ref={canvasRef}
                        className="canvas-bg relative min-h-full min-w-full"
                        style={{
                            backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                            minHeight: '2000px',
                            minWidth: '1200px'
                        }}
                    >
                        {components.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="text-6xl mb-4 opacity-20">🎨</div>
                                <p className="text-gray-600 text-lg font-medium">Drag components here to start designing</p>
                                <p className="text-gray-700 text-sm mt-2">Pick from the component library on the left</p>
                            </div>
                        )}
                        {components.map((comp) => (
                            <ComponentPreview
                                key={comp.id}
                                comp={comp}
                                isSelected={selectedId === comp.id}
                                onClick={() => setSelectedId(comp.id)}
                                onDragStart={() => setDraggingType(comp.type)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: Properties / Code Panel */}
                <div className="w-64 flex-shrink-0 bg-zinc-900 border-l border-white/10 flex flex-col overflow-hidden">
                    {showCodePanel ? (
                        <>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                <span className="text-xs font-semibold text-white">Generated Code</span>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => navigator.clipboard.writeText(exportedCode)} className="text-[10px] text-gray-500 hover:text-white transition-colors">Copy</button>
                                    <button onClick={() => setShowCodePanel(false)} className="text-[10px] text-gray-500 hover:text-white transition-colors">← Props</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-3">
                                {isExporting ? (
                                    <div className="flex items-center space-x-2 text-violet-400 mb-2">
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span className="text-[10px]">AI generating...</span>
                                    </div>
                                ) : null}
                                <pre className="text-[10px] font-mono text-green-400 whitespace-pre-wrap leading-relaxed">
                                    {exportedCode || (isExporting ? '' : 'No code generated yet.')}
                                    {isExporting && <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse ml-0.5 align-middle" />}
                                </pre>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                <span className="text-xs font-semibold text-white">Properties</span>
                                {exportedCode && (
                                    <button onClick={() => setShowCodePanel(true)} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">View Code →</button>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <PropertiesPanel comp={selectedComp} onUpdate={updateComponent} onDelete={deleteComponent} />
                            </div>
                            {/* Layers */}
                            <div className="border-t border-white/10 max-h-48 overflow-auto">
                                <div className="px-4 py-2 border-b border-white/5">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Layers ({components.length})</p>
                                </div>
                                {[...components].reverse().map((c) => {
                                    const def = COMPONENT_LIBRARY.find(d => d.type === c.type)!;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedId(c.id)}
                                            className={`w-full flex items-center space-x-2 px-4 py-1.5 text-left transition-all ${selectedId === c.id ? 'bg-violet-500/10 text-violet-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="text-xs">{def?.icon}</span>
                                            <span className="text-xs truncate">{c.label}</span>
                                        </button>
                                    );
                                })}
                                {components.length === 0 && (
                                    <p className="text-[10px] text-gray-700 text-center py-4">No layers yet</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
