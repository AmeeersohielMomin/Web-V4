# IDEA Platform — AI Generation Production Upgrade
> FINAL Agent Execution Document
> Version: FINAL | Date: 2026-03-24
> Synthesized from: AI_GENERATION_PRODUCTION_UPGRADE.md + Part 7 Compatibility Addendum + Part 8 Execution Checklist
> This is the ONLY document the agent needs. It supersedes all prior versions.

---

## ═══════════════════════════════════════════════════════
## MASTER AGENT INSTRUCTIONS — READ COMPLETELY FIRST
## ═══════════════════════════════════════════════════════

### What You Are
You are an AI coding agent upgrading the IDEA Platform's AI generation system
to produce production-grade full-stack web applications with world-class UI,
for ANY app idea a user describes — not just standard domains.

### What Is Already Working — DO NOT TOUCH THESE
```
✅ GitHub Models unknown-model fallback chain
   — ai.service.ts handles 404/unknown model errors with fallback models

✅ jsonrepair-based JSON parsing pipeline
   — ai.service.ts uses jsonrepair + multi-attempt lenient parsing

✅ Requirements fallback + domain rebalance logic
   — prevents auth-heavy output for non-auth ideas

✅ Unified quality + compliance retry in controller
   — single retry loop combines quality + missing feature compliance
   — emits quality_report with score/reasons/warnings

✅ External services compliance checks
   — validates Stripe/email/upload/oauth usage patterns

✅ Light-theme default hardening
   — theme normalization defaults ambiguous modes to light
   — dark-dominance guard blocks black-first output unless requested

✅ Frontend refine/chat reliability hardening
   — context-aware refine payload compression
   — chat backend offline cooldown prevents error spam

✅ Preview runtime safety normalization
   — mock/API normalization for dashboard data shapes
   — reduced runtime crashes from missing fields in preview
```

### What Is Broken — This Document Fixes All Of These
```
❌ UI looks like a developer admin panel, not a product
   — No sidebar layout (top navbar only)
   — No lucide-react icons anywhere
   — Plain white stat cards (no gradients, no icons)
   — Commented-out service calls in dashboard → API never called
   — browser alert() instead of toast notifications
   — No skeleton loading states
   — No empty states with CTA
   — Auth page designed, all other pages plain

❌ Single JSON call truncates at token limit
   — 40-file app needs 20,000 tokens, models allow 4,096–8,192
   — AI generates auth + 1-2 modules then stops
   — server.ts only registers auth routes — others missing

❌ Unknown app types get generic modules
   — Apps outside 9 known domains get items/categories/activity
   — Field names are title/description/status — not domain-specific

❌ No post-generation verification gate
   — Generation marked complete even when files are broken/missing

❌ No wiring validation
   — Generated server.ts may miss route imports
   — Generated frontend pages may reference non-existent services

❌ No hallucination/placeholder detection
   — TODO comments, fake literals, stubbed returns pass silently
```

### Execution Rules — Absolute
```
RULE 1 — READ BEFORE WRITE
  Read every file before modifying it. Confirm all variable names,
  function signatures, and import paths actually exist.

RULE 2 — ONE STEP AT A TIME
  Complete each numbered step. Run its verification. Confirm pass.
  Only then move to the next step. Never batch steps.

RULE 3 — PRESERVE ALL WORKING FIXES
  The 8 items in "What Is Already Working" above must survive every
  change. If any edit would remove them, stop and report.

RULE 4 — USE CORRECT SIGNATURES (Part 7 corrections)
  The compatibility corrections in STEP-0 below override anything
  in the rest of this document. Always use the corrected signatures.

RULE 5 — STOP CONDITIONS
  Stop immediately and report if:
  - A function/variable is named differently than this document expects
  - Any currently-passing tsc check starts failing
  - Any of the 8 preserved fixes would be removed by a change
  - The generateNonStreaming params shape differs from what you find in file

RULE 6 — VERIFY EVERY STEP
  Every step ends with [VERIFY]. Run it. It must pass before proceeding.
```

### Tag Legend
| Tag | Meaning |
|-----|---------|
| `[REPLACE FILE]` | Delete existing file entirely. Write new content. |
| `[NEW FILE]` | File does not exist. Create it. |
| `[MODIFY]` | File exists. Add code surgically. Do not rewrite. |
| `[FIND+INSERT after]` | Find anchor string. Insert immediately after it. |
| `[FIND+REPLACE]` | Find exact string. Replace only that string. |
| `[VERIFY]` | Run this command. Must pass before next step. |
| `[STOP IF]` | Halt and report to user. Do not guess. |

---

## ═══════════════════════════════════════════════════════
## STEP-0 — READ CURRENT FILE SIGNATURES BEFORE ANYTHING
## This step has no code changes. It is a mandatory read.
## ═══════════════════════════════════════════════════════

Before writing a single line of code, read these three files and
confirm the exact signatures of these functions:

**File 1:** `backend/src/modules/ai/ai.service.ts`

Find `generateNonStreaming` method. Read its parameter interface.
It will be one of these shapes:

```typescript
// Shape A (what document assumes — WRONG):
generateNonStreaming({ provider, model, apiKey, systemPrompt, userPrompt, maxTokens })

// Shape B (what current code likely uses — CORRECT):
generateNonStreaming({ provider, apiKey, model, prompt, maxTokens, temperature, forceJson })
```

Write down which shape it actually is. Use THAT shape in all Steps below.

**File 2:** `backend/src/modules/platform-projects/platform-projects.service.ts`

Find `saveFiles` method. Read its exact parameter list.
It will be one of:
```typescript
saveFiles(projectId, files)           // OLD — do not use
saveFiles(projectId, userId, files)   // CURRENT — use this
saveFiles(projectId, userId, files, prompt?)  // EXTENDED — use this
```

Write down the exact signature. Use it in Step 4.

**File 3:** `backend/src/modules/ai/ai.routes.ts`

Find the existing `/generate` route registration.
Read the exact middleware name used. It will be one of:
```typescript
optionalPlatformAuth   // what document assumes
optionalAuth           // what current code likely uses
```

Write down the actual middleware name. Use it in Step 4.

### [VERIFY] STEP-0
```bash
# Confirm you can read all three files without errors
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0 — baseline must be clean before starting
```

**Report after STEP-0:**
```
generateNonStreaming shape: [A or B — list exact params]
saveFiles signature: [exact params]
optionalAuth middleware name: [exact name]
Baseline tsc: 0 errors ✅
```

---

## ═══════════════════════════════════════════════════════
## STEP-1 — REPLACE ai.prompts.ts (New Prompt System)
## Estimated time: 30 minutes
## ═══════════════════════════════════════════════════════

**Action:** [REPLACE FILE]
**File:** `backend/src/modules/ai/ai.prompts.ts`

Replace the entire file with the following. This is the v3.0 prompt system.
It adds: planner prompt, per-module prompt, shared files prompt, world-class
UI patterns, correct domain detection for any app type.

```typescript
// ============================================================
// IDEA Platform — AI Prompt Templates v3.0
// World-class UI. Any app type. Production-grade output.
// ============================================================

import type { RequirementsAnswer, RequirementsDocument } from './ai.types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — PLANNER PROMPT
// Phase 1 of two-phase generation.
// Returns only a JSON plan — no code generated.
// Fast and cheap (~500 token output).
// ─────────────────────────────────────────────────────────────────────────────

export function buildPlannerPrompt(
  userDescription: string,
  requirements?: RequirementsDocument
): string {
  const reqContext = requirements ? `
App type: ${requirements.appType}
Target users: ${requirements.targetUsers}
Core features: ${requirements.coreFeatures.join(', ')}
Tech preferences: ${requirements.techPreferences}
Scale: ${requirements.scale}
` : '';

  return `You are a senior software architect planning a full-stack web application.

USER IDEA: "${userDescription}"
${reqContext}

Your job: produce a complete architecture plan as JSON.
Do NOT generate any code. Only plan.

Rules:
1. Return ONLY valid JSON. No markdown. No explanation.
2. Identify 2-6 domain modules based on what the app actually does.
3. Use REAL domain vocabulary. Never use generic names like "items" or "resources".
   - Dating app     → profiles, matches, messages, likes, preferences
   - Fitness app    → workouts, exercises, plans, progress, goals
   - Pet care app   → pets, appointments, medications, records, reminders
   - Legal app      → cases, clients, documents, hearings, invoices
   - Job board      → jobs, applications, companies, candidates, interviews
   - School/LMS     → courses, lessons, enrollments, assignments, grades
   - Real estate    → properties, viewings, offers, agents, inquiries
   - Fleet mgmt     → vehicles, drivers, trips, maintenance, fuel
   - Event mgmt     → events, attendees, tickets, venues, speakers
   - Library        → books, loans, members, reservations, fines
4. For each module, list EXACT Mongoose field names for this domain.
   Use domain-specific names. NOT title/description/status for everything.
5. Identify which modules need relationships (userId refs, foreign keys).
6. Describe what the dashboard must show (real metrics for this app type).
7. List all frontend routes needed.
8. Define the sidebar navigation structure with correct lucide icon names.

