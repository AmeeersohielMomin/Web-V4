# AI Generation Flow V2 — Agent Execution Document
> Conversational Requirements Gathering Before Code Generation
> Version: 3.0 | Date: 2026-03-19
> Based on: AI_GENERATION_FLOW.md (existing working system)

---

## ═══════════════════════════════════════════════
## MASTER AGENT INSTRUCTIONS — READ THIS FIRST
## ═══════════════════════════════════════════════

### What You Are
You are an AI coding agent executing a feature addition to the IDEA Platform.
You have file read/write/edit access to the project repository.

### What This Document Is
A precise, ordered execution plan. Every section is a task with:
- An exact action verb (CREATE / APPEND / FIND+INSERT / FIND+REPLACE / TEST / VERIFY)
- A target file path
- The exact code to write
- A verification command to confirm success before moving on

### Core Rules — Never Break These

```
RULE 1 — READ BEFORE WRITE
  Before editing any existing file, read it first.
  Confirm the function/class you are targeting actually exists at the location described.
  If it does not exist, STOP and report the discrepancy. Do not guess.

RULE 2 — ONE STEP AT A TIME
  Complete one numbered step fully. Run its verification. Confirm it passes.
  Only then start the next step. Never batch multiple steps together.

RULE 3 — NEVER REWRITE AN EXISTING FILE
  [APPEND] means add code at the end of the file or inside a specific class.
  [FIND+INSERT] means locate a specific line and insert after/before it.
  [FIND+REPLACE] means locate a specific string and replace only that string.
  If an instruction says [NEW] it means the file does not yet exist — create it.
  Never delete existing code unless the instruction explicitly says REMOVE.

RULE 4 — PRESERVE MEANS LOCKED
  Any file marked [PRESERVE] must not be opened for writing under any circumstance.
  Not even to fix a typo. If you believe a preserved file needs a change,
  STOP and report it. Do not proceed.

RULE 5 — VERIFY BEFORE PROCEEDING
  Every step ends with a VERIFY block. Run it. If it fails, fix only that step.
  Do not proceed to the next step with a failing verification.

RULE 6 — STOP CONDITIONS
  Stop immediately and report to the user if:
  - A target file does not exist at the path specified
  - A target function/class is named differently than expected
  - A verification command produces an unexpected error
  - You are about to write code that would break existing exports or interfaces
  - Any file marked [PRESERVE] appears to need modification
```

### Tag Legend

| Tag | Meaning |
|-----|---------|
| `[NEW]` | File does not exist. Create it at the exact path given. |
| `[APPEND]` | File exists. Add the given code at the bottom (or inside the class as specified). |
| `[FIND+INSERT]` | File exists. Locate the anchor string. Insert the given code immediately after it. |
| `[FIND+REPLACE]` | File exists. Replace the anchor string with the replacement string exactly. |
| `[PRESERVE]` | File must not be touched. Skip it entirely. |
| `[VERIFY]` | Run this command or check. Must pass before proceeding. |
| `[STOP IF]` | Condition that requires you to halt and report to the user. |

### Execution Order Summary

```
BACKEND FIRST (Steps 1–6)
  Step 1  → Create types file
  Step 2  → Add prompt builder functions to ai.prompts.ts
  Step 3  → Extend buildFullstackPrompt in ai.prompts.ts
  Step 4  → Add generateNonStreaming to ai.service.ts
  Step 5  → Add requirements service methods to ai.service.ts
  Step 6  → Add controller methods to ai.controller.ts
  Step 7  → Add routes to ai.routes.ts
  Step 8  → Pass requirements through generate controller

FRONTEND SECOND (Steps 9–13)
  Step 9  → Create generation types
  Step 10 → Create useRequirementsFlow hook
  Step 11 → Create select-ai.tsx page
  Step 12 → Modify ai-generate.tsx (2 small changes only)
  Step 13 → Update routing in deployment.tsx

QUALITY + PREVIEW (Steps 14–15)
  Step 14 → Add auto-preview to ai-generate.tsx
  Step 15 → Add requirements compliance quality gate

FINAL VERIFICATION (Step 16)
  Step 16 → End-to-end flow test
```

---

## ═══════════════════════════════════════════════
## CONTEXT: WHAT EXISTS AND WHAT IS CHANGING
## ═══════════════════════════════════════════════

### Current Flow (V1 — DO NOT BREAK)
```
User types prompt (5 words)
  → deployment.tsx clicks "Generate"
  → routes to /builder/ai-generate
  → POST /api/ai/generate (SSE)
  → files stream
  → user clicks file to preview
```

### New Flow (V2 — What This Document Builds)
```
User types idea (free text)
  → deployment.tsx clicks "Generate"
  → routes to /builder/select-ai     ← NEW PAGE
  → POST /api/ai/requirements         ← NEW ENDPOINT (REST, not SSE)
  → AI returns 3–5 clarifying questions
  → user answers each question
  → POST /api/ai/requirements/compile ← NEW ENDPOINT (REST, not SSE)
  → AI returns RequirementsDocument + summary
  → user reviews summary, clicks "Build it"
  → routes to /builder/ai-generate    ← EXISTING (2 lines changed)
  → POST /api/ai/generate with requirements field ← EXISTING ENDPOINT EXTENDED
  → files stream with full context
  → preview auto-renders              ← NEW BEHAVIOUR
```

### Key Constraint
The two new endpoints (`/requirements` and `/requirements/compile`) are plain
REST JSON — NOT Server-Sent Events. They are fast calls (< 3 seconds each)
that use the same AI providers but with low token limits (600 and 800 tokens).
The existing SSE generate endpoint is NOT changed — only extended.

---

## ═══════════════════════════════════════════════
## STEP 1 — CREATE SHARED TYPES
## ═══════════════════════════════════════════════

**Action:** [NEW]
**File:** `backend/src/modules/ai/ai.types.ts`

