import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import {
    buildFullstackPrompt,
    buildDesignToCodePrompt,
    buildRefinePrompt,
    buildRequirementsQuestionsPrompt,
    buildRequirementsCompilePrompt
} from './ai.prompts';
import type {
    NonStreamingParams,
    RequirementsQuestion,
    RequirementsAnswer,
    RequirementsDocument,
    QuestionsResponse
} from './ai.types';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'ollama';

export interface GenerateRequest {
    provider: AIProvider;
    apiKey?: string;       // User-provided key (BYOK) — optional for free tier
    model?: string;        // Specific model override
    userPrompt: string;
    selectedModules: string[];
    projectName?: string;
    requirements?: RequirementsDocument;
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
    openai: 'gpt-4.1',
    gemini: 'gemini-2.5-flash',   // Most reliable model, works on free-tier API key
    anthropic: 'claude-sonnet-4-20250514',
    ollama: 'llama3.2'
};

const GEMINI_PLATFORM_FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash'
];

function stripCodeFences(text: string): string {
    return text
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
}

function extractFirstJsonObject(text: string): string {
    const start = text.indexOf('{');
    if (start === -1) return text;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === '{') depth++;
        if (ch === '}') {
            depth--;
            if (depth === 0) {
                return text.slice(start, i + 1);
            }
        }
    }

    // Fallback for truncated JSON: return from first object brace
    return text.slice(start);
}

function parseJsonLenient<T>(raw: string): T {
    const cleaned = extractFirstJsonObject(stripCodeFences(raw))
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .trim();

    return JSON.parse(cleaned) as T;
}

function normalizeQuestionsResponse(parsed: QuestionsResponse): QuestionsResponse {
    const safeQuestions: RequirementsQuestion[] = Array.isArray(parsed.questions)
        ? parsed.questions
            .map((q: any, index: number): RequirementsQuestion => ({
                id: String(q?.id || `q${index + 1}`),
                question: String(q?.question || '').trim(),
                hint: q?.hint ? String(q.hint) : undefined,
                category: ['features', 'design', 'users', 'technical', 'scope'].includes(String(q?.category))
                    ? q.category
                    : 'features',
                required: Boolean(q?.required)
            }))
            .filter((q: RequirementsQuestion) => q.question.length > 0)
        : [];

    return {
        appType: String(parsed.appType || 'other'),
        projectName: String(parsed.projectName || 'my-app').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30),
        questions: safeQuestions.slice(0, 5)
    };
}

function normalizeRequirementsDocument(parsed: RequirementsDocument): RequirementsDocument {
    return {
        originalPrompt: String(parsed.originalPrompt || ''),
        projectName: String(parsed.projectName || 'my-app').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30),
        appType: String(parsed.appType || 'other'),
        targetUsers: String(parsed.targetUsers || 'general users'),
        coreFeatures: Array.isArray(parsed.coreFeatures)
            ? parsed.coreFeatures.map(f => String(f).trim()).filter(Boolean).slice(0, 8)
            : [],
        designPreference: String(parsed.designPreference || 'professional and modern'),
        themeMode: ['light', 'dark', 'hybrid', 'any'].includes(String(parsed.themeMode))
            ? parsed.themeMode
            : 'any',
        scale: ['personal', 'startup', 'enterprise'].includes(String(parsed.scale))
            ? parsed.scale
            : 'personal',
        techPreferences: String(parsed.techPreferences || ''),
        additionalNotes: String(parsed.additionalNotes || ''),
        answers: Array.isArray(parsed.answers)
            ? parsed.answers.map((a: any) => ({
                questionId: String(a?.questionId || ''),
                question: String(a?.question || ''),
                answer: String(a?.answer || '')
            }))
            : [],
        compiledSummary: String(parsed.compiledSummary || '')
    };
}

