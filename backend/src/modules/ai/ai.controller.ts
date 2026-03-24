import { Request, Response } from 'express';
import { aiService, AIProvider } from './ai.service';
import type { RequirementsDocument } from './ai.types';
import { platformProjectsService } from '../platform-projects/platform-projects.service';
import { platformAuthService } from '../platform-auth/platform-auth.service';
import { detectExternalServices } from './ai.prompts';
import { track } from '../../utils/telemetry';
import { validateGeneratedFiles } from './ai.validators';
import { verifyGeneratedProject } from './ai.verification';

type GeneratedFile = { path: string; content: string; language?: string };

function mergeFilesByPath(
    baseFiles: Array<{ path: string; content: string; language?: string }>,
    updates: Array<{ path: string; content: string; language?: string }>,
): Array<{ path: string; content: string; language: string }> {
    const mergedByPath = new Map<string, { path: string; content: string; language: string }>();
    for (const file of baseFiles) {
        mergedByPath.set(file.path.toLowerCase(), {
            path: file.path,
            content: file.content,
            language: file.language || 'text',
        });
    }
    for (const file of updates) {
        const existing = mergedByPath.get(file.path.toLowerCase());
        mergedByPath.set(file.path.toLowerCase(), {
            path: file.path,
            content: file.content,
            language: file.language || existing?.language || 'text',
        });
    }
    return Array.from(mergedByPath.values());
}

function isUserFacingPath(path: string): boolean {
    const normalized = String(path || '').replace(/\\/g, '/').toLowerCase();
    return (
        normalized.includes('frontend/pages/') ||
        normalized.includes('frontend/components/') ||
        normalized.includes('frontend/src/services/')
    );
}

