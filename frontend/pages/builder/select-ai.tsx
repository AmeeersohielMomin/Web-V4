// frontend/pages/builder/select-ai.tsx
// The requirements interview page - sits between deployment.tsx and ai-generate.tsx.
// Manages the idle -> questioning -> answering -> confirming flow.
// On confirm: saves requirements to localStorage and routes to /builder/ai-generate.

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useRequirementsFlow } from '../../hooks/useRequirementsFlow';
import type { RequirementsDocument } from '../../types/generation';

const PROVIDER_MODELS: Record<string, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
  openai: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022'],
  ollama: ['llama3.3', 'qwen2.5-coder', 'deepseek-r1']
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI GPT',
  anthropic: 'Anthropic Claude',
  ollama: 'Ollama (Local)'
};

const ADDITIONAL_STEPS = [
  'Add user roles and permissions',
  'Include dashboard with charts',
  'Add email notifications',
  'Include file upload'
];

function prettyProjectName(rawName: string, userIdea?: string): string {
  const normalized = String(rawName || '').trim().toLowerCase();
  const normalizedIdea = String(userIdea || '').trim().toLowerCase();

  const stripConversationalPrefixes = (value: string): string => {
    return value
      .replace(/^i\s+want\s+to\s+build\s+/, '')
      .replace(/^i\s+want\s+build\s+/, '')
      .replace(/^want\s+to\s+build\s+/, '')
      .replace(/^want\s+build\s+/, '')
      .replace(/^i\s+need\s+to\s+build\s+/, '')
      .replace(/^i\s+need\s+build\s+/, '')
      .replace(/^need\s+to\s+build\s+/, '')
      .replace(/^need\s+build\s+/, '')
      .replace(/^build\s+(a|an|the)\s+/, '')
      .replace(/^create\s+(a|an|the)\s+/, '')
      .trim();
  };

  const fromIdea = (): string => {
    if (!normalizedIdea) return '';
    const cleanedIdea = stripConversationalPrefixes(normalizedIdea)
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = cleanedIdea
      .split(' ')
      .filter(Boolean)
      .slice(0, 6)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return words.join(' ');
  };

  if (!normalized) {
    return fromIdea() || 'your app';
  }

  const withoutPrefix = normalized
    .replace(/^i-want-to-build-/, '')
    .replace(/^i-want-build-/, '')
    .replace(/^want-to-build-/, '')
    .replace(/^want-build-/, '')
    .replace(/^i-need-to-build-/, '')
    .replace(/^i-need-build-/, '')
    .replace(/^need-to-build-/, '')
    .replace(/^need-build-/, '')
    .replace(/^build-a-/, '')
    .replace(/^build-an-/, '')
    .replace(/^build-the-/, '')
    .replace(/^create-a-/, '')
    .replace(/^create-an-/, '')
    .replace(/^create-the-/, '')
    .replace(/^build-/, '');

  const words = withoutPrefix
    .split('-')
    .filter(Boolean)
    .filter(w => w.length > 1)
    .slice(0, 8)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1));

  const fromSlug = words.length > 0 ? words.join(' ') : '';
  const likelyTruncated = /\bWeb\b\s*$/.test(fromSlug) || fromSlug.split(' ').length <= 2;
  if (likelyTruncated) {
    return fromIdea() || fromSlug || 'your app';
  }

  return fromSlug || fromIdea() || 'your app';
}

