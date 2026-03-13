import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

interface AIModel {
    id: string;
    name: string;
    freeTier: boolean;
    speed: string;
    quality: string;
}

interface AIProvider {
    id: string;
    name: string;
    logo: string;
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
        logo: '✨',
        models: [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash ⭐', freeTier: true, speed: 'fast', quality: 'highest' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', freeTier: false, speed: 'fast', quality: 'high' },
            { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', freeTier: true, speed: 'fast', quality: 'good' }
        ],
        requiresKey: false,
        freeTierAvailable: true,
        freeTierLimit: '15 gen/day (gemini-2.5-flash)',
        description: "Google's latest AI. Free tier on 2.5 Flash — fast, reliable, no card."
    },
    {
        id: 'openai',
        name: 'OpenAI GPT',
        logo: '🤖',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', freeTier: false, speed: 'medium', quality: 'highest' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', freeTier: false, speed: 'medium', quality: 'highest' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', freeTier: false, speed: 'fast', quality: 'good' }
        ],
        requiresKey: true,
        freeTierAvailable: false,
        description: 'Industry-leading code generation. Bring your own OpenAI API key.'
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        logo: '🧠',
        models: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', freeTier: false, speed: 'medium', quality: 'highest' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', freeTier: false, speed: 'fast', quality: 'good' }
        ],
        requiresKey: true,
        freeTierAvailable: false,
        description: 'Excels at following complex instructions. Bring your Anthropic API key.'
    },
    {
        id: 'ollama',
        name: 'Ollama (Local)',
        logo: '🦙',
        models: [
            { id: 'llama3.2', name: 'Llama 3.2', freeTier: true, speed: 'varies', quality: 'good' },
            { id: 'codestral', name: 'Codestral', freeTier: true, speed: 'varies', quality: 'good' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder', freeTier: true, speed: 'varies', quality: 'good' }
        ],
        requiresKey: false,
        freeTierAvailable: true,
        description: 'Run AI locally. Requires Ollama installed. 100% private — no data leaves your machine.'
    }
];

const qualityColors: Record<string, string> = {
    highest: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    high: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    good: 'text-violet-400 bg-violet-500/10 border-violet-500/20'
};

const speedColors: Record<string, string> = {
    fast: 'text-yellow-400',
    medium: 'text-orange-400',
    varies: 'text-gray-400'
};

