# IDEA Platform — AI Generation: Production-Grade Apps + World-Class UI
> Agent Execution Document
> Version: 1.0 | Date: 2026-03-24
> This document fixes BOTH generation reliability AND UI quality.
> Replace: backend/src/modules/ai/ai.prompts.ts (entire file)
> Modify:  backend/src/modules/ai/ai.controller.ts (add two-phase generation)
> Modify:  backend/src/modules/ai/ai.service.ts (add planner method)

---

## ═══════════════════════════════════════════════════════
## PART 1 — ROOT CAUSE ANALYSIS
## Read this before executing. It explains every problem.
## ═══════════════════════════════════════════════════════

### Problem 1 — UI Looks Like a Developer Built It (Most Critical)

The current prompt shows these UI patterns:
  - Plain white cards with no visual interest
  - No icons anywhere (lucide-react is available but never used)
  - Basic gray tables — no hover states, no row actions
  - Top navbar only — modern SaaS uses sidebar layout
  - Stat cards are just numbers in a white box — no gradients, no icons
  - Forms have labels and inputs — no field icons, no helper text
  - Errors use browser alert() — no toast notifications
  - Loading is one spinner — no skeleton states
  - Empty states are one line of text — no illustrations, no CTAs
  - Auth pages are the only "designed" pages — dashboard looks like an admin panel

The result: every generated app looks like a 2018 Bootstrap CRUD panel.
The fix: completely replace UI patterns with modern SaaS component examples.

### Problem 2 — Single JSON Call Truncates Complex Apps

A 40-file app needs ~20,000 output tokens.
Most models have 4,096–8,192 max output tokens.
Result: the AI generates auth + 1-2 modules then stops.
The last files in the output are truncated mid-content.
server.ts only registers auth routes because the other modules weren't generated.

The fix: two-phase generation.
  Phase 1 — PLAN (cheap, fast): AI returns just the module list + field names
  Phase 2 — GENERATE (per module): one API call per module, never truncates

### Problem 3 — Commented-Out Service Calls in Examples

The current prompt shows:
  // import { resourceService } from '../src/services/resource.service';
  // resourceService.getStats()  ← COMMENTED OUT

The AI learns from these examples and generates commented-out code too.
Result: dashboard pages that never actually call the API.

The fix: all example code must have real, working, uncommented API calls.

### Problem 4 — No Lucide Icons in UI Examples

The current system prompt never shows a single lucide-react icon usage.
The AI generates icon-free UIs — just text buttons and plain text labels.
Real SaaS apps use icons everywhere: sidebar items, stat cards, buttons, badges.
Lucide-react is already in the preview mock system and works in preview.

The fix: add icon usage to every component example.

### Problem 5 — Top Navbar Instead of Sidebar Layout

The current layout is: sticky top nav + main content area.
Every generated app looks the same — like a blog, not a SaaS dashboard.
Modern SaaS apps (Linear, Notion, Vercel, Stripe dashboard) use:
  - Fixed left sidebar (240px) with nav items
  - Collapsible on mobile
  - User profile at bottom
  - Grouped navigation sections

The fix: replace Navbar pattern with Sidebar layout pattern.

### Problem 6 — No Toast Notifications

Currently: errors use state variables shown in divs. Success uses nothing.
User deletes an item: the row disappears silently. Was it deleted? Did it fail?
User creates a record: they're redirected. Did it work?

Real apps show toast notifications for every mutation.
The fix: add a simple toast system to the component library examples.

### Problem 7 — Unknown App Types Get Generic Modules

Apps outside the 9 known domains get:
  items, categories, activity — with title/description/status fields
This is a todo app with different branding, not a domain-specific app.

The fix: two-phase generation solves this too.
In Phase 1 the AI plans the correct modules FROM the user's description.
Phase 2 generates each planned module fully.

---

## ═══════════════════════════════════════════════════════
## PART 2 — THE COMPLETE SOLUTION
## ═══════════════════════════════════════════════════════

Two changes. Both required. Neither works without the other.

CHANGE A — New ai.prompts.ts (replace entire file)
  - Modern SaaS UI component library with icons
  - Sidebar layout pattern
  - Toast notification pattern
  - Skeleton loading pattern
  - Rich dashboard with gradient stat cards
  - Real API calls (no commented code)
  - Better domain detection

CHANGE B — Two-phase generation in ai.controller.ts + ai.service.ts
  - Phase 1: planner call returns module spec (fast, ~500 tokens output)
  - Phase 2: generator calls per module (focused, never truncates)
  - Completes before merging into final file list

---

## ═══════════════════════════════════════════════════════
## PART 3 — CHANGE A: NEW AI PROMPTS FILE
## Agent: replace backend/src/modules/ai/ai.prompts.ts entirely
## ═══════════════════════════════════════════════════════

**Action:** [REPLACE FILE]
**File:** `backend/src/modules/ai/ai.prompts.ts`

