import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface BackendOption {
  id: string;
  name: string;
  description: string;
  features: string[];
  requirements: string[];
}

interface ModuleBackends {
  [key: string]: BackendOption[];
}

const availableBackends: ModuleBackends = {
  auth: [
    {
      id: 'jwt-mongodb',
      name: 'JWT + MongoDB',
      description: 'Token-based authentication with MongoDB data storage',
      features: ['JWT tokens', 'bcrypt hashing', 'NoSQL data model', '7-day expiry'],
      requirements: ['MongoDB Atlas or local MongoDB', 'JWT_SECRET env variable']
    },
    {
      id: 'jwt-postgresql',
      name: 'JWT + PostgreSQL',
      description: 'Token-based authentication with PostgreSQL',
      features: ['JWT tokens', 'bcrypt hashing', 'Relational SQL', 'ACID transactions'],
      requirements: ['PostgreSQL server', 'JWT_SECRET env variable']
    },
    {
      id: 'jwt-mysql',
      name: 'JWT + MySQL',
      description: 'Token-based authentication with MySQL',
      features: ['JWT tokens', 'bcrypt hashing', 'Relational SQL', 'Broad hosting support'],
      requirements: ['MySQL server', 'JWT_SECRET env variable']
    },
    {
      id: 'session-based',
      name: 'Session-Based Auth',
      description: 'Cookie sessions with Redis persistence',
      features: ['Session cookies', 'Redis-backed state', 'Server-side sessions', 'CSRF ready'],
      requirements: ['Redis server', 'SESSION_SECRET env variable']
    }
  ],
  blog: [
    {
      id: 'mongodb',
      name: 'MongoDB',
      description: 'Flexible document storage for posts and metadata',
      features: ['Flexible schema', 'Text search', 'Aggregation support'],
      requirements: ['MongoDB connection string']
    }
  ]
};

export default function SelectBackend() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [projectData, setProjectData] = useState<any>(null);
  const [selectedBackends, setSelectedBackends] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const saved = localStorage.getItem('builderProject');
    if (!saved) {
      void router.push('/builder/new');
      return;
    }

    const data = JSON.parse(saved);
    if (!data.templates) {
      void router.push('/builder/select-templates');
      return;
    }

    setProjectData(data);

    const defaults: { [key: string]: string } = {};
    data.modules.forEach((moduleId: string) => {
      defaults[moduleId] = availableBackends[moduleId]?.[0]?.id || '';
    });
    setSelectedBackends(defaults);
  }, [router]);

  const handleBackendSelect = (moduleId: string, backendId: string) => {
    setSelectedBackends({
      ...selectedBackends,
      [moduleId]: backendId
    });
  };

  const handleNext = () => {
    if (!projectData) {
      return;
    }

    const data = { ...projectData, backends: selectedBackends };
    localStorage.setItem('builderProject', JSON.stringify(data));
    void router.push('/builder/deployment');
  };

  if (!projectData) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <button
            onClick={() => void router.push('/builder/select-templates')}
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Step 5 of 5</span>
                <span className="font-semibold text-slate-900">Configure Backend</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-full rounded-full bg-slate-900" />
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{projectData.projectName}</p>
              <h1 className="mt-4 text-3xl font-bold text-slate-900">Configure backend</h1>
              <p className="mt-2 text-sm text-slate-600">
                Choose database and auth strategies for each selected module.
              </p>
            </div>

            {projectData.modules.map((moduleId: string) => {
              const backends = availableBackends[moduleId];
              if (!backends || backends.length === 0) {
                return null;
              }

              return (
                <div key={moduleId} className="mb-8 last:mb-0">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">{moduleId}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {backends.map((backend) => {
                      const selected = selectedBackends[moduleId] === backend.id;
                      return (
                        <button
                          key={backend.id}
                          onClick={() => handleBackendSelect(moduleId, backend.id)}
                          className={`rounded-xl border p-4 text-left transition ${
                            selected
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <h3 className="text-sm font-semibold text-slate-900">{backend.name}</h3>
                          <p className="mt-2 text-sm text-slate-600">{backend.description}</p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Features</p>
                          <ul className="mt-1 space-y-1 text-xs text-slate-600">
                            {backend.features.map((feature) => (
                              <li key={feature}>{feature}</li>
                            ))}
                          </ul>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Requirements</p>
                          <ul className="mt-1 space-y-1 text-xs text-slate-600">
                            {backend.requirements.map((requirement) => (
                              <li key={requirement}>{requirement}</li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleNext}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue to Deployment
              </button>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
