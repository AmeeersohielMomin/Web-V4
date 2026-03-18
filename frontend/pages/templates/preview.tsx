import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MinimalLogin from '@/templates/auth/variants/minimal/Login';
import MinimalSignup from '@/templates/auth/variants/minimal/Signup';
import ModernLogin from '@/templates/auth/variants/modern/Login';
import ModernSignup from '@/templates/auth/variants/modern/Signup';
import ClassicLogin from '@/templates/auth/variants/classic/Login';
import ClassicSignup from '@/templates/auth/variants/classic/Signup';

type Variant = 'minimal' | 'modern' | 'classic';
type Page = 'login' | 'signup';

export default function TemplatePreview() {
  const router = useRouter();
  const initialVariant = (router.query.variant as Variant) || 'modern';
  
  const [activeVariant, setActiveVariant] = useState<Variant>(initialVariant);
  const [activePage, setActivePage] = useState<Page>('login');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const templates = {
    minimal: {
      name: 'Minimal',
      description: 'Clean, simple, and lightweight design',
      color: 'gray',
      gradient: 'from-gray-400 to-gray-600',
      features: ['Fast Loading', 'Easy Customization', 'Mobile First', 'Lightweight CSS']
    },
    modern: {
      name: 'Modern',
      description: 'Sleek glassmorphism with stunning gradients',
      color: 'purple',
      gradient: 'from-purple-400 via-pink-500 to-red-500',
      features: ['Glassmorphism', 'Smooth Animations', 'Gradient Blobs', 'Trendy Design']
    },
    classic: {
      name: 'Classic',
      description: 'Professional split-screen enterprise design',
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      features: ['Split Layout', 'Feature Bullets', 'Enterprise Look', 'Trust Building']
    }
  };

  const renderTemplate = () => {
    const components = {
      minimal: { login: MinimalLogin, signup: MinimalSignup },
      modern: { login: ModernLogin, signup: ModernSignup },
      classic: { login: ClassicLogin, signup: ClassicSignup }
    };

    const Component = components[activeVariant][activePage];
    return <Component />;
  };

  const handleUseTemplate = () => {
    localStorage.setItem('selectedTemplate', activeVariant);
    router.push('/builder/new');
  };

  if (isFullscreen) {
    return (
      <div className="relative min-h-screen">
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg hover:bg-white transition flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Exit Fullscreen</span>
        </button>
        {renderTemplate()}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Navigation */}
      <nav className="relative bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">T</span>
              </div>
              <span className="text-white font-bold text-xl">TemplateBuilder</span>
            </Link>
            
            <Link
              href="/builder/new"
              className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
            >
              Start Building
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
            <span className="text-xs text-gray-400">🔒 Preview Mode • No Data is Saved</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Template Preview
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Explore all template variants and see them in action. Click fullscreen for the complete experience.
          </p>
        </div>

        {/* Template Selector */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {Object.entries(templates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => setActiveVariant(key as Variant)}
              className={`relative group bg-white/[0.02] backdrop-blur-xl rounded-xl p-6 border-2 transition-all ${
                activeVariant === key
                  ? 'border-white shadow-2xl scale-105'
                  : 'border-white/10 hover:border-white/20 hover:scale-102'
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${template.gradient} rounded-t-xl`} />
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{template.name}</h3>
                {activeVariant === key && (
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              
              <p className="text-gray-500 text-sm mb-4">{template.description}</p>
              
              <div className="grid grid-cols-2 gap-2">
                {template.features.map((feature) => (
                  <div key={feature} className="flex items-center space-x-1 text-xs text-gray-400">
                    <div className="w-1 h-1 rounded-full bg-white" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Page Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/[0.02] backdrop-blur-xl rounded-lg p-1 inline-flex border border-white/10">
            <button
              onClick={() => setActivePage('login')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activePage === 'login'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login Page
            </button>
            <button
              onClick={() => setActivePage('signup')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activePage === 'signup'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Signup Page
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl mb-8">
          {/* Browser Chrome */}
          <div className="bg-zinc-800 px-4 py-3 flex items-center justify-between border-b border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="bg-zinc-700 rounded px-4 py-1.5 text-sm text-gray-400 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>localhost:3000/{activePage}</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsFullscreen(true)}
              className="text-gray-500 hover:text-white transition p-1"
              title="Fullscreen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          {/* Preview */}
          <div className="relative">
            <div className="aspect-video w-full overflow-hidden bg-zinc-900">
              <div className="transform scale-75 origin-top-left w-[133.33%] h-[133.33%] pointer-events-none">
                {renderTemplate()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleUseTemplate}
            className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all flex items-center space-x-2"
          >
            <span>Use {templates[activeVariant].name} Template</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <button
            onClick={() => setIsFullscreen(true)}
            className="bg-white/[0.02] backdrop-blur-lg text-white px-8 py-4 rounded-xl font-bold text-lg border border-white/10 hover:bg-white/5 transition-all flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View Fullscreen</span>
          </button>
        </div>

        {/* Template Comparison */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Compare All Templates
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(templates).map(([key, template]) => (
              <div key={key} className="bg-white/[0.02] backdrop-blur-xl rounded-xl overflow-hidden border border-white/10">
                <div className={`h-2 bg-gradient-to-r ${template.gradient}`} />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{template.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {template.features.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2 text-sm text-gray-400">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setActiveVariant(key as Variant);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full bg-white/5 text-white py-2 rounded-lg hover:bg-white/10 transition font-semibold border border-white/10"
                  >
                    Preview {template.name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl p-12 border border-white/10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Love What You See?
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Start building your project with your favorite template in minutes
            </p>
            <Link
              href="/builder/new"
              className="inline-block bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
            >
              Start Building Now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