```typescript
// backend/src/modules/ai/ai.types.ts
// Shared types for the requirements gathering system.
// Imported by ai.service.ts, ai.controller.ts, and ai.prompts.ts.

export interface RequirementsQuestion {
  id: string;
  question: string;
  hint?: string;
  category: 'features' | 'design' | 'users' | 'technical' | 'scope';
  required: boolean;
}

export interface RequirementsAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface RequirementsDocument {
  originalPrompt: string;
  projectName: string;
  appType: string;
  targetUsers: string;
  coreFeatures: string[];
  designPreference: string;
  themeMode: 'light' | 'dark' | 'hybrid' | 'any';
  scale: 'personal' | 'startup' | 'enterprise';
  techPreferences: string;
  additionalNotes: string;
  answers: RequirementsAnswer[];
  compiledSummary: string;
}

export interface QuestionsResponse {
  appType: string;
  projectName: string;
  questions: RequirementsQuestion[];
}

export interface NonStreamingParams {
  provider: string;
  apiKey?: string;
  model?: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}
```

### [VERIFY] Step 1
```bash
# Run from project root
ls backend/src/modules/ai/ai.types.ts
# Expected: file exists, no error

cd backend && npx tsc --noEmit 2>&1 | grep "ai.types"
# Expected: no errors mentioning ai.types.ts
```

[STOP IF] `tsc` reports any syntax error in ai.types.ts before proceeding.

---

## ═══════════════════════════════════════════════
## STEP 2 — ADD PROMPT BUILDER FUNCTIONS
## ═══════════════════════════════════════════════

**Action:** [APPEND]
**File:** `backend/src/modules/ai/ai.prompts.ts`

Read this file first. Confirm it exports a function named `buildFullstackPrompt`.
Then append the following two new exported functions at the very end of the file.
Do not modify anything above the append point.

```typescript
// ─── APPEND BELOW ALL EXISTING CODE ───────────────────────────────────────

import type { RequirementsAnswer } from './ai.types';

export function buildRequirementsQuestionsPrompt(
  userIdea: string,
  selectedModules: string[]
): string {
  return `You are a senior product engineer conducting a requirements interview before building a web application.

A user described their idea:
"${userIdea}"

Selected modules: ${selectedModules.join(', ') || 'auth (default)'}

Your job: Generate exactly 3 to 5 targeted questions that will gather the most important information needed to build this app correctly. Do not ask generic questions. Every question must be specific to THIS type of application based on the idea described.

Question categories (use only the most relevant):
- "users": who will use this app and why
- "features": which specific features are must-have vs nice-to-have
- "design": visual style, theme mode (light/dark), brand feel
- "technical": specific technology choices (payment provider, database, etc.)
- "scope": personal project vs real business launch

Rules:
1. Return ONLY valid JSON. No explanation, no markdown fences, no preamble.
2. "projectName" must be lowercase letters and hyphens only, max 30 chars.
3. "appType" must be exactly one of: "e-commerce", "blog", "dashboard", "social", "saas", "portfolio", "auth", "analytics", "booking", "marketplace", "other".
4. Each question must be conversational — not a form label.
5. "hint" is a short example answer shown as placeholder text to guide the user.
6. Minimum 3 questions, maximum 5. No more.
7. At least 3 questions must have required: true.

Return ONLY this JSON structure and nothing else:
{
  "appType": "string",
  "projectName": "string",
  "questions": [
    {
      "id": "q1",
      "question": "conversational question text",
      "hint": "example answer",
      "category": "users",
      "required": true
    }
  ]
}`;
}


export function buildRequirementsCompilePrompt(
  originalPrompt: string,
  projectName: string,
  answers: RequirementsAnswer[],
  selectedModules: string[]
): string {
  const answersText = answers
    .map(a => `Q: ${a.question}\nA: ${a.answer}`)
    .join('\n\n');

  return `You are a senior software architect. Compile a structured requirements document from a user interview.

Original idea: "${originalPrompt}"
Project name: ${projectName}
Selected modules: ${selectedModules.join(', ')}

User answers:
${answersText}

Rules:
1. Return ONLY valid JSON. No explanation, no markdown fences, no preamble.
2. "coreFeatures" must be an array of concrete feature strings, maximum 8 items.
3. "themeMode" must be exactly one of: "light", "dark", "hybrid", "any".
4. "scale" must be exactly one of: "personal", "startup", "enterprise".
5. "compiledSummary" must be 2–4 plain English sentences. Must start with "You're building".
6. Infer reasonable values for any field not explicitly answered. Do not leave fields empty.
7. "techPreferences" is a single string summarising technology choices mentioned.
8. "designPreference" is a single string describing the visual style.

Return ONLY this JSON structure and nothing else:
{
  "originalPrompt": "string",
  "projectName": "string",
  "appType": "string",
  "targetUsers": "string",
  "coreFeatures": ["string"],
  "designPreference": "string",
  "themeMode": "light | dark | hybrid | any",
  "scale": "personal | startup | enterprise",
  "techPreferences": "string",
  "additionalNotes": "string",
  "answers": ${JSON.stringify(answers)},
  "compiledSummary": "string"
}`;
}
```

### [VERIFY] Step 2
```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors. If errors appear, they must NOT reference ai.prompts.ts.
# Any error in ai.prompts.ts = fix before proceeding.
```

[STOP IF] TypeScript reports an error in ai.prompts.ts after appending.

---

## ═══════════════════════════════════════════════
## STEP 3 — EXTEND buildFullstackPrompt SIGNATURE
## ═══════════════════════════════════════════════

**Action:** [FIND+REPLACE]
**File:** `backend/src/modules/ai/ai.prompts.ts`

First, read the file and find the exact function signature of `buildFullstackPrompt`.
It will look something like one of these patterns:

```
Pattern A:
export function buildFullstackPrompt(
  userPrompt: string,
  designDNA: DesignDNA,
  selectedModules: string[]
): string {

Pattern B:
export function buildFullstackPrompt(userPrompt: string, designDNA: DesignDNA, selectedModules: string[]): string {

Pattern C:
export const buildFullstackPrompt = (userPrompt: string, designDNA: DesignDNA, selectedModules: string[]) => {
```

[STOP IF] None of these patterns are found — the function may be named differently.
Report the actual function name found.

**After confirming the pattern, perform this replacement:**

Find the closing `)` of the parameter list (just before `: string {` or `=> {`)
and add the requirements parameter. Here is the exact replacement for Pattern A:

```typescript
// FIND (Pattern A — adjust if your pattern differs):
export function buildFullstackPrompt(
  userPrompt: string,
  designDNA: DesignDNA,
  selectedModules: string[]
): string {

// REPLACE WITH:
import type { RequirementsDocument } from './ai.types';

export function buildFullstackPrompt(
  userPrompt: string,
  designDNA: DesignDNA,
  selectedModules: string[],
  requirements?: RequirementsDocument
): string {
  // Build the requirements context block when requirements are provided
  const requirementsBlock = requirements ? `
