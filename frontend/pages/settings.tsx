import { useState } from 'react';
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'github', label: 'GitHub Models', placeholder: 'github_pat_... (models:read)' },
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'ollama', label: 'Ollama (Local)', placeholder: 'http://localhost:11434' },
];

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [keyMsg, setKeyMsg] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.patch('/api/platform/auth/profile', { name });
      await refreshUser();
      setMessage('Profile updated!');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setChangingPw(true);
    setPasswordErr('');
    setPasswordMsg('');
    try {
      await api.post('/api/platform/auth/change-password', { currentPassword, newPassword });
      setPasswordMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordErr(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleSaveApiKey = async (provider: string) => {
    const key = apiKeys[provider];
    if (!key) return;
    setKeyMsg('');
    try {
      await api.post('/api/platform/auth/api-keys', { provider, key });
      setKeyMsg(`${provider} key saved!`);
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
    } catch (err: any) {
      setKeyMsg(err?.response?.data?.error || 'Failed to save key');
    }
  };

  const handleRemoveApiKey = async (provider: string) => {
    try {
      await api.delete(`/api/platform/auth/api-keys/${provider}`);
      setKeyMsg(`${provider} key removed`);
    } catch (err: any) {
      setKeyMsg(err?.response?.data?.error || 'Failed to remove key');
    }
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Settings - IDEA</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

          {/* Profile Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Your name"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {message && <span className="text-sm text-emerald-600">{message}</span>}
                {error && <span className="text-sm text-rose-600">{error}</span>}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Plan: <span className="font-semibold capitalize">{user?.plan || 'free'}</span>
              </p>
            </div>
          </section>

          {/* Change Password */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPw || !currentPassword || !newPassword}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {changingPw ? 'Changing...' : 'Change Password'}
                </button>
                {passwordMsg && <span className="text-sm text-emerald-600">{passwordMsg}</span>}
                {passwordErr && <span className="text-sm text-rose-600">{passwordErr}</span>}
              </div>
            </div>
          </section>

          {/* API Keys */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">API Keys</h2>
            <p className="text-sm text-slate-500 mb-4">
              Save your own AI provider keys for unlimited generation.
            </p>
            {keyMsg && (
              <p className="mb-3 text-sm text-emerald-600">{keyMsg}</p>
            )}
            <div className="space-y-3">
              {PROVIDERS.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-28 text-sm font-medium text-slate-700">{p.label}</span>
                  <input
                    type="password"
                    value={apiKeys[p.id] || ''}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder={p.placeholder}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    onClick={() => handleSaveApiKey(p.id)}
                    disabled={!apiKeys[p.id]}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleRemoveApiKey(p.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Danger Zone */}
          <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-rose-700 mb-2">Danger Zone</h2>
            <p className="text-sm text-slate-500 mb-4">
              Irreversible actions — proceed with caution.
            </p>
            <button
              onClick={logout}
              className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Log out everywhere
            </button>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
