import { useEffect, useState } from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface TeamMember {
  userId: string;
  role: string;
  email: string;
  name: string;
  avatar: string;
  joinedAt: string;
}

interface TeamData {
  _id: string;
  name: string;
  ownerId: string;
}

export default function TeamPage() {
  const { user, logout, refreshUser } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  // Create team
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  // Join team
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/platform/teams/my-team');
      setTeam(res.data?.data?.team || null);
      setMembers(res.data?.data?.members || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadTeam();
  }, [user]);

  const handleCreateTeam = async () => {
    setCreating(true);
    setError('');
    try {
      await api.post('/api/platform/teams', { name: teamName });
      await refreshUser();
      await loadTeam();
      setTeamName('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    setInviteMsg('');
    try {
      await api.post('/api/platform/teams/invite', { email: inviteEmail, role: inviteRole });
      setInviteMsg(`Invite sent to ${inviteEmail}!`);
      setInviteEmail('');
    } catch (err: any) {
      setInviteMsg(err?.response?.data?.error || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleJoinTeam = async () => {
    setJoining(true);
    setError('');
    try {
      await api.post('/api/platform/teams/accept-invite', { token: joinToken });
      await refreshUser();
      await loadTeam();
      setJoinToken('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/api/platform/teams/members/${targetUserId}`);
      await loadTeam();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave your team?')) return;
    try {
      await api.post('/api/platform/teams/leave');
      await refreshUser();
      await loadTeam();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to leave team');
    }
  };

  const handleDelete = async () => {
    if (!confirm('This will permanently delete the team. Are you sure?')) return;
    try {
      await api.delete('/api/platform/teams');
      await refreshUser();
      await loadTeam();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete team');
    }
  };

  const isOwner = team && user && team.ownerId === user.id;

  return (
    <ProtectedRoute>
      <Head><title>Team - IDEA</title></Head>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Team</h1>

          {error && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : team ? (
            <>
              {/* Team Info */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{team.name}</h2>
                <p className="text-sm text-slate-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
              </section>

              {/* Members */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Members</h2>
                <div className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.name || m.email}</p>
                        <p className="text-xs text-slate-500">{m.email} · <span className="capitalize">{m.role}</span></p>
                      </div>
                      {isOwner && m.userId !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Invite */}
              {isOwner && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Invite Member</h2>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="member@example.com"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {inviting ? 'Sending...' : 'Invite'}
                    </button>
                  </div>
                  {inviteMsg && <p className="mt-2 text-sm text-emerald-600">{inviteMsg}</p>}
                </section>
              )}

              {/* Actions */}
              <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-rose-700 mb-3">Danger Zone</h2>
                <div className="flex gap-3">
                  {!isOwner && (
                    <button onClick={handleLeave} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                      Leave Team
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={handleDelete} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                      Delete Team
                    </button>
                  )}
                </div>
              </section>
            </>
          ) : (
            /* No team — create or join */
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Create a Team</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="My Team"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    onClick={handleCreateTeam}
                    disabled={creating || !teamName}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Join a Team</h2>
                <p className="text-sm text-slate-500 mb-3">
                  Paste the invite token you received from a team owner.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinToken}
                    onChange={(e) => setJoinToken(e.target.value)}
                    placeholder="Invite token"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    onClick={handleJoinTeam}
                    disabled={joining || !joinToken}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {joining ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
