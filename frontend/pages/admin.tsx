import { useEffect, useState } from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalGenerations: number;
  planBreakdown: Record<string, number>;
}

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  plan: string;
  role: string;
  generationsUsed: number;
  generationsLimit: number;
  createdAt: string;
  lastLoginAt?: string;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    const loadAdmin = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, usersRes] = await Promise.all([
          api.get('/api/platform/auth/admin/stats'),
          api.get(`/api/platform/auth/admin/users?page=${page}&limit=25`)
        ]);
        setStats(statsRes.data?.data || null);
        setUsers(usersRes.data?.data?.users || []);
        setTotalUsers(usersRes.data?.data?.total || 0);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Access denied or failed to load');
      } finally {
        setLoading(false);
      }
    };
    void loadAdmin();
  }, [user, page]);

  return (
    <ProtectedRoute>
      <Head><title>Admin - IDEA</title></Head>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Admin Panel</h1>

          {error && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Users</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Projects</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalProjects}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Generations</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalGenerations}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Plan Breakdown</p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                      <div key={plan} className="flex justify-between text-sm">
                        <span className="capitalize text-slate-600">{plan}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Users ({totalUsers})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
                      <tr>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Plan</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Generations</th>
                        <th className="px-6 py-3">Joined</th>
                        <th className="px-6 py-3">Last Login</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-900">{u.email}</td>
                          <td className="px-6 py-3 text-slate-600">{u.name || '—'}</td>
                          <td className="px-6 py-3">
                            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize">
                              {u.plan}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-600">{u.role}</td>
                          <td className="px-6 py-3 text-slate-600">
                            {u.generationsUsed}/{u.generationsLimit === -1 ? '∞' : u.generationsLimit}
                          </td>
                          <td className="px-6 py-3 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3 text-slate-500">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalUsers > 25 && (
                  <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-slate-500">Page {page}</span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 25 >= totalUsers}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}
