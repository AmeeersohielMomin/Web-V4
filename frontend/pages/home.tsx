import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ai' | 'design'>('ai');

  const aiProviders = [
    { name: 'Gemini', icon: '✨', color: 'text-blue-400', free: true },
    { name: 'GPT-4o', icon: '🤖', color: 'text-green-400', free: false },
    { name: 'Claude', icon: '🧠', color: 'text-orange-400', free: false },
    { name: 'Ollama', icon: '🦙', color: 'text-purple-400', free: true },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed w-full bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <span className="text-white font-bold text-sm">I</span>
                </div>
                <span className="text-white font-bold text-xl tracking-tight">IDEA</span>
                <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded border border-violet-500/20 font-medium hidden md:inline">AI Builder</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-400 hover:text-white transition text-sm">Features</a>
                <a href="#how-it-works" className="text-gray-400 hover:text-white transition text-sm">How it works</a>
                <Link href="/design" className="text-gray-400 hover:text-white transition text-sm">Design Studio</Link>
                <a href="#pricing" className="text-gray-400 hover:text-white transition text-sm">Pricing</a>
                <Link href="/login" className="text-gray-400 hover:text-white transition text-sm">Login</Link>
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/design" className="hidden md:flex items-center space-x-1 text-violet-400 border border-violet-500/30 px-4 py-2 rounded-lg hover:bg-violet-500/10 transition text-sm font-medium">
                  <span>🎨</span>
                  <span>Design</span>
                </Link>
                <Link href="/builder/new" className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-violet-600 hover:to-purple-700 transition-all text-sm shadow-lg shadow-violet-500/20">
                  Start Building
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-36 pb-24 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center space-x-2 bg-violet-500/10 text-violet-400 px-4 py-2 rounded-full text-sm font-medium border border-violet-500/20 mb-8">
                <span>⚡</span>
                <span>Powered by GPT-4o, Gemini & Claude</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
                From idea to
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                  production app
                </span>
                <br />
                in minutes
              </h1>

              <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                Describe your app. Our AI generates complete, production-ready full-stack code.
                Or design visually and convert to code — like Figma, but for your entire app.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => router.push('/builder/new')}
                  className="group bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-violet-600 hover:to-purple-700 transition-all flex items-center space-x-2 shadow-2xl shadow-violet-500/30"
                >
                  <span>✨ Generate with AI</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <Link href="/design" className="group bg-white/10 backdrop-blur-lg text-white px-8 py-4 rounded-xl font-bold text-lg border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all flex items-center space-x-2">
                  <span>🎨</span>
                  <span>Open Design Studio</span>
                </Link>
              </div>
            </motion.div>

            {/* AI Provider Pills */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap justify-center gap-3 mt-10">
              <span className="text-sm text-gray-600">Powered by</span>
              {aiProviders.map((p) => (
                <div key={p.name} className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                  <span className="text-sm">{p.icon}</span>
                  <span className={`text-sm font-medium ${p.color}`}>{p.name}</span>
                  {p.free && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/20">FREE</span>}
                </div>
              ))}
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-3xl mx-auto">
              {[
                { number: '4', label: 'AI Models' },
                { number: '15+', label: 'UI Components' },
                { number: '∞', label: 'Possibilities' },
                { number: '100%', label: 'Your Code' }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-violet-400 to-purple-400 text-transparent bg-clip-text">{stat.number}</div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dual-mode Demo */}
        <section id="how-it-works" className="py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Two ways to build</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">Pick the workflow that fits you. Both produce the same clean, production-ready code.</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex justify-center mb-10">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'ai' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  ✨ AI Code Generator
                </button>
                <button
                  onClick={() => setActiveTab('design')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'design' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  🎨 Design Studio
                </button>
              </div>
            </div>

            {/* AI Mode */}
            {activeTab === 'ai' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">Describe it, get the code</h3>
                  <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                    Type a description of your app in plain English. The AI generates a complete full-stack codebase — backend, frontend, database schemas, API routes, everything.
                  </p>
                  <div className="space-y-3">
                    {[
                      'Backend routes, controllers & services',
                      'Frontend pages & components',
                      'Database models & schemas',
                      'Auth, validation & error handling',
                    ].map((item) => (
                      <div key={item} className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => router.push('/builder/new')} className="mt-8 flex items-center space-x-2 px-6 py-3 bg-white/10 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 text-white font-semibold rounded-xl transition-all text-sm">
                    <span>Try AI Generator →</span>
                  </button>
                </div>
                {/* Mock Terminal */}
                <div className="bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-zinc-900/50 px-4 py-3 flex items-center space-x-2 border-b border-white/5">
                    <div className="flex space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/70" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                      <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    </div>
                    <span className="text-xs text-gray-600 ml-2">AI generating your app...</span>
                    <div className="ml-auto flex space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                  <div className="p-5 font-mono text-xs space-y-1">
                    <p className="text-gray-600">// Prompt: "Build a SaaS todo app with auth"</p>
                    <p className="text-violet-400">✓ Generating backend module structure...</p>
                    <p className="text-green-400">  → src/modules/todo/todo.routes.ts</p>
                    <p className="text-green-400">  → src/modules/todo/todo.service.ts</p>
                    <p className="text-green-400">  → src/modules/todo/todo.model.ts</p>
                    <p className="text-violet-400">✓ Generating frontend templates...</p>
                    <p className="text-green-400">  → pages/dashboard.tsx</p>
                    <p className="text-green-400">  → templates/todo/TodoList.tsx</p>
                    <p className="text-green-400">  → templates/todo/TodoItem.tsx</p>
                    <p className="text-violet-400">✓ Generating config & env vars...</p>
                    <p className="text-emerald-400 mt-2">Done! 12 files generated ✨</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Design Mode */}
            {activeTab === 'design' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">Design visually, export code</h3>
                  <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                    Drag and drop from 15 professional UI components onto a canvas. Edit properties in real-time. Hit "Export" — AI converts your design to clean React + Tailwind code.
                  </p>
                  <div className="space-y-3">
                    {[
                      '15 professional UI components',
                      'Live property editor (text, colors, layout)',
                      'AI converts design to code via Gemini',
                      'Download or copy the generated component',
                    ].map((item) => (
                      <div key={item} className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/design" className="mt-8 flex items-center space-x-2 px-6 py-3 bg-white/10 border border-white/10 hover:bg-white/15 hover:border-violet-500/30 text-white font-semibold rounded-xl transition-all text-sm w-fit">
                    <span>Open Design Studio →</span>
                  </Link>
                </div>
                {/* Mock Canvas */}
                <div className="bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-zinc-900/50 px-4 py-3 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">🎨 Design Studio</span>
                    </div>
                    <div className="text-xs px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-medium">✨ Export Code</div>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      { icon: '🧭', label: 'Navigation', color: 'border-blue-500/30 bg-blue-500/5', w: 'w-full' },
                      { icon: '🚀', label: 'Hero Section', color: 'border-violet-500/30 bg-violet-500/5', w: 'w-full' },
                      { icon: '✨', label: 'Feature Grid', color: 'border-emerald-500/30 bg-emerald-500/5', w: 'w-full' },
                      { icon: '💳', label: 'Pricing', color: 'border-yellow-500/30 bg-yellow-500/5', w: 'w-full' },
                      { icon: '🏠', label: 'Footer', color: 'border-gray-500/30 bg-gray-500/5', w: 'w-full' },
                    ].map((item) => (
                      <div key={item.label} className={`${item.w} h-10 border rounded-lg flex items-center px-3 space-x-2 ${item.color}`}>
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs text-gray-400">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-4 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Everything you need</h2>
              <p className="text-xl text-gray-400">A complete platform for building modern web applications</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '🤖', title: 'Multi-Model AI', desc: 'Choose from GPT-4o, Gemini, Claude, or local Ollama. Free tier on Gemini — no card needed.', color: 'from-violet-500 to-purple-600' },
                { icon: '🎨', title: 'Visual Design Canvas', desc: '15 drag-and-drop components. Design your UI visually, export production-ready React code.', color: 'from-pink-500 to-rose-500' },
                { icon: '⚡', title: 'Real-time Streaming', desc: 'Watch your code generate token by token. Edit and refine with follow-up prompts.', color: 'from-yellow-500 to-orange-500' },
                { icon: '🔒', title: 'Secure by Default', desc: 'JWT auth, bcrypt, Zod validation. Security best practices baked into every generated file.', color: 'from-red-500 to-pink-500' },
                { icon: '📦', title: 'Deploy Anywhere', desc: 'Download as ZIP or push directly to GitHub. Own your code — zero vendor lock-in.', color: 'from-green-500 to-emerald-500' },
                { icon: '🧩', title: 'Modular Architecture', desc: 'Feature-flag controlled modules (auth, blog, e-commerce). Enable only what you need.', color: 'from-blue-500 to-cyan-500' },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all hover:scale-[1.01]"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl p-12 border border-violet-500/20">
              <div className="text-5xl mb-6">🚀</div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Start building for free
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                No credit card. No install. Gemini-powered free tier included.
                Your first app is just a description away.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/builder/new')}
                  className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
                >
                  ✨ Generate with AI — Free
                </button>
                <Link href="/design" className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg border border-white/20 hover:bg-white/20 transition-all">
                  🎨 Open Design Studio
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">I</span>
                  </div>
                  <span className="text-white font-bold text-lg">IDEA</span>
                </div>
                <p className="text-gray-500 text-sm">AI-powered full-stack builder. From description to deployment in minutes.</p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li><a href="#features" className="hover:text-white transition">Features</a></li>
                  <li><Link href="/design" className="hover:text-white transition">Design Studio</Link></li>
                  <li><Link href="/builder/new" className="hover:text-white transition">AI Builder</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">AI Models</h4>
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li className="text-emerald-400/70">✨ Gemini (Free)</li>
                  <li>🤖 GPT-4o (BYOK)</li>
                  <li>🧠 Claude (BYOK)</li>
                  <li>🦙 Ollama (Local)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li><a href="#" className="hover:text-white transition">About</a></li>
                  <li><a href="#" className="hover:text-white transition">Docs</a></li>
                  <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 text-center text-gray-600 text-sm">
              <p>© 2025 IDEA. The AI-powered full-stack builder. Built with ❤️ for developers.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
