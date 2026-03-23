# AI Generation Full Features - Codebase Reference

Last updated: 2026-03-24
Scope: Implemented AI generation subsystem and direct integrations present in this repository.

---

## 1. What This Covers

This document is a code-accurate map of AI generation capabilities currently implemented in this codebase, including:

1. AI provider/model handling
2. Requirements interview flow (question generation + compile)
3. Full app generation streaming (SSE)
4. Refinement workflow
5. Project chat assistant
6. Design-to-code streaming
7. Quality gates, retries, and fallback logic
8. Persistence, quotas, rate limits, and telemetry
9. Frontend builder UX behavior and data handoff

---

## 2. AI Endpoints

Base backend mount: `/api/ai`

Routes:

1. `GET /api/ai/providers`
2. `POST /api/ai/generate`
3. `POST /api/ai/design-to-code`
4. `POST /api/ai/refine`
5. `POST /api/ai/chat`
6. `POST /api/ai/requirements`
7. `POST /api/ai/requirements/compile`

Route wiring is in backend AI router and server module registration.

---

## 3. Provider and Model Support

## 3.1 Providers

Supported provider ids:

- `openai`
- `gemini`
- `anthropic`
- `ollama`
- `nvidia`
- `github`

## 3.2 Model normalization rules

Backend and frontend both normalize model/provider pairs to avoid invalid combinations.

Examples:

- OpenAI strips `openai/` prefixes and blocks cross-provider model ids
- GitHub Models enforces provider-prefixed ids (for example `openai/gpt-4.1`)
- Gemini defaults to safe flash variants when ambiguous

## 3.3 API key resolution

Behavior in AI service:

1. If user provides API key, use it.
2. If no key:
   - Gemini can use platform `GEMINI_API_KEY`
   - Ollama needs no key (local)
   - NVIDIA can use `NVIDIA_API_KEY`
   - GitHub can use `GITHUB_MODELS_API_KEY` or `GITHUB_TOKEN`
   - OpenAI/Anthropic require BYOK unless explicitly configured externally

## 3.4 Provider metadata endpoint

`GET /api/ai/providers` returns provider cards with models, speed/quality labels, and `requiresKey` flags for UI selection.

---

## 4. Requirements Interview System (Step 3 of builder)

This is a full pre-generation interview pipeline, not just a prompt textbox.

## 4.1 Frontend state machine

Generation phases represented in shared types:

- `idle`
- `questioning`
- `answering`
- `confirming`
- `generating`
- `complete`
- `error`

The hook manages:

1. Ask questions (`POST /api/ai/requirements`)
2. Store answers keyed by question id
3. Compile requirements (`POST /api/ai/requirements/compile`)
4. Confirm + persist to local storage for generate step

## 4.2 Questions endpoint behavior

Input:

- `userIdea`
- `selectedModules`
- `provider`, `apiKey`, `model` (optional)

Output shape:

- `appType`
- `projectName`
- `questions[]` (3 to 5)

Resilience features:

1. Lenient JSON parsing from model outputs
2. JSON repair retry prompt
3. Deterministic fallback questions on parse/repair failure
4. Minimum question count enforcement (pads to at least 3)
5. Explicit handling of quota/rate-limit failures

## 4.3 Requirements compile endpoint behavior

Input:

- `originalPrompt`
- `projectName`
- `answers[]`
- `selectedModules`
- optional provider/model/key

Output:

- Full `RequirementsDocument`
- `_meta` source metadata (`ai` or `fallback`)

Resilience and safety:

1. Deterministic fallback requirements document builder
2. Strict retry + repair retry for malformed model JSON
3. Fill missing fields from deterministic fallback
4. Preserve exact user answers even if model rewrites them
5. Domain rebalance pass to reduce auth-only bias for non-auth ideas

---

## 5. Full App Generation (`POST /api/ai/generate`)

## 5.1 Transport mode

Uses SSE streaming from backend to frontend.

Response stream includes events for:

- start
- chunk
- file
- quality_retry
- quality_report
- complete
- error

## 5.2 Backend generate flow

Controller behavior:

