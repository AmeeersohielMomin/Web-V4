import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { buildFullstackPrompt, buildDesignToCodePrompt, buildRefinePrompt } from './ai.prompts';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'ollama';

export interface GenerateRequest {
    provider: AIProvider;
    apiKey?: string;       // User-provided key (BYOK) — optional for free tier
    model?: string;        // Specific model override
    userPrompt: string;
    selectedModules: string[];
    projectName?: string;
}

export interface DesignToCodeRequest {
    provider: AIProvider;
    apiKey?: string;
    model?: string;
    designJSON: object;
    designDescription?: string;
}

export interface RefineRequest {
    provider: AIProvider;
    apiKey?: string;
    model?: string;
    previousCode: string;
    refinementRequest: string;
}

// Default models per provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-flash',   // Most reliable model, works on free-tier API key
    anthropic: 'claude-3-5-sonnet-20241022',
    ollama: 'llama3.2'
};

// Free tier uses platform-managed Gemini key (rate limited)
function getPlatformGeminiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Platform AI service is temporarily unavailable. Please provide your own API key.');
    return key;
}

// Safe model resolver: if using platform key (no BYOK), always use gemini-1.5-flash
// to avoid gemini-2.0-flash's smaller free-tier quota being exhausted.
function safeGeminiModel(requestedModel: string | undefined, usingPlatformKey: boolean): string {
    if (!usingPlatformKey) return requestedModel || DEFAULT_MODELS.gemini;
    // Force stable free-tier model regardless of what frontend sends
    const SAFE_FREE_MODEL = 'gemini-2.5-flash';
    if (!requestedModel) return SAFE_FREE_MODEL;
    // gemini-2.0-flash and gemini-1.5-pro have tight/exhausted free-tier quotas
    if (requestedModel === 'gemini-2.0-flash' || requestedModel === 'gemini-1.5-pro' || requestedModel === 'gemini-1.5-flash') {
        return SAFE_FREE_MODEL;
    }
    return requestedModel;
}

function resolveApiKey(provider: AIProvider, userApiKey?: string): string {
    if (userApiKey && userApiKey.trim()) return userApiKey.trim();
    // Free tier: only platform-managed Gemini is available without user key
    if (provider === 'gemini') return getPlatformGeminiKey();
    throw new Error(`An API key is required for ${provider}. Please provide your own ${provider} API key.`);
}

// ─── OpenAI ──────────────────────────────────────────────────
async function generateWithOpenAI(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void
): Promise<string> {
    const client = new OpenAI({ apiKey });
    const model_name = model || DEFAULT_MODELS.openai;

    if (onChunk) {
        const stream = await client.chat.completions.create({
            model: model_name,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 32768
        });
        let fullResponse = '';
        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullResponse += text;
            if (text) onChunk(text);
        }
        return fullResponse;
    } else {
        const response = await client.chat.completions.create({
            model: model_name,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.3,
            max_tokens: 32768
        });
        return response.choices[0]?.message?.content || '';
    }
}

// ─── Gemini ───────────────────────────────────────────────────
async function generateWithGemini(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void
): Promise<string> {
    const client = new GoogleGenerativeAI(apiKey);
    const generativeModel = client.getGenerativeModel({
        model: model || DEFAULT_MODELS.gemini,
        systemInstruction: systemPrompt,
        generationConfig: { temperature: 0.3, maxOutputTokens: 65536 }
    });

    try {
        if (onChunk) {
            const result = await generativeModel.generateContentStream(userMessage);
            let fullText = '';
            for await (const chunk of result.stream) {
                const text = chunk.text();
                fullText += text;
                if (text) onChunk(text);
            }
            return fullText;
        } else {
            const result = await generativeModel.generateContent(userMessage);
            return result.response.text();
        }
    } catch (err: any) {
        // Parse quota-exceeded errors into human-readable messages
        const msg: string = err?.message || '';
        if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED')) {
            // Extract retry delay if present
            const retryMatch = msg.match(/retry[^\d]*(\d+)s/i);
            const retryIn = retryMatch ? ` Please retry in ${retryMatch[1]}s.` : '';
            throw new Error(
                `Gemini API quota exceeded for model "${model || DEFAULT_MODELS.gemini}".${retryIn} ` +
                `Try switching to a different model (e.g. gemini-1.5-pro) or wait before retrying. ` +
                `You can also switch to OpenAI or Claude with your own API key.`
            );
        }
        throw err;
    }
}