function buildFallbackRequirementsDocument(params: {
    originalPrompt: string;
    projectName: string;
    answers: RequirementsAnswer[];
    selectedModules: string[];
}): RequirementsDocument {
    const promptText = String(params.originalPrompt || '').trim();
    const answersText = params.answers.map(a => String(a.answer || '')).join(' ');
    const allText = `${promptText} ${answersText}`.toLowerCase();
    const appType = deriveAppType(promptText);

    const suppliedName = String(params.projectName || '').toLowerCase();
    const shouldRegenerateName = !suppliedName || suppliedName.startsWith('build-') || suppliedName.length < 5;
    const inferredNameWords = promptText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w && !['a', 'an', 'build', 'create', 'app', 'web', 'modern', 'for', 'with', 'the', 'and', 'in'].includes(w));
    const inferredName = inferredNameWords.slice(0, 4).join('-').slice(0, 30);
    const normalizedProjectName = (shouldRegenerateName ? inferredName : suppliedName)
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30) || 'my-app';

    const coreFeatures = new Set<string>();
    if (params.selectedModules.includes('auth')) coreFeatures.add('User authentication');
    if (appType === 'e-commerce') coreFeatures.add('Product catalog and category browsing');
    if (allText.includes('search') || allText.includes('filter')) coreFeatures.add('Product search and filtering');
    if (allText.includes('cart')) coreFeatures.add('Shopping cart');
    if (allText.includes('payment') || allText.includes('stripe') || allText.includes('checkout')) coreFeatures.add('Checkout and payment flow');
    if (allText.includes('admin') || allText.includes('dashboard')) coreFeatures.add('Admin dashboard');
    if (allText.includes('inventory')) coreFeatures.add('Inventory management');
    if (allText.includes('order track') || allText.includes('order status')) coreFeatures.add('Order tracking and status updates');
    if (allText.includes('email') || allText.includes('notification')) coreFeatures.add('Email notifications');
    if (coreFeatures.size === 0) coreFeatures.add('Core application workflow');

    const wantsDark = allText.includes('dark');
    const wantsLight = allText.includes('light');
    const themeMode: RequirementsDocument['themeMode'] = wantsDark && !wantsLight
        ? 'dark'
        : wantsLight && !wantsDark
            ? 'light'
            : wantsDark && wantsLight
                ? 'hybrid'
                : 'any';

    const scale: RequirementsDocument['scale'] = allText.includes('enterprise')
        ? 'enterprise'
        : allText.includes('startup') || allText.includes('launch') || allText.includes('mvp')
            ? 'startup'
            : 'personal';

    const designPreference = allText.includes('minimal')
        ? 'clean minimal modern'
        : allText.includes('modern') || allText.includes('professional')
            ? 'professional and modern'
            : 'clean and usable';

    const techBits: string[] = [];
    if (allText.includes('stripe')) techBits.push('Stripe');
    if (allText.includes('postgres')) techBits.push('PostgreSQL');
    if (allText.includes('mysql')) techBits.push('MySQL');
    if (allText.includes('mongodb') || allText.includes('mongo')) techBits.push('MongoDB');
    if (allText.includes('next')) techBits.push('Next.js');
    if (allText.includes('node') || allText.includes('express')) techBits.push('Node/Express');

    const userAnswerHint = params.answers.find(a => /who are|users|customers/i.test(a.question))?.answer?.trim() || '';
    const targetUsers = userAnswerHint || (appType === 'e-commerce' ? 'online retail customers' : 'general users');

    const appTypeLabel = appType === 'other' ? 'web app' : appType;
    const appTypeWithArticle = /^[aeiou]/.test(appTypeLabel) ? `an ${appTypeLabel}` : `a ${appTypeLabel}`;

    return {
        originalPrompt: promptText,
        projectName: normalizedProjectName,
        appType,
        targetUsers,
        coreFeatures: Array.from(coreFeatures).slice(0, 8),
        designPreference,
        themeMode,
        scale,
        techPreferences: techBits.length > 0 ? techBits.join(', ') : '',
        additionalNotes: '',
        answers: params.answers,
        compiledSummary: `You're building ${appTypeWithArticle} called ${normalizedProjectName} focused on ${targetUsers}. The first release will prioritize ${Array.from(coreFeatures).slice(0, 3).join(', ').toLowerCase()} with a ${themeMode} theme direction.`
    };
}

function deriveAppType(userIdea: string): string {
    const text = userIdea.toLowerCase();
    if (text.includes('ecommerce') || text.includes('e-commerce') || text.includes('store') || text.includes('shop')) return 'e-commerce';
    if (text.includes('blog')) return 'blog';
    if (text.includes('dashboard')) return 'dashboard';
    if (text.includes('booking') || text.includes('appointment')) return 'booking';
    if (text.includes('marketplace')) return 'marketplace';
    if (text.includes('analytics')) return 'analytics';
    if (text.includes('portfolio')) return 'portfolio';
    if (text.includes('saas')) return 'saas';
    return 'other';
}