1. Validates provider and prompt input
2. Starts SSE headers and stream
3. Calls AI service `generate` with chunk callback
4. Accumulates full model output
5. Extracts files robustly (full JSON parse first, then salvage parser)
6. Runs requirements compliance retry when requirements exist
7. Runs premium quality gate with up to 3 retries
8. Streams normalized files back to frontend
9. Persists to platform project history for authenticated users
10. Increments generation usage count for authenticated users
11. Emits complete metadata

## 5.3 File extraction hardening

Robust extraction pipeline supports:

1. Direct JSON payloads
2. Markdown fenced outputs
3. Escaped JSON strings
4. Truncated outputs with partial file object recovery
5. Trailing comma cleanup

## 5.4 Requirements compliance pass

When a requirements document exists:

1. Generated files are scanned for expected feature signals
2. Missing requested features trigger an automatic retry generation pass
3. Retry uses targeted prompt augmentation with missing feature list

## 5.5 Premium quality gate

A strict post-generation gate evaluates output against production criteria.

Checks include:

1. Required landing page presence
2. Required visual token variables in globals CSS
3. Presence of animation/motion primitives
4. Domain depth (domain module count inference)
5. Module completeness checks per domain module (backend + frontend file sets)
6. Auth UI quality checks (layout, spacing, styling, interaction quality)
7. Minimum file volume sanity checks

If failed:

- Backend retries generation with hard-fail correction prompt
- Up to 3 retries
- Final hard failure if quality still fails

## 5.6 AI prompt system for generation

Prompt subsystem includes:

1. A large system prompt enforcing full-stack structure
2. Design DNA seeded variation system (layout, palette, typography, motion)
3. Domain module detector (ecommerce/blog/task/booking/inventory/finance/restaurant/saas/social/custom)
4. Requirements block injection to prioritize interview output
5. Strict file structure expectations for generated outputs

---

## 6. Refine Workflow (`POST /api/ai/refine`)

Purpose: modify previously generated code from natural-language refinement requests.

Flow:

1. Frontend sends `previousCode` + `refinementRequest`
2. Backend compresses context file payload to token-safe subset
3. AI service runs provider call with refine prompt
4. Backend extracts files and streams them back as `file` events
5. If authenticated and `projectId` exists, changes are saved as a new project version
6. Chat history is appended with refine prompt

Context compression strategy exists on both frontend (before request) and backend (before prompt build) to control token size.

---

## 7. Project Chat (`POST /api/ai/chat`)

Purpose: conversational assistant over generated project context without direct file rewrite.

Input includes:

- message
- provider/model/key
- lightweight project context (name, description, file count, key files, modules)

Behavior:

- Uses non-streaming AI completion
- Returns concise plain-English assistant reply

Frontend can route some chat messages to refine instead, based on refinement intent keyword detection.

---

## 8. Design-to-Code (`POST /api/ai/design-to-code`)

This feature is implemented and used by design canvas page.

Flow:

1. Frontend sends design JSON from visual canvas
2. Backend streams generated component code via SSE chunks
3. Frontend concatenates streamed text into export code panel

This is distinct from full app generation and operates on a design JSON payload.

---

## 9. Frontend Builder Integration

## 9.1 Select AI page

The requirements interview UI includes:

1. Provider/model selection
2. Optional API key
3. User idea input with quick-add requirement chips
4. Question asking and answer forms
5. Compile confirmation view with feature checklist
6. Provider rate-limit fallback UI (switch provider + retry)
7. Local storage handoff to generation page

## 9.2 AI Generate page

Core frontend generation behavior:

1. Reads builder state (or existing project by `projectId`)
2. Starts generate/refine stream request
3. Parses SSE `data:` lines and updates UI progressively
4. Builds and renders file tree incrementally
5. Fallback parses full stream text if no file events detected
6. Stores generated project and chat history continuously
7. Supports deployment handoff, publish toggle, invite, export tools, and preview mode

Additional integrated capabilities on same page:

- Version history component integration
- In-page AI chat panel
- Team invite action
- Publish/unpublish template toggle
- Export helpers (Docker, compose, CI, tests)
- Device preview framing