=== PROJECT REQUIREMENTS (compiled from user interview) ===
Application type: ${requirements.appType}
Target users: ${requirements.targetUsers}
Scale: ${requirements.scale}
Theme mode: ${requirements.themeMode}
Design preference: ${requirements.designPreference}

Core features — ALL of these must be implemented:
${requirements.coreFeatures.map(f => `- ${f}`).join('\n')}

Technology preferences: ${requirements.techPreferences}
Additional notes: ${requirements.additionalNotes}

User's own words (use these for naming, copy, and UX tone):
${requirements.answers.map(a => `- "${a.answer}"`).join('\n')}

CRITICAL RULES WHEN REQUIREMENTS ARE PRESENT:
1. Every feature in the list above must appear in the generated code.
2. Do not add features not listed.
3. The theme mode must match exactly. Do not default to dark if "light" is specified.
4. The design preference takes priority over the Design DNA section below.
=== END OF PROJECT REQUIREMENTS ===

` : '';
  // ── The rest of the function body is UNCHANGED ──
  // ── Insert requirementsBlock at the very start of the returned string ──
  // Find the return statement of this function and prepend requirementsBlock
  // See the note below on how to do this safely
```

**Important note for the agent on the return statement:**
Inside `buildFullstackPrompt`, find the `return` statement that assembles
the final prompt string. It will look something like:

```typescript
return `${systemPrompt}...${designDNASection}...${userPrompt}`;
// OR
return systemPrompt + designDNASection + userInstruction;
```

Prepend `requirementsBlock` to the return value like this:

```typescript
// FIND: return `${systemPrompt}
// REPLACE WITH: return requirementsBlock + `${systemPrompt}

// OR if using concatenation:
// FIND: return systemPrompt
// REPLACE WITH: return requirementsBlock + systemPrompt
```

### [VERIFY] Step 3
```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors.

# Quick functional check — confirm the function accepts 4 args without error
# Add a temporary test call at the end of the file, run tsc, then remove it:
echo "const _test = buildFullstackPrompt('test', {} as any, [], undefined);" >> backend/src/modules/ai/ai.prompts.ts
cd backend && npx tsc --noEmit 2>&1 | head -5
# Expected: 0 errors
# Then remove the test line immediately
```

[STOP IF] TypeScript errors reference buildFullstackPrompt after this change.

---

## ═══════════════════════════════════════════════
## STEP 4 — ADD generateNonStreaming TO ai.service.ts
## ═══════════════════════════════════════════════

**Action:** [APPEND inside class]
**File:** `backend/src/modules/ai/ai.service.ts`

Read the file. Find the class name (likely `AiService`). Find the closing
`}` of the class. Insert the following private method BEFORE that closing brace.

[STOP IF] The service is not a class but a set of exported functions.
Report the actual structure and wait for instructions.

```typescript
// ─── ADD INSIDE AiService CLASS, BEFORE THE CLOSING BRACE ─────────────────

  /**
   * Single non-streaming completion call used for requirements gathering.
   * Returns a plain string (the model's full response).
   * Uses the same API key resolution and model defaults as the streaming path.
   */
  private async generateNonStreaming(params: NonStreamingParams): Promise<string> {
    const resolvedKey = this.resolveApiKey(params.provider, params.apiKey);
    const resolvedModel = this.resolveModel(params.provider, params.model);

    switch (params.provider) {
      case 'gemini':
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

  private async callGeminiNonStreaming(
    apiKey: string,
    model: string,
    prompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
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
    const OpenAI = (await import('openai')).default;
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
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
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
```

**Also add this import at the top of ai.service.ts if not already present:**

```typescript
// [FIND+INSERT] — find the last existing import line in ai.service.ts
// Add after it:
import type { NonStreamingParams, RequirementsQuestion, RequirementsAnswer, RequirementsDocument, QuestionsResponse } from './ai.types';
```

### [VERIFY] Step 4
```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors.
# Any "Property does not exist" errors on resolveApiKey or resolveModel
# means those methods have different names. Report actual names and stop.
```

[STOP IF] `resolveApiKey` or `resolveModel` do not exist on the class.
Read the service file, find the actual names of these helper methods, and
use those names in the switch statement above.

---

## ═══════════════════════════════════════════════
## STEP 5 — ADD REQUIREMENTS SERVICE METHODS
## ═══════════════════════════════════════════════

**Action:** [APPEND inside class]
**File:** `backend/src/modules/ai/ai.service.ts`

Add these two public methods to the `AiService` class, after the
`generateNonStreaming` method added in Step 4, before the class closing brace.

```typescript
// ─── ADD INSIDE AiService CLASS AFTER generateNonStreaming ─────────────────

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

    const rawResponse = await this.generateNonStreaming({
      provider: params.provider,
      apiKey: params.apiKey,
      model: params.model,
      prompt,
      maxTokens: 600,
      temperature: 0.3
    });

    const cleaned = rawResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed: QuestionsResponse;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        'AI returned malformed questions. This is a temporary issue — please try again.'
      );
    }

    // Validate minimum structure
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
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

    const rawResponse = await this.generateNonStreaming({
      provider: params.provider,
      apiKey: params.apiKey,
      prompt,
      maxTokens: 800,
      temperature: 0.3
    });

    const cleaned = rawResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed: RequirementsDocument;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        'AI returned malformed requirements. This is a temporary issue — please try again.'
      );
    }

    // Validate required fields exist
    if (!parsed.compiledSummary || !parsed.coreFeatures) {
      throw new Error('AI returned incomplete requirements. Please try again.');
    }

    return parsed;
  }