function buildJsonRepairPrompt(rawModelOutput: string, schemaDescription: string): string {
    return `You are a strict JSON repair engine.

Your task: convert the following model output into valid JSON matching this schema:
${schemaDescription}

Rules:
1. Return ONLY valid JSON.
2. No markdown, no code fences, no comments.
3. If fields are missing, infer sensible defaults.
4. Preserve user intent from the original text.

Original model output:
"""
${rawModelOutput}
"""`;
}

function isQuotaOrRateLimitError(err: unknown): boolean {
    const msg = String((err as any)?.message || err || '').toLowerCase();
    return (
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('too many requests') ||
        msg.includes('quota exceeded') ||
        msg.includes('resource_exhausted') ||
        msg.includes('service unavailable') ||
        msg.includes('currently experiencing high demand') ||
        msg.includes('model is overloaded') ||
        msg.includes('rate limit') ||
        msg.includes('retry in')
    );
}

// Free tier uses platform-managed Gemini key (rate limited)
function getPlatformGeminiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Platform AI service is temporarily unavailable. Please provide your own API key.');
    return key;
}

// Safe model resolver: if using platform key (no BYOK), allow only curated
// platform-supported models to reduce unsupported/paid-only model failures.
function safeGeminiModel(requestedModel: string | undefined, usingPlatformKey: boolean): string {
    if (!usingPlatformKey) return requestedModel || DEFAULT_MODELS.gemini;

    // Respect user-selected free-tier compatible Gemini models for platform key usage.
    if (requestedModel && GEMINI_PLATFORM_FALLBACK_MODELS.includes(requestedModel)) {
        return requestedModel;
    }

    return DEFAULT_MODELS.gemini;
}

function getGeminiFallbackChain(primaryModel: string, usingPlatformKey: boolean): string[] {
    if (!usingPlatformKey) return [primaryModel];
    const chain = [primaryModel, ...GEMINI_PLATFORM_FALLBACK_MODELS];
    return Array.from(new Set(chain));
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
    onChunk?: (chunk: string) => void,
    temperature: number = 0.3
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
            temperature,
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
            temperature,
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
    onChunk?: (chunk: string) => void,
    temperature: number = 0.3
): Promise<string> {
    const client = new GoogleGenerativeAI(apiKey);
    const generativeModel = client.getGenerativeModel({
        model: model || DEFAULT_MODELS.gemini,
        systemInstruction: systemPrompt,
        generationConfig: { temperature, maxOutputTokens: 65536 }
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
                `Try switching to a different model (e.g. gemini-2.5-pro with your own key) or wait before retrying. ` +
                `You can also switch to OpenAI or Claude with your own API key.`
            );
        }
        throw err;
    }
}

async function generateWithGeminiWithFallback(
    apiKey: string,
    primaryModel: string,
    systemPrompt: string,
    userMessage: string,
    onChunk: ((chunk: string) => void) | undefined,
    temperature: number,
    usingPlatformKey: boolean
): Promise<string> {
    const modelsToTry = getGeminiFallbackChain(primaryModel, usingPlatformKey);
    let lastError: unknown;
    let sawQuotaError = false;

    for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
            return await generateWithGemini(apiKey, model, systemPrompt, userMessage, onChunk, temperature);
        } catch (err) {
            lastError = err;
            if (isQuotaOrRateLimitError(err)) {
                sawQuotaError = true;
                continue;
            }
            throw err;
        }
    }

    if (sawQuotaError) {
        throw new Error(
            `Gemini free-tier models are currently unavailable or quota-limited (${modelsToTry.join(', ')}). ` +
            `Please retry shortly, switch Gemini model/provider, or use your own API key.`
        );
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(
            `Gemini API quota exceeded across available free-tier models (${modelsToTry.join(', ')}). ` +
            `Please retry shortly, switch Gemini model, or use your own OpenAI/Claude API key.`
        );
}

