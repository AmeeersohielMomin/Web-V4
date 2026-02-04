import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function LandingPage() {
  const router = useRouter();
  const [activeTemplate, setActiveTemplate] = useState<'minimal' | 'modern' | 'classic'>('modern');

  const templates = {
    minimal: {
      name: 'Minimal',
      description: 'Clean, simple, and fast',
      gradient: 'from-gray-400 to-gray-600',
      preview: '/preview-minimal.png'
    },
    modern: {
      name: 'Modern',
      description: 'Sleek glassmorphism design',
      gradient: 'from-purple-400 via-pink-500 to-red-500',
      preview: '/preview-modern.png'
    },
    classic: {
      name: 'Classic',
      description: 'Professional enterprise look',
      gradient: 'from-blue-500 to-indigo-600',
      preview: '/preview-classic.png'
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed w-full bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-lg">T</span>
                </div>
                <span className="text-white font-bold text-xl">TemplateBuilder</span>
              </div>
              <div className="hidden md:flex space-x-8">
                <a href="#features" className="text-gray-400 hover:text-white transition">Features</a>
                <a href="#templates" className="text-gray-400 hover:text-white transition">Templates</a>
                <a href="#pricing" className="text-gray-400 hover:text-white transition">Pricing</a>
                <Link href="/login" className="text-gray-400 hover:text-white transition">
                  Login
                </Link>
              </div>
              <Link
                href="/builder/new"
                className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all"
              >
                Start Building
              </Link>
            </div>
          </div>
        </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4">
            <span className="bg-white/5 text-gray-300 px-4 py-2 rounded-full text-sm font-medium border border-white/10">
              🚀 Ship Faster, Build Smarter
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Build Full-Stack Apps
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 text-transparent bg-clip-text">
              In Minutes, Not Months
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
            Choose your modules, pick your design, select your backend. 
            Get production-ready code instantly. No vendor lock-in, no limitations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/builder/new')}
              className="group bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all flex items-center space-x-2"
            >
              <span>Start Building Free</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 backdrop-blur-lg text-white px-8 py-4 rounded-xl font-bold text-lg border border-white/10 hover:bg-white/20 transition-all"
            >
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
            {[
              { number: '50K+', label: 'Projects Created' },
              { number: '3', label: 'Template Styles' },
              { number: '4', label: 'Backend Options' },
              { number: '100%', label: 'Open Source' }
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Template Preview */}
      <section id="templates" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Beautiful Templates
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Choose from professionally designed templates. Each one is fully customizable and production-ready.
            </p>
          </div>

          {/* Template Selector */}
          <div className="flex justify-center gap-4 mb-12">
            {Object.entries(templates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => setActiveTemplate(key as any)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTemplate === key
                    ? 'bg-white text-black shadow-xl scale-105'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>

          {/* Template Preview Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className={`h-2 bg-gradient-to-r ${templates[activeTemplate].gradient}`} />
            
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {templates[activeTemplate].name} Template
                  </h3>
                  <p className="text-gray-400">
                    {templates[activeTemplate].description}
                  </p>
                </div>
                <Link
                  href={`/templates/preview?variant=${activeTemplate}`}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition border border-white/10"
                >
                  Live Preview →
                </Link>
              </div>

              {/* Mock Browser Window */}
              <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-2xl">
                {/* Browser Chrome */}
                <div className="bg-zinc-800 px-4 py-3 flex items-center space-x-2 border-b border-zinc-700">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="bg-zinc-700 rounded px-4 py-1.5 text-xs text-gray-400 inline-block">
                      localhost:3000/login
                    </div>
                  </div>
                </div>

                {/* Preview Content - NON-FUNCTIONAL - FULL SCREEN */}
                <div className={`h-[700px] bg-gradient-to-br ${templates[activeTemplate].gradient} flex items-center justify-center`}>
                  <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-12 w-full max-w-md mx-8 pointer-events-none border border-white/20">
                    {/* Rocket Icon */}
                    <div className="flex items-center justify-center mb-8">
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <span className="text-4xl">🚀</span>
                      </div>
                    </div>
                    
                    <h4 className="text-4xl font-bold text-white mb-3 text-center">Welcome Back</h4>
                    <p className="text-center text-white/70 mb-8 text-sm">Modern Template</p>
                    
                    <div className="space-y-5">
                      {/* Email Input - DISABLED */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">Email address</label>
                        <input
                          type="text"
                          placeholder="you@example.com"
                          disabled
                          className="w-full px-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 cursor-not-allowed text-base focus:outline-none"
                        />
                      </div>
                      {/* Password Input - DISABLED */}
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">Password</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          disabled
                          className="w-full px-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white cursor-not-allowed text-base focus:outline-none"
                        />
                      </div>
                      {/* Button - DISABLED */}
                      <button disabled className="w-full py-4 bg-white text-purple-600 font-bold rounded-xl shadow-lg cursor-not-allowed text-base hover:bg-white/90 transition-all mt-6">
                        Sign in →
                      </button>
                    </div>
                    
                    <div className="mt-8 text-center text-sm text-white/60">
                      Don't have an account? <span className="text-white font-semibold cursor-not-allowed">Sign up</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-400">
              From authentication to deployment, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: '🎨',
                  title: 'Multiple Template Styles',
                  description: 'Choose from Minimal, Modern, or Classic designs. Each fully customizable.',
                  color: 'from-purple-500 to-pink-500'
                },
                {
                  icon: '⚙️',
                  title: 'Flexible Backend',
                  description: 'MongoDB, PostgreSQL, MySQL, or Session-based auth. Your choice.',
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  icon: '🚀',
                  title: 'Instant Deployment',
                  description: 'Download as ZIP or push directly to GitHub. Deploy anywhere.',
                  color: 'from-green-500 to-emerald-500'
                },
                {
                  icon: '🔒',
                  title: 'Secure by Default',
                  description: 'bcrypt password hashing, JWT tokens, and security best practices.',
                  color: 'from-red-500 to-orange-500'
                },
                {
                  icon: '📱',
                  title: 'Mobile Responsive',
                  description: 'All templates work perfectly on mobile, tablet, and desktop.',
                  color: 'from-yellow-500 to-amber-500'
                },
                {
                  icon: '💯',
                  title: '100% Yours',
                  description: 'No vendor lock-in. Download the code and own it forever.',
                  color: 'from-indigo-500 to-purple-500'
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="group bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all hover:scale-105"
                >
                  <div className={`text-5xl mb-4 bg-gradient-to-r ${feature.color} w-16 h-16 rounded-lg flex items-center justify-center`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="demo" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-300">
              5 simple steps to your production-ready application
            </p>
          </div>

          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-pink-500 hidden md:block" />

            <div className="space-y-12">
              {[
                {
                  step: 1,
                  title: 'Name Your Project',
                  description: 'Start with a unique name for your application',
                  icon: '📝'
                },
                {
                  step: 2,
                  title: 'Select Modules',
                  description: 'Choose features like authentication, blog, e-commerce',
                  icon: '🧩'
                },
                {
                  step: 3,
                  title: 'Pick Template Style',
                  description: 'Select from Minimal, Modern, or Classic designs',
                  icon: '🎨'
                },
                {
                  step: 4,
                  title: 'Choose Backend',
                  description: 'MongoDB, PostgreSQL, MySQL, or Session-based',
                  icon: '⚙️'
                },
                {
                  step: 5,
                  title: 'Deploy',
                  description: 'Download ZIP or push directly to GitHub',
                  icon: '🚀'
                }
              ].map((item) => (
                <div key={item.step} className="flex items-start space-x-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center font-bold text-sm">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => router.push('/builder/new')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all inline-flex items-center space-x-2"
            >
              <span>Try It Now - It's Free!</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-12 border border-white/10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Build Something Amazing?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of developers shipping faster with TemplateBuilder
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/builder/new"
                className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
              >
                Start Building Now
              </Link>
              <Link
                href="/templates/preview"
                className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg border border-white/20 hover:bg-white/20 transition-all"
              >
                Explore Templates
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
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold">T</span>
                </div>
                <span className="text-white font-bold text-lg">TemplateBuilder</span>
              </div>
              <p className="text-gray-500 text-sm">
                Build full-stack applications in minutes with production-ready templates.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#templates" className="hover:text-white transition">Templates</a></li>
                <li><Link href="/templates/preview" className="hover:text-white transition">Preview</Link></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition">Guides</a></li>
                <li><a href="#" className="hover:text-white transition">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 TemplateBuilder. All rights reserved. Built with ❤️ for developers.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
