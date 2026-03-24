# Agent Prompt: GitHub Models — Full Backend + Frontend Integration

**Document Type:** Agent-Executable Implementation Instructions  
**Target Files:** `ai.service.ts` · `ai.controller.ts` · `ai.prompts.ts` · `frontend/pages/builder/ai-generate.tsx` (or equivalent provider selector UI)  
**Instruction Style:** Copy-paste ready. Replace existing code blocks exactly as shown.  
**Do not skip any section.** Each section depends on the previous one.

---

## CONTEXT FOR THE AGENT

The platform already has a `github` provider path wired through the OpenAI-compatible SDK pointing at `https://models.github.ai/inference`. The only things changing are:

1. The **model catalogue** — which models are listed, their exact IDs, tiers, and metadata
2. The **fallback chain order** — which model to try next on timeout/failure
3. The **frontend provider card** — what the user sees when they pick GitHub Models
4. The **normalisation guard** — ensuring model ID strings are never mangled

All existing `generateWithGitHubModels`, `createGitHubModelsClient`, and `callGitHubModelsNonStreaming` functions remain intact. Only the data/config layers change.

---

## SECTION 1 — MASTER MODEL CATALOGUE

These are the confirmed GitHub Models marketplace models as of March 2026, with their exact API `model` string, rate limit tier, context window, and recommended use phase.

```
TIER 1 — STRONGEST (primary generation candidates)
═══════════════════════════════════════════════════════════════════════

Model ID (exact):     openai/gpt-4.1
Display Name:         OpenAI GPT-4.1
Rate Limit Tier:      high
Max Input Tokens:     1,048,576 (1M)
Max Output Tokens:    32,768
Capabilities:         streaming, tool-calling, multimodal (text+image+audio)
Best For:             module generation, shared files — primary workhorse
Strength:             Strongest reliable model on the marketplace.
                      Outperforms GPT-4o on coding, instruction following,
                      long-context. Use as the DEFAULT fallback for all phases.

Model ID (exact):     openai/o4-mini
Display Name:         OpenAI o4-mini (Reasoning)
Rate Limit Tier:      high
Max Input Tokens:     200,000
Max Output Tokens:    100,000
Capabilities:         streaming, tool-calling
Best For:             planning phase — chain-of-thought reasoning produces
                      better module breakdown and field inference
Strength:             93.4% HumanEval, 96.7% MATH. Best reasoning model
                      on the marketplace. Slower but fewest structural errors.
Note:                 More expensive than GPT-4.1 per token. Use for planner,
                      not bulk module generation.

Model ID (exact):     openai/o3
Display Name:         OpenAI o3
Rate Limit Tier:      high
Max Input Tokens:     200,000
Max Output Tokens:    100,000
Capabilities:         streaming, tool-calling
Best For:             complex multi-dependency module generation
Strength:             Strongest reasoning model overall. Use when o4-mini is
                      rate-limited.

Model ID (exact):     openai/gpt-5-mini
Display Name:         OpenAI GPT-5 mini (Preview)
Rate Limit Tier:      high
Max Input Tokens:     (preview — check marketplace for current limits)
Max Output Tokens:    (preview)
Capabilities:         streaming, multimodal
Best For:             fast planning, requirements compilation
Note:                 Preview model — may change. Excellent speed/quality ratio.

TIER 2 — STRONG ALTERNATES (open-weight, no per-token cost beyond GitHub token)
═══════════════════════════════════════════════════════════════════════

Model ID (exact):     meta/llama-4-maverick
Display Name:         Meta Llama 4 Maverick
Rate Limit Tier:      high
Max Input Tokens:     256,000
Max Output Tokens:    (large — varies)
Capabilities:         streaming, tool-calling, structured output, grounded generation
Best For:             module generation when GPT-4.1 is rate-limited
Strength:             398B params (94B active) MoE. Strong instruction following.
Warning:              GitHub-hosted endpoint is prone to timeouts under load.
                      Always place AFTER gpt-4.1 in the fallback chain, never before.

Model ID (exact):     azureml-deepseek/DeepSeek-V3-0324
Display Name:         DeepSeek V3 0324
Rate Limit Tier:      high
Max Input Tokens:     128,000
Max Output Tokens:    (large)
Capabilities:         streaming, tool-calling, structured output
Best For:             module generation — excellent at following long structured prompts
Strength:             Top open-weight model. Enhanced reasoning, function calling,
                      and code generation vs V3. Strong JSON instruction adherence.
Note:                 Best open-weight backup to GPT-4.1.

Model ID (exact):     azureml-deepseek/DeepSeek-R1
Display Name:         DeepSeek R1 (Reasoning)
Rate Limit Tier:      high
Max Input Tokens:     128,000
Max Output Tokens:    (large)
Capabilities:         streaming, chain-of-thought reasoning
Best For:             planning phase — 90.8% MMLU, 85.3% HumanEval, 97.3% MATH
Strength:             Best open-weight reasoning model. CoT traces improve plan quality.
Note:                 Slower due to reasoning tokens. Use for planner, not modules.

Model ID (exact):     azureml-deepseek/DeepSeek-R1-0528
Display Name:         DeepSeek R1 0528 (Reasoning)
Rate Limit Tier:      high
Max Input Tokens:     128,000
Max Output Tokens:    (large)
Capabilities:         streaming, chain-of-thought reasoning
Best For:             planning phase — updated version of R1 with improved coding
Note:                 Prefer this over base R1 when available.

TIER 3 — FAST / LIGHTWEIGHT (planning, chat, requirements phases)
═══════════════════════════════════════════════════════════════════════

Model ID (exact):     openai/gpt-4.1-mini
Display Name:         OpenAI GPT-4.1 mini
Rate Limit Tier:      high
Max Input Tokens:     1,048,576
Max Output Tokens:    32,768
Capabilities:         streaming, tool-calling
Best For:             planning phase, requirements Q&A, chat — fast and cheap

Model ID (exact):     openai/gpt-4o
Display Name:         OpenAI GPT-4o
Rate Limit Tier:      high
Max Input Tokens:     (large)
Max Output Tokens:    (large)
Capabilities:         streaming, tool-calling, multimodal
Best For:             general fallback

Model ID (exact):     openai/gpt-4o-mini
Display Name:         OpenAI GPT-4o mini  [CURRENT — TO BE DEMOTED]
Rate Limit Tier:      low
Max Input Tokens:     (moderate)
Max Output Tokens:    (moderate)
Best For:             lightweight tasks only. This is the model that has been
                      timing out. Demote to last position in fallback chain.

Model ID (exact):     Mistral-Large
Display Name:         Mistral Large
Rate Limit Tier:      low
Max Input Tokens:     256,000
Max Output Tokens:    (large)
Best For:             structured output with very long context

Model ID (exact):     Codestral-25.01
Display Name:         Codestral 25.01
Rate Limit Tier:      low
Max Input Tokens:     (large)
Max Output Tokens:    (large)
Best For:             code-only refinement tasks. Very fast on TypeScript generation.

Model ID (exact):     Phi-4
Display Name:         Phi-4 (14B)
Rate Limit Tier:      low
Max Input Tokens:     (moderate)
Max Output Tokens:    (moderate)
Best For:             lightweight planning, low latency scenarios
```

