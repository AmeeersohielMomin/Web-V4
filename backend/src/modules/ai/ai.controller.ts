import { Request, Response } from 'express';
import { aiService, AIProvider } from './ai.service';
import { platformProjectsService } from '../platform-projects/platform-projects.service';
import { platformAuthService } from '../platform-auth/platform-auth.service';

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

// ─── Extract JSON from AI response (strip code fences, find JSON) ───
function extractProjectJSON(raw: string): any {
    try { return JSON.parse(raw.trim()); } catch {}
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { return JSON.parse(raw.substring(firstBrace, lastBrace + 1)); } catch {}
    }
    // Try fixing trailing commas
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const cleaned = raw.substring(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, '$1');
        try { return JSON.parse(cleaned); } catch {}
    }
    return null;
}

// ─── Extract individual files from potentially truncated JSON ───
// Uses regex to find complete file objects regardless of whether the overall JSON is valid
function extractFilesFromResponse(raw: string): { files: any[], projectName: string, description: string } {
    const files: any[] = [];
    let projectName = 'My Project';
    let description = '';

    // Extract projectName
    const nameMatch = raw.match(/"projectName"\s*:\s*"([^"]+)"/);
    if (nameMatch) projectName = nameMatch[1];

    // Extract description
    const descMatch = raw.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (descMatch) description = descMatch[1];

    // Strategy 1: Try full JSON parse first
    const fullParsed = extractProjectJSON(raw);
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
    while ((match = pathRegex.exec(raw)) !== null) {
        const filePath = match[1];
        const startSearchPos = match.index;

        // Find content and language for this file by looking ahead from this position
        const afterPath = raw.substring(startSearchPos);
        
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

export class AIController {
    // POST /api/ai/generate — Natural language → full-stack code (SSE streaming)
    async generate(req: Request, res: Response): Promise<void> {
        const { provider, apiKey, model, userPrompt, selectedModules, projectName } = req.body;

        if (!provider || !userPrompt) {
            res.status(400).json({ success: false, data: null, error: 'provider and userPrompt are required' });
            return;
        }

        const validProviders: AIProvider[] = ['openai', 'gemini', 'anthropic', 'ollama'];
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
                { provider, apiKey, model, userPrompt, selectedModules: selectedModules || ['auth'], projectName },
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
                        projectName
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

            const normalizedFiles = normalizeGeneratedFiles(extracted.files);

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
            res.end();
        } catch (error: any) {
            console.error('[AI] Generation error:', error.message);
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
                            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', freeTier: true, speed: 'fast', quality: 'high' },
                            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', freeTier: false, speed: 'medium', quality: 'highest' }
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
                            { id: 'gpt-4o', name: 'GPT-4o', freeTier: false, speed: 'medium', quality: 'highest' },
                            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', freeTier: false, speed: 'medium', quality: 'highest' },
                            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', freeTier: false, speed: 'fast', quality: 'good' }
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
                            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', freeTier: false, speed: 'medium', quality: 'highest' },
                            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', freeTier: false, speed: 'fast', quality: 'good' }
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
                            { id: 'llama3.2', name: 'Llama 3.2', freeTier: true, speed: 'varies', quality: 'good' },
                            { id: 'codestral', name: 'Codestral', freeTier: true, speed: 'varies', quality: 'good' },
                            { id: 'deepseek-coder', name: 'DeepSeek Coder', freeTier: true, speed: 'varies', quality: 'good' }
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
