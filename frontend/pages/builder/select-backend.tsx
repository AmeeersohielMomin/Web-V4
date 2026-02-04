import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface BackendOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  requirements: string[];
}

interface ModuleBackends {
  [key: string]: BackendOption[];
}

export default function SelectBackend() {
  const router = useRouter();
  const [projectData, setProjectData] = useState<any>(null);
  const [selectedBackends, setSelectedBackends] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.templates) {
        router.push('/builder/select-templates');
        return;
      }
      setProjectData(data);
      
      // Set default backends
      const defaults: { [key: string]: string } = {};
      data.modules.forEach((module: string) => {
        defaults[module] = availableBackends[module]?.[0]?.id || '';
      });
      setSelectedBackends(defaults);
    } else {
      router.push('/builder/new');
    }
  }, []);

  const availableBackends: ModuleBackends = {
    auth: [
      {
        id: 'jwt-mongodb',
        name: 'JWT + MongoDB',
        description: 'Token-based authentication with MongoDB database',
        icon: '🍃',
        features: ['JWT tokens', 'bcrypt hashing', 'NoSQL database', '7-day expiry'],
        requirements: ['MongoDB Atlas or local MongoDB', 'JWT_SECRET env variable']
      },
      {
        id: 'jwt-postgresql',
        name: 'JWT + PostgreSQL',
        description: 'Token-based authentication with PostgreSQL database',
        icon: '🐘',
        features: ['JWT tokens', 'bcrypt hashing', 'SQL database', 'ACID compliance'],
        requirements: ['PostgreSQL server', 'JWT_SECRET env variable']
      },
      {
        id: 'jwt-mysql',
        name: 'JWT + MySQL',
        description: 'Token-based authentication with MySQL database',
        icon: '🐬',
        features: ['JWT tokens', 'bcrypt hashing', 'SQL database', 'Wide compatibility'],
        requirements: ['MySQL server', 'JWT_SECRET env variable']
      },
      {
        id: 'session-based',
        name: 'Session-Based Auth',
        description: 'Traditional session cookies with Redis storage',
        icon: '🔴',
        features: ['Session cookies', 'Redis storage', 'Server-side state', 'CSRF protection'],
        requirements: ['Redis server', 'SESSION_SECRET env variable']
      }
    ],
    blog: [
      {
        id: 'mongodb',
        name: 'MongoDB',
        description: 'Flexible document storage for blog posts',
        icon: '🍃',
        features: ['Flexible schema', 'Rich queries', 'Text search', 'Aggregations'],
        requirements: ['MongoDB connection']
      }
    ]
  };

  const handleBackendSelect = (moduleId: string, backendId: string) => {
    setSelectedBackends({
      ...selectedBackends,
      [moduleId]: backendId
    });
  };

  const handleNext = () => {
    if (!projectData) return;
    
    const data = { ...projectData, backends: selectedBackends };
    localStorage.setItem('builderProject', JSON.stringify(data));
    router.push('/builder/deployment');
  };

  const handleBack = () => {
    router.push('/builder/select-templates');
  };

  if (!projectData) {
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/builder/select-templates')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-white">{projectData.projectName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Progress Indicator */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Step 4 of 5</span>
            <span className="text-sm font-medium text-emerald-400">Configure Backend</span>
          </div>
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: '80%' }} />
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 mb-6">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Configure backend
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Select your database and authentication strategy.<br />All options include production-ready code.
          </p>
        </div>

        {/* Backend Selection for Each Module */}
        {projectData.modules.map((moduleId: string) => {
          const backends = availableBackends[moduleId];
          if (!backends || backends.length === 0) return null;

          return (
            <div key={moduleId} className="mb-16 last:mb-0">
              <div className="mb-6 flex items-center justify-center space-x-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <h3 className="text-xl font-bold capitalize text-white px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                  {moduleId}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {backends.map((backend) => (
                  <button
                    key={backend.id}
                    onClick={() => handleBackendSelect(moduleId, backend.id)}
                    className={`relative text-left p-6 rounded-2xl transition-all ${
                      selectedBackends[moduleId] === backend.id
                        ? 'bg-white/[0.07] border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
                        : 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20'
                    }`}
                  >
                    {/* Selection Indicator */}
                    {selectedBackends[moduleId] === backend.id && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-4xl">{backend.icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg text-white">{backend.name}</h3>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-400 mb-5 leading-relaxed">{backend.description}</p>
                    
                    {/* Features */}
                    <div className="mb-5">
                      <span className="text-xs font-semibold text-gray-400 mb-2.5 block uppercase tracking-wider">Features</span>
                      <div className="flex flex-wrap gap-1.5">
                        {backend.features.map((feature, idx) => (
                          <span key={idx} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Requirements */}
                    <div>
                      <span className="text-xs font-semibold text-gray-400 mb-2.5 block uppercase tracking-wider">Requirements</span>
                      <div className="space-y-1.5">
                        {backend.requirements.map((req, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs text-gray-500">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Navigation */}
        <div className="mt-16 flex flex-col sm:flex-row gap-3">
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
            className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 group"
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