---

## SECTION 2 — BACKEND CHANGES: `ai.service.ts`

### 2A — Replace `DEFAULT_MODELS` entry for github

Find and replace the `github` entry in the `DEFAULT_MODELS` object:

```typescript
// BEFORE
const DEFAULT_MODELS: Record<AIProvider, string> = {
    ...
    github: 'openai/gpt-4.1',   // ← might already be this
};

// AFTER — confirm it is exactly this string
const DEFAULT_MODELS: Record<AIProvider, string> = {
    openai: 'gpt-4.1',
    gemini: 'gemini-2.5-flash',
    anthropic: 'claude-sonnet-4-20250514',
    ollama: 'llama3.2',
    nvidia: 'nvidia/nemotron-3-super-120b-a12b',
    github: 'openai/gpt-4.1',    // ← PRIMARY. Never gpt-4o-mini.
};
```

### 2B — Replace `getGitHubModelFallbackChain`

Find the existing `getGitHubModelFallbackChain` function and replace it entirely:

```typescript
// REPLACE ENTIRE FUNCTION
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
```

### 2C — Add provider-aware timeout helper (place above `generateModuleFiles`)

```typescript
// ADD THIS FUNCTION — place directly above generateModuleFiles in AIService class

/**
 * Returns the non-streaming timeout in ms for module generation,
 * tuned per provider based on observed latency patterns.
 * GitHub/NVIDIA upstream models should fail fast so the fallback chain
 * can take over; direct providers get longer budgets.
 */
function getModuleTimeoutMs(provider: string): number {
    const p = String(provider || '').toLowerCase();
    if (p === 'github' || p === 'nvidia') return 90_000;   // 90s — fail fast, trigger fallback
    if (p === 'gemini' || p === 'openai') return 120_000;  // 2 min — direct provider
    if (p === 'anthropic') return 120_000;
    return V2_MODULE_NONSTREAMING_TIMEOUT_MS;               // default 150s for others
}

function getSharedTimeoutMs(provider: string): number {
    const p = String(provider || '').toLowerCase();
    if (p === 'github' || p === 'nvidia') return 120_000;  // 2 min
    return V2_SHARED_NONSTREAMING_TIMEOUT_MS;               // default 210s
}
```