```typescript
// ============================================================
// IDEA Platform — AI Prompt Templates v3.0
// World-class UI. Any app type. Production-grade output.
// ============================================================

import type { RequirementsAnswer, RequirementsDocument } from './ai.types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — PLANNER PROMPT
// Called first. Returns module spec. Never generates code.
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
3. Use real domain vocabulary — not generic names like "items" or "resources".
   - Dating app → profiles, matches, messages, likes
   - Fitness app → workouts, exercises, plans, progress
   - Pet care → pets, appointments, medications, records
   - Legal → cases, clients, documents, hearings
   - Job board → jobs, applications, companies, candidates
   - School → courses, students, enrollments, grades
4. For each module, list the EXACT Mongoose field names needed for this domain.
5. Identify which modules need relationships (userId refs, foreign keys).
6. Describe what the dashboard should show (real metrics for this app type).
7. List all routes the frontend needs.
8. Set the sidebar navigation structure.

Return ONLY this JSON:
{
  "projectName": "lowercase-hyphen-name",
  "appType": "string describing the app category",
  "description": "one sentence describing the app",
  "modules": [
    {
      "name": "moduleName",
      "label": "Display Name",
      "icon": "lucide icon name e.g. Package, Users, Calendar",
      "fields": [
        { "name": "fieldName", "type": "String|Number|Boolean|Date|ObjectId", "required": true, "enum": ["val1","val2"] }
      ],
      "relationships": ["userId", "categoryId"],
      "routes": ["/module-name", "/module-name/new", "/module-name/:id/edit"],
      "apiEndpoints": ["GET /api/module-name", "POST /api/module-name", "PUT /api/module-name/:id", "DELETE /api/module-name/:id"],
      "hasStats": true
    }
  ],
  "dashboard": {
    "statCards": [
      { "label": "Card Label", "metric": "what data it shows", "icon": "TrendingUp", "color": "blue|green|purple|orange|rose" }
    ],
    "tables": ["list of recent items to show in tables"],
    "charts": ["any chart descriptions if needed"]
  },
  "navigation": {
    "sidebarSections": [
      {
        "label": "Section Label",
        "items": [
          { "label": "Nav Item", "href": "/path", "icon": "lucide icon name" }
        ]
      }
    ]
  },
  "colorPalette": {
    "primary": "hex color e.g. #4f46e5",
    "primaryLight": "hex color e.g. #eef2ff",
    "primaryDark": "hex color e.g. #3730a3"
  }
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — MODULE GENERATOR PROMPT
// Called once per module. Generates complete backend + frontend for that module.
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
Generate ONLY the files for the "${module.name}" module of the ${plan.appType} app.

MODULE SPECIFICATION:
Name: ${module.name}
Label: ${module.label}
Icon: ${module.icon}
Fields: ${JSON.stringify(module.fields, null, 2)}
Relationships: ${module.relationships.join(', ')}
Routes: ${module.routes.join(', ')}
API Endpoints: ${module.apiEndpoints.join(', ')}

FULL APP CONTEXT (for correct imports and references):
Project name: ${plan.projectName}
All modules: ${plan.modules.map((m: any) => m.name).join(', ')}
Color palette: primary=${primary}, light=${primaryLight}, dark=${primaryDark}

═══════════════════════════════════════════════
TECH STACK
═══════════════════════════════════════════════

Backend:  Node.js + Express + TypeScript + MongoDB + Mongoose + Zod
Frontend: Next.js 14 Pages Router + React 18 + TypeScript + Tailwind CSS + axios + lucide-react

═══════════════════════════════════════════════
BACKEND PATTERN (generate all 5 files)
═══════════════════════════════════════════════

// backend/src/modules/${module.name}/${module.name}.schema.ts
import { z } from 'zod';
// Zod schema using the exact fields from the module spec above
// createSchema validates all required fields
// updateSchema makes all fields optional (partial)

// backend/src/modules/${module.name}/${module.name}.model.ts
import mongoose from 'mongoose';
// Mongoose schema with ALL fields from spec
// Use correct types: String, Number, Boolean, Date, mongoose.Schema.Types.ObjectId
// Add index on userId for performance
// Add timestamps: true

// backend/src/modules/${module.name}/${module.name}.service.ts
// Class with: getAll(userId, query), getById(id, userId), create(input, userId),
//             update(id, input, userId), remove(id, userId), getStats(userId)
// getAll supports: search by name/title, filter by status/category
// getStats returns: total, counts by status/category, this week count

// backend/src/modules/${module.name}/${module.name}.controller.ts
// Class with: getAll, getById, create, update, remove, stats handlers
// All import AuthRequest from ../../middleware/auth
// All use try/catch with proper status codes
// Response format: { success: boolean, data: T | null, error: string | null }

// backend/src/modules/${module.name}/${module.name}.routes.ts
import { Router } from 'express';
// router.use(authMiddleware) — protect ALL routes
// GET /stats BEFORE GET / to avoid :id matching
// Standard REST: GET /, GET /:id, POST /, PUT /:id, DELETE /:id
// Export as ${module.name}Routes

═══════════════════════════════════════════════
FRONTEND PATTERN (generate service + 3 pages)
═══════════════════════════════════════════════

// frontend/src/services/${module.name}.service.ts
// Use API instance with token interceptor
// Methods: getAll(params?), getById(id), create(data), update(id, data), remove(id), getStats()
// ALL methods uncommented and working — NO commented-out code

// CRITICAL UI RULES FOR ALL PAGES:
// 1. Import lucide-react icons at the top of every page
// 2. Use the sidebar layout (import Sidebar from components/Sidebar)
// 3. Use toast notifications — import { useToast } from hooks/useToast
// 4. Skeleton loading states while data loads
// 5. Rich empty states with icon + description + CTA button
// 6. Every mutation shows success/error toast
// 7. No browser alert() — ever

// frontend/pages/${module.name}/index.tsx — LIST PAGE
// Uses Sidebar layout (not Navbar)
// Page header: title + icon + "New ${module.label}" button
// Search input with magnifying glass icon
// Filter dropdown for status/category if applicable
// Table with:
//   - Column headers with sort icons
//   - Status badges (colored, not gray)
//   - Action buttons (Edit icon button, Delete icon button)
//   - Row hover state
// Skeleton loading (5 skeleton rows)
// Rich empty state: large icon + "No ${module.label} yet" + CTA

// frontend/pages/${module.name}/new.tsx — CREATE FORM PAGE
// Breadcrumb: Home / ${module.label} / New
// Form with ALL fields from module spec
// Each input has: label, placeholder, helper text, error message
// Field icons where appropriate
// Save button shows spinner while submitting
// Cancel navigates back
// On success: toast "Created successfully" + redirect to list

// frontend/pages/${module.name}/[id]/edit.tsx — EDIT FORM PAGE
// Same as create but pre-fills data fetched by ID
// Shows skeleton while loading existing data
// Shows "Not found" error if ID doesn't exist
// On success: toast "Updated successfully" + redirect to list

═══════════════════════════════════════════════
UI COMPONENT PATTERNS TO USE
═══════════════════════════════════════════════

Use EXACTLY these patterns in every page you generate:

──── Status Badge Pattern ────
const statusConfig = {
  active:    { label: 'Active',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  inactive:  { label: 'Inactive',  bg: 'bg-gray-100',  text: 'text-gray-600',   dot: 'bg-gray-400'   },
  pending:   { label: 'Pending',   bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  completed: { label: 'Completed', bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  draft:     { label: 'Draft',     bg: 'bg-slate-100', text: 'text-slate-600',  dot: 'bg-slate-400'  },
  published: { label: 'Published', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  // add domain-specific statuses as needed
};
// Usage:
<span className={\`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium \${s.bg} \${s.text}\`}>
  <span className={\`w-1.5 h-1.5 rounded-full \${s.dot}\`}/>
  {s.label}
</span>

──── Skeleton Row Pattern ────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1,2,3,4].map(i => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-100 rounded w-3/4"/>
      </td>
    ))}
  </tr>
);
// Show 5 SkeletonRow when dataLoading is true

──── Empty State Pattern ────
import { PackageOpen } from 'lucide-react';
{items.length === 0 && !dataLoading && (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
      <PackageOpen className="w-8 h-8 text-gray-400"/>
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-1">No ${module.label} yet</h3>
    <p className="text-sm text-gray-500 mb-5 max-w-xs">Create your first ${module.label.toLowerCase()} to get started.</p>
    <button onClick={() => router.push('/${module.name}/new')}
      className="flex items-center gap-2 px-4 py-2 bg-[${primary}] text-white text-sm font-semibold rounded-lg hover:opacity-90">
      <Plus className="w-4 h-4"/> New ${module.label}
    </button>
  </div>
)}

──── Icon Button Pattern ────
import { Pencil, Trash2 } from 'lucide-react';
// Edit button:
<button onClick={() => router.push(\`/${module.name}/\${item._id}/edit\`)}
  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
  <Pencil className="w-4 h-4"/>
</button>
// Delete button:
<button onClick={() => handleDelete(item._id)} disabled={deleting === item._id}
  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
  <Trash2 className="w-4 h-4"/>
</button>

──── Toast Usage Pattern ────
import { useToast } from '../../src/hooks/useToast';
const { toast } = useToast();
// Success:
toast({ message: '${module.label} created successfully', type: 'success' });
// Error:
toast({ message: err?.response?.data?.error || 'Something went wrong', type: 'error' });

═══════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════

Return ONLY this JSON. No markdown. Start with { end with }.

{
  "module": "${module.name}",
  "files": [
    {
      "path": "backend/src/modules/${module.name}/${module.name}.schema.ts",
      "content": "complete file content",
      "language": "typescript"
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — SHARED FILES PROMPT
// Generates server.ts, _app.tsx, Sidebar, useToast, globals.css, configs
// Called once after all module generations are complete.
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

  const navItems = plan.navigation?.sidebarSections?.[0]?.items || [];

  return `You are an expert full-stack developer.
Generate the SHARED infrastructure files for the "${plan.projectName}" application.
These files wire everything together and define the visual system.

APP CONTEXT:
Project: ${plan.projectName}
Modules: ${plan.modules.map((m: any) => m.name).join(', ')}
Primary color: ${primary}
Light color: ${primaryLight}
Dark color: ${primaryDark}
Sidebar navigation: ${JSON.stringify(plan.navigation?.sidebarSections || [])}

${designDNA}

═══════════════════════════════════════════════
FILES TO GENERATE
═══════════════════════════════════════════════

Generate ALL of these files completely:

1. backend/src/server.ts
2. backend/src/middleware/auth.ts
3. backend/package.json
4. backend/tsconfig.json
5. backend/.env.example
6. frontend/pages/_app.tsx
7. frontend/pages/index.tsx
8. frontend/pages/login.tsx
9. frontend/pages/signup.tsx
10. frontend/pages/dashboard.tsx
11. frontend/src/contexts/AuthContext.tsx
12. frontend/src/components/Sidebar.tsx
13. frontend/src/components/PageHeader.tsx
14. frontend/src/hooks/useToast.tsx
15. frontend/src/services/auth.service.ts
16. frontend/styles/globals.css
17. frontend/package.json
18. frontend/next.config.js
19. frontend/tailwind.config.js
20. frontend/postcss.config.js
21. frontend/.env.example

═══════════════════════════════════════════════
EXACT PATTERNS FOR KEY FILES
═══════════════════════════════════════════════

