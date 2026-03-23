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
    isPublic: !!raw.isPublic,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    vercelDeployUrl: raw.vercelDeployUrl ? String(raw.vercelDeployUrl) : undefined,
    githubRepoUrl: raw.githubRepoUrl ? String(raw.githubRepoUrl) : undefined,
    railwayServiceUrl: raw.railwayServiceUrl ? String(raw.railwayServiceUrl) : undefined,
    accessRole: raw.accessRole,
    isOwner: !!raw.isOwner,
    canWrite: typeof raw.canWrite === 'boolean' ? raw.canWrite : true,
    canDelete: typeof raw.canDelete === 'boolean' ? raw.canDelete : true,
    canPublish: typeof raw.canPublish === 'boolean' ? raw.canPublish : true,
    canDeploy: typeof raw.canDeploy === 'boolean' ? raw.canDeploy : true,
    isTeamProject: !!raw.isTeamProject
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
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
    if (project.canDelete === false) {
      setError('You do not have permission to delete this project.');
      return;
    }

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

  const handlePublish = async (project: DashboardProject) => {
    if (project.canPublish === false) {
      setError('Only the project owner can change publish settings.');
      return;
    }

    setActionLoadingId(project.id);
    try {
      await api.patch(`/api/platform/projects/${project.id}/public`, { isPublic: !project.isPublic });
      setProjects((current) =>
        current.map((p) => p.id === project.id ? { ...p, isPublic: !p.isPublic } : p)
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to toggle publish status');
    } finally {
      setActionLoadingId(null);
    }
  };

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
              <p className="mt-2 text-sm text-slate-600">Access: Unlimited</p>
            </div>
            {user?.teamId && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-violet-600">Team</p>
                <p className="mt-2 text-lg font-bold text-violet-900">Collaborative workspace</p>
                <Link href="/team" className="mt-2 inline-block text-sm text-violet-700 hover:text-violet-900 font-medium">
                  Manage team →
                </Link>
              </div>
            )}
            <div className={user?.teamId ? '' : 'md:col-span-2'}>
              <UsageMeter
                used={user?.generationsUsed}
                limit={-1}
              />
            </div>
          </div>

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
                  onPublish={handlePublish}
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
