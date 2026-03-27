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
export function detectExternalServices(userDescription: string, requirements?: RequirementsDocument): { instructions: string; requiredFiles: string[]; envVars: Record<string, string> } {
  return { instructions: "", requiredFiles: [], envVars: {} };
}

export function buildDesignToCodePrompt(designJSON: object, designDescription?: string): string {
  return "";
}
