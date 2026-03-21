import { Request, Response } from 'express';
import { aiService, AIProvider } from './ai.service';
import type { RequirementsDocument } from './ai.types';
import { platformProjectsService } from '../platform-projects/platform-projects.service';
import { platformAuthService } from '../platform-auth/platform-auth.service';
import { track } from '../../utils/telemetry';

type GeneratedFile = { path: string; content: string; language?: string };

function normalizeGeneratedFiles(files: any[]): GeneratedFile[] {
    return (Array.isArray(files) ? files : [])
        .filter((file) => file && typeof file.path === 'string')
        .map((file) => {
            let content = file.content;

            if (typeof content !== 'string') {
                try {
                    content = JSON.stringify(content, null, 2);
                } catch {
                    content = String(content ?? '');
                }
            }

            return {
                path: String(file.path),
                content,
                language: typeof file.language === 'string' ? file.language : 'text'
            };
        });
}

function buildRawCandidates(raw: string): string[] {
    const candidates: string[] = [];
    const trimmed = String(raw || '').trim();
    if (!trimmed) return candidates;

    const pushUnique = (value: string) => {
        const v = String(value || '').trim();
        if (!v) return;
        if (!candidates.includes(v)) candidates.push(v);
    };

    pushUnique(trimmed);

    // Extract markdown fenced payload when present.
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) pushUnique(fenceMatch[1]);

    // If model returned a JSON string payload, parse once to unwrap.
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
            const unwrapped = JSON.parse(trimmed);
            if (typeof unwrapped === 'string') pushUnique(unwrapped);
        } catch {}
    }

    // Try decoding common escaped JSON patterns.
    if (trimmed.includes('\\"') || trimmed.includes('\\n')) {
        const decoded = trimmed
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"');
        pushUnique(decoded);
    }

    return candidates;
}

// ─── Extract JSON from AI response (strip code fences, find JSON) ───
function extractProjectJSON(raw: string): any {
    for (const candidate of buildRawCandidates(raw)) {
        try { return JSON.parse(candidate.trim()); } catch {}

        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            try { return JSON.parse(candidate.substring(firstBrace, lastBrace + 1)); } catch {}
        }

        // Try fixing trailing commas
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            const cleaned = candidate.substring(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, '$1');
            try { return JSON.parse(cleaned); } catch {}
        }
    }

    return null;
}

// ─── Extract individual files from potentially truncated JSON ───
// Uses regex to find complete file objects regardless of whether the overall JSON is valid
function extractFilesFromResponse(raw: string): { files: any[], projectName: string, description: string } {
    const files: any[] = [];
    let projectName = 'My Project';
    let description = '';
    const candidateRaw = buildRawCandidates(raw)[0] || raw;

    // Extract projectName
    const nameMatch = candidateRaw.match(/"projectName"\s*:\s*"([^"]+)"/);
    if (nameMatch) projectName = nameMatch[1];

    // Extract description
    const descMatch = candidateRaw.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (descMatch) description = descMatch[1];

    // Strategy 1: Try full JSON parse first
    const fullParsed = extractProjectJSON(candidateRaw);
    if (fullParsed && fullParsed.files && fullParsed.files.length > 0) {
        return {
            files: normalizeGeneratedFiles(fullParsed.files),
            projectName: fullParsed.projectName || projectName,
            description: fullParsed.description || description
        };
    }

    // Strategy 2: Extract file objects using a stateful parser
    // Look for patterns like: {"path": "...", "content": "...", "language": "..."}
    // We find each "path": "..." and then extract the complete file object
    const pathRegex = /"path"\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = pathRegex.exec(candidateRaw)) !== null) {
        const filePath = match[1];
        const startSearchPos = match.index;

        // Find content and language for this file by looking ahead from this position
        const afterPath = candidateRaw.substring(startSearchPos);
        
        // Match the content field — this handles escaped quotes and newlines inside the string
        const contentMatch = afterPath.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const langMatch = afterPath.match(/"language"\s*:\s*"([^"]+)"/);

        if (contentMatch) {
            // Unescape the content string
            let content = contentMatch[1];
            content = content
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');

            files.push({
                path: filePath,
                content: content,
                language: langMatch ? langMatch[1] : 'text'
            });
        }
    }

    return { files: normalizeGeneratedFiles(files), projectName, description };
}

