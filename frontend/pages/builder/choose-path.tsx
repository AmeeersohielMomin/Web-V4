import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function ChoosePath() {
  const router = useRouter();
  const { user, logout } = useAuth();
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

  const choosePath = (path: 'ai' | 'template') => {
    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      data.buildPath = path;
      localStorage.setItem('builderProject', JSON.stringify(data));
    }

    if (path === 'ai') {
      void router.push('/builder/select-ai');
      return;
    }

    void router.push('/builder/select-modules');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <button
            onClick={() => void router.push('/builder/new')}
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Step 2 of 5</span>
                <span className="font-semibold text-slate-900">Build Path</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/5 rounded-full bg-slate-900" />
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{projectName}</p>
              <h1 className="mt-4 text-3xl font-bold text-slate-900">How do you want to build?</h1>
              <p className="mt-2 text-sm text-slate-600">
                Choose AI generation for fastest output, or templates for a guided setup flow.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => choosePath('ai')}
                className="rounded-xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-900">AI Code Generator</p>
                <p className="mt-2 text-sm text-slate-600">
                  Describe your app and generate a complete full-stack project with iterative refinements.
                </p>
                <ul className="mt-4 space-y-1 text-sm text-slate-600">
                  <li>Generate full project files in one flow</li>
                  <li>Refine with follow-up prompts</li>
                  <li>Deploy or download instantly</li>
                </ul>
              </button>

              <button
                onClick={() => choosePath('template')}
                className="rounded-xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-900">Template Builder</p>
                <p className="mt-2 text-sm text-slate-600">
                  Select modules, choose UI variants, configure backend choices, then ship your starter.
                </p>
                <ul className="mt-4 space-y-1 text-sm text-slate-600">
                  <li>Step-by-step guided configuration</li>
                  <li>Clear module and backend choices</li>
                  <li>Good for custom architecture control</li>
                </ul>
              </button>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