──── server.ts (register ALL module routes) ────
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.get('/health', (_, res) => res.json({ status: 'ok' }));
async function startServer() {
  await mongoose.connect(process.env.DATABASE_URL!);
  const { authRoutes } = await import('./modules/auth/auth.routes');
  app.use('/api/auth', authRoutes);
${moduleImports}
  const { authRoutes: _a } = { authRoutes };
${routeRegistrations}
  app.listen(process.env.PORT || 5000, () => console.log('Server running'));
}
startServer();

──── Sidebar.tsx (CRITICAL — defines the app layout) ────
// This is the most important visual component.
// It defines whether the app looks like a real SaaS or an admin panel.
// Use the sidebar navigation from the plan: ${JSON.stringify(navItems.slice(0, 3))}

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
// Import ALL icons referenced in the navigation plan

export default function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Navigation sections from the plan
  const sections = ${JSON.stringify(plan.navigation?.sidebarSections || [], null, 2)};

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
          style={{ background: '${primary}' }}>
          <span className="text-white text-sm font-bold">{plan.projectName[0].toUpperCase()}</span>
        </div>
        <span className="font-bold text-gray-900 text-sm">${plan.projectName}</span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
        {sections.map((section: any) => (
          <div key={section.label}>
            {section.label && (
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item: any) => {
                const isActive = router.pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href}
                      className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors \${
                        isActive
                          ? 'font-semibold text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }\`}
                      style={isActive ? { background: '${primary}' } : {}}>
                      {/* Render the correct icon for item.icon */}
                      <span className="w-4 h-4"/>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile at bottom */}
      {user && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: '${primary}' }}>
              {user.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button onClick={() => { logout(); }}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
              <LogOut className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-40">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)}/>
          <div className="absolute left-0 top-0 h-full w-64">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Mobile header bar */}
      <div className="lg:hidden h-16 flex items-center justify-between px-4 bg-white border-b border-gray-200 sticky top-0 z-30">
        <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-600">
          <Menu className="w-5 h-5"/>
        </button>
        <span className="font-bold text-gray-900">${plan.projectName}</span>
        <div className="w-9"/>
      </div>
    </>
  );
}

──── useToast.tsx ────
import { useState, useCallback } from 'react';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

let toastFn: ((t: Omit<Toast, 'id'>) => void) | null = null;

export function useToast() {
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    if (toastFn) toastFn(t);
  }, []);
  return { toast };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  toastFn = (t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={\`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-5 \${
            t.type === 'success' ? 'bg-white border-green-200 text-green-800' :
            t.type === 'error'   ? 'bg-white border-red-200 text-red-800' :
            'bg-white border-blue-200 text-blue-800'
          }\`}>
            <div className={\`w-2 h-2 rounded-full \${
              t.type === 'success' ? 'bg-green-500' :
              t.type === 'error'   ? 'bg-red-500' : 'bg-blue-500'
            }\`}/>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}

──── PageHeader.tsx ────
import { ReactNode } from 'react';
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}
export default function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

──── Dashboard page pattern (use real module data) ────
// The dashboard must import and call ALL module stats services
// Stat cards must use gradients and icons from the plan
// Recent activity table must show real data

// Stat card pattern:
const StatCard = ({ label, value, icon: Icon, color, trend }: any) => {
  const colors = {
    blue:   { bg: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-700' },
    green:  { bg: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700' },
    purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700' },
    rose:   { bg: 'bg-rose-500',   light: 'bg-rose-50',   text: 'text-rose-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={\`w-10 h-10 \${c.light} rounded-xl flex items-center justify-center\`}>
          <Icon className={\`w-5 h-5 \${c.text}\`}/>
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
};

──── Login page pattern (premium visual design) ────
// Split screen layout: left = form, right = decorative panel
// Left side: clean form with logo at top
// Right side: gradient background with app description and feature bullets
// Matching the app's color palette from the plan

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
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }

/* Sidebar layout helper */
.sidebar-layout { padding-left: 0; }
@media (min-width: 1024px) { .sidebar-layout { padding-left: var(--sidebar-width); } }

/* Animation utilities */
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
        primary: {
          DEFAULT: '${primary}',
          light: '${primaryLight}',
          dark: '${primaryDark}',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

══════════════════════════════════
OUTPUT FORMAT
══════════════════════════════════

Return ONLY this JSON. No markdown. Start with { end with }.

{
  "shared": true,
  "files": [
    {
      "path": "backend/src/server.ts",
      "content": "complete file content",
      "language": "typescript"
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — DESIGN DNA (unchanged from v2)
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_DNA_PRESETS = {
  layoutArchetypes: [
    'editorial split-screen login with full-height decorative panel',
    'minimal centered auth with floating card on gradient background',
    'bold asymmetric split with oversized typography on left panel',
    'clean top-aligned form with logo and social proof below',
    'glassmorphism card on animated gradient background',
    'two-column with app screenshots on right side panel',
    'full-bleed hero image behind frosted glass auth card'
  ],
  palettes: [
    { name: 'vibrant-indigo', primary: '#4f46e5', light: '#eef2ff', dark: '#4338ca' },
    { name: 'bold-blue',      primary: '#2563eb', light: '#eff6ff', dark: '#1d4ed8' },
    { name: 'emerald-pro',    primary: '#059669', light: '#ecfdf5', dark: '#047857' },
    { name: 'ruby-modern',    primary: '#e11d48', light: '#fff1f2', dark: '#be123c' },
    { name: 'teal-tech',      primary: '#0d9488', light: '#f0fdfa', dark: '#0f766e' },
    { name: 'purple-premium', primary: '#7c3aed', light: '#f5f3ff', dark: '#6d28d9' },
    { name: 'slate-pro',      primary: '#334155', light: '#f1f5f9', dark: '#1e293b' },
    { name: 'violet-vibrant', primary: '#6d28d9', light: '#f5f3ff', dark: '#5b21b6' },
    { name: 'cyan-modern',    primary: '#0891b2', light: '#ecfeff', dark: '#0e7490' },
    { name: 'green-fresh',    primary: '#16a34a', light: '#f0fdf4', dark: '#15803d' }
  ],
} as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function pickBySeed<T>(arr: readonly T[], seed: string, offset: number): T {
  return arr[(hashSeed(\`\${seed}:\${offset}\`) + offset) % arr.length];
}

export function getColorPaletteFromSeed(seed: string) {
  const palette = pickBySeed(STYLE_DNA_PRESETS.palettes, seed, 1);
  return { primary: palette.primary, primaryLight: palette.light, primaryDark: palette.dark };
}

function buildDesignDNA(seed: string): string {
  const layout  = pickBySeed(STYLE_DNA_PRESETS.layoutArchetypes, seed, 2);
  const palette = pickBySeed(STYLE_DNA_PRESETS.palettes, seed, 1);
  return [
    \`DESIGN DNA [seed: \${seed}]\`,
    \`  Auth layout: \${layout}\`,
    \`  Color system: primary=\${palette.primary} light=\${palette.light} dark=\${palette.dark}\`,
    \`  Use Inter font family throughout\`,
    \`  Border radius: 0.75rem (rounded-xl) for cards, 0.5rem (rounded-lg) for inputs\`,
    \`  Shadow: shadow-sm for cards, shadow-lg for modals/dropdowns\`,
    \`  Typography: font-bold for headings, font-medium for labels, font-normal for body\`,
    \`  Apply color system as CSS variables in globals.css\`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — LEGACY SINGLE-SHOT PROMPT (kept for fallback)
// Used when the two-phase approach is not available.
// ─────────────────────────────────────────────────────────────────────────────

export function buildFullstackPrompt(
  userDescription: string,
  selectedModules: string[],
  variationSeed: string,
  requirements?: RequirementsDocument
): string {
  const palette = getColorPaletteFromSeed(variationSeed);
  const designDNA = buildDesignDNA(variationSeed);
  const domainGuide = detectDomainModules(userDescription, requirements, palette);

  const requirementsBlock = requirements ? \`
╔══════════════════════════════════════════════╗
║  PROJECT REQUIREMENTS — HIGHEST PRIORITY     ║
╚══════════════════════════════════════════════╝
App type:     \${requirements.appType}
Users:        \${requirements.targetUsers}
Scale:        \${requirements.scale}
Theme:        \${requirements.themeMode}
Design:       \${requirements.designPreference}
Features:
\${requirements.coreFeatures.map((f, i) => \`  \${i + 1}. \${f}\`).join('\n')}
User words:
\${requirements.answers.map(a => \`  • "\${a.answer}"\`).join('\n')}
\` : '';

  return \`\${requirementsBlock}\${SYSTEM_PROMPT_FULLSTACK}

USER REQUEST: "\${userDescription}"
MODULES: \${selectedModules.join(', ') || 'auth'}

\${domainGuide}

\${designDNA}

COMPLETENESS CHECK BEFORE OUTPUT:
✓ server.ts registers routes for EVERY module
✓ Sidebar.tsx has links to EVERY module page
✓ dashboard.tsx calls real API and shows live stats
✓ Every module: 5 backend files + list page + create page + edit page + service
✓ _app.tsx wraps with AuthProvider AND ToastProvider
✓ Every mutation uses toast() not alert()
✓ Every list page has skeleton loading rows
✓ Every list page has rich empty state with icon and CTA
✓ Icons imported from lucide-react on every page
✓ Sidebar layout used on every app page (not top navbar)
✓ globals.css defines CSS variables for color system
✓ tailwind.config.js extends theme with primary color
✓ Total file count minimum 30

CRITICAL: Return ONLY raw JSON. No markdown. Start \{ end \}.
\`;
}

const SYSTEM_PROMPT_FULLSTACK = \`You are an expert full-stack developer generating complete, production-ready web applications.

You generate ENTIRE applications with world-class UI. Every page must look like a real shipped SaaS product.

═══════════════════════════════════════════════════════════════════
ABSOLUTE RULES
═══════════════════════════════════════════════════════════════════

1. NEVER generate auth-only apps.
2. ALWAYS use Sidebar layout — not top navbar — for all dashboard pages.
3. ALWAYS import and use lucide-react icons throughout every page.
4. ALWAYS use toast notifications for mutations — never browser alert().
5. ALWAYS include skeleton loading states in list pages.
6. ALWAYS include rich empty states with icon + description + CTA.
7. ALWAYS generate real working API calls — no commented-out code.
8. EVERY list page has: search, filter, table with action icon buttons.
9. EVERY form page has: breadcrumb, labeled fields, validation, save + cancel.
10. Return ONLY raw JSON. No markdown fences. Start with { and end with }.

═══════════════════════════════════════════════════════════════════
TECH STACK
═══════════════════════════════════════════════════════════════════

Backend:  Node.js + Express + TypeScript + MongoDB + Mongoose + Zod + bcrypt + jsonwebtoken
Frontend: Next.js 14 Pages Router + React 18 + TypeScript + Tailwind CSS + axios + lucide-react

═══════════════════════════════════════════════════════════════════
BACKEND ARCHITECTURE (same as before — proven patterns)
═══════════════════════════════════════════════════════════════════

Every module: routes.ts → controller.ts → service.ts → model.ts → schema.ts
API response: { success: boolean, data: T | null, error: string | null }
Auth middleware: import { authMiddleware, AuthRequest } from '../../middleware/auth'
ALL routes protected with authMiddleware
getStats() on every service returns counts by status/category + thisWeek

═══════════════════════════════════════════════════════════════════
FRONTEND ARCHITECTURE — WORLD-CLASS UI
═══════════════════════════════════════════════════════════════════

──── LAYOUT: Always use Sidebar, never top navbar ────

Every app page (dashboard, list pages, form pages) uses this layout:
<div className="sidebar-layout">
  <Sidebar />
  <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
    {/* page content */}
  </main>
</div>

──── ICONS: Use lucide-react everywhere ────

import {
  LayoutDashboard, Users, Settings, LogOut, Plus, Search,
  Pencil, Trash2, Eye, Download, Upload, Filter, ChevronRight,
  TrendingUp, TrendingDown, Package, Calendar, Clock, Star,
  CheckCircle, XCircle, AlertCircle, Info, Bell, Menu, X,
  // import any domain-specific icons needed
} from 'lucide-react';

──── STAT CARDS with gradients and icons ────

// Use THIS pattern for every dashboard stat card:
const StatCard = ({ label, value, icon: Icon, color, change }: any) => {
  const cfg: Record<string, {gradient: string, iconBg: string, iconColor: string}> = {
    blue:   { gradient: 'from-blue-500 to-blue-600',   iconBg: 'bg-blue-400/30',   iconColor: 'text-white' },
    green:  { gradient: 'from-green-500 to-green-600', iconBg: 'bg-green-400/30',  iconColor: 'text-white' },
    purple: { gradient: 'from-purple-500 to-purple-600', iconBg: 'bg-purple-400/30', iconColor: 'text-white' },
    orange: { gradient: 'from-orange-500 to-orange-600', iconBg: 'bg-orange-400/30', iconColor: 'text-white' },
    rose:   { gradient: 'from-rose-500 to-rose-600',   iconBg: 'bg-rose-400/30',   iconColor: 'text-white' },
  };
  const c = cfg[color] || cfg.blue;
  return (
    <div className={\`bg-gradient-to-br \${c.gradient} rounded-2xl p-6 text-white\`}>
      <div className="flex items-center justify-between mb-4">
        <div className={\`w-10 h-10 \${c.iconBg} rounded-xl flex items-center justify-center\`}>
          <Icon className="w-5 h-5 text-white"/>
        </div>
        {change && (
          <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">{change}</span>
        )}
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-white/80 mt-1">{label}</p>
    </div>
  );
};

──── AUTH PAGES: Split-screen premium layout ────

// Login page uses split-screen:
// Left 50%: form with logo, heading, fields, button, signup link
// Right 50%: gradient background with app name, tagline, feature list
// Never use a centered card on a plain background

const LoginPage = () => (
  <div className="min-h-screen flex">
    {/* Left — form */}
    <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white">
      <div className="max-w-sm w-full mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--primary)' }}>
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-bold text-gray-900">AppName</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-gray-500 text-sm mb-8">Sign in to continue</p>
        {/* form fields */}
      </div>
    </div>
    {/* Right — decorative */}
    <div className="hidden lg:flex flex-1 flex-col justify-center px-16 text-white"
      style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
      <h2 className="text-4xl font-bold mb-4 leading-tight">Build something<br/>amazing today</h2>
      <p className="text-white/80 mb-8">Join thousands of teams using AppName to manage their work.</p>
      <ul className="space-y-3">
        {['Fast and reliable', 'Beautiful interface', 'Real-time updates'].map(f => (
          <li key={f} className="flex items-center gap-3 text-white/90">
            <CheckCircle className="w-5 h-5 text-white/60 flex-shrink-0"/>
            {f}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

──── LIST PAGES: Rich data tables ────

// Every list page follows this pattern:
const ListPage = () => (
  <div className="sidebar-layout">
    <Sidebar />
    <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-indigo-600"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Items</h1>
            <p className="text-sm text-gray-500">{items.length} total</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'var(--primary)' }}
          onClick={() => router.push('/items/new')}>
          <Plus className="w-4 h-4"/> New Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full h-10 pl-9 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 text-gray-700">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* Skeleton loading */}
            {dataLoading && [1,2,3,4,5].map(i => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"/></td>
                <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded-full w-16"/></td>
                <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"/></td>
                <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-20 ml-auto"/></td>
              </tr>
            ))}
            {/* Data rows */}
            {!dataLoading && items.map(item => (
              <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 text-sm">{item.name || item.title}</div>
                  {item.description && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={\`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium \${getStatusStyle(item.status)}\`}>
                    <span className={\`w-1.5 h-1.5 rounded-full \${getStatusDot(item.status)}\`}/>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => router.push(\`/items/\${item._id}/edit\`)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDelete(item._id)} disabled={deleting === item._id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Empty state */}
        {!dataLoading && items.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-300"/>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No items yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">Create your first item to get started.</p>
            <button onClick={() => router.push('/items/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl"
              style={{ background: 'var(--primary)' }}>
              <Plus className="w-4 h-4"/> Create first item
            </button>
          </div>
        )}
      </div>
    </main>
  </div>
);

──── FORM PAGES: Polished input design ────

// Every form input follows this pattern — field icon + label + input + helper
const FormField = ({ label, icon: Icon, error, children }: any) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}
    </label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>}
      {children}
    </div>
    {error && (
      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3"/> {error}
      </p>
    )}
  </div>
);
// Input with icon:
<input className={\`w-full h-11 \${Icon ? 'pl-9' : 'pl-4'} pr-4 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all\`}/>

OUTPUT FORMAT (same as before):
{
  "projectName": string,
  "description": string,
  "files": [{ "path": string, "content": string, "language": string }],
  "envVars": { "backend": {}, "frontend": {} },
  "dependencies": { "backend": {}, "frontend": {} },
  "setupInstructions": []
}\`;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — DOMAIN MODULE DETECTOR (v2 unchanged — already handles any domain)
// ─────────────────────────────────────────────────────────────────────────────

function detectDomainModules(
  userDescription: string,
  requirements?: RequirementsDocument,
  palette?: { primary: string; primaryLight: string; primaryDark: string }
): string {
  const text = [
    userDescription,
    requirements?.appType || '',
    requirements?.coreFeatures?.join(' ') || '',
    requirements?.originalPrompt || ''
  ].join(' ').toLowerCase();

  const moduleGuides: Record<string, string> = {
    ecommerce: \`
MODULES: products (name,price,stock,category,images[],sku,available), categories (name,slug,color),
orders (userId,items[{productId,qty,price}],status,total,address), cart (userId,items[{productId,qty}])
Dashboard: revenue today (green), pending orders (orange), products count (blue), low stock alerts table
Sidebar: Dashboard, Products, Orders, Categories, Settings\`,

    blog: \`
MODULES: posts (title,slug,content,excerpt,status,categoryId,tags[],publishedAt),
categories (name,slug,color), comments (content,postId,authorId,status)
Dashboard: published vs draft count, pending comments, page views, recent posts table
Sidebar: Dashboard, Posts, Categories, Comments, Settings\`,

    task: \`
MODULES: projects (name,description,status,deadline,color,ownerId),
tasks (title,description,status,priority,assigneeId,dueDate,projectId,tags[]),
comments (content,taskId,authorId)
Dashboard: tasks due today (rose), overdue count (red), by status breakdown, project progress bars
Sidebar: Dashboard, Projects, My Tasks, All Tasks, Settings\`,

    booking: \`
MODULES: services (name,description,duration,price,category,available),
bookings (serviceId,userId,customerName,customerEmail,date,startTime,status,totalPrice),
availability (dayOfWeek,startTime,endTime,slotDuration,isOff)
Dashboard: today schedule timeline, this week revenue, booking status pie, upcoming bookings
Sidebar: Dashboard, Bookings, Services, Availability, Settings\`,

    inventory: \`
MODULES: products (name,sku,quantity,minStockLevel,supplierId,costPrice,sellingPrice,unit),
suppliers (name,contactPerson,email,phone,address),
movements (productId,type,quantity,reason,date)
Dashboard: low stock alerts (red), total value (green), recent movements table, supplier count
Sidebar: Dashboard, Products, Movements, Suppliers, Settings\`,

    finance: \`
MODULES: accounts (name,type,balance,currency,color),
categories (name,type,color), transactions (amount,type,categoryId,accountId,date,description),
budgets (categoryId,amount,period,startDate)
Dashboard: net balance (big), income vs expense this month, recent transactions, budget rings
Sidebar: Dashboard, Transactions, Accounts, Budgets, Categories\`,

    restaurant: \`
MODULES: menu (name,categoryId,price,description,available,preparationTime),
orders (tableNumber,items[{menuItemId,qty,price}],status,total),
tables (number,capacity,status), categories (name,displayOrder)
Dashboard: live orders by status kanban, revenue today, popular items, table occupancy grid
Sidebar: Dashboard, Orders, Menu, Tables, Categories\`,

    saas: \`
MODULES: workspaces (name,slug,plan,ownerId), members (workspaceId,userId,role,joinedAt),
invites (workspaceId,email,role,token,status), activity (workspaceId,userId,action,detail)
Dashboard: workspace count, member count, plan distribution, activity feed
Sidebar: Dashboard, Workspaces, Members, Invites, Activity\`,

    social: \`
MODULES: posts (content,authorId,images[],tags[],likesCount,commentsCount),
follows (followerId,followingId), likes (postId,userId),
notifications (userId,type,actorId,resourceId,read)
Dashboard: feed (recent posts), notification count, follower stats, trending tags
Sidebar: Dashboard, Feed, My Posts, Notifications, Profile\`,
  };

  const checks: Record<string, string[]> = {
    ecommerce:  ['product','shop','store','cart','checkout','order','ecommerce','sell','buy','marketplace'],
    blog:       ['blog','post','article','cms','content','publish','write','editorial','news'],
    task:       ['task','project','todo','kanban','sprint','agile','manage','track','productivity'],
    booking:    ['book','appointment','schedule','reservation','slot','calendar','clinic','session'],
    inventory:  ['inventory','stock','warehouse','supply','sku','supplier','movement','asset'],
    finance:    ['finance','expense','budget','transaction','account','money','income','invoice'],
    restaurant: ['restaurant','food','menu','table','kitchen','meal','dining','cafe'],
    saas:       ['saas','workspace','team','organization','member','plan','subscription','tenant'],
    social:     ['social','feed','follow','like','community','network','friend'],
  };

  for (const [type, keywords] of Object.entries(checks)) {
    if (keywords.some(kw => text.includes(kw))) return moduleGuides[type] || '';
  }

  // AI-inferred fallback for any other domain
  return \`
CUSTOM DOMAIN — derive modules from: "\${text.slice(0, 400)}"

Rules:
1. Identify 2-4 main resources (nouns) the app manages.
2. Use REAL domain field names — not title/description/status generics.
3. Each module needs: name, fields with actual domain vocabulary, relationships.
4. Dashboard shows metrics meaningful to THIS specific app.
5. Sidebar shows relevant navigation labels for this domain.

Examples of correct domain-specific field names:
- Workout app: exercises[], duration, difficulty, caloriesBurn, muscleGroups[]
- Pet care: species, breed, dateOfBirth, vaccinations[], vetId, owner
- Legal case: caseNumber, court, filingDate, hearingDate, clientId, status
- Job board: title, company, salary, location, skills[], type, deadline
DO NOT use "title/description/status" for every field — use domain vocabulary.\`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — REFINE PROMPT (v2 unchanged — already good)
// ─────────────────────────────────────────────────────────────────────────────

export function buildRefinePrompt(
  previousFiles: Array<{ path: string; content: string }>,
  refinementRequest: string,
  projectName?: string
): string {
  const fileContext = previousFiles.slice(0, 30).map(f => {
    const c = f.content.length > 2000 ? f.content.slice(0, 2000) + '\n// [truncated]' : f.content;
    return \`\n// ══ \${f.path} ══\n\${c}\`;
  }).join('\n');

  return \`You are an expert full-stack developer refining an existing application.

PROJECT: \${projectName || 'my-app'}
FILES: \${previousFiles.length} total
ALL FILE PATHS:
\${previousFiles.map(f => \`  - \${f.path}\`).join('\n')}

KEY FILES:
\${fileContext}

REFINEMENT: "\${refinementRequest}"

Rules:
1. Apply ONLY the requested change.
2. New module = 5 backend files + 3 frontend pages + 1 service.
3. New routes → update server.ts.
4. New pages → update Sidebar.tsx nav items.
5. Return ONLY changed/new files.
6. Return ONLY raw JSON. No markdown. Start \{ end \}.\`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — REQUIREMENTS PROMPTS (v2 unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export function buildRequirementsQuestionsPrompt(
  userIdea: string,
  selectedModules: string[]
): string {
  return \`You are a senior product engineer interviewing a user before building their app.

Idea: "\${userIdea}"
Modules: \${selectedModules.join(', ') || 'auth'}

Generate 3-5 targeted, specific questions. Not generic.

Rules:
1. Return ONLY valid JSON. No markdown.
2. projectName: lowercase-hyphen, max 30 chars, no conversational phrases.
3. appType: one of: e-commerce|blog|dashboard|social|saas|portfolio|auth|analytics|booking|marketplace|other
4. Questions must be conversational, specific to THIS app.
5. hint: short example answer for the input placeholder.
6. MUST generate 3-5 questions. Never fewer than 3.
7. At least 3 required: true.

Return ONLY:
{
  "appType": "string",
  "projectName": "string",
  "questions": [
    { "id": "q1", "question": "string", "hint": "string", "category": "users|features|design|technical|scope", "required": true }
  ]
}\`;
}

export function buildRequirementsCompilePrompt(
  originalPrompt: string,
  projectName: string,
  answers: RequirementsAnswer[],
  selectedModules: string[]
): string {
  const answersText = answers.map(a => \`Q: \${a.question}\nA: \${a.answer}\`).join('\n\n');
  return \`You are a senior architect compiling a requirements document.

Idea: "\${originalPrompt}"
Project: \${projectName}
Modules: \${selectedModules.join(', ')}

Answers:
\${answersText}

Rules:
1. Return ONLY valid JSON. No markdown.
2. coreFeatures: specific actionable strings, max 8. e.g. "Stripe checkout" not "payments".
3. themeMode: light|dark|hybrid|any
4. scale: personal|startup|enterprise
5. compiledSummary: 2-4 sentences, starts with "You're building".
6. Never leave any field empty.

Return ONLY:
{
  "originalPrompt": "string", "projectName": "string", "appType": "string",
  "targetUsers": "string", "coreFeatures": ["string"],
  "designPreference": "string", "themeMode": "light|dark|hybrid|any",
  "scale": "personal|startup|enterprise", "techPreferences": "string",
  "additionalNotes": "string", "answers": \${JSON.stringify(answers)},
  "compiledSummary": "You're building..."
}\`;
}
```

---

## ═══════════════════════════════════════════════════════
## PART 4 — CHANGE B: TWO-PHASE GENERATION PIPELINE
## Agent: modify ai.service.ts and ai.controller.ts
## ═══════════════════════════════════════════════════════

### STEP B1 — Add planner method to ai.service.ts

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.service.ts`

**Action:** [FIND+INSERT after the last existing method in AiService class]

```typescript
// ── Two-phase generation: Phase 1 — Planner ───────────────────────────────
async planApplication(
  userDescription: string,
  requirements: any,
  provider: string,
  model: string,
  apiKey?: string
): Promise<any> {
  const { buildPlannerPrompt, getColorPaletteFromSeed } = await import('./ai.prompts');
  const prompt = buildPlannerPrompt(userDescription, requirements);
  const seed = Math.random().toString(36).slice(2);

  // Use non-streaming for planner (fast, small output)
  const raw = await this.generateNonStreaming({
    provider,
    model,
    apiKey,
    systemPrompt: 'You are a software architect. Return only valid JSON.',
    userPrompt: prompt,
    maxTokens: 2000,
  });

  let plan: any;
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    plan = JSON.parse(cleaned);
  } catch {
    // Repair attempt
    const repaired = await this.generateNonStreaming({
      provider, model, apiKey,
      systemPrompt: 'Fix this JSON. Return only valid JSON, nothing else.',
      userPrompt: raw,
      maxTokens: 2000,
    });
    plan = JSON.parse(repaired.replace(/```json|```/g, '').trim());
  }

  // Inject color palette from design DNA seed
  plan.colorPalette = getColorPaletteFromSeed(seed);
  plan._seed = seed;
  return plan;
}

// ── Two-phase generation: Phase 2 — Module Generator ────────────────────
async generateModuleFiles(
  module: any,
  plan: any,
  provider: string,
  model: string,
  apiKey?: string
): Promise<Array<{ path: string; content: string; language: string }>> {
  const { buildModulePrompt } = await import('./ai.prompts');
  const prompt = buildModulePrompt(module, plan, plan._seed || 'default');

  const raw = await this.generateNonStreaming({
    provider, model, apiKey,
    systemPrompt: 'You are an expert full-stack developer. Return only valid JSON.',
    userPrompt: prompt,
    maxTokens: 8192,
  });

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.files || [];
  } catch {
    console.warn(`[ai.service] Module ${module.name} parse failed — skipping`);
    return [];
  }
}

