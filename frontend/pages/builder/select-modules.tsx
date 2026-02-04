import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface Module {
  id: string;
  name: string;
  icon: string;
  description: string;
  features: string[];
  available: boolean;
  required: boolean;
}

export default function SelectModules() {
  const router = useRouter();
  const [selectedModules, setSelectedModules] = useState<string[]>(['auth']);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    // Load project data from localStorage
    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      setProjectName(data.projectName);
    } else {
      router.push('/builder/new');
    }
  }, []);

  const modules: Module[] = [
    {
      id: 'auth',
      name: 'Authentication',
      icon: '🔐',
      description: 'Complete user authentication system',
      features: ['JWT tokens', 'Password hashing', 'Login/Signup', 'Protected routes'],
      available: true,
      required: true
    },
    {
      id: 'blog',
      name: 'Blog System',
      icon: '📝',
      description: 'Full-featured blogging platform',
      features: ['Posts', 'Comments', 'Categories', 'Tags'],
      available: false,
      required: false
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce',
      icon: '🛒',
      description: 'Online store with cart and checkout',
      features: ['Products', 'Cart', 'Checkout', 'Orders'],
      available: false,
      required: false
    },
    {
      id: 'payments',
      name: 'Payments',
      icon: '💳',
      description: 'Payment processing integration',
      features: ['Stripe', 'PayPal', 'Subscriptions', 'Invoices'],
      available: false,
      required: false
    },
    {
      id: 'admin',
      name: 'Admin Dashboard',
      icon: '👨‍💼',
      description: 'Admin panel with analytics',
      features: ['User management', 'Analytics', 'Reports', 'Settings'],
      available: false,
      required: false
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: '🔔',
      description: 'Multi-channel notifications',
      features: ['Email', 'SMS', 'Push', 'In-app'],
      available: false,
      required: false
    }
  ];

  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      setSelectedModules(selectedModules.filter(id => id !== moduleId));
    } else {
      setSelectedModules([...selectedModules, moduleId]);
    }
  };

  const handleNext = () => {
    // Save module selection
    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      data.modules = selectedModules;
      localStorage.setItem('builderProject', JSON.stringify(data));
    }
    router.push('/builder/select-templates');
  };

  const handleBack = () => {
    router.push('/builder/new');
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Top Navigation */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/builder/new')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-white">{projectName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Progress Indicator */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Step 2 of 5</span>
            <span className="text-sm font-medium text-violet-400">Select Modules</span>
          </div>
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: '40%' }} />
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 mb-6">
            <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Select your modules
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Choose the features you want. Don't worry, you can<br />customize everything later.
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => !module.required && module.available && toggleModule(module.id)}
              disabled={!module.available}
              className={`relative text-left p-6 rounded-2xl transition-all ${
                selectedModules.includes(module.id)
                  ? 'bg-white/[0.07] border-2 border-violet-500 shadow-lg shadow-violet-500/20'
                  : module.available
                  ? 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20'
                  : 'bg-white/[0.01] border border-white/5 cursor-not-allowed opacity-40'
              }`}
            >
              {/* Selection Indicator */}
              {selectedModules.includes(module.id) && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Module Content */}
              <div className="mb-4">
                <div className="text-3xl mb-3">{module.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center space-x-2">
                  <span>{module.name}</span>
                  {module.required && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 font-medium">
                      REQUIRED
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{module.description}</p>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {module.features.slice(0, 3).map((feature, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-white/5 text-gray-500 rounded">
                    {feature}
                  </span>
                ))}
                {module.features.length > 3 && (
                  <span className="text-xs px-2 py-1 text-gray-600">+{module.features.length - 3}</span>
                )}
              </div>

              {/* Status Badge */}
              {!module.available && (
                <div className="mt-3 inline-flex items-center space-x-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Coming Soon</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Summary Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{selectedModules.length}</p>
                <p className="text-sm text-gray-400">modules selected</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{modules.filter(m => !m.available).length} more coming soon</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleBack}
            className="h-12 px-6 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition-all flex items-center justify-center space-x-2 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={selectedModules.length === 0}
            className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2 group"
          >
            <span>Continue</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