```

**Also add this import near the top of ai.service.ts:**

```typescript
// [FIND+INSERT] — find the import of buildFullstackPrompt in ai.service.ts
// It will look like: import { buildFullstackPrompt } from './ai.prompts';
// REPLACE with:
import {
  buildFullstackPrompt,
  buildRequirementsQuestionsPrompt,
  buildRequirementsCompilePrompt
} from './ai.prompts';
```

### [VERIFY] Step 5
```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors.
```

---

## ═══════════════════════════════════════════════
## STEP 6 — ADD CONTROLLER METHODS
## ═══════════════════════════════════════════════

**Action:** [APPEND inside class]
**File:** `backend/src/modules/ai/ai.controller.ts`

Read the file. Find the controller class (likely `AiController`).
Find the last existing method. Add the following two methods after it,
before the class closing brace.

**Also add this import if not present:**
```typescript
import type { RequirementsDocument } from './ai.types';
```

```typescript
// ─── ADD INSIDE AiController CLASS BEFORE CLOSING BRACE ───────────────────

  /**
   * POST /api/ai/requirements
   * Analyses the user's idea and returns 3–5 targeted clarifying questions.
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
      console.error('[getRequirementsQuestions]', err.message);
      res.status(500).json({
        success: false,
        data: null,
        error: err.message || 'Failed to generate questions. Please try again.'
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
      const { originalPrompt, projectName, answers, selectedModules, provider, apiKey } = req.body;

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

      const requirements = await aiService.compileRequirementsDocument({
        originalPrompt: originalPrompt.trim(),
        projectName: projectName || 'my-app',
        answers,
        selectedModules: Array.isArray(selectedModules) ? selectedModules : [],
        provider: provider || 'gemini',
        apiKey: apiKey || undefined
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
```

### [VERIFY] Step 6
```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors.
```

---

## ═══════════════════════════════════════════════
## STEP 7 — ADD NEW ROUTES TO ai.routes.ts
## ═══════════════════════════════════════════════

**Action:** [FIND+INSERT]
**File:** `backend/src/modules/ai/ai.routes.ts`

Read the file. Find the last `router.post(` or `router.get(` line in the file.
Insert the following two route registrations immediately after it.

[STOP IF] The router variable is named differently than `router`.
Use the actual variable name.

```typescript
// ─── ADD AFTER LAST EXISTING ROUTE ────────────────────────────────────────

// Requirements gathering routes — these do NOT consume generation quota
// freeTierLimiter and optionalAuth are already imported in this file
router.post(
  '/requirements',
  freeTierLimiter,
  optionalAuth,
  aiController.getRequirementsQuestions
);

router.post(
  '/requirements/compile',
  freeTierLimiter,
  optionalAuth,
  aiController.compileRequirements
);
```

[STOP IF] `freeTierLimiter` or `optionalAuth` are not imported in this file.
Read the imports section, identify the actual names used, and update accordingly.
Do not import new middleware — only use what already exists in this file.

### [VERIFY] Step 7
```bash
# Build check
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors.

# Runtime check — start the backend and curl the new endpoint
cd backend && npm run dev &
sleep 5

curl -s -X POST http://localhost:5000/api/ai/requirements \
  -H "Content-Type: application/json" \
  -d '{"userIdea":"","provider":"gemini"}' | jq '.error'
# Expected: "Please describe your idea in more detail..."

curl -s -X POST http://localhost:5000/api/ai/requirements \
  -H "Content-Type: application/json" \
  -d '{"userIdea":"build me a blog","provider":"gemini","selectedModules":["auth"]}' | jq '.success'
# Expected: true (if GEMINI_API_KEY is set in .env)
# Expected: error message about API key if no key set

# Kill dev server
kill %1
```

[STOP IF] The curl returns a 404 — route was not registered correctly.

---

## ═══════════════════════════════════════════════
## STEP 8 — PASS requirements THROUGH GENERATE CONTROLLER
## ═══════════════════════════════════════════════

**Action:** [FIND+INSERT]
**File:** `backend/src/modules/ai/ai.controller.ts`

Read the existing `generate` method (NOT getRequirementsQuestions).
Find the line where `req.body` is destructured. Add `requirements` to the
destructuring. Then find where `aiService.generate(` is called and pass
`requirements` through.

```typescript
// FIND the destructuring line in aiController.generate, something like:
const { provider, userPrompt, apiKey, model, selectedModules, projectName } = req.body;

// REPLACE with (add requirements at the end):
const { provider, userPrompt, apiKey, model, selectedModules, projectName, requirements } = req.body;
const typedRequirements: RequirementsDocument | undefined = requirements || undefined;
```

```typescript
// FIND the aiService.generate() call. It will look like one of:
await aiService.generate({ provider, userPrompt, apiKey, model, selectedModules, projectName, ... }, onChunk);
// OR
await aiService.generate(provider, userPrompt, ...otherArgs, onChunk);
```

For object-style call, add `requirements: typedRequirements` to the object.
For positional-style call, read the service generate method signature and
add requirements as the last parameter before onChunk.

```typescript
// ALSO: find where aiService.generate calls buildFullstackPrompt inside ai.service.ts
// The call will look like:
const prompt = buildFullstackPrompt(userPrompt, designDNA, selectedModules);

// ADD requirements as the 4th argument:
const prompt = buildFullstackPrompt(userPrompt, designDNA, selectedModules, requirements);
```

[STOP IF] `buildFullstackPrompt` is called with a different signature than expected.
Report the actual call signature found before proceeding.

### [VERIFY] Step 8
```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors.

# The requirements field should now pass through without TypeScript errors.
```

---

## ═══════════════════════════════════════════════
## STEP 9 — CREATE FRONTEND TYPES
## ═══════════════════════════════════════════════

**Action:** [NEW]
**File:** `frontend/types/generation.ts`

```typescript
// frontend/types/generation.ts
// Type definitions for the V2 requirements-gathering generation flow.

export type GenerationPhase =
  | 'idle'          // Prompt input shown, waiting for user to describe idea
  | 'questioning'   // API call in progress to generate questions
  | 'answering'     // Questions shown, user typing answers
  | 'confirming'    // Compiled summary shown, user reviewing
  | 'generating'    // SSE generation in progress
  | 'complete'      // Files received, preview rendered
  | 'error';        // Something failed

export interface RequirementsQuestion {
  id: string;
  question: string;
  hint?: string;
  category: 'features' | 'design' | 'users' | 'technical' | 'scope';
  required: boolean;
}

export interface RequirementsAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface RequirementsDocument {
  originalPrompt: string;
  projectName: string;
  appType: string;
  targetUsers: string;
  coreFeatures: string[];
  designPreference: string;
  themeMode: 'light' | 'dark' | 'hybrid' | 'any';
  scale: 'personal' | 'startup' | 'enterprise';
  techPreferences: string;
  additionalNotes: string;
  answers: RequirementsAnswer[];
  compiledSummary: string;
}

export interface QuestionsApiResponse {
  appType: string;
  projectName: string;
  questions: RequirementsQuestion[];
}
```

### [VERIFY] Step 9
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors in types/generation.ts
```

---

## ═══════════════════════════════════════════════
## STEP 10 — CREATE useRequirementsFlow HOOK
## ═══════════════════════════════════════════════

**Action:** [NEW]
**File:** `frontend/hooks/useRequirementsFlow.ts`

```typescript
// frontend/hooks/useRequirementsFlow.ts
// Custom hook that owns the full idle→questioning→answering→confirming state machine.
// Used by select-ai.tsx to keep that page clean.

import { useState } from 'react';
import api from '../lib/api';
import type {
  GenerationPhase,
  RequirementsQuestion,
  RequirementsAnswer,
  RequirementsDocument,
  QuestionsApiResponse
} from '../types/generation';

interface UseRequirementsFlowParams {
  selectedModules: string[];
  provider: string;
  apiKey?: string;
  model?: string;
}

interface UseRequirementsFlowReturn {
  phase: GenerationPhase;
  userIdea: string;
  setUserIdea: (v: string) => void;
  questions: RequirementsQuestion[];
  answers: Record<string, string>;
  setAnswer: (questionId: string, value: string) => void;
  requirements: RequirementsDocument | null;
  projectName: string;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  askQuestions: () => Promise<void>;
  compileRequirements: () => Promise<void>;
  resetToAnswering: () => void;
  skipToConfirm: () => void;
}

export function useRequirementsFlow(
  params: UseRequirementsFlowParams
): UseRequirementsFlowReturn {
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [userIdea, setUserIdea] = useState('');
  const [questions, setQuestions] = useState<RequirementsQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [requirements, setRequirements] = useState<RequirementsDocument | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const clearError = () => setError(null);

  /**
   * Call POST /api/ai/requirements with the user's idea.
   * On success: transitions to 'answering' phase with questions populated.
   * On failure: returns to 'idle' with error message shown.
   */
  const askQuestions = async (): Promise<void> => {
    if (userIdea.trim().length < 10) {
      setError('Please describe your idea in a bit more detail — at least a sentence.');
      return;
    }
    setError(null);
    setPhase('questioning');
    setLoading(true);

    try {
      const { data } = await api.post('/api/ai/requirements', {
        userIdea: userIdea.trim(),
        selectedModules: params.selectedModules,
        provider: params.provider,
        apiKey: params.apiKey || undefined,
        model: params.model || undefined
      });

      const result = data.data as QuestionsApiResponse;

      // Initialise answers map with empty strings
      const emptyAnswers: Record<string, string> = {};
      result.questions.forEach(q => { emptyAnswers[q.id] = ''; });

      setQuestions(result.questions);
      setProjectName(result.projectName);
      setAnswers(emptyAnswers);
      setPhase('answering');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to generate questions. Please try again.';
      setError(msg);
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate answers then call POST /api/ai/requirements/compile.
   * On success: transitions to 'confirming' phase with compiled requirements.
   * On failure: stays on 'answering' with error message shown.
   */
  const compileRequirements = async (): Promise<void> => {
    // Validate required questions
    const firstUnanswered = questions.find(
      q => q.required && !answers[q.id]?.trim()
    );
    if (firstUnanswered) {
      setError(`Please answer this question: "${firstUnanswered.question}"`);
      return;
    }

    setError(null);
    setLoading(true);

    const answersArray: RequirementsAnswer[] = questions.map(q => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id]?.trim() || '(skipped)'
    }));

    try {
      const { data } = await api.post('/api/ai/requirements/compile', {
        originalPrompt: userIdea.trim(),
        projectName,
        answers: answersArray,
        selectedModules: params.selectedModules,
        provider: params.provider,
        apiKey: params.apiKey || undefined
      });

      setRequirements(data.data.requirements as RequirementsDocument);
      setPhase('confirming');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to compile requirements. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Go back from confirming to answering, preserving existing answers.
   */
  const resetToAnswering = (): void => {
    setPhase('answering');
    setRequirements(null);
    setError(null);
  };

  /**
   * Skip the questions entirely. Creates a minimal requirements document
   * from the raw idea alone and jumps straight to confirming.
   * Preserves V1 behaviour for power users.
   */
  const skipToConfirm = (): void => {
    const minimal: RequirementsDocument = {
      originalPrompt: userIdea.trim(),
      projectName: userIdea.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30),
      appType: 'general',
      targetUsers: 'general users',
      coreFeatures: [],
      designPreference: 'professional and modern',
      themeMode: 'any',
      scale: 'personal',
      techPreferences: '',
      additionalNotes: '',
      answers: [],
      compiledSummary: `You're building: "${userIdea}". The AI will make sensible defaults for all choices.`
    };
    setRequirements(minimal);
    setPhase('confirming');
  };

  return {
    phase,
    userIdea, setUserIdea,
    questions,
    answers, setAnswer,
    requirements,
    projectName,
    loading,
    error, clearError,
    askQuestions,
    compileRequirements,
    resetToAnswering,
    skipToConfirm
  };
}
```

### [VERIFY] Step 10
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors in hooks/useRequirementsFlow.ts
```