// ── Two-phase generation: Phase 3 — Shared Files ────────────────────────
async generateSharedFiles(
  plan: any,
  provider: string,
  model: string,
  apiKey?: string
): Promise<Array<{ path: string; content: string; language: string }>> {
  const { buildSharedFilesPrompt } = await import('./ai.prompts');
  const prompt = buildSharedFilesPrompt(plan, plan._seed || 'default');

  const raw = await this.generateNonStreaming({
    provider, model, apiKey,
    systemPrompt: 'You are an expert full-stack developer. Return only valid JSON.',
    userPrompt: prompt,
    maxTokens: 16384,
  });

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.files || [];
  } catch {
    console.warn('[ai.service] Shared files parse failed');
    return [];
  }
}
```

---

### STEP B2 — Add two-phase generate handler to ai.controller.ts

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.controller.ts`

**Action:** [FIND+INSERT after the existing generate handler]

```typescript
// ── Two-phase generation handler ──────────────────────────────────────────
generateV2 = async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type: string, data: object) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    const {
      userPrompt, provider = 'gemini', model, apiKey,
      selectedModules = ['auth'], projectName,
    } = req.body;

    // Pull requirements from body or localStorage key
    const requirements = req.body.requirements || null;

    // ── Phase 1: Plan ────────────────────────────────────────────────────
    sendEvent('phase', { phase: 'planning', message: 'Analysing your idea and planning modules…' });

    const plan = await this.aiService.planApplication(
      userPrompt, requirements, provider, model, apiKey
    );

    sendEvent('plan', {
      projectName: plan.projectName,
      modules: plan.modules.map((m: any) => m.name),
      moduleCount: plan.modules.length,
    });

    // ── Phase 2: Generate each module ───────────────────────────────────
    const allFiles: Array<{ path: string; content: string; language: string }> = [];

    for (const module of plan.modules) {
      sendEvent('phase', {
        phase: 'generating',
        message: `Generating ${module.label} module…`,
        module: module.name,
        progress: Math.round((plan.modules.indexOf(module) / plan.modules.length) * 70),
      });

      const moduleFiles = await this.aiService.generateModuleFiles(
        module, plan, provider, model, apiKey
      );
      allFiles.push(...moduleFiles);

      sendEvent('module_complete', {
        module: module.name,
        fileCount: moduleFiles.length,
        files: moduleFiles.map(f => f.path),
      });
    }

    // ── Phase 3: Generate shared files ───────────────────────────────────
    sendEvent('phase', { phase: 'wiring', message: 'Wiring everything together…', progress: 75 });

    const sharedFiles = await this.aiService.generateSharedFiles(
      plan, provider, model, apiKey
    );
    allFiles.push(...sharedFiles);

    sendEvent('phase', { phase: 'complete', message: 'Generation complete!', progress: 100 });

    // ── Send all files ────────────────────────────────────────────────────
    for (const file of allFiles) {
      sendEvent('file', file);
    }

    // ── Save to DB if authenticated ───────────────────────────────────────
    let savedProjectId: string | null = null;
    const userId = (req as any).userId;
    if (userId) {
      try {
        const { platformProjectsService } = await import('../platform-projects/platform-projects.service');
        const { platformAuthService } = await import('../platform-auth/platform-auth.service');
        const proj = await platformProjectsService.createProject(userId, {
          name: plan.projectName || projectName || 'my-app',
          modules: plan.modules.map((m: any) => m.name),
          provider,
          stack: 'nextjs',
        });
        await platformProjectsService.saveFiles(proj._id.toString(), allFiles);
        await platformAuthService.incrementGenerationCount(userId);
        savedProjectId = proj._id.toString();
      } catch (e: any) {
        console.warn('[generateV2] Persist failed:', e.message);
      }
    }

    sendEvent('complete', {
      projectName: plan.projectName,
      fileCount: allFiles.length,
      modules: plan.modules.map((m: any) => m.name),
      projectId: savedProjectId,
    });

  } catch (err: any) {
    sendEvent('error', { message: err.message || 'Generation failed' });
  } finally {
    res.end();
  }
};
```

