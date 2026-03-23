import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface TeamMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
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

function normalizeInviteTokenInput(rawValue: string): string {
  let value = String(rawValue || '').trim().replace(/^['\"]|['\"]$/g, '');
  if (!value) return '';

  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep original value when decode is invalid.
  }

  const extractFromParams = (input: string) => {
    const query = input.startsWith('?') ? input.slice(1) : input;
    const params = new URLSearchParams(query);
    return String(params.get('token') || params.get('inviteToken') || '').trim();
  };

  if (value.includes('://')) {
    try {
      const parsed = new URL(value);
      const extracted = String(parsed.searchParams.get('token') || parsed.searchParams.get('inviteToken') || '').trim();
      if (extracted) value = extracted;
    } catch {
      // Fall back to direct parsing.
    }
  }

  if (value.startsWith('?') || value.includes('token=') || value.includes('inviteToken=')) {
    const extracted = extractFromParams(value);
    if (extracted) value = extracted;
  }

  return value.trim().replace(/[)\].,;]+$/g, '');
}

export default function TeamPage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [signupInviteLink, setSignupInviteLink] = useState('');
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

  // Create team
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  // Join team
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');

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

  useEffect(() => {
    const tokenFromQuery = String(router.query.token || '').trim();
    if (tokenFromQuery && !joinToken) {
      setJoinToken(tokenFromQuery);
    }
  }, [router.query.token, joinToken]);

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
    setInviteToken('');
    setInviteLink('');
    setSignupInviteLink('');
    try {
      const res = await api.post('/api/platform/teams/invite', { email: inviteEmail, role: inviteRole });
      const token = String(res.data?.data?.token || '');
      const url = String(res.data?.data?.inviteUrl || '');
      const signupUrl = String(res.data?.data?.signupInviteUrl || '');
      const emailSent = !!res.data?.data?.emailSent;
      const emailError = String(res.data?.data?.emailError || '');
      if (token) setInviteToken(token);
      if (url) setInviteLink(url);
      if (signupUrl) setSignupInviteLink(signupUrl);
      if (emailSent) {
        setInviteMsg(`Invite emailed to ${inviteEmail}.`);
      } else if (emailError) {
        setInviteMsg(`Invite created, but email was not sent (${emailError}). Share the link below manually.`);
      } else {
        setInviteMsg(`Invite created for ${inviteEmail}. Share the link below.`);
      }
      setInviteEmail('');
    } catch (err: any) {
      setInviteMsg(err?.response?.data?.error || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleJoinTeam = async () => {
    const normalizedToken = normalizeInviteTokenInput(joinToken);
    if (!normalizedToken) {
      setError('Invite token is required');
      return;
    }

    setJoining(true);
    setError('');
    setJoinMsg('');
    try {
      const res = await api.post('/api/platform/teams/accept-invite', { token: normalizedToken });
      await refreshUser();
      await loadTeam();
      setJoinToken('');
      if (res.data?.data?.alreadyMember) {
        setJoinMsg('You are already a member of this team.');
      } else {
        setJoinMsg('Joined team successfully.');
      }
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

  const handleUpdateRole = async (targetUserId: string, role: 'editor' | 'viewer') => {
    setUpdatingRoleUserId(targetUserId);
    setError('');
    try {
      await api.patch(`/api/platform/teams/members/${targetUserId}/role`, { role });
      await loadTeam();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update member role');
    } finally {
      setUpdatingRoleUserId(null);
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

  const copyText = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setInviteMsg('Copied to clipboard');
    } catch {
      setInviteMsg('Copy failed. Please copy manually.');
    }
  };

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
                      {isOwner && m.userId !== user?.id && m.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          <select
                            value={m.role}
                            onChange={(e) => void handleUpdateRole(m.userId, e.target.value as 'editor' | 'viewer')}
                            disabled={updatingRoleUserId === m.userId}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                          >
                            Remove
                          </button>
                        </div>
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
                  {inviteLink && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="mb-1 font-medium text-slate-800">Invite link</p>
                      <p className="break-all text-slate-700">{inviteLink}</p>
                      <button
                        onClick={() => void copyText(inviteLink)}
                        className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Copy link
                      </button>
                    </div>
                  )}
                  {signupInviteLink && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="mb-1 font-medium text-slate-800">Signup invite link (for new users)</p>
                      <p className="break-all text-slate-700">{signupInviteLink}</p>
                      <button
                        onClick={() => void copyText(signupInviteLink)}
                        className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Copy signup link
                      </button>
                    </div>
                  )}
                  {inviteToken && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="mb-1 font-medium text-slate-800">Invite token</p>
                      <p className="break-all font-mono text-slate-700">{inviteToken}</p>
                      <button
                        onClick={() => void copyText(inviteToken)}
                        className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Copy token
                      </button>
                    </div>
                  )}
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
                {joinMsg && (
                  <p className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {joinMsg}
                  </p>
                )}
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