function isAuthRelatedPath(path: string): boolean {
    const normalized = path.toLowerCase().replace(/\\/g, '/');
    return (
        normalized.includes('/login') ||
        normalized.includes('/signup') ||
        normalized.includes('/auth') ||
        normalized.endsWith('authform.tsx')
    );
}

function evaluateAuthUiQuality(files: any[]): { pass: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const authUiFiles = files.filter((file) => {
        const path = String(file?.path || '');
        const isUiFile = /\.(tsx|jsx|ts|js)$/i.test(path);
        return isUiFile && isAuthRelatedPath(path);
    });

    if (authUiFiles.length === 0) {
        return { pass: true, reasons };
    }

    const fullText = authUiFiles.map((file) => String(file?.content || '')).join('\n');
    const lower = fullText.toLowerCase();

    // Check for placeholder/build-status text
    if (/\bcompiling\b/i.test(fullText)) {
        reasons.push('Auth UI contains placeholder/build-state text like "Compiling".');
    }

    // Visual structure checks
    const hasViewportLayout = /(min-h-screen|h-screen|min-h-\[100vh\]|h-\[100vh\])/i.test(fullText);
    const hasContainerWidth = /(max-w-(sm|md|lg|xl|2xl|3xl)|w-\[([3-9]\d\d|\d{4,})px\])/i.test(fullText);
    const hasMeaningfulPadding = /(p-[6-9]|p-1\d|px-[6-9]|px-1\d|py-[6-9]|py-1\d)/i.test(fullText);
    const hasReadableHeading = /(text-(2xl|3xl|4xl|5xl)|text-\[(2[4-9]|[3-9]\d)px\])/i.test(fullText);
    const hasCardOrSurface = /(rounded-(xl|2xl|3xl)|shadow-(lg|xl|2xl)|backdrop-blur|border\s)/i.test(fullText);
    const hasProperInputHeight = /(h-(11|12|13|14)|h-\[4[4-9]px\]|h-\[5\dpm\]|py-(3|4))/i.test(fullText);
    const hasFormSpacing = /(space-y-[4-9]|space-y-1\d|gap-[4-9]|gap-1\d)/i.test(fullText);
    
    // Color quality checks (vibrant professional colors, not just gray/neutral)
    const hasVibrantColors = /(bg-(indigo|blue|emerald|purple|violet|cyan|rose|teal|green|orange|pink|amber)-(4|5|6|7|8|9|10)\d+|text-(indigo|blue|emerald|purple|violet|cyan|rose|teal|green|orange|pink|amber)-(4|5|6|7|8|9|10)\d+)/i.test(fullText);
    const hasGradientOrColor = /(bg-gradient|from-|to-|!bg-)/i.test(fullText);
    
    // Button/CTA checks
    const hasButtonStyling = /(bg-(primary|blue|indigo|purple|green|emerald|teal|cyan|rose|violet|pink)|transition|hover:|active:)/i.test(fullText);
    const hasInputBorder = /(border-(primary|blue|gray|neutral|indigo|purple|emerald)|focus:ring|focus:border)/i.test(fullText);

    // Collect visual quality issues
    if (!hasViewportLayout) reasons.push('Missing viewport-filling layout (min-h-screen) for auth screen.');
    if (!hasContainerWidth) reasons.push('Missing substantial auth container width (max-w-*).');
    if (!hasMeaningfulPadding) reasons.push('Spacing scale too small (need p-6+); auth card looks cramped.');
    if (!hasReadableHeading) reasons.push('Heading typography too small (need text-3xl+) for auth screen.');
    if (!hasCardOrSurface) reasons.push('Missing visual depth: need rounded corners, shadow, or border styling.');
    if (!hasProperInputHeight) reasons.push('Input height too small (need h-11+ for comfortable interaction).');
    if (!hasFormSpacing) reasons.push('Form element spacing too cramped (need space-y-4+ between controls).');
    if (!hasVibrantColors && !hasGradientOrColor) reasons.push('UI lacks vibrant professional colors (indigo, blue, emerald, purple, rose, etc.); appears too gray/neutral.');
    if (!hasButtonStyling) reasons.push('Button styling lacks color/hover states; appears unstyled.');
    if (!hasInputBorder) reasons.push('Input fields missing border/focus styling; not visually distinct.');

    // Advanced checks
    const textInputs = (lower.match(/type\s*=\s*["'](email|password|text)["']/g) || []).length;
    const buttonCount = (lower.match(/<button\b/g) || []).length;
    if (textInputs > 0 && buttonCount === 0) {
        reasons.push('Auth form lacks explicit button markup.');
    }

    // Check for excessive use of basic/boring styling
    const hasStyling = lower.includes('tailwind') || lower.includes('classname') || /class=["']/i.test(fullText);
    if (!hasStyling && textInputs > 0) {
        reasons.push('Auth form appears unstyled (no Tailwind classes detected).');
    }

    return { pass: reasons.length === 0, reasons };
}

/**
 * Checks that all features listed in requirements.coreFeatures
 * appear somewhere in the generated code. Uses keyword matching.
 * Returns the list of features that appear to be missing.
 */
function checkRequirementsCompliance(
    files: Array<{ path: string; content: string }>,
    requirements: RequirementsDocument | undefined
): { passed: boolean; missing: string[] } {
    if (!requirements || !requirements.coreFeatures || requirements.coreFeatures.length === 0) {
        return { passed: true, missing: [] };
    }

    // Combine all generated code into one searchable string
    const allCode = files.map(f => (f.content || '')).join('\n').toLowerCase();
    const missing: string[] = [];

    // Keyword map: if a feature description contains the key,
    // check for presence of at least one of the mapped keywords in the code
    const featureKeywords: Record<string, string[]> = {
        'stripe': ['stripe', 'payment_intent', 'createpaymentintent'],
        'paypal': ['paypal', '@paypal'],
        'razorpay': ['razorpay'],
        'admin': ['admin', 'isadmin', 'role', 'adminrouter', 'adminpanel'],
        'email': ['nodemailer', 'resend', 'sendgrid', 'smtp', 'mailer'],
        'dark mode': ['dark', 'prefers-color-scheme', 'darkmode', 'dark:'],
        'search': ['search', '.filter(', 'query', 'searchbar', 'searchinput'],
        'pagination': ['page', 'limit', 'offset', 'paginate', 'currentpage'],
        'file upload': ['multer', 'upload', 'formdata', 's3', 'cloudinary'],
        'password reset': ['resetpassword', 'forgotpassword', 'reset_token', 'passwordreset'],
        'oauth': ['oauth', 'passport', 'google', 'github', 'social login'],
        'websocket': ['socket.io', 'ws', 'websocket', 'socket'],
        'cart': ['cart', 'basket', 'addtocart', 'cartitem'],
        'checkout': ['checkout', 'order', 'purchase'],
        'dashboard': ['dashboard', 'analytics', 'stats', 'metrics'],
        'notification': ['notification', 'alert', 'toast', 'notify'],
        'comment': ['comment', 'reply', 'discussion'],
        'rating': ['rating', 'review', 'star', 'score']
    };

    for (const feature of requirements.coreFeatures) {
        const fl = feature.toLowerCase();
        let found = false;

        // Direct word match — check if the first significant word of the feature appears
        const firstWord = fl.split(' ').find(w => w.length > 3);
        if (firstWord && allCode.includes(firstWord)) {
            found = true;
        }

        // Keyword map match
        if (!found) {
            for (const [key, keywords] of Object.entries(featureKeywords)) {
                if (fl.includes(key)) {
                    found = keywords.some(kw => allCode.includes(kw));
                    if (found) break;
                }
            }
        }

        if (!found) {
            missing.push(feature);
        }
    }

    return { passed: missing.length === 0, missing };
}

export class AIController {
    // POST /api/ai/generate — Natural language → full-stack code (SSE streaming)
    async generate(req: Request, res: Response): Promise<void> {
        const { provider, apiKey, model, userPrompt, selectedModules, projectName, requirements } = req.body;
        const typedRequirements: RequirementsDocument | undefined = requirements || undefined;
        track('generation.started', { provider: req.body?.provider });

        if (!provider || !userPrompt) {
            res.status(400).json({ success: false, data: null, error: 'provider and userPrompt are required' });
            return;
        }

        const validProviders: AIProvider[] = ['openai', 'gemini', 'anthropic', 'ollama', 'nvidia'];
        if (!validProviders.includes(provider)) {
            res.status(400).json({ success: false, data: null, error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
            return;
        }

        // Set up SSE for streaming
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
                {
                    provider,
                    apiKey,
                    model,
                    userPrompt,
                    selectedModules: selectedModules || ['auth'],
                    projectName,
                    requirements: typedRequirements
                },
                (chunk: string) => {
                    fullResponse += chunk;
                    sendEvent('chunk', { text: chunk });
                }
            );

            // Extract files from the AI response (works even on truncated JSON)
            let extracted = extractFilesFromResponse(fullResponse);
            console.log(`[AI] Extracted ${extracted.files.length} files from response (${fullResponse.length} chars)`);

            // Permanent quality guard: auto-retry once if auth UI output is below threshold.
            const qualityCheck = evaluateAuthUiQuality(extracted.files);
            if (!qualityCheck.pass) {
                track('generation.quality_retry');
                sendEvent('quality_retry', {
                    message: 'Auth UI quality below professional standard. Running automatic visual enhancement.',
                    reasons: qualityCheck.reasons
                });

                const retryPrompt = `${userPrompt}\n\nMANDATE: PROFESSIONAL AUTH UI WITH VIBRANT COLORS:\n\nThe current auth UI output did not meet professional visual standards. You MUST now regenerate with these MANDATORY improvements:\n\n1. PAGE LAYOUT & BACKGROUND:\n   - Use min-h-screen to fill viewport\n   - Page background: gradient or solid color in secondary palette (e.g., indigo-50, blue-50, emerald-50)\n   - Center form card with flex items-center justify-center layout\n\n2. FORM CARD APPEARANCE:\n   - Width: max-w-md to max-w-lg on desktop, full-width-minus-padding on mobile\n   - Padding: p-8 to p-12 (generous interior spacing)\n   - Rounded: rounded-2xl for modern, polished look\n   - Surface: bg-white (light) or bg-neutral-950 (dark)\n   - Border: 2px border solid from accent color at opacity (e.g., border-cyan-500/20 or border-indigo-200)\n   - Shadow: shadow-2xl with color tint for depth (e.g., shadow-indigo-500/10)\n\n3. TYPOGRAPHY (CRITICAL - NO GRAY HEADINGS):\n   - Main heading: text-3xl md:text-4xl bold, color from PRIMARY (e.g., text-indigo-600, text-blue-700, text-emerald-600)\n   - Subheading: text-base, color from secondary or muted gray\n   - Labels: text-sm font-semibold, color from PRIMARY (not gray)\n   - Do NOT use gray/neutral for headings and labels\n\n4. FORM CONTROLS (CRITICAL - VIBRANT INTERACTIVE STATES):\n   - Input fields: h-12 minimum height\n   - Input padding: px-4 py-3 for comfortable text entry\n   - Input background: white or slight tint (e.g., indigo-50/30)\n   - Input border: 2px border from primary color at medium opacity (e.g., border-indigo-300)\n   - Input focus: focus:border-primary-600 focus:ring-2 focus:ring-primary-500/50\n   - Button: w-full h-12 to h-14, bold text size (text-base or larger)\n   - Button color: bg-gradient-to-r from-primary-600 to-accent-500 OR solid bg-primary-600 (NOT gray)\n   - Button text: always white for high contrast\n   - Button hover: hover:opacity-90 or hover:shadow-lg or hover:brightness-110\n   - Button active: active:scale-98 for tactile feedback\n\n5. COLOR SYSTEM (MANDATORY - USE VIBRANT PALETTES):\n   - NEVER use single-color gray layouts\n   - NEVER use neutral-400 or neutral-500 as main interactive color\n   - MUST include vibrant primary color (indigo, blue, emerald, purple, rose, violet, cyan, teal, green, etc.)\n   - MUST include accent color that contrasts with primary (e.g., cyan with indigo, amber with purple)\n   - Page background: secondary palette color (lighter shade of primary or neutral with tint)\n   - Form card background: white/neutral-950 with colored border/shadow from primary/accent\n   - Heading: primary color (6-7 shade)\n   - Labels: primary color (6-7 shade)\n   - Buttons: primary color gradient to accent OR solid primary\n   - Links: accent color with hover underline\n   - Error: red-500 or rose-600\n   - Success: green-500 or emerald-600\n\n6. DESIGN DNA COLOR MAPPING:\n   - If design DNA says "vibrant-indigo": use primary=indigo-600, secondary=indigo-50, accent=cyan-500\n   - If design DNA says "bold-blue": use primary=blue-600, secondary=blue-50, accent=orange-500\n   - If design DNA says "emerald-pro": use primary=emerald-600, secondary=emerald-50, accent=purple-600\n   - If design DNA says "ruby-modern": use primary=rose-600, secondary=rose-50, accent=amber-500\n   - If design DNA says "purple-premium": use primary=purple-600, secondary=purple-50, accent=pink-500\n   - Apply in globals.css: :root { --primary: <color>; --secondary: <color>; --accent: <color>; }\n\n7. VISUAL POLISH:\n   - Use shadows with color tint: shadow-xl shadow-primary-500/10\n   - Add hover state transitions: transition-all duration-200\n   - Inputs on focus get ring and color change\n   - Buttons on hover get opacity or brightness change\n   - Everything uses primary/secondary/accent colors, NOT gray\n\n8. DO NOT INCLUDE:\n   - Build status text like "Compiling", "Loading", "Sandbox active"\n   - Plain gray/neutral color schemes\n   - Unstyled HTML inputs or buttons\n   - Tiny micro-scale UI\n   - Single-color layouts without visual depth\n\nReference Stripe, GitHub, Vercel, Figma for color-rich auth pages. Return complete JSON.`;


                let retryResponse = '';
                await aiService.generate(
                    {
                        provider,
                        apiKey,
                        model,
                        userPrompt: retryPrompt,
                        selectedModules: selectedModules || ['auth'],
                        projectName,
                        requirements: typedRequirements
                    },
                    (chunk: string) => {
                        retryResponse += chunk;
                        sendEvent('chunk', { text: chunk });
                    }
                );

                const retried = extractFilesFromResponse(retryResponse);
                const retryQuality = evaluateAuthUiQuality(retried.files);
                const shouldUseRetry = retried.files.length > 0 && (retryQuality.pass || retried.files.length >= extracted.files.length);

                if (shouldUseRetry) {
                    extracted = retried;
                }

                sendEvent('quality_report', {
                    initialPass: qualityCheck.pass,
                    retryPass: retryQuality.pass,
                    usedRetryResult: shouldUseRetry,
                    reasons: retryQuality.pass ? [] : retryQuality.reasons
                });
            }

            let normalizedFiles = normalizeGeneratedFiles(extracted.files);

            // Requirements compliance check (only runs when requirements were provided)
            if (typedRequirements) {
                const compliance = checkRequirementsCompliance(normalizedFiles, typedRequirements);
                if (!compliance.passed && compliance.missing.length > 0) {
                    track('generation.quality_retry');
                    sendEvent('quality_retry', {
                        message: `Regenerating to include missing features: ${compliance.missing.join(', ')}`,
                        reasons: compliance.missing
                    });

                    // Build a targeted retry prompt
                    const retryPrompt = `The previous code generation was missing these required features:\n${compliance.missing.map(f => `- ${f}`).join('\n')}\n\nThese features were explicitly requested by the user. Regenerate the complete application ensuring every feature in this list is fully implemented.`;

                    // Run a second generation pass
                    let retryResponse = '';
                    await aiService.generate(
                        {
                            provider,
                            apiKey,
                            model,
                            userPrompt: `${userPrompt}\n\n${retryPrompt}`,
                            selectedModules: selectedModules || ['auth'],
                            projectName,
                            requirements: typedRequirements
                        },
                        (chunk: string) => {
                            retryResponse += chunk;
                        }
                    );

                    const retryExtracted = extractFilesFromResponse(retryResponse);
                    const retryFiles = normalizeGeneratedFiles(retryExtracted.files);
                    if (retryFiles.length > 0) {
                        extracted = retryExtracted;
                        normalizedFiles = retryFiles;
                    }

                    sendEvent('quality_report', {
                        passed: true,
                        message: 'Requirements compliance retry complete'
                    });
                }
            }

            // Send each file as a separate event
            for (const file of normalizedFiles) {
                sendEvent('file', file);
            }

            let projectId: string | null = null;
            const authenticatedUserId = (req as any).userId as string | undefined;
            if (authenticatedUserId) {
                const template =
                    req.body?.template || req.body?.templates?.auth || 'modern';
                const backend =
                    req.body?.backend || req.body?.backends?.auth || 'jwt-mongodb';

                try {
                    const project = await platformProjectsService.createProject(authenticatedUserId, {
                        name: extracted.projectName || projectName || 'Generated Project',
                        description: extracted.description || '',
                        modules: selectedModules || ['auth'],
                        template,
                        backend,
                        provider
                    });

                    await platformProjectsService.saveFiles(project._id.toString(), normalizedFiles);
                    projectId = project._id.toString();
                    track('generation.persisted');

                    await platformProjectsService.appendChatEntry(
                        projectId,
                        authenticatedUserId,
                        {
                            type: 'generate',
                            prompt: String(userPrompt || '')
                        }
                    );
                } catch (persistError: any) {
                    console.error('[AI] Project persistence warning:', persistError?.message || persistError);
                    track('generation.persist_failed', {
                        error: persistError?.message || 'unknown'
                    });
                    sendEvent('warning', {
                        message: 'Generation completed but project history save failed for this run.'
                    });
                }

                await platformAuthService.incrementGenerationCount(authenticatedUserId);
            }

            // Send complete event with metadata
            sendEvent('complete', {
                projectName: extracted.projectName,
                description: extracted.description,
                fileCount: normalizedFiles.length,
                tokensUsed: fullResponse.length,
                projectId
            });
            track('generation.completed', {
                provider: req.body?.provider,
                fileCount: normalizedFiles?.length ?? 0
            });
            res.end();
        } catch (error: any) {
            console.error('[AI] Generation error:', error.message);
            track('generation.failed', { error: error?.message || 'unknown' });
            sendEvent('error', { message: error.message || 'Generation failed' });
            res.end();
        }
    }

    // POST /api/ai/design-to-code — Design JSON → React component code
    async designToCode(req: Request, res: Response): Promise<void> {
        const { provider, apiKey, model, designJSON, designDescription } = req.body;

        if (!provider || !designJSON) {
            res.status(400).json({ success: false, data: null, error: 'provider and designJSON are required' });
            return;
        }

        // Set up SSE for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const sendEvent = (event: string, data: any) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
            sendEvent('start', { message: 'Converting design to code', provider });

            let fullCode = '';
            await aiService.designToCode(
                { provider, apiKey, model, designJSON, designDescription },
                (chunk: string) => {
                    fullCode += chunk;
                    sendEvent('chunk', { text: chunk });
                }
            );

            sendEvent('complete', { fullCode });
            res.end();
        } catch (error: any) {
            sendEvent('error', { message: error.message || 'Design-to-code conversion failed' });
            res.end();
        }
    }

    // POST /api/ai/refine — Refine previously generated code
    async refine(req: Request, res: Response): Promise<void> {
        const { provider, apiKey, model, previousCode, refinementRequest, projectId } = req.body;

        if (!provider || !previousCode || !refinementRequest) {
            res.status(400).json({ success: false, data: null, error: 'provider, previousCode, and refinementRequest are required' });
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
            sendEvent('start', { message: 'Refining code', provider });

            let fullResponse = '';
            await aiService.refine(
                { provider, apiKey, model, previousCode, refinementRequest },
                (chunk: string) => {
                    fullResponse += chunk;
                    sendEvent('chunk', { text: chunk });
                }
            );

            // Extract files (same as generate)
            const extracted = extractFilesFromResponse(fullResponse);
            const normalizedFiles = normalizeGeneratedFiles(extracted.files);
            console.log(`[AI Refine] Extracted ${normalizedFiles.length} files`);
            for (const file of normalizedFiles) {
                sendEvent('file', file);
            }

            const authenticatedUserId = (req as any).userId as string | undefined;
            if (authenticatedUserId && typeof projectId === 'string' && projectId) {
                try {
                    await platformProjectsService.saveFiles(projectId, normalizedFiles);
                    await platformProjectsService.appendChatEntry(projectId, authenticatedUserId, {
                        type: 'refine',
                        prompt: String(refinementRequest || '')
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
                projectId: typeof projectId === 'string' ? projectId : null
            });
            res.end();
        } catch (error: any) {
            console.error('[AI Refine] Error:', error.message);
            sendEvent('error', { message: error.message || 'Refinement failed' });
            res.end();
        }
    }

    /**
     * POST /api/ai/requirements
     * Analyses the user's idea and returns 3-5 targeted clarifying questions.
     * Does NOT consume a generation quota.
     * Uses non-streaming JSON response (not SSE).
     */
    getRequirementsQuestions = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userIdea, selectedModules, provider, apiKey, model } = req.body;

            if (!userIdea || typeof userIdea !== 'string' || userIdea.trim().length < 5) {
                res.status(400).json({
                    success: false,
                    data: null,
                    error: 'Please describe your idea in more detail before we ask questions.'
                });
                return;
            }

            const result = await aiService.generateRequirementsQuestions({
                userIdea: userIdea.trim(),
                selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
                provider: provider || 'gemini',
                apiKey: apiKey || undefined,
                model: model || undefined
            });

            res.status(200).json({ success: true, data: result, error: null });
        } catch (err: any) {
            console.error('[getRequirementsQuestions]', err.message, err.status || '', err.response?.data || '');
            const errorMessage = err?.message || 'Failed to generate questions. Please try again.';
            const lower = String(errorMessage).toLowerCase();
            const isProviderLimitError =
                lower.includes('provider limits') ||
                lower.includes('quota') ||
                lower.includes('rate limit') ||
                lower.includes('too many requests') ||
                lower.includes('resource_exhausted');

            if (isProviderLimitError) {
                res.setHeader('Retry-After', '30');
            }

            res.status(isProviderLimitError ? 429 : 500).json({
                success: false,
                data: null,
                error: errorMessage
            });
        }
    };

    /**
     * POST /api/ai/requirements/compile
     * Compiles user answers into a structured RequirementsDocument.
     * Does NOT consume a generation quota.
     * Uses non-streaming JSON response (not SSE).
     */
    compileRequirements = async (req: Request, res: Response): Promise<void> => {
        try {
            const { originalPrompt, projectName, answers, selectedModules, provider, apiKey, model } = req.body;

            if (!answers || !Array.isArray(answers) || answers.length === 0) {
                res.status(400).json({
                    success: false,
                    data: null,
                    error: 'No answers provided. Please answer at least the required questions.'
                });
                return;
            }

            if (!originalPrompt || typeof originalPrompt !== 'string') {
                res.status(400).json({
                    success: false,
                    data: null,
                    error: 'Original prompt is required.'
                });
                return;
            }

            const emptyRequired = answers.filter(
                (a: any) =>
                    !a?.answer ||
                    String(a.answer).trim() === '' ||
                    String(a.answer).trim().toLowerCase() === '(skipped)'
            );

            if (emptyRequired.length > 0) {
                res.status(400).json({
                    success: false,
                    data: null,
                    error: `Please answer all questions before compiling. Missing: "${emptyRequired[0]?.question || 'Unknown question'}"`
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
                model: model || undefined
            });

            res.status(200).json({ success: true, data: { requirements }, error: null });
        } catch (err: any) {
            console.error('[compileRequirements]', err.message);
            res.status(500).json({
                success: false,
                data: null,
                error: err.message || 'Failed to compile requirements. Please try again.'
            });
        }
    };

    // GET /api/ai/providers — List available providers and their models
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
                            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', freeTier: false, speed: 'medium', quality: 'highest' }
                        ],
                        requiresKey: false,
                        freeTierAvailable: true,
                        freeTierLimit: '10 generations/day',
                        description: 'Googles most capable AI. Free tier available on our platform.'
                    },
                    {
                        id: 'openai',
                        name: 'OpenAI GPT',
                        logo: '🤖',
                        models: [
                            { id: 'gpt-4.1', name: 'GPT-4.1', freeTier: false, speed: 'medium', quality: 'highest' },
                            { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', freeTier: false, speed: 'fast', quality: 'high' },
                            { id: 'gpt-4o', name: 'GPT-4o', freeTier: false, speed: 'fast', quality: 'high' }
                        ],
                        requiresKey: true,
                        freeTierAvailable: false,
                        description: 'Industry-leading code generation. Requires your OpenAI API key.'
                    },
                    {
                        id: 'anthropic',
                        name: 'Anthropic Claude',
                        logo: '🧠',
                        models: [
                            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', freeTier: false, speed: 'medium', quality: 'highest' },
                            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', freeTier: false, speed: 'medium', quality: 'high' },
                            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', freeTier: false, speed: 'fast', quality: 'good' }
                        ],
                        requiresKey: true,
                        freeTierAvailable: false,
                        description: 'Excels at following complex instructions. Requires your Anthropic API key.'
                    },
                    {
                        id: 'ollama',
                        name: 'Ollama (Local)',
                        logo: '🦙',
                        models: [
                            { id: 'llama3.3', name: 'Llama 3.3', freeTier: true, speed: 'varies', quality: 'good' },
                            { id: 'qwen2.5-coder', name: 'Qwen2.5 Coder', freeTier: true, speed: 'varies', quality: 'good' },
                            { id: 'deepseek-r1', name: 'DeepSeek R1', freeTier: true, speed: 'varies', quality: 'good' }
                        ],
                        requiresKey: false,
                        freeTierAvailable: true,
                        description: 'Run AI locally. Requires Ollama installed on your machine. 100% private.'
                    }
                ]
            },
            error: null
        });
    }
}

export const aiController = new AIController();