// ─── Anthropic ────────────────────────────────────────────────
async function generateWithAnthropic(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    temperature: number = 0.3
): Promise<string> {
    const client = new Anthropic({ apiKey });
    const model_name = model || DEFAULT_MODELS.anthropic;

    if (onChunk) {
        const stream = await client.messages.stream({
            model: model_name,
            max_tokens: 32768,
            system: systemPrompt,
            temperature,
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
            temperature,
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
    onChunk?: (chunk: string) => void,
    temperature: number = 0.3
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
            options: { temperature }
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
        // If using platform Gemini key, restrict to curated free-tier-compatible models.
        const model = provider === 'gemini'
            ? safeGeminiModel(req.model, isUsingPlatformKey)
            : (req.model || DEFAULT_MODELS[provider]);
        const generationSeed = randomUUID().slice(0, 8);
        const systemPrompt = `You are an expert full-stack developer for the IDEA platform.`;
        const fullPrompt = buildFullstackPrompt(userPrompt, selectedModules, generationSeed, req.requirements);
        const generationTemperature = 0.38;

        switch (provider) {
            case 'openai':
                return generateWithOpenAI(apiKey, model, systemPrompt, fullPrompt, onChunk, generationTemperature);
            case 'gemini':
                return generateWithGeminiWithFallback(
                    apiKey,
                    model,
                    systemPrompt,
                    fullPrompt,
                    onChunk,
                    generationTemperature,
                    isUsingPlatformKey
                );
            case 'anthropic':
                return generateWithAnthropic(apiKey, model, systemPrompt, fullPrompt, onChunk, generationTemperature);
            case 'ollama':
                return generateWithOllama(model || DEFAULT_MODELS.ollama, systemPrompt, fullPrompt, onChunk, generationTemperature);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    /**
     * Single non-streaming completion call used for requirements gathering.
     * Returns a plain string (the model's full response).
     * Uses the same API key resolution and model defaults as the streaming path.
     */
    private async generateNonStreaming(params: NonStreamingParams): Promise<string> {
        const provider = params.provider as AIProvider;
        const isUsingPlatformKey = !params.apiKey?.trim();
        const resolvedKey = resolveApiKey(provider, params.apiKey);
        const resolvedModel = provider === 'gemini'
            ? safeGeminiModel(params.model, isUsingPlatformKey)
            : (params.model || DEFAULT_MODELS[provider]);

        switch (provider) {
            case 'gemini':
                if (isUsingPlatformKey) {
                    const fallbackChain = getGeminiFallbackChain(resolvedModel, true);
                    let lastError: unknown = null;

                    for (const candidateModel of fallbackChain) {
                        try {
                            return await this.callGeminiNonStreaming(
                                resolvedKey,
                                candidateModel,
                                params.prompt,
                                params.maxTokens,
                                params.temperature
                            );
                        } catch (err) {
                            lastError = err;
                            if (!isQuotaOrRateLimitError(err)) {
                                throw err;
                            }
                            console.warn(`[requirements] Gemini model ${candidateModel} unavailable, trying fallback model.`);
                        }
                    }

                    throw lastError || new Error('Gemini non-streaming request failed on all fallback models.');
                }

                return this.callGeminiNonStreaming(resolvedKey, resolvedModel, params.prompt, params.maxTokens, params.temperature);
            case 'openai':
                return this.callOpenAiNonStreaming(resolvedKey, resolvedModel, params.prompt, params.maxTokens, params.temperature);
            case 'anthropic':
                return this.callAnthropicNonStreaming(resolvedKey, resolvedModel, params.prompt, params.maxTokens, params.temperature);
            case 'ollama':
                return this.callOllamaNonStreaming(params.prompt, resolvedModel, params.maxTokens, params.temperature);
            default:
                throw new Error(`Unknown provider: ${params.provider}`);
        }
    }

    async generateRequirementsQuestions(params: {
        userIdea: string;
        selectedModules: string[];
        provider: string;
        apiKey?: string;
        model?: string;
    }): Promise<QuestionsResponse> {

        const prompt = buildRequirementsQuestionsPrompt(
            params.userIdea,
            params.selectedModules
        );

        let rawResponse = '';
        try {
            rawResponse = await this.generateNonStreaming({
                provider: params.provider,
                apiKey: params.apiKey,
                model: params.model,
                prompt,
                maxTokens: 600,
                temperature: 0.3
            });
        } catch (err) {
            if (isQuotaOrRateLimitError(err)) {
                console.warn('[requirements] AI question generation failed due to provider quota/rate limit.');
                throw new Error('AI question generation is temporarily unavailable due to provider limits. Please retry or use your own API key.');
            }
            throw err;
        }

        let parsed: QuestionsResponse;
        try {
            parsed = normalizeQuestionsResponse(parseJsonLenient<QuestionsResponse>(rawResponse));
        } catch {
            try {
                const repairPrompt = buildJsonRepairPrompt(
                    rawResponse,
                    '{ "appType": "string", "projectName": "string", "questions": [{ "id": "q1", "question": "string", "hint": "string", "category": "features|design|users|technical|scope", "required": true }] }'
                );

                const repaired = await this.generateNonStreaming({
                    provider: params.provider,
                    apiKey: params.apiKey,
                    model: params.model,
                    prompt: repairPrompt,
                    maxTokens: 650,
                    temperature: 0
                });

                parsed = normalizeQuestionsResponse(parseJsonLenient<QuestionsResponse>(repaired));
            } catch {
                console.warn('[requirements] AI question generation failed after JSON parse and repair attempts.');
                throw new Error('AI returned malformed requirements questions. Please retry with a clearer prompt or a different model.');
            }
        }

        // Validate minimum structure
        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            throw new Error('AI returned no questions. Please try again.');
        }

        return parsed;
    }

    async compileRequirementsDocument(params: {
        originalPrompt: string;
        projectName: string;
        answers: RequirementsAnswer[];
        selectedModules: string[];
        provider: string;
        apiKey?: string;
    }): Promise<RequirementsDocument> {

        const prompt = buildRequirementsCompilePrompt(
            params.originalPrompt,
            params.projectName,
            params.answers,
            params.selectedModules
        );

        const fallbackRequirements = buildFallbackRequirementsDocument({
            originalPrompt: params.originalPrompt,
            projectName: params.projectName,
            answers: params.answers,
            selectedModules: params.selectedModules
        });

        let rawResponse = '';
        try {
            rawResponse = await this.generateNonStreaming({
                provider: params.provider,
                apiKey: params.apiKey,
                prompt,
                maxTokens: 800,
                temperature: 0.3
            });
        } catch (err) {
            // Free-tier quota/rate limits should not break the UX flow.
            // Return deterministic requirements document instead of bubbling a 500.
            if (isQuotaOrRateLimitError(err)) {
                return fallbackRequirements;
            }
            throw err;
        }

        let parsed: RequirementsDocument;
        try {
            parsed = normalizeRequirementsDocument(parseJsonLenient<RequirementsDocument>(rawResponse));
        } catch {
            try {
                const repairPrompt = buildJsonRepairPrompt(
                    rawResponse,
                    '{ "originalPrompt": "string", "projectName": "string", "appType": "string", "targetUsers": "string", "coreFeatures": ["string"], "designPreference": "string", "themeMode": "light|dark|hybrid|any", "scale": "personal|startup|enterprise", "techPreferences": "string", "additionalNotes": "string", "answers": [{"questionId":"string","question":"string","answer":"string"}], "compiledSummary": "string" }'
                );

                const repaired = await this.generateNonStreaming({
                    provider: params.provider,
                    apiKey: params.apiKey,
                    model: undefined,
                    prompt: repairPrompt,
                    maxTokens: 950,
                    temperature: 0
                });

                parsed = normalizeRequirementsDocument(parseJsonLenient<RequirementsDocument>(repaired));
            } catch {
                parsed = fallbackRequirements;
            }
        }

        // Fill incomplete model output with deterministic fallback values.
        if (!parsed.compiledSummary.trim()) parsed.compiledSummary = fallbackRequirements.compiledSummary;
        if (!Array.isArray(parsed.coreFeatures) || parsed.coreFeatures.length === 0) {
            parsed.coreFeatures = fallbackRequirements.coreFeatures;
        }
        if (!parsed.projectName) parsed.projectName = fallbackRequirements.projectName;
        if (!parsed.originalPrompt) parsed.originalPrompt = params.originalPrompt;
        // Always preserve the exact user-submitted interview answers.
        // Model output may omit or rewrite answers during JSON repair.
        parsed.answers = params.answers;

        return parsed;
    }

    private async callGeminiNonStreaming(
        apiKey: string,
        model: string,
        prompt: string,
        maxTokens: number,
        temperature: number
    ): Promise<string> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({
            model,
            generationConfig: { maxOutputTokens: maxTokens, temperature }
        });
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
    }

    private async callOpenAiNonStreaming(
        apiKey: string,
        model: string,
        prompt: string,
        maxTokens: number,
        temperature: number
    ): Promise<string> {
        const client = new OpenAI({ apiKey });
        const response = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature
        });
        return response.choices[0]?.message?.content || '';
    }

    private async callAnthropicNonStreaming(
        apiKey: string,
        model: string,
        prompt: string,
        maxTokens: number,
        temperature: number
    ): Promise<string> {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: prompt }]
        });
        const block = message.content[0];
        return block.type === 'text' ? block.text : '';
    }

    private async callOllamaNonStreaming(
        prompt: string,
        model: string,
        maxTokens: number,
        temperature: number
    ): Promise<string> {
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: { num_predict: maxTokens, temperature }
            })
        });
        if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
        const data = await response.json() as { response: string };
        return data.response;
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
