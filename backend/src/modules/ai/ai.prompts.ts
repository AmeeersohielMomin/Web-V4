// ============================================================
// IDEA Platform — AI Prompt Templates v2.0
// Rewritten for complete full-stack application generation.
// Every app type. Every module. No placeholders.
// ============================================================

import type { RequirementsAnswer, RequirementsDocument } from './ai.types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — SYSTEM PROMPT: CORE ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_FULLSTACK = `You are an expert full-stack developer generating complete, production-ready web applications.

You generate ENTIRE applications — not just auth screens. Every app must have ALL domain modules fully functional with working frontend pages.

ABSOLUTE RULES:
1. NEVER generate auth-only apps. Auth is ONE module — generate ALL domain modules too.
2. ALWAYS generate full CRUD for every domain resource the user described.
3. EVERY backend module: routes.ts + controller.ts + service.ts + model.ts + schema.ts
4. EVERY frontend module: list page (index.tsx) + create page (new.tsx) + edit page ([id]/edit.tsx) + service file
5. server.ts MUST register routes for EVERY module.
6. Navbar MUST link to EVERY module's list page.
7. Dashboard MUST fetch real stats from ALL domain module services.
8. Return ONLY raw JSON. No markdown. Start with { end with }.

TECH STACK:
  Backend:  Node.js + Express + TypeScript + MongoDB (Mongoose) + Zod + bcrypt + jsonwebtoken
  Frontend: Next.js 14 Pages Router + React 18 + TypeScript + Tailwind CSS + axios
  NOTE: Pages Router = pages/ directory. NO "use client". NO app/ directory.

API RESPONSE FORMAT (every endpoint): { success: boolean, data: T | null, error: string | null }

