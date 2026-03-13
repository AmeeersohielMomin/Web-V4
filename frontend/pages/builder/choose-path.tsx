import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

export default function ChoosePath() {
    const router = useRouter();
    const [projectName, setProjectName] = useState('');
    const [hoveredPath, setHoveredPath] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('builderProject');
        if (saved) {
            const data = JSON.parse(saved);
            setProjectName(data.projectName || '');
        } else {
            router.push('/builder/new');
        }
    }, []);

    const choosePath = (path: 'ai' | 'template') => {
        const saved = localStorage.getItem('builderProject');
        if (saved) {
            const data = JSON.parse(saved);
            data.buildPath = path;
            localStorage.setItem('builderProject', JSON.stringify(data));
        }
        if (path === 'ai') {
            router.push('/builder/select-ai');
        } else {
            router.push('/builder/select-modules');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

            {/* Top Nav */}
            <div className="relative border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => router.push('/builder/new')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm font-medium">Back</span>
                    </button>
                    <span className="text-sm font-medium text-white">{projectName}</span>
                </div>
            </div>

            {/* Progress */}
            <div className="relative border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-500">Step 2 of 4</span>
                        <span className="text-sm font-medium text-violet-400">Choose Build Method</span>
                    </div>
                    <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: '33%' }} />
                    </div>
                </div>
            </div>

            <div className="relative max-w-4xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 mb-6 text-2xl">
                        🚀
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                        How do you want to build?
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Choose AI-powered generation for instant code, or templates for a guided step-by-step setup.
                    </p>
                </div>

                {/* Two Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AI Path */}
                    <motion.button
                        onClick={() => choosePath('ai')}
                        onHoverStart={() => setHoveredPath('ai')}
                        onHoverEnd={() => setHoveredPath(null)}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative text-left p-8 rounded-3xl border-2 transition-all ${
                            hoveredPath === 'ai'
                                ? 'bg-violet-500/[0.08] border-violet-500 shadow-2xl shadow-violet-500/20'
                                : 'bg-white/[0.03] border-white/10 hover:border-violet-500/50'
                        }`}
                    >
                        {/* Recommended badge */}
                        <div className="absolute -top-3 left-6">
                            <span className="text-[10px] px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold uppercase tracking-wider">
                                ⭐ Recommended
                            </span>
                        </div>

                        <div className="text-5xl mb-5">✨</div>
                        <h2 className="text-2xl font-bold text-white mb-3">AI Code Generator</h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Describe your app in plain English and our AI generates the entire full-stack codebase — frontend, backend, database, and config.
                        </p>

                        {/* Features */}
                        <div className="space-y-2.5 mb-6">
                            {[
                                'Describe → Get complete production code',
                                'Choose AI model (Gemini free, GPT-4o, Claude)',
                                'Real-time streaming code generation',
                                'Refine with follow-up prompts',
                                'Deploy straight to GitHub or ZIP'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center space-x-2 text-sm">
                                    <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-300">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center space-x-2 text-violet-400 font-semibold text-sm group">
                            <span>Start with AI</span>
                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </div>
                    </motion.button>

                    {/* Template Path */}
                    <motion.button
                        onClick={() => choosePath('template')}
                        onHoverStart={() => setHoveredPath('template')}
                        onHoverEnd={() => setHoveredPath(null)}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative text-left p-8 rounded-3xl border-2 transition-all ${
                            hoveredPath === 'template'
                                ? 'bg-blue-500/[0.08] border-blue-500 shadow-2xl shadow-blue-500/20'
                                : 'bg-white/[0.03] border-white/10 hover:border-blue-500/50'
                        }`}
                    >
                        <div className="text-5xl mb-5">🧩</div>
                        <h2 className="text-2xl font-bold text-white mb-3">Template Builder</h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Pick modules, choose design templates, and configure your backend step by step. Great for learning and full control.
                        </p>

                        {/* Features */}
                        <div className="space-y-2.5 mb-6">
                            {[
                                'Select modules (Auth, Blog, E-Commerce...)',
                                'Choose from curated design themes',
                                'Pick your database & auth strategy',
                                'Preview each component before building',
                                'Full control over every detail'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center space-x-2 text-sm">
                                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-300">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm group">
                            <span>Use Templates</span>
                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </div>
                    </motion.button>
                </div>

                {/* Bottom note */}
                <p className="text-center text-xs text-gray-600 mt-8">
                    Both methods generate production-ready code. You can also use the <button onClick={() => router.push('/design')} className="text-violet-400 hover:text-violet-300 underline">Design Studio</button> for visual drag-and-drop building.
                </p>
            </div>
        </div>
    );
}
