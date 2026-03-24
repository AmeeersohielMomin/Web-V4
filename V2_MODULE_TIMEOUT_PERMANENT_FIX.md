# V2 Module Generation Timeout — Permanent Fix

**Date:** 2026-03-24  
**Error:** `[GitHub-NS/openai/gpt-4o-mini] Request timed out after 150s` → run aborts  
**Status:** 3 bugs identified, all fixes below are copy-paste ready

---

## Root Cause Analysis

```
DIAG status=attempt_start  attempt=1 provider=github model=openai/gpt-4o-mini
DIAG status=attempt_failed attempt=1 provider=github model=openai/gpt-4o-mini errorType=timeout
ERROR=Module "notes" failed across candidates
```

The log says `attempt=1` and there is no `attempt=2`. That means only **one candidate** was ever tried and there was **no fallback**. Three distinct bugs cause this:

| # | File | Location | Bug |
|---|------|----------|-----|
| BUG-1 | `ai.controller.ts` | `generateV2` execution candidate filter | When `provider=github` + explicit model, filter strips all fallback models — only 1 candidate survives |
| BUG-2 | `ai.service.ts` | `generateModuleFiles` token budget loop | Loop retries the SAME timed-out provider 3× (3×150s = 7.5 min wasted) before throwing |
| BUG-3 | `ai.controller.ts` | `generateV2` module loop catch block | No cross-provider fallback after all `executionCandidates` are exhausted |

---

## FIX-1 — `ai.controller.ts`: Keep fallback candidates when explicit model is set

### Problem code (lines ~80–95 in `generateV2`)

```typescript
// BROKEN: filters executionCandidates down to the ONE requested model only
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
```

After this filter with `provider=github, model=openai/gpt-4o-mini`, `executionCandidates` has **exactly 1 entry**. When it times out → no retry → hard fail.

### Fixed code

```typescript
// FIXED: Always keep at least 3 candidates.
// Preferred model goes first; same-provider fallbacks second; cross-provider last.
let executionCandidates = runCandidates;
if (normalizedProvider === 'github' && hasExplicitRequestedModel) {
    // Partition: requested model first, then same-provider fallbacks, then cross-provider
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

    // Guarantee at least 3 candidates total
    if (executionCandidates.length < 3) {
        // Inject Gemini platform key as a no-key fallback
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
```

**Result:** With `provider=github, model=openai/gpt-4o-mini`, `executionCandidates` now contains:
1. `github / openai/gpt-4o-mini` (requested)
2. `github / openai/gpt-4.1` (same-provider fallback)
3. `gemini / gemini-2.5-flash` (cross-provider, platform key, no user key needed)

---

## FIX-2 — `ai.service.ts`: Stop retrying timed-out providers in the token budget loop

### Problem code in `generateModuleFiles`

```typescript
// BROKEN: retries same provider 3× even after timeout
const moduleTokenBudgets = [7000, 5000, 3500];
for (const maxTokens of moduleTokenBudgets) {
    try {
        raw = await this.generateNonStreaming({
            provider, model, apiKey, prompt,
            maxTokens,
            temperature: 0.2,
            forceJson: true,
            timeoutMs: V2_MODULE_NONSTREAMING_TIMEOUT_MS,  // always 150s
        });
        if (String(raw || '').trim().length > 0) break;
    } catch (err: any) {
        moduleLastError = err;
        // ← No break on timeout! Loops again with 5000 tokens, same model, same 150s timeout
    }
}
```

When `gpt-4o-mini` times out at 150s, this loops 3 times = **7.5 minutes** of waiting before throwing.

### Fixed code

```typescript
// FIXED: abort token budget loop immediately on timeout/auth errors;
// only retry smaller token budgets for token-limit (context length) errors.
const moduleTokenBudgets = [7000, 5000, 3500];
for (const maxTokens of moduleTokenBudgets) {
    try {
        raw = await this.generateNonStreaming({
            provider, model, apiKey, prompt,
            maxTokens,
            temperature: 0.2,
            forceJson: true,
            timeoutMs: V2_MODULE_NONSTREAMING_TIMEOUT_MS,
        });
        if (String(raw || '').trim().length > 0) break;
    } catch (err: any) {
        moduleLastError = err;
        const errMsg = String(err?.message || '').toLowerCase();
        // Only retry smaller token budgets for context-length errors.
        // For timeouts, auth errors, or unknown errors → break immediately
        // so the caller's candidate loop can try the next provider.
        const isTokenLimitError =
            errMsg.includes('context_length_exceeded') ||
            errMsg.includes('maximum context') ||
            errMsg.includes('reduce the length') ||
            errMsg.includes('too many tokens') ||
            errMsg.includes('input too long');

        if (!isTokenLimitError) {
            break; // ← EXIT loop immediately; let outer candidate loop handle failover
        }
    }
}
```

**Result:** On a timeout the token budget loop exits after the **first** attempt (150s), not three (450s). The error bubbles to the candidate loop in the controller where the next provider is tried.

---

## FIX-3 — `ai.controller.ts`: Emit SSE failover event and continue to next candidate on timeout