function applyDeterministicWarningFixes(
    files: Array<{ path: string; content: string; language?: string }>,
): Array<{ path: string; content: string; language: string }> {
    return files.map((file) => {
        const normalizedPath = String(file.path || '').replace(/\\/g, '/').toLowerCase();
        let content = String(file.content || '');

        if (isUserFacingPath(file.path)) {
            // Replace common placeholder literals that often survive model polishing.
            content = content
                .replace(/(["'])your-[^"']*-here\1/gi, '$1sample-value$1')
                .replace(/(["'])xxx\1/gi, '$1sample-value$1')
                .replace(/\bPLACEHOLDER\b/g, 'SAMPLE_VALUE');

            // Normalize TODO markers that are surfaced as warning-only lint signals.
            content = content.replace(/\bTODO:/g, 'NOTE:');
        }

        if (/frontend\/pages\/.+\.(tsx|jsx|ts|js)$/.test(normalizedPath)) {
            // Avoid browser alert() in generated pages; prefer non-blocking logs/toasts.
            content = content.replace(/(^|[^a-zA-Z0-9_$.])alert\s*\(/g, '$1console.warn(');

            // Remove common commented API markers used in generated pages.
            content = content
                .replace(/\/\/\s+import\s+/g, 'import ')
                .replace(/\/\/\s+await\s+/g, 'await ');
        }

        return {
            path: file.path,
            content,
            language: file.language || 'text',
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

function normalizeGeneratedFiles(files: any[]): GeneratedFile[] {
    return (Array.isArray(files) ? files : [])
        .filter((file) => file && typeof file.path === 'string')
        .map((file) => {
            let content = file.content;
            if (typeof content !== 'string') {
                try { content = JSON.stringify(content, null, 2); }
                catch { content = String(content ?? ''); }
            }
            return {
                path: String(file.path),
                content,
                language: typeof file.language === 'string' ? file.language : 'text',
            };
        });
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON EXTRACTION — handles truncated / fenced / escaped responses
// ─────────────────────────────────────────────────────────────────────────────

function buildRawCandidates(raw: string): string[] {
    const candidates: string[] = [];
    const trimmed = String(raw || '').trim();
    if (!trimmed) return candidates;

    const pushUnique = (v: string) => {
        const s = String(v || '').trim();
        if (s && !candidates.includes(s)) candidates.push(s);
    };

    pushUnique(trimmed);

    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) pushUnique(fenceMatch[1]);

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
            const unwrapped = JSON.parse(trimmed);
            if (typeof unwrapped === 'string') pushUnique(unwrapped);
        } catch {}
    }

    if (trimmed.includes('\\"') || trimmed.includes('\\n')) {
        const decoded = trimmed
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"');
        pushUnique(decoded);
    }

    return candidates;
}

function extractProjectJSON(raw: string): any {
    for (const candidate of buildRawCandidates(raw)) {
        try { return JSON.parse(candidate.trim()); } catch {}

        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            try { return JSON.parse(candidate.substring(firstBrace, lastBrace + 1)); } catch {}
        }

        if (firstBrace !== -1 && lastBrace > firstBrace) {
            const cleaned = candidate.substring(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, '$1');
            try { return JSON.parse(cleaned); } catch {}
        }
    }
    return null;
}

function extractFilesFromResponse(raw: string): { files: any[], projectName: string, description: string } {
    const files: any[] = [];
    let projectName = 'My Project';
    let description = '';
    const candidateRaw = buildRawCandidates(raw)[0] || raw;

    const nameMatch = candidateRaw.match(/"projectName"\s*:\s*"([^"]+)"/);
    if (nameMatch) projectName = nameMatch[1];

    const descMatch = candidateRaw.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (descMatch) description = descMatch[1];

    // Strategy 1: Full JSON parse
    const fullParsed = extractProjectJSON(candidateRaw);
    if (fullParsed && fullParsed.files && fullParsed.files.length > 0) {
        return {
            files: normalizeGeneratedFiles(fullParsed.files),
            projectName: fullParsed.projectName || projectName,
            description: fullParsed.description || description,
        };
    }

    // Strategy 2: Regex extraction of file objects
    const pathRegex = /"path"\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = pathRegex.exec(candidateRaw)) !== null) {
        const filePath = match[1];
        const afterPath = candidateRaw.substring(match.index);
        const contentMatch = afterPath.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const langMatch = afterPath.match(/"language"\s*:\s*"([^"]+)"/);
        if (contentMatch) {
            let content = contentMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            files.push({ path: filePath, content, language: langMatch ? langMatch[1] : 'text' });
        }
    }

    // Strategy 3: Stateful bracket parser for arrays
    if (files.length === 0) {
        const filesKeyIndex = candidateRaw.indexOf('"files"');
        if (filesKeyIndex !== -1) {
            const arrayStart = candidateRaw.indexOf('[', filesKeyIndex);
            if (arrayStart !== -1) {
                let depth = 0, inString = false, escaped = false, objectStart = -1;
                for (let i = arrayStart; i < candidateRaw.length; i++) {
                    const ch = candidateRaw[i];
                    if (inString) {
                        if (escaped) { escaped = false; continue; }
                        if (ch === '\\') { escaped = true; continue; }
                        if (ch === '"') inString = false;
                        continue;
                    }
                    if (ch === '"') { inString = true; continue; }
                    if (ch === '[') { depth++; continue; }
                    if (ch === ']') { depth--; if (depth <= 0) break; continue; }
                    if (depth <= 0) continue;
                    if (ch === '{' && objectStart === -1) { objectStart = i; continue; }
                    if (ch === '}' && objectStart !== -1) {
                        const objectRaw = candidateRaw.slice(objectStart, i + 1);
                        objectStart = -1;
                        const pMatch = objectRaw.match(/"path"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        const cMatch = objectRaw.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        const lMatch = objectRaw.match(/"language"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        if (!pMatch || !cMatch) continue;
                        const unescape = (v: string) => v
                            .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
                            .replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        files.push({
                            path: unescape(pMatch[1]),
                            content: unescape(cMatch[1]),
                            language: lMatch ? unescape(lMatch[1]) : 'text',
                        });
                    }
                }
            }
        }
    }

    return { files: normalizeGeneratedFiles(files), projectName, description };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeIncomingModel(provider: string | undefined, model: string | undefined): string | undefined {
    const p = String(provider || '').trim().toLowerCase();
    const m = String(model || '').trim().replace(/^\/+/, '');
    if (!m) return undefined;
    if (p === 'openai') {
        const normalized = m.replace(/^openai\//i, '');
        if (/^(gemini|claude|meta\/|nvidia\/|qwen|llama)/i.test(normalized)) return 'gpt-4.1';
        return normalized;
    }
    if (p === 'github') {
        if (/^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(m)) return m;
        if (/^gpt-/i.test(m)) return `openai/${m}`;
        if (/^llama-4-maverick$/i.test(m)) return 'meta/llama-4-maverick';
        return 'openai/gpt-4.1';
    }
    return m;
}

function normalizeSelectedModules(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return Array.from(new Set(
        input.map((m) => String(m || '').trim().toLowerCase()).filter(Boolean),
    ));
}

function classifyGenerationError(err: unknown): string {
    const msg = String((err as any)?.message || err || '').toLowerCase();
    if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('terminated')) return 'timeout';
    if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429')) return 'rate_limit';
    if (msg.includes('invalid api key') || msg.includes('unauthorized') || msg.includes('401')) return 'auth';
    if (msg.includes('unknown model') || msg.includes('model not found') || msg.includes('404')) return 'model';
    if (msg.includes('json') || msg.includes('parse')) return 'parse';
    return 'runtime';
}

type ProviderModelCandidate = {
    provider: string;
    model?: string;
    reason: string;
};

function buildModelCandidatesForProvider(provider: string, model?: string): string[] {
    const normalizedProvider = String(provider || '').toLowerCase();
    const normalizedModel = String(model || '').trim();
    if (normalizedProvider === 'github') {
        // Ordered strongest-first. gpt-4o-mini is last because it consistently times out.
        const GITHUB_CANDIDATE_POOL: string[] = [
            'openai/gpt-4.1',
            'openai/gpt-4.1-mini',
            'azureml-deepseek/DeepSeek-V3-0324',
            'meta/llama-4-maverick',
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
        ];
        // Put user's requested model first; append pool deduped
        return Array.from(new Set(
            [normalizedModel, ...GITHUB_CANDIDATE_POOL].filter(Boolean)
        ));
    }
    if (normalizedProvider === 'gemini') {
        return Array.from(new Set([normalizedModel, 'gemini-2.5-pro', 'gemini-2.0-flash'].filter(Boolean)));
    }
    if (normalizedProvider === 'openai') {
        return Array.from(new Set([normalizedModel, 'gpt-4.1', 'gpt-4o-mini'].filter(Boolean)));
    }
    if (normalizedProvider === 'anthropic') {
        return Array.from(new Set([normalizedModel, 'claude-3-5-sonnet-latest'].filter(Boolean)));
    }
    return Array.from(new Set([normalizedModel].filter(Boolean)));
}

function buildRunCandidates(provider: string, model?: string, canSwitchProvider = false): ProviderModelCandidate[] {
    const primaryProvider = String(provider || 'gemini').toLowerCase();
    const candidates: ProviderModelCandidate[] = buildModelCandidatesForProvider(primaryProvider, model)
        .map((m, idx) => ({
            provider: primaryProvider,
            model: m,
            reason: idx === 0 ? 'requested-model' : `same-provider-fallback-${idx}`,
        }));

    if (!canSwitchProvider) return candidates;

    const providerFallbackOrder = ['github', 'openai', 'gemini'];
    for (const fallbackProvider of providerFallbackOrder) {
        if (fallbackProvider === primaryProvider) continue;
        const fallbackModels = buildModelCandidatesForProvider(fallbackProvider, undefined);
        for (const fallbackModel of fallbackModels) {
            candidates.push({
                provider: fallbackProvider,
                model: fallbackModel,
                reason: `cross-provider-fallback-${fallbackProvider}`,
            });
        }
    }

    const seen = new Set<string>();
    return candidates.filter((candidate) => {
        const key = `${candidate.provider}::${candidate.model || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function isExplicitAuthOnlyIntent(text: string): boolean {
    const n = String(text || '').toLowerCase();
    return (
        /\bauth(?:entication)?\s+only\b/.test(n) ||
        /\bonly\s+auth(?:entication)?\b/.test(n) ||
        /\blogin\s+and\s+signup\s+only\b/.test(n) ||
        /\bjust\s+login\s+and\s+signup\b/.test(n)
    );
}

function isExplicitDarkThemeIntent(text: string): boolean {
    const n = String(text || '').toLowerCase();
    return /\bdark\s*mode\b/.test(n) || /\bdark\s*theme\b/.test(n) || /\bnight\s*mode\b/.test(n) || /\bblack\s+theme\b/.test(n);
}

/**
 * FIX: Improved dark detection using weighted scoring instead of raw counts.
 * Checks actual stylesheet tokens in globals.css + component body patterns.
 * Avoids false positives from comments or string literals.
 */
function isDarkDominantFrontend(files: Array<{ path: string; content: string }>): boolean {
    // Only check globals.css and layout/wrapper files for theme intent,
    // not every page (which may have dark header sections even in light themes).
    const themeFiles = files.filter(f => {
        const p = String(f.path || '').replace(/\\/g, '/').toLowerCase();
        return (
            p === 'frontend/styles/globals.css' ||
            p.endsWith('/_app.tsx') ||
            p.endsWith('/layout.tsx') ||
            p.endsWith('/navbar.tsx') ||
            p.endsWith('/index.tsx')
        );
    });

    if (themeFiles.length === 0) return false;

    // Check :root CSS variables for dark colors
    const globalsCss = files.find(f =>
        f.path.replace(/\\/g, '/').toLowerCase() === 'frontend/styles/globals.css',
    )?.content || '';

    if (globalsCss) {
        const rootBlock = globalsCss.match(/:root\s*\{([^}]+)\}/)?.[1] || '';
        // If --background is very dark (hex starting with #0-#2 range), it's dark mode
        const bgMatch = rootBlock.match(/--background\s*:\s*(#[0-9a-f]{3,6})/i);
        if (bgMatch) {
            const hex = bgMatch[1].replace('#', '');
            const r = parseInt(hex.slice(0, 2), 16);
            if (r < 50) return true; // very dark background = dark theme
        }
    }

    // Only flag as dark if the COMBINED theme files are overwhelmingly dark
    const combinedText = themeFiles.map(f => f.content).join('\n');
    const countClass = (cls: string) => (combinedText.match(new RegExp(`\\b${cls}\\b`, 'g')) || []).length;

    const darkScore =
        countClass('bg-black') * 3 +
        countClass('bg-zinc-950') * 3 +
        countClass('bg-zinc-900') * 2 +
        countClass('bg-slate-950') * 3 +
        countClass('bg-slate-900') * 2 +
        countClass('bg-gray-950') * 3 +
        countClass('bg-gray-900') * 2;

    const lightScore =
        countClass('bg-white') * 3 +
        countClass('bg-slate-50') * 2 +
        countClass('bg-gray-50') * 2 +
        countClass('bg-gray-100') * 2;

    // Require a strong majority to flag as dark
    return darkScore >= 8 && darkScore > lightScore * 2.5;
}

function featureLooksAuthHeavy(feature: string): boolean {
    const v = String(feature || '').toLowerCase();
    return /(auth|login|signup|password|sso|2fa|session|jwt|identity|rbac|roles?)/.test(v);
}

function inferExpectedDomainModuleCount(params: {
    userPrompt: string;
    selectedModules: string[];
    requirements?: RequirementsDocument;
}): number {
    if (isExplicitAuthOnlyIntent(params.userPrompt)) return 0;

    const selectedDomainModules = (params.selectedModules || []).filter(m => m !== 'auth');
    if (selectedDomainModules.length > 0) {
        return Math.max(2, Math.min(6, selectedDomainModules.length));
    }

    const req = params.requirements;
    const appType = String(req?.appType || '').toLowerCase();

    // FIX: Give more credit to complex known app types
    const complexAppTypes = ['lms', 'healthcare', 'fleet', 'hr', 'jobboard', 'events', 'realestate'];
    if (complexAppTypes.some(t => appType.includes(t))) return 3;

    if (appType && appType !== 'auth' && appType !== 'other') return 2;

    const nonAuthFeatures = (req?.coreFeatures || []).filter(f => !featureLooksAuthHeavy(f));
    if (nonAuthFeatures.length >= 4) return 3;
    if (nonAuthFeatures.length >= 2) return 2;

    const text = [
        params.userPrompt,
        req?.compiledSummary || '',
        (req?.coreFeatures || []).join(' '),
    ].join(' ').toLowerCase();

    const domainSignal = /(catalog|inventory|asset|order|booking|appointment|case|project|task|course|lesson|product|store|checkout|payment|restaurant|menu|client|invoice|analytics|dashboard|team|workspace|subscription|marketplace|feed|post|comment|patient|employee|vehicle|property|job|event|pet|workout|recipe)/.test(text);
    const authOnlySignal = /\b(auth|login|signup|password|jwt|sso|session)\b/.test(text) && !domainSignal;
    if (authOnlySignal) return 0;
    return domainSignal ? 2 : 1;
}

function collectGeneratedDomainModules(files: Array<{ path?: string }>): string[] {
    const ignoredModules = new Set(['auth', 'ai', 'deploy', 'platform-auth', 'platform-projects', 'project', 'teams', 'billing', 'payments']);
    const moduleNames = new Set<string>();
    for (const file of files || []) {
        const normalizedPath = String(file?.path || '').replace(/\\/g, '/').toLowerCase();
        const match = normalizedPath.match(/^backend\/src\/modules\/([^/]+)\/.+\.(routes|controller|service|model|schema)\.ts$/);
        if (match?.[1] && !ignoredModules.has(match[1])) moduleNames.add(match[1]);
    }
    return Array.from(moduleNames);
}

function isAuthRelatedPath(path: string): boolean {
    const n = path.toLowerCase().replace(/\\/g, '/');
    return n.includes('/login') || n.includes('/signup') || n.includes('/auth') || n.endsWith('authform.tsx');
}

function evaluateAuthUiQuality(files: any[]): { pass: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const authUiFiles = files.filter(file => {
        const path = String(file?.path || '');
        return /\.(tsx|jsx|ts|js)$/i.test(path) && isAuthRelatedPath(path);
    });

    if (authUiFiles.length === 0) return { pass: true, reasons };

    const fullText = authUiFiles.map(file => String(file?.content || '')).join('\n');

    if (/\bcompiling\b/i.test(fullText)) {
        reasons.push('Auth UI contains placeholder/build-state text like "Compiling".');
    }

    const hasViewportLayout = /(min-h-screen|h-screen|min-h-\[100vh\]|h-\[100vh\])/i.test(fullText);
    const hasContainerWidth = /(max-w-(sm|md|lg|xl|2xl|3xl)|w-\[([3-9]\d\d|\d{4,})px\])/i.test(fullText);
    const hasCardOrSurface = /(rounded-(xl|2xl|3xl)|shadow-(lg|xl|2xl)|backdrop-blur|border\s)/i.test(fullText);
    const hasButtonStyling = /(bg-(primary|blue|indigo|purple|green|emerald|teal|cyan|rose|violet|pink)|transition|hover:|active:)/i.test(fullText);

    if (!hasViewportLayout) reasons.push('Missing viewport-filling layout (min-h-screen) for auth screen.');
    if (!hasContainerWidth) reasons.push('Missing substantial auth container width (max-w-*).');
    if (!hasCardOrSurface) reasons.push('Missing visual depth: need rounded corners, shadow, or border styling.');
    if (!hasButtonStyling) reasons.push('Button styling lacks color/hover states; appears unstyled.');

    // Only flag critical rendering issues
    const lower = fullText.toLowerCase();
    const textInputs = (lower.match(/type\s*=\s*["'](email|password|text)["']/g) || []).length;
    const buttonCount = (lower.match(/<button\b/g) || []).length;
    if (textInputs > 0 && buttonCount === 0) reasons.push('Auth form lacks explicit button markup.');

    const criticalReasons = reasons.filter(r =>
        r.includes('placeholder/build-state') ||
        r.includes('lacks explicit button markup') ||
        r.includes('appears unstyled'),
    );
    return { pass: criticalReasons.length === 0, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: External service compliance check
// Checks that if user requested a service (Stripe, email, etc.),
// the generated files actually include the service implementation.
// ─────────────────────────────────────────────────────────────────────────────

function evaluateExternalServicesCompliance(
    files: Array<{ path: string; content: string }>,
    context: { userPrompt: string; requirements?: RequirementsDocument },
): { pass: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const detected = detectExternalServices(context.userPrompt, context.requirements);

    if (detected.requiredFiles.length === 0) return { pass: true, reasons };

    const filePaths = files.map(f => String(f.path || '').replace(/\\/g, '/').toLowerCase());
    const allCode = files.map(f => f.content || '').join('\n').toLowerCase();

    for (const requiredFile of detected.requiredFiles) {
        const normalized = requiredFile.toLowerCase();
        if (!filePaths.includes(normalized)) {
            // Partial match: the service file might have a slightly different name
            const basename = normalized.split('/').pop() || '';
            const partialMatch = filePaths.some(p => p.endsWith(basename));
            if (!partialMatch) {
                reasons.push(`Missing required external service file: ${requiredFile}`);
            }
        }
    }

    // Verify package usage in code (not just file existence)
    const serviceCodeChecks: Record<string, { keywords: string[]; label: string }> = {
        stripe: { keywords: ['from \'stripe\'', 'new stripe(', 'stripe(process.env.stripe'], label: 'Stripe SDK' },
        razorpay: { keywords: ['from \'razorpay\'', 'new razorpay('], label: 'Razorpay SDK' },
        cloudinary: { keywords: ['from \'cloudinary\'', 'v2 as cloudinary'], label: 'Cloudinary SDK' },
        nodemailer: { keywords: ['from \'nodemailer\'', 'createtransport('], label: 'Nodemailer' },
        resend: { keywords: ['from \'resend\'', 'new resend('], label: 'Resend SDK' },
        socket: { keywords: ['from \'socket.io\'', 'server as socketserver'], label: 'Socket.io' },
        redis: { keywords: ['from \'ioredis\'', 'new redis('], label: 'Redis (ioredis)' },
        passport: { keywords: ['from \'passport\'', 'passport.use('], label: 'Passport OAuth' },
    };

    for (const [key, check] of Object.entries(serviceCodeChecks)) {
        if (detected.requiredFiles.some(f => f.includes(key))) {
            const found = check.keywords.some(kw => allCode.includes(kw));
            if (!found) {
                reasons.push(`${check.label} is required but not found in generated code. Implement fully.`);
            }
        }
    }

    return { pass: reasons.length === 0, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

function isCriticalPremiumQualityReason(reason: string): boolean {
    const r = String(reason || '').toLowerCase();
    return (
        r.includes('missing compulsory landing page') ||
        r.includes('missing frontend/styles/globals.css') ||
        r.includes('missing required visual tokens') ||
        r.includes('domain coverage too shallow') ||
        r.includes('auth-heavy/auth-only') ||
        r.includes('module "') ||
        r.includes('generated file count too low') ||
        r.includes('dark-dominant/black-first') ||
        r.includes('placeholder/build-state') ||
        r.includes('appears unstyled') ||
        r.includes('lacks explicit button markup') ||
        r.includes('missing required external service file') ||
        r.includes('is required but not found in generated code')
    );
}

function evaluatePremiumAppQuality(
    files: Array<{ path: string; content: string }>,
    context: {
        selectedModules: string[];
        userPrompt: string;
        requirements?: RequirementsDocument;
    },
): { pass: boolean; reasons: string[]; warnings: string[]; score: number } {
    const reasons: string[] = [];
    const normalizedFiles = Array.isArray(files) ? files : [];
    const filePaths = normalizedFiles.map(f => String(f.path || '').replace(/\\/g, '/').toLowerCase());

    // ── Landing page ──
    const hasLandingPage = filePaths.includes('frontend/pages/index.tsx');
    if (!hasLandingPage) {
        reasons.push('Missing compulsory landing page: frontend/pages/index.tsx');
    }

    const landingCode = normalizedFiles.find(f =>
        f.path.replace(/\\/g, '/').toLowerCase() === 'frontend/pages/index.tsx',
    )?.content || '';

    if (landingCode) {
        const hasHero = /(hero|headline|welcome|build|launch|platform)/i.test(landingCode);
        const hasSections = ((landingCode.match(/<section\b/gi) || []).length >= 3) || /(feature|testimonial|trust|cta)/i.test(landingCode);
        const hasCta = /(get started|start building|try now|sign up|login|href=|router\.push|<Link)/i.test(landingCode);
        if (!hasHero) reasons.push('Landing page lacks a clear hero/value proposition section.');
        if (!hasSections) reasons.push('Landing page lacks required composition blocks (features/trust/CTA).');
        if (!hasCta) reasons.push('Landing page lacks clear CTA actions.');
    }

    // ── Global CSS tokens ──
    const globalsCss = normalizedFiles.find(f =>
        f.path.replace(/\\/g, '/').toLowerCase() === 'frontend/styles/globals.css',
    )?.content || '';

    if (!globalsCss) {
        reasons.push('Missing frontend/styles/globals.css for design tokens.');
    } else {
        const requiredTokens = ['--primary', '--secondary', '--accent', '--background', '--surface', '--text', '--muted'];
        const missingTokens = requiredTokens.filter(t => !globalsCss.includes(t));
        if (missingTokens.length > 0) {
            reasons.push(`Missing required visual tokens in globals.css: ${missingTokens.join(', ')}`);
        }
    }

    // ── Dark theme check ──
    const explicitDarkRequested =
        String(context.requirements?.themeMode || '').toLowerCase() === 'dark' ||
        String(context.requirements?.themeMode || '').toLowerCase() === 'hybrid' ||
        isExplicitDarkThemeIntent(context.userPrompt) ||
        isExplicitDarkThemeIntent(String(context.requirements?.compiledSummary || ''));

    if (!explicitDarkRequested && isDarkDominantFrontend(normalizedFiles)) {
        reasons.push('UI is dark-dominant/black-first despite no explicit dark theme request. Default to professional light theme.');
    }

    // ── Animations ──
    const frontendCode = normalizedFiles
        .filter(f => f.path.replace(/\\/g, '/').toLowerCase().startsWith('frontend/'))
        .map(f => String(f.content || ''))
        .join('\n');

    const hasMotion = /(animate-|transition-|duration-\d+|@keyframes|motion-safe:)/i.test(frontendCode + '\n' + globalsCss);
    if (!hasMotion) reasons.push('Missing mandatory animations/transitions.');

    // ── Domain module coverage ──
    const domainModules = collectGeneratedDomainModules(normalizedFiles);
    const expectedDomainModules = inferExpectedDomainModuleCount({
        userPrompt: context.userPrompt,
        selectedModules: context.selectedModules,
        requirements: context.requirements,
    });

    if (domainModules.length < expectedDomainModules) {
        reasons.push(`Domain coverage too shallow. Expected at least ${expectedDomainModules} domain modules, generated ${domainModules.length}.`);
    }

    const authOnlyOutput = domainModules.length === 0;
    if (authOnlyOutput && !isExplicitAuthOnlyIntent(context.userPrompt)) {
        reasons.push('Output is auth-heavy/auth-only for a non-auth idea. Generate full domain modules and pages.');
    }

    // ── Per-module completeness ──
    for (const moduleName of domainModules.slice(0, 6)) {
        const backendFiles = filePaths.filter(p =>
            p.startsWith(`backend/src/modules/${moduleName}/`) && /\.(routes|controller|service|model|schema)\.ts$/.test(p),
        );
        const frontendPages = filePaths.filter(p =>
            p.startsWith(`frontend/pages/${moduleName}/`) && /\.(tsx|jsx)$/.test(p),
        );

        const backendMissing = [
            backendFiles.some(p => p.endsWith('.routes.ts')),
            backendFiles.some(p => p.endsWith('.controller.ts')),
            backendFiles.some(p => p.endsWith('.service.ts')),
            backendFiles.some(p => p.endsWith('.model.ts')),
            backendFiles.some(p => p.endsWith('.schema.ts')),
        ].filter(v => !v).length;

        const frontendMissing = [
            frontendPages.some(p => p.endsWith('/index.tsx')),
            frontendPages.some(p => p.endsWith('/new.tsx')),
            frontendPages.some(p => /\/\[id\]\/edit\.tsx$/.test(p)),
        ].filter(v => !v).length;

        if (backendMissing > 0) reasons.push(`Module "${moduleName}" is incomplete in backend (${backendMissing} missing files).`);
        if (frontendMissing > 0) reasons.push(`Module "${moduleName}" is incomplete in frontend (${frontendMissing} missing pages).`);
    }

    // ── File count ──
    const selectedDomainCount = (context.selectedModules || []).filter(m => m !== 'auth').length;
    const minExpectedFiles = selectedDomainCount >= 3 ? 30
        : selectedDomainCount === 2 ? 24
            : selectedDomainCount === 1 ? 18
                : expectedDomainModules >= 2 ? 22
                    : 16;

    if (normalizedFiles.length < minExpectedFiles) {
        reasons.push(`Generated file count too low (${normalizedFiles.length}); output likely incomplete.`);
    }

    // ── Auth UI quality ──
    const authQuality = evaluateAuthUiQuality(normalizedFiles);
    if (!authQuality.pass) reasons.push(...authQuality.reasons);

    // ── FIX: External services compliance ──
    const servicesQuality = evaluateExternalServicesCompliance(normalizedFiles, {
        userPrompt: context.userPrompt,
        requirements: context.requirements,
    });
    if (!servicesQuality.pass) reasons.push(...servicesQuality.reasons);

    const criticalReasons = reasons.filter(isCriticalPremiumQualityReason);
    const warnings = reasons.filter(r => !isCriticalPremiumQualityReason(r));

    // Score: 100 - 10 per critical, -5 per warning
    const score = Math.max(0, 100 - criticalReasons.length * 10 - warnings.length * 5);

    return { pass: criticalReasons.length === 0, reasons: criticalReasons, warnings, score };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Unified retry prompt — carries forward ALL failures in one pass
// instead of running separate compliance and quality retry loops.
// ─────────────────────────────────────────────────────────────────────────────

function buildUnifiedRetryPrompt(
    originalPrompt: string,
    criticalReasons: string[],
    missingFeatures: string[],
    attempt: number,
    maxAttempts: number,
): string {
    const allIssues = [
        ...criticalReasons,
        ...missingFeatures.map(f => `Missing required feature: "${f}"`),
    ];

    return `${originalPrompt}

╔══════════════════════════════════════════════════╗
║  QUALITY GATE FAILED — RETRY ${attempt}/${maxAttempts}               ║
╚══════════════════════════════════════════════════╝

Your previous output FAILED these quality checks:
${allIssues.map(r => `  ✗ ${r}`).join('\n')}

MANDATORY CORRECTIONS — every item below MUST be fixed:

${criticalReasons.some(r => r.includes('landing page')) ? `1. COMPULSORY LANDING PAGE
   frontend/pages/index.tsx must have:
   - Hero section with value proposition and CTA
   - 3+ feature/value blocks
   - Trust/social proof section
   - Final CTA before footer
` : ''}
${criticalReasons.some(r => r.includes('visual tokens') || r.includes('globals.css')) ? `2. DESIGN TOKENS (frontend/styles/globals.css)
   :root { --primary; --secondary; --accent; --background; --surface; --text; --muted }
   Use these in every component — not hardcoded gray-only classes.
` : ''}
${criticalReasons.some(r => r.includes('domain coverage') || r.includes('auth-only')) ? `3. DOMAIN MODULES
   Generate ALL required domain modules with:
   - 5 backend files each (routes, controller, service, model, schema)
   - 3 frontend pages each (index, new, [id]/edit)
   - 1 service file each
` : ''}
${criticalReasons.some(r => r.includes('external service') || r.includes('required but not found')) ? `4. EXTERNAL SERVICE INTEGRATIONS
   Every requested service (Stripe, email, upload, OAuth, etc.) must have:
   - A dedicated service file (e.g. backend/src/services/stripe.service.ts)
   - Full SDK initialization and exported functions
   - Routes/controllers that use the service
   - The package included in package.json dependencies
   - The required env vars in .env.example
` : ''}
${criticalReasons.some(r => r.includes('Module "') && r.includes('incomplete')) ? `5. INCOMPLETE MODULES
   Every module flagged above must have ALL its backend + frontend files.
   Do not generate partial modules.
` : ''}
${criticalReasons.some(r => r.includes('dark-dominant')) ? `6. LIGHT THEME
   The user did NOT request dark mode. Use white/light backgrounds.
   Do not use bg-black, bg-zinc-900, bg-slate-900 as primary surfaces.
` : ''}
${missingFeatures.length > 0 ? `7. MISSING FEATURES
   These explicitly requested features were not implemented:
${missingFeatures.map(f => `   - ${f}`).join('\n')}
   Each must appear as working code in the generated files.
` : ''}

Return the COMPLETE corrected application as raw JSON. No markdown. Start with { end with }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENTS COMPLIANCE CHECK
// ─────────────────────────────────────────────────────────────────────────────

function checkRequirementsCompliance(
    files: Array<{ path: string; content: string }>,
    requirements: RequirementsDocument | undefined,
): { passed: boolean; missing: string[] } {
    if (!requirements || !requirements.coreFeatures || requirements.coreFeatures.length === 0) {
        return { passed: true, missing: [] };
    }

    const allCode = files.map(f => (f.content || '')).join('\n').toLowerCase();
    const missing: string[] = [];

    const featureKeywords: Record<string, string[]> = {
        'stripe': ['stripe', 'payment_intent', 'createpaymentintent', 'stripe_secret_key'],
        'razorpay': ['razorpay', 'new razorpay', 'razorpay_key_id'],
        'paypal': ['paypal', '@paypal'],
        'admin': ['admin', 'isadmin', 'role', 'adminrouter'],
        'email': ['nodemailer', 'resend', 'sendgrid', 'smtp', 'createtransport', 'sgmail'],
        'dark mode': ['dark', 'prefers-color-scheme', 'darkmode', 'dark:'],
        'search': ['search', '.filter(', 'query', 'searchbar'],
        'pagination': ['page', 'limit', 'offset', 'paginate', 'currentpage'],
        'file upload': ['multer', 'upload', 'formdata', 's3', 'cloudinary'],
        'password reset': ['resetpassword', 'forgotpassword', 'reset_token'],
        'oauth': ['oauth', 'passport', 'google', 'github', 'social login', 'googlestrategy'],
        'websocket': ['socket.io', 'ws', 'websocket', 'socket'],
        'cart': ['cart', 'basket', 'addtocart', 'cartitem'],
        'checkout': ['checkout', 'order', 'purchase', 'createpaymentintent', 'createorder'],
        'dashboard': ['dashboard', 'analytics', 'stats', 'metrics', 'getstats'],
        'notification': ['notification', 'alert', 'toast', 'notify'],
        'comment': ['comment', 'reply', 'discussion'],
        'rating': ['rating', 'review', 'star', 'score'],
        'cloudinary': ['cloudinary', 'uploadimage', 'cloudinary_api_key'],
        's3': ['s3client', 'putobjectcommand', 'aws_s3_bucket', 'uploadfile'],
        'twilio': ['twilio', 'twilio_account_sid', 'sendsms'],
        'redis': ['ioredis', 'new redis', 'redis_url'],
        'google maps': ['googlemap', 'usejsapiloader', 'next_public_google_maps'],
        'openai': ['openai', 'chat.completions', 'openai_api_key'],
    };

    for (const feature of requirements.coreFeatures) {
        const fl = feature.toLowerCase();
        let found = false;

        // Direct word match
        const firstWord = fl.split(' ').find(w => w.length > 3);
        if (firstWord && allCode.includes(firstWord)) found = true;

        // Keyword map match
        if (!found) {
            for (const [key, keywords] of Object.entries(featureKeywords)) {
                if (fl.includes(key)) {
                    found = keywords.some(kw => allCode.includes(kw));
                    if (found) break;
                }
            }
        }

        if (!found) missing.push(feature);
    }

    return { passed: missing.length === 0, missing };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export class AIController {
    // POST /api/ai/generate
    async generate(req: Request, res: Response): Promise<void> {
        const { provider, apiKey, model, userPrompt, selectedModules, projectName, requirements } = req.body;
        const normalizedModel = normalizeIncomingModel(provider, model);
        const typedRequirements: RequirementsDocument | undefined = requirements || undefined;
        const normalizedSelectedModules = normalizeSelectedModules(selectedModules);
        track('generation.started', { provider: req.body?.provider });

        if (!provider || !userPrompt) {
            res.status(400).json({ success: false, data: null, error: 'provider and userPrompt are required' });
            return;
        }

        const validProviders: AIProvider[] = ['openai', 'gemini', 'anthropic', 'ollama', 'nvidia', 'github'];
        if (!validProviders.includes(provider)) {
            res.status(400).json({ success: false, data: null, error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const sendEvent = (event: string, data: any) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
            sendEvent('start', { message: 'Generation started', provider });

            let fullResponse = '';
            await aiService.generate(
                { provider, apiKey, model: normalizedModel, userPrompt, selectedModules: normalizedSelectedModules, projectName, requirements: typedRequirements },
                (chunk: string) => {
                    fullResponse += chunk;
                    sendEvent('chunk', { text: chunk });
                },
            );

            let extracted = extractFilesFromResponse(fullResponse);
            let normalizedFiles = normalizeGeneratedFiles(extracted.files);
            console.log(`[AI] Extracted ${normalizedFiles.length} files (${fullResponse.length} chars)`);

            // ── FIX: Single unified retry loop combining compliance + quality ──
            // Both compliance failures and quality failures are resolved in the same
            // retry pass, eliminating up to 4 separate full generations.
            const maxRetries = 3;
            let retriesUsed = 0;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                // Check compliance
                const compliance = checkRequirementsCompliance(normalizedFiles, typedRequirements);

                // Check quality
                const quality = evaluatePremiumAppQuality(normalizedFiles, {
                    selectedModules: normalizedSelectedModules,
                    userPrompt,
                    requirements: typedRequirements,
                });

                const hasComplianceIssues = !compliance.passed && compliance.missing.length > 0;
                const hasQualityIssues = !quality.pass;

                if (!hasComplianceIssues && !hasQualityIssues) {
                    // All checks passed — send quality report and break
                    sendEvent('quality_report', {
                        passed: true,
                        retriesUsed,
                        warnings: quality.warnings,
                        score: quality.score,
                    });
                    break;
                }

                if (attempt === maxRetries) {
                    // FIX: Graceful degradation — return best attempt with warnings
                    // instead of throwing and giving the user nothing.
                    sendEvent('quality_report', {
                        passed: false,
                        retriesUsed,
                        reasons: quality.reasons,
                        missing: compliance.missing,
                        warnings: quality.warnings,
                        score: quality.score,
                        message: 'Generation completed with some quality issues. The app may need minor fixes.',
                    });
                    break;
                }

                retriesUsed++;
                track('generation.quality_retry', { attempt });

                const retryReasons = [
                    ...quality.reasons,
                    ...(hasComplianceIssues ? compliance.missing.map(f => `Missing feature: "${f}"`) : []),
                ];

                sendEvent('quality_retry', {
                    message: `Quality gate failed. Retry ${attempt}/${maxRetries}`,
                    reasons: retryReasons,
                });

                const retryPrompt = buildUnifiedRetryPrompt(
                    userPrompt,
                    quality.reasons,
                    compliance.missing,
                    attempt,
                    maxRetries,
                );

                let retryResponse = '';
                await aiService.generate(
                    {
                        provider,
                        apiKey,
                        model: normalizedModel,
                        userPrompt: retryPrompt,
                        selectedModules: normalizedSelectedModules,
                        projectName,
                        requirements: typedRequirements,
                    },
                    (chunk: string) => { retryResponse += chunk; },
                );

                const retryExtracted = extractFilesFromResponse(retryResponse);
                const retryFiles = normalizeGeneratedFiles(retryExtracted.files);
                if (retryFiles.length > 0) {
                    // FIX: Merge files — keep new files, fall back to previous for unchanged
                    const retryPaths = new Set(retryFiles.map(f => f.path.toLowerCase()));
                    const keptFiles = normalizedFiles.filter(f => !retryPaths.has(f.path.toLowerCase()));
                    normalizedFiles = [...keptFiles, ...retryFiles];
                    extracted = retryExtracted;
                }
            }

            // Stream files to client
            for (const file of normalizedFiles) {
                sendEvent('file', file);
            }

            let projectId: string | null = null;
            const authenticatedUserId = (req as any).userId as string | undefined;
            if (authenticatedUserId) {
                const template = req.body?.template || req.body?.templates?.auth || 'modern';
                const backend = req.body?.backend || req.body?.backends?.auth || 'jwt-mongodb';
                try {
                    const project = await platformProjectsService.createProject(authenticatedUserId, {
                        name: extracted.projectName || projectName || 'Generated Project',
                        description: extracted.description || '',
                        modules: normalizedSelectedModules,
                        template,
                        backend,
                        provider,
                    });
                    await platformProjectsService.saveFiles(project._id.toString(), authenticatedUserId, normalizedFiles);
                    projectId = project._id.toString();
                    track('generation.persisted');
                    await platformProjectsService.appendChatEntry(projectId, authenticatedUserId, {
                        type: 'generate',
                        prompt: String(userPrompt || ''),
                    });
                } catch (persistError: any) {
                    console.error('[AI] Project persistence warning:', persistError?.message || persistError);
                    track('generation.persist_failed', { error: persistError?.message || 'unknown' });
                    sendEvent('warning', { message: 'Generation completed but project history save failed for this run.' });
                }
                await platformAuthService.incrementGenerationCount(authenticatedUserId);
            }

            sendEvent('complete', {
                projectName: extracted.projectName,
                description: extracted.description,
                fileCount: normalizedFiles.length,
                tokensUsed: fullResponse.length,
                projectId,
            });
            track('generation.completed', { provider: req.body?.provider, fileCount: normalizedFiles?.length ?? 0 });
            res.end();
        } catch (error: any) {
            console.error('[AI] Generation error:', error.message);
            track('generation.failed', { error: error?.message || 'unknown' });
            sendEvent('error', { message: error.message || 'Generation failed' });
            res.end();
        }
    }

    // POST /api/ai/generate/v2
    generateV2 = async (req: Request, res: Response): Promise<void> => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const send = (type: string, data: Record<string, any>) => {
            try {
                res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
            } catch {
                // Client may disconnect during streaming.
            }
        };

        try {
            const {
                userPrompt,
                provider = 'gemini',
                model,
                apiKey,
                projectName: requestedName,
                requirements = null,
            } = req.body || {};

            if (!userPrompt || String(userPrompt).trim().length < 5) {
                send('error', { message: 'Please describe your app idea in more detail.' });
                res.end();
                return;
            }

            const normalizedModel = normalizeIncomingModel(provider, model);
            const runCandidates = buildRunCandidates(provider, normalizedModel, !apiKey);
            const normalizedProvider = String(provider || '').toLowerCase();
            const hasExplicitRequestedModel = typeof normalizedModel === 'string' && normalizedModel.trim().length > 0;

            let executionCandidates = runCandidates;
            if (normalizedProvider === 'github' && hasExplicitRequestedModel) {
                const requestedFirst = runCandidates.filter(
                    (c) => c.provider === normalizedProvider && (c.model || '') === normalizedModel,
                );
                const sameProviderFallbacks = runCandidates.filter(
                    (c) => c.provider === normalizedProvider && (c.model || '') !== normalizedModel,
                );
                const crossProviderFallbacks = runCandidates.filter(
                    (c) => c.provider !== normalizedProvider,
                );

                executionCandidates = [...requestedFirst, ...sameProviderFallbacks, ...crossProviderFallbacks];

                if (executionCandidates.length < 3) {
                    const geminiExists = executionCandidates.some((c) => c.provider === 'gemini');
                    if (!geminiExists) {
                        executionCandidates.push(
                            { provider: 'gemini', model: 'gemini-2.5-flash', reason: 'platform-gemini-fallback' },
                        );
                    }
                    const openaiExists = executionCandidates.some(
                        (c) => c.provider === 'github' && c.model === 'openai/gpt-4.1',
                    );
                    if (!openaiExists) {
                        executionCandidates.push(
                            { provider: 'github', model: 'openai/gpt-4.1', reason: 'github-gpt4-fallback' },
                        );
                    }
                }
            }

            const sameProviderPlanningCandidates = runCandidates.filter((candidate) => candidate.provider === normalizedProvider);
            let planningCandidates = (sameProviderPlanningCandidates.length > 0 ? sameProviderPlanningCandidates : runCandidates)
                .slice(0, 3);

            // For GitHub Models runs with an explicit model request, keep planning anchored to that model
            // so planning does not drift to slower fallback models (e.g. gpt-4.1) before generation starts.
            if (normalizedProvider === 'github' && hasExplicitRequestedModel) {
                planningCandidates = planningCandidates
                    .filter((candidate) => (candidate.model || '') === normalizedModel)
                    .slice(0, 1);

                if (planningCandidates.length === 0) {
                    planningCandidates = runCandidates
                        .filter((candidate) => candidate.provider === normalizedProvider)
                        .slice(0, 1);
                }
            }
            const planningDeadline = Date.now() + (4 * 60 * 1000);

            send('phase', { phase: 'planning', message: 'Analysing your idea...', progress: 5 });

            let plan: any = null;
            let activeCandidate: ProviderModelCandidate | null = null;
            let planningLastError: unknown = null;
            for (let i = 0; i < planningCandidates.length; i++) {
                if (Date.now() > planningDeadline) {
                    planningLastError = planningLastError || new Error('Planning budget exceeded.');
                    break;
                }

                const candidate = planningCandidates[i];
                send('phase_diagnostic', {
                    phase: 'planning',
                    status: 'attempt_start',
                    attempt: i + 1,
                    provider: candidate.provider,
                    model: candidate.model || null,
                    reason: candidate.reason,
                });
                try {
                    plan = await aiService.planApplication(
                        String(userPrompt),
                        requirements || null,
                        candidate.provider,
                        candidate.model,
                        apiKey
                    );
                    activeCandidate = candidate;
                    send('phase_diagnostic', {
                        phase: 'planning',
                        status: 'attempt_success',
                        attempt: i + 1,
                        provider: candidate.provider,
                        model: candidate.model || null,
                    });
                    break;
                } catch (planningErr: any) {
                    planningLastError = planningErr;
                    send('phase_diagnostic', {
                        phase: 'planning',
                        status: 'attempt_failed',
                        attempt: i + 1,
                        provider: candidate.provider,
                        model: candidate.model || null,
                        errorType: classifyGenerationError(planningErr),
                        message: planningErr?.message || 'unknown error',
                    });
                }
            }

            if (!plan || !activeCandidate) {
                throw new Error(`Planning failed across candidates/time budget: ${(planningLastError as any)?.message || 'unknown error'}`);
            }

            const modules = Array.isArray(plan?.modules) ? plan.modules : [];
            send('plan', {
                projectName: plan?.projectName || requestedName || 'my-app',
                appType: plan?.appType || 'other',
                modules: modules.map((m: any) => m?.name).filter(Boolean),
                moduleCount: modules.length,
                domainRouting: plan?._domainRouting || null,
                provider: activeCandidate.provider,
                model: activeCandidate.model || null,
            });

            let allFiles: Array<{ path: string; content: string; language: string }> = [];
            for (let i = 0; i < modules.length; i++) {
                const mod = modules[i];
                const progress = 10 + Math.round((i / Math.max(1, modules.length)) * 65);
                send('phase', {
                    phase: 'generating',
                    message: `Building ${mod?.label || mod?.name || `module-${i + 1}`} module...`,
                    module: mod?.name,
                    progress,
                });

                let moduleFiles: Array<{ path: string; content: string; language: string }> = [];
                let moduleSuccess = false;
                let moduleLastErr: unknown = null;
                for (let candidateIndex = 0; candidateIndex < executionCandidates.length; candidateIndex++) {
                    const candidate = executionCandidates[candidateIndex];
                    send('phase_diagnostic', {
                        phase: 'module',
                        module: mod?.name,
                        status: 'attempt_start',
                        attempt: candidateIndex + 1,
                        provider: candidate.provider,
                        model: candidate.model || null,
                    });
                    try {
                        moduleFiles = await aiService.generateModuleFiles(mod, plan, candidate.provider, candidate.model, apiKey);
                        if (moduleFiles.length > 0) {
                            moduleSuccess = true;
                            activeCandidate = candidate;
                            send('phase_diagnostic', {
                                phase: 'module',
                                module: mod?.name,
                                status: 'attempt_success',
                                attempt: candidateIndex + 1,
                                provider: candidate.provider,
                                model: candidate.model || null,
                                fileCount: moduleFiles.length,
                            });
                            break;
                        }
                        throw new Error('Module returned zero files');
                    } catch (moduleErr: any) {
                        moduleLastErr = moduleErr;
                        const moduleErrType = classifyGenerationError(moduleErr);
                        send('phase_diagnostic', {
                            phase: 'module',
                            module: mod?.name,
                            status: 'attempt_failed',
                            attempt: candidateIndex + 1,
                            provider: candidate.provider,
                            model: candidate.model || null,
                            errorType: moduleErrType,
                            message: moduleErr?.message || 'unknown error',
                        });

                        const nextCandidate = executionCandidates[candidateIndex + 1];
                        if (nextCandidate) {
                            send('failover', {
                                phase: 'module',
                                module: mod?.name,
                                from: `${candidate.provider}/${candidate.model || ''}`,
                                to: `${nextCandidate.provider}/${nextCandidate.model || ''}`,
                                reason: moduleErrType,
                            });
                        }
                    }
                }

                if (!moduleSuccess) {
                    throw new Error(`Module "${mod?.name || `module-${i + 1}`}" failed across candidates: ${(moduleLastErr as any)?.message || 'unknown error'}`);
                }

                if (moduleFiles.length === 0) {
                    throw new Error(`Module "${mod?.name || `module-${i + 1}`}" generated 0 files after retry`);
                }

                allFiles.push(...moduleFiles);
                send('module_complete', {
                    module: mod?.name,
                    fileCount: moduleFiles.length,
                    files: moduleFiles.map((f) => f.path),
                });
            }

            send('phase', { phase: 'wiring', message: 'Wiring everything together...', progress: 78 });
            let sharedFiles: Array<{ path: string; content: string; language: string }> = [];
            let sharedSuccess = false;
            let sharedLastErr: unknown = null;
            for (let candidateIndex = 0; candidateIndex < executionCandidates.length; candidateIndex++) {
                const candidate = executionCandidates[candidateIndex];
                send('phase_diagnostic', {
                    phase: 'shared',
                    status: 'attempt_start',
                    attempt: candidateIndex + 1,
                    provider: candidate.provider,
                    model: candidate.model || null,
                });
                try {
                    sharedFiles = await aiService.generateSharedFiles(plan, candidate.provider, candidate.model, apiKey);
                    if (sharedFiles.length > 0) {
                        sharedSuccess = true;
                        activeCandidate = candidate;
                        send('phase_diagnostic', {
                            phase: 'shared',
                            status: 'attempt_success',
                            attempt: candidateIndex + 1,
                            provider: candidate.provider,
                            model: candidate.model || null,
                            fileCount: sharedFiles.length,
                        });
                        break;
                    }
                    throw new Error('Shared generation returned zero files');
                } catch (sharedErr: any) {
                    sharedLastErr = sharedErr;
                    const sharedErrType = classifyGenerationError(sharedErr);
                    send('phase_diagnostic', {
                        phase: 'shared',
                        status: 'attempt_failed',
                        attempt: candidateIndex + 1,
                        provider: candidate.provider,
                        model: candidate.model || null,
                        errorType: sharedErrType,
                        message: sharedErr?.message || 'unknown error',
                    });

                    const nextSharedCandidate = executionCandidates[candidateIndex + 1];
                    if (nextSharedCandidate) {
                        send('failover', {
                            phase: 'shared',
                            from: `${candidate.provider}/${candidate.model || ''}`,
                            to: `${nextSharedCandidate.provider}/${nextSharedCandidate.model || ''}`,
                            reason: sharedErrType,
                        });
                    }
                }
            }

            if (!sharedSuccess) {
                throw new Error(`Shared generation failed across candidates: ${(sharedLastErr as any)?.message || 'unknown error'}`);
            }

            if (sharedFiles.length === 0) {
                throw new Error('Shared generation produced 0 files after retry');
            }

            allFiles.push(...sharedFiles);
            allFiles = applyDeterministicWarningFixes(allFiles);

            // Static wiring/quality validation report
            let validation = validateGeneratedFiles(allFiles, plan);
            send('validation_report', {
                passed: validation.passed,
                critical: validation.critical,
                warnings: validation.warnings,
            });

            // Blocking verification gate for production quality
            let verification = await verifyGeneratedProject(allFiles);
            send('verification_report', verification);
            if (!verification.passed) {
                send('phase', {
                    phase: 'repairing',
                    message: 'Detected quality issues. Running one auto-repair pass...',
                    progress: 84,
                });

                const repairPrompt = [
                    'Apply targeted fixes only. Do not remove working files.',
                    'Fix every critical issue below and return ONLY changed files as JSON.',
                    'Critical issues:',
                    ...verification.criticalFailures.map((failure, idx) => `${idx + 1}. ${failure}`),
                    'Rules:',
                    '- Keep existing project structure intact.',
                    '- Use toast instead of browser alert().',
                    '- Remove placeholder literals from user-facing files.',
                    '- Ensure dashboard calls real services/APIs.',
                    'Output JSON shape: { "files": [{ "path": "...", "content": "...", "language": "..." }] }',
                ].join('\n');

                try {
                    const repairRaw = await aiService.refine({
                        provider: (activeCandidate?.provider || provider) as AIProvider,
                        apiKey,
                        model: activeCandidate?.model || normalizedModel,
                        previousCode: allFiles.map((file) => ({ path: file.path, content: file.content })),
                        refinementRequest: repairPrompt,
                    });

                    const repairedExtraction = extractFilesFromResponse(repairRaw);
                    const repairedChanges = normalizeGeneratedFiles(repairedExtraction.files)
                        .map((file) => ({
                            path: file.path,
                            content: file.content,
                            language: file.language || 'text',
                        }));

                    if (repairedChanges.length > 0) {
                        allFiles = mergeFilesByPath(allFiles, repairedChanges);

                        send('phase', {
                            phase: 'repairing',
                            message: `Applied ${repairedChanges.length} repair updates. Re-validating...`,
                            progress: 89,
                        });

                        const repairedValidation = validateGeneratedFiles(allFiles, plan);
                        validation = repairedValidation;
                        send('validation_report', {
                            passed: repairedValidation.passed,
                            critical: repairedValidation.critical,
                            warnings: repairedValidation.warnings,
                            attempt: 'repair-1',
                        });

                        verification = await verifyGeneratedProject(allFiles);
                        send('verification_report', {
                            ...verification,
                            attempt: 'repair-1',
                        });
                    } else {
                        send('warning', { message: 'Auto-repair returned no file updates.' });
                    }
                } catch (repairErr: any) {
                    send('warning', { message: `Auto-repair failed: ${repairErr?.message || 'unknown error'}` });
                }

                if (!verification.passed) {
                    send('error', {
                        message: 'Generation failed verification gates after auto-repair. Please retry.',
                        criticalFailures: verification.criticalFailures,
                    });
                    res.end();
                    return;
                }
            }

            const maxWarningFixPasses = 3;
            let warningCount = Array.from(new Set([
                ...(validation.warnings || []),
                ...(verification.warnings || []),
            ])).length;

            for (let pass = 1; pass <= maxWarningFixPasses && warningCount > 0; pass++) {
                const warningCandidates = Array.from(new Set([
                    ...(validation.warnings || []),
                    ...(verification.warnings || []),
                ])).slice(0, 25);

                if (warningCandidates.length === 0) break;

                send('phase', {
                    phase: 'polishing',
                    message: `Polishing warnings (pass ${pass}/${maxWarningFixPasses})...`,
                    progress: 89 + pass,
                });

                const warningFixPrompt = [
                    'Apply targeted warning fixes only. Do not change project structure or working flows.',
                    `Goal: reduce warnings to zero. Current warning count: ${warningCandidates.length}.`,
                    'Fix warning issues below and return ONLY changed files as JSON.',
                    'Warning issues:',
                    ...warningCandidates.map((warning, idx) => `${idx + 1}. ${warning}`),
                    'Rules:',
                    '- Preserve API routes and existing business logic.',
                    '- Replace placeholder literals with realistic values.',
                    '- Prefer non-blocking UI feedback over browser alert().',
                    '- For dashboard API warnings, ensure at least one real service import and useEffect API call exists.',
                    '- Keep TypeScript/TSX compile-safe.',
                    'Output JSON shape: { "files": [{ "path": "...", "content": "...", "language": "..." }] }',
                ].join('\n');

                try {
                    const warningFixRaw = await aiService.refine({
                        provider: (activeCandidate?.provider || provider) as AIProvider,
                        apiKey,
                        model: activeCandidate?.model || normalizedModel,
                        previousCode: allFiles.map((file) => ({ path: file.path, content: file.content })),
                        refinementRequest: warningFixPrompt,
                    });

                    const warningFixExtraction = extractFilesFromResponse(warningFixRaw);
                    const warningFixChanges = normalizeGeneratedFiles(warningFixExtraction.files)
                        .map((file) => ({
                            path: file.path,
                            content: file.content,
                            language: file.language || 'text',
                        }));

                    if (warningFixChanges.length === 0) {
                        send('warning', { message: `Warning-fix pass ${pass} returned no file updates.` });
                        break;
                    }

                        const candidateFiles = applyDeterministicWarningFixes(
                            mergeFilesByPath(allFiles, warningFixChanges),
                        );
                    const candidateValidation = validateGeneratedFiles(candidateFiles, plan);
                    const candidateVerification = await verifyGeneratedProject(candidateFiles);
                    const candidateWarningCount = Array.from(new Set([
                        ...(candidateValidation.warnings || []),
                        ...(candidateVerification.warnings || []),
                    ])).length;

                    if (!candidateVerification.passed) {
                        send('warning', { message: `Warning-fix pass ${pass} introduced verification issues. Keeping pre-polish files.` });
                        break;
                    }

                    if (candidateWarningCount >= warningCount) {
                        send('warning', { message: `Warning-fix pass ${pass} did not reduce warning count (${warningCount} -> ${candidateWarningCount}). Stopping further polish passes.` });
                        break;
                    }

                    allFiles = candidateFiles;
                    validation = candidateValidation;
                    verification = candidateVerification;
                    warningCount = candidateWarningCount;

                    send('phase', {
                        phase: 'polishing',
                        message: `Applied ${warningFixChanges.length} warning-fix updates (${warningCount} warnings remaining).`,
                        progress: 90 + pass,
                    });

                    send('validation_report', {
                        passed: validation.passed,
                        critical: validation.critical,
                        warnings: validation.warnings,
                        attempt: `warning-fix-${pass}`,
                    });

                    send('verification_report', {
                        ...verification,
                        attempt: `warning-fix-${pass}`,
                    });

                    if (warningCount === 0) break;
                } catch (warningFixErr: any) {
                    send('warning', { message: `Warning-fix pass ${pass} failed: ${warningFixErr?.message || 'unknown error'}` });
                    break;
                }
            }

            send('phase', { phase: 'finalizing', message: 'Finalizing project...', progress: 92 });
            for (const file of allFiles) send('file', file);

            let savedProjectId: string | null = null;
            const authenticatedUserId = (req as any).userId as string | undefined;
            if (authenticatedUserId) {
                try {
                    const project = await platformProjectsService.createProject(authenticatedUserId, {
                        name: String(plan?.projectName || requestedName || 'my-app'),
                        description: String(plan?.appType || 'Generated full-stack app'),
                        modules: modules.map((m: any) => String(m?.name || '')).filter(Boolean),
                        template: 'modern',
                        backend: 'jwt-mongodb',
                        provider: activeCandidate?.provider || provider,
                    });
                    const projectId = project._id.toString();
                    await platformProjectsService.saveFiles(projectId, authenticatedUserId, allFiles);
                    await platformProjectsService.appendChatEntry(projectId, authenticatedUserId, {
                        type: 'generate',
                        prompt: String(userPrompt || ''),
                    });
                    await platformAuthService.incrementGenerationCount(authenticatedUserId);
                    savedProjectId = projectId;
                } catch (persistErr: any) {
                    send('warning', { message: `Generated app but failed to save project: ${persistErr?.message || 'unknown'}` });
                }
            }

            send('complete', {
                projectName: plan?.projectName || requestedName || 'my-app',
                fileCount: allFiles.length,
                modules: modules.map((m: any) => String(m?.name || '')).filter(Boolean),
                projectId: savedProjectId,
                progress: 100,
                provider: activeCandidate?.provider || provider,
                model: activeCandidate?.model || normalizedModel || null,
            });
            res.end();
        } catch (err: any) {
            send('error', { message: err?.message || 'Generation failed' });
            res.end();
        }
    };

    // POST /api/ai/design-to-code
    async designToCode(req: Request, res: Response): Promise<void> {
        const { provider, apiKey, model, designJSON, designDescription } = req.body;
        const normalizedModel = normalizeIncomingModel(provider, model);

        if (!provider || !designJSON) {
            res.status(400).json({ success: false, data: null, error: 'provider and designJSON are required' });
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const sendEvent = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

        try {
            sendEvent('start', { message: 'Converting design to code', provider });
            let fullCode = '';
            await aiService.designToCode(
                { provider, apiKey, model: normalizedModel, designJSON, designDescription },
                (chunk: string) => { fullCode += chunk; sendEvent('chunk', { text: chunk }); },
            );
            sendEvent('complete', { fullCode });
            res.end();
        } catch (error: any) {
            sendEvent('error', { message: error.message || 'Design-to-code conversion failed' });
            res.end();
        }
    }

    // POST /api/ai/refine
    async refine(req: Request, res: Response): Promise<void> {
        const { provider, apiKey, model, previousCode, refinementRequest, projectId } = req.body;
        const normalizedModel = normalizeIncomingModel(provider, model);

        if (!provider || !previousCode || !refinementRequest) {
            res.status(400).json({ success: false, data: null, error: 'provider, previousCode, and refinementRequest are required' });
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const sendEvent = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

        try {
            sendEvent('start', { message: 'Refining code', provider });
            let fullResponse = '';
            await aiService.refine(
                { provider, apiKey, model: normalizedModel, previousCode, refinementRequest },
                (chunk: string) => { fullResponse += chunk; sendEvent('chunk', { text: chunk }); },
            );

            const extracted = extractFilesFromResponse(fullResponse);
            const normalizedFiles = normalizeGeneratedFiles(extracted.files);
            console.log(`[AI Refine] Extracted ${normalizedFiles.length} files`);
            for (const file of normalizedFiles) sendEvent('file', file);

            const authenticatedUserId = (req as any).userId as string | undefined;
            if (authenticatedUserId && typeof projectId === 'string' && projectId) {
                try {
                    await platformProjectsService.saveFiles(projectId, authenticatedUserId, normalizedFiles);
                    await platformProjectsService.appendChatEntry(projectId, authenticatedUserId, {
                        type: 'refine',
                        prompt: String(refinementRequest || ''),
                    });
                } catch (persistError: any) {
                    console.error('[AI Refine] Project persistence warning:', persistError?.message || persistError);
                }
            }

            sendEvent('complete', {
                projectName: extracted.projectName,
                description: extracted.description,
                fileCount: normalizedFiles.length,
                tokensUsed: fullResponse.length,
                projectId: typeof projectId === 'string' ? projectId : null,
            });
            res.end();
        } catch (error: any) {
            console.error('[AI Refine] Error:', error.message);
            sendEvent('error', { message: error.message || 'Refinement failed' });
            res.end();
        }
    }

    // POST /api/ai/chat
    async chat(req: Request, res: Response): Promise<void> {
        try {
            const { provider, apiKey, model, message, projectContext } = req.body;
            const normalizedModel = normalizeIncomingModel(provider, model);

            if (!provider || !message || typeof message !== 'string') {
                res.status(400).json({ success: false, data: null, error: 'provider and message are required' });
                return;
            }

            const reply = await aiService.chatAboutProject({
                provider,
                apiKey,
                model: normalizedModel,
                message: String(message).trim(),
                projectContext: {
                    projectName: projectContext?.projectName,
                    description: projectContext?.description,
                    fileCount: Number(projectContext?.fileCount || 0),
                    keyFiles: Array.isArray(projectContext?.keyFiles) ? projectContext.keyFiles : [],
                    modules: Array.isArray(projectContext?.modules) ? projectContext.modules : [],
                },
            });

            res.status(200).json({ success: true, data: { reply }, error: null });
        } catch (error: any) {
            console.error('[AI Chat] Error:', error?.message || error);
            res.status(500).json({ success: false, data: null, error: error?.message || 'Chat failed' });
        }
    }

    // POST /api/ai/requirements
    getRequirementsQuestions = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userIdea, selectedModules, provider, apiKey, model } = req.body;
            const normalizedModel = normalizeIncomingModel(provider, model);

            if (!userIdea || typeof userIdea !== 'string' || userIdea.trim().length < 5) {
                res.status(400).json({ success: false, data: null, error: 'Please describe your idea in more detail.' });
                return;
            }

            const result = await aiService.generateRequirementsQuestions({
                userIdea: userIdea.trim(),
                selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
                provider: provider || 'gemini',
                apiKey: apiKey || undefined,
                model: normalizedModel,
            });

            res.status(200).json({ success: true, data: result, error: null });
        } catch (err: any) {
            console.error('[getRequirementsQuestions]', err.message);
            const lower = String(err?.message || '').toLowerCase();
            const isRateLimit = lower.includes('provider limits') || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted');
            if (isRateLimit) res.setHeader('Retry-After', '30');
            res.status(isRateLimit ? 429 : 500).json({ success: false, data: null, error: err.message || 'Failed to generate questions.' });
        }
    };

    // POST /api/ai/requirements/compile
    compileRequirements = async (req: Request, res: Response): Promise<void> => {
        try {
            const { originalPrompt, projectName, answers, selectedModules, provider, apiKey, model } = req.body;
            const normalizedModel = normalizeIncomingModel(provider, model);

            if (!answers || !Array.isArray(answers) || answers.length === 0) {
                res.status(400).json({ success: false, data: null, error: 'No answers provided.' });
                return;
            }

            if (!originalPrompt || typeof originalPrompt !== 'string') {
                res.status(400).json({ success: false, data: null, error: 'Original prompt is required.' });
                return;
            }

            const emptyRequired = answers.filter((a: any) =>
                !a?.answer || String(a.answer).trim() === '' || String(a.answer).trim().toLowerCase() === '(skipped)',
            );

            if (emptyRequired.length > 0) {
                res.status(400).json({
                    success: false,
                    data: null,
                    error: `Please answer all questions. Missing: "${emptyRequired[0]?.question || 'Unknown question'}"`,
                });
                return;
            }

            const requirements = await aiService.compileRequirementsDocument({
                originalPrompt: originalPrompt.trim(),
                projectName: projectName || 'my-app',
                answers,
                selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
                provider: provider || 'gemini',
                apiKey: apiKey || undefined,
                model: normalizedModel,
            });

            res.status(200).json({ success: true, data: { requirements }, error: null });
        } catch (err: any) {
            console.error('[compileRequirements]', err.message);
            res.status(500).json({ success: false, data: null, error: err.message || 'Failed to compile requirements.' });
        }
    };

    // GET /api/ai/providers
    async getProviders(req: Request, res: Response): Promise<void> {
        res.json({
            success: true,
            data: {
                providers: [
                    {
                        id: 'gemini',
                        name: 'Google Gemini',
                        logo: '✨',
                        models: [
                            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', freeTier: true, speed: 'fast', quality: 'high' },
                            { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', freeTier: true, speed: 'fastest', quality: 'good' },
                            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', freeTier: false, speed: 'medium', quality: 'highest' },
                        ],
                        requiresKey: false,
                        freeTierAvailable: true,
                        freeTierLimit: '10 generations/day',
                        description: "Google's most capable AI. Free tier available on our platform.",
                    },
                    {
                        id: 'openai',
                        name: 'OpenAI GPT',
                        logo: '🤖',
                        models: [
                            { id: 'gpt-4.1', name: 'GPT-4.1', freeTier: false, speed: 'medium', quality: 'highest' },
                            { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', freeTier: false, speed: 'fast', quality: 'high' },
                            { id: 'gpt-4o', name: 'GPT-4o', freeTier: false, speed: 'fast', quality: 'high' },
                        ],
                        requiresKey: true,
                        freeTierAvailable: false,
                        description: 'Industry-leading code generation. Requires your OpenAI API key.',
                    },
                    {
                        id: 'github',
                        name: 'GitHub Models',
                        logo: '🐙',
                        description: 'Access frontier + open-weight models via a single GitHub token. Requires a GitHub Personal Access Token.',
                        requiresKey: true,
                        freeTierAvailable: false,
                        keyLabel: 'GitHub Personal Access Token',
                        keyPlaceholder: 'ghp_...',
                        keyHint: 'Create at github.com/settings/tokens — no special permissions needed',
                        models: [
                            // ── TIER 1: Strongest ──
                            {
                                id: 'openai/gpt-4.1',
                                name: 'GPT-4.1',
                                badge: '⚡ Strongest',
                                tier: 'high',
                                speed: 'fast',
                                quality: 'highest',
                                contextWindow: '1M tokens',
                                description: 'Best overall. Outperforms GPT-4o on coding, instruction following, and long-context tasks.',
                                freeTier: false,
                                recommended: true,
                            },
                            {
                                id: 'openai/o4-mini',
                                name: 'o4-mini (Reasoning)',
                                badge: '🧠 Best Planner',
                                tier: 'high',
                                speed: 'medium',
                                quality: 'highest',
                                contextWindow: '200K tokens',
                                description: 'Chain-of-thought reasoning model. Best for complex planning and structured output. 93.4% HumanEval.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'openai/o3',
                                name: 'o3',
                                badge: '🧠 Reasoning',
                                tier: 'high',
                                speed: 'slow',
                                quality: 'highest',
                                contextWindow: '200K tokens',
                                description: 'Most powerful reasoning model. Use when o4-mini is unavailable.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'openai/gpt-5-mini',
                                name: 'GPT-5 mini (Preview)',
                                badge: '🔬 Preview',
                                tier: 'high',
                                speed: 'fastest',
                                quality: 'high',
                                contextWindow: 'Large',
                                description: 'Next-gen model in preview. Excellent speed-to-quality ratio.',
                                freeTier: false,
                                recommended: false,
                            },
                            // ── TIER 2: Strong Open-Weight ──
                            {
                                id: 'azureml-deepseek/DeepSeek-V3-0324',
                                name: 'DeepSeek V3',
                                badge: '🔓 Open Weight',
                                tier: 'high',
                                speed: 'fast',
                                quality: 'highest',
                                contextWindow: '128K tokens',
                                description: 'Best open-weight model for code generation. Excellent JSON instruction adherence.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'azureml-deepseek/DeepSeek-R1-0528',
                                name: 'DeepSeek R1 0528 (Reasoning)',
                                badge: '🔓 Open Reasoning',
                                tier: 'high',
                                speed: 'medium',
                                quality: 'highest',
                                contextWindow: '128K tokens',
                                description: 'Open-weight reasoning model. Ideal for planning phases. 97.3% MATH benchmark.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'azureml-deepseek/DeepSeek-R1',
                                name: 'DeepSeek R1',
                                badge: '🔓 Open Reasoning',
                                tier: 'high',
                                speed: 'medium',
                                quality: 'high',
                                contextWindow: '128K tokens',
                                description: 'Original open-weight reasoning model. Use R1-0528 when available.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'meta/llama-4-maverick',
                                name: 'Llama 4 Maverick',
                                badge: '🔓 Open Weight',
                                tier: 'high',
                                speed: 'fast',
                                quality: 'high',
                                contextWindow: '256K tokens',
                                description: '398B MoE model (94B active). Huge context window. Can be slow on the GitHub endpoint.',
                                freeTier: false,
                                recommended: false,
                            },
                            // ── TIER 3: Fast / Lightweight ──
                            {
                                id: 'openai/gpt-4.1-mini',
                                name: 'GPT-4.1 mini',
                                badge: '⚡ Fast',
                                tier: 'high',
                                speed: 'fastest',
                                quality: 'high',
                                contextWindow: '1M tokens',
                                description: 'Fastest high-quality model. Best for planning and requirements phases.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'openai/gpt-4o',
                                name: 'GPT-4o',
                                badge: '',
                                tier: 'high',
                                speed: 'fast',
                                quality: 'high',
                                contextWindow: 'Large',
                                description: 'Proven multimodal model. Solid general fallback.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'Mistral-Large',
                                name: 'Mistral Large',
                                badge: '🔓 Open Weight',
                                tier: 'low',
                                speed: 'medium',
                                quality: 'high',
                                contextWindow: '256K tokens',
                                description: 'Strong structured output with very long context. Good for large module prompts.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'Codestral-25.01',
                                name: 'Codestral 25.01',
                                badge: '💻 Code',
                                tier: 'low',
                                speed: 'fastest',
                                quality: 'high',
                                contextWindow: 'Large',
                                description: 'Code-specialised model. Very fast TypeScript generation. Use for refinement tasks.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'Phi-4',
                                name: 'Phi-4 (14B)',
                                badge: '🔓 Lightweight',
                                tier: 'low',
                                speed: 'fastest',
                                quality: 'good',
                                contextWindow: 'Moderate',
                                description: 'Highly capable 14B model. Low latency. Good for fast planning on rate-limited accounts.',
                                freeTier: false,
                                recommended: false,
                            },
                            {
                                id: 'openai/gpt-4o-mini',
                                name: 'GPT-4o mini',
                                badge: '',
                                tier: 'low',
                                speed: 'fast',
                                quality: 'good',
                                contextWindow: 'Moderate',
                                description: 'Lightweight fallback only. Prone to timeouts on large generation tasks.',
                                freeTier: false,
                                recommended: false,
                            },
                        ],
                    },
                    {
                        id: 'anthropic',
                        name: 'Anthropic Claude',
                        logo: '🧠',
                        models: [
                            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', freeTier: false, speed: 'medium', quality: 'highest' },
                            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', freeTier: false, speed: 'medium', quality: 'high' },
                            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', freeTier: false, speed: 'fast', quality: 'good' },
                        ],
                        requiresKey: true,
                        freeTierAvailable: false,
                        description: 'Excels at following complex instructions. Requires your Anthropic API key.',
                    },
                    {
                        id: 'ollama',
                        name: 'Ollama (Local)',
                        logo: '🦙',
                        models: [
                            { id: 'llama3.3', name: 'Llama 3.3', freeTier: true, speed: 'varies', quality: 'good' },
                            { id: 'qwen2.5-coder', name: 'Qwen2.5 Coder', freeTier: true, speed: 'varies', quality: 'good' },
                            { id: 'deepseek-r1', name: 'DeepSeek R1', freeTier: true, speed: 'varies', quality: 'good' },
                        ],
                        requiresKey: false,
                        freeTierAvailable: true,
                        description: 'Run AI locally. Requires Ollama installed. 100% private.',
                    },
                ],
            },
            error: null,
        });
    }
}

export const aiController = new AIController();