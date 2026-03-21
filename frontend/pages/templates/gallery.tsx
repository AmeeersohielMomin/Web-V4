import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface Template {
  _id: string;
  name: string;
  description?: string;
  modules: string[];
  template: string;
  backend: string;
  tags: string[];
  fileCount: number;
  createdAt: string;
}

export default function TemplateGalleryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '12' });
        if (search) params.set('search', search);
        const res = await api.get(`/api/platform/projects/templates?${params}`);
        setTemplates(res.data?.data?.templates || []);
        setTotal(res.data?.data?.total || 0);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [page, search]);

  const handleClone = async (templateId: string) => {
    if (!isAuthenticated) {
      void router.push('/login');
      return;
    }
    setCloning(templateId);
    try {
      const res = await api.post(`/api/platform/projects/templates/${templateId}/clone`, {});
      const newProjectId = res.data?.data?.project?._id;
      if (newProjectId) {
        void router.push(`/builder/ai-generate?projectId=${newProjectId}`);
      }
    } catch {
      alert('Failed to clone template');
    } finally {
      setCloning(null);
    }
  };

  return (
    <>
      <Head>
        <title>Template Gallery - IDEA</title>
        <meta name="description" content="Browse and clone community templates to kickstart your project." />
      </Head>
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="text-lg font-bold text-slate-900">IDEA Platform</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">Dashboard</Link>
              <Link href="/builder/new" className="rounded-lg bg-slate-900 px-3 py-2 text-white font-semibold text-sm hover:bg-slate-800">
                New Project
              </Link>
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-900">Template Gallery</h1>
            <p className="mt-2 text-slate-600">Browse community templates and clone them to get started fast.</p>
          </div>

          {/* Search */}
          <div className="mb-6 flex justify-center">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search templates..."
              className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {loading ? (
            <div className="text-center text-slate-500 py-12">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-slate-600 text-lg">No templates found</p>
              <p className="text-slate-500 text-sm mt-1">Be the first to publish a template from your dashboard!</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <article key={t._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">{t.name}</h3>
                    {t.description && (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{t.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {t.modules.map((m) => (
                        <span key={m} className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {m}
                        </span>
                      ))}
                      {t.tags?.map((tag) => (
                        <span key={tag} className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{t.fileCount} files · {t.backend}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleClone(t._id)}
                      disabled={cloning === t._id}
                      className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {cloning === t._id ? 'Cloning...' : 'Clone Template'}
                    </button>
                  </article>
                ))}
              </div>

              {total > 12 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-slate-500">Page {page}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 12 >= total}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