---

## 10. Persistence and Project System Coupling

When request has authenticated user context:

1. Create platform project
2. Save generated files (with versioning support)
3. Append chat history entry (`generate` or `refine`)
4. Increment generation usage counter

Project access is team-aware through platform projects service.

---

## 11. Rate Limiting and Quota State (Current Code)

Important current-state behavior:

1. `requirementsLimiter` is configured but effectively disabled with `skip: () => true`
2. `generationLimiter` is configured but effectively disabled with `skip: () => true`
3. `checkGenerationQuota` middleware currently allows unlimited generations (early `next()`)

Result: generation is effectively unlimited in present implementation despite quota/rate structures existing.

---

## 12. Telemetry Events

AI pipeline emits telemetry signals such as:

- generation.started
- generation.quality_retry
- generation.persisted
- generation.persist_failed
- generation.completed
- generation.failed
- requirements.question_gen.success
- requirements.question_gen.parse_failed
- requirements.question_gen.repaired
- requirements.question_gen.quota_exceeded
- requirements.compile.success
- requirements.compile.parse_failed
- requirements.compile.repaired

Dev telemetry endpoint exists in backend for non-production environments.

---

## 13. Security and Auth Behavior

1. AI generate/refine/chat and requirements routes use optional auth
2. Anonymous users can still generate (where provider/key policy allows)
3. Invalid optional auth tokens are ignored (no hard block)
4. Authenticated runs unlock persistence and usage tracking

---

## 14. Frontend-Backend Contract Notes

## 14.1 Practical SSE parsing behavior

Frontend parser currently keys off JSON payload fields (`text`, `path`, `fileCount`) rather than explicit SSE event names.

This works but means some event classes (for example quality report details) are not deeply surfaced unless they include recognized payload keys.

## 14.2 Robust fallback behavior

If streamed file events are missing, frontend runs local JSON extraction and regex salvage of streamed text.

---

## 15. Known Design Intent Hardening Present in Code

The code includes explicit anti-failure patterns:

1. Auth-only bias mitigation in requirements rebalance and quality checks
2. Strict domain module completeness checks
3. Lenient parse + jsonrepair + deterministic fallback for requirements APIs
4. Provider model normalization to avoid invalid model/provider pairings
5. Gemini fallback chain for platform key usage

---

## 16. Existing AI Docs vs Runtime Code

This repo contains older flow docs that describe prior middleware behavior and route chains.

Current source of truth is implementation in backend AI module and frontend builder pages. Some documented limits in older markdown may no longer match runtime behavior due to current disabled rate/quota checks.

---

## 17. Primary Source Files

Backend AI subsystem:

- backend/src/modules/ai/ai.routes.ts
- backend/src/modules/ai/ai.controller.ts
- backend/src/modules/ai/ai.service.ts
- backend/src/modules/ai/ai.prompts.ts
- backend/src/modules/ai/ai.types.ts

Frontend AI generation flow:

- frontend/pages/builder/select-ai.tsx
- frontend/hooks/useRequirementsFlow.ts
- frontend/types/generation.ts
- frontend/pages/builder/ai-generate.tsx

AI-adjacent integrations:

- frontend/pages/design/canvas.tsx
- backend/src/middleware/auth.middleware.ts
- backend/src/middleware/rateLimit.middleware.ts
- backend/src/middleware/generationQuota.middleware.ts
- backend/src/modules/platform-projects/platform-projects.service.ts
- backend/src/server.ts

Existing internal docs:

- AI_GENERATION_FLOW.md
- AI_GENERATION_FLOW_V2_AGENT.md

---

## 18. End-to-End Runtime Summary

1. User enters idea in builder interview page.
2. App asks dynamic questions and compiles structured requirements with fallbacks.
3. Generation request streams full app output via SSE.
4. Backend enforces prompt + post-gen quality gates and retries.
5. Files stream back progressively and are rendered live.
6. If authenticated, project/version/chat are persisted and usage increments.
7. User can refine, chat, export, preview, and deploy from the same flow.

This is the currently implemented AI generation platform behavior in the codebase.
