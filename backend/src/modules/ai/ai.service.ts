import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { jsonrepair } from 'jsonrepair';
import {
    buildFullstackPrompt,
    buildDesignToCodePrompt,
    buildRefinePrompt,
    buildRequirementsQuestionsPrompt,
    buildRequirementsCompilePrompt,
} from './ai.prompts';
import type {
    NonStreamingParams,
    RequirementsQuestion,
    RequirementsAnswer,
    RequirementsDocument,
    QuestionsResponse,
} from './ai.types';
import { track } from '../../utils/telemetry';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'nvidia' | 'github';

export interface GenerateRequest {
    provider: AIProvider;
    apiKey?: string;
    model?: string;
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
    previousCode: Array<{ path: string; content: string }>;
    refinementRequest: string;
}

export interface ProjectChatRequest {
    provider: AIProvider;
    apiKey?: string;
    model?: string;
    message: string;
    projectContext?: {
        projectName?: string;
        description?: string;
        fileCount?: number;
        keyFiles?: string[];
        modules?: string[];
    };
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
    openai: 'gpt-4.1',
    gemini: 'gemini-2.5-flash',
    anthropic: 'claude-sonnet-4-20250514',
    ollama: 'llama3.2',
    nvidia: 'nvidia/nemotron-3-super-120b-a12b',
    github: 'openai/gpt-4.1',
};

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const GITHUB_MODELS_BASE_URL = 'https://models.github.ai/inference';
const GITHUB_MODELS_API_VERSION = process.env.GITHUB_MODELS_API_VERSION || '2026-03-10';

const GEMINI_PLATFORM_FALLBACK_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
];

// FIX: Default timeout for provider calls to prevent hung connections
const DEFAULT_GENERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_NONSTREAMING_TIMEOUT_MS = 60 * 1000;    // 1 minute
const V2_PLANNER_NONSTREAMING_TIMEOUT_MS = 60 * 1000;
const V2_MODULE_NONSTREAMING_TIMEOUT_MS = 150 * 1000;
const V2_SHARED_NONSTREAMING_TIMEOUT_MS = 210 * 1000;
const OPENAI_SAFE_MAX_COMPLETION_TOKENS = 16384;
const GITHUB_SAFE_MAX_COMPLETION_TOKENS = 16384;

// ─────────────────────────────────────────────────────────────────────────────
// TIMEOUT WRAPPER
// FIX: Prevents Ollama / NVIDIA / slow providers from hanging SSE connections.
// ─────────────────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`[${label}] Request timed out after ${ms / 1000}s. The model may be overloaded or unavailable.`));
        }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON PARSING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function stripCodeFences(text: string): string {
    return text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
}

function extractFirstJsonObject(text: string): string {
    const start = text.indexOf('{');
    if (start === -1) return text;

    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) { escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
    }
    return text.slice(start);
}

function parseJsonLenient<T>(raw: string): T {
    const cleaned = extractFirstJsonObject(stripCodeFences(raw))
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .trim();

    const attempts: string[] = [];
    if (cleaned) attempts.push(cleaned);

    try {
        const repaired = jsonrepair(cleaned);
        if (repaired && repaired !== cleaned) attempts.push(repaired);
    } catch { }

    const fallback = stripCodeFences(String(raw || '')).trim();
    if (fallback && !attempts.includes(fallback)) {
        attempts.push(fallback);
        try {
            const fr = jsonrepair(fallback);
            if (fr && !attempts.includes(fr)) attempts.push(fr);
        } catch { }
    }

    let lastError: unknown = null;
    for (const candidate of attempts) {
        try { return JSON.parse(candidate) as T; }
        catch (err) { lastError = err; }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to parse model JSON output.');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE NORMALISERS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeQuestionsResponse(parsed: QuestionsResponse): QuestionsResponse {
    const safeQuestions: RequirementsQuestion[] = Array.isArray(parsed.questions)
        ? parsed.questions
            .map((q: any, i: number): RequirementsQuestion => ({
                id: String(q?.id || `q${i + 1}`),
                question: String(q?.question || '').trim(),
                hint: q?.hint ? String(q.hint) : undefined,
                category: ['features', 'design', 'users', 'technical', 'scope'].includes(String(q?.category))
                    ? q.category : 'features',
                required: Boolean(q?.required),
            }))
            .filter((q: RequirementsQuestion) => q.question.length > 0)
        : [];

    return {
        appType: String(parsed.appType || 'other'),
        projectName: String(parsed.projectName || 'my-app').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30),
        questions: safeQuestions.slice(0, 5),
    };
}

function normalizeRequirementsDocument(parsed: RequirementsDocument): RequirementsDocument {
    const rawSummary = String(parsed.compiledSummary || '').trim();
    const fullScopeSummary = rawSummary
        .replace(/\b(first\s+release|mvp\s+launch|mvp|phase\s*1|phase\s*one|beta\s+launch)\b/gi, 'full production build')
        .replace(/\s+/g, ' ')
        .trim();

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
            ? (String(parsed.themeMode) === 'any' ? 'light' : parsed.themeMode)
            : 'light',
        scale: ['personal', 'startup', 'enterprise'].includes(String(parsed.scale)) ? parsed.scale : 'personal',
        techPreferences: String(parsed.techPreferences || ''),
        additionalNotes: String(parsed.additionalNotes || ''),
        answers: Array.isArray(parsed.answers)
            ? parsed.answers.map((a: any) => ({
                questionId: String(a?.questionId || ''),
                question: String(a?.question || ''),
                answer: String(a?.answer || ''),
            }))
            : [],
        compiledSummary: fullScopeSummary,
    };
}

function parseQuestionsResponseFromRaw(raw: string): QuestionsResponse {
    const parsed = parseJsonLenient<any>(raw);
    const candidate = parsed?.questions ? parsed
        : parsed?.data?.questions ? parsed.data
            : parsed?.result?.questions ? parsed.result
                : parsed;
    return normalizeQuestionsResponse(candidate as QuestionsResponse);
}