### 2D — Fix the token budget loop in `generateModuleFiles`

Find the token budget loop inside `generateModuleFiles`. Replace the catch block:

```typescript
// FIND THIS PATTERN (inside generateModuleFiles):
const moduleTokenBudgets = [7000, 5000, 3500];
for (const maxTokens of moduleTokenBudgets) {
    try {
        raw = await this.generateNonStreaming({
            provider, model, apiKey, prompt,
            maxTokens,
            temperature: 0.2,
            forceJson: true,
            timeoutMs: V2_MODULE_NONSTREAMING_TIMEOUT_MS,   // ← CHANGE THIS LINE
        });
        if (String(raw || '').trim().length > 0) break;
    } catch (err: any) {
        moduleLastError = err;
        // ← ADD THE BREAK LOGIC HERE
    }
}

// REPLACE THE ENTIRE LOOP WITH:
const moduleTokenBudgets = [7000, 5000, 3500];
for (const maxTokens of moduleTokenBudgets) {
    try {
        raw = await this.generateNonStreaming({
            provider, model, apiKey, prompt,
            maxTokens,
            temperature: 0.2,
            forceJson: true,
            timeoutMs: getModuleTimeoutMs(provider),    // ← provider-aware timeout
        });
        if (String(raw || '').trim().length > 0) break;
    } catch (err: any) {
        moduleLastError = err;
        const errMsg = String(err?.message || '').toLowerCase();
        // Only retry with a smaller token budget if the error is specifically
        // about context length. For timeouts, auth, and all other errors,
        // break immediately so the caller's candidate loop can try the next provider.
        const isTokenLimitError =
            errMsg.includes('context_length_exceeded') ||
            errMsg.includes('maximum context') ||
            errMsg.includes('reduce the length') ||
            errMsg.includes('too many tokens') ||
            errMsg.includes('input too long') ||
            errMsg.includes('max_tokens');
        if (!isTokenLimitError) {
            break;   // EXIT immediately — do not retry same provider on timeout/auth
        }
    }
}
```

Apply the **identical** fix to the token budget loop inside `generateSharedFiles`:

```typescript
// In generateSharedFiles — same pattern, change timeoutMs only:
timeoutMs: getSharedTimeoutMs(provider),   // ← replace V2_SHARED_NONSTREAMING_TIMEOUT_MS

// And add the same break logic in the catch:
const isTokenLimitError = errMsg.includes('context_length_exceeded') || ...;
if (!isTokenLimitError) { break; }
```

### 2E — Fix `normalizeModelForProvider` for new model IDs

The current normaliser handles basic patterns. Add the new DeepSeek and o-series IDs:

```typescript
// FIND normalizeModelForProvider and update the github branch:
if (provider === 'github') {
    if (/^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(trimmed)) return trimmed;
    if (/^gpt-/i.test(trimmed)) return `openai/${trimmed}`;
    if (/^llama-4-maverick$/i.test(trimmed)) return 'meta/llama-4-maverick';
    // ADD THESE:
    if (/^o4-mini$/i.test(trimmed)) return 'openai/o4-mini';
    if (/^o3$/i.test(trimmed)) return 'openai/o3';
    if (/^gpt-5-mini$/i.test(trimmed)) return 'openai/gpt-5-mini';
    if (/^deepseek-v3/i.test(trimmed)) return 'azureml-deepseek/DeepSeek-V3-0324';
    if (/^deepseek-r1-0528/i.test(trimmed)) return 'azureml-deepseek/DeepSeek-R1-0528';
    if (/^deepseek-r1$/i.test(trimmed)) return 'azureml-deepseek/DeepSeek-R1';
    if (/^codestral/i.test(trimmed)) return 'Codestral-25.01';
    if (/^mistral-large/i.test(trimmed)) return 'Mistral-Large';
    if (/^phi-4$/i.test(trimmed)) return 'Phi-4';
    return DEFAULT_MODELS.github;   // safe fallback
}
```

