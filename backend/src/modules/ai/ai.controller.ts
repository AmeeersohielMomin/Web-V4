import { Request, Response } from 'express';
import { aiService, AIProvider } from './ai.service';

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
            files: fullParsed.files,
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

    return { files, projectName, description };
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
            const extracted = extractFilesFromResponse(fullResponse);
            console.log(`[AI] Extracted ${extracted.files.length} files from response (${fullResponse.length} chars)`);

            // Send each file as a separate event
            for (const file of extracted.files) {
                sendEvent('file', file);
            }

            // Send complete event with metadata
            sendEvent('complete', {
                projectName: extracted.projectName,
                description: extracted.description,
                fileCount: extracted.files.length,
                tokensUsed: fullResponse.length
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
        const { provider, apiKey, model, previousCode, refinementRequest } = req.body;

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
            console.log(`[AI Refine] Extracted ${extracted.files.length} files`);
            for (const file of extracted.files) {
                sendEvent('file', file);
            }
            sendEvent('complete', {
                projectName: extracted.projectName,
                description: extracted.description,
                fileCount: extracted.files.length,
                tokensUsed: fullResponse.length
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
