# AI Generation v2 Cross-Model Truth Report

Date: 2026-03-24  
Scope: Backend v2 generation pipeline reliability after hardening work, including explicit Meta retest and cross-model/provider failure evidence.

## Executive Verdict

Current state is improved but not fully production-safe for one-click guaranteed completion.

- The v2 pipeline architecture is implemented and materially stronger than before.
- The specific GitHub Meta retest did not complete end-to-end in this run.
- Observed failures are not Meta-only; instability appeared across multiple model/provider paths.
- The backend stayed healthy, so failure appears generation-stream/provider-path related, not full server crash.
- This is not yet at the reliability bar of "always complete app end to end" across providers/models.

## What Is Implemented (Verified)

### 1) Two-phase generation pipeline is in place

Implemented behavior:
- Planning phase event stream
- Per-module generation loop
- Shared-files generation phase
- Completion event with project metadata

Code areas:
- `backend/src/modules/ai/ai.controller.ts` (`generateV2`)
- `backend/src/modules/ai/ai.routes.ts` (`/generate/v2` route)
- `backend/src/modules/ai/ai.service.ts` (planner/module/shared generation methods)

### 2) Reliability hardening added in service/controller

Implemented behavior:
- Per-stage non-streaming timeout controls (planner/module/shared tuned separately)
- Retry once on module and shared generation failures
- JSON parse-and-repair fallback path
- Timeout-aware fallback handling for GitHub provider

Code areas:
- `backend/src/modules/ai/ai.service.ts`
- `backend/src/modules/ai/ai.types.ts` (`timeoutMs` in non-streaming params)

### 3) Quality gates tightened

Implemented behavior:
- Structural validation report (`validation_report`)
- Blocking verification gate (`verification_report`) before success
- One-pass auto-repair attempt on verification failure
- Critical failures block final success

Code areas:
- `backend/src/modules/ai/ai.validators.ts`
- `backend/src/modules/ai/ai.verification.ts`
- `backend/src/modules/ai/ai.controller.ts`

### 4) Zero-file false-success bug addressed

Old bad behavior:
- Module could emit completion with `fileCount: 0` due to swallowed generation failures.

New behavior:
- Retry once, then explicit failure if module/shared still returns zero files.
- No silent "successful" module completion with empty output.

Code areas:
- `backend/src/modules/ai/ai.controller.ts`
- `backend/src/modules/ai/ai.service.ts`

### 5) Frontend generation UX upgraded for v2 events

Implemented behavior:
- Phase/progress display
- Planned module list
- Completed module state updates
- Better generation visibility in builder UI

Code area:
- `frontend/pages/builder/ai-generate.tsx`

## Retest Evidence: GitHub Models Meta (Latest)

Target configuration:
- Provider: `github`
- Model: `meta/llama-4-maverick`
- Endpoint: `/api/ai/generate/v2`

Observed results from latest explicit retest:
- HTTP stream handshake succeeded: `SSE_STATUS=200`
- First orchestration event arrived: planning phase emitted
- Stream then terminated before end-to-end completion: `SSE_ERROR=terminated`
- Immediate backend health check still passed: `HEALTH_STATUS=200`, body reported `status: ok`

Interpretation:
- Route and initial phase orchestration are alive.
- Failure occurred after planning start and before full pipeline completion.
- Backend process remained up, so this is likely provider/stream-path instability or upstream timeout/termination behavior, not total backend outage.

## Cross-Model / Cross-Provider Failure Evidence (Not Meta-Only)

Observed during this validation cycle:

1. GitHub Meta path (`meta/llama-4-maverick`):
- Stream started (`SSE_STATUS=200`, planning phase seen) and then terminated before completion.

2. GitHub non-streaming fallback path:
- Timeouts were observed in generation attempts, which triggered hardening work for timeout handling/fallback behavior.

3. Gemini path:
- Invalid API key failure was observed in live testing (provider rejected request).

4. Other provider paths (including fallback trials):
- Provider/runtime instability and timeout behavior were observed under real runs.

Conclusion from evidence:
- The reliability problem is systemic across provider/model conditions, not isolated to Meta.
- Meta is one visible symptom, but cross-provider robustness is the real gap to close.

## What Works vs What Fails Right Now

### Works

- `/api/ai/generate/v2` reachable and starts phased SSE flow
- Planning phase emission works
- Validation + verification plumbing exists and is integrated
- Backend health remains stable after failed generation stream
- Zero-file silent-success path is removed

### Fails / Not Yet Reliable

- Meta run in this retest did not complete module/shared/final events
- Similar reliability disruptions were observed on non-Meta paths (timeouts, provider errors)
- Provider-dependent instability still blocks deterministic end-to-end success
- "Always complete full app in one run" is not yet true under real provider variability

## Harsh Truth (No Sugarcoating)

1. This is no longer a toy pipeline, but it is still probabilistic under live model/provider conditions.
2. Architecture and safeguards are significantly better; reliability is still bottlenecked by upstream model behavior and timeout dynamics.
3. Passing compile/build checks on local code does not guarantee live generation completion for every model.
4. The system can now fail loudly and honestly instead of faking progress, which is the right engineering direction.
5. Claiming "100% end-to-end generation success" today would be inaccurate.

## Production Readiness Assessment

Current rating: **Improved Beta / Not hard-production-grade for guaranteed one-pass generation**

Why not yet hard-production-grade:
- Recent Meta retest did not complete.
- Cross-model/provider runs also showed failures (timeouts/provider errors), so this is broader than one model.
- Provider/model runtime variance remains a first-order risk.
- Need stronger run-level fallback and recovery policy when a chosen model stalls/terminates mid-stream.

## Highest-Impact Next Fixes

1. Add explicit run-level provider/model failover inside v2 orchestration.
   - If selected model terminates during module/shared generation, auto-switch to configured fallback model/provider and continue run.
2. Persist per-phase checkpoints and resume from last successful phase/module.
   - Avoid restarting from scratch after partial success.
3. Add hard per-phase watchdog + structured termination diagnostics in SSE output.
   - Distinguish timeout, provider abort, parse failure, transport close.
4. Add success-rate telemetry by provider+model+phase.
   - Drive routing decisions from observed health, not static preference.
5. Keep verification gate strict (already done) and add retry budget policy surfaced in UI.

## Bottom Line

The core v2 hardening work is real and meaningful. The latest GitHub Meta retest still failed before completion, and non-Meta paths also showed provider/timeouts issues, so this is a cross-model reliability problem, not a single-model bug. End-to-end reliability is not yet where your requirement demands. The system is on a much stronger foundation now, but one more reliability layer (provider failover + phase resume + better termination diagnostics) is needed before claiming dependable "generate complete app end to end" behavior across runs.