---

## SECTION 3 — BACKEND CHANGES: `ai.controller.ts`

### 3A — Replace `buildModelCandidatesForProvider` for github

Find and replace the `github` branch entirely:

```typescript
// FIND:
if (normalizedProvider === 'github') {
    return Array.from(new Set([normalizedModel, 'openai/gpt-4.1', 'openai/gpt-4o-mini'].filter(Boolean)));
}

// REPLACE WITH:
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
```

### 3B — Fix execution candidate filtering in `generateV2`

Find this block (approximately lines 80–100 of `generateV2`):

```typescript
// FIND AND REPLACE THIS ENTIRE BLOCK:
let executionCandidates = runCandidates;
if (normalizedProvider === 'github' && hasExplicitRequestedModel) {
    executionCandidates = runCandidates.filter((candidate) => (
        candidate.provider === normalizedProvider && (candidate.model || '') === normalizedModel
    ));
    if (executionCandidates.length === 0) {
        executionCandidates = runCandidates
            .filter((candidate) => candidate.provider === normalizedProvider)
            .slice(0, 1);
    }
}

// REPLACE WITH:
let executionCandidates = runCandidates;
if (normalizedProvider === 'github' && hasExplicitRequestedModel) {
    // Partition into: [requested model] → [same-provider others] → [cross-provider]
    // This guarantees multiple candidates even when a specific model is requested.
    const requestedFirst = runCandidates.filter(
        (c) => c.provider === normalizedProvider && (c.model || '') === normalizedModel,
    );
    const sameProviderOthers = runCandidates.filter(
        (c) => c.provider === normalizedProvider && (c.model || '') !== normalizedModel,
    );
    const crossProvider = runCandidates.filter(
        (c) => c.provider !== normalizedProvider,
    );
    executionCandidates = [...requestedFirst, ...sameProviderOthers, ...crossProvider];

    // Guarantee Gemini platform key as the final no-API-key fallback
    const hasGemini = executionCandidates.some((c) => c.provider === 'gemini');
    if (!hasGemini) {
        executionCandidates.push({
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            reason: 'platform-gemini-final-fallback',
        });
    }
}
```

### 3C — Add `failover` SSE event in the module loop catch block

Find the module candidate loop catch block inside `generateV2` and replace it:

```typescript
// FIND:
                    } catch (moduleErr: any) {
                        moduleLastErr = moduleErr;
                        send('phase_diagnostic', {
                            phase: 'module',
                            module: mod?.name,
                            status: 'attempt_failed',
                            attempt: candidateIndex + 1,
                            provider: candidate.provider,
                            model: candidate.model || null,
                            errorType: classifyGenerationError(moduleErr),
                            message: moduleErr?.message || 'unknown error',
                        });
                    }

// REPLACE WITH:
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
                        // Emit failover event so frontend can show "switching to fallback model"
                        const nextModuleCandidate = executionCandidates[candidateIndex + 1];
                        if (nextModuleCandidate) {
                            send('failover', {
                                phase: 'module',
                                module: mod?.name,
                                from: `${candidate.provider}/${candidate.model || ''}`,
                                to: `${nextModuleCandidate.provider}/${nextModuleCandidate.model || ''}`,
                                reason: moduleErrType,
                            });
                        }
                    }
```

Apply the same `failover` event pattern to the **shared files** candidate loop catch block:

```typescript
// In the shared files loop catch — ADD after existing phase_diagnostic send:
const nextSharedCandidate = executionCandidates[candidateIndex + 1];
if (nextSharedCandidate) {
    send('failover', {
        phase: 'shared',
        from: `${candidate.provider}/${candidate.model || ''}`,
        to: `${nextSharedCandidate.provider}/${nextSharedCandidate.model || ''}`,
        reason: classifyGenerationError(sharedErr),
    });
}
```

---

## SECTION 4 — BACKEND CHANGES: `ai.controller.ts` — `getProviders` endpoint

