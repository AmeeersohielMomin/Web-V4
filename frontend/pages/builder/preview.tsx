import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api, { API_BASE_URL } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function Preview() {
  const router = useRouter();
  const { name, modules } = router.query;
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const modulesList = typeof modules === 'string' ? modules.split(',') : [];
  const projectName = typeof name === 'string' ? name : '';

  const moduleDetails: Record<string, any> = {
    auth: {
      name: 'Authentication',
      files: [
        'backend/src/modules/auth/auth.routes.ts',
        'backend/src/modules/auth/auth.controller.ts',
        'backend/src/modules/auth/auth.service.ts',
        'backend/src/modules/auth/auth.model.ts',
        'backend/src/modules/auth/auth.schema.ts',
        'frontend/templates/auth/pages/login.tsx',
        'frontend/templates/auth/pages/signup.tsx',
        'frontend/templates/auth/components/AuthForm.tsx',
        'frontend/templates/auth/services/auth.service.ts'
      ],
      apis: [
        'POST /api/auth/signup',
        'POST /api/auth/login',
        'GET /api/auth/me'
      ]
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await api.get('/api/platform/auth/me');
        const platformUser = response.data?.data?.user;
        if (platformUser) {
          setUser({
            id: String(platformUser.id || platformUser._id || ''),
            email: String(platformUser.email || '')
          });
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

  const handleGenerate = async () => {
    setGenerating(true);
    
    try {
      const token = getToken();
      
      // Call the generation API
      const response = await fetch(`${API_BASE_URL}/api/project/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectName: projectName,
          modules: modulesList
        })
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      // Get the ZIP file as a blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Success
      alert(`Project "${projectName}" generated and downloaded successfully!\\n\\nExtract the ZIP file and follow the README instructions.`);
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate project. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/builder/new')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-900">Preview & Generate</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Project Summary */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Project Summary
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium text-gray-700">Project Name:</span>
              <span className="text-gray-900 font-mono">{projectName}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium text-gray-700">Modules:</span>
              <span className="text-gray-900">{modulesList.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-gray-700">Tech Stack:</span>
              <span className="text-gray-900">Next.js, Express, MongoDB, TypeScript</span>
            </div>
          </div>
        </div>

        {/* Module Details */}
        <div className="space-y-6 mb-6">
          {modulesList.map(moduleId => {
            const details = moduleDetails[moduleId];
            if (!details) return null;

            return (
              <div key={moduleId} className="bg-white rounded-lg shadow-sm p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {details.name} Module
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Files */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Files to be generated ({details.files.length})
                    </h4>
                    <ul className="space-y-2">
                      {details.files.map((file: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600 font-mono flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0014.414 5L11 1.586A2 2 0 009.586 1H7z" />
                          </svg>
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* API Endpoints */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      API Endpoints ({details.apis.length})
                    </h4>
                    <ul className="space-y-2">
                      {details.apis.map((api: string, idx: number) => (
                        <li key={idx} className="text-sm font-mono flex items-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${
                            api.startsWith('GET') ? 'bg-blue-100 text-blue-800' :
                            api.startsWith('POST') ? 'bg-green-100 text-green-800' :
                            api.startsWith('PUT') ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {api.split(' ')[0]}
                          </span>
                          <span className="text-gray-700">{api.split(' ')[1]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* What You'll Get */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📦 What You'll Get
          </h3>
          <ul className="space-y-2">
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Complete source code with TypeScript
            </li>
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Environment configuration files
            </li>
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              README with setup instructions
            </li>
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Package.json with all dependencies
            </li>
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No vendor lock-in - you own the code
            </li>
          </ul>
        </div>

        {/* Generate Button */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Ready to generate?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your project will be ready to download in seconds
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-8 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                '🚀 Generate Project'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