Return ONLY this JSON:
{
  "projectName": "lowercase-hyphen-name-max-30-chars",
  "appType": "string describing the app category",
  "description": "one sentence describing what the app does",
  "modules": [
    {
      "name": "moduleName",
      "label": "Display Name",
      "icon": "lucide icon name e.g. Package, Users, Calendar, Briefcase",
      "fields": [
        {
          "name": "fieldName",
          "type": "String|Number|Boolean|Date|ObjectId",
          "required": true,
          "enum": ["val1", "val2"],
          "ref": "ModelName"
        }
      ],
      "relationships": ["userId", "categoryId"],
      "routes": ["/module-name", "/module-name/new", "/module-name/:id/edit"],
      "apiEndpoints": [
        "GET /api/module-name",
        "POST /api/module-name",
        "PUT /api/module-name/:id",
        "DELETE /api/module-name/:id",
        "GET /api/module-name/stats"
      ],
      "hasStats": true
    }
  ],
  "dashboard": {
    "statCards": [
      {
        "label": "Card Label",
        "metric": "exactly what data this card shows",
        "icon": "TrendingUp",
        "color": "blue|green|purple|orange|rose"
      }
    ],
    "tables": ["describe recent items tables to show"],
    "charts": ["describe any charts if relevant"]
  },
  "navigation": {
    "sidebarSections": [
      {
        "label": "Section Label or empty string for ungrouped",
        "items": [
          { "label": "Nav Item", "href": "/path", "icon": "lucide icon name" }
        ]
      }
    ]
  },
  "colorPalette": {
    "primary": "#hex e.g. #4f46e5",
    "primaryLight": "#hex e.g. #eef2ff",
    "primaryDark": "#hex e.g. #3730a3"
  }
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — MODULE GENERATOR PROMPT
// Phase 2 of two-phase generation.
// Called once per module. Generates exactly 9 files per module:
//   Backend:  schema.ts, model.ts, service.ts, controller.ts, routes.ts
//   Frontend: [name]/index.tsx, [name]/new.tsx, [name]/[id]/edit.tsx,
//             src/services/[name].service.ts
// Each call stays within token limits — no truncation possible.
// ─────────────────────────────────────────────────────────────────────────────

export function buildModulePrompt(
  module: any,
  plan: any,
  variationSeed: string
): string {
  const { primary, primaryLight, primaryDark } = plan.colorPalette || {
    primary: '#4f46e5',
    primaryLight: '#eef2ff',
    primaryDark: '#4338ca'
  };

  return `You are an expert full-stack developer.
Generate ONLY the files for the "${module.name}" module of the "${plan.appType}" application.
Do NOT generate auth files. Do NOT generate server.ts. Do NOT generate shared components.
Generate ONLY the 9 files listed in OUTPUT FORMAT below.

═══════════════════════════════════════════════
MODULE SPECIFICATION
═══════════════════════════════════════════════

Name:          ${module.name}
Display label: ${module.label}
Icon:          ${module.icon}
Fields:
${JSON.stringify(module.fields, null, 2)}
Relationships: ${(module.relationships || []).join(', ')}
Frontend routes: ${(module.routes || []).join(', ')}
API endpoints:   ${(module.apiEndpoints || []).join(', ')}

FULL APP CONTEXT:
Project name: ${plan.projectName}
App type:     ${plan.appType}
All modules:  ${plan.modules.map((m: any) => m.name).join(', ')}
Color system: primary=${primary} | light=${primaryLight} | dark=${primaryDark}

═══════════════════════════════════════════════
TECH STACK — EXACT — DO NOT DEVIATE
═══════════════════════════════════════════════

Backend:  Node.js + Express + TypeScript + MongoDB + Mongoose + Zod + bcrypt + jsonwebtoken
Frontend: Next.js 14 Pages Router + React 18 + TypeScript + Tailwind CSS + axios + lucide-react
NOTE: Pages Router = pages/ directory. NO "use client". NO app/ directory.

═══════════════════════════════════════════════
BACKEND FILE PATTERNS (5 files)
═══════════════════════════════════════════════

// --- backend/src/modules/${module.name}/${module.name}.schema.ts ---
import { z } from 'zod';
// Create Zod schema with ALL fields from the module spec above
// Use exact field names, types, and enums from spec
// createSchema: validates all required fields
// updateSchema: createSchema.partial() — makes all fields optional
export const create${capitalize(module.name)}Schema = z.object({ /* all fields */ });
export const update${capitalize(module.name)}Schema = create${capitalize(module.name)}Schema.partial();
export type Create${capitalize(module.name)}Input = z.infer<typeof create${capitalize(module.name)}Schema>;
export type Update${capitalize(module.name)}Input = z.infer<typeof update${capitalize(module.name)}Schema>;

// --- backend/src/modules/${module.name}/${module.name}.model.ts ---
import mongoose from 'mongoose';
// Mongoose schema with ALL fields from spec
// Use exact Mongoose types: String, Number, Boolean, Date, mongoose.Schema.Types.ObjectId
// Add index on userId: { userId: 1, createdAt: -1 }
// timestamps: true always
// If field has ref: 'ModelName', use: { type: mongoose.Schema.Types.ObjectId, ref: 'ModelName' }
export const ${capitalize(module.name)} = mongoose.model('${capitalize(module.name)}', schema);

// --- backend/src/modules/${module.name}/${module.name}.service.ts ---
import { ${capitalize(module.name)} } from './${module.name}.model';
import type { Create${capitalize(module.name)}Input, Update${capitalize(module.name)}Input } from './${module.name}.schema';
export class ${capitalize(module.name)}Service {
  // getAll: filter by userId, support search on name/title, filter by status/category
  async getAll(userId: string, query?: { status?: string; search?: string; category?: string }) { }
  // getById: find by id AND userId — throws if not found
  async getById(id: string, userId: string) { }
  // create: saves new record with userId attached
  async create(input: Create${capitalize(module.name)}Input, userId: string) { }
  // update: findOneAndUpdate with userId check — throws if not found
  async update(id: string, input: Update${capitalize(module.name)}Input, userId: string) { }
  // remove: deleteOne with userId check — throws if deletedCount === 0
  async remove(id: string, userId: string) { }
  // getStats: returns { total, thisWeek, ...counts by status/category }
  async getStats(userId: string) { }
}

// --- backend/src/modules/${module.name}/${module.name}.controller.ts ---
import { Response } from 'express';
import { ${capitalize(module.name)}Service } from './${module.name}.service';
import { create${capitalize(module.name)}Schema, update${capitalize(module.name)}Schema } from './${module.name}.schema';
import type { AuthRequest } from '../../middleware/auth';
// All handlers use AuthRequest, extract req.userId
// All use try/catch with proper HTTP status codes
// Response format: { success: boolean, data: T | null, error: string | null }
// stats handler BEFORE getById to avoid :id matching "stats" string
export class ${capitalize(module.name)}Controller { }

// --- backend/src/modules/${module.name}/${module.name}.routes.ts ---
import { Router } from 'express';
import { ${capitalize(module.name)}Controller } from './${module.name}.controller';
import { authMiddleware } from '../../middleware/auth';
const router = Router();
router.use(authMiddleware);           // protect ALL routes
router.get('/stats', ctrl.stats);    // MUST come before /:id
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
export const ${module.name}Routes = router;

═══════════════════════════════════════════════
FRONTEND FILE PATTERNS (4 files)
═══════════════════════════════════════════════

CRITICAL UI RULES — ENFORCE IN EVERY GENERATED PAGE:
1. Import lucide-react icons at the TOP of every page
2. Use Sidebar layout wrapper: import Sidebar from '../../src/components/Sidebar'
3. Use toast for ALL mutations: import { useToast } from '../../src/hooks/useToast'
4. Skeleton rows during loading — NEVER a blank table
5. Rich empty state with icon + description + CTA — NEVER just text
6. Icon buttons for edit/delete — NEVER text-only buttons
7. NO browser alert() anywhere — use toast for errors
8. NO commented-out service calls — ALL calls must be uncommented and working

// --- frontend/src/services/${module.name}.service.ts ---
import axios from 'axios';
// Create API instance with token interceptor (reads from localStorage)
// UNCOMMENTED, WORKING methods only:
export const ${module.name}Service = {
  getAll:   (params?: Record<string, string>) => API.get('/api/${module.name}', { params }),
  getById:  (id: string) => API.get(\`/api/${module.name}/\${id}\`),
  create:   (data: any) => API.post('/api/${module.name}', data),
  update:   (id: string, data: any) => API.put(\`/api/${module.name}/\${id}\`, data),
  remove:   (id: string) => API.delete(\`/api/${module.name}/\${id}\`),
  getStats: () => API.get('/api/${module.name}/stats'),
};

// --- frontend/pages/${module.name}/index.tsx --- LIST PAGE
// Uses: import Sidebar from '../../src/components/Sidebar'
// Uses: import { useToast } from '../../src/hooks/useToast'
// Uses: import { Plus, Search, Pencil, Trash2, ${module.icon} } from 'lucide-react'
// Uses: import { ${module.name}Service } from '../../src/services/${module.name}.service'
//
// Layout:
// <div className="sidebar-layout">
//   <Sidebar />
//   <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
//
// Page header row:
//   Left: icon in colored box + title + count
//   Right: "+ New ${module.label}" button with Plus icon and primary color
//
// Filter row:
//   Search input with Search icon on left
//   Status/category dropdown filter if module has enum fields
//
// Table card (bg-white rounded-2xl border):
//   Column headers: uppercase, tracking-wider, text-gray-500
//   Skeleton rows when loading: animate-pulse, 5 rows
//   Data rows: hover:bg-gray-50/50
//   Status column: colored badge with dot indicator
//   Actions column: Pencil icon button + Trash2 icon button
//   Empty state: large icon in gray box + title + description + CTA button
//
// On delete: call ${module.name}Service.remove(id)
//   Success: toast({ message: '${module.label} deleted', type: 'success' })
//   Error:   toast({ message: err.message, type: 'error' })
//   Remove from local state immediately

// --- frontend/pages/${module.name}/new.tsx --- CREATE PAGE
// Uses same imports as list page
// Layout: sidebar-layout
// Breadcrumb: ${module.label} / New ${module.label}
// Back button (← arrow) top left
//
// Form card (bg-white rounded-2xl):
//   Each field from module spec gets:
//     - label (bold, text-sm)
//     - input/select/textarea matching field type
//     - border border-gray-200 rounded-xl h-11 for inputs
//     - Error message in red below input
//   String fields → <input type="text">
//   Number fields → <input type="number">
//   Date fields   → <input type="date">
//   Boolean fields → <input type="checkbox"> or toggle
//   Enum fields   → <select> with all enum values as options
//   ObjectId ref  → use free-text input for now
//
// Buttons:
//   Save (primary color bg, white text, shows spinner when saving)
//   Cancel (border, gray text, navigates back)
//
// On submit: call ${module.name}Service.create(form)
//   Success: toast success + router.push('/${module.name}')
//   Error:   toast error, stay on page

// --- frontend/pages/${module.name}/[id]/edit.tsx --- EDIT PAGE
// Same as new.tsx BUT:
//   On mount: fetch existing record with ${module.name}Service.getById(id)
//   Show skeleton form while loading
//   Pre-fill all form fields with fetched data
//   Handle 404: show "Not found" message + back button
//   On submit: call ${module.name}Service.update(id, form)
//   Success: toast "Updated successfully" + router.push('/${module.name}')
//   Error:   toast error, stay on page

═══════════════════════════════════════════════
OUTPUT FORMAT — RETURN EXACTLY THIS JSON
═══════════════════════════════════════════════

{
  "module": "${module.name}",
  "files": [
    {
      "path": "backend/src/modules/${module.name}/${module.name}.schema.ts",
      "content": "complete working TypeScript file content",
      "language": "typescript"
    },
    {
      "path": "backend/src/modules/${module.name}/${module.name}.model.ts",
      "content": "complete working TypeScript file content",
      "language": "typescript"
    },
    {
      "path": "backend/src/modules/${module.name}/${module.name}.service.ts",
      "content": "complete working TypeScript file content",
      "language": "typescript"
    },
    {
      "path": "backend/src/modules/${module.name}/${module.name}.controller.ts",
      "content": "complete working TypeScript file content",
      "language": "typescript"
    },
    {
      "path": "backend/src/modules/${module.name}/${module.name}.routes.ts",
      "content": "complete working TypeScript file content",
      "language": "typescript"
    },
    {
      "path": "frontend/src/services/${module.name}.service.ts",
      "content": "complete working TypeScript file content",
      "language": "typescript"
    },
    {
      "path": "frontend/pages/${module.name}/index.tsx",
      "content": "complete working TypeScript React component",
      "language": "typescript"
    },
    {
      "path": "frontend/pages/${module.name}/new.tsx",
      "content": "complete working TypeScript React component",
      "language": "typescript"
    },
    {
      "path": "frontend/pages/${module.name}/[id]/edit.tsx",
      "content": "complete working TypeScript React component",
      "language": "typescript"
    }
  ]
}

Return ONLY raw JSON. No markdown. Start with { and end with }.`;
}

// Helper function used in templates above
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — SHARED FILES PROMPT
// Phase 3 of two-phase generation.
// Generates all infrastructure files once after all module files are done:
//   server.ts, auth middleware, Sidebar, useToast, dashboard, auth pages,
//   globals.css, tailwind config, package.json files
// ─────────────────────────────────────────────────────────────────────────────

export function buildSharedFilesPrompt(plan: any, variationSeed: string): string {
  const designDNA = buildDesignDNA(variationSeed);
  const { primary, primaryLight, primaryDark } = plan.colorPalette || {
    primary: '#4f46e5',
    primaryLight: '#eef2ff',
    primaryDark: '#4338ca'
  };

  const moduleImports = plan.modules.map((m: any) =>
    `  const { ${m.name}Routes } = await import('./modules/${m.name}/${m.name}.routes');`
  ).join('\n');

  const routeRegistrations = plan.modules.map((m: any) =>
    `  app.use('/api/${m.name}', ${m.name}Routes);`
  ).join('\n');

  const dashboardStatCards = (plan.dashboard?.statCards || []).map((c: any) =>
    `{ label: '${c.label}', metric: '${c.metric}', icon: '${c.icon}', color: '${c.color}' }`
  ).join(',\n  ');

  const sidebarNav = JSON.stringify(plan.navigation?.sidebarSections || [], null, 2);

  return `You are an expert full-stack developer.
Generate ALL shared infrastructure files for the "${plan.projectName}" application.
These files wire all modules together and define the global visual system.

PROJECT CONTEXT:
App name:     ${plan.projectName}
App type:     ${plan.appType}
Description:  ${plan.description}
Modules:      ${plan.modules.map((m: any) => m.name).join(', ')}
Color system: primary=${primary} | light=${primaryLight} | dark=${primaryDark}
Navigation:   ${sidebarNav}
Dashboard:    ${dashboardStatCards}

${designDNA}

═══════════════════════════════════════════════
GENERATE ALL 21 OF THESE FILES — EVERY ONE IS REQUIRED
═══════════════════════════════════════════════

1.  backend/src/server.ts
2.  backend/src/middleware/auth.ts
3.  backend/src/modules/auth/auth.schema.ts
4.  backend/src/modules/auth/auth.model.ts
5.  backend/src/modules/auth/auth.service.ts
6.  backend/src/modules/auth/auth.controller.ts
7.  backend/src/modules/auth/auth.routes.ts
8.  backend/package.json
9.  backend/tsconfig.json
10. backend/.env.example
11. frontend/pages/_app.tsx
12. frontend/pages/index.tsx
13. frontend/pages/login.tsx
14. frontend/pages/signup.tsx
15. frontend/pages/dashboard.tsx
16. frontend/src/contexts/AuthContext.tsx
17. frontend/src/components/Sidebar.tsx
18. frontend/src/hooks/useToast.tsx
19. frontend/styles/globals.css
20. frontend/package.json
21. frontend/tailwind.config.js

═══════════════════════════════════════════════
EXACT PATTERNS — FOLLOW PRECISELY
═══════════════════════════════════════════════

──── server.ts (MUST register ALL module routes) ────
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
async function startServer() {
  await mongoose.connect(process.env.DATABASE_URL!);
  console.log('MongoDB connected');
  const { authRoutes } = await import('./modules/auth/auth.routes');
  app.use('/api/auth', authRoutes);
  // === ALL MODULE ROUTES — GENERATED FROM PLAN ===
${moduleImports}
${routeRegistrations}
  // ===============================================
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ success: false, data: null, error: 'Internal server error' });
  });
  app.listen(process.env.PORT || 5000, () => console.log('Server running'));
}
startServer();

──── Sidebar.tsx (CRITICAL — defines entire app look) ────
// Left sidebar (w-64), fixed on desktop, slide-in on mobile
// Sections from navigation plan: ${sidebarNav.slice(0, 200)}
// Logo at top with app name + colored icon
// Active item highlighted with primary background color
// User profile at bottom: avatar initial + name + email + logout button
// Mobile: hamburger button in top bar triggers slide-in overlay

──── useToast.tsx ────
// Simple toast system with ToastProvider and useToast hook
// Toast appears bottom-right, auto-dismisses after 3.5 seconds
// Types: success (green dot), error (red dot), info (blue dot)
// ToastProvider wraps children and renders toasts as portal
// useToast() returns { toast } function
// toast({ message: string, type: 'success' | 'error' | 'info' })

──── dashboard.tsx (shows REAL API data from modules) ────
// Import and call stats from EVERY module service (uncommented, working)
// Import ALL module services:
${plan.modules.map((m: any) => `// import { ${m.name}Service } from '../src/services/${m.name}.service';`).join('\n')}
//
// Stat cards with gradient background pattern:
${dashboardStatCards}
//
// Use this gradient stat card pattern:
const StatCard = ({ label, value, icon: Icon, color, change }: any) => {
  const colors = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    rose:   'from-rose-500 to-rose-600',
  };
  return (
    <div className={\`bg-gradient-to-br \${colors[color]} rounded-2xl p-6 text-white\`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-white"/>
        </div>
        {change && <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{change}</span>}
      </div>
      <p className="text-3xl font-bold">{value ?? 0}</p>
      <p className="text-sm text-white/80 mt-1">{label}</p>
    </div>
  );
};

──── login.tsx (split-screen premium layout) ────
// Left 50%: form with logo, heading, email+password fields, submit button
// Right 50%: gradient (primary to primaryDark) with app name, tagline, feature list with CheckCircle icons
// Responsive: right panel hidden on mobile (hidden lg:flex)
// Form: email + password + error state + loading state
// On success: router.push('/dashboard')
// Link to /signup at bottom of form

──── signup.tsx (same split-screen layout as login) ────
// Left: form with name + email + password + confirm password fields
// Right: same gradient panel as login
// On success: router.push('/dashboard') ← takes user straight to app

──── globals.css ────
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: ${primary};
  --primary-light: ${primaryLight};
  --primary-dark: ${primaryDark};
  --sidebar-width: 256px;
}

* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }

.sidebar-layout { padding-left: 0; }
@media (min-width: 1024px) { .sidebar-layout { padding-left: var(--sidebar-width); } }

.animate-in { animation: fadeInUp 0.2s ease-out; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.slide-in-from-right-5 { animation: slideInRight 0.3s ease-out; }
@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

──── tailwind.config.js ────
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '${primary}', light: '${primaryLight}', dark: '${primaryDark}' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: [],
};

══════════════════════════════════════════════
OUTPUT FORMAT
══════════════════════════════════════════════

{
  "shared": true,
  "files": [
    { "path": "backend/src/server.ts", "content": "complete content", "language": "typescript" },
    // ... all 21 files
  ]
}

Return ONLY raw JSON. No markdown. Start with { and end with }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — DESIGN DNA
// ─────────────────────────────────────────────────────────────────────────────

const PALETTES = [
  { primary: '#4f46e5', primaryLight: '#eef2ff', primaryDark: '#4338ca' },
  { primary: '#2563eb', primaryLight: '#eff6ff', primaryDark: '#1d4ed8' },
  { primary: '#059669', primaryLight: '#ecfdf5', primaryDark: '#047857' },
  { primary: '#e11d48', primaryLight: '#fff1f2', primaryDark: '#be123c' },
  { primary: '#0d9488', primaryLight: '#f0fdfa', primaryDark: '#0f766e' },
  { primary: '#7c3aed', primaryLight: '#f5f3ff', primaryDark: '#6d28d9' },
  { primary: '#334155', primaryLight: '#f1f5f9', primaryDark: '#1e293b' },
  { primary: '#0891b2', primaryLight: '#ecfeff', primaryDark: '#0e7490' },
  { primary: '#16a34a', primaryLight: '#f0fdf4', primaryDark: '#15803d' },
  { primary: '#ea580c', primaryLight: '#fff7ed', primaryDark: '#c2410c' },
] as const;

const AUTH_LAYOUTS = [
  'split-screen with full-height decorative gradient panel on the right',
  'split-screen with app screenshot mockup on the right panel',
  'centered card on gradient mesh background with subtle pattern',
  'split-screen with bold feature list and icon grid on right',
  'minimal left-aligned form with oversized heading above the card',
  'two-column with testimonial quote and avatar on the right side',
] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function pickBySeed<T>(arr: readonly T[], seed: string, offset: number): T {
  return arr[(hashSeed(`${seed}:${offset}`) + offset) % arr.length];
}

export function getColorPaletteFromSeed(seed: string) {
  return { ...pickBySeed(PALETTES, seed, 1) };
}

function buildDesignDNA(seed: string): string {
  const palette    = pickBySeed(PALETTES, seed, 1);
  const authLayout = pickBySeed(AUTH_LAYOUTS, seed, 2);
  return [
    `DESIGN DNA [seed: ${seed}]`,
    `  Auth layout:    ${authLayout}`,
    `  Primary:        ${palette.primary}`,
    `  Primary light:  ${palette.primaryLight}`,
    `  Primary dark:   ${palette.primaryDark}`,
    `  Font:           Inter (system-ui fallback)`,
    `  Border radius:  rounded-2xl for cards, rounded-xl for inputs/buttons`,
    `  Shadows:        shadow-sm for cards, shadow-lg for modals`,
    `  Spacing:        p-6 to p-8 for page containers, gap-4 to gap-6 for grids`,
    ``,
    `Apply across ALL pages uniformly. Every page matches the same system.`,
    `Define --primary CSS variable in globals.css and use it everywhere.`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — DOMAIN MODULE DETECTOR
// Used by the legacy single-shot prompt (fallback).
// Two-phase generation uses the Planner instead.
// ─────────────────────────────────────────────────────────────────────────────

export function detectDomainModules(
  userDescription: string,
  requirements?: RequirementsDocument
): string {
  const text = [
    userDescription,
    requirements?.appType || '',
    requirements?.coreFeatures?.join(' ') || '',
    requirements?.originalPrompt || ''
  ].join(' ').toLowerCase();

  const guides: Record<string, string> = {
    ecommerce: `
MODULES: products (name,price,stock,category,images[],sku,available), categories (name,slug,color),
orders (userId,items[{productId,qty,price}],status,total,shippingAddress), cart (userId,items[{productId,qty}])
Dashboard: revenue today (green), pending orders (orange), products count (blue), low stock alerts table
Sidebar: Dashboard, Products, Orders, Categories, Settings`,

    blog: `
MODULES: posts (title,slug,content,excerpt,status,categoryId,tags[],publishedAt),
categories (name,slug,color), comments (content,postId,authorId,status)
Dashboard: published vs draft, pending comments, recent posts table
Sidebar: Dashboard, Posts, Categories, Comments, Settings`,

    task: `
MODULES: projects (name,description,status,deadline,color,ownerId),
tasks (title,description,status,priority,assigneeId,dueDate,projectId,tags[]),
comments (content,taskId,authorId)
Dashboard: tasks due today (rose), overdue (red), by-status breakdown, project progress bars
Sidebar: Dashboard, Projects, My Tasks, All Tasks, Settings`,

    booking: `
MODULES: services (name,description,duration,price,category,available),
bookings (serviceId,userId,customerName,customerEmail,date,startTime,status,totalPrice),
availability (dayOfWeek,startTime,endTime,slotDuration,isOff)
Dashboard: today schedule, this week revenue, booking status pie, upcoming list
Sidebar: Dashboard, Bookings, Services, Availability, Settings`,

    inventory: `
MODULES: products (name,sku,quantity,minStockLevel,supplierId,costPrice,sellingPrice,unit),
suppliers (name,contactPerson,email,phone,address),
movements (productId,type,quantity,reason,date)
Dashboard: low stock alerts (red), total value (green), recent movements, supplier count
Sidebar: Dashboard, Products, Movements, Suppliers, Settings`,

    finance: `
MODULES: accounts (name,type,balance,currency,color),
categories (name,type,color), transactions (amount,type,categoryId,accountId,date,description),
budgets (categoryId,amount,period,startDate)
Dashboard: net balance, income vs expense this month, recent transactions, budget progress
Sidebar: Dashboard, Transactions, Accounts, Budgets, Categories`,

    restaurant: `
MODULES: menu (name,categoryId,price,description,available,preparationTime),
orders (tableNumber,items[{menuItemId,qty,price}],status,total),
tables (number,capacity,status), categories (name,displayOrder)
Dashboard: live orders by status, revenue today, popular items, table occupancy
Sidebar: Dashboard, Orders, Menu, Tables, Categories`,

    saas: `
MODULES: workspaces (name,slug,plan,ownerId), members (workspaceId,userId,role,joinedAt),
invites (workspaceId,email,role,token,status), activity (workspaceId,userId,action,detail)
Dashboard: workspace count, member count, plan distribution, activity feed
Sidebar: Dashboard, Workspaces, Members, Invites, Activity`,

    social: `
MODULES: posts (content,authorId,images[],tags[],likesCount,commentsCount),
follows (followerId,followingId), likes (postId,userId),
notifications (userId,type,actorId,resourceId,read)
Dashboard: feed, notification count, follower stats, trending tags
Sidebar: Dashboard, Feed, My Posts, Notifications, Profile`,
  };

  const checks: Record<string, string[]> = {
    ecommerce:  ['product','shop','store','cart','checkout','order','ecommerce','sell','buy'],
    blog:       ['blog','post','article','cms','content','publish','write','editorial'],
    task:       ['task','project','todo','kanban','sprint','agile','manage','track'],
    booking:    ['book','appointment','schedule','reservation','slot','calendar','clinic'],
    inventory:  ['inventory','stock','warehouse','supply','sku','supplier','movement'],
    finance:    ['finance','expense','budget','transaction','account','money','income','invoice'],
    restaurant: ['restaurant','food','menu','table','kitchen','meal','dining','cafe'],
    saas:       ['saas','workspace','team','organization','member','plan','subscription'],
    social:     ['social','feed','follow','like','community','network','friend'],
  };

  for (const [type, keywords] of Object.entries(checks)) {
    if (keywords.some(kw => text.includes(kw))) return guides[type] || '';
  }

  // AI-inferred fallback for any other domain
  return `
CUSTOM DOMAIN — read the user description and infer modules:
"${text.slice(0, 400)}"

Rules:
1. Identify 2-4 main resources (nouns) the app manages.
2. Use REAL domain field names — NOT title/description/status for everything.
3. Examples of domain-specific field names:
   - Workout: exercises[], duration, difficulty, caloriesBurn, muscleGroups[]
   - Pet:     species, breed, dateOfBirth, vaccinations[], vetId, ownerId
   - Legal:   caseNumber, court, filingDate, hearingDate, clientId, status
   - Job:     title, company, salary, location, skills[], type, deadline
4. Dashboard shows metrics meaningful to THIS specific app.
5. Sidebar labels match this domain's vocabulary.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — LEGACY SINGLE-SHOT PROMPT (fallback when v2 is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_FULLSTACK = `You are an expert full-stack developer generating complete, production-ready web applications.

Every app must have world-class UI that looks like a real shipped SaaS product.

═══════════════════════════════════════════════════════════════════
ABSOLUTE RULES — NEVER BREAK
═══════════════════════════════════════════════════════════════════

1. NEVER generate auth-only apps.
2. ALWAYS use Sidebar layout — import Sidebar, not a top Navbar.
3. ALWAYS use lucide-react icons throughout every page.
4. ALWAYS use toast notifications — NEVER browser alert().
5. ALWAYS generate skeleton loading states in list pages.
6. ALWAYS generate rich empty states with icon + description + CTA.
7. ALWAYS generate real uncommented API calls — NO commented code.
8. server.ts MUST register ALL module routes.
9. Return ONLY raw JSON. No markdown. Start with { end with }.

═══════════════════════════════════════════════════════════════════
TECH STACK
═══════════════════════════════════════════════════════════════════

Backend:  Node.js + Express + TypeScript + MongoDB + Mongoose + Zod + bcrypt + jsonwebtoken
Frontend: Next.js 14 Pages Router + React 18 + TypeScript + Tailwind CSS + axios + lucide-react

OUTPUT FORMAT:
{
  "projectName": string, "description": string,
  "files": [{ "path": string, "content": string, "language": string }],
  "envVars": { "backend": {}, "frontend": {} },
  "dependencies": { "backend": {}, "frontend": {} },
  "setupInstructions": []
}`;

export function buildFullstackPrompt(
  userDescription: string,
  selectedModules: string[],
  variationSeed: string,
  requirements?: RequirementsDocument
): string {
  const palette = getColorPaletteFromSeed(variationSeed);
  const designDNA = buildDesignDNA(variationSeed);
  const domainGuide = detectDomainModules(userDescription, requirements);

  const requirementsBlock = requirements ? `
╔══════════════════════════════════════════════╗
║  PROJECT REQUIREMENTS — HIGHEST PRIORITY     ║
╚══════════════════════════════════════════════╝
App type: ${requirements.appType}
Users:    ${requirements.targetUsers}
Scale:    ${requirements.scale}
Theme:    ${requirements.themeMode}
Features:
${requirements.coreFeatures.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}
User words:
${requirements.answers.map(a => `  • "${a.answer}"`).join('\n')}
` : '';

  return `${requirementsBlock}${SYSTEM_PROMPT_FULLSTACK}

USER REQUEST: "${userDescription}"
MODULES: ${selectedModules.join(', ') || 'auth'}

${domainGuide}

${designDNA}
Primary color: ${palette.primary} | Light: ${palette.primaryLight} | Dark: ${palette.primaryDark}

COMPLETENESS CHECK — VERIFY BEFORE OUTPUTTING:
✓ server.ts registers ALL module routes
✓ Sidebar.tsx links to ALL module pages
✓ dashboard.tsx calls REAL APIs (no commented imports)
✓ Every module: 5 backend files + list + create + edit + service
✓ _app.tsx wraps with AuthProvider AND ToastProvider
✓ Every mutation: toast success + toast error — NO alert()
✓ Every list page: skeleton rows when loading
✓ Every list page: rich empty state with icon and CTA
✓ lucide-react icons imported and used on every page
✓ Sidebar layout used on ALL app pages
✓ globals.css: CSS variables for primary color
✓ tailwind.config.js: extends theme with primary color
✓ Total file count: minimum 30

CRITICAL: Return ONLY raw JSON. No markdown. Start { end }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — REFINE PROMPT
// ─────────────────────────────────────────────────────────────────────────────

export function buildRefinePrompt(
  previousFiles: Array<{ path: string; content: string }>,
  refinementRequest: string,
  projectName?: string
): string {
  const fileContext = previousFiles.slice(0, 30).map(f => {
    const c = f.content.length > 2000
      ? f.content.slice(0, 2000) + '\n// [truncated — file continues]'
      : f.content;
    return `\n// ══ ${f.path} ══\n${c}`;
  }).join('\n');

  return `You are an expert full-stack developer refining an existing application.

PROJECT: ${projectName || 'my-app'}
TOTAL FILES: ${previousFiles.length}
ALL FILE PATHS:
${previousFiles.map(f => `  - ${f.path}`).join('\n')}

KEY FILE CONTENTS:
${fileContext}

REFINEMENT REQUEST: "${refinementRequest}"

RULES:
1. Apply ONLY the requested change. Do not remove working features.
2. New module: generate all 5 backend files + 3 frontend pages + 1 service.
3. New routes: update server.ts imports and registrations.
4. New pages: update Sidebar.tsx navigation items.
5. Return ONLY files you are creating or changing.
6. Return ONLY raw JSON. No markdown. Start { end }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — REQUIREMENTS PROMPTS (unchanged — already working)
// ─────────────────────────────────────────────────────────────────────────────

export function buildRequirementsQuestionsPrompt(
  userIdea: string,
  selectedModules: string[]
): string {
  return `You are a senior product engineer interviewing a user before building their app.

Idea: "${userIdea}"
Modules: ${selectedModules.join(', ') || 'auth'}

Generate 3-5 targeted, specific questions for THIS app type.

Rules:
1. Return ONLY valid JSON. No markdown.
2. projectName: lowercase-hyphen, max 30 chars, no conversational phrases.
3. appType: exactly one of: e-commerce|blog|dashboard|social|saas|portfolio|auth|analytics|booking|marketplace|other
4. Questions must be conversational, specific to THIS app.
5. hint: short example answer shown as placeholder.
6. MUST generate 3-5 questions. Never fewer than 3.
7. At least 3 required: true.

Return ONLY:
{
  "appType": "string",
  "projectName": "string",
  "questions": [
    { "id": "q1", "question": "string", "hint": "string", "category": "users|features|design|technical|scope", "required": true }
  ]
}`;
}

export function buildRequirementsCompilePrompt(
  originalPrompt: string,
  projectName: string,
  answers: RequirementsAnswer[],
  selectedModules: string[]
): string {
  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
  return `You are a senior architect compiling a requirements document.

Idea: "${originalPrompt}"
Project: ${projectName}
Modules: ${selectedModules.join(', ')}

Answers:
${answersText}

Rules:
1. Return ONLY valid JSON. No markdown.
2. coreFeatures: specific actionable strings, max 8. "Stripe checkout" not "payments".
3. themeMode: light|dark|hybrid|any (default to light if ambiguous)
4. scale: personal|startup|enterprise
5. compiledSummary: 2-4 sentences starting with "You're building".
6. Never leave any field empty — infer from context.

Return ONLY:
{
  "originalPrompt": "string", "projectName": "string", "appType": "string",
  "targetUsers": "string", "coreFeatures": ["string"],
  "designPreference": "string", "themeMode": "light|dark|hybrid|any",
  "scale": "personal|startup|enterprise", "techPreferences": "string",
  "additionalNotes": "string", "answers": ${JSON.stringify(answers)},
  "compiledSummary": "You're building..."
}`;
}
```

### [VERIFY] STEP-1
```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0
# If errors: read them. Fix only the line causing the error. Do not rewrite the file.
```

---

## ═══════════════════════════════════════════════════════
## STEP-2 — ADD PLANNER + MODULE GENERATOR METHODS TO ai.service.ts
## ═══════════════════════════════════════════════════════

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.service.ts`

**CRITICAL — Use the correct `generateNonStreaming` shape you found in STEP-0.**
Do NOT use the shape shown in the original document (Part B1) — it was wrong.
Use the actual params the existing `generateNonStreaming` accepts.

Read the file. Find the class body. Find the last method before the closing `}`.
Insert these three methods after the last existing method:

```typescript
// ════════════════════════════════════════════════════════
// TWO-PHASE GENERATION — Phase 1: Planner
// Returns architecture plan JSON. No code generated.
// ════════════════════════════════════════════════════════

async planApplication(
  userDescription: string,
  requirements: any,
  provider: string,
  model: string,
  apiKey?: string
): Promise<any> {
  const { buildPlannerPrompt, getColorPaletteFromSeed } = await import('./ai.prompts');
  const plannerPrompt = buildPlannerPrompt(userDescription, requirements);
  const seed = Math.random().toString(36).slice(2, 10);

  // === USE YOUR EXISTING generateNonStreaming SIGNATURE EXACTLY ===
  // Replace the params below with the shape you found in STEP-0
  const raw = await this.generateNonStreaming({
    provider: provider as any,
    model,
    apiKey,
    prompt: plannerPrompt,       // rename to systemPrompt/userPrompt if that's what your method uses
    maxTokens: 2000,
    temperature: 0.2,
    forceJson: true,
  });

  let plan: any;
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    plan = JSON.parse(cleaned);
  } catch {
    // Repair attempt — ask model to fix its own output
    const repaired = await this.generateNonStreaming({
      provider: provider as any,
      model,
      apiKey,
      prompt: `Fix this invalid JSON and return only valid JSON:\n${raw}`,
      maxTokens: 2000,
      temperature: 0,
      forceJson: true,
    });
    plan = JSON.parse(repaired.replace(/```json|```/g, '').trim());
  }

  plan.colorPalette = getColorPaletteFromSeed(seed);
  plan._seed = seed;
  return plan;
}

// ════════════════════════════════════════════════════════
// TWO-PHASE GENERATION — Phase 2: Per-Module Generator
// Generates exactly 9 files per module. Never truncates.
// ════════════════════════════════════════════════════════

async generateModuleFiles(
  module: any,
  plan: any,
  provider: string,
  model: string,
  apiKey?: string
): Promise<Array<{ path: string; content: string; language: string }>> {
  const { buildModulePrompt } = await import('./ai.prompts');
  const prompt = buildModulePrompt(module, plan, plan._seed || 'default');

  try {
    const raw = await this.generateNonStreaming({
      provider: provider as any,
      model,
      apiKey,
      prompt,
      maxTokens: 8192,
      temperature: 0.4,
      forceJson: true,
    });
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.files || [];
  } catch (err: any) {
    console.warn(`[ai.service] Module "${module.name}" generation failed: ${err.message}`);
    return [];
  }
}

// ════════════════════════════════════════════════════════
// TWO-PHASE GENERATION — Phase 3: Shared Infrastructure
// Generates server.ts, auth, sidebar, dashboard, configs.
// ════════════════════════════════════════════════════════

async generateSharedFiles(
  plan: any,
  provider: string,
  model: string,
  apiKey?: string
): Promise<Array<{ path: string; content: string; language: string }>> {
  const { buildSharedFilesPrompt } = await import('./ai.prompts');
  const prompt = buildSharedFilesPrompt(plan, plan._seed || 'default');

  try {
    const raw = await this.generateNonStreaming({
      provider: provider as any,
      model,
      apiKey,
      prompt,
      maxTokens: 16384,
      temperature: 0.4,
      forceJson: true,
    });
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.files || [];
  } catch (err: any) {
    console.warn(`[ai.service] Shared files generation failed: ${err.message}`);
    return [];
  }
}
```

[STOP IF] `generateNonStreaming` has a fundamentally different structure
(e.g. it takes a string not an object, or it uses streaming internally).
Report the exact signature and wait for a corrected version.

### [VERIFY] STEP-2
```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0
```

---

## ═══════════════════════════════════════════════════════
## STEP-3 — ADD generateV2 HANDLER TO ai.controller.ts
## ═══════════════════════════════════════════════════════

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.controller.ts`

Read the file. Find the existing `generate` handler method.
Insert the following AFTER the generate handler, still inside the class body:

```typescript
// ════════════════════════════════════════════════════════
// V2 GENERATION HANDLER — Two-phase: Plan → Module → Shared
// Replaces single-shot generation with multi-call pipeline.
// Never truncates. Handles any app type. World-class UI output.
// ════════════════════════════════════════════════════════

generateV2 = async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (type: string, data: Record<string, any>) => {
    try {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    } catch { /* client disconnected */ }
  };

  try {
    const {
      userPrompt,
      provider = 'gemini',
      model,
      apiKey,
      selectedModules = ['auth'],
      projectName: requestedName,
      requirements = null,
    } = req.body;

    if (!userPrompt || userPrompt.trim().length < 5) {
      send('error', { message: 'Please describe your app idea in more detail.' });
      res.end();
      return;
    }

    // ── Phase 1: Planning ─────────────────────────────────────────────────
    send('phase', { phase: 'planning', message: 'Analysing your idea…', progress: 5 });

    const plan = await this.aiService.planApplication(
      userPrompt,
      requirements,
      provider,
      model,
      apiKey
    );

    send('plan', {
      projectName: plan.projectName,
      appType:     plan.appType,
      modules:     plan.modules.map((m: any) => m.name),
      moduleCount: plan.modules.length,
    });

    const allFiles: Array<{ path: string; content: string; language: string }> = [];

    // ── Phase 2: Generate each module ────────────────────────────────────
    for (let i = 0; i < plan.modules.length; i++) {
      const module = plan.modules[i];
      const progressPct = 10 + Math.round((i / plan.modules.length) * 65);

      send('phase', {
        phase:    'generating',
        message:  `Building ${module.label} module…`,
        module:   module.name,
        progress: progressPct,
      });

      const moduleFiles = await this.aiService.generateModuleFiles(
        module, plan, provider, model, apiKey
      );
      allFiles.push(...moduleFiles);

      send('module_complete', {
        module:    module.name,
        fileCount: moduleFiles.length,
        files:     moduleFiles.map(f => f.path),
      });
    }

    // ── Phase 3: Generate shared infrastructure ───────────────────────────
    send('phase', { phase: 'wiring', message: 'Wiring everything together…', progress: 78 });

    const sharedFiles = await this.aiService.generateSharedFiles(
      plan, provider, model, apiKey
    );
    allFiles.push(...sharedFiles);

    send('phase', { phase: 'finalizing', message: 'Finalizing project…', progress: 92 });

    // ── Emit all files to client ──────────────────────────────────────────
    for (const file of allFiles) {
      send('file', file);
    }

    // ── Persist to DB if authenticated ────────────────────────────────────
    let savedProjectId: string | null = null;
    const userId = (req as any).userId;

    if (userId) {
      try {
        const { platformProjectsService } = await import(
          '../platform-projects/platform-projects.service'
        );
        const { platformAuthService } = await import(
          '../platform-auth/platform-auth.service'
        );
        const proj = await platformProjectsService.createProject(userId, {
          name:       plan.projectName || requestedName || 'my-app',
          modules:    plan.modules.map((m: any) => m.name),
          provider,
          stack:      'nextjs',
          designSeed: plan._seed,
        });

        // === USE THE CORRECT saveFiles SIGNATURE FROM STEP-0 ===
        // If signature is saveFiles(projectId, userId, files):
        await platformProjectsService.saveFiles(proj._id.toString(), userId, allFiles);
        // If signature is saveFiles(projectId, files) — use that instead

        await platformAuthService.incrementGenerationCount(userId);
        savedProjectId = proj._id.toString();
      } catch (persistErr: any) {
        console.warn('[generateV2] Persist failed (non-fatal):', persistErr.message);
        send('warning', { message: 'App generated but could not be saved to your account.' });
      }
    }

    // ── Complete event ────────────────────────────────────────────────────
    send('complete', {
      projectName: plan.projectName,
      fileCount:   allFiles.length,
      modules:     plan.modules.map((m: any) => m.name),
      projectId:   savedProjectId,
      progress:    100,
    });

  } catch (err: any) {
    console.error('[generateV2] Fatal error:', err);
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Generation failed. Please try again.' })}\n\n`);
    } catch { /* client disconnected */ }
  } finally {
    try { res.end(); } catch { /* already ended */ }
  }
};
```

[STOP IF] `this.aiService` is not the property name for the injected service.
Read the controller constructor and use the actual property name.

### [VERIFY] STEP-3
```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0
```

---

## ═══════════════════════════════════════════════════════
## STEP-4 — ADD V2 ROUTE TO ai.routes.ts
## ═══════════════════════════════════════════════════════

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.routes.ts`

