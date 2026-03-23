import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import api, { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import JSZip from 'jszip';
import { generateDockerfile, generateDockerCompose, generateGitHubActions, generateTestFile } from '@/lib/exportUtils';

type DeployStatus = 'idle' | 'building' | 'ready' | 'error';

type BuilderProject = {
  projectId?: string | null;
  projectName?: string;
  userId?: string;
  accessRole?: 'owner' | 'editor' | 'viewer';
  canDeploy?: boolean;
  modules?: string[];
  template?: string;
  backend?: string;
  generatedCode?: {
    files?: Array<{ path: string; content: string; language?: string }>;
  };
};

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, '')
  };
}

export default function DeploymentPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [project, setProject] = useState<BuilderProject | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [canDeployProject, setCanDeployProject] = useState(true);

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [repoName, setRepoName] = useState('');
  const [privateRepo, setPrivateRepo] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  const [vercelToken, setVercelToken] = useState('');
  const [vercelLoading, setVercelLoading] = useState(false);
  const [vercelStatus, setVercelStatus] = useState<DeployStatus>('idle');
  const [vercelUrl, setVercelUrl] = useState<string | null>(null);
  const [vercelDeployId, setVercelDeployId] = useState<string | null>(null);

  const [railwayToken, setRailwayToken] = useState('');
  const [railwayLoading, setRailwayLoading] = useState(false);
  const [railwayStatus, setRailwayStatus] = useState<DeployStatus>('idle');
  const [railwayUrl, setRailwayUrl] = useState<string | null>(null);
  const [railwayServiceId, setRailwayServiceId] = useState<string | null>(null);

  const vercelPollRef = useRef<number | null>(null);
  const railwayPollRef = useRef<number | null>(null);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('deploy_github_token') || '';
    const savedUsername = sessionStorage.getItem('deploy_github_username');
    const savedVercelToken = sessionStorage.getItem('deploy_vercel_token') || '';
    const savedRailwayToken = sessionStorage.getItem('deploy_railway_token') || '';

    setGithubToken(savedToken);
    setGithubUsername(savedUsername || null);
    setVercelToken(savedVercelToken);
    setRailwayToken(savedRailwayToken);

    const saved = localStorage.getItem('builderProject');
    if (!saved) {
      void router.push('/builder/new');
      return;
    }

    const parsed = JSON.parse(saved) as BuilderProject;
    const nextProjectId =
      (typeof parsed.projectId === 'string' && parsed.projectId) ||
      (typeof parsed.projectId === 'string' ? parsed.projectId : null) ||
      null;

    setProject(parsed);
    setProjectId(nextProjectId);
    setRepoName(
      String(parsed.projectName || 'idea-project')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
    );
  }, [router]);

  useEffect(() => {
    const hydrateProjectPermissions = async () => {
      if (!projectId) return;
      try {
        const res = await api.get(`/api/platform/projects/${projectId}`);
        const projectData = res.data?.data?.project || {};
        const canDeploy = typeof projectData.canDeploy === 'boolean' ? projectData.canDeploy : true;
        setCanDeployProject(canDeploy);
        setProject((prev) => ({
          ...(prev || {}),
          userId: projectData.userId ? String(projectData.userId) : prev?.userId,
          accessRole: projectData.accessRole || prev?.accessRole,
          canDeploy
        }));
      } catch {
        setCanDeployProject(true);
      }
    };

    void hydrateProjectPermissions();
  }, [projectId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event?.data || event.data.type !== 'GITHUB_OAUTH_SUCCESS') {
        return;
      }

      const token = String(event.data.token || '');
      const username = event.data.username ? String(event.data.username) : null;

      if (!token) {
        return;
      }

      setGithubToken(token);
      setGithubUsername(username);
      sessionStorage.setItem('deploy_github_token', token);
      if (username) {
        sessionStorage.setItem('deploy_github_username', username);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!vercelDeployId || !vercelToken || !projectId || vercelStatus !== 'building') {
      return;
    }

    vercelPollRef.current = window.setInterval(async () => {
      try {
        const response = await api.get(`/api/deploy/vercel/status/${vercelDeployId}`, {
          params: { vercelToken, projectId }
        });
        const readyState = String(response.data?.data?.readyState || 'BUILDING');
        const url = response.data?.data?.url ? String(response.data.data.url) : null;

        if (readyState === 'READY') {
          setVercelStatus('ready');
          setVercelUrl(url);
          if (vercelPollRef.current) {
            window.clearInterval(vercelPollRef.current);
          }
        } else if (readyState === 'ERROR' || readyState === 'CANCELED') {
          setVercelStatus('error');
          if (vercelPollRef.current) {
            window.clearInterval(vercelPollRef.current);
          }
        }
      } catch {
        setVercelStatus('error');
        if (vercelPollRef.current) {
          window.clearInterval(vercelPollRef.current);
        }
      }
    }, 3000);

    return () => {
      if (vercelPollRef.current) {
        window.clearInterval(vercelPollRef.current);
      }
    };
  }, [vercelDeployId, vercelToken, vercelStatus, projectId]);

  useEffect(() => {
    if (!railwayServiceId || !railwayToken || railwayStatus !== 'building') {
      return;
    }

    railwayPollRef.current = window.setInterval(async () => {
      try {
        const response = await api.get(`/api/deploy/railway/status/${railwayServiceId}`, {
          params: { railwayToken }
        });

        const rawStatus = String(response.data?.data?.status || 'BUILDING').toUpperCase();
        const maybeUrl = response.data?.data?.url ? String(response.data.data.url) : null;

        if (rawStatus === 'SUCCESS' || rawStatus === 'READY') {
          setRailwayStatus('ready');
          if (maybeUrl) {
            setRailwayUrl(maybeUrl);
          }
          if (railwayPollRef.current) {
            window.clearInterval(railwayPollRef.current);
          }
        } else if (rawStatus === 'FAILED' || rawStatus === 'CRASHED') {
          setRailwayStatus('error');
          if (railwayPollRef.current) {
            window.clearInterval(railwayPollRef.current);
          }
        }
      } catch {
        setRailwayStatus('error');
        if (railwayPollRef.current) {
          window.clearInterval(railwayPollRef.current);
        }
      }
    }, 5000);

    return () => {
      if (railwayPollRef.current) {
        window.clearInterval(railwayPollRef.current);
      }
    };
  }, [railwayServiceId, railwayToken, railwayStatus]);

  const projectName = useMemo(
    () => String(project?.projectName || 'Untitled project'),
    [project]
  );

  const startGithubOAuth = () => {
    const popup = window.open(
      `${API_BASE_URL}/api/deploy/github/oauth/start`,
      'github-oauth',
      'width=600,height=760'
    );

    if (!popup) {
      setError('Unable to open GitHub OAuth popup. Please allow popups and try again.');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError('');

    try {
      if (projectId) {
        const response = await api.get(`/api/platform/projects/${projectId}/download`, {
          responseType: 'blob'
        });

        downloadBlob(response.data as Blob, `${projectName}.zip`);
        return;
      }

      const localFiles = project?.generatedCode?.files || [];
      if (localFiles.length === 0) {
        throw new Error('Generate a saved project first before deployment.');
      }

      const zip = new JSZip();
      localFiles.forEach((file) => {
        if (file?.path && typeof file?.content === 'string') {
          zip.file(file.path, file.content);
        }
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${projectName}.zip`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to download ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const handleVercelDeploy = async () => {
    if (!canDeployProject) {
      setError('You are in viewer mode for this project and cannot deploy.');
      return;
    }

    if (!vercelToken.trim()) {
      setError('Enter your Vercel token');
      return;
    }

    if (!projectId) {
      setError('Generate a saved project first before deployment.');
      return;
    }

    setVercelLoading(true);
    setVercelStatus('building');
    setError('');
    sessionStorage.setItem('deploy_vercel_token', vercelToken.trim());

    try {
      const response = await api.post('/api/deploy/vercel', {
        projectId,
        vercelToken: vercelToken.trim()
      });

      const deployId = String(response.data?.data?.deployId || '');
      const url = response.data?.data?.url ? String(response.data.data.url) : null;

      if (!deployId) {
        throw new Error('Missing deployId in response');
      }

      setVercelDeployId(deployId);
      setVercelUrl(url);
    } catch (err: any) {
      setVercelStatus('error');
      setError(err?.response?.data?.error || err?.message || 'Vercel deployment failed');
    } finally {
      setVercelLoading(false);
    }
  };

  const handlePushGithub = async () => {
    if (!canDeployProject) {
      setError('You are in viewer mode for this project and cannot deploy.');
      return;
    }

    if (!githubToken.trim()) {
      setError('Connect GitHub first');
      return;
    }

    if (!repoName.trim()) {
      setError('Enter repository name');
      return;
    }

    if (!projectId) {
      setError('Generate a saved project first before deployment.');
      return;
    }

    setGithubLoading(true);
    setError('');
    sessionStorage.setItem('deploy_github_token', githubToken.trim());

    try {
      const response = await api.post('/api/deploy/github', {
        projectId,
        githubToken: githubToken.trim(),
        repoName: repoName.trim(),
        isPrivate: privateRepo
      });

      const url = response.data?.data?.repoUrl ? String(response.data.data.repoUrl) : null;
      const userName = response.data?.data?.githubUser
        ? String(response.data.data.githubUser)
        : null;

      setGithubUrl(url);
      if (userName) {
        setGithubUsername(userName);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'GitHub push failed');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleRailwayDeploy = async () => {
    if (!canDeployProject) {
      setError('You are in viewer mode for this project and cannot deploy.');
      return;
    }

    if (!railwayToken.trim()) {
      setError('Enter your Railway token');
      return;
    }

    if (!projectId) {
      setError('Generate a saved project first before deployment.');
      return;
    }

    const sourceGitHub = githubUrl || null;
    if (!sourceGitHub) {
      setError('Push to GitHub first before deploying to Railway');
      return;
    }

    const parsed = parseGitHubRepo(sourceGitHub);
    if (!parsed) {
      setError('Unable to parse GitHub repo URL');
      return;
    }

    setRailwayLoading(true);
    setRailwayStatus('building');
    setError('');
    sessionStorage.setItem('deploy_railway_token', railwayToken.trim());

    try {
      const response = await api.post('/api/deploy/railway', {
        projectId,
        railwayToken: railwayToken.trim(),
        githubOwner: parsed.owner,
        githubRepo: parsed.repo
      });

      const serviceId = response.data?.data?.serviceId
        ? String(response.data.data.serviceId)
        : null;
      const serviceUrl = response.data?.data?.serviceUrl
        ? String(response.data.data.serviceUrl)
        : null;

      if (!serviceId) {
        throw new Error('Missing Railway serviceId');
      }

      setRailwayServiceId(serviceId);
      setRailwayUrl(serviceUrl);
    } catch (err: any) {
      setRailwayStatus('error');
      setError(err?.response?.data?.error || err?.message || 'Railway deployment failed');
    } finally {
      setRailwayLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Deployment</h1>
              <p className="mt-1 text-sm text-slate-600">
                Step 5: choose where to publish your generated app.
              </p>
            </div>
              <button
                onClick={() => void router.push('/builder/select-ai')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Back to Generator
            </button>
          </div>

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{projectName}</h2>
            <p className="mt-2 text-sm text-slate-600">Access: Unlimited</p>
            {project?.accessRole && (
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                Role: {project.accessRole}
              </p>
            )}
            {!canDeployProject && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                You are in viewer mode for this team project. Deployment actions are disabled.
              </p>
            )}
            {!projectId && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This project does not have a saved projectId yet. ZIP download still works from local generated files, but deploy APIs require generating while logged in.
              </p>
            )}
          </section>

          {error && (
            <p className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Download ZIP</h3>
              <p className="mt-2 text-sm text-slate-600">
                Always available. Download full source code archive.
              </p>
              <button
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {downloading ? 'Preparing ZIP...' : 'Download'}
              </button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Push to GitHub</h3>
              </div>
              {!githubToken ? (
                <button
                  onClick={startGithubOAuth}
                  className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Connect GitHub (OAuth)
                </button>
              ) : (
                <p className="mt-3 text-xs text-emerald-700">
                  Connected as {githubUsername || 'GitHub user'}
                </p>
              )}
              <label className="mt-3 block text-xs text-slate-600">Repository name</label>
              <input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="my-awesome-app"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={privateRepo}
                  onChange={(e) => setPrivateRepo(e.target.checked)}
                />
                Private repo
              </label>
              <button
                onClick={() => void handlePushGithub()}
                disabled={githubLoading || !canDeployProject}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {githubLoading ? 'Pushing...' : 'Create new repo'}
              </button>
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-sm text-sky-700 underline"
                >
                  {githubUrl}
                </a>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Deploy to Vercel</h3>
              </div>
              <label className="mt-3 block text-xs text-slate-600">Vercel token</label>
              <input
                type="password"
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="Enter your Vercel token"
              />
              <button
                onClick={() => void handleVercelDeploy()}
                disabled={vercelLoading || !canDeployProject}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {vercelLoading || vercelStatus === 'building' ? 'Deploying...' : 'Deploy to Vercel'}
              </button>
              {vercelStatus === 'building' && (
                <p className="mt-2 text-xs text-amber-700">Deployment in progress...</p>
              )}
              {vercelUrl && (
                <a
                  href={vercelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-sm text-sky-700 underline"
                >
                  {vercelUrl}
                </a>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Deploy to Railway</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">Requires GitHub repo first.</p>
              <label className="mt-3 block text-xs text-slate-600">Railway token</label>
              <input
                type="password"
                value={railwayToken}
                onChange={(e) => setRailwayToken(e.target.value)}
                className="mt-1 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="Enter your Railway token"
              />
              <button
                onClick={() => void handleRailwayDeploy()}
                disabled={railwayLoading || !canDeployProject}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {railwayLoading || railwayStatus === 'building' ? 'Deploying...' : 'Deploy to Railway'}
              </button>
              {railwayStatus === 'building' && (
                <p className="mt-2 text-xs text-amber-700">Service creation started...</p>
              )}
              {railwayUrl && (
                <a
                  href={railwayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-sm text-sky-700 underline"
                >
                  {railwayUrl}
                </a>
              )}
            </article>
          </section>

          {/* Export Options */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Export Options</h3>
            <p className="text-sm text-slate-600 mb-4">Generate deployment and infrastructure files for your project.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() => {
                  const content = generateDockerfile([]);
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'Dockerfile'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition text-left"
              >
                <span className="block text-base mb-0.5">🐳</span>
                Dockerfile
              </button>
              <button
                onClick={() => {
                  const content = generateDockerCompose(projectName);
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'docker-compose.yml'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition text-left"
              >
                <span className="block text-base mb-0.5">🐳</span>
                Docker Compose
              </button>
              <button
                onClick={() => {
                  const content = generateGitHubActions(projectName);
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'ci.yml'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition text-left"
              >
                <span className="block text-base mb-0.5">🔄</span>
                GitHub Actions CI/CD
              </button>
              <button
                onClick={() => {
                  const content = generateTestFile(projectName);
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'app.test.ts'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition text-left"
              >
                <span className="block text-base mb-0.5">🧪</span>
                Test File
              </button>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
