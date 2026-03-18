import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface Module {
  id: string;
  name: string;
  description: string;
  features: string[];
  available: boolean;
  required: boolean;
}

const modules: Module[] = [
  {
    id: 'auth',
    name: 'Authentication',
    description: 'Complete user authentication system',
    features: ['JWT tokens', 'Password hashing', 'Login and signup', 'Protected routes'],
    available: true,
    required: true
  },
  {
    id: 'blog',
    name: 'Blog System',
    description: 'Full-featured blogging platform',
    features: ['Posts', 'Comments', 'Categories', 'Tags'],
    available: false,
    required: false
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Online store with cart and checkout',
    features: ['Products', 'Cart', 'Checkout', 'Orders'],
    available: false,
    required: false
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Payment processing integration',
    features: ['Stripe', 'PayPal', 'Subscriptions', 'Invoices'],
    available: false,
    required: false
  },
  {
    id: 'admin',
    name: 'Admin Dashboard',
    description: 'Admin panel with analytics',
    features: ['User management', 'Analytics', 'Reports', 'Settings'],
    available: false,
    required: false
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Multi-channel notifications',
    features: ['Email', 'SMS', 'Push', 'In-app'],
    available: false,
    required: false
  }
];

export default function SelectModules() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [selectedModules, setSelectedModules] = useState<string[]>(['auth']);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('builderProject');
    if (!saved) {
      void router.push('/builder/new');
      return;
    }

    const data = JSON.parse(saved);
    setProjectName(String(data.projectName || 'untitled-project'));
  }, [router]);

  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      setSelectedModules(selectedModules.filter((id) => id !== moduleId));
      return;
    }

    setSelectedModules([...selectedModules, moduleId]);
  };

  const handleNext = () => {
    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      data.modules = selectedModules;
      localStorage.setItem('builderProject', JSON.stringify(data));
    }
    void router.push('/builder/select-templates');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <button
            onClick={() => void router.push('/builder/choose-path')}
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Step 3 of 5</span>
                <span className="font-semibold text-slate-900">Select Modules</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-3/5 rounded-full bg-slate-900" />
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{projectName}</p>
              <h1 className="mt-4 text-3xl font-bold text-slate-900">Select your modules</h1>
              <p className="mt-2 text-sm text-slate-600">Pick what should be included in this build.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => {
                const selected = selectedModules.includes(module.id);
                const disabled = !module.available;

                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      if (!module.required && module.available) {
                        toggleModule(module.id);
                      }
                    }}
                    disabled={disabled}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-slate-900 bg-slate-50'
                        : disabled
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100/70 opacity-70'
                          : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h2 className="text-sm font-semibold text-slate-900">{module.name}</h2>
                      {module.required && (
                        <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{module.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {module.features.slice(0, 3).map((feature) => (
                        <span key={feature} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {feature}
                        </span>
                      ))}
                    </div>
                    {!module.available && (
                      <p className="mt-3 text-xs font-medium text-amber-700">Coming soon</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                Selected modules: <span className="font-semibold text-slate-900">{selectedModules.length}</span>
              </p>
              <button
                onClick={handleNext}
                disabled={selectedModules.length === 0}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Continue
              </button>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
