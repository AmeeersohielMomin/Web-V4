export interface DashboardProject {
  id: string;
  name: string;
  modules: string[];
  template: string;
  backend: string;
  status: string;
  fileCount: number;
  updatedAt: string;
  vercelDeployUrl?: string;
  githubRepoUrl?: string;
  railwayServiceUrl?: string;
}

interface ProjectCardProps {
  project: DashboardProject;
  onOpen: (project: DashboardProject) => void;
  onDownload: (project: DashboardProject) => void;
  onDelete: (project: DashboardProject) => void;
  actionLoading?: boolean;
}

export default function ProjectCard({
  project,
  onOpen,
  onDownload,
  onDelete,
  actionLoading
}: ProjectCardProps) {
  const updated = new Date(project.updatedAt).toLocaleString();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
          <p className="text-xs text-slate-500">Updated {updated}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
          {project.status}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>Template: {project.template || 'n/a'}</p>
        <p>Backend: {project.backend || 'n/a'}</p>
        <p>Modules: {project.modules.length}</p>
        <p>Files: {project.fileCount}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {project.modules.slice(0, 4).map((module) => (
          <span key={module} className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
            {module}
          </span>
        ))}
        {project.modules.length > 4 && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            +{project.modules.length - 4} more
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {project.vercelDeployUrl && (
          <a
            href={project.vercelDeployUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-black px-2 py-1 text-xs font-medium text-white hover:opacity-85"
          >
            Vercel
          </a>
        )}
        {project.githubRepoUrl && (
          <a
            href={project.githubRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:opacity-85"
          >
            GitHub
          </a>
        )}
        {project.railwayServiceUrl && (
          <a
            href={project.railwayServiceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:opacity-85"
          >
            Railway
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onOpen(project)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Open
        </button>
        <button
          onClick={() => onDownload(project)}
          className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          disabled={actionLoading}
        >
          Download
        </button>
        <button
          onClick={() => onDelete(project)}
          className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          disabled={actionLoading}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
