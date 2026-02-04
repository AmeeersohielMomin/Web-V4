import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { authService } from '@/templates/auth/services/auth.service';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const availableModules: Module[] = [
    {
      id: 'auth',
      name: 'Authentication',
      description: 'User signup, login, JWT authentication',
      icon: '🔐',
      available: true
    },
    {
      id: 'blog',
      name: 'Blog System',
      description: 'Create, edit, and manage blog posts',
      icon: '📝',
      available: false
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce',
      description: 'Products, cart, checkout functionality',
      icon: '🛒',
      available: false
    },
    {
      id: 'payments',
      name: 'Payment Processing',
      description: 'Stripe, PayPal integration',
      icon: '💳',
      available: false
    },
    {
      id: 'admin',
      name: 'Admin Dashboard',
      description: 'User management, analytics',
      icon: '⚙️',
      available: false
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Email, SMS, push notifications',
      icon: '🔔',
      available: false
    }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const token = authService.getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await authService.me(token);
        if (response.success && response.data?.user) {
          setUser(response.data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    authService.removeToken();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <nav className="fixed w-full bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-lg">T</span>
                </div>
                <span className="text-white font-bold text-xl">TemplateBuilder</span>
              </div>
              <div className="flex items-center space-x-6">
                <Link href="/home" className="text-gray-400 hover:text-white transition text-sm">
                  Home
                </Link>
                <Link href="/builder/new" className="text-gray-400 hover:text-white transition text-sm">
                  New Project
                </Link>
                <div className="flex items-center space-x-3 pl-6 border-l border-white/10">
                  <div className="text-sm text-gray-400">{user?.email}</div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-12">
              <div className="inline-block mb-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <span className="text-xs text-gray-400">👋 Welcome back</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Your Dashboard
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl">
                Build amazing full-stack applications with our modular templates
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-12 grid md:grid-cols-3 gap-6">
              <Link
                href="/builder/new"
                className="group bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/[0.05] hover:border-white/20 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">New Project</h3>
                    <p className="text-sm text-gray-400">Start building now</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/templates/preview"
                className="group bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/[0.05] hover:border-white/20 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition border border-white/10">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Preview Templates</h3>
                    <p className="text-sm text-gray-400">See all designs</p>
                  </div>
                </div>
              </Link>

              <div className="group bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Documentation</h3>
                    <p className="text-sm text-gray-400">Learn how it works</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Modules */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6">
                Available Modules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableModules.map((module) => (
                  <div
                    key={module.id}
                    className={`bg-white/[0.03] backdrop-blur-xl rounded-2xl border p-6 transition-all ${
                      module.available
                        ? 'border-white/20 hover:border-white/30 hover:bg-white/[0.05] cursor-pointer'
                        : 'border-white/10 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{module.icon}</div>
                      {module.available ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black">
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-400 border border-white/10">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                      {module.name}
                    </h4>
                    <p className="text-sm text-gray-400">{module.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-8">
              <h3 className="text-2xl font-bold text-white mb-8 text-center">
                How It Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-black">1</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">Select Modules</h4>
                  <p className="text-sm text-gray-400">
                    Choose from pre-built templates and modules
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">Configure</h4>
                  <p className="text-sm text-gray-400">
                    Set your preferences and backend options
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">Generate</h4>
                  <p className="text-sm text-gray-400">
                    Get production-ready code instantly
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <span className="text-2xl font-bold text-white">4</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2">Deploy</h4>
                  <p className="text-sm text-gray-400">
                    Download or push to GitHub instantly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