---

## ═══════════════════════════════════════════════
## STEP 11 — CREATE select-ai.tsx PAGE
## ═══════════════════════════════════════════════

**Action:** [NEW]
**File:** `frontend/pages/builder/select-ai.tsx`

```typescript
// frontend/pages/builder/select-ai.tsx
// The requirements interview page — sits between deployment.tsx and ai-generate.tsx.
// Manages the idle → questioning → answering → confirming flow.
// On confirm: saves requirements to localStorage and routes to /builder/ai-generate.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequirementsFlow } from '../../hooks/useRequirementsFlow';
import type { RequirementsDocument } from '../../types/generation';

export default function SelectAiPage() {
  const router = useRouter();

  // Read builder config saved by previous steps
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(['auth']);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('builderProject') || '{}');
      if (stored.provider) setProvider(stored.provider);
      if (stored.model) setModel(stored.model);
      if (stored.apiKey) setApiKey(stored.apiKey);
      if (stored.selectedModules) setSelectedModules(stored.selectedModules);
    } catch {
      // Ignore parse errors — use defaults
    }
  }, []);

  const flow = useRequirementsFlow({ selectedModules, provider, apiKey, model });

  // When user confirms requirements, save to localStorage and go to ai-generate
  const handleStartBuilding = () => {
    if (!flow.requirements) return;
    try {
      const existing = JSON.parse(localStorage.getItem('builderProject') || '{}');
      localStorage.setItem('builderProject', JSON.stringify({
        ...existing,
        requirements: flow.requirements,
        userPrompt: flow.userIdea,
        projectName: flow.requirements.projectName || flow.projectName,
        provider,
        apiKey,
        model
      }));
    } catch {
      // Fallback: set minimal state
      localStorage.setItem('builderProject', JSON.stringify({
        requirements: flow.requirements,
        userPrompt: flow.userIdea,
        provider,
        model
      }));
    }
    router.push('/builder/ai-generate');
  };

  // Render idle phase
  if (flow.phase === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-indigo-700 mb-2">Tell us about your app</h1>
          <p className="text-gray-500 mb-6">
            Describe your idea in plain English. The more detail you give, the better the generated code.
          </p>

          <textarea
            value={flow.userIdea}
            onChange={e => flow.setUserIdea(e.target.value)}
            placeholder="I want to build an online store where people can buy handmade jewellery. Customers should be able to browse products, add to cart, and pay with Stripe..."
            rows={5}
            className="w-full p-4 border-2 border-indigo-100 rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 resize-none text-base"
          />

          {flow.error && (
            <p className="text-red-500 text-sm mt-2">{flow.error}</p>
          )}

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={flow.skipToConfirm}
              disabled={flow.userIdea.trim().length < 5}
              className="text-sm text-gray-400 hover:text-gray-600 underline disabled:opacity-30"
            >
              Skip questions and generate directly →
            </button>

            <button
              onClick={flow.askQuestions}
              disabled={flow.userIdea.trim().length < 10}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40"
            >
              Ask me the right questions →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render questioning (loading) phase
  if (flow.phase === 'questioning') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Thinking about your idea…</p>
          <p className="text-gray-400 text-sm mt-1">Preparing the right questions</p>
        </div>
      </div>
    );
  }

  // Render answering phase
  if (flow.phase === 'answering') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-6">
            <p className="font-medium">
              Great! Before I build <strong>{flow.projectName}</strong>, I have a few quick questions:
            </p>
          </div>

          <div className="space-y-5">
            {flow.questions.map((q, i) => (
              <div key={q.id}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {i + 1}. {q.question}
                  {q.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  type="text"
                  value={flow.answers[q.id] || ''}
                  onChange={e => flow.setAnswer(q.id, e.target.value)}
                  placeholder={q.hint || ''}
                  className="w-full h-11 px-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
              </div>
            ))}
          </div>

          {flow.error && (
            <p className="text-red-500 text-sm mt-3">{flow.error}</p>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => { flow.clearError(); /* go back to idle */
                // Reset to idle so user can change their idea
                window.location.reload();
              }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Change my idea
            </button>

            <button
              onClick={flow.compileRequirements}
              disabled={flow.loading}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all"
            >
              {flow.loading ? 'Compiling…' : 'Compile my requirements →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render confirming phase
  if (flow.phase === 'confirming' && flow.requirements) {
    const req: RequirementsDocument = flow.requirements;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Here's what I'll build:</h2>

          {/* Compiled summary */}
          <div className="bg-white rounded-2xl border border-indigo-100 p-6 mb-5 shadow-sm">
            <p className="text-gray-700 leading-relaxed">{req.compiledSummary}</p>
          </div>

          {/* Feature checklist */}
          {req.coreFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Features</p>
              <div className="grid grid-cols-2 gap-2">
                {req.coreFeatures.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500 font-bold">✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
              Design: {req.designPreference}
            </span>
            <span className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full">
              Theme: {req.themeMode}
            </span>
            <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full">
              Scale: {req.scale}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={flow.resetToAnswering}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Adjust my answers
            </button>

            <button
              onClick={handleStartBuilding}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
            >
              Looks good — build it →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback — should not normally reach here
  return null;
}
```