BACKEND FILES TO GENERATE:

  middleware/auth.ts — JWT verify from Bearer header, attach userId to req, 401 if missing/invalid

  modules/auth/auth.schema.ts — Zod: signupSchema(name,email,password), loginSchema(email,password)
  modules/auth/auth.model.ts — Mongoose User: name, email(unique,lowercase), password, role(user/admin), timestamps
  modules/auth/auth.service.ts — signup(hash+create+JWT), login(compare+JWT), getMe(findById)
  modules/auth/auth.controller.ts — Express handlers wrapping service with try/catch
  modules/auth/auth.routes.ts — POST /signup, POST /login, GET /me(authMiddleware)

  modules/[DOMAIN]/[domain].schema.ts — Zod schemas with REAL DOMAIN fields (NOT generic title/description)
  modules/[DOMAIN]/[domain].model.ts — Mongoose schema with domain fields + userId ref + timestamps
  modules/[DOMAIN]/[domain].service.ts — getAll(userId,query), getById, create, update, remove, getStats
  modules/[DOMAIN]/[domain].controller.ts — CRUD handlers with authMiddleware
  modules/[DOMAIN]/[domain].routes.ts — GET/POST/PUT/DELETE + /stats, all behind authMiddleware

  server.ts — mongoose.connect, register auth routes + ALL domain routes, error handler, PORT from env
  package.json — express, mongoose, bcrypt, jsonwebtoken, cors, dotenv, zod + dev: typescript, ts-node, nodemon, @types/*
  tsconfig.json — strict true, esModuleInterop, resolveJsonModules
  .env.example — DATABASE_URL, JWT_SECRET, PORT, FRONTEND_URL

FRONTEND FILES TO GENERATE:

  services/auth.service.ts — axios instance with Bearer interceptor, signup/login/me methods
  services/[domain].service.ts — axios CRUD: getAll(params), getById(id), create(data), update(id,data), remove(id), getStats()
  contexts/AuthContext.tsx — user state, login/signup/logout, token in localStorage, auto-check /me on mount
  pages/_app.tsx — AuthProvider wrapper + globals.css import
  pages/index.tsx — redirect: logged in → /dashboard, not → /login
  pages/login.tsx — email+password form, auth.login(), redirect to /dashboard, error display
  pages/signup.tsx — name+email+password form, auth.signup(), redirect to /dashboard
  pages/dashboard.tsx — import ALL domain services, Promise.all to fetch stats, display stat cards + recent items table
  components/Navbar.tsx — links to /dashboard + EVERY domain module's list page + logout button

  FOR EACH DOMAIN MODULE (this is the MOST IMPORTANT part):

    pages/[module]/index.tsx — LIST PAGE:
      import [module]Service, useAuth, Navbar
      Fetch items in useEffect with [module]Service.getAll()
      Search input + "+ New" button linking to /[module]/new
      Table with domain-specific columns (NOT generic title/status)
      Edit link → /[module]/[id]/edit, Delete button → service.remove(id)
      ALL service calls must be REAL code (never commented out)

    pages/[module]/new.tsx — CREATE FORM:
      Form with domain-specific fields (NOT generic title/description)
      Submit → [module]Service.create(formData), redirect to /[module]
      Error display + loading state + cancel button

    pages/[module]/[id]/edit.tsx — EDIT FORM:
      Load with [module]Service.getById(id) in useEffect
      Pre-fill form fields with loaded data
      Submit → [module]Service.update(id, formData), redirect to /[module]

  styles/globals.css — @tailwind directives + :root CSS variables for primary/secondary colors
  package.json — next, react, react-dom, axios + dev: typescript, tailwindcss, postcss, autoprefixer, @types/*
  next.config.js, tailwind.config.js, postcss.config.js, .env.example

VISUAL STANDARDS (Tailwind):
  Auth: gradient bg, centered card max-w-md, rounded-2xl shadow-xl
  Dashboard: sticky Navbar, stats cards grid, recent items table
  List pages: search + "+ New" button, data table, status badges, edit/delete
  Form pages: back arrow, labeled inputs h-11, save + cancel buttons
  All: responsive, loading spinner, error alerts, transitions
  Inputs: border-2 border-gray-200 focus:border-indigo-500 h-11
  Buttons: primary=bg-indigo-600 hover:bg-indigo-700

OUTPUT FORMAT (raw JSON only):
{
  "projectName": "my-app",
  "description": "One sentence",
  "files": [{ "path": "backend/src/server.ts", "content": "full code", "language": "typescript" }],
  "envVars": {
    "backend": { "DATABASE_URL": "mongodb://localhost:27017/myapp", "JWT_SECRET": "change-this", "PORT": "5000", "FRONTEND_URL": "http://localhost:3000" },
    "frontend": { "NEXT_PUBLIC_API_URL": "http://localhost:5000" }
  },
  "dependencies": {
    "backend": { "express": "^4.18.2", "mongoose": "^8.0.3", "bcrypt": "^5.1.1", "jsonwebtoken": "^9.0.2", "cors": "^2.8.5", "dotenv": "^16.3.1", "zod": "^3.22.4" },
    "frontend": { "next": "14.0.4", "axios": "^1.6.2", "react": "^18.2.0", "react-dom": "^18.2.0" }
  },
  "setupInstructions": ["cd backend && npm install && npm run dev", "cd frontend && npm install && npm run dev"]
}`;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — DESIGN DNA SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_DNA_PRESETS = {
  layoutArchetypes: [
    'editorial split-screen with oversized hero headings',
    'minimal bento grid with asymmetrical card proportions',
    'dashboard with modular blocks and collapsible side rail',
    'storytelling hero-first flow with sectional reveals',
    'compact productivity layout with dense information hierarchy',
    'neo-brutalist block layout with sharp section separation',
    'soft rounded SaaS layout with high whitespace discipline'
  ],
  palettes: [
    'vibrant-indigo | primary:#4f46e5 secondary:#eef2ff accent:#06b6d4',
    'bold-blue | primary:#2563eb secondary:#eff6ff accent:#f97316',
    'emerald-pro | primary:#059669 secondary:#ecfdf5 accent:#7c3aed',
    'ruby-modern | primary:#e11d48 secondary:#fff1f2 accent:#f59e0b',
    'teal-tech | primary:#0d9488 secondary:#f0fdfa accent:#84cc16',
    'purple-premium | primary:#7c3aed secondary:#f5f3ff accent:#ec4899',
    'slate-pro | primary:#334155 secondary:#f1f5f9 accent:#3b82f6',
    'violet-vibrant | primary:#7c3aed secondary:#f5f3ff accent:#f59e0b',
    'cyan-modern | primary:#0891b2 secondary:#ecfeff accent:#f43f5e',
    'green-fresh | primary:#16a34a secondary:#f0fdf4 accent:#8b5cf6'
  ],
  typographyMoods: [
    'high-contrast editorial with bold display headings',
    'technical mono-accent for data-heavy interfaces',
    'clean geometric sans with precise kerning',
    'friendly rounded sans with warm letter-spacing',
    'elegant condensed headings with refined hierarchy',
    'modern grotesk with oversized bold display titles'
  ],
  surfaces: [
    'flat matte panels with subtle 1px borders',
    'soft glass cards with backdrop blur and layered depth',
    'paper-like cards with gentle drop shadows',
    'high-contrast blocks with sharp edges and bold dividers',
    'gradient-tinted panels with restrained ambient glow'
  ],
  motionProfiles: [
    'subtle fade-and-rise on first paint 200ms ease-out',
    'snappy 120ms transitions on hover and active states',
    'staggered reveal for lists and card grids',
    'minimal motion with emphasis on hover state changes only',
    'spring-based micro-interactions on buttons and inputs'
  ],
  themeModes: [
    'light professional with white surfaces and dark text',
    'dark professional with gray-900 surfaces and gray-100 text',
    'hybrid light-with-dark-header sections',
    'neutral warm daylight palette',
    'high-contrast enterprise with pure black and white accented'
  ]
} as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickBySeed<T>(values: readonly T[], seed: string, offset: number): T {
  return values[(hashSeed(`${seed}:${offset}`) + offset) % values.length];
}

function buildDesignDNA(seed: string): string {
  return [
    `DESIGN DNA [seed: ${seed}]`,
    `  Layout:     ${pickBySeed(STYLE_DNA_PRESETS.layoutArchetypes, seed, 1)}`,
    `  Palette:    ${pickBySeed(STYLE_DNA_PRESETS.palettes, seed, 2)}`,
    `  Theme:      ${pickBySeed(STYLE_DNA_PRESETS.themeModes, seed, 3)}`,
    `  Typography: ${pickBySeed(STYLE_DNA_PRESETS.typographyMoods, seed, 4)}`,
    `  Surfaces:   ${pickBySeed(STYLE_DNA_PRESETS.surfaces, seed, 5)}`,
    `  Motion:     ${pickBySeed(STYLE_DNA_PRESETS.motionProfiles, seed, 6)}`,
    ``,
    `Apply this DNA across ALL pages. NOT just auth screens.`,
    `Define palette colors as CSS variables in globals.css.`,
    `Use primary color for buttons, active links, focus rings.`,
    `Use secondary color for backgrounds, hover states, badges.`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — APP-TYPE MODULE DETECTOR
// Tells the AI exactly which domain modules to generate for each app type.
// ─────────────────────────────────────────────────────────────────────────────

function detectDomainModules(
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
DOMAIN MODULES TO GENERATE (e-commerce):
  1. products   — name, price, description, stock, category, images[], available, sku
  2. categories — name, slug, description, parentCategory
  3. orders     — userId, items[{productId,qty,price}], status(pending/confirmed/shipped/delivered), total, shippingAddress
  4. cart       — userId, items[{productId,qty}], updatedAt
Backend: all 4 modules × 5 files each = 20 backend module files
Frontend: all 4 modules × 3 pages each + 4 service files = 16 frontend files
Dashboard must show: revenue today, pending orders count, low stock alerts, recent orders table`,

    blog: `
DOMAIN MODULES TO GENERATE (blog/cms):
  1. posts      — title, slug, content, excerpt, status(draft/published), categoryId, tags[], authorId, publishedAt
  2. categories — name, slug, description, color
  3. comments   — content, postId, authorId, status(pending/approved), parentCommentId
Backend: all 3 modules × 5 files each = 15 backend module files
Frontend: all 3 modules × 3 pages each + 3 service files = 12 frontend files
Dashboard must show: published/draft post counts, recent posts table, pending comments, category breakdown`,

    task: `
DOMAIN MODULES TO GENERATE (task/project management):
  1. projects — name, description, status(active/on-hold/completed), deadline, color, ownerId
  2. tasks    — title, description, status(todo/in-progress/review/done), priority(low/medium/high/urgent), assigneeId, dueDate, projectId, tags[]
  3. comments — content, taskId, authorId, createdAt
Backend: all 3 modules × 5 files each = 15 backend module files
Frontend: all 3 modules × 3 pages each + 3 service files = 12 frontend files
Dashboard must show: tasks due today, tasks by status count, overdue tasks, project progress`,

    booking: `
DOMAIN MODULES TO GENERATE (booking/appointment):
  1. services     — name, description, duration(min), price, category, available
  2. bookings     — serviceId, userId, customerName, customerEmail, date, startTime, status(pending/confirmed/cancelled/completed), notes, totalPrice
  3. availability — dayOfWeek(0-6), startTime, endTime, slotDuration, isOff
Backend: all 3 modules × 5 files each = 15 backend module files
Frontend: all 3 modules × 3 pages each + 3 service files = 12 frontend files
Dashboard must show: today's schedule, this week revenue, booking status breakdown, upcoming bookings`,

    inventory: `
DOMAIN MODULES TO GENERATE (inventory/warehouse):
  1. products   — name, sku, quantity, minStockLevel, categoryId, supplierId, costPrice, sellingPrice, unit
  2. suppliers  — name, contactPerson, email, phone, address, paymentTerms
  3. movements  — productId, type(in/out/adjustment), quantity, reason, reference, performedBy, date
  4. categories — name, description, parentCategory
Backend: all 4 modules × 5 files each = 20 backend module files
Frontend: all 4 modules × 3 pages each + 4 service files = 16 frontend files
Dashboard must show: low stock alerts, total inventory value, recent movements, supplier count`,

    finance: `
DOMAIN MODULES TO GENERATE (finance/expense):
  1. accounts      — name, type(cash/bank/credit), balance, currency, color
  2. categories    — name, type(income/expense), color, icon
  3. transactions  — amount, type(income/expense/transfer), categoryId, accountId, date, description, tags[]
  4. budgets       — categoryId, amount, period(monthly/yearly), startDate
Backend: all 4 modules × 5 files each = 20 backend module files
Frontend: all 4 modules × 3 pages each + 4 service files = 16 frontend files
Dashboard must show: net balance, income vs expense this month, recent transactions, budget progress`,

    restaurant: `
DOMAIN MODULES TO GENERATE (restaurant):
  1. menu     — name, categoryId, price, description, available, preparationTime, images[]
  2. orders   — tableNumber, items[{menuItemId,qty,price,notes}], status(placed/preparing/ready/served/paid), total
  3. tables   — number, capacity, status(available/occupied/reserved), location
  4. categories — name, displayOrder, available
Backend: all 4 modules × 5 files each = 20 backend module files
Frontend: all 4 modules × 3 pages each + 4 service files = 16 frontend files
Dashboard must show: live orders by status, revenue today, popular items, table occupancy`,

    saas: `
DOMAIN MODULES TO GENERATE (saas/platform):
  1. workspaces — name, slug, plan(free/starter/pro), ownerId
  2. members    — workspaceId, userId, role(owner/admin/member), joinedAt
  3. invites    — workspaceId, email, role, token, expiresAt, status(pending/accepted/expired)
  4. activity   — workspaceId, userId, action, resource, detail, createdAt
Backend: all 4 modules × 5 files each = 20 backend module files
Frontend: all 4 modules × 3 pages each + 4 service files = 16 frontend files
Dashboard must show: workspace count, member count, recent activity feed, plan distribution`,

    social: `
DOMAIN MODULES TO GENERATE (social/community):
  1. posts          — content, authorId, images[], tags[], likesCount, commentsCount, visibility
  2. follows        — followerId, followingId, createdAt
  3. likes          — postId, userId, createdAt
  4. notifications  — userId, type(like/comment/follow), actorId, resourceId, read, createdAt
Backend: all 4 modules × 5 files each = 20 backend module files
Frontend: all 4 modules × 3 pages each + 4 service files = 16 frontend files
Dashboard must show: feed (recent posts), notification count, follower stats, trending tags`,
  };

  const checks: Record<string, string[]> = {
    ecommerce: ['product', 'shop', 'store', 'cart', 'checkout', 'order', 'ecommerce', 'e-commerce', 'sell', 'buy'],
    blog: ['blog', 'post', 'article', 'cms', 'content', 'publish', 'write', 'editorial', 'news'],
    task: ['task', 'project', 'todo', 'kanban', 'sprint', 'agile', 'manage', 'track', 'productivity', 'ticket'],
    booking: ['book', 'appointment', 'schedule', 'reservation', 'slot', 'calendar', 'service', 'clinic', 'session'],
    inventory: ['inventory', 'stock', 'warehouse', 'supply', 'sku', 'supplier', 'movement', 'asset', 'storage'],
    finance: ['finance', 'expense', 'budget', 'transaction', 'account', 'money', 'income', 'invoice', 'accounting', 'payment'],
    restaurant: ['restaurant', 'food', 'menu', 'table', 'kitchen', 'meal', 'dining', 'cafe', 'dish', 'waiter'],
    saas: ['saas', 'workspace', 'team', 'organization', 'member', 'plan', 'subscription', 'multi-tenant', 'tenant'],
    social: ['social', 'feed', 'follow', 'like', 'community', 'network', 'friend', 'post', 'share'],
  };

  for (const [type, keywords] of Object.entries(checks)) {
    if (keywords.some(kw => text.includes(kw))) {
      return guides[type] || '';
    }
  }

  // ── AI-INFERRED MODULES (for any app not matching the known domains above) ──
  //
  // Instead of guessing with hardcoded generic field names, we pass the user's
  // actual description directly to the AI and tell it to derive the correct
  // modules itself. This handles dating apps, fitness trackers, pet care apps,
  // learning management systems, legal case managers, and anything else.
  //
  return `
DOMAIN: CUSTOM / UNIQUE APPLICATION
The app being built does not match a standard template.
You MUST read the user request and requirements carefully and derive the correct
modules yourself based on what the application actually does.

RULES FOR DERIVING MODULES:
1. Identify all the main "things" (nouns) the app manages.
   Examples:
   - Dating app    → profiles, matches, messages, likes, preferences
   - Fitness app   → workouts, exercises, programs, progress, goals
   - Pet care app  → pets, appointments, medications, vet records, reminders
   - LMS           → courses, lessons, enrollments, quizzes, progress
   - Legal app     → cases, clients, documents, hearings, invoices
   - Real estate   → properties, viewings, offers, agents, clients
   - Job board     → jobs, applications, companies, candidates, interviews
   - Event mgmt    → events, attendees, tickets, venues, speakers
   - Fleet mgmt    → vehicles, drivers, trips, maintenance, fuel logs
   - Library app   → books, loans, members, reservations, fines

2. For EACH noun you identify, generate a FULL backend module:
   - [noun].routes.ts + [noun].controller.ts + [noun].service.ts
   - [noun].model.ts (with ALL relevant Mongoose fields)
   - [noun].schema.ts (Zod validation for create + update)

3. For EACH noun you identify, generate FULL frontend pages:
   - pages/[noun]/index.tsx — list with search, table, delete
   - pages/[noun]/new.tsx   — create form with all fields
   - pages/[noun]/[id]/edit.tsx — edit form pre-filled with data
   - src/services/[noun].service.ts — axios CRUD calls

4. Design the Mongoose model fields to reflect the REAL domain:
   - A workout should have: name, exercises[], duration, difficulty, category, userId
   - A case should have:    title, clientId, status, filingDate, court, notes, documents[]
   - A pet should have:     name, species, breed, dateOfBirth, ownerId, medicalHistory[]
   - NOT generic "title/description/status" — USE THE ACTUAL DOMAIN FIELD NAMES.

5. The dashboard must show stats meaningful to THIS specific app:
   - Fitness app:  workouts this week, calories burned, active programs, goals progress
   - Dating app:   new matches today, unread messages, profile views, match rate
   - Pet care app: upcoming appointments, medication reminders, pets count, recent visits
   - Derive the correct stats from what the app actually tracks.

6. Minimum 2 domain modules beyond auth. Usually 3–5.
   More complex apps (LMS, legal, fleet) may need 5–7 modules.

WHAT YOU ARE BUILDING: "${text.slice(0, 300)}"

Based on the above description, derive the correct module names, Mongoose fields,
and dashboard metrics now. Do not use placeholder names like "items" or "resources".
Use the actual domain vocabulary from the user's request.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — MAIN PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export function buildFullstackPrompt(
  userDescription: string,
  selectedModules: string[],
  variationSeed: string,
  requirements?: RequirementsDocument
): string {

  const designDNA = buildDesignDNA(variationSeed);
  const domainGuide = detectDomainModules(userDescription, requirements);

  const requirementsBlock = requirements ? `
╔══════════════════════════════════════════════╗
║  PROJECT REQUIREMENTS — HIGHEST PRIORITY     ║
╚══════════════════════════════════════════════╝

App type:          ${requirements.appType}
Target users:      ${requirements.targetUsers}
Scale:             ${requirements.scale}
Theme:             ${requirements.themeMode}
Design preference: ${requirements.designPreference}
Tech preferences:  ${requirements.techPreferences}
Notes:             ${requirements.additionalNotes}

Core features — implement EVERY ONE as a working module:
${requirements.coreFeatures.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}

User's exact words (use for naming and copy):
${requirements.answers.map(a => `  • "${a.answer}"`).join('\n')}

MANDATORY:
  • Every feature above needs backend files AND frontend pages.
  • Auth is ONE module — generate ALL the others listed above too.
  • Theme "${requirements.themeMode}" must apply to every page.
  • Design preference overrides Design DNA below.

` : '';

  const moduleChecklist = `
╔══════════════════════════════════════════════╗
║  MODULE CHECKLIST — GENERATE ALL OF THESE   ║
╚══════════════════════════════════════════════╝

${domainGuide}

FILE STRUCTURE RULES:
If the domain guide above lists specific module names (products, orders, etc.) — use those.
If the domain guide says "derive modules from the description" — you must figure out
the correct module names from the user request and requirements, then apply this structure:

BACKEND files per module (×5 per module):
  backend/src/modules/[actualModuleName]/[actualModuleName].routes.ts
  backend/src/modules/[actualModuleName]/[actualModuleName].controller.ts
  backend/src/modules/[actualModuleName]/[actualModuleName].service.ts
  backend/src/modules/[actualModuleName]/[actualModuleName].model.ts
  backend/src/modules/[actualModuleName]/[actualModuleName].schema.ts

FRONTEND files per module (×3 pages + 1 service = ×4 per module):
  frontend/pages/[actualModuleName]/index.tsx       ← list with table, search, delete
  frontend/pages/[actualModuleName]/new.tsx         ← create form
  frontend/pages/[actualModuleName]/[id]/edit.tsx   ← edit form (loads existing data by ID)
  frontend/src/services/[actualModuleName].service.ts

IMPORTANT: Use the real domain vocabulary, not placeholder names.
  ✅ CORRECT: backend/src/modules/workouts/workouts.model.ts
  ❌ WRONG:   backend/src/modules/items/items.model.ts (for a fitness app)
  ✅ CORRECT: backend/src/modules/cases/cases.model.ts
  ❌ WRONG:   backend/src/modules/resources/resources.model.ts (for a legal app)

SHARED FILES (generate exactly once):
  backend/src/middleware/auth.ts
  backend/src/server.ts                ← MUST register ALL module routes
  backend/package.json + tsconfig.json + .env.example
  frontend/pages/_app.tsx              ← wraps with AuthProvider
  frontend/pages/index.tsx             ← redirect based on auth state
  frontend/pages/login.tsx
  frontend/pages/signup.tsx
  frontend/pages/dashboard.tsx         ← real stats + recent data from THIS app's modules
  frontend/src/contexts/AuthContext.tsx
  frontend/src/components/Navbar.tsx   ← links to ALL module list pages
  frontend/styles/globals.css          ← Tailwind + CSS variables
  frontend/package.json + next.config.js + tailwind.config.js + postcss.config.js + .env.example

MINIMUM FILE COUNT: 30 files for a simple app. 45–60 files for complex apps.
If you have fewer than 25 files you are generating an INCOMPLETE application.
`;

  return `${requirementsBlock}${SYSTEM_PROMPT_FULLSTACK}

USER REQUEST: "${userDescription}"
SELECTED MODULES: ${selectedModules.join(', ') || 'auth'}

${moduleChecklist}

╔══════════════════════════════════════════════╗
║  DESIGN SYSTEM — EVERY PAGE                  ║
╚══════════════════════════════════════════════╝

${designDNA}

VISUAL STANDARDS:
  Auth pages:  gradient background, centered card max-w-md, colored submit button, link to other auth page
  Dashboard:   sticky Navbar, stats row (3–4 cards), data table with real API data, empty state with CTA
  List pages:  search bar, "+ New" button top right, table with status badges, edit/delete actions
  Form pages:  back arrow, labeled inputs h-11, inline validation errors, save + cancel buttons
  All pages:   responsive (sm: md: lg:), loading spinner while fetching, error alerts, hover transitions
  Inputs:      border-2 border-gray-200, focus:border-indigo-500, h-11 minimum height
  Buttons:     primary = bg-indigo-600 hover:bg-indigo-700, secondary = border-2 border-gray-200

╔══════════════════════════════════════════════╗
║  FILE GENERATION ORDER — CRITICAL             ║
╚══════════════════════════════════════════════╝

Generate files in MODULE-BY-MODULE order, NOT layer-by-layer.
For each module, output ALL its files (backend + frontend) before the next module.

CORRECT ORDER:
  1. Shared files: middleware/auth.ts, AuthContext, _app.tsx, globals.css, configs
  2. Auth module: schema → model → service → controller → routes → login.tsx → signup.tsx → auth.service.ts
  3. Module A: schema → model → service → controller → routes → pages/A/index.tsx → pages/A/new.tsx → pages/A/[id]/edit.tsx → services/A.service.ts
  4. Module B: (same pattern)
  5. Module C: (same pattern)
  6. Last: server.ts (registers all routes), dashboard.tsx (imports all services), Navbar.tsx (links all pages)

WRONG ORDER (DO NOT DO THIS):
  ❌ All backend files first → then all frontend files last
  ❌ This causes frontend pages to be MISSING if output is truncated

FRONTEND PAGES ARE NON-NEGOTIABLE:
  If you must cut something short, cut BACKEND service methods — NOT frontend pages.
  Users interact with frontend pages. Backend without frontend is useless.

╔══════════════════════════════════════════════╗
║  COMPLETENESS CHECK — VERIFY BEFORE OUTPUT   ║
╚══════════════════════════════════════════════╝

✓ server.ts registers routes for EVERY module (not just auth)
✓ Navbar.tsx has links to EVERY module list page
✓ dashboard.tsx calls real API endpoints and shows live data
✓ Every module has 5 backend files + 3 frontend pages + 1 service
✓ _app.tsx wraps entire app with AuthProvider

╔══════════════════════════════════════════════════╗
║  CRITICAL — COMPLETE APPLICATION RULES           ║
╚══════════════════════════════════════════════════╝

You MUST follow these rules or the application is BROKEN:

1. EVERY frontend service file must have REAL working axios calls.
   ❌ NEVER use commented-out code like "// await service.create(data)"
   ✅ ALWAYS use real calls like "await petsService.create(data)"

2. EVERY list page (pages/[module]/index.tsx) must:
   - Import the module's service file
   - Call service.getAll() in useEffect and render results in a table
   - Have working delete with service.remove(id)
   - Have a "+ New" button linking to the create page

3. EVERY create form page (pages/[module]/new.tsx) must:
   - Import the module's service file
   - Call service.create(formData) on submit
   - Redirect to the list page on success
   - Show domain-specific form fields (NOT generic title/description)

4. EVERY edit page (pages/[module]/[id]/edit.tsx) must:
   - Load existing data with service.getById(id) on mount
   - Pre-fill form with loaded data
   - Call service.update(id, formData) on submit

5. The dashboard MUST:
   - Import services from ALL modules (not just one)
   - Fetch and display stats meaningful to the specific app
   - Show recent items from the primary module

6. The Navbar MUST have links to EVERY module's list page.

7. Auth is ONE module — the app has MANY other modules.
   If the user asks for a pet care app, the MAIN content is pets,
   appointments, medications — NOT the login page.

8. Use DOMAIN-SPECIFIC field names in Mongoose models and forms.
   ❌ WRONG: { title: String, description: String, status: String }
   ✅ RIGHT: { name: String, species: String, breed: String, weight: Number }

9. Generate AT LEAST 30 files total. Complex apps need 45-60 files.
   If you generate fewer than 25 files, the app is INCOMPLETE.

10. GENERATE FILES IN MODULE ORDER:
    For each domain module, output its backend files AND frontend pages
    TOGETHER before moving to the next module. DO NOT generate all
    backend files first — this causes frontend pages to be cut off.
✓ globals.css defines CSS variables for the design system
✓ Both package.json files have correct dependencies
✓ index.tsx redirects logged-in users to /dashboard, others to /login
✓ Edit pages pre-fill form data by fetching the item by ID first
✓ All form submissions have error handling and loading state

IF server.ts is missing any module route → WRONG.
IF dashboard.tsx has no real API calls → WRONG.
IF any module is missing list page OR form page → WRONG.
IF total file count is under 25 → INCOMPLETE.

CRITICAL: Return ONLY raw JSON. No markdown. No explanation.
Start with { and end with }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — REFINE PROMPT (much stronger than v1)
// ─────────────────────────────────────────────────────────────────────────────

export function buildRefinePrompt(
  previousFiles: Array<{ path: string; content: string }>,
  refinementRequest: string,
  projectName?: string
): string {
  // Show up to 30 files, truncate large ones individually
  const fileContext = previousFiles
    .slice(0, 30)
    .map(f => {
      const truncated = f.content.length > 2000
        ? f.content.slice(0, 2000) + '\n// ... [file continues — not shown for brevity]'
        : f.content;
      return `\n// ══ ${f.path} ══\n${truncated}`;
    })
    .join('\n');

  const fileList = previousFiles.map(f => `  - ${f.path}`).join('\n');

  return `You are an expert full-stack developer refining an existing application.

PROJECT: ${projectName || 'my-app'}
TOTAL FILES IN PROJECT: ${previousFiles.length}

ALL FILES IN THIS PROJECT:
${fileList}

KEY FILE CONTENTS (for context):
${fileContext}

REFINEMENT REQUEST:
"${refinementRequest}"

RULES:
1. Apply ONLY the requested change. Do not remove existing features.
2. If adding a new module: include all 5 backend files + 3 frontend pages + 1 service.
3. If adding new routes: update server.ts to register them.
4. If adding new pages: update Navbar.tsx to link to them.
5. Return ONLY files that you are creating or changing.
   Files you are NOT touching do not need to be included.
6. Keep the same JSON output format.
7. Return ONLY raw JSON. No markdown. Start with { end with }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — DESIGN-TO-CODE PROMPT
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_DESIGN_TO_CODE = `You are an expert React + Tailwind CSS developer.

Convert the provided UI design into a complete, production-ready React component.

RULES:
- Next.js Pages Router syntax (no "use client", no app/ directory patterns)
- Tailwind CSS only — no CSS modules, no styled-components
- All TypeScript interfaces included inline
- Default export only
- All sub-components inline in the same file
- Responsive (mobile-first: sm: md: lg:)
- WCAG AA contrast on all text
- Smooth transitions on interactive elements
- Loading and error states included where appropriate

Return only the TypeScript component code. No markdown. No explanation.`;

export function buildDesignToCodePrompt(
  designJSON: object,
  designDescription?: string
): string {
  return `${SYSTEM_PROMPT_DESIGN_TO_CODE}

${designDescription ? `DESIGN DESCRIPTION: "${designDescription}"\n\n` : ''}DESIGN SPECIFICATION:
${JSON.stringify(designJSON, null, 2)}

Generate the complete React + Tailwind component now.
Return only TypeScript — no markdown fences, no explanation.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — REQUIREMENTS PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

export function buildRequirementsQuestionsPrompt(
  userIdea: string,
  selectedModules: string[]
): string {
  return `You are a senior product engineer interviewing a user before building their web application.

User's idea: "${userIdea}"
Selected modules: ${selectedModules.join(', ') || 'auth'}

Generate 3 to 5 targeted questions to gather everything needed to build this app correctly.
Questions must be SPECIFIC to this app type — not generic.

Categories:
  "users"     — who uses this and why
  "features"  — must-have vs nice-to-have specifics
  "design"    — visual style, light/dark theme, brand feel
  "technical" — payment provider, integrations, third-party services
  "scope"     — MVP vs full product, personal vs business launch

RULES:
1. Return ONLY valid JSON. No markdown. No preamble. No explanation.
2. "projectName": lowercase, hyphens only, max 30 chars, NO conversational phrases.
3. "appType": exactly one of: e-commerce | blog | dashboard | social | saas |
   portfolio | auth | analytics | booking | marketplace | other
4. Questions must be conversational — not form labels.
5. "hint": a short example answer used as input placeholder.
6. MUST generate 3 to 5 questions. Never fewer than 3.
7. At least 3 must have required: true.
8. Questions must reflect THIS specific app type.

Return ONLY this JSON and nothing else:
{
  "appType": "string",
  "projectName": "string",
  "questions": [
    {
      "id": "q1",
      "question": "Conversational question specific to this app",
      "hint": "e.g. example answer",
      "category": "users | features | design | technical | scope",
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

  return `You are a senior software architect compiling a structured requirements document.

Original idea: "${originalPrompt}"
Project name: ${projectName}
Modules: ${selectedModules.join(', ')}

User answers:
${answersText}

RULES:
1. Return ONLY valid JSON. No markdown. No preamble.
2. "coreFeatures": concrete actionable feature strings, max 8.
   SPECIFIC: "Stripe payment checkout" not "payments".
   SPECIFIC: "Admin panel to manage products" not "admin".
3. "themeMode": exactly one of: light | dark | hybrid | any
4. "scale": exactly one of: personal | startup | enterprise
5. "compiledSummary": 2–4 sentences, plain English, starts with "You're building".
6. Infer values for unanswered fields. Never leave any field empty.
7. "techPreferences": single string summarising all tech choices mentioned.
8. "designPreference": single string describing visual style.

Return ONLY this JSON:
{
  "originalPrompt": "string",
  "projectName": "string",
  "appType": "string",
  "targetUsers": "string",
  "coreFeatures": ["specific feature 1", "specific feature 2"],
  "designPreference": "string",
  "themeMode": "light | dark | hybrid | any",
  "scale": "personal | startup | enterprise",
  "techPreferences": "string",
  "additionalNotes": "string",
  "answers": ${JSON.stringify(answers)},
  "compiledSummary": "You're building..."
}`;
}