// ─── Anthropic ────────────────────────────────────────────────
async function generateWithAnthropic(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void
): Promise<string> {
    const client = new Anthropic({ apiKey });
    const model_name = model || DEFAULT_MODELS.anthropic;

    if (onChunk) {
        const stream = await client.messages.stream({
            model: model_name,
            max_tokens: 32768,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }]
        });
        let fullText = '';
        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const text = event.delta.text;
                fullText += text;
                onChunk(text);
            }
        }
        return fullText;
    } else {
        const response = await client.messages.create({
            model: model_name,
            max_tokens: 32768,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }]
        });
        const block = response.content[0];
        return block.type === 'text' ? block.text : '';
    }
}

// ─── Ollama (Local) ───────────────────────────────────────────
async function generateWithOllama(
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void
): Promise<string> {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const modelName = model || DEFAULT_MODELS.ollama;

    const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            stream: !!onChunk,
            options: { temperature: 0.3 }
        })
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);

    if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    const text = json.message?.content || '';
                    fullText += text;
                    if (text) onChunk(text);
                } catch { }
            }
        }
        return fullText;
    } else {
        const data: any = await response.json();
        return data.message?.content || '';
    }
}

// ─── Main Router ──────────────────────────────────────────────
export class AIService {
    async generate(
        req: GenerateRequest,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const { provider, userPrompt, selectedModules } = req;
        const isUsingPlatformKey = !req.apiKey?.trim();
        const apiKey = resolveApiKey(provider, req.apiKey);
        // If using platform Gemini key, force gemini-1.5-flash regardless of what
        // the frontend sends (stale localStorage may still contain gemini-2.0-flash)
        const model = provider === 'gemini'
            ? safeGeminiModel(req.model, isUsingPlatformKey)
            : (req.model || DEFAULT_MODELS[provider]);
        const systemPrompt = `You are an expert full-stack developer for the IDEA platform.`;
        const fullPrompt = buildFullstackPrompt(userPrompt, selectedModules);

        switch (provider) {
            case 'openai':
                return generateWithOpenAI(apiKey, model, systemPrompt, fullPrompt, onChunk);
            case 'gemini':
                return generateWithGemini(apiKey, model, systemPrompt, fullPrompt, onChunk);
            case 'anthropic':
                return generateWithAnthropic(apiKey, model, systemPrompt, fullPrompt, onChunk);
            case 'ollama':
                return generateWithOllama(model || DEFAULT_MODELS.ollama, systemPrompt, fullPrompt, onChunk);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    async designToCode(
        req: DesignToCodeRequest,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const { provider, designJSON, designDescription } = req;
        const isUsingPlatformKey = !req.apiKey?.trim();
        const apiKey = resolveApiKey(provider, req.apiKey);
        const model = provider === 'gemini'
            ? safeGeminiModel(req.model, isUsingPlatformKey)
            : (req.model || DEFAULT_MODELS[provider]);
        const systemPrompt = `You are an expert React + Tailwind developer.`;
        const prompt = buildDesignToCodePrompt(designJSON, designDescription);

        switch (provider) {
            case 'openai':
                return generateWithOpenAI(apiKey, model || DEFAULT_MODELS.openai, systemPrompt, prompt, onChunk);
            case 'gemini':
                return generateWithGemini(apiKey, model || DEFAULT_MODELS.gemini, systemPrompt, prompt, onChunk);
            case 'anthropic':
                return generateWithAnthropic(apiKey, model || DEFAULT_MODELS.anthropic, systemPrompt, prompt, onChunk);
            case 'ollama':
                return generateWithOllama(model || DEFAULT_MODELS.ollama, systemPrompt, prompt, onChunk);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    async refine(
        req: RefineRequest,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const { provider, previousCode, refinementRequest } = req;
        const isUsingPlatformKey = !req.apiKey?.trim();
        const apiKey = resolveApiKey(provider, req.apiKey);
        const model = provider === 'gemini'
            ? safeGeminiModel(req.model, isUsingPlatformKey)
            : (req.model || DEFAULT_MODELS[provider]);
        const systemPrompt = `You are an expert full-stack developer refining previously generated code.`;
        const prompt = buildRefinePrompt(previousCode, refinementRequest);

        switch (provider) {
            case 'openai':
                return generateWithOpenAI(apiKey, model || DEFAULT_MODELS.openai, systemPrompt, prompt, onChunk);
            case 'gemini':
                return generateWithGemini(apiKey, model || DEFAULT_MODELS.gemini, systemPrompt, prompt, onChunk);
            case 'anthropic':
                return generateWithAnthropic(apiKey, model || DEFAULT_MODELS.anthropic, systemPrompt, prompt, onChunk);
            case 'ollama':
                return generateWithOllama(model || DEFAULT_MODELS.ollama, systemPrompt, prompt, onChunk);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }
}

export const aiService = new AIService();