### [VERIFY] Step 11
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors in pages/builder/select-ai.tsx

# Check Next.js can resolve the page
cd frontend && npm run build 2>&1 | grep "select-ai"
# Expected: "select-ai" appears in the page list, no errors
```

[STOP IF] TypeScript reports errors about `api` import path.
Check what path `api` is imported from in other builder pages and use the same path.

---

## ═══════════════════════════════════════════════
## STEP 12 — MODIFY ai-generate.tsx (2 CHANGES ONLY)
## ═══════════════════════════════════════════════

**Action:** [FIND+INSERT] twice
**File:** `frontend/pages/builder/ai-generate.tsx`
**IMPORTANT:** This file is large and complex. Make ONLY the two targeted
changes below. Do not reorganise, reformat, or touch anything else.

### Change A — Read requirements from localStorage on page init

Read the file. Find the block that reads `builderProject` from `localStorage`.
It will look something like:

```typescript
const stored = JSON.parse(localStorage.getItem('builderProject') || '{}');
// OR
const builderProject = JSON.parse(localStorage.getItem('builderProject') || '{}');
```

Immediately after this block (after the closing `}` or after the existing
destructuring of that object), add:

```typescript
// [INSERT AFTER localStorage read block]
const storedRequirements = stored?.requirements || builderProject?.requirements || null;
const [projectRequirements, setProjectRequirements] = useState<
  import('../types/generation').RequirementsDocument | null
>(storedRequirements);
```

[STOP IF] You cannot find the localStorage read block. Report the actual
initialization pattern found in this file.

### Change B — Pass requirements in generate request body

Read the file. Find the `fetch` or `api.post` call that sends to `/api/ai/generate`.
It will look something like:

```typescript
body: JSON.stringify({
  provider,
  apiKey,
  model,
  userPrompt,
  selectedModules,
  projectName
})
```

Add `requirements` as a new field in this object:

```typescript
body: JSON.stringify({
  provider,
  apiKey,
  model,
  userPrompt,
  selectedModules,
  projectName,
  requirements: projectRequirements ?? undefined   // [NEW] — undefined = backwards compatible
})
```

### [VERIFY] Step 12
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors in ai-generate.tsx

cd frontend && npm run build 2>&1 | tail -5
# Expected: successful build, no errors
```

[STOP IF] There are TypeScript errors in ai-generate.tsx after these changes.
Only fix the lines you just added. Do not change anything else.

---