Read the file. Find the existing `/generate` route registration.
Insert after it (use the middleware name you found in STEP-0):

```typescript
// [INSERT after the existing /generate route]
// Use the ACTUAL middleware name from STEP-0 (optionalAuth OR optionalPlatformAuth)
router.post(
  '/generate/v2',
  optionalAuth,    // ← replace with actual middleware name from STEP-0
  (req, res) => aiController.generateV2(req, res)
);
```

[STOP IF] The middleware is not imported in this file.
Find where it is imported in the existing `/generate` route and use the same import.

### [VERIFY] STEP-4
```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0

# API reachability test (backend must be running):
curl -s -X POST http://localhost:5000/api/ai/generate/v2 \
  -H "Content-Type: application/json" \
  -d '{"userPrompt":"test"}' | head -5
# Expected: data: {"type":"error","message":"Please describe your app idea..."}
# (short prompt triggers validation error — route is reachable)
```

---

## ═══════════════════════════════════════════════════════
## STEP-5 — UPDATE FRONTEND TO USE V2 GENERATION
## ═══════════════════════════════════════════════════════

**Action:** [MODIFY]
**File:** `frontend/pages/builder/ai-generate.tsx`

### STEP-5a — Add v2 state variables

Read the file. Find the existing `useState` declarations near the top of the component.
Insert after them:

