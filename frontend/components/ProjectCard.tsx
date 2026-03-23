export interface DashboardProject {
  id: string;
  name: string;
  modules: string[];
  template: string;
  backend: string;
  status: string;
  fileCount: number;
  updatedAt: string;
  isPublic?: boolean;
  tags?: string[];
  vercelDeployUrl?: string;
  githubRepoUrl?: string;
  railwayServiceUrl?: string;
  accessRole?: 'owner' | 'editor' | 'viewer';
  isOwner?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
  canDeploy?: boolean;
  isTeamProject?: boolean;
}

interface ProjectCardProps {
  project: DashboardProject;
  onOpen: (project: DashboardProject) => void;
  onDownload: (project: DashboardProject) => void;
  onDelete: (project: DashboardProject) => void;
  onPublish?: (project: DashboardProject) => void;
  actionLoading?: boolean;
}

export default function ProjectCard({
  project,
  onOpen,
  onDownload,
  onDelete,
  onPublish,
  actionLoading
}: ProjectCardProps) {
  const updated = new Date(project.updatedAt).toLocaleString();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
            {project.isTeamProject && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 border border-violet-200">
                Team
              </span>
            )}
            {project.accessRole && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200 capitalize">
                {project.accessRole}
              </span>
            )}
            {project.isPublic && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                📢 Public
              </span>
            )}
          </div>
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
        {project.tags && project.tags.length > 0 && project.tags.map(tag => (
          <span key={tag} className="rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-700">
            #{tag}
          </span>
        ))}
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
          {project.canWrite === false ? 'View' : 'Open'}
        </button>
        <button
          onClick={() => onDownload(project)}
          className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          disabled={actionLoading}
        >
          Download
        </button>
        {onPublish && project.canPublish !== false && (
          <button
            onClick={() => onPublish(project)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              project.isPublic
                ? 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                : 'border border-violet-300 text-violet-700 hover:bg-violet-50'
            }`}
            disabled={actionLoading}
          >
            {project.isPublic ? 'Unpublish' : 'Publish'}
          </button>
        )}
        <button
          onClick={() => onDelete(project)}
          className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          disabled={actionLoading || project.canDelete === false}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