Find the `getProviders` method and replace the `github` provider entry completely:

```typescript
// FIND the github entry inside getProviders() and REPLACE WITH:
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
```

---

## SECTION 5 — FRONTEND CHANGES: Provider Selector UI

This section targets whatever component renders the GitHub provider card and its model dropdown. In the IDEA codebase this is typically `frontend/pages/builder/ai-generate.tsx` or a `ProviderSelector` / `ModelSelector` component.

### 5A — Model grouping for the dropdown

The frontend should group models visually. Add a `group` field to each model definition and render group headers in the dropdown.

```typescript
// In the frontend model data (mirror of getProviders response):

const GITHUB_MODEL_GROUPS = [
    {
        label: '⚡ Tier 1 — Strongest',
        models: [
            { id: 'openai/gpt-4.1',     name: 'GPT-4.1',                 badge: 'Recommended', speed: 'fast',    quality: 'Highest' },
            { id: 'openai/o4-mini',      name: 'o4-mini (Reasoning)',      badge: 'Best Planner', speed: 'medium', quality: 'Highest' },
            { id: 'openai/o3',           name: 'o3',                       badge: 'Reasoning',   speed: 'slow',   quality: 'Highest' },
            { id: 'openai/gpt-5-mini',   name: 'GPT-5 mini (Preview)',     badge: 'Preview',     speed: 'fastest', quality: 'High'   },
        ],
    },
    {
        label: '🔓 Tier 2 — Open Weight',
        models: [
            { id: 'azureml-deepseek/DeepSeek-V3-0324',  name: 'DeepSeek V3',              badge: 'Open',          speed: 'fast',   quality: 'Highest' },
            { id: 'azureml-deepseek/DeepSeek-R1-0528',  name: 'DeepSeek R1 0528',         badge: 'Open Reasoning', speed: 'medium', quality: 'Highest' },
            { id: 'azureml-deepseek/DeepSeek-R1',       name: 'DeepSeek R1',              badge: 'Open Reasoning', speed: 'medium', quality: 'High'   },
            { id: 'meta/llama-4-maverick',               name: 'Llama 4 Maverick (256K)',  badge: 'Open',          speed: 'medium', quality: 'High'   },
        ],
    },
    {
        label: '🚀 Tier 3 — Fast',
        models: [
            { id: 'openai/gpt-4.1-mini',  name: 'GPT-4.1 mini',    badge: 'Fast',      speed: 'fastest', quality: 'High' },
            { id: 'openai/gpt-4o',        name: 'GPT-4o',           badge: '',          speed: 'fast',    quality: 'High' },
            { id: 'Mistral-Large',        name: 'Mistral Large',    badge: 'Open',      speed: 'medium',  quality: 'High' },
            { id: 'Codestral-25.01',      name: 'Codestral',        badge: 'Code',      speed: 'fastest', quality: 'High' },
            { id: 'Phi-4',               name: 'Phi-4 (14B)',       badge: 'Lightweight', speed: 'fastest', quality: 'Good' },
            { id: 'openai/gpt-4o-mini',   name: 'GPT-4o mini',      badge: '⚠ Slow',   speed: 'fast',    quality: 'Good' },
        ],
    },
];
```

### 5B — Default model selection

When the user picks the GitHub provider, **pre-select** `openai/gpt-4.1` automatically:

```typescript
// In your provider selection handler:
const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    if (providerId === 'github') {
        setSelectedModel('openai/gpt-4.1');   // ← Always default to strongest
    }
    // ... rest of handler
};
```

### 5C — Failover status display

Add a listener for the `failover` SSE event emitted by the backend (Section 3C) and display a subtle status message in the generation progress UI:

```tsx
// In the SSE event handler switch/case block:
case 'failover': {
    const { phase, from, to, reason } = event.data;
    setGenerationStatus(prev => ({
        ...prev,
        lastFailover: {
            phase,
            from,
            to,
            reason,
            timestamp: Date.now(),
        },
    }));
    break;
}

// In the JSX render — show inside the generation progress panel:
{generationStatus.lastFailover && (
    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 
                    border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
        <span>⚡</span>
        <span>
            Switched to <strong>{generationStatus.lastFailover.to.split('/').pop()}</strong>
            {' '}during {generationStatus.lastFailover.phase} phase
            {' '}({generationStatus.lastFailover.reason})
        </span>
    </div>
)}
```

