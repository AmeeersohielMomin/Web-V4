import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authService } from '@/templates/auth/services/auth.service';

export default function NewProject() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');

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

  const handleNext = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }
    // Save to localStorage and go to module selection
    localStorage.setItem('builderProject', JSON.stringify({ projectName }));
    router.push('/builder/select-modules');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Top Navigation */}
      <div className="relative border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-500">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-16">
        {/* Compact Progress Indicator */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Step 1 of 5</span>
            <span className="text-sm font-medium text-blue-400">Getting Started</span>
          </div>
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: '20%' }} />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 mb-6">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Name your project
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              Choose a memorable name for your project.<br />
              You can always change it later.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label htmlFor="projectName" className="block text-sm font-semibold text-gray-300 mb-3">
                Project name
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-awesome-project"
                className="w-full h-14 px-4 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                autoFocus
              />
              <p className="mt-3 text-sm text-gray-500 flex items-start">
                <svg className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Use lowercase letters, numbers, and hyphens</span>
              </p>
            </div>

            {/* Action */}
            <button
              onClick={handleNext}
              disabled={!projectName.trim()}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2 group"
            >
              <span>Continue</span>
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-12 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-sm font-semibold text-white mb-3">What happens next</h3>
                <div className="space-y-2.5 text-sm text-gray-400">
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2">1.</span>
                    <span>Select features and modules for your project</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2">2.</span>
                    <span>Choose your preferred UI design style</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2">3.</span>
                    <span>Configure database and authentication</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2">4.</span>
                    <span>Deploy to GitHub or download as ZIP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