---

### STEP B3 — Add route for v2 generation

**Action:** [MODIFY]
**File:** `backend/src/modules/ai/ai.routes.ts`

**Action:** [FIND+INSERT after the existing /generate route]

```typescript
// [INSERT after: router.post('/generate', ...)]
router.post('/generate/v2', optionalPlatformAuth, checkGenerationQuota, aiController.generateV2);
```

---

### STEP B4 — Connect v2 generation in frontend

**Action:** [MODIFY]
**File:** `frontend/pages/builder/ai-generate.tsx`

Read the file. Find where the SSE EventSource or fetch is set up for generation.
Add a `v2` flag option that hits `/api/ai/generate/v2` instead:

```typescript
// [FIND the generation URL — will be something like:]
const GENERATE_URL = `${API_BASE}/api/ai/generate`;

// [REPLACE with:]
const GENERATE_URL = useV2Generation
  ? `${API_BASE}/api/ai/generate/v2`
  : `${API_BASE}/api/ai/generate`;

// [ADD state near top of component:]
const [useV2Generation] = useState(true);  // enable by default

// [FIND the SSE 'phase' event handler — it currently handles type:'chunk']
// [ADD handler for new event types from v2:]
if (event.type === 'phase') {
  setGenerationPhase(event.phase);
  setGenerationMessage(event.message || '');
  if (event.progress) setGenerationProgress(event.progress);
}
if (event.type === 'plan') {
  setPlannedModules(event.modules || []);
}
if (event.type === 'module_complete') {
  setCompletedModules(prev => [...prev, event.module]);
}
```