function parseRequirementsDocumentFromRaw(raw: string): RequirementsDocument {
    const parsed = parseJsonLenient<any>(raw);
    const candidate = parsed?.compiledSummary || parsed?.coreFeatures ? parsed
        : parsed?.requirements ? parsed.requirements
            : parsed?.data?.requirements ? parsed.data.requirements
                : parsed?.result?.requirements ? parsed.result.requirements
                    : parsed;
    return normalizeRequirementsDocument(candidate as RequirementsDocument);
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK REQUIREMENTS BUILDER
// FIX: Handles any app type — not just the 8 hardcoded ones.
// ─────────────────────────────────────────────────────────────────────────────

function deriveAppType(userIdea: string): string {
    const text = userIdea.toLowerCase();
    const typeChecks: [RegExp, string][] = [
        [/(asset|estate|provenance|collection|vault|valuation)/, 'asset-management'],
        [/(ecommerce|e-commerce|store|shop|cart|checkout)/, 'e-commerce'],
        [/(lms|course|lesson|enrollment|e-learning|learning management)/, 'lms'],
        [/(healthcare|clinic|hospital|patient|doctor|medical)/, 'healthcare'],
        [/(fleet|vehicle|driver|truck|logistics|transport)/, 'fleet'],
        [/(hr|human resource|employee|payroll|attendance)/, 'hr'],
        [/(job board|recruitment|candidate|resume|hiring)/, 'job-board'],
        [/(event|conference|concert|ticket|venue|attendee)/, 'events'],
        [/(real estate|property|listing|agent|rent|house)/, 'real-estate'],
        [/(blog|cms|article|publish|editorial|news)/, 'blog'],
        [/(task|kanban|sprint|agile|project management|todo)/, 'task-management'],
        [/(booking|appointment|schedule|reservation|slot|calendar)/, 'booking'],
        [/(inventory|stock|warehouse|supply|sku|supplier)/, 'inventory'],
        [/(finance|expense|budget|transaction|accounting|invoice)/, 'finance'],
        [/(restaurant|food|menu|table|kitchen|meal|dining)/, 'restaurant'],
        [/(saas|workspace|team|organization|subscription|multi-tenant)/, 'saas'],
        [/(social|feed|follow|like|community|network)/, 'social'],
        [/(dashboard|analytics|metrics|reporting)/, 'dashboard'],
        [/(booking|appointment)/, 'booking'],
        [/(marketplace)/, 'marketplace'],
        [/(portfolio)/, 'portfolio'],
    ];

    for (const [pattern, type] of typeChecks) {
        if (pattern.test(text)) return type;
    }
    return 'custom';
}

/**
 * FIX: Derives meaningful core features for ANY app type using keyword extraction.
 * No longer returns the useless 'Core application workflow' for unknown domains.
 */
function inferCoreFeaturesFromText(text: string, appType: string): string[] {
    const features = new Set<string>();
    const lower = text.toLowerCase();

    // Auth always included if mentioned
    if (/\b(auth|login|signup|register|account)\b/.test(lower)) {
        features.add('User authentication and account management');
    }

    // Payment keywords
    if (/stripe/.test(lower)) features.add('Stripe payment checkout and order processing');
    else if (/razorpay/.test(lower)) features.add('Razorpay payment gateway integration');
    else if (/paypal/.test(lower)) features.add('PayPal payment checkout');
    else if (/(payment|checkout|pay|billing)/.test(lower)) features.add('Payment processing and checkout flow');

    // Communication keywords
    if (/resend/.test(lower)) features.add('Transactional emails via Resend');
    else if (/sendgrid/.test(lower)) features.add('Transactional emails via SendGrid');
    else if (/(email|notification|alert|smtp)/.test(lower)) features.add('Email notifications for key events');
    if (/sms|twilio|whatsapp/.test(lower)) features.add('SMS notifications via Twilio');
    if (/(push notification|firebase|fcm)/.test(lower)) features.add('Push notifications via Firebase');

    // File/media keywords
    if (/cloudinary/.test(lower)) features.add('Image and file uploads via Cloudinary');
    else if (/s3|aws/.test(lower)) features.add('File uploads to AWS S3');
    else if (/(upload|image|photo|file|attachment)/.test(lower)) features.add('File and image upload support');

    // Auth keywords
    if (/(google|github|oauth|social login|sso)/.test(lower)) features.add('Social login via Google/GitHub OAuth');
    if (/(2fa|two-factor|otp)/.test(lower)) features.add('Two-factor authentication');

    // Real-time keywords
    if (/(real.?time|chat|socket|live|websocket)/.test(lower)) features.add('Real-time features via WebSockets');

    // Search / filter
    if (/(search|filter|query|find)/.test(lower)) features.add('Search and filtering capabilities');

    // Admin
    if (/(admin|management panel|back.?office)/.test(lower)) features.add('Admin dashboard and management panel');

    // Role-based access
    if (/(role|permission|rbac|access control)/.test(lower)) features.add('Role-based access control');

    // Analytics
    if (/(analytics|report|stats|metrics|insight)/.test(lower)) features.add('Analytics and reporting dashboard');

    // App-type specific features
    const appFeatureMap: Record<string, string[]> = {
        'e-commerce': ['Product catalog and category management', 'Shopping cart and checkout', 'Order tracking and management'],
        'lms': ['Course and lesson creation', 'Student enrollment and progress tracking', 'Quizzes and assessments'],
        'healthcare': ['Patient registration and records', 'Appointment scheduling', 'Doctor availability management'],
        'fleet': ['Vehicle registration and tracking', 'Driver management', 'Trip logging and fuel tracking'],
        'hr': ['Employee profiles and onboarding', 'Attendance and leave management', 'Payroll processing'],
        'job-board': ['Job listing creation', 'Candidate applications', 'Interview scheduling'],
        'events': ['Event creation and management', 'Ticket sales and QR codes', 'Attendee check-in'],
        'real-estate': ['Property listings with photos', 'Viewing appointment scheduling', 'Agent and client management'],
        'booking': ['Service catalog and availability', 'Appointment booking flow', 'Booking status management'],
        'inventory': ['Product and SKU management', 'Stock movement tracking', 'Supplier management'],
        'finance': ['Account and transaction management', 'Budget tracking', 'Income vs expense reporting'],
        'restaurant': ['Menu and category management', 'Order management by table', 'Kitchen status tracking'],
        'saas': ['Workspace and team management', 'Member invitations', 'Activity audit log'],
        'social': ['Post creation and feed', 'Follow/following system', 'Likes and comments'],
        'task-management': ['Project and task creation', 'Kanban board with status tracking', 'Task assignment and deadlines'],
        'blog': ['Article creation and publishing', 'Category and tag management', 'Comment moderation'],
        'asset-management': ['Asset registry and catalog', 'Provenance and ownership tracking', 'Valuation and insurance management'],
    };

    const appSpecific = appFeatureMap[appType] || [];
    for (const f of appSpecific) {
        if (features.size < 8) features.add(f);
    }

    // If we still have fewer than 3 features, add generic ones based on the text
    if (features.size < 3) {
        // Extract nouns from the text and construct features
        const words = lower.split(/\W+/).filter(w => w.length > 4);
        const uniqueWords = [...new Set(words)].slice(0, 3);
        for (const w of uniqueWords) {
            if (features.size >= 6) break;
            features.add(`${w.charAt(0).toUpperCase() + w.slice(1)} management and tracking`);
        }
    }

    return Array.from(features).slice(0, 8);
}

function buildFallbackRequirementsDocument(params: {
    originalPrompt: string;
    projectName: string;
    answers: RequirementsAnswer[];
    selectedModules: string[];
}): RequirementsDocument {
    const promptText = String(params.originalPrompt || '').trim();
    const answersText = params.answers.map(a => String(a.answer || '')).join(' ');
    const allText = `${promptText} ${answersText}`;
    const appType = deriveAppType(promptText);

    const suppliedName = String(params.projectName || '').toLowerCase();
    const shouldRegenerateName = !suppliedName || suppliedName.startsWith('build-') || suppliedName.length < 5;
    const inferredNameWords = promptText.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w && !['a', 'an', 'build', 'create', 'app', 'web', 'modern', 'for', 'with', 'the', 'and', 'in', 'make'].includes(w));
    const inferredName = inferredNameWords.slice(0, 4).join('-').slice(0, 30);
    const normalizedProjectName = (shouldRegenerateName ? inferredName : suppliedName)
        .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'my-app';

    // FIX: Use the proper feature inference for any app type
    const coreFeatures = inferCoreFeaturesFromText(allText, appType);

    const wantsDark = /\bdark\b/.test(allText.toLowerCase());
    const wantsLight = /\blight\b/.test(allText.toLowerCase());
    const themeMode: RequirementsDocument['themeMode'] = wantsDark && !wantsLight ? 'dark'
        : wantsLight && !wantsDark ? 'light'
            : wantsDark && wantsLight ? 'hybrid'
                : 'light';

    const scale: RequirementsDocument['scale'] = /enterprise/.test(allText.toLowerCase()) ? 'enterprise'
        : /(startup|launch|mvp)/.test(allText.toLowerCase()) ? 'startup'
            : 'personal';

    const designPreference = /minimal/.test(allText.toLowerCase()) ? 'clean minimal modern'
        : /(modern|professional)/.test(allText.toLowerCase()) ? 'professional and modern'
            : 'clean and usable';

    const techBits: string[] = [];
    if (/stripe/.test(allText.toLowerCase())) techBits.push('Stripe');
    if (/razorpay/.test(allText.toLowerCase())) techBits.push('Razorpay');
    if (/postgres/.test(allText.toLowerCase())) techBits.push('PostgreSQL');
    if (/mongodb/.test(allText.toLowerCase())) techBits.push('MongoDB');
    if (/redis/.test(allText.toLowerCase())) techBits.push('Redis');
    if (/cloudinary/.test(allText.toLowerCase())) techBits.push('Cloudinary');
    if (/s3|aws/.test(allText.toLowerCase())) techBits.push('AWS S3');
    if (/(nodemailer|smtp)/.test(allText.toLowerCase())) techBits.push('Nodemailer');
    if (/resend/.test(allText.toLowerCase())) techBits.push('Resend');
    if (/oauth|google|github/.test(allText.toLowerCase())) techBits.push('OAuth');
    if (/(socket|websocket|real.?time)/.test(allText.toLowerCase())) techBits.push('Socket.io');
    if (/twilio/.test(allText.toLowerCase())) techBits.push('Twilio');

    const userAnswerHint = params.answers.find(a => /who are|users|customers/i.test(a.question))?.answer?.trim() || '';
    const targetUsers = userAnswerHint || 'general users';

    const appTypeLabel = appType.replace(/-/g, ' ');
    const appTypeWithArticle = /^[aeiou]/.test(appTypeLabel) ? `an ${appTypeLabel}` : `a ${appTypeLabel}`;

    return {
        originalPrompt: promptText,
        projectName: normalizedProjectName,
        appType,
        targetUsers,
        coreFeatures,
        designPreference,
        themeMode,
        scale,
        techPreferences: techBits.length > 0 ? techBits.join(', ') : 'Node.js + Next.js + MongoDB',
        additionalNotes: '',
        answers: params.answers,
        compiledSummary: `You're building ${appTypeWithArticle} platform focused on ${targetUsers}. This full production build includes ${coreFeatures.slice(0, 3).join(', ').toLowerCase()} with complete ${appTypeLabel} workflows and a ${themeMode} theme from day one.`,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN REBALANCER
// ─────────────────────────────────────────────────────────────────────────────

function isAuthOnlyIntent(originalPrompt: string, selectedModules: string[]): boolean {
    const text = String(originalPrompt || '').toLowerCase();
    const explicitAuthOnly = /\bauth(?:entication)?\s+only\b/.test(text) || /\bonly\s+auth(?:entication)?\b/.test(text);
    const modules = (selectedModules || []).map(m => String(m || '').toLowerCase()).filter(Boolean);
    return explicitAuthOnly || (modules.length === 1 && modules[0] === 'auth' && explicitAuthOnly);
}

function isAuthHeavyFeature(feature: string): boolean {
    return /(auth|login|signup|password|sso|2fa|webauthn|invite|rbac|role-based access|audit|identity|kyc|session)/.test(String(feature || '').toLowerCase());
}

function rebalanceRequirementsForDomain(
    parsed: RequirementsDocument,
    params: { originalPrompt: string; selectedModules: string[] },
): RequirementsDocument {
    if (isAuthOnlyIntent(params.originalPrompt, params.selectedModules)) return parsed;

    const currentFeatures = Array.isArray(parsed.coreFeatures) ? parsed.coreFeatures : [];
    const nonAuthCount = currentFeatures.filter(f => !isAuthHeavyFeature(f)).length;

    let mergedFeatures = [...currentFeatures];
    if (nonAuthCount < 3) {
        const appType = deriveAppType(params.originalPrompt);
        const inferred = inferCoreFeaturesFromText(params.originalPrompt, appType);
        mergedFeatures = Array.from(new Set([...inferred, ...currentFeatures])).slice(0, 8);
    }

    let summary = String(parsed.compiledSummary || '');
    if (/authentication module/i.test(summary) && mergedFeatures.length > 0) {
        const appType = parsed.appType || 'web application';
        const domainLine = mergedFeatures.filter(f => !isAuthHeavyFeature(f)).slice(0, 3).join(', ').toLowerCase();
        summary = `You're building a production-grade ${appType} platform focused on ${domainLine}. It includes complete domain workflows with enterprise security and premium UX from day one.`;
    }

    return { ...parsed, coreFeatures: mergedFeatures, compiledSummary: summary };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function isQuotaOrRateLimitError(err: unknown): boolean {
    const msg = String((err as any)?.message || err || '').toLowerCase();
    return (
        msg.includes('429') || msg.includes('503') || msg.includes('too many requests') ||
        msg.includes('quota exceeded') || msg.includes('resource_exhausted') ||
        msg.includes('service unavailable') || msg.includes('rate limit') || msg.includes('retry in')
    );
}

function isUnknownModelError(err: unknown): boolean {
    const msg = String((err as any)?.message || err || '').toLowerCase();
    const status = Number((err as any)?.status || (err as any)?.statusCode || 0);
    return (
        status === 404 ||
        msg.includes('unknown model') ||
        msg.includes('model not found') ||
        msg.includes('invalid model') ||
        msg.includes('does not exist')
    );
}

function isTimeoutError(err: unknown): boolean {
    const msg = String((err as any)?.message || err || '').toLowerCase();
    return msg.includes('timed out') || msg.includes('timeout');
}

function getGitHubModelFallbackChain(primaryModel?: string): string[] {
    const primary = normalizeModelForProvider('github', primaryModel) || DEFAULT_MODELS.github;

    // Ordered fallback chain — strongest reliable first, timeout-prone last.
    // gpt-4o-mini is intentionally LAST because it is the model that times out.
    const FALLBACK_CHAIN: string[] = [
        'openai/gpt-4.1',               // Tier 1: strongest reliable, 1M context
        'openai/gpt-4.1-mini',          // Tier 1: fast, same family
        'azureml-deepseek/DeepSeek-V3-0324',  // Tier 2: best open-weight for code
        'meta/llama-4-maverick',         // Tier 2: 256K context, strong instructions
        'openai/gpt-4o',                 // Tier 3: proven fallback
        'openai/gpt-4o-mini',            // Tier 3 LAST: slow endpoint, timeout-prone
    ];

    // Put the user's requested model first, then append the rest of the chain
    // deduplicating so the requested model is not tried twice.
    const chain = [primary, ...FALLBACK_CHAIN.filter(m => m !== primary)];
    return Array.from(new Set(chain.filter(Boolean)));
}

function getPlatformGeminiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Platform AI service is temporarily unavailable. Please provide your own API key.');
    return key;
}

function safeGeminiModel(requestedModel: string | undefined, usingPlatformKey: boolean): string {
    if (!usingPlatformKey) return requestedModel || DEFAULT_MODELS.gemini;
    if (requestedModel && GEMINI_PLATFORM_FALLBACK_MODELS.includes(requestedModel)) return requestedModel;
    return DEFAULT_MODELS.gemini;
}

function getGeminiFallbackChain(primaryModel: string, usingPlatformKey: boolean): string[] {
    if (!usingPlatformKey) return [primaryModel];
    return Array.from(new Set([primaryModel, ...GEMINI_PLATFORM_FALLBACK_MODELS]));
}

function resolveApiKey(provider: AIProvider, userApiKey?: string): string {
    if (userApiKey && userApiKey.trim()) return userApiKey.trim();
    if (provider === 'gemini') return getPlatformGeminiKey();
    if (provider === 'ollama') return '';
    if (provider === 'nvidia') {
        const key = process.env.NVIDIA_API_KEY;
        if (key) return key;
        throw new Error('An API key is required for NVIDIA NIM.');
    }
    if (provider === 'github') {
        const key = process.env.GITHUB_MODELS_API_KEY || process.env.GITHUB_TOKEN;
        if (key) return key;
        throw new Error('A GitHub token is required for GitHub Models.');
    }
    throw new Error(`An API key is required for ${provider}.`);
}

function createGitHubModelsClient(apiKey: string): OpenAI {
    return new OpenAI({
        apiKey,
        baseURL: GITHUB_MODELS_BASE_URL,
        defaultHeaders: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': GITHUB_MODELS_API_VERSION,
        },
    });
}

function normalizeModelForProvider(provider: AIProvider, model?: string): string | undefined {
    if (!model) return model;
    const trimmed = model.trim().replace(/^\/+/, '');
    if (!trimmed) return undefined;
    if (provider === 'openai') {
        const normalized = trimmed.replace(/^openai\//i, '');
        if (/^(gemini|claude|meta\/|nvidia\/|qwen|llama)/i.test(normalized)) return DEFAULT_MODELS.openai;
        return normalized;
    }
    if (provider === 'github') {
        if (/^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(trimmed)) return trimmed;
        if (/^gpt-/i.test(trimmed)) return `openai/${trimmed}`;
        if (/^llama-4-maverick$/i.test(trimmed)) return 'meta/llama-4-maverick';
        if (/^o4-mini$/i.test(trimmed)) return 'openai/o4-mini';
        if (/^o3$/i.test(trimmed)) return 'openai/o3';
        if (/^gpt-5-mini$/i.test(trimmed)) return 'openai/gpt-5-mini';
        if (/^deepseek-v3/i.test(trimmed)) return 'azureml-deepseek/DeepSeek-V3-0324';
        if (/^deepseek-r1-0528/i.test(trimmed)) return 'azureml-deepseek/DeepSeek-R1-0528';
        if (/^deepseek-r1$/i.test(trimmed)) return 'azureml-deepseek/DeepSeek-R1';
        if (/^codestral/i.test(trimmed)) return 'Codestral-25.01';
        if (/^mistral-large/i.test(trimmed)) return 'Mistral-Large';
        if (/^phi-4$/i.test(trimmed)) return 'Phi-4';
        return DEFAULT_MODELS.github;
    }
    return trimmed;
}

function toModuleLabel(name: string): string {
    return name
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function buildDeterministicPlannerFallbackPlan(
    userDescription: string,
    requirements: any,
    seed: string,
    colorPalette: { primary: string; secondary: string; accent: string },
    route: { mode: string; pack: string | null; confidence: number; reasons: string[] },
): any {
    const text = String(userDescription || '').toLowerCase();
    const appType = String(requirements?.appType || deriveAppType(userDescription) || 'other');

    let moduleNames: string[];
    if (/\bnotes?\b/.test(text)) {
        moduleNames = ['notes', 'tags', 'shared-notes'];
    } else if (/\b(task|project|kanban|todo)\b/.test(text)) {
        moduleNames = ['tasks', 'projects', 'comments'];
    } else if (/\b(order|product|cart|checkout|store|shop)\b/.test(text)) {
        moduleNames = ['products', 'categories', 'orders'];
    } else if (/\b(book|appointment|schedule|reservation)\b/.test(text)) {
        moduleNames = ['services', 'bookings', 'availability'];
    } else if (Array.isArray(requirements?.coreFeatures) && requirements.coreFeatures.length > 0) {
        moduleNames = requirements.coreFeatures
            .map((feature: any) => String(feature || '').toLowerCase())
            .map((feature: string) => feature.replace(/[^a-z0-9\s-]/g, ' ').trim())
            .map((feature: string) => feature.split(/\s+/).find((part) => part.length > 3) || '')
            .map((part: string) => part.replace(/[^a-z0-9-]/g, '-'))
            .filter(Boolean)
            .slice(0, 3);

        if (moduleNames.length < 2) {
            moduleNames = ['records', 'categories', 'analytics'];
        }
    } else {
        moduleNames = ['records', 'categories', 'analytics'];
    }

    const uniqueModuleNames = Array.from(new Set(moduleNames.map((name) => String(name || '').toLowerCase()))).slice(0, 4);
    const modules = uniqueModuleNames.map((name) => ({
        name,
        label: toModuleLabel(name),
        fields: ['name', 'description', 'status', 'createdAt'],
    }));

    return {
        projectName: String(requirements?.projectName || 'my-app'),
        appType,
        modules,
        colorPalette,
        _seed: seed,
        _domainRouting: {
            mode: route.mode,
            pack: route.pack,
            confidence: route.confidence,
            reasons: route.reasons,
        },
        _plannerFallback: true,
    };
}

function buildJsonRepairPrompt(rawModelOutput: string, schemaDescription: string): string {
    return `You are a strict JSON repair engine.

Convert this model output into valid JSON matching the schema:
${schemaDescription}

Rules:
1. Return ONLY valid JSON.
2. No markdown, no code fences, no comments.
3. If fields are missing, infer sensible defaults.
4. Preserve user intent from the original text.

Original output:
"""
${rawModelOutput}
"""`;
}

function buildCompactModulePrompt(moduleSpec: { name: string; label?: string; fields?: string[] }, plan: any): string {
    const moduleName = String(moduleSpec?.name || 'module').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const moduleLabel = String(moduleSpec?.label || moduleName);
    const fields = Array.isArray(moduleSpec?.fields) ? moduleSpec.fields.slice(0, 8).join(', ') : 'name, description, status';
    const projectName = String(plan?.projectName || 'my-app');

    return [
        'Generate ONLY JSON. No markdown.',
        `Project: ${projectName}`,
        `Module: ${moduleName}`,
        `Label: ${moduleLabel}`,
        `Fields: ${fields}`,
        'Create concise but working files for Express + TypeScript + Mongoose + Next.js Pages Router.',
        'Required files (exactly 9):',
        `- backend/src/modules/${moduleName}/${moduleName}.schema.ts`,
        `- backend/src/modules/${moduleName}/${moduleName}.model.ts`,
        `- backend/src/modules/${moduleName}/${moduleName}.service.ts`,
        `- backend/src/modules/${moduleName}/${moduleName}.controller.ts`,
        `- backend/src/modules/${moduleName}/${moduleName}.routes.ts`,
        `- frontend/src/services/${moduleName}.service.ts`,
        `- frontend/pages/${moduleName}/index.tsx`,
        `- frontend/pages/${moduleName}/new.tsx`,
        `- frontend/pages/${moduleName}/[id]/edit.tsx`,
        'Rules:',
        '- No placeholder literals like xxx or your-...-here.',
        '- Do not use browser alert().',
        '- Keep code short and compile-safe.',
        'Output shape: {"files":[{"path":"...","content":"...","language":"typescript|css|text"}]}',
    ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Improved refine context compression
// Critical shared files always included; scoring biased toward requested areas.
// ─────────────────────────────────────────────────────────────────────────────

function compressRefineContextFiles(
    previousCode: Array<{ path: string; content: string }>,
    refinementRequest: string,
): Array<{ path: string; content: string }> {
    const files = Array.isArray(previousCode) ? previousCode : [];
    const requestText = String(refinementRequest || '').toLowerCase();
    const requestTerms = requestText.split(/[^a-z0-9]+/i).filter(term => term.length > 2);

    // Critical files always included regardless of score
    const criticalPaths = new Set([
        'backend/src/server.ts',
        'frontend/pages/_app.tsx',
        'frontend/src/contexts/authcontext.tsx',
        'backend/src/middleware/auth.ts',
        'frontend/pages/dashboard.tsx',
        'frontend/src/components/navbar.tsx',
    ]);

    const scorePath = (path: string): number => {
        const p = String(path || '').toLowerCase().replace(/\\/g, '/');
        if (criticalPaths.has(p)) return 999; // always include critical files
        let score = 0;
        if (p.includes('frontend/')) score += 3;
        if (p.includes('backend/')) score += 2;
        if (p.includes('/pages/')) score += 3;
        if (p.includes('service')) score += 2;
        if (p.includes('controller') || p.includes('routes') || p.includes('schema') || p.includes('model')) score += 1;
        for (const term of requestTerms) {
            if (p.includes(term)) score += 6; // heavy bias toward requested module
        }
        return score;
    };

    const sorted = [...files].sort((a, b) => scorePath(b.path) - scorePath(a.path));
    const maxFiles = 20;
    const maxCharsPerFile = 1800;
    const maxTotalChars = 28000;

    let totalChars = 0;
    const result: Array<{ path: string; content: string }> = [];

    for (const file of sorted.slice(0, maxFiles)) {
        if (totalChars >= maxTotalChars) break;
        const content = String(file.content || '');
        const remaining = Math.max(0, maxTotalChars - totalChars);
        const cap = Math.min(maxCharsPerFile, remaining);
        const reduced = content.length > cap
            ? `${content.slice(0, cap)}\n// ...truncated for token-safe refine context`
            : content;
        totalChars += reduced.length;
        result.push({ path: String(file.path || ''), content: reduced });
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

async function generateWithOpenAI(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    temperature = 0.3,
): Promise<string> {
    const client = new OpenAI({ apiKey });
    const modelName = normalizeModelForProvider('openai', model) || DEFAULT_MODELS.openai;

    const timeoutMs = onChunk ? DEFAULT_GENERATION_TIMEOUT_MS : DEFAULT_NONSTREAMING_TIMEOUT_MS;

    if (onChunk) {
        return withTimeout(
            (async () => {
                const stream = await client.chat.completions.create({
                    model: modelName,
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                    stream: true, temperature, max_tokens: OPENAI_SAFE_MAX_COMPLETION_TOKENS,
                });
                let full = '';
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    full += text;
                    if (text) onChunk(text);
                }
                return full;
            })(),
            timeoutMs,
            `OpenAI/${modelName}`,
        );
    }

    return withTimeout(
        (async () => {
            const response = await client.chat.completions.create({
                model: modelName,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                temperature, max_tokens: OPENAI_SAFE_MAX_COMPLETION_TOKENS,
            });
            return response.choices[0]?.message?.content || '';
        })(),
        timeoutMs,
        `OpenAI/${modelName}`,
    );
}

async function generateWithGemini(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    temperature = 0.3,
): Promise<string> {
    const client = new GoogleGenerativeAI(apiKey);
    const generativeModel = client.getGenerativeModel({
        model: model || DEFAULT_MODELS.gemini,
        systemInstruction: systemPrompt,
        generationConfig: { temperature, maxOutputTokens: 65536 },
    });

    const timeoutMs = onChunk ? DEFAULT_GENERATION_TIMEOUT_MS : DEFAULT_NONSTREAMING_TIMEOUT_MS;

    try {
        if (onChunk) {
            return await withTimeout(
                (async () => {
                    const result = await generativeModel.generateContentStream(userMessage);
                    let fullText = '';
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        fullText += text;
                        if (text) onChunk(text);
                    }
                    return fullText;
                })(),
                timeoutMs,
                `Gemini/${model}`,
            );
        }
        return await withTimeout(
            generativeModel.generateContent(userMessage).then(r => r.response.text()),
            timeoutMs,
            `Gemini/${model}`,
        );
    } catch (err: any) {
        const msg: string = err?.message || '';
        if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED')) {
            const retryMatch = msg.match(/retry[^\d]*(\d+)s/i);
            const retryIn = retryMatch ? ` Retry in ${retryMatch[1]}s.` : '';
            throw new Error(
                `Gemini quota exceeded for "${model}".${retryIn} ` +
                `Switch to a different model or provide your own API key.`,
            );
        }
        throw err;
    }
}

// FIX: Deduplicated — single function handles fallback for both streaming and non-streaming
async function generateWithGeminiWithFallback(
    apiKey: string,
    primaryModel: string,
    systemPrompt: string,
    userMessage: string,
    onChunk: ((chunk: string) => void) | undefined,
    temperature: number,
    usingPlatformKey: boolean,
): Promise<string> {
    const modelsToTry = getGeminiFallbackChain(primaryModel, usingPlatformKey);
    let lastError: unknown;
    let sawQuotaError = false;

    for (const model of modelsToTry) {
        try {
            return await generateWithGemini(apiKey, model, systemPrompt, userMessage, onChunk, temperature);
        } catch (err) {
            lastError = err;
            if (isQuotaOrRateLimitError(err)) { sawQuotaError = true; continue; }
            throw err;
        }
    }

    if (sawQuotaError) {
        throw new Error(
            `Gemini free-tier models are quota-limited (${modelsToTry.join(', ')}). ` +
            `Please retry shortly or use your own API key.`,
        );
    }
    throw lastError instanceof Error ? lastError : new Error('Gemini request failed.');
}

async function generateWithAnthropic(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    temperature = 0.3,
): Promise<string> {
    const client = new Anthropic({ apiKey });
    const modelName = model || DEFAULT_MODELS.anthropic;
    const timeoutMs = onChunk ? DEFAULT_GENERATION_TIMEOUT_MS : DEFAULT_NONSTREAMING_TIMEOUT_MS;

    if (onChunk) {
        return withTimeout(
            (async () => {
                const stream = await client.messages.stream({
                    model: modelName, max_tokens: 32768, system: systemPrompt, temperature,
                    messages: [{ role: 'user', content: userMessage }],
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
            })(),
            timeoutMs,
            `Anthropic/${modelName}`,
        );
    }

    return withTimeout(
        (async () => {
            const response = await client.messages.create({
                model: modelName, max_tokens: 32768, system: systemPrompt, temperature,
                messages: [{ role: 'user', content: userMessage }],
            });
            const block = response.content[0];
            return block.type === 'text' ? block.text : '';
        })(),
        timeoutMs,
        `Anthropic/${modelName}`,
    );
}

async function generateWithOllama(
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    temperature = 0.3,
): Promise<string> {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const modelName = model || DEFAULT_MODELS.ollama;
    const timeoutMs = onChunk ? DEFAULT_GENERATION_TIMEOUT_MS : DEFAULT_NONSTREAMING_TIMEOUT_MS;

    return withTimeout(
        (async () => {
            const response = await fetch(`${ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                    stream: !!onChunk,
                    options: { temperature },
                }),
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
            }

            const data: any = await response.json();
            return data.message?.content || '';
        })(),
        timeoutMs,
        `Ollama/${modelName}`,
    );
}

async function generateWithNvidia(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    temperature = 0.3,
): Promise<string> {
    const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
    const modelName = model || DEFAULT_MODELS.nvidia;
    const timeoutMs = onChunk ? DEFAULT_GENERATION_TIMEOUT_MS : DEFAULT_NONSTREAMING_TIMEOUT_MS;

    if (onChunk) {
        return withTimeout(
            (async () => {
                const stream = await client.chat.completions.create({
                    model: modelName,
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                    stream: true, temperature, top_p: 0.7, max_tokens: 65536,
                });
                let full = '';
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    full += text;
                    if (text) onChunk(text);
                }
                return full;
            })(),
            timeoutMs,
            `NVIDIA/${modelName}`,
        );
    }

    return withTimeout(
        (async () => {
            const response = await client.chat.completions.create({
                model: modelName,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                temperature, top_p: 0.7, max_tokens: 65536,
            });
            return response.choices[0]?.message?.content || '';
        })(),
        timeoutMs,
        `NVIDIA/${modelName}`,
    );
}

async function generateWithGitHubModels(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    temperature = 0.3,
): Promise<string> {
    const client = createGitHubModelsClient(apiKey);
    const timeoutMs = onChunk ? DEFAULT_GENERATION_TIMEOUT_MS : DEFAULT_NONSTREAMING_TIMEOUT_MS;
    const modelsToTry = getGitHubModelFallbackChain(model);
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
        try {
            if (onChunk) {
                return await withTimeout(
                    (async () => {
                        const stream = await client.chat.completions.create({
                            model: modelName,
                            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                            stream: true, temperature, max_tokens: GITHUB_SAFE_MAX_COMPLETION_TOKENS,
                        });
                        let full = '';
                        for await (const chunk of stream) {
                            const text = chunk.choices[0]?.delta?.content || '';
                            full += text;
                            if (text) onChunk(text);
                        }
                        return full;
                    })(),
                    timeoutMs,
                    `GitHub/${modelName}`,
                );
            }

            return await withTimeout(
                (async () => {
                    const response = await client.chat.completions.create({
                        model: modelName,
                        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                        temperature, max_tokens: GITHUB_SAFE_MAX_COMPLETION_TOKENS,
                    });
                    return response.choices[0]?.message?.content || '';
                })(),
                timeoutMs,
                `GitHub/${modelName}`,
            );
        } catch (err) {
            lastError = err;
            if (isUnknownModelError(err)) {
                continue;
            }
            throw err;
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('GitHub Models request failed.');
}

// ─────────────────────────────────────────────────────────────────────────────
// AI SERVICE
// ─────────────────────────────────────────────────────────────────────────────

function getModuleTimeoutMs(provider: string): number {
    const p = String(provider || '').toLowerCase();
    if (p === 'github' || p === 'nvidia') return 90_000;
    if (p === 'gemini' || p === 'openai') return 120_000;
    if (p === 'anthropic') return 120_000;
    return V2_MODULE_NONSTREAMING_TIMEOUT_MS;
}

function getSharedTimeoutMs(provider: string): number {
    const p = String(provider || '').toLowerCase();
    if (p === 'github' || p === 'nvidia') return 120_000;
    return V2_SHARED_NONSTREAMING_TIMEOUT_MS;
}

export class AIService {
    async generate(req: GenerateRequest, onChunk?: (chunk: string) => void): Promise<string> {
        const { provider, userPrompt, selectedModules } = req;
        const isUsingPlatformKey = !req.apiKey?.trim();
        const apiKey = resolveApiKey(provider, req.apiKey);
        const model = provider === 'gemini'
            ? safeGeminiModel(req.model, isUsingPlatformKey)
            : (req.model || DEFAULT_MODELS[provider]);
        const generationSeed = randomUUID().slice(0, 8);
        const systemPrompt = `You are an expert full-stack developer for the IDEA platform.`;
        const fullPrompt = buildFullstackPrompt(userPrompt, selectedModules, generationSeed, req.requirements);
        const temperature = 0.38;

        switch (provider) {
            case 'openai': return generateWithOpenAI(apiKey, model, systemPrompt, fullPrompt, onChunk, temperature);
            case 'gemini': return generateWithGeminiWithFallback(apiKey, model, systemPrompt, fullPrompt, onChunk, temperature, isUsingPlatformKey);
            case 'anthropic': return generateWithAnthropic(apiKey, model, systemPrompt, fullPrompt, onChunk, temperature);
            case 'ollama': return generateWithOllama(model || DEFAULT_MODELS.ollama, systemPrompt, fullPrompt, onChunk, temperature);
            case 'nvidia': return generateWithNvidia(apiKey, model || DEFAULT_MODELS.nvidia, systemPrompt, fullPrompt, onChunk, temperature);
            case 'github': return generateWithGitHubModels(apiKey, model || DEFAULT_MODELS.github, systemPrompt, fullPrompt, onChunk, temperature);
            default: throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    // Two-phase generation: planner
    async planApplication(
        userDescription: string,
        requirements: any,
        provider: string,
        model?: string,
        apiKey?: string
    ): Promise<any> {
        const { buildPlannerPrompt, getColorPaletteFromSeed } = await import('./ai.prompts');
        const { routeDomainPack } = await import('./ai.domainRouter');
        const seed = randomUUID().slice(0, 8);
        const prompt = buildPlannerPrompt(userDescription, requirements);
        const colorPalette = getColorPaletteFromSeed(seed);
        const route = routeDomainPack(userDescription);

        let raw = '';
        try {
            raw = await this.generateNonStreaming({
                provider,
                model,
                apiKey,
                prompt,
                maxTokens: 1800,
                temperature: 0.15,
                forceJson: true,
                timeoutMs: V2_PLANNER_NONSTREAMING_TIMEOUT_MS,
            });
        } catch (plannerErr) {
            if (isTimeoutError(plannerErr) || isQuotaOrRateLimitError(plannerErr)) {
                return buildDeterministicPlannerFallbackPlan(userDescription, requirements, seed, colorPalette, route);
            }
            throw plannerErr;
        }

        let plan: any;
        try {
            plan = parseJsonLenient<any>(raw);
        } catch {
            try {
                const repaired = await this.generateNonStreaming({
                    provider,
                    model,
                    apiKey,
                    prompt: buildJsonRepairPrompt(raw, '{ "projectName":"string","appType":"string","modules":[{"name":"string","label":"string","fields":["string"]}] }'),
                    maxTokens: 2200,
                    temperature: 0,
                    forceJson: true,
                    timeoutMs: V2_PLANNER_NONSTREAMING_TIMEOUT_MS,
                });
                plan = parseJsonLenient<any>(repaired);
            } catch (repairErr) {
                if (isTimeoutError(repairErr) || isQuotaOrRateLimitError(repairErr)) {
                    return buildDeterministicPlannerFallbackPlan(userDescription, requirements, seed, colorPalette, route);
                }
                throw repairErr;
            }
        }

        const modules = Array.isArray(plan?.modules) ? plan.modules : [];

        return {
            projectName: String(plan?.projectName || requirements?.projectName || 'my-app'),
            appType: String(plan?.appType || requirements?.appType || 'other'),
            modules: modules
                .map((m: any, i: number) => ({
                    name: String(m?.name || `module-${i + 1}`).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    label: String(m?.label || m?.name || `Module ${i + 1}`),
                    fields: Array.isArray(m?.fields) ? m.fields.map((f: any) => String(f)).filter(Boolean).slice(0, 12) : [],
                }))
                .slice(0, 8),
            colorPalette: getColorPaletteFromSeed(seed),
            _seed: seed,
            _domainRouting: {
                mode: route.mode,
                pack: route.pack,
                confidence: route.confidence,
                reasons: route.reasons,
            },
        };
    }

    // Two-phase generation: per module
    async generateModuleFiles(
        moduleSpec: { name: string; label?: string; fields?: string[] },
        plan: any,
        provider: string,
        model?: string,
        apiKey?: string
    ): Promise<Array<{ path: string; content: string; language: string }>> {
        const normalizeFiles = (input: any): Array<{ path: string; content: string; language: string }> => {
            const files = Array.isArray(input?.files) ? input.files : [];
            return files
                .filter((f: any) => f && typeof f.path === 'string')
                .map((f: any) => ({
                    path: String(f.path),
                    content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content ?? '', null, 2),
                    language: typeof f.language === 'string' ? f.language : 'text',
                }));
        };

        const { buildModulePrompt } = await import('./ai.prompts');
        const normalizedProvider = String(provider || '').toLowerCase();
        const normalizedModel = String(model || '').toLowerCase();
        const useCompactPrompt = normalizedProvider === 'github' && normalizedModel.includes('gpt-4o-mini');
        const prompt = useCompactPrompt
            ? buildCompactModulePrompt(moduleSpec, plan)
            : buildModulePrompt(moduleSpec, plan, String(plan?._seed || 'default'));
        let raw = '';
        let moduleLastError: unknown = null;
        const moduleTokenBudgets = useCompactPrompt ? [3200, 2400, 1800] : [7000, 5000, 3500];
        for (const maxTokens of moduleTokenBudgets) {
            try {
                raw = await this.generateNonStreaming({
                    provider,
                    model,
                    apiKey,
                    prompt,
                    maxTokens,
                    temperature: 0.2,
                    forceJson: true,
                    timeoutMs: getModuleTimeoutMs(provider),
                });
                if (String(raw || '').trim().length > 0) break;
            } catch (err: any) {
                moduleLastError = err;
                const errMsg = String(err?.message || '').toLowerCase();
                const isTokenLimitError =
                    errMsg.includes('context_length_exceeded') ||
                    errMsg.includes('maximum context') ||
                    errMsg.includes('reduce the length') ||
                    errMsg.includes('too many tokens') ||
                    errMsg.includes('input too long');

                if (!isTokenLimitError) {
                    break;
                }
            }
        }

        if (!String(raw || '').trim()) {
            const moduleName = moduleSpec?.name || 'unknown';
            throw new Error(`[ai.service] Module generation call failed for ${moduleName}: ${(moduleLastError as any)?.message || 'unknown error'}`);
        }

        try {
            const parsed = parseJsonLenient<any>(raw);
            const normalized = normalizeFiles(parsed);
            if (normalized.length > 0) return normalized;
        } catch { }

        try {
            const repairedRaw = await this.generateNonStreaming({
                provider,
                model,
                apiKey,
                prompt: buildJsonRepairPrompt(
                    raw,
                    '{ "module": "string", "files": [{ "path": "string", "content": "string", "language": "string" }] }',
                ),
                maxTokens: 9000,
                temperature: 0,
                forceJson: true,
                timeoutMs: V2_MODULE_NONSTREAMING_TIMEOUT_MS,
            });
            const repairedParsed = parseJsonLenient<any>(repairedRaw);
            const repairedNormalized = normalizeFiles(repairedParsed);
            if (repairedNormalized.length > 0) return repairedNormalized;
        } catch { }

        throw new Error(`Module generation produced no files for module "${moduleSpec?.name || 'unknown'}"`);
    }

    // Two-phase generation: shared project files
    async generateSharedFiles(
        plan: any,
        provider: string,
        model?: string,
        apiKey?: string
    ): Promise<Array<{ path: string; content: string; language: string }>> {
        const normalizeFiles = (input: any): Array<{ path: string; content: string; language: string }> => {
            const files = Array.isArray(input?.files) ? input.files : [];
            return files
                .filter((f: any) => f && typeof f.path === 'string')
                .map((f: any) => ({
                    path: String(f.path),
                    content: typeof f.content === 'string' ? f.content : JSON.stringify(f.content ?? '', null, 2),
                    language: typeof f.language === 'string' ? f.language : 'text',
                }));
        };

        const { buildSharedFilesPrompt } = await import('./ai.prompts');
        const prompt = buildSharedFilesPrompt(plan, String(plan?._seed || 'default'));
        let raw = '';
        const sharedTokenBudgets = [9000, 6500, 4500];
        let sharedCallLastError: unknown = null;
        for (const maxTokens of sharedTokenBudgets) {
            try {
                raw = await this.generateNonStreaming({
                    provider,
                    model,
                    apiKey,
                    prompt,
                    maxTokens,
                    temperature: 0.2,
                    forceJson: true,
                    timeoutMs: getSharedTimeoutMs(provider),
                });
                if (String(raw || '').trim().length > 0) break;
            } catch (err: any) {
                sharedCallLastError = err;
                const errMsg = String(err?.message || '').toLowerCase();
                const isTokenLimitError =
                    errMsg.includes('context_length_exceeded') ||
                    errMsg.includes('maximum context') ||
                    errMsg.includes('reduce the length') ||
                    errMsg.includes('too many tokens') ||
                    errMsg.includes('input too long');

                if (!isTokenLimitError) {
                    break;
                }
            }
        }

        if (!String(raw || '').trim()) {
            throw new Error(`[ai.service] Shared file generation call failed: ${(sharedCallLastError as any)?.message || 'unknown error'}`);
        }

        try {
            const parsed = parseJsonLenient<any>(raw);
            const normalized = normalizeFiles(parsed);
            if (normalized.length > 0) return normalized;
        } catch { }

        try {
            const repairedRaw = await this.generateNonStreaming({
                provider,
                model,
                apiKey,
                prompt: buildJsonRepairPrompt(
                    raw,
                    '{ "shared": true, "files": [{ "path": "string", "content": "string", "language": "string" }] }',
                ),
                maxTokens: 6000,
                temperature: 0,
                forceJson: true,
                timeoutMs: V2_SHARED_NONSTREAMING_TIMEOUT_MS,
            });
            const repairedParsed = parseJsonLenient<any>(repairedRaw);
            const repairedNormalized = normalizeFiles(repairedParsed);
            if (repairedNormalized.length > 0) return repairedNormalized;
        } catch { }

        throw new Error('Shared file generation produced no files');
    }

    // FIX: Unified non-streaming method — no copy-paste fallback logic per caller
    private async generateNonStreaming(params: NonStreamingParams): Promise<string> {
        const provider = params.provider as AIProvider;
        const isUsingPlatformKey = !params.apiKey?.trim();
        const resolvedKey = resolveApiKey(provider, params.apiKey);
        const resolvedModel = provider === 'gemini'
            ? safeGeminiModel(params.model, isUsingPlatformKey)
            : (normalizeModelForProvider(provider, params.model) || DEFAULT_MODELS[provider]);
        const systemPrompt = `You are an expert full-stack developer for the IDEA platform. Return only valid JSON when asked.`;

        // Gemini gets the full fallback chain; other providers call once with timeout
        if (provider === 'gemini') {
            return generateWithGeminiWithFallback(
                resolvedKey, resolvedModel, systemPrompt, params.prompt,
                undefined, params.temperature ?? 0.2, isUsingPlatformKey,
            );
        }

        switch (provider) {
            case 'openai':
                return this.callOpenAiNonStreaming(
                    resolvedKey,
                    resolvedModel,
                    params.prompt,
                    params.maxTokens,
                    params.temperature,
                    Boolean(params.forceJson),
                    params.timeoutMs,
                );
            case 'anthropic':
                return generateWithAnthropic(resolvedKey, resolvedModel, systemPrompt, params.prompt, undefined, params.temperature ?? 0.2);
            case 'ollama':
                return generateWithOllama(resolvedModel, systemPrompt, params.prompt, undefined, params.temperature ?? 0.2);
            case 'nvidia':
                return generateWithNvidia(resolvedKey, resolvedModel, systemPrompt, params.prompt, undefined, params.temperature ?? 0.2);
            case 'github':
                return this.callGitHubModelsNonStreaming(
                    resolvedKey,
                    resolvedModel,
                    params.prompt,
                    params.maxTokens,
                    params.temperature,
                    Boolean(params.forceJson),
                    params.timeoutMs,
                );
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
        const prompt = buildRequirementsQuestionsPrompt(params.userIdea, params.selectedModules);

        let rawResponse = '';
        try {
            rawResponse = await this.generateNonStreaming({
                provider: params.provider,
                apiKey: params.apiKey,
                model: params.model,
                prompt,
                maxTokens: 1400,
                temperature: 0.2,
                forceJson: true,
            });
        } catch (err) {
            if (isQuotaOrRateLimitError(err)) {
                track('requirements.question_gen.quota_exceeded', { provider: params.provider });
                throw new Error('AI question generation is temporarily unavailable due to provider limits. Please retry or use your own API key.');
            }
            throw err;
        }

        let parsed: QuestionsResponse;
        try {
            parsed = parseQuestionsResponseFromRaw(rawResponse);
        } catch {
            track('requirements.question_gen.parse_failed', { provider: params.provider });
            try {
                const repairPrompt = buildJsonRepairPrompt(
                    rawResponse,
                    '{ "appType": "string", "projectName": "string", "questions": [{ "id": "q1", "question": "string", "hint": "string", "category": "features|design|users|technical|scope", "required": true }] }',
                );
                const repaired = await this.generateNonStreaming({
                    provider: params.provider, apiKey: params.apiKey, model: params.model,
                    prompt: repairPrompt, maxTokens: 1000, temperature: 0, forceJson: true,
                });
                parsed = parseQuestionsResponseFromRaw(repaired);
                track('requirements.question_gen.repaired', { provider: params.provider });
            } catch {
                const slugBase = params.userIdea.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-')
                    .replace(/-+/g, '-').slice(0, 30).replace(/^-|-$/g, '') || 'my-app';
                parsed = {
                    appType: 'other',
                    projectName: slugBase,
                    questions: [
                        { id: 'qf1', question: 'What visual style fits your brand — minimal, bold, or enterprise?', hint: 'e.g. minimal and clean, light theme', category: 'design', required: true },
                        { id: 'qf2', question: 'Is this a personal project or a real business launch?', hint: 'e.g. real business, planning to launch publicly', category: 'scope', required: true },
                        { id: 'qf3', question: 'Do you need any third-party integrations like payments, file uploads, email, or social login?', hint: 'e.g. Stripe for payments, Cloudinary for uploads', category: 'technical', required: true },
                    ],
                };
            }
        }

        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            throw new Error('AI returned no questions. Please try again.');
        }

        const fallbacks = [
            { id: 'qf1', question: 'What visual style fits your brand?', hint: 'e.g. minimal and clean', category: 'design' as const, required: false },
            { id: 'qf2', question: 'Is this a personal project or a real business launch?', hint: 'e.g. business launch', category: 'scope' as const, required: false },
            { id: 'qf3', question: 'Any specific tech or third-party integrations needed?', hint: 'e.g. Stripe, Google Maps', category: 'technical' as const, required: false },
        ];

        while (parsed.questions.length < 3) {
            const fb = fallbacks[parsed.questions.length];
            if (!fb) break;
            parsed.questions.push(fb);
        }

        track('requirements.question_gen.success', { provider: params.provider, ideaLength: params.userIdea.length });
        return parsed;
    }

    async compileRequirementsDocument(params: {
        originalPrompt: string;
        projectName: string;
        answers: RequirementsAnswer[];
        selectedModules: string[];
        provider: string;
        apiKey?: string;
        model?: string;
    }): Promise<RequirementsDocument> {
        const prompt = buildRequirementsCompilePrompt(params.originalPrompt, params.projectName, params.answers, params.selectedModules);
        const fallback = buildFallbackRequirementsDocument(params);

        let rawResponse = '';
        let source: 'ai' | 'fallback' = 'ai';

        try {
            rawResponse = await this.generateNonStreaming({
                provider: params.provider, apiKey: params.apiKey, model: params.model,
                prompt, maxTokens: 1600, temperature: 0.2, forceJson: true,
            });
        } catch (err) {
            if (isQuotaOrRateLimitError(err)) {
                source = 'fallback';
                track('requirements.compile.success', { provider: params.provider, source });
                return { ...fallback, _meta: { source, provider: params.provider || 'gemini', model: params.model || 'default', timestamp: new Date().toISOString() } };
            }
            throw err;
        }

        let parsed: RequirementsDocument;
        try {
            parsed = parseRequirementsDocumentFromRaw(rawResponse);
        } catch {
            track('requirements.compile.parse_failed', { provider: params.provider });
            try {
                const strictRetry = await this.generateNonStreaming({
                    provider: params.provider, apiKey: params.apiKey, model: params.model,
                    prompt: `${prompt}\n\nCRITICAL: Return ONLY a valid JSON object with no markdown/code fences/comments.`,
                    maxTokens: 1800, temperature: 0, forceJson: true,
                });
                parsed = parseRequirementsDocumentFromRaw(strictRetry);
                track('requirements.compile.repaired', { provider: params.provider });
            } catch {
                try {
                    const repairPrompt = buildJsonRepairPrompt(rawResponse,
                        '{ "originalPrompt": "string", "projectName": "string", "appType": "string", "targetUsers": "string", "coreFeatures": ["string"], "designPreference": "string", "themeMode": "light|dark|hybrid|any", "scale": "personal|startup|enterprise", "techPreferences": "string", "additionalNotes": "string", "answers": [], "compiledSummary": "string" }',
                    );
                    const repaired = await this.generateNonStreaming({
                        provider: params.provider, apiKey: params.apiKey, model: params.model,
                        prompt: repairPrompt, maxTokens: 1400, temperature: 0, forceJson: true,
                    });
                    parsed = parseRequirementsDocumentFromRaw(repaired);
                } catch {
                    parsed = fallback;
                    source = 'fallback';
                }
            }
            if (!parsed || !parsed.compiledSummary) { parsed = fallback; source = 'fallback'; }
        }

        if (!parsed.compiledSummary.trim()) parsed.compiledSummary = fallback.compiledSummary;
        if (!Array.isArray(parsed.coreFeatures) || parsed.coreFeatures.length === 0) parsed.coreFeatures = fallback.coreFeatures;
        if (!parsed.projectName) parsed.projectName = fallback.projectName;
        if (!parsed.originalPrompt) parsed.originalPrompt = params.originalPrompt;
        parsed.answers = params.answers;

        parsed = rebalanceRequirementsForDomain(parsed, {
            originalPrompt: params.originalPrompt,
            selectedModules: params.selectedModules,
        });

        track('requirements.compile.success', { provider: params.provider, source });
        return {
            ...parsed,
            _meta: { source, provider: params.provider || 'gemini', model: params.model || 'default', timestamp: new Date().toISOString() },
        };
    }

    private async callOpenAiNonStreaming(
        apiKey: string, model: string, prompt: string,
        maxTokens: number, temperature: number, forceJson = false, timeoutMs = DEFAULT_NONSTREAMING_TIMEOUT_MS,
    ): Promise<string> {
        const client = new OpenAI({ apiKey });
        const modelName = normalizeModelForProvider('openai', model) || DEFAULT_MODELS.openai;
        const base = { model: modelName, messages: [{ role: 'user' as const, content: prompt }], max_tokens: maxTokens, temperature };

        return withTimeout(
            (async () => {
                if (forceJson) {
                    try {
                        const r = await client.chat.completions.create({ ...base, response_format: { type: 'json_object' } } as any);
                        return r.choices[0]?.message?.content || '';
                    } catch { }
                }
                const r = await client.chat.completions.create(base as any);
                return r.choices[0]?.message?.content || '';
            })(),
            timeoutMs,
            `OpenAI-NS/${modelName}`,
        );
    }

    private async callGitHubModelsNonStreaming(
        apiKey: string, model: string, prompt: string,
        maxTokens: number, temperature: number, forceJson = false, timeoutMs = DEFAULT_NONSTREAMING_TIMEOUT_MS,
    ): Promise<string> {
        const client = createGitHubModelsClient(apiKey);
        const modelsToTry = getGitHubModelFallbackChain(model);
        let lastError: unknown = null;

        for (const modelName of modelsToTry) {
            const base = { model: modelName, messages: [{ role: 'user' as const, content: prompt }], max_tokens: maxTokens, temperature };
            try {
                return await withTimeout(
                    (async () => {
                        if (forceJson) {
                            try {
                                const r = await client.chat.completions.create({ ...base, response_format: { type: 'json_object' } } as any);
                                return r.choices[0]?.message?.content || '';
                            } catch { }
                        }
                        const r = await client.chat.completions.create(base as any);
                        return r.choices[0]?.message?.content || '';
                    })(),
                    timeoutMs,
                    `GitHub-NS/${modelName}`,
                );
            } catch (err) {
                lastError = err;
                // Retry next fallback model for unknown-model and transient timeout failures.
                if (isUnknownModelError(err) || isTimeoutError(err)) {
                    continue;
                }
                throw err;
            }
        }

        throw lastError instanceof Error
            ? lastError
            : new Error('GitHub Models non-streaming request failed.');
    }

    async designToCode(req: DesignToCodeRequest, onChunk?: (chunk: string) => void): Promise<string> {
        const { provider, designJSON, designDescription } = req;
        const isUsingPlatformKey = !req.apiKey?.trim();
        const apiKey = resolveApiKey(provider, req.apiKey);
        const model = provider === 'gemini' ? safeGeminiModel(req.model, isUsingPlatformKey) : (req.model || DEFAULT_MODELS[provider]);
        const systemPrompt = `You are an expert React + Tailwind developer.`;
        const prompt = buildDesignToCodePrompt(designJSON, designDescription);

        switch (provider) {
            case 'openai': return generateWithOpenAI(apiKey, model || DEFAULT_MODELS.openai, systemPrompt, prompt, onChunk);
            case 'gemini': return generateWithGeminiWithFallback(apiKey, model || DEFAULT_MODELS.gemini, systemPrompt, prompt, onChunk, 0.3, isUsingPlatformKey);
            case 'anthropic': return generateWithAnthropic(apiKey, model || DEFAULT_MODELS.anthropic, systemPrompt, prompt, onChunk);
            case 'ollama': return generateWithOllama(model || DEFAULT_MODELS.ollama, systemPrompt, prompt, onChunk);
            case 'nvidia': return generateWithNvidia(apiKey, model || DEFAULT_MODELS.nvidia, systemPrompt, prompt, onChunk);
            case 'github': return generateWithGitHubModels(apiKey, model || DEFAULT_MODELS.github, systemPrompt, prompt, onChunk);
            default: throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    async refine(req: RefineRequest, onChunk?: (chunk: string) => void): Promise<string> {
        const { provider, previousCode, refinementRequest } = req;
        const isUsingPlatformKey = !req.apiKey?.trim();
        const apiKey = resolveApiKey(provider, req.apiKey);
        const model = provider === 'gemini' ? safeGeminiModel(req.model, isUsingPlatformKey) : (req.model || DEFAULT_MODELS[provider]);
        const systemPrompt = `You are an expert full-stack developer refining previously generated code.`;
        const compressedPreviousCode = compressRefineContextFiles(previousCode, refinementRequest);
        const prompt = buildRefinePrompt(compressedPreviousCode, refinementRequest);

        switch (provider) {
            case 'openai': return generateWithOpenAI(apiKey, model || DEFAULT_MODELS.openai, systemPrompt, prompt, onChunk);
            case 'gemini': return generateWithGeminiWithFallback(apiKey, model || DEFAULT_MODELS.gemini, systemPrompt, prompt, onChunk, 0.3, isUsingPlatformKey);
            case 'anthropic': return generateWithAnthropic(apiKey, model || DEFAULT_MODELS.anthropic, systemPrompt, prompt, onChunk);
            case 'ollama': return generateWithOllama(model || DEFAULT_MODELS.ollama, systemPrompt, prompt, onChunk);
            case 'nvidia': return generateWithNvidia(apiKey, model || DEFAULT_MODELS.nvidia, systemPrompt, prompt, onChunk);
            case 'github': return generateWithGitHubModels(apiKey, model || DEFAULT_MODELS.github, systemPrompt, prompt, onChunk);
            default: throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    async chatAboutProject(req: ProjectChatRequest): Promise<string> {
        const provider = req.provider as AIProvider;
        const isUsingPlatformKey = !req.apiKey?.trim();
        const apiKey = resolveApiKey(provider, req.apiKey);
        const model = provider === 'gemini'
            ? safeGeminiModel(req.model, isUsingPlatformKey)
            : (req.model || DEFAULT_MODELS[provider]);

        const ctx = req.projectContext || {};
        const prompt = [
            'You are a senior full-stack engineering assistant helping the user understand and improve their generated project.',
            'Reply in concise plain English. If user asks for a code change, explain what should change and where.',
            `Project name: ${ctx.projectName || 'Untitled Project'}`,
            `Description: ${ctx.description || ''}`,
            `File count: ${ctx.fileCount || 0}`,
            `Modules: ${(ctx.modules || []).slice(0, 20).join(', ') || 'unknown'}`,
            `Key files: ${(ctx.keyFiles || []).slice(0, 30).join(', ') || 'none'}`,
            `User message: ${req.message}`,
        ].join('\n');

        return this.generateNonStreaming({ provider, apiKey, model, prompt, maxTokens: 700, temperature: 0.35 });
    }
}

export const aiService = new AIService();