## ═══════════════════════════════════════════════
## STEP 13 — UPDATE ROUTING IN deployment.tsx
## ═══════════════════════════════════════════════

**Action:** [FIND+REPLACE]
**File:** `frontend/pages/builder/deployment.tsx`

Read the file. Find the line that routes to `/builder/ai-generate`.
It will be inside a button click handler or a `router.push` call.

```typescript
// FIND (exact string will vary — find the one that routes to ai-generate):
router.push('/builder/ai-generate')
// OR
router.push(`/builder/ai-generate`)

// REPLACE WITH:
router.push('/builder/select-ai')
```

[STOP IF] There is more than one `router.push('/builder/ai-generate')` in this file.
Replace only the one inside the main "Generate" or "Start Building" button handler.

### [VERIFY] Step 13
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors.

# Confirm the route was changed
grep -n "ai-generate\|select-ai" frontend/pages/builder/deployment.tsx
# Expected: only select-ai appears in the push call
# It is acceptable for ai-generate to appear in comments or other context
```

---

## ═══════════════════════════════════════════════
## STEP 14 — ADD AUTO-PREVIEW AFTER GENERATION
## ═══════════════════════════════════════════════

**Action:** [FIND+INSERT]
**File:** `frontend/pages/builder/ai-generate.tsx`

Read the file. Find the handler for the `complete` SSE event.
It will contain something that reads `fileCount` or `tokensUsed` from the payload.

Immediately inside that handler, after the existing logic, add:

```typescript
// [INSERT INSIDE complete event handler, at the end of the handler body]

// Auto-select the best file to preview after generation completes
const selectBestPreviewFile = (files: typeof extractedFiles): string | null => {
  // Priority 1: main entry pages
  const mainPage = files.find(f =>
    f.path.includes('/login') ||
    f.path.includes('/dashboard') ||
    f.path.includes('/index')
  );
  if (mainPage) return mainPage.path;

  // Priority 2: any frontend TSX component
  const frontendTsx = files.find(f =>
    f.path.startsWith('frontend/') && f.path.endsWith('.tsx')
  );
  if (frontendTsx) return frontendTsx.path;

  // Priority 3: first file
  return files[0]?.path || null;
};

const bestPreviewPath = selectBestPreviewFile(extractedFiles);
if (bestPreviewPath) {
  // Use the same setter that clicking a file in the tree uses
  // This triggers the existing postMessage to preview-runner.tsx
  setActiveFile(bestPreviewPath);
  setPreviewVisible(true);
}
```

[STOP IF] The variable that holds the generated files is not named `extractedFiles`.
Read the complete event handler and find the actual variable name holding the
array of files at that point. Use that name instead.

[STOP IF] `setActiveFile` or `setPreviewVisible` are named differently.
Find the actual setter names used in the file tree click handler and use those.

### [VERIFY] Step 14
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors.
```

---

## ═══════════════════════════════════════════════
## STEP 15 — ADD REQUIREMENTS COMPLIANCE QUALITY GATE
## ═══════════════════════════════════════════════

**Action:** [FIND+INSERT]
**File:** `backend/src/modules/ai/ai.controller.ts`

Read the file. Find the existing `evaluateAuthUiQuality` call inside the
`generate` handler. Insert the following function definition before the
`generate` method (not inside it), and then insert the call after the existing
quality gate check inside the `generate` handler.

**First: add the helper function before the class or before the generate method:**

```typescript
// [INSERT BEFORE the generate method or before the controller class definition]

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
    'stripe':          ['stripe', 'payment_intent', 'createpaymentintent'],
    'paypal':          ['paypal', '@paypal'],
    'razorpay':        ['razorpay'],
    'admin':           ['admin', 'isadmin', 'role', 'adminrouter', 'adminpanel'],
    'email':           ['nodemailer', 'resend', 'sendgrid', 'smtp', 'mailer'],
    'dark mode':       ['dark', 'prefers-color-scheme', 'darkmode', 'dark:'],
    'search':          ['search', '.filter(', 'query', 'searchbar', 'searchinput'],
    'pagination':      ['page', 'limit', 'offset', 'paginate', 'currentpage'],
    'file upload':     ['multer', 'upload', 'formdata', 's3', 'cloudinary'],
    'password reset':  ['resetpassword', 'forgotpassword', 'reset_token', 'passwordreset'],
    'oauth':           ['oauth', 'passport', 'google', 'github', 'social login'],
    'websocket':       ['socket.io', 'ws', 'websocket', 'socket'],
    'cart':            ['cart', 'basket', 'addtocart', 'cartitem'],
    'checkout':        ['checkout', 'order', 'purchase'],
    'dashboard':       ['dashboard', 'analytics', 'stats', 'metrics'],
    'notification':    ['notification', 'alert', 'toast', 'notify'],
    'comment':         ['comment', 'reply', 'discussion'],
    'rating':          ['rating', 'review', 'star', 'score'],
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
```

**Second: inside the generate handler, after the existing quality gate block,
insert the requirements compliance check:**

```typescript
// [INSERT AFTER the existing evaluateAuthUiQuality block]

// Requirements compliance check (only runs when requirements were provided)
if (typedRequirements) {
  const compliance = checkRequirementsCompliance(normalizedFiles, typedRequirements);
  if (!compliance.passed && compliance.missing.length > 0) {
    // Emit a quality_retry event so the frontend shows the user what's happening
    res.write(`data: ${JSON.stringify({
      type: 'quality_retry',
      message: `Regenerating to include missing features: ${compliance.missing.join(', ')}`,
      reasons: compliance.missing
    })}\n\n`);

    // Build a targeted retry prompt
    const retryPrompt = `The previous code generation was missing these required features:
${compliance.missing.map(f => `- ${f}`).join('\n')}

These features were explicitly requested by the user. Regenerate the complete application
ensuring every feature in this list is fully implemented.

${buildFullstackPrompt(userPrompt, designDNA, selectedModules, typedRequirements)}`;

    // Run a second generation pass
    let retryResponse = '';
    await aiService.generate(
      { ...generationParams, userPrompt: retryPrompt },
      (chunk: string) => {
        retryResponse += chunk;
      }
    );

    const retryFiles = extractFilesFromResponse(retryResponse);
    if (retryFiles.length > 0) {
      normalizedFiles = normalizeGeneratedFiles(retryFiles);
    }

    res.write(`data: ${JSON.stringify({
      type: 'quality_report',
      passed: true,
      message: 'Requirements compliance retry complete'
    })}\n\n`);
  }
}
```