```typescript
// [INSERT after existing useState declarations]

// V2 generation state
const [useV2Generation] = useState(true);  // use v2 pipeline by default
const [generationPhase, setGenerationPhase]       = useState('');
const [generationMessage, setGenerationMessage]   = useState('');
const [generationProgress, setGenerationProgress] = useState(0);
const [plannedModules, setPlannedModules]         = useState<string[]>([]);
const [completedModules, setCompletedModules]     = useState<string[]>([]);
```

---

### STEP-5b — Update the generation URL

Read the file. Find where the SSE request URL is constructed.
It will look like one of:
```typescript
const url = `${API_BASE}/api/ai/generate`;
// OR:
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/generate`, ...
// OR:
const eventSource = new EventSource(...generate...
```

```typescript
// [FIND+REPLACE — the generate URL construction]
// FIND:   /api/ai/generate   (the exact string, may appear in fetch or EventSource)
// REPLACE with:
const GENERATE_ENDPOINT = useV2Generation ? '/api/ai/generate/v2' : '/api/ai/generate';
// Then use GENERATE_ENDPOINT in place of the hardcoded path
```

[STOP IF] The generation uses EventSource not fetch/axios.
EventSource does not support POST. If the current code uses EventSource,
report how it passes the body — the v2 approach requires fetch with streaming.

---

### STEP-5c — Handle new v2 SSE event types

Read the file. Find the SSE message handler — where `event.data` is parsed.
It handles events like `chunk`, `file`, `complete`, `error`.

Insert handling for the new v2 event types alongside the existing handlers:

```typescript
// [FIND+INSERT after existing 'chunk' or 'file' event handler]

if (eventData.type === 'phase') {
  setGenerationPhase(eventData.phase || '');
  setGenerationMessage(eventData.message || '');
  setGenerationProgress(eventData.progress || 0);
}

if (eventData.type === 'plan') {
  setPlannedModules(eventData.modules || []);
  setCompletedModules([]);  // reset on new generation
}

if (eventData.type === 'module_complete') {
  setCompletedModules(prev => [...prev, eventData.module]);
}
```

[STOP IF] The SSE parsing uses a different variable name than `eventData`.
Read the existing handler and use the actual variable name.

---

### STEP-5d — Replace spinner with progress UI

Read the file. Find the JSX that renders during generation.
It will show a spinner when `isGenerating` (or equivalent) is true.

```tsx
// [FIND the generating state JSX — the spinner/loading display]
// [FIND+REPLACE the entire generating state display with:]

{isGenerating && (
  <div className="flex flex-col items-center justify-center py-16 gap-8 px-6">

    {/* Phase label */}
    <div className="text-center">
      <p className="text-sm font-semibold text-gray-900 mb-1">
        {generationMessage || 'Preparing your app…'}
      </p>
      <p className="text-xs text-gray-400 capitalize">{generationPhase}</p>
    </div>

    {/* Progress bar */}
    <div className="w-72">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{generationProgress}%</span>
        <span>{completedModules.length}/{plannedModules.length} modules</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${generationProgress}%` }}
        />
      </div>
    </div>

    {/* Module pills */}
    {plannedModules.length > 0 && (
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {plannedModules.map(m => {
          const done    = completedModules.includes(m);
          const active  = generationMessage.toLowerCase().includes(m.toLowerCase());
          return (
            <span
              key={m}
              className={`text-xs px-3 py-1 rounded-full font-medium border transition-all duration-300 ${
                done   ? 'bg-green-50 text-green-700 border-green-200' :
                active ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                         'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {done ? '✓ ' : ''}{m}
            </span>
          );
        })}
      </div>
    )}

    {/* Fallback spinner when no progress yet */}
    {generationProgress === 0 && (
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
    )}

  </div>
)}
```

[STOP IF] The generating state variable is named differently than `isGenerating`.
Read the file and use the actual variable name.

### [VERIFY] STEP-5
```bash
cd frontend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0