This fix is in the **module generation loop** inside `generateV2`. The current code already iterates `executionCandidates`, so once FIX-1 gives it 3 candidates, FIX-2 ensures it fails fast. FIX-3 adds one missing guard: currently `attempt_failed` is emitted but no diagnostic explains *why* the next candidate is being tried. Also, the loop correctly `continue`s on failure, but it's missing the `send('failover', ...)` event that the frontend and monitoring should see.

### Find this block in `generateV2` (module loop catch)

```typescript
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
```

### Replace with

```typescript
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

                        // Emit explicit failover event if there is a next candidate to try
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
```

Apply the **same pattern** to the `sharedFiles` loop catch block:

```typescript
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
```

---

## FIX-4 (Bonus) — Reduce module timeout for known-slow providers

The 150s timeout is too generous for a non-streaming call that hangs. When the provider is GitHub Models or NVIDIA (which use external upstream models), cap module timeout more aggressively and rely on the fallback chain rather than waiting.

### In `ai.service.ts` — `generateModuleFiles`

Replace the static `timeoutMs` with a provider-aware value:

```typescript
// BEFORE
timeoutMs: V2_MODULE_NONSTREAMING_TIMEOUT_MS,   // always 150s

// AFTER — add this helper above generateModuleFiles:
function getModuleTimeoutMs(provider: string): number {
    const p = String(provider || '').toLowerCase();
    // GitHub Models / NVIDIA upstream can be slow but also often fast;
    // cap at 90s so a hung request fails fast and the fallback takes over.
    if (p === 'github' || p === 'nvidia') return 90_000;
    // Gemini and OpenAI direct are typically faster.
    if (p === 'gemini' || p === 'openai') return 120_000;
    // Anthropic is reliable but can be slow on large outputs.
    if (p === 'anthropic') return 120_000;
    // Ollama/local: don't timeout too aggressively.
    return V2_MODULE_NONSTREAMING_TIMEOUT_MS;
}

// Then in the token budget loop:
timeoutMs: getModuleTimeoutMs(provider),
```

Apply the same pattern for `generateSharedFiles`:

```typescript
function getSharedTimeoutMs(provider: string): number {
    const p = String(provider || '').toLowerCase();
    if (p === 'github' || p === 'nvidia') return 120_000;
    return V2_SHARED_NONSTREAMING_TIMEOUT_MS;   // 210s for others
}
```

---

## Complete Diff Summary

### `ai.controller.ts` — `generateV2`

| Location | Change |
|----------|--------|
| Execution candidates filter block | Replace single-model filter with ordered 3-candidate list (FIX-1) |
| Module loop catch | Add `failover` SSE event emission pointing to next candidate (FIX-3) |
| Shared files loop catch | Same `failover` SSE event (FIX-3) |

### `ai.service.ts`

| Location | Change |
|----------|--------|
| `generateModuleFiles` token budget loop catch | Break immediately on non-token-limit errors (FIX-2) |
| `generateModuleFiles` `timeoutMs` | Use `getModuleTimeoutMs(provider)` instead of static 150s (FIX-4) |
| `generateSharedFiles` token budget loop catch | Same break-on-non-token-limit (FIX-2) |
| `generateSharedFiles` `timeoutMs` | Use `getSharedTimeoutMs(provider)` (FIX-4) |

---

## Expected SSE Stream After Fix

```
SSE_STATUS=200
PHASE=planning
DIAG status=attempt_start  attempt=1 provider=github model=openai/gpt-4o-mini
DIAG status=attempt_success attempt=1 provider=github model=openai/gpt-4o-mini
PLAN_MODULES=3
PHASE=generating

# gpt-4o-mini times out after 90s (FIX-4: reduced from 150s)
DIAG status=attempt_start  attempt=1 provider=github model=openai/gpt-4o-mini
DIAG status=attempt_failed attempt=1 provider=github model=openai/gpt-4o-mini errorType=timeout

# FIX-3: failover event emitted
FAILOVER phase=module from=github/openai/gpt-4o-mini to=github/openai/gpt-4.1 reason=timeout

# FIX-1: second candidate tried
DIAG status=attempt_start  attempt=2 provider=github model=openai/gpt-4.1
DIAG status=attempt_success attempt=2 provider=github model=openai/gpt-4.1 fileCount=9

MODULE_COMPLETE module=notes fileCount=9
... (remaining modules follow same pattern)
COMPLETE fileCount=47
```

If `gpt-4.1` also fails, the Gemini platform key candidate (`attempt=3`) is tried automatically.

---

## Validation

After applying fixes, run the smoke test again:

```bash
$env:SMOKE_PORT=5009; node .\tmp\v2-http-smoke-github.js
```

**Pass criteria:**
- `PLAN_MODULES=3` (unchanged)
- `DIAG status=attempt_failed attempt=1` followed by `FAILOVER` event (not a hard ERROR)
- `DIAG status=attempt_success attempt=2` (second candidate succeeded)
- `SUMMARY modules=3 files>30 complete=true error=false`

**Regression guard:** Run with `provider=gemini` (no key) to confirm Gemini platform path still works and the new candidate injection doesn't break it.

---

## Files to Edit

```
backend/src/modules/ai/ai.controller.ts   ← FIX-1, FIX-3
backend/src/modules/ai/ai.service.ts      ← FIX-2, FIX-4
```

No new files required. No schema changes. No migration needed.