[STOP IF] The variable holding normalized files is not named `normalizedFiles`.
Find the actual variable name from the existing code and use that.

[STOP IF] `buildFullstackPrompt`, `extractFilesFromResponse`, or
`normalizeGeneratedFiles` are named differently. Use the actual function names.

### [VERIFY] Step 15
```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
# Expected: 0 errors.
```

---

## ═══════════════════════════════════════════════
## STEP 16 — FULL END-TO-END VERIFICATION
## ═══════════════════════════════════════════════

Run each check in order. All must pass before this feature is complete.

### 16.1 — Build checks (both services)
```bash
cd backend && npm run build 2>&1 | tail -5
# Expected: Build succeeded, no TypeScript errors

cd frontend && npm run build 2>&1 | tail -10
# Expected: Build succeeded, select-ai page appears in page list
```

### 16.2 — Backend API smoke tests
```bash
# Start backend
cd backend && npm run dev &
sleep 5

# Test 1: validation guard
curl -s -X POST http://localhost:5000/api/ai/requirements \
  -H "Content-Type: application/json" \
  -d '{"userIdea":"hi","provider":"gemini"}' | jq .
# Expected: { success: false, error: "Please describe your idea..." }

# Test 2: missing answers
curl -s -X POST http://localhost:5000/api/ai/requirements/compile \
  -H "Content-Type: application/json" \
  -d '{"answers":[],"provider":"gemini"}' | jq .
# Expected: { success: false, error: "No answers provided..." }

# Test 3: existing generate still works (backwards compatibility)
curl -s -X POST http://localhost:5000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"provider":"gemini","userPrompt":"build auth","selectedModules":["auth"],"projectName":"test"}' \
  --no-buffer | head -3
# Expected: first SSE line contains "Generation started" or similar

kill %1
```

### 16.3 — Frontend route check
```bash
cd frontend && npm run build 2>&1 | grep -E "select-ai|ai-generate|deployment"
# Expected: all three pages listed without error
```

### 16.4 — localStorage handoff check
Open the browser console on `/builder/deployment`.
Click Generate. Observe the redirect to `/builder/select-ai`.
After completing the flow and clicking "Looks good, build it", run in console:

```javascript
JSON.parse(localStorage.getItem('builderProject'))
// Expected: object with .requirements field containing:
// { originalPrompt, projectName, coreFeatures[], compiledSummary, ... }
```

### 16.5 — Requirements in generate request check
After clicking "Looks good, build it" on the confirming screen, the browser
redirects to `/builder/ai-generate`. Open the Network tab and find the
`POST /api/ai/generate` request. Inspect the request body.

```
Expected: request body contains a "requirements" field
         that is not null and has coreFeatures, themeMode, etc.
```

### 16.6 — Auto-preview check
After generation completes, the preview panel should automatically show
the generated login/index page without any manual file tree click.

```
Expected: preview renders automatically
Expected: the active file in the file tree is highlighted
Expected: no manual click required
```

---

## ═══════════════════════════════════════════════
## FILES CHANGED — FINAL SUMMARY
## ═══════════════════════════════════════════════

| File | Action | What Changed |
|------|--------|-------------|
| `backend/src/modules/ai/ai.types.ts` | **CREATED** | All shared TypeScript interfaces |
| `backend/src/modules/ai/ai.prompts.ts` | **APPENDED** | 2 new prompt builder functions; buildFullstackPrompt extended with optional 4th arg |
| `backend/src/modules/ai/ai.service.ts` | **APPENDED** | generateNonStreaming (4 provider impls); generateRequirementsQuestions; compileRequirementsDocument |
| `backend/src/modules/ai/ai.controller.ts` | **APPENDED** | getRequirementsQuestions method; compileRequirements method; checkRequirementsCompliance function; typedRequirements extraction in generate |
| `backend/src/modules/ai/ai.routes.ts` | **APPENDED** | 2 new route registrations |
| `frontend/types/generation.ts` | **CREATED** | Frontend TypeScript interfaces matching backend types |
| `frontend/hooks/useRequirementsFlow.ts` | **CREATED** | Hook managing the full requirements interview state machine |
| `frontend/pages/builder/select-ai.tsx` | **CREATED** | New interview page (4 phases) |
| `frontend/pages/builder/ai-generate.tsx` | **2 LINES MODIFIED** | Read requirements from localStorage; pass to generate body |
| `frontend/pages/builder/deployment.tsx` | **1 LINE MODIFIED** | router.push target changed from ai-generate to select-ai |

### [PRESERVE] — These files were NOT touched
```
frontend/pages/builder/preview-runner.tsx     — sandbox unchanged
frontend/pages/builder/preview.tsx            — preview page unchanged
frontend/pages/builder/new.tsx                — step 1 unchanged
frontend/pages/builder/select-modules.tsx     — step 2 unchanged
frontend/pages/builder/select-templates.tsx   — step 3 unchanged
frontend/pages/builder/select-backend.tsx     — step 4 unchanged
backend/src/middleware/rateLimit.middleware.ts
backend/src/middleware/generationQuota.middleware.ts
backend/src/middleware/auth.middleware.ts
backend/src/modules/platform-projects/*
backend/src/modules/platform-auth/*
```

---

## ═══════════════════════════════════════════════
## WHAT THIS DOES NOT CHANGE — EXPLICIT GUARANTEES
## ═══════════════════════════════════════════════

| Existing Behaviour | Still Works After V2 |
|---|---|
| POST /api/ai/generate with no requirements field | Yes — requirements is optional |
| SSE streaming (chunks, file events, complete) | Yes — untouched |
| File extraction and normalisation | Yes — untouched |
| Auth quality gate | Yes — requirements compliance is an additional check, not a replacement |
| Persistence to MongoDB when authenticated | Yes — same timing, same calls |
| localStorage handoff to deployment | Yes — requirements is additive, existing fields preserved |
| ZIP download | Yes — deployment unchanged |
| GitHub/Vercel/Railway deploy | Yes — deployment unchanged |
| Refine flow | Yes — completely untouched |
| Generation quota counting | Yes — requirements calls do NOT count |
| Rate limiting | Yes — requirements calls use freeTierLimiter only |

---

*End of document. Version 3.0. Agent-optimized. Generated: 2026-03-19.*
