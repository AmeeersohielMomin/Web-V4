import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Version {
  versionNumber: number;
  label: string;
  prompt: string;
  fileCount: number;
  createdAt: string;
}

interface VersionHistoryProps {
  projectId: string;
  onRestore?: () => void;
}

export default function VersionHistory({ projectId, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/platform/projects/${projectId}/versions`);
        setVersions(res.data?.data?.versions || []);
        setCurrentVersion(res.data?.data?.currentVersion || 0);
      } catch {
        setVersions([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [projectId]);

  const handleRestore = async (versionNumber: number) => {
    if (!confirm(`Restore to v${versionNumber}? This will replace current files.`)) return;
    setRestoring(versionNumber);
    try {
      await api.post(`/api/platform/projects/${projectId}/versions/restore`, { versionNumber });
      setCurrentVersion(versionNumber);
      onRestore?.();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  if (loading) return <div className="text-sm text-slate-400">Loading history...</div>;
  if (versions.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Version History <span className="text-slate-400 font-normal">({versions.length})</span>
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {[...versions].reverse().map((v) => (
          <div
            key={v.versionNumber}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              v.versionNumber === currentVersion
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-100'
            }`}
          >
            <div>
              <span className="font-medium text-slate-900">{v.label || `v${v.versionNumber}`}</span>
              {v.versionNumber === currentVersion && (
                <span className="ml-2 inline-block rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  CURRENT
                </span>
              )}
              <p className="text-xs text-slate-400 mt-0.5">
                {v.fileCount} files · {new Date(v.createdAt).toLocaleString()}
              </p>
              {v.prompt && (
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">{v.prompt}</p>
              )}
            </div>
            {v.versionNumber !== currentVersion && (
              <button
                onClick={() => handleRestore(v.versionNumber)}
                disabled={restoring === v.versionNumber}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                {restoring === v.versionNumber ? '...' : 'Restore'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
