import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import ProjectCard, { type DashboardProject } from '@/components/ProjectCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import UsageMeter from '@/components/UsageMeter';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

function mapProject(raw: any): DashboardProject {
  return {
    id: String(raw._id || raw.id),
    name: String(raw.name || 'Untitled Project'),
    modules: Array.isArray(raw.modules) ? raw.modules : [],
    template: String(raw.template || 'default'),
    backend: String(raw.backend || 'express'),
    status: String(raw.status || 'complete'),
    fileCount: Number(raw.fileCount || 0),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    vercelDeployUrl: raw.vercelDeployUrl ? String(raw.vercelDeployUrl) : undefined,
    githubRepoUrl: raw.githubRepoUrl ? String(raw.githubRepoUrl) : undefined,
    railwayServiceUrl: raw.railwayServiceUrl ? String(raw.railwayServiceUrl) : undefined
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = useCallback(async () => {
    setError('');
    setLoadingProjects(true);
    try {
      const response = await api.get('/api/platform/projects');
      const rawProjects = response.data?.data?.projects || [];
      setProjects(rawProjects.map(mapProject));
      await refreshUser();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to load your projects');
    } finally {
      setLoadingProjects(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [projects]
  );

  const handleOpen = (project: DashboardProject) => {
    void router.push(`/builder/ai-generate?projectId=${project.id}`);
  };

  const handleDownload = async (project: DashboardProject) => {
    setActionLoadingId(project.id);
    try {
      const response = await api.get(`/api/platform/projects/${project.id}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to download project');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (project: DashboardProject) => {
    const confirmed = window.confirm(`Delete ${project.name}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setActionLoadingId(project.id);
    try {
      await api.delete(`/api/platform/projects/${project.id}`);
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete project');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpgrade = async (planId: 'starter' | 'pro') => {
    setBillingLoading(true);
    setError('');
    try {
      const response = await api.post('/api/platform/billing/checkout', { planId });
      const checkoutUrl = response.data?.data?.url;
      if (!checkoutUrl) {
        throw new Error('Missing checkout URL');
      }
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to start checkout');
      setBillingLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    setError('');
    try {
      const response = await api.post('/api/platform/billing/portal');
      const portalUrl = response.data?.data?.url;
      if (!portalUrl) {
        throw new Error('Missing portal URL');
      }
      window.location.href = portalUrl;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to open billing portal');
      setBillingLoading(false);
    }
  };

  const hasReachedLimit =
    (user?.generationsLimit || 0) !== -1 &&
    (user?.generationsUsed || 0) >= (user?.generationsLimit || 0);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Project Dashboard</h1>
              <p className="text-sm text-slate-600">Manage your generated full-stack builds.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void fetchProjects()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Refresh
              </button>
              <Link
                href="/builder/new"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                New Project
              </Link>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Projects</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{projects.length}</p>
              <p className="mt-2 text-sm text-slate-600 capitalize">
                Plan: {user?.plan || 'free'}
              </p>
            </div>
            <div className="md:col-span-2">
              <UsageMeter
                used={user?.generationsUsed}
                limit={user?.generationsLimit}
              />
            </div>
          </div>

          {hasReachedLimit && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-lg font-semibold text-amber-900">
                You have reached your free generation limit
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Upgrade to continue building more apps this month.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void handleUpgrade('starter')}
                  disabled={billingLoading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Upgrade to Starter ($19/mo)
                </button>
                <button
                  onClick={() => void handleUpgrade('pro')}
                  disabled={billingLoading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Upgrade to Pro ($49/mo)
                </button>
              </div>
            </div>
          )}

          {user?.plan && user.plan !== 'free' && (
            <div className="mb-6">
              <button
                onClick={() => void handleManageBilling()}
                disabled={billingLoading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Manage Billing
              </button>
            </div>
          )}

          {error && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          {loadingProjects ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
              Loading projects...
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-xl font-semibold text-slate-900">No projects yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Generate your first application to see it here.
              </p>
              <Link
                href="/builder/new"
                className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create Project
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={handleOpen}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  actionLoading={actionLoadingId === project.id}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