**Add state variables:**
```typescript
const [generationPhase, setGenerationPhase] = useState('');
const [generationMessage, setGenerationMessage] = useState('');
const [generationProgress, setGenerationProgress] = useState(0);
const [plannedModules, setPlannedModules] = useState<string[]>([]);
const [completedModules, setCompletedModules] = useState<string[]>([]);
```

**Add progress UI to the generation panel:**
```tsx
{/* [ADD inside the generating state display, replace the simple spinner] */}
{isGenerating && (
  <div className="flex flex-col items-center justify-center py-16 gap-6">
    {/* Progress bar */}
    <div className="w-64">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{generationMessage || 'Generating…'}</span>
        <span>{generationProgress}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${generationProgress}%` }}
        />
      </div>
    </div>

    {/* Module pills */}
    {plannedModules.length > 0 && (
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {plannedModules.map(m => (
          <span key={m} className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
            completedModules.includes(m)
              ? 'bg-green-50 text-green-700 border border-green-200'
              : generationMessage.includes(m)
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
              : 'bg-gray-50 text-gray-400 border border-gray-200'
          }`}>
            {completedModules.includes(m) ? '✓ ' : ''}{m}
          </span>
        ))}
      </div>
    )}
  </div>
)}
```

---

## ═══════════════════════════════════════════════════════
## PART 5 — VERIFICATION
## ═══════════════════════════════════════════════════════

### Build check
```bash
cd backend  && npx tsc --noEmit 2>&1 | wc -l   # Expected: 0
cd frontend && npx tsc --noEmit 2>&1 | wc -l   # Expected: 0
cd frontend && npm run build 2>&1 | tail -5     # Expected: build passes
```

### V2 generation smoke test
```bash
# With backend running:
curl -N -X POST http://localhost:5000/api/ai/generate/v2 \
  -H "Content-Type: application/json" \
  -d '{"userPrompt":"build a task management app","provider":"gemini","selectedModules":["auth"]}' \
  2>&1 | head -30

# Expected SSE events in order:
# data: {"type":"phase","phase":"planning",...}
# data: {"type":"plan","modules":["tasks","projects",...],...}
# data: {"type":"phase","phase":"generating","module":"tasks",...}
# data: {"type":"module_complete","module":"tasks","fileCount":9,...}
# data: {"type":"complete","fileCount":45,...}
```

### UI quality check
Generate a task management app. In preview confirm:
```
[ ] Sidebar is visible on the left (not a top navbar)
[ ] Sidebar has icons next to nav items
[ ] Dashboard has gradient stat cards (not plain white boxes)
[ ] Dashboard calls real API (check Network tab — real requests made)
[ ] List page has skeleton loading rows before data loads
[ ] Empty state has icon + description + CTA button
[ ] Actions use icon buttons (pencil, trash) not text links
[ ] Creating an item shows a toast notification (not browser alert)
[ ] Login page is split-screen (form left, decorative right)
[ ] Icons visible throughout (lucide-react imported and used)
[ ] No commented-out code in any service file
```

---

## ═══════════════════════════════════════════════════════
## PART 6 — WHAT THIS CHANGES
## ═══════════════════════════════════════════════════════

| Before | After |
|--------|-------|
| Single JSON call, truncates at 4096 tokens | Phase 1 plans, Phase 2-3 generates per module — no truncation |
| Top navbar — looks like an admin panel | Sidebar layout — looks like a real SaaS |
| No icons | Lucide-react icons throughout |
| Plain white stat cards | Gradient stat cards with icons and trend badges |
| Commented-out API calls | Real working API calls in every page |
| Browser alert() for errors | Toast notifications |
| Spinner only | Skeleton loading rows + progress bar with module pills |
| Generic fields for unknown domains | AI-inferred domain-specific field names |
| Auth pages designed, rest plain | Every page designed to the same quality level |
| No empty states | Rich empty states with icon + CTA |
| Login = centered card | Login = split-screen premium layout |
| Inline form errors only | Toast on success + inline errors on validation failure |

---

*End of document. Version 1.0. Agent-optimized. Date: 2026-03-24.*
*Primary scope: backend/src/modules/ai/ai.prompts.ts (replace)*
*               backend/src/modules/ai/ai.service.ts (add 3 methods)*
*               backend/src/modules/ai/ai.controller.ts (add generateV2)*
*               backend/src/modules/ai/ai.routes.ts (add /generate/v2 route)*
*               frontend/pages/builder/ai-generate.tsx (add v2 support + progress UI)*

---

## ═══════════════════════════════════════════════════════
## PART 7 — COMPATIBILITY ADDENDUM (MISSING FIXES + CORRECTIONS)
## This section was added to include all fixes already implemented in codebase.
## ═══════════════════════════════════════════════════════

This document is excellent, but by itself it does NOT include all production fixes currently implemented.

It also contains a few snippets that are incompatible with current repository signatures.

### 7.1 Critical compatibility corrections required

1) `platformProjectsService.saveFiles` signature is outdated in this MD.
- Current code requires userId:
  - `saveFiles(projectId, userId, files, prompt?)`
- The snippet in Part 4 currently calls:
  - `saveFiles(proj._id.toString(), allFiles)`
- Correct call must be:
  - `saveFiles(proj._id.toString(), userId, allFiles)`

2) Route middleware name in Part B3 is outdated.
- MD currently uses `optionalPlatformAuth`.
- Current AI router uses `optionalAuth`.
- Correct route style should match existing file:
  - `router.post('/generate/v2', optionalAuth, (req, res) => aiController.generateV2(req, res));`

3) `generateNonStreaming` call shape in Part B1 does not match current service.
- Current service expects params like:
  - `provider, apiKey, model, prompt, maxTokens, temperature, forceJson`
- MD uses `systemPrompt` and `userPrompt` keys which do not exist in current `NonStreamingParams`.

4) Requirements/generation limit assumptions differ from current runtime.
- Current middleware has effective skip behavior for generation and requirements limits.
- If you re-introduce hard limits with v2, update UX messaging to avoid silent 403 confusion.

