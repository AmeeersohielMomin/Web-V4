import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function NewProject() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [validationError, setValidationError] = useState('');

  const normalizedProjectName = useMemo(() => {
    return projectName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  }, [projectName]);

  const isValidName = normalizedProjectName.length >= 3;

  const handleNext = () => {
    if (!isValidName) {
      setValidationError('Use at least 3 characters. Only lowercase letters, numbers, and hyphens are allowed.');
      return;
    }

    setValidationError('');
    // Save to localStorage and go to module selection
    localStorage.setItem('builderProject', JSON.stringify({ projectName: normalizedProjectName }));
    router.push('/builder/choose-path');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <button
            onClick={() => void router.push('/dashboard')}
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back to dashboard
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Step 1 of 5</span>
                <span className="font-semibold text-slate-900">Getting Started</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/5 rounded-full bg-slate-900" />
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Name your project</h1>
              <p className="mt-2 text-sm text-slate-600">
                Pick a short project slug. You can update the display name later inside the app.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="projectName" className="mb-2 block text-sm font-semibold text-slate-800">
                  Project slug
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    if (validationError) {
                      setValidationError('');
                    }
                  }}
                  placeholder="my-awesome-project"
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none transition focus:border-slate-500"
                  autoFocus
                />
                <p className="mt-2 text-xs text-slate-500">
                  Lowercase letters, numbers, and hyphens only. Minimum 3 characters.
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Preview: <span className="font-semibold text-slate-900">{normalizedProjectName || 'my-awesome-project'}</span>
                </p>
                {validationError && (
                  <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {validationError}
                  </p>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={!isValidName}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Continue
              </button>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">What happens next</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li>Choose your build path: AI generation or templates.</li>
                <li>Configure stack choices and preview generated files.</li>
                <li>Deploy to GitHub/Vercel/Railway or download ZIP.</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