### 5D — Model info tooltip / description rendering

When the user hovers a model in the dropdown, show the `description`, `contextWindow`, `speed`, and `badge` fields from Section 5A. Suggested implementation:

```tsx
// ModelOption component
const ModelOption = ({ model, isSelected, onSelect }) => (
    <button
        onClick={() => onSelect(model.id)}
        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left
                    hover:bg-gray-50 transition-colors
                    ${isSelected ? 'bg-indigo-50 border border-indigo-200' : ''}`}
    >
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900">{model.name}</span>
                {model.badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 
                                     text-indigo-700 font-medium">
                        {model.badge}
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{model.description}</p>
            <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">Context: {model.contextWindow}</span>
                <span className="text-xs text-gray-400">Speed: {model.speed}</span>
            </div>
        </div>
        {isSelected && <span className="text-indigo-600 text-sm">✓</span>}
    </button>
);
```

---

## SECTION 6 — VALIDATION CHECKLIST

After implementing all sections, run the following checks before committing:

```
□ DEFAULT_MODELS.github === 'openai/gpt-4.1'  (not gpt-4o-mini)

□ getGitHubModelFallbackChain('openai/gpt-4o-mini') returns:
    ['openai/gpt-4o-mini', 'openai/gpt-4.1', 'openai/gpt-4.1-mini',
     'azureml-deepseek/DeepSeek-V3-0324', 'meta/llama-4-maverick',
     'openai/gpt-4o']

□ buildModelCandidatesForProvider('github', 'openai/gpt-4o-mini') returns
  array with 6+ entries, gpt-4.1 as second entry

□ generateV2 with provider=github + explicit model:
    executionCandidates.length >= 3

□ On module timeout:
    - attempt_failed emitted for attempt=1
    - failover event emitted with from/to
    - attempt_start emitted for attempt=2 with different model
    - Run completes, not hard-fails

□ getProviders() response for github provider contains
    at least 12 model entries with 'openai/gpt-4.1' having recommended=true

□ Frontend model dropdown for GitHub shows 3 groups with headers

□ Selecting GitHub provider auto-selects 'openai/gpt-4.1'

□ failover SSE event triggers amber status banner in UI
```

---

## SECTION 7 — SMOKE TEST COMMAND

```bash
# Set your GitHub token
$env:GITHUB_MODELS_API_KEY="ghp_your_token_here"
$env:SMOKE_PORT=5009

# Run smoke test with the new primary model
node .\tmp\v2-http-smoke-github.js

# Expected output:
# SSE_STATUS=200
# PHASE=planning
# DIAG status=attempt_success attempt=1 provider=github model=openai/gpt-4.1
# PLAN_MODULES=3
# PHASE=generating
# DIAG status=attempt_success attempt=1 provider=github model=openai/gpt-4.1
# MODULE_COMPLETE module=notes fileCount=9
# MODULE_COMPLETE module=tags fileCount=9
# MODULE_COMPLETE module=shared-notes fileCount=9
# COMPLETE fileCount=47 error=false

# If gpt-4.1 is rate limited, expected failover output:
# DIAG status=attempt_failed attempt=1 provider=github model=openai/gpt-4.1 errorType=rate_limit
# FAILOVER phase=module from=github/openai/gpt-4.1 to=github/openai/gpt-4.1-mini reason=rate_limit
# DIAG status=attempt_success attempt=2 provider=github model=openai/gpt-4.1-mini
# COMPLETE error=false
```

---

## SECTION 8 — DO NOT CHANGE

These parts of the codebase are correct and must not be modified during this implementation:

```
✗ DO NOT touch: generateWithGitHubModels()     — streaming implementation is correct
✗ DO NOT touch: callGitHubModelsNonStreaming()  — non-streaming implementation is correct
✗ DO NOT touch: createGitHubModelsClient()      — API endpoint and headers are correct
✗ DO NOT touch: GITHUB_MODELS_BASE_URL          — https://models.github.ai/inference is correct
✗ DO NOT touch: GITHUB_MODELS_API_VERSION       — 2026-03-10 is the current version
✗ DO NOT touch: ai.validators.ts                — validation logic is correct
✗ DO NOT touch: ai.verification.ts              — verification gate is correct
✗ DO NOT touch: applyDeterministicWarningFixes  — post-processing is correct
✗ DO NOT touch: Gemini provider path            — platform key fallback is correct
```