cd frontend && npm run build 2>&1 | tail -8
# Expected: build succeeds, ai-generate page appears in output
```

---

## ═══════════════════════════════════════════════════════
## STEP-6 — ADD WIRING VALIDATOR TO ai.controller.ts
## (From Part 8 Phase B — high ROI reliability fix)
## ═══════════════════════════════════════════════════════

**Action:** [NEW FILE]
**File:** `backend/src/modules/ai/ai.validators.ts`

This file validates that generated files are properly wired together.
Called after generation completes, before the `complete` SSE event is sent.

```typescript
// backend/src/modules/ai/ai.validators.ts
// Validates structural correctness of generated file sets.
// Catches missing route mounts, missing services, broken imports.

export interface ValidationResult {
  passed: boolean;
  critical: string[];
  warnings: string[];
}

/**
 * Validates a set of generated files for structural correctness.
 * Does NOT run a real compiler — uses fast static analysis.
 */
export function validateGeneratedFiles(
  files: Array<{ path: string; content: string }>,
  plan?: { modules?: Array<{ name: string }> }
): ValidationResult {
  const critical: string[] = [];
  const warnings: string[] = [];

  const paths    = files.map(f => f.path);
  const contents = files.reduce((acc, f) => ({ ...acc, [f.path]: f.content }), {} as Record<string, string>);

  // ── Check 1: server.ts exists ─────────────────────────────────────────
  const serverFile = paths.find(p => p.includes('server.ts') && !p.includes('modules'));
  if (!serverFile) {
    critical.push('server.ts is missing from generated files');
  }

  // ── Check 2: server.ts registers all module routes ────────────────────
  if (serverFile && plan?.modules) {
    const serverContent = contents[serverFile] || '';
    for (const mod of plan.modules) {
      const routeVarName = `${mod.name}Routes`;
      if (!serverContent.includes(routeVarName)) {
        critical.push(`server.ts does not register "${routeVarName}" for module "${mod.name}"`);
      }
    }
  }

  // ── Check 3: All planned modules have their 5 backend files ───────────
  if (plan?.modules) {
    for (const mod of plan.modules) {
      const requiredBackend = [
        `modules/${mod.name}/${mod.name}.routes.ts`,
        `modules/${mod.name}/${mod.name}.controller.ts`,
        `modules/${mod.name}/${mod.name}.service.ts`,
        `modules/${mod.name}/${mod.name}.model.ts`,
        `modules/${mod.name}/${mod.name}.schema.ts`,
      ];
      for (const required of requiredBackend) {
        if (!paths.some(p => p.includes(required))) {
          critical.push(`Missing backend file: ${required}`);
        }
      }

      // Frontend files
      const requiredFrontend = [
        `pages/${mod.name}/index.tsx`,
        `pages/${mod.name}/new.tsx`,
        `src/services/${mod.name}.service.ts`,
      ];
      for (const required of requiredFrontend) {
        if (!paths.some(p => p.includes(required))) {
          warnings.push(`Missing frontend file: ${required}`);
        }
      }
    }
  }

  // ── Check 4: No commented-out service calls ───────────────────────────
  const commentedServicePattern = /\/\/ (import|await) .*(Service|service)\./g;
  for (const file of files) {
    if (file.path.includes('pages/') && commentedServicePattern.test(file.content)) {
      warnings.push(`Commented-out service call in ${file.path} — API may not be called`);
    }
  }

  // ── Check 5: No TODO or placeholder literals ──────────────────────────
  const todoPattern = /TODO:|PLACEHOLDER|'your-.*-here'|"your-.*-here"|'xxx'|"xxx"/gi;
  for (const file of files) {
    if (todoPattern.test(file.content)) {
      warnings.push(`Potential placeholder/TODO in ${file.path}`);
    }
  }

  // ── Check 6: dashboard.tsx calls real APIs ────────────────────────────
  const dashboardFile = paths.find(p => p.includes('pages/dashboard'));
  if (dashboardFile) {
    const dash = contents[dashboardFile] || '';
    if (!dash.includes('Service') || !dash.includes('useEffect')) {
      warnings.push('dashboard.tsx may not call any API services');
    }
    if (dash.includes('// import') || dash.includes('// await')) {
      critical.push('dashboard.tsx has commented-out API calls — dashboard shows no real data');
    }
  }

  // ── Check 7: Sidebar.tsx or Navbar.tsx exists ─────────────────────────
  const hasSidebar = paths.some(p => p.includes('Sidebar.tsx') || p.includes('sidebar.tsx'));
  if (!hasSidebar) {
    warnings.push('Sidebar.tsx not found — app may use top navbar instead of sidebar');
  }

  // ── Check 8: Alert() usage (should use toast instead) ─────────────────
  for (const file of files) {
    if (file.path.includes('pages/') && /[^a-z]alert\s*\(/.test(file.content)) {
      warnings.push(`browser alert() found in ${file.path} — should use toast notifications`);
    }
  }

  return {
    passed:   critical.length === 0,
    critical,
    warnings,
  };
}
```

---

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.controller.ts`

Add the import at the top of the file:

```typescript
// [FIND+INSERT before the first import or after the last import]
import { validateGeneratedFiles } from './ai.validators';
```

In `generateV2` handler, find where all files are collected and the `complete`
event is about to be sent. Insert validation BEFORE the complete event:

```typescript
// [FIND+INSERT before the send('complete', ...) call in generateV2]

// ── Validate structural correctness ──────────────────────────────────────
const validationResult = validateGeneratedFiles(allFiles, plan);

send('validation_report', {
  passed:   validationResult.passed,
  critical: validationResult.critical,
  warnings: validationResult.warnings,
});

if (!validationResult.passed) {
  console.warn('[generateV2] Validation critical failures:', validationResult.critical);
  // Non-blocking for now — emit warning but still complete
  // Future: trigger auto-repair for critical failures
}
```

### [VERIFY] STEP-6
```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0
```

---

## ═══════════════════════════════════════════════════════
## STEP-6B — ADD DOMAIN PACK ROUTER + CONFIDENCE FALLBACK
## (Ensures unknown/mixed ideas do NOT break generation quality)
## ═══════════════════════════════════════════════════════

**Action:** [NEW FILE]
**File:** `backend/src/modules/ai/ai.domainRouter.ts`

Create a lightweight domain router that:
- Chooses a known pack only when confidence is high
- Falls back to `custom` mode when confidence is low
- Supports `hybrid` mode for mixed ideas

```typescript
// backend/src/modules/ai/ai.domainRouter.ts
// Domain pack router with confidence-aware fallback.

export type DomainRoute = {
  mode: 'pack' | 'hybrid' | 'custom';
  pack: string | null;
  confidence: number;
  reasons: string[];
};

const PACK_KEYWORDS: Record<string, string[]> = {
  ecommerce: ['ecommerce', 'e-commerce', 'shop', 'store', 'cart', 'checkout', 'order'],
  booking: ['booking', 'appointment', 'schedule', 'reservation', 'slot'],
  lms: ['lms', 'course', 'lesson', 'student', 'enrollment', 'quiz'],
  saas: ['saas', 'workspace', 'subscription', 'tenant', 'organization'],
  healthcare: ['clinic', 'hospital', 'patient', 'doctor', 'medical', 'prescription'],
  crm: ['crm', 'lead', 'pipeline', 'customer', 'opportunity'],
  inventory: ['inventory', 'stock', 'warehouse', 'sku', 'supplier'],
  realestate: ['real estate', 'property', 'listing', 'agent', 'rent', 'viewing'],
};

function scorePack(text: string, keywords: string[]): number {
  let score = 0;
  for (const k of keywords) {
    if (text.includes(k)) score += 1;
  }
  return score;
}

export function routeDomainPack(userPrompt: string): DomainRoute {
  const text = String(userPrompt || '').toLowerCase();
  const entries = Object.entries(PACK_KEYWORDS)
    .map(([pack, keys]) => ({ pack, score: scorePack(text, keys) }))
    .sort((a, b) => b.score - a.score);

  const top = entries[0] || { pack: '', score: 0 };
  const second = entries[1] || { pack: '', score: 0 };
  const totalSignals = entries.reduce((s, e) => s + e.score, 0);

  // Confidence from dominant signal share + absolute match count
  const share = totalSignals > 0 ? top.score / totalSignals : 0;
  const confidence = Math.max(0, Math.min(1, (share * 0.7) + (Math.min(top.score, 5) / 5) * 0.3));

  if (top.score >= 3 && confidence >= 0.70 && second.score <= 1) {
    return {
      mode: 'pack',
      pack: top.pack,
      confidence,
      reasons: [`High-confidence match for "${top.pack}"`],
    };
  }

  if (top.score >= 2 && second.score >= 2) {
    return {
      mode: 'hybrid',
      pack: top.pack,
      confidence,
      reasons: ['Mixed domain intent detected; combining pack + custom modules'],
    };
  }

  return {
    mode: 'custom',
    pack: null,
    confidence,
    reasons: ['Low-confidence domain match; using custom planner mode'],
  };
}
```

---

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.service.ts`

In `planApplication(...)`, after receiving planner JSON, route domain mode and attach metadata:

```typescript
// [FIND+INSERT in planApplication, after parsed `plan` object is created]
const { routeDomainPack } = await import('./ai.domainRouter');
const route = routeDomainPack(userDescription);

plan._domainRouting = {
  mode: route.mode,
  pack: route.pack,
  confidence: route.confidence,
  reasons: route.reasons,
};
```

In `buildPlannerPrompt(...)` caller context, append a strict instruction:
- If `_domainRouting.mode === 'custom'`: derive modules from idea, do NOT force known pack shapes.
- If `_domainRouting.mode === 'hybrid'`: use selected pack as base and derive extra modules.

---

### [VERIFY] STEP-6B
```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0
```

---

## ═══════════════════════════════════════════════════════
## STEP-6C — ADD HARD VERIFICATION GATE (BLOCKING, NOT JUST WARNINGS)
## (Primary requirement to move from ~85% toward 90%+)
## ═══════════════════════════════════════════════════════

**Action:** [NEW FILE]
**File:** `backend/src/modules/ai/ai.verification.ts`

Create verification contract and runner interface (initially command-based):

```typescript
// backend/src/modules/ai/ai.verification.ts

export interface VerificationReport {
  passed: boolean;
  criticalFailures: string[];
  warnings: string[];
  checks: Array<{ name: string; passed: boolean; details?: string }>;
}

export async function verifyGeneratedProject(
  files: Array<{ path: string; content: string }>
): Promise<VerificationReport> {
  // NOTE:
  // Start with structural + static checks (fast), then expand to isolated build checks.
  // This function must return passed=false if any critical check fails.
  const criticalFailures: string[] = [];
  const warnings: string[] = [];
  const checks: Array<{ name: string; passed: boolean; details?: string }> = [];

  const hasBackendServer = files.some(f => f.path.includes('backend/src/server.ts'));
  checks.push({ name: 'backend-server-file', passed: hasBackendServer });
  if (!hasBackendServer) criticalFailures.push('Missing backend/src/server.ts');

  const hasFrontendApp = files.some(f => f.path.includes('frontend/pages/_app.tsx'));
  checks.push({ name: 'frontend-app-shell', passed: hasFrontendApp });
  if (!hasFrontendApp) criticalFailures.push('Missing frontend/pages/_app.tsx');

  const hasAnyModuleRoutes = files.some(f => /backend\/src\/modules\/.+\.routes\.ts$/.test(f.path.replace(/\\/g, '/')));
  checks.push({ name: 'module-routes-present', passed: hasAnyModuleRoutes });
  if (!hasAnyModuleRoutes) criticalFailures.push('No backend module routes generated');

  return {
    passed: criticalFailures.length === 0,
    criticalFailures,
    warnings,
    checks,
  };
}
```

---

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.controller.ts`

In `generateV2`, after collecting `allFiles` and before `complete` event:

```typescript
// [FIND+INSERT before send('complete', ...)]
const { verifyGeneratedProject } = await import('./ai.verification');
const verification = await verifyGeneratedProject(allFiles);

send('verification_report', verification);

if (!verification.passed) {
  send('error', {
    message: 'Generation failed verification gates. Please retry.',
    criticalFailures: verification.criticalFailures,
  });
  res.end();
  return;
}
```

Important:
- Unlike STEP-6 validator warnings, this gate is **blocking** on critical failures.
- Keep `validation_report` and `verification_report` both (static + hard gate).

---

### [VERIFY] STEP-6C
```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0

# Optional smoke: verify SSE now includes verification_report
curl -N -s -X POST http://localhost:5000/api/ai/generate/v2 \
  -H "Content-Type: application/json" \
  -d '{"userPrompt":"build a booking app","provider":"gemini","selectedModules":["auth"]}' \
  | head -30
```

---

## ═══════════════════════════════════════════════════════
## STEP-7 — NON-REGRESSION: CONFIRM ALL PRESERVED FIXES STILL WORK
## This is a read-only verification step. No code changes.
## ═══════════════════════════════════════════════════════

Read the following files and confirm each preserved fix is still present.
Report YES or NO for each.

**File:** `backend/src/modules/ai/ai.service.ts`

```
[ ] Fix 1: GitHub unknown-model fallback chain
    Look for: 404, 'unknown model', fallback model list in GitHub provider block

[ ] Fix 2: jsonrepair usage in parse pipeline
    Look for: import of jsonrepair OR jsonRepair function call

[ ] Fix 3: Requirements fallback + domain rebalance
    Look for: fallback requirements builder or rebalance function

[ ] Fix 4: Unified quality + compliance retry
    Look for: retry loop that checks both quality score AND missing features

[ ] Fix 5: External services compliance check
    Look for: stripe|email|upload|oauth pattern check in generated code
```

**File:** `backend/src/modules/ai/ai.controller.ts`

```
[ ] Fix 4 (continued): quality_report SSE event emission
    Look for: send quality_report or emit quality_report

[ ] Fix 5 (continued): compliance check before complete event
```

**File:** `backend/src/modules/ai/ai.prompts.ts` (the new file from STEP-1)

```
[ ] Fix 6: Light-theme default
    Look for: default to light if ambiguous in requirements compile prompt
    OR: themeMode defaults to 'light' in any normalization logic
```

**File:** `frontend/pages/builder/ai-generate.tsx`

```
[ ] Fix 7: Chat backend offline cooldown
    Look for: cooldown, backoff, or offline error handling in chat/refine

[ ] Fix 8: Context-aware refine payload compression
    Look for: file size limit or compression in refine request body
```

**File:** `frontend/pages/builder/preview-runner.tsx`

```
[ ] Fix 8 (continued): Preview runtime safety normalization
    Look for: safety normalization, mock normalization, or field fallback
    in the module resolver/renderer
```

### [VERIFY] STEP-7
```
Report:
  Fix 1 (GitHub fallback):         YES / NO — [location if YES]
  Fix 2 (jsonrepair):              YES / NO — [location if YES]
  Fix 3 (requirements rebalance):  YES / NO — [location if YES]
  Fix 4 (quality+compliance retry): YES / NO — [location if YES]
  Fix 5 (services compliance):     YES / NO — [location if YES]
  Fix 6 (light theme default):     YES / NO — [location if YES]
  Fix 7 (chat offline cooldown):   YES / NO — [location if YES]
  Fix 8 (preview safety):         YES / NO — [location if YES]

If ANY is NO: stop and report which fix is missing before continuing.
A missing fix means STEP-1 or an earlier step accidentally removed it.
```

---

## ═══════════════════════════════════════════════════════
## STEP-8 — FINAL VERIFICATION
## ═══════════════════════════════════════════════════════

### Build checks
```bash
# Backend clean
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0

# Frontend clean
cd frontend && npx tsc --noEmit 2>&1 | wc -l
# Expected: 0

# Frontend build
cd frontend && npm run build 2>&1 | tail -10
# Expected: build succeeds
# Both ai-generate and preview-runner appear in page list
```

### V2 API smoke test
```bash
# Backend must be running
curl -N -s -X POST http://localhost:5000/api/ai/generate/v2 \
  -H "Content-Type: application/json" \
  -d '{"userPrompt":"build a task management app for software teams","provider":"gemini","selectedModules":["auth"]}' \
  | head -20

# Expected SSE sequence:
# data: {"type":"phase","phase":"planning","message":"Analysing your idea…","progress":5}
# data: {"type":"plan","projectName":"...","modules":["tasks","projects",...],"moduleCount":3}
# data: {"type":"phase","phase":"generating","module":"tasks",...}
# data: {"type":"module_complete","module":"tasks","fileCount":9,...}
# ...
# data: {"type":"validation_report","passed":true,"critical":[],"warnings":[...]}
# data: {"type":"complete","projectName":"...","fileCount":45,...}
```

### UI quality self-audit checklist

Generate a task management app using v2. In the browser preview, check:

```
LAYOUT
[ ] Sidebar is visible on the LEFT (not a top navbar)
[ ] Sidebar has icons next to every nav item
[ ] Sidebar has user profile section at the bottom
[ ] Sidebar collapses on mobile (hamburger button visible)
[ ] Content area uses sidebar-layout class (offset from sidebar)

DASHBOARD
[ ] Stat cards have GRADIENT backgrounds (not plain white)
[ ] Stat cards show icons inside colored icon boxes
[ ] Stat cards call real API endpoints (check Network tab)
[ ] Recent items table shows real data from API
[ ] Dashboard has loading state while API calls complete

LIST PAGES
[ ] Search input has Search icon on the left side
[ ] "New [Item]" button has Plus icon and colored background
[ ] Table rows show skeleton animation while loading
[ ] Empty state shows large icon + title + description + CTA button
[ ] Edit action uses Pencil icon button (not "Edit" text)
[ ] Delete action uses Trash2 icon button (not "Delete" text)
[ ] Deleting shows toast notification (not browser alert)
[ ] Status shown as colored badge with dot indicator

FORM PAGES
[ ] Breadcrumb navigation at top
[ ] Back arrow button top left
[ ] Every field has a proper label
[ ] Save button shows spinner while submitting
[ ] Success shows toast notification → redirects to list
[ ] Error shows toast notification → stays on page
[ ] NO browser alert() anywhere

AUTH PAGES
[ ] Login is SPLIT-SCREEN (form left, decorative panel right)
[ ] Right panel has gradient background with app name + features
[ ] Signup matches the same split-screen layout

TECHNICAL
[ ] No commented-out service calls in any page
[ ] Lucide-react icons imported at top of every page
[ ] Toast notifications used (not alert) for ALL mutations
[ ] API calls in dashboard are NOT commented out
```

---

## ═══════════════════════════════════════════════════════
## FINAL REPORT FORMAT
## ═══════════════════════════════════════════════════════

Report back in this exact format after completing all steps:

```
STEP-0  baseline: ___/0 tsc errors
        generateNonStreaming shape: [A or B]
        saveFiles signature: [exact params]
        middleware name: [optionalAuth or optionalPlatformAuth]

STEP-1  ai.prompts.ts replaced: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌

STEP-2  3 methods added to ai.service.ts: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌

STEP-3  generateV2 added to ai.controller.ts: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌

STEP-4  /generate/v2 route added: PASS / FAIL
        API reachable test: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌

STEP-5  Frontend v2 support: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌
        npm run build: PASS / FAIL

STEP-6  ai.validators.ts created: PASS / FAIL
        validateGeneratedFiles imported in controller: PASS / FAIL
        validation_report emitted in generateV2: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌

STEP-6B Domain pack router + confidence fallback: PASS / FAIL
        ai.domainRouter.ts created: PASS / FAIL
        planApplication includes _domainRouting metadata: PASS / FAIL
        low-confidence ideas route to custom mode: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌

STEP-6C Hard verification gate: PASS / FAIL
        ai.verification.ts created: PASS / FAIL
        verification_report emitted in generateV2: PASS / FAIL
        blocking on critical failures: PASS / FAIL
        tsc after: 0 errors ✅ / N errors ❌

STEP-7  Non-regression check:
        Fix 1 GitHub fallback:    YES / NO
        Fix 2 jsonrepair:         YES / NO
        Fix 3 rebalance:          YES / NO
        Fix 4 quality retry:      YES / NO
        Fix 5 services compliance: YES / NO
        Fix 6 light theme:        YES / NO
        Fix 7 chat cooldown:      YES / NO
        Fix 8 preview safety:     YES / NO

STEP-8  V2 smoke test SSE sequence: PASS / FAIL
        UI quality checklist: ___/35 items checked

UI CHECKLIST FAILURES (list any NO items):
  - [item description]

OVERALL STATUS:
  Implementation: COMPLETE / INCOMPLETE
  All 8 preserved fixes intact: YES / NO
  V2 generation working: YES / NO
  UI quality passing: YES / NO (___/35)
  Blocking issues:
    1. [issue if any]
```

---

## ═══════════════════════════════════════════════════════
## SUMMARY TABLE — WHAT THIS DOCUMENT CHANGES
## ═══════════════════════════════════════════════════════

| # | Problem | Fix Applied | Step |
|---|---------|-------------|------|
| 1 | UI looks like admin panel | Sidebar layout pattern in all prompts | STEP-1 |
| 2 | No icons | lucide-react icons in all UI examples | STEP-1 |
| 3 | Plain stat cards | Gradient stat cards with icons | STEP-1 |
| 4 | Commented-out API calls | All examples use real uncommented calls | STEP-1 |
| 5 | alert() instead of toast | useToast pattern enforced in all prompts | STEP-1 |
| 6 | No skeleton loading | Skeleton rows pattern in all list pages | STEP-1 |
| 7 | No empty states | Rich empty state pattern with icon + CTA | STEP-1 |
| 8 | Login = centered card only | Split-screen auth layout | STEP-1 |
| 9 | Single call truncates | Two-phase: plan + per-module + shared | STEP-2/3/4 |
| 10 | Unknown domains get generic modules | AI-inferred domain modules via planner | STEP-1/2 |
| 11 | No generation progress visible | Progress bar + module pills in UI | STEP-5 |
| 12 | No wiring validation | ai.validators.ts checks all routes wired | STEP-6 |
| 13 | No placeholder detection | validators checks TODOs/fakes | STEP-6 |
| 14 | Unknown/mixed ideas can mis-route | Domain router with confidence + custom fallback | STEP-6B |
| 15 | Quality can still pass with broken output | Blocking verification gate + verification_report | STEP-6C |

Files changed:
```
backend/src/modules/ai/ai.prompts.ts       REPLACED (v3.0)
backend/src/modules/ai/ai.service.ts       MODIFIED (3 new methods)
backend/src/modules/ai/ai.controller.ts    MODIFIED (generateV2 + validation call)
backend/src/modules/ai/ai.routes.ts        MODIFIED (new /generate/v2 route)
backend/src/modules/ai/ai.validators.ts    CREATED  (new structural validator)
backend/src/modules/ai/ai.domainRouter.ts  CREATED  (confidence-based domain routing)
backend/src/modules/ai/ai.verification.ts  CREATED  (blocking verification contract)
frontend/pages/builder/ai-generate.tsx     MODIFIED (v2 support + progress UI)
```

Files NOT touched:
```
preview-runner.tsx    — locked, already hardened
previewUtils.ts       — locked, already hardened
useRequirementsFlow   — locked, already working
select-ai.tsx         — locked, already working
platform-auth/*       — locked, already implemented
platform-projects/*   — locked, already implemented
billing/*             — locked, already implemented
deploy/*              — locked, already implemented
```

---

*End of document. Version FINAL. Date: 2026-03-24.*
*This document supersedes AI_GENERATION_PRODUCTION_UPGRADE.md v1.0*
*and its Part 7 compatibility addendum.*
*All corrections from Part 7 are baked into the steps above.*
*All preserved fixes from 7.2 are verified in STEP-7.*