export default function SelectAiPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Read builder config saved by previous steps
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(['auth']);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('builderProject') || '{}');
      const savedProvider = stored.aiProvider || stored.provider;
      const savedModel = stored.aiModel || stored.model;
      const savedApiKey = stored.aiApiKey || stored.apiKey;
      const savedModules = stored.modules || stored.selectedModules;

      if (savedProvider) setProvider(savedProvider);
      if (savedModel) setModel(savedModel);
      if (savedApiKey) setApiKey(savedApiKey);
      if (Array.isArray(savedModules)) setSelectedModules(savedModules);
    } catch {
      // Ignore parse errors - use defaults
    }
  }, []);

  useEffect(() => {
    const models = PROVIDER_MODELS[provider] || [];
    if (models.length > 0 && !models.includes(model)) {
      setModel(models[0]);
    }
  }, [provider, model]);

  const flow = useRequirementsFlow({ selectedModules, provider, apiKey, model });

  const appendAdditionalStep = (step: string) => {
    const idea = flow.userIdea.trim();
    if (!idea) {
      flow.setUserIdea(step);
      return;
    }
    flow.setUserIdea(`${idea}. ${step}`);
  };

  const renderBuilderShell = (content: ReactNode, rightLabel = 'AI Requirements') => (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <button
            onClick={() => void router.push('/builder/choose-path')}
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Step 3 of 5</span>
                <span className="font-semibold text-slate-900">{rightLabel}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-3/5 rounded-full bg-slate-900" />
              </div>
            </div>

            {content}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );

  // When user confirms requirements, save to localStorage and go to ai-generate
  const handleStartBuilding = () => {
    if (!flow.requirements) return;
    const compiledPrompt = [
      flow.requirements.compiledSummary,
      flow.requirements.coreFeatures.length > 0
        ? `Must-have features:\n${flow.requirements.coreFeatures.map((f) => `- ${f}`).join('\n')}`
        : '',
      `Theme: ${flow.requirements.themeMode}`,
      flow.requirements.techPreferences ? `Tech preferences: ${flow.requirements.techPreferences}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const existing = JSON.parse(localStorage.getItem('builderProject') || '{}');
      localStorage.setItem('builderProject', JSON.stringify({
        ...existing,
        requirements: flow.requirements,
        userPrompt: compiledPrompt || flow.userIdea,
        projectName: flow.requirements.projectName || flow.projectName,
        provider,
        apiKey,
        model,
        aiProvider: provider,
        aiApiKey: apiKey,
        aiModel: model,
        selectedModules,
        modules: selectedModules
      }));
    } catch {
      // Fallback: set minimal state
      localStorage.setItem('builderProject', JSON.stringify({
        requirements: flow.requirements,
        userPrompt: compiledPrompt || flow.userIdea,
        provider,
        model,
        aiProvider: provider,
        aiModel: model,
        aiApiKey: apiKey,
        selectedModules,
        modules: selectedModules
      }));
    }
    router.push('/builder/ai-generate');
  };

  // Render idle phase
  if (flow.phase === 'idle') {
    return renderBuilderShell(
      <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tell us about your app</h1>
          <p className="text-slate-600 mb-6">
            Describe your idea in plain English. The more detail you give, the better the generated code.
          </p>

          <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
              >
                {Object.keys(PROVIDER_MODELS).map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p] || p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
              >
                {(PROVIDER_MODELS[provider] || []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">API Key (Optional)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini'
                  ? 'Optional: add your Gemini API key to avoid platform free-tier quota limits'
                  : `Enter your ${PROVIDER_LABELS[provider] || provider} API key`}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <textarea
            value={flow.userIdea}
            onChange={e => flow.setUserIdea(e.target.value)}
            placeholder="I want to build an online store where people can buy handmade jewellery. Customers should be able to browse products, add to cart, and pay with Stripe..."
            rows={5}
            className="w-full p-4 border-2 border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-slate-500 resize-none text-base bg-white"
          />

          <div className="flex flex-wrap gap-2 mt-3 mb-4">
            {ADDITIONAL_STEPS.map((step) => (
              <button
                key={step}
                onClick={() => appendAdditionalStep(step)}
                className="text-[11px] px-3 py-1.5 bg-white text-slate-600 rounded-lg border border-slate-200 hover:border-slate-400 hover:text-slate-900 transition-all"
              >
                + {step}
              </button>
            ))}
          </div>

          {flow.error && (
            <p className="text-rose-600 text-sm mt-2">{flow.error}</p>
          )}

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={flow.skipToConfirm}
              disabled={flow.userIdea.trim().length < 5}
              className="text-sm text-slate-400 hover:text-slate-600 underline disabled:opacity-30"
            >
              Skip questions and generate directly
            </button>

            <button
              onClick={flow.askQuestions}
              disabled={flow.userIdea.trim().length < 10}
              className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-40"
            >
              Ask me the right questions
            </button>
          </div>
      </div>,
      'AI Requirements'
    );
  }

  // Render questioning (loading) phase
  if (flow.phase === 'questioning') {
    return renderBuilderShell(
      <div className="py-14 text-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-700 text-lg">Thinking about your idea...</p>
          <p className="text-slate-500 text-sm mt-1">Preparing the right questions</p>
        </div>
      </div>,
      'AI Requirements'
    );
  }

  // Render answering phase
  if (flow.phase === 'answering') {
    const readableProjectName = prettyProjectName(flow.projectName, flow.userIdea);
    return renderBuilderShell(
      <div className="w-full max-w-2xl mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6">
            <p className="font-medium">
              Great! Before I build <strong>{readableProjectName}</strong>, I have a few quick questions:
            </p>
          </div>

          <div className="space-y-5">
            {flow.questions.map((q, i) => (
              <div key={q.id}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {i + 1}. {q.question}
                  {q.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  type="text"
                  value={flow.answers[q.id] || ''}
                  onChange={e => flow.setAnswer(q.id, e.target.value)}
                  placeholder={q.hint || ''}
                  className="w-full h-11 px-4 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 transition-colors text-sm"
                />
              </div>
            ))}
          </div>

          {flow.error && (
            <p className="text-red-500 text-sm mt-3">{flow.error}</p>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => { flow.clearError(); /* go back to idle */
                // Reset to idle so user can change their idea
                window.location.reload();
              }}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Change my idea
            </button>

            <button
              onClick={flow.compileRequirements}
              disabled={flow.loading}
              className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-all"
            >
              {flow.loading ? 'Compiling...' : 'Compile my requirements'}
            </button>
          </div>
      </div>,
      'AI Requirements'
    );
  }

  // Render confirming phase
  if (flow.phase === 'confirming' && flow.requirements) {
    const req: RequirementsDocument = flow.requirements;
    return renderBuilderShell(
      <div className="w-full max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Here's what I'll build:</h2>

          {/* Compiled summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5 shadow-sm">
            <p className="text-slate-700 leading-relaxed">{req.compiledSummary}</p>
          </div>

          {/* Feature checklist */}
          {req.coreFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Features</p>
              <div className="grid grid-cols-2 gap-2">
                {req.coreFeatures.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500 font-bold">✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
              Design: {req.designPreference}
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
              Theme: {req.themeMode}
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
              Scale: {req.scale}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={flow.resetToAnswering}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Adjust my answers
            </button>

            <button
              onClick={handleStartBuilding}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-300"
            >
              Looks good - build it
            </button>
          </div>
      </div>,
      'Confirm Requirements'
    );
  }

  // Fallback - should not normally reach here
  return null;
}