### 7.2 Additional fixes already implemented (must preserve)

These fixes are already in the codebase and should NOT be lost when applying this upgrade.

1) GitHub Models unknown-model fallback hardening
- Added unknown model detection (`404`, `unknown model`, etc.).
- Added fallback chain for GitHub models.
- Applied in both streaming and non-streaming paths.
- Prevents failures like: `Unknown model: meta/llama-4-maverick`.

2) Robust JSON parse pipeline in service
- `jsonrepair` + multi-attempt lenient parsing.
- Response normalization for requirements questions and compiled requirements.

3) Requirements fallback + domain rebalance logic
- Stronger fallback requirements builder for non-standard app types.
- Rebalance prevents auth-heavy output for non-auth ideas.

4) Unified quality/compliance retry in controller
- Single retry loop combines quality + missing feature compliance.
- Adds quality report with score/reasons/warnings.

5) External services compliance checks
- Validates required service files and code usage patterns based on detected integrations.

6) Light-theme default hardening
- Theme normalization now defaults ambiguous theme mode to light.
- Dark-dominance check blocks black-first output unless explicitly requested.

7) Frontend refine/chat reliability hardening
- Context-aware refine payload compression.
- Chat backend offline cooldown to avoid repeated network error spam.

8) Preview runtime hardening
- Mock/API normalization fixes for common generated dashboard data shapes.
- Reduced runtime crashes from missing fields in preview.

