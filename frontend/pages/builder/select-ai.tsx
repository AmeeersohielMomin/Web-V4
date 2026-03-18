import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface AIModel {
  id: string;
  name: string;
  freeTier: boolean;
  speed: 'fast' | 'medium' | 'varies';
  quality: 'good' | 'high' | 'highest';
}

interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  requiresKey: boolean;
  freeTierAvailable: boolean;
  freeTierLimit?: string;
  description: string;
}

const providers: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', freeTier: true, speed: 'fast', quality: 'highest' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', freeTier: false, speed: 'fast', quality: 'high' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', freeTier: true, speed: 'fast', quality: 'good' }
    ],
    requiresKey: false,
    freeTierAvailable: true,
    freeTierLimit: '15 generations/day',
    description: 'Fast and reliable generation with platform-managed free usage.'
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', freeTier: false, speed: 'medium', quality: 'highest' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', freeTier: false, speed: 'medium', quality: 'highest' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', freeTier: false, speed: 'fast', quality: 'good' }
    ],
    requiresKey: true,
    freeTierAvailable: false,
    description: 'Strong coding quality using your own OpenAI API key.'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', freeTier: false, speed: 'medium', quality: 'highest' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', freeTier: false, speed: 'fast', quality: 'good' }
    ],
    requiresKey: true,
    freeTierAvailable: false,
    description: 'Reliable for structured prompts and long-form implementation tasks.'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', freeTier: true, speed: 'varies', quality: 'good' },
      { id: 'codestral', name: 'Codestral', freeTier: true, speed: 'varies', quality: 'good' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', freeTier: true, speed: 'varies', quality: 'good' }
    ],
    requiresKey: false,
    freeTierAvailable: true,
    description: 'Run generation locally with Ollama for private workflows.'
  }
];

export default function SelectAI() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('builderProject');
    if (!saved) {
      void router.push('/builder/new');
      return;
    }

    const data = JSON.parse(saved);
    setProjectName(String(data.projectName || 'untitled-project'));

    if (data.aiProvider) {
      setSelectedProvider(String(data.aiProvider));
    }
    if (data.aiModel) {
      setSelectedModel(String(data.aiModel));
    }
  }, [router]);

  const activeProvider = useMemo(() => {
    return providers.find((provider) => provider.id === selectedProvider) || providers[0];
  }, [selectedProvider]);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find((item) => item.id === providerId);
    if (provider) {
      setSelectedModel(provider.models[0].id);
    }
    setApiKey('');
  };

  const handleNext = () => {
    if (activeProvider.requiresKey && !apiKey.trim()) {
      return;
    }

    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      data.aiProvider = selectedProvider;
      data.aiModel = selectedModel;
      if (apiKey.trim()) {
        data.aiApiKey = apiKey.trim();
      }
      localStorage.setItem('builderProject', JSON.stringify(data));
    }

    void router.push('/builder/ai-generate');
  };

  const canProceed = !activeProvider.requiresKey || apiKey.trim().length > 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
                <span className="font-semibold text-slate-900">Choose AI</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-3/5 rounded-full bg-slate-900" />
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{projectName}</p>
              <h1 className="mt-4 text-3xl font-bold text-slate-900">Choose your AI model</h1>
              <p className="mt-2 text-sm text-slate-600">
                Select a provider and model before generating your app.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => {
                const selected = selectedProvider === provider.id;

                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900">{provider.name}</h2>
                      {provider.freeTierAvailable && (
                        <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Free tier
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{provider.description}</p>
                    {provider.freeTierLimit && (
                      <p className="mt-2 text-xs text-slate-500">Limit: {provider.freeTierLimit}</p>
                    )}
                    {provider.requiresKey && (
                      <p className="mt-2 text-xs text-amber-700">Requires your own API key</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Models</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {activeProvider.models.map((model) => {
                  const selected = selectedModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        selected
                          ? 'border-slate-900 bg-white'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{model.name}</p>
                      <p className="mt-1 text-xs text-slate-600">Speed: {model.speed} | Quality: {model.quality}</p>
                    </button>
                  );
                })}
              </div>

              {activeProvider.requiresKey && (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">API key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="Enter your API key"
                      className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 font-mono text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!canProceed && activeProvider.requiresKey && (
              <p className="mt-3 text-sm text-amber-700">Enter an API key to continue with this provider.</p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Continue
              </button>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