export default function SelectAI() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [projectName, setProjectName] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('builderProject');
        if (saved) {
            const data = JSON.parse(saved);
            setProjectName(data.projectName || '');
            // Restore previous AI selection if any
            if (data.aiProvider) setSelectedProvider(data.aiProvider);
            if (data.aiModel) setSelectedModel(data.aiModel);
        } else {
            router.push('/builder/new');
        }
    }, []);

    const activeProvider = providers.find(p => p.id === selectedProvider)!;

    const handleProviderSelect = (providerId: string) => {
        setSelectedProvider(providerId);
        const prov = providers.find(p => p.id === providerId)!;
        setSelectedModel(prov.models[0].id);
        setApiKey('');
    };

    const handleNext = () => {
        if (activeProvider.requiresKey && !apiKey.trim()) return;
        const saved = localStorage.getItem('builderProject');
        if (saved) {
            const data = JSON.parse(saved);
            data.aiProvider = selectedProvider;
            data.aiModel = selectedModel;
            if (apiKey.trim()) data.aiApiKey = apiKey.trim();
            localStorage.setItem('builderProject', JSON.stringify(data));
        }
        router.push('/builder/ai-generate');
    };

    const canProceed = !activeProvider.requiresKey || apiKey.trim().length > 0;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

            {/* Top Nav */}
            <div className="relative border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => router.push('/builder/choose-path')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm font-medium">Back</span>
                    </button>
                    <span className="text-sm font-medium text-white">{projectName}</span>
                </div>
            </div>

            {/* Progress */}
            <div className="relative border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-500">Step 3 of 6</span>
                        <span className="text-sm font-medium text-violet-400">Choose AI Model</span>
                    </div>
                    <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: '50%' }} />
                    </div>
                </div>
            </div>

            <div className="relative max-w-5xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 mb-6 text-2xl">
                        🤖
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Choose your AI</h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Select the AI model that will generate your production-ready code.
                        Free tier available — no credit card required.
                    </p>
                </div>

                {/* Provider Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    {providers.map((provider) => (
                        <motion.button
                            key={provider.id}
                            onClick={() => handleProviderSelect(provider.id)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`relative text-left p-6 rounded-2xl transition-all border ${selectedProvider === provider.id
                                ? 'bg-white/[0.07] border-violet-500 shadow-lg shadow-violet-500/20'
                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20'
                                }`}
                        >
                            {selectedProvider === provider.id && (
                                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}

                            <div className="flex items-start space-x-4">
                                <div className="text-3xl w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 flex-shrink-0">
                                    {provider.logo}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                                        {provider.freeTierAvailable && (
                                            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-medium">
                                                FREE TIER
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mb-3">{provider.description}</p>
                                    {provider.freeTierAvailable && provider.freeTierLimit && (
                                        <p className="text-xs text-emerald-400/70">✓ {provider.freeTierLimit} on platform</p>
                                    )}
                                    {provider.requiresKey && (
                                        <p className="text-xs text-amber-400/70">⚠ Requires your own API key</p>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* Model + Key Config Panel */}
                <motion.div
                    key={selectedProvider}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-8"
                >
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
                        <span className="text-xl">{activeProvider.logo}</span>
                        <span>Configure {activeProvider.name}</span>
                    </h3>

                    {/* Model Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-3">Select Model</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {activeProvider.models.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => setSelectedModel(model.id)}
                                    className={`p-3 rounded-xl text-left transition-all border ${selectedModel === model.id
                                        ? 'bg-violet-500/10 border-violet-500/40'
                                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-white">{model.name}</span>
                                        {model.freeTier && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">FREE</span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs ${speedColors[model.speed] || 'text-gray-400'}`}>
                                            ⚡ {model.speed}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${qualityColors[model.quality] || 'text-gray-400 bg-white/5 border-white/10'}`}>
                                            {model.quality}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key Input (only for providers that require it) */}
                    {activeProvider.requiresKey && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {activeProvider.name} API Key
                                <span className="ml-2 text-xs text-gray-600">(stored in browser only, never sent to our servers)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={`sk-... or your ${activeProvider.name} API key`}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all font-mono text-sm pr-12"
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showKey ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-gray-600">
                                Get your key at{' '}
                                {activeProvider.id === 'openai' && <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">platform.openai.com/api-keys</a>}
                                {activeProvider.id === 'anthropic' && <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">console.anthropic.com</a>}
                            </p>
                        </div>
                    )}

                    {/* Free tier info */}
                    {!activeProvider.requiresKey && (
                        <div className="flex items-start space-x-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <span className="text-emerald-400 text-sm mt-0.5">✓</span>
                            <div>
                                <p className="text-sm text-emerald-400 font-medium">No API key needed</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {activeProvider.id === 'gemini'
                                        ? `Using platform-managed Gemini. ${activeProvider.freeTierLimit} on free tier. Add your own key for unlimited access.`
                                        : 'Models run locally on your machine. Install Ollama at ollama.ai to get started.'}
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => router.push('/builder/choose-path')}
                        className="h-12 px-6 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition-all flex items-center justify-center space-x-2 group"
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!canProceed}
                        className="flex-1 h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2 group"
                    >
                        <span>Generate My App</span>
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>

                {!canProceed && activeProvider.requiresKey && (
                    <p className="text-center text-xs text-amber-400 mt-3">Please enter your {activeProvider.name} API key to continue</p>
                )}
            </div>
        </div>
    );
}