### 7.3 Merge strategy recommendation (safe rollout)

Apply in this exact order to avoid regressions:

1) Replace prompts file (Part 3).
2) Add v2 service methods (Part B1) BUT adapt to current `generateNonStreaming` params.
3) Add v2 controller handler (Part B2) and fix `saveFiles` call signature.
4) Add v2 route (Part B3) with `optionalAuth` middleware.
5) Add frontend v2 progress UX (Part B4).
6) Re-apply/preserve all 8 already-implemented fixes from 7.2.
7) Run full compile + generation smoke tests.

### 7.4 Minimal compile-safe patch notes for v2 snippets

When adapting B1 methods, use this `generateNonStreaming` shape:

```typescript
await this.generateNonStreaming({
  provider: provider as AIProvider,
  apiKey,
  model,
  prompt,
  maxTokens: 2000,
  temperature: 0.2,
  forceJson: true,
});
```

When persisting files in B2, use:

```typescript
await platformProjectsService.saveFiles(proj._id.toString(), userId, allFiles);
```

When routing in B3, use:

```typescript
router.post('/generate/v2', optionalAuth, (req, res) => aiController.generateV2(req, res));
```

### 7.5 Final verdict on this MD

Does this MD contain all fixes by itself?
- No.

Does this MD become complete after this addendum?
- Yes, as an execution guide, provided you preserve 7.2 fixes and apply 7.1 compatibility corrections.

---

## ═══════════════════════════════════════════════════════
## PART 8 — EXECUTION CHECKLIST TO REACH 85–90% SUCCESS
## File-mapped, ordered, with effort estimates.
## ═══════════════════════════════════════════════════════

Legend:
- Effort S: 1-3 hours
- Effort M: 0.5-2 days
- Effort L: 2-5 days

## 8.1 Phase A — High ROI First (do these first)

1) Implement post-generation verification gate (build + smoke checks)
- Files:
  - `backend/src/modules/ai/ai.controller.ts`
  - `backend/src/modules/ai/ai.service.ts`
  - `backend/src/modules/ai/ai.types.ts`
  - `frontend/pages/builder/ai-generate.tsx`
- Work:
  - Add verification runner after file extraction and before final `complete` event.
  - Run backend and frontend build checks in isolated temp directory.
  - Add minimum smoke checks: auth route, one module CRUD route, route mount sanity.
  - Emit `verification_report` SSE event with `criticalFailures` and `warnings`.
- Acceptance:
  - Generation only returns "success" when no critical verification failures.
- Effort: L

2) Surface quality/verification details in generation UI
- Files:
  - `frontend/pages/builder/ai-generate.tsx`
  - `frontend/components/AIChatPanel.tsx` (optional if panel-level display desired)
- Work:
  - Render `quality_report` and `verification_report` in UI.
  - Show score, retries, blockers, warnings, missing features.
  - Add actions: retry, continue with warnings.
- Acceptance:
  - No hidden backend quality warnings.
- Effort: M

3) Lock schema-first generation contracts
- Files:
  - `backend/src/modules/ai/ai.types.ts`
  - `backend/src/modules/ai/ai.controller.ts`
  - `backend/src/modules/ai/ai.service.ts`
- Work:
  - Define strict output contracts for planner/module/shared file bundles.
  - Validate parsed JSON before persistence.
  - Repair once, then targeted regenerate failed bundle only.
- Acceptance:
  - Invalid bundle is never persisted or marked complete.
- Effort: M

## 8.2 Phase B — Reliability Hardening

4) Add static dependency and wiring validator
- Files:
  - `backend/src/modules/ai/ai.controller.ts`
  - new helper file: `backend/src/modules/ai/ai.validators.ts`
- Work:
  - Validate route files are mounted in server.
  - Validate frontend pages reference existing service files.
  - Validate module file completeness by contract.
  - Auto-repair wiring via targeted retry prompt when possible.
- Acceptance:
  - Missing route mount and missing service link failures reduced.
- Effort: M

5) Integration readiness validation (functional, not file-only)
- Files:
  - `backend/src/modules/ai/ai.controller.ts`
  - `backend/src/modules/ai/ai.prompts.ts`
  - new helper file: `backend/src/modules/ai/ai.integrationChecks.ts`
- Work:
  - For each detected integration: check env keys, SDK init, and actual usage path.
  - Classify missing elements as critical/warning.
  - Include detailed remediation text in `quality_report`.
- Acceptance:
  - Stripe/email/upload/oauth integrations fail clearly when incomplete.
- Effort: M

6) Provider health routing and fallback policy
- Files:
  - `backend/src/modules/ai/ai.service.ts`
  - new file: `backend/src/modules/ai/ai.providerHealth.ts`
- Work:
  - Persist transient provider/model success and failure counters.
  - Prefer healthy model/provider combinations.
  - Fallback to alternate provider after repeated unknown model/timeout failures.
- Acceptance:
  - Reduced hard failures from provider/model volatility.
- Effort: M

## 8.3 Phase C — Output Quality and UX Completeness

7) Two-phase generation rollout (planner + per-module + shared)
- Files:
  - `backend/src/modules/ai/ai.prompts.ts`
  - `backend/src/modules/ai/ai.service.ts`
  - `backend/src/modules/ai/ai.controller.ts`
  - `backend/src/modules/ai/ai.routes.ts`
  - `frontend/pages/builder/ai-generate.tsx`
- Work:
  - Add `/generate/v2` pipeline with planner and per-module generation.
  - Keep `/generate` as fallback until stable.
  - Add module progress UI in frontend.
- Acceptance:
  - Reduced truncation and improved large-app completion.
- Effort: L

8) Hallucination/placeholder scanner
- Files:
  - `backend/src/modules/ai/ai.controller.ts`
  - new helper: `backend/src/modules/ai/ai.lintChecks.ts`
- Work:
  - Detect TODO placeholders, stubbed returns, fake key literals, broken imports.
  - Feed findings into critical/warning classifier.
- Acceptance:
  - Fewer polished-but-nonfunctional generations.
- Effort: S-M

9) Keep and protect already-implemented fixes (non-regression)
- Files to protect:
  - `backend/src/modules/ai/ai.service.ts`
  - `backend/src/modules/ai/ai.controller.ts`
  - `backend/src/modules/ai/ai.prompts.ts`
  - `frontend/pages/builder/ai-generate.tsx`
  - `frontend/pages/builder/preview-runner.tsx`
- Must preserve:
  - GitHub unknown-model fallback chain
  - jsonrepair-based parsing
  - unified quality+compliance retry
  - light-default theme normalization and dark-dominance guard
  - external services compliance checks
  - chat backend offline cooldown
  - preview runtime safety normalization
- Effort: S

## 8.4 Suggested rollout plan by sprint

Sprint 1:
1. Verification gate
2. Quality/verification UI surfacing
3. Non-regression tests for existing hardening

Sprint 2:
1. Schema-first contracts
2. Wiring validator
3. Integration readiness validator

Sprint 3:
1. Provider health routing
2. Two-phase generation v2 behind feature flag
3. Hallucination scanner

## 8.5 Exit criteria for 85–90% target

Track these metrics for at least 100 generations:
1. Build-pass rate (frontend+backend)
2. Critical quality failure rate
3. Missing-route/missing-wire failure rate
4. Integration readiness pass rate when integrations requested
5. First-generation acceptance rate (no manual code edits)

Target thresholds:
1. Build-pass >= 95%
2. Critical quality failure <= 10%
3. Wiring failures <= 5%
4. Integration readiness pass >= 80% (for requested integrations)
5. First-generation acceptance 85–90% for standard business domains
