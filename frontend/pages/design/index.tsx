import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

const recentDesigns = [
    { id: 1, name: 'SaaS Landing Page', components: 7, lastEdited: '2 hours ago', thumbnail: '🚀' },
    { id: 2, name: 'E-Commerce Home', components: 12, lastEdited: 'Yesterday', thumbnail: '🛒' },
    { id: 3, name: 'Portfolio Site', components: 5, lastEdited: '3 days ago', thumbnail: '💼' },
];

const templates = [
    { name: 'SaaS Landing', icon: '🚀', components: ['Nav', 'Hero', 'Features', 'Pricing', 'CTA', 'Footer'], color: 'from-violet-500/20 to-purple-500/20', border: 'border-violet-500/20' },
    { name: 'E-Commerce', icon: '🛒', components: ['Nav', 'Hero', 'Gallery', 'Features', 'CTA', 'Footer'], color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/20' },
    { name: 'Portfolio', icon: '💼', components: ['Nav', 'Hero', 'Gallery', 'Stats', 'Testimonials', 'Footer'], color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20' },
    { name: 'Blog', icon: '✍️', components: ['Nav', 'Hero', 'Card-1', 'Card-2', 'Card-3', 'Footer'], color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/20' },
];

export default function DesignStudioIndex() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,70,255,0.12),transparent)]" />
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f1a_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1a_1px,transparent_1px)] bg-[size:24px_24px]" />

            {/* Nav */}
            <nav className="relative border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">← Home</Link>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center space-x-2">
                            <span className="text-xl">🎨</span>
                            <span className="font-bold text-white">Design Studio</span>
                            <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded border border-violet-500/20 font-medium">BETA</span>
                        </div>
                    </div>
                    <Link href="/builder/new" className="text-sm text-gray-400 hover:text-white transition-colors">
                        Switch to Builder →
                    </Link>
                </div>
            </nav>

            <div className="relative max-w-7xl mx-auto px-6 py-12">
                {/* Hero */}
                <div className="text-center mb-16">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-5xl font-bold text-white mb-4">
                            Design visually,{' '}
                            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">get perfect code</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                            Drag and drop UI components onto a canvas. Our AI converts your design into
                            production-ready React + Tailwind code instantly.
                        </p>
                        <button
                            onClick={() => router.push('/design/canvas')}
                            className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-lg rounded-2xl transition-all shadow-2xl shadow-violet-500/30"
                        >
                            <span>🎨</span>
                            <span>Start Designing</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </motion.div>
                </div>

                {/* How it works */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {[
                        { step: '1', icon: '🖱️', title: 'Drag & Drop', desc: 'Pick from 15 UI components and arrange them on the canvas exactly how you want.' },
                        { step: '2', icon: '⚙️', title: 'Edit Properties', desc: 'Click any component to edit text, colors, and layout in the properties panel.' },
                        { step: '3', icon: '✨', title: 'Export to Code', desc: 'Hit Export — AI generates clean React + Tailwind code matching your design exactly.' },
                    ].map((item) => (
                        <motion.div
                            key={item.step}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: parseInt(item.step) * 0.1 }}
                            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
                        >
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">{item.step}</div>
                                <span className="text-2xl">{item.icon}</span>
                            </div>
                            <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Start from Template */}
                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-6">Start from a template</h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        {templates.map((tmpl, i) => (
                            <motion.button
                                key={tmpl.name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => router.push('/design/canvas')}
                                className={`text-left p-5 rounded-2xl border bg-gradient-to-br ${tmpl.color} ${tmpl.border} hover:border-white/20 transition-all group`}
                            >
                                <div className="text-3xl mb-3">{tmpl.icon}</div>
                                <h3 className="text-sm font-semibold text-white mb-2">{tmpl.name}</h3>
                                <div className="flex flex-wrap gap-1">
                                    {tmpl.components.slice(0, 4).map((c) => (
                                        <span key={c} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-gray-400 rounded">{c}</span>
                                    ))}
                                    {tmpl.components.length > 4 && (
                                        <span className="text-[9px] text-gray-600">+{tmpl.components.length - 4}</span>
                                    )}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Recent Designs */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Recent designs</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {recentDesigns.map((design, i) => (
                            <motion.button
                                key={design.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                onClick={() => router.push('/design/canvas')}
                                className="text-left p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-2xl">{design.thumbnail}</span>
                                    <span className="text-[10px] text-gray-600">{design.lastEdited}</span>
                                </div>
                                <h3 className="text-sm font-semibold text-white mb-1">{design.name}</h3>
                                <p className="text-xs text-gray-500">{design.components} components</p>
                            </motion.button>
                        ))}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            onClick={() => router.push('/design/canvas')}
                            className="text-left p-5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 hover:border-violet-500/30 hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center text-center"
                        >
                            <span className="text-3xl mb-2">+</span>
                            <span className="text-sm text-gray-500">New Design</span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
}
