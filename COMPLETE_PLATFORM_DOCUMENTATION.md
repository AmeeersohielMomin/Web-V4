# 🚀 IDEA Platform — Complete Documentation

**Version:** 1.0  
**Last Updated:** March 18, 2026  
**Status:** Production-Ready  

---

## 📋 Table of Contents

1. [Platform Overview](#platform-overview)
2. [Core Features](#core-features)
3. [AI Generation System](#ai-generation-system)
4. [Template System](#template-system)
5. [Design Studio](#design-studio)
6. [5-Step Builder Flow](#5-step-builder-flow)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)
9. [Database Models](#database-models)
10. [API Endpoints](#api-endpoints)
11. [Environment Configuration](#environment-configuration)
12. [Installation & Setup](#installation--setup)
13. [Running the Platform](#running-the-platform)
14. [Feature Flags](#feature-flags)
15. [Security Implementation](#security-implementation)
16. [Deployment Options](#deployment-options)

---

## Platform Overview

### What is IDEA?

**IDEA** is a **Production-Grade Full-Stack Application Builder** that enables users to generate, customize, and deploy complete applications without coding. It combines:

- **AI-Powered Code Generation:** Uses OpenAI, Google Gemini, Anthropic Claude, and local Ollama models
- **Live Preview System:** Real-time visualization of generated code in a secure sandbox
- **Professional Template System:** Pre-built UI templates (Minimal, Modern, Classic)
- **Multi-Database Support:** MongoDB, PostgreSQL, MySQL, and Session-Based authentication
- **Instant Deployment:** Download as ZIP or push directly to GitHub

### Target Users

- Startup founders building MVPs rapidly
- Developers prototyping ideas quickly
- Teams building internal tools and dashboards
- Educators demonstrating full-stack architecture

### Market Positioning

IDEA is a **no-code/low-code platform** that leverages advanced AI to generate production-ready code, eliminating months of development time while maintaining professional quality standards.

---

## Core Features

### ✨ Feature List

#### **1. AI Code Generation**
- Multi-provider support (OpenAI, Google Gemini, Anthropic, Ollama)
- Seeded design diversity to prevent repetitive output
- Vibrant color palettes with professional design direction
- Full-stack generation (backend + frontend)
- Module-based architecture (extensible beyond Auth)

#### **2. Live Preview System**
- Real-time visualization of generated code
- Secure sandbox execution environment
- Support for React, TypeScript, and Tailwind CSS
- iframe-based isolation with strict navigation controls
- Automatic module mocking (React, Next.js, axios, lucide)
- Source sanitization for malformed AI output

#### **3. Professional Template System**
- **3 UI Variants:**
  - Minimal: Clean white design with simple forms
  - Modern: Glassmorphism with gradients and animations
  - Classic: Split-screen professional enterprise layout
- **3 Page Types:**
  - Login page
  - Signup page
  - Dashboard (coming soon)
- **Live Preview:** Interactive showcase with side-by-side comparisons

#### **4. Design Studio**
- **Visual Design Components:**
  - Gradient backgrounds and animations
  - Card layouts with shadow and depth
  - Professional typography hierarchy
  - Tailwind CSS utility configuration
  - Dark mode support
- **Color System:**
  - 10+ vibrant professional palettes
  - Automatic color contrast validation (WCAG AA)
  - Dynamic theme mode (light/dark/hybrid)
  - CSS variable generation

#### **5. Module System**
- **Authentication Module (Current):**
  - Email/password signup
  - Email/password login
  - JWT token management
  - User session endpoints
  - Role-based access control
- **Future Modules:**
  - Blog/CMS module
  - E-commerce module
  - Analytics module
  - Payment processing module

#### **6. Backend Implementation Options**
- **Database Support:**
  - MongoDB with Mongoose ORM
  - PostgreSQL with pg pool
  - MySQL with mysql2
  - Session-based with Redis
- **Authentication Methods:**
  - JWT (stateless)
  - Session-based (stateful)
  - OAuth 2.0 (coming soon)

#### **7. Deployment Options**
- **Download:** ZIP file with complete project
- **GitHub Integration:** Direct push to GitHub repository
- **Environment Configuration:** Pre-generated .env files
- **Package Manager:** npm/yarn ready configuration

---

## AI Generation System

### How AI Generation Works

#### **1. Generation Pipeline**

```
User Request
    ↓
Provider Selection (OpenAI/Gemini/Anthropic/Ollama)
    ↓
Seeded Design DNA Generation
    ↓
System Prompt + Full Prompt Construction
    ↓
Streaming Response from AI Model
    ↓
File Extraction & JSON Parsing
    ↓
Quality Gate Evaluation
    ↓
Auto-Retry with Enhanced Prompt (if quality fails)
    ↓
File Transfer to Frontend
    ↓
Live Preview Rendering
```

#### **2. Design DNA System**

The Design DNA is a seeded random selection system that ensures diverse, professional outputs:

**Design DNA Dimensions:**

- **Layout Archetype:**
  - Editorial split-screen with oversized headings
  - Minimal bento grid with asymmetrical proportions
  - Dashboard with modular blocks and sticky rail
  - Storytelling hero-first flow
  - Compact productivity layout
  - Neo-brutalist block layout
  - Soft rounded SaaS layout

- **Color Palettes (10 Options):**
  - `vibrant-indigo`: primary=indigo-600, secondary=indigo-100, accent=cyan-500
  - `bold-blue`: primary=blue-600, secondary=blue-50, accent=orange-500
  - `emerald-pro`: primary=emerald-600, secondary=emerald-50, accent=purple-600
  - `ruby-modern`: primary=rose-600, secondary=rose-50, accent=amber-500
  - `teal-tech`: primary=teal-600, secondary=teal-50, accent=lime-500
  - `purple-premium`: primary=purple-600, secondary=purple-50, accent=pink-500
  - `slate-pro`: primary=slate-700, secondary=slate-100, accent=blue-600
  - `violet-vibrant`: primary=violet-600, secondary=violet-50, accent=amber-500
  - `cyan-modern`: primary=cyan-600, secondary=cyan-50, accent=rose-600
  - `green-fresh`: primary=green-600, secondary=green-50, accent=violet-600

- **Theme Mode:**
  - Light professional
  - Dark professional
  - Hybrid light-with-dark-sections
  - Neutral daylight palette
  - High-contrast enterprise

- **Typography Mood:**
  - High-contrast editorial
  - Technical mono-accent
  - Clean geometric sans
  - Friendly rounded sans
  - Elegant condensed headings
  - Modern grotesk with bold display

- **Surface Treatment:**
  - Flat matte panels with subtle borders
  - Soft translucent glass with layered depth
  - Paper-like cards with gentle shadows
  - High-contrast blocks with sharp edges
  - Gradient-tinted panels with restrained glow

- **Motion Profile:**
  - Subtle fade and rise on first paint
  - Snappy 120-180ms transitions
  - Staggered reveal for cards and lists
  - Minimal motion with emphasis on hover states
  - Spring-based micro-interactions

#### **3. Quality Gate System**

**Auth UI Quality Checks:**

Generated auth UIs are automatically evaluated for:

- **Layout Quality:**
  - Viewport-filling (min-h-screen)
  - Proper container width (max-w-md to max-w-lg)
  - Meaningful padding (p-6 to p-10)
  - Readable typography (text-3xl+ for headings)
  - Visual depth (shadows, borders, rounded corners)

- **Form Control Quality:**
  - Input height (h-11 minimum)
  - Input spacing (space-y-4 to space-y-6 between controls)
  - Button styling with colors and hover states
  - Input borders and focus rings
  - Form accessibility

- **Color System Quality:**
  - Vibrant professional colors (not gray/neutral dominated)
  - WCAG AA contrast compliance
  - Primary + secondary + accent color usage
  - Coherent palette composition

- **Visual Polish:**
  - No placeholder text ("Compiling", "Loading chunks")
  - No unstyled HTML controls
  - No micro-scale UI blocks
  - Professional SaaS-like appearance

**Auto-Retry Logic:**

If generated code fails quality checks:
1. Generation system detects failures
2. Sends failure reasons to AI with enhanced prompt
3. AI regenerates with explicit fixes
4. Uses improved output if quality passes or matches

#### **4. Prompt Engineering**

**System Prompt:**
```
You are an expert full-stack developer for the IDEA platform — 
a production-grade application builder. Your code must follow 
EXACT architectural patterns trained from real production code.
```

**Key Prompt Components:**

- **Backend Architecture Rules:**
  - Zod schema validation
  - Express routes with controller pattern
  - Service layer with business logic
  - Mongoose models with timestamps
  - Consistent API response format

- **Frontend Architecture Rules:**
  - React components with TypeScript
  - Axios for API communication
  - Service layer pattern for API calls
  - Next.js routing conventions
  - Tailwind CSS for styling

- **Visual Design Rules:**
  - Large, readable typography (text-3xl+ for headings)
  - Generous spacing (p-6 to p-12 padding)
  - Professional color systems from design DNA
  - Hover and focus states
  - Dark mode support

- **Quality Standards:**
  - Production-ready error handling
  - Input validation on all endpoints
  - Security best-practice permissions
  - Accessible color contrast (WCAG AA+)
  - Mobile-responsive design

#### **5. Supported AI Providers**

**OpenAI:**
- Models: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
- Requires: User API key
- Cost: Pay-per-use
- Speed: Medium to Fast
- Quality: Highest

**Google Gemini:**
- Models: gemini-2.5-flash, gemini-1.5-pro
- Free Tier: Platform-managed API key (rate limited)
- Or: User API key (BYOK)
- Speed: Very Fast
- Quality: High

**Anthropic Claude:**
- Models: Claude 3.5 Sonnet, Claude 3 Haiku
- Requires: User API key
- Speed: Medium
- Quality: Highest
- Strength: Complex instruction following

**Ollama (Local):**
- Models: llama3.2 and compatible
- Runs: Locally on your machine
- Free: No API costs
- Speed: Depends on hardware
- Quality: Good for local development

#### **6. Generation Response Format**

Generated responses follow a strict JSON structure:

```json
{
  "projectName": "my-app",
  "description": "A full-stack authentication application",
  "files": [
    {
      "path": "backend/src/modules/auth/auth.service.ts",
      "content": "... complete file content ...",
      "language": "typescript"
    },
    {
      "path": "frontend/pages/login.tsx",
      "content": "... complete file content ...",
      "language": "typescript"
    }
  ],
  "envVars": {
    "backend": {
      "DATABASE_URL": "mongodb://...",
      "JWT_SECRET": "..."
    },
    "frontend": {
      "NEXT_PUBLIC_API_URL": "http://localhost:5000"
    }
  }
}
```

---

## Template System

### Overview

The template system provides pre-built UI designs that can be instantly generated with different backend configurations.

### 3 UI Template Variants

#### **1. Minimal Template**
- **Design:** Clean, simple white design
- **Colors:** Neutral grays with single accent color
- **Typography:** Standard sans-serif, minimal decoration
- **Spacing:** Compact but readable
- **Use Case:** MVP, prototype, simple forms
- **File Location:** `frontend/templates/auth/variants/minimal/`

**Components:**
```
Login.tsx
├── Min-height viewport (min-h-screen)
├── Centered login card (max-w-md)
├── Email input field
├── Password input field
├── "Login" button
└── "Sign Up" link
```

#### **2. Modern Template**
- **Design:** Glassmorphism with gradients and animations
- **Colors:** Vibrant primary + accent colors with gradients
- **Typography:** Bold headings, gradient text effects
- **Effects:** Animations, blur backgrounds, layered depth
- **Use Case:** SaaS, modern apps, vibrant branding
- **File Location:** `frontend/templates/auth/variants/modern/`

**Components:**
```
Login.tsx
├── Gradient background (animated)
├── Glassmorphic card (backdrop-blur)
├── Animated heading with gradient
├── Form with colored inputs
├── Gradient CTA button
└── Animated link
```

**Modern Design Foundation:**
- **Background:** Linear gradient from primary-50 to secondary-50
- **Card:** Rounded-2xl, shadow-2xl, border with accent color
- **Heading:** Gradient text, text-3xl to text-4xl
- **Input:** Colored border on focus, ring effect
- **Button:** Primary color gradient, hover scale
- **Effects:** transition-all duration-200, hover:shadow-lg

#### **3. Classic Template**
- **Design:** Split-screen professional enterprise layout
- **Colors:** Professional palette (blue, slate, white)
- **Typography:** Traditional, formal, readable
- **Layout:** Hero section + form section side-by-side
- **Use Case:** Enterprise, banking, professional services
- **File Location:** `frontend/templates/auth/variants/classic/`

**Components:**
```
Login.tsx
├── Split layout (grid md:grid-cols-2)
├── Left side: Hero section
│   ├── Brand logo
│   ├── Value proposition
│   └── Trust indicators
└── Right side: Login form
    ├── Large heading
    ├── Form fields
    ├── CTA button
    └── Security badge
```

**Classic Design Foundation:**
- **Layout:** Two-column split (hidden on mobile)
- **Hero Side:** Gradient or image background
- **Form Side:** White background with generous padding
- **Heading:** text-3xl bold, professional color
- **Form Width:** min-h-screen centering
- **Button:** Solid professional color, minimal decoration

### Template Features Matrix

| Feature | Minimal | Modern | Classic |
|---------|---------|--------|---------|
| **Complexity** | Low | High | Medium |
| **Animation** | None | Heavy | Subtle |
| **Color Usage** | 1-2 colors | 3-4 colors | 2-3 colors |
| **Responsive** | Yes | Yes | Yes |
| **Dark Mode** | No | Yes | Yes |
| **Glassmorphism** | No | Yes | No |
| **Split Layout** | No | No | Yes |
| **Load Time** | Fastest | Slower* | Fast |

*Modern template uses more CSS, hence slightly slower initial load.

### Page Types Included

#### **Login Page (login.tsx)**
- Email input with validation
- Password input with show/hide toggle
- "Remember me" checkbox
- Submit button
- "Sign up" link
- Form error handling
- Loading state

#### **Signup Page (signup.tsx)**
- Email input with validation
- Password input with requirements
- Password confirmation field
- Terms & conditions checkbox
- Submit button
- "Login" link
- Form error handling
- Loading state

#### **Dashboard Page (coming soon)**
- Sidebar navigation
- Header with user menu
- Main content area
- Cards and widgets
- Charts and analytics
- Settings panel

---

## Design Studio

### Overview

The Design Studio is a comprehensive system for creating visually professional, branded auth interfaces with advanced color systems and accessibility standards.

### Visual Design Components

#### **1. Global Design Foundation**

**CSS Variables (`globals.css`):**
```css
:root {
  /* Color System */
  --primary: #primary-600;
  --secondary: #secondary-50;
  --accent: #accent-500;
  
  /* Typography */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: monospace;
  
  /* Spacing Scale */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary: #primary-500;
    --secondary: #neutral-900;
  }
}
```

#### **2. Auth Form Component Design**

**Page Container:**
```css
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, var(--secondary), #next-shade);
}
```

**Form Card:**
```css
.auth-card {
  max-width: 32rem; /* max-w-md to max-w-lg */
  padding: 2rem; /* p-8 to p-12 */
  border-radius: 1.5rem;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(var(--accent-rgb), 0.2);
  background: white;
}

@media (max-width: 640px) {
  .auth-card {
    max-width: 100%;
    margin: 1rem;
  }
}
```

**Form Typography:**
```css
.auth-heading {
  font-size: 1.875rem; /* text-3xl */
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

@media (min-width: 768px) {
  .auth-heading {
    font-size: 2.25rem; /* text-4xl */
  }
}

.auth-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.auth-subheading {
  font-size: 1rem;
  color: #718096;
  margin-bottom: 1.5rem;
}
```

**Form Controls:**
```css
.auth-input {
  width: 100%;
  height: 3rem; /* h-12 */
  padding: 0.75rem 1rem;
  border: 2px solid rgba(var(--primary-rgb), 0.2);
  border-radius: 0.5rem;
  font-family: inherit;
  transition: all 200ms;
}

.auth-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.auth-input::placeholder {
  color: #cbd5e0;
}

.auth-button {
  width: 100%;
  height: 3rem; /* h-12 */
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 200ms;
  margin-top: 1.5rem;
}

.auth-button:hover {
  opacity: 0.9;
  box-shadow: 0 10px 15px rgba(var(--primary-rgb), 0.3);
}

.auth-button:active {
  transform: scale(0.98);
}

.auth-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.3);
}

.auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### **3. Color System Implementation**

**Primary Color Usage:**
- Page heading (text)
- Form labels (text)
- Input focus states (border)
- CTA button (background)
- Card border tint (rgba)
- Shadow tint (rgba)

**Secondary Color Usage:**
- Page background (solid or gradient)
- Card background (light tint)
- Divider lines (low opacity)
- Neutral text fallback

**Accent Color Usage:**
- Focus ring on inputs
- Success messages
- Links and interactive elements
- Button hover states
- Visual emphasis

**Neutral/Gray Usage:**
- Body text
- Placeholder text
- Disabled states
- Borders (low opacity)

**Example Color System (Vibrant Indigo):**
```css
:root {
  /* Vibrant Indigo Palette */
  --primary: #4f46e5; /* indigo-600 */
  --secondary: #f0f4ff; /* indigo-50 */
  --accent: #06b6d4; /* cyan-500 */
  
  /* Supporting colors */
  --success: #10b981; /* emerald-600 */
  --danger: #ef4444; /* red-500 */
  --warning: #f59e0b; /* amber-500 */
}

/* Page background gradient */
.auth-page {
  background: linear-gradient(135deg, #f0f4ff 0%, #ecfdf5 100%);
}

/* Form card with colored elements */
.auth-card {
  background: white;
  border: 2px solid rgba(6, 182, 212, 0.2); /* cyan accent */
  box-shadow: 0 20px 25px rgba(79, 70, 229, 0.1); /* indigo shadow */
}
```

#### **4. Dark Mode Support**

**Automatic Dark Mode:**
```css
@media (prefers-color-scheme: dark) {
  :root {
    --primary: #818cf8; /* indigo-500 (brighter) */
    --secondary: #1f2937; /* gray-800 */
  }
  
  .auth-page {
    background: linear-gradient(135deg, #1e293b 0%, #172554 100%);
  }
  
  .auth-card {
    background: #111827;
    color: #f3f4f6;
  }
}

/* Or explicit dark: prefix in Tailwind */
.auth-page {
  @apply bg-white dark:bg-neutral-950;
}

.auth-card {
  @apply bg-white dark:bg-neutral-900;
}
```

#### **5. Accessibility Features**

**Color Contrast:**
- All text meets WCAG AA (4.5:1 minimum)
- Interactive elements clearly distinguishable
- Focus states provide 3:1 contrast

**Focus States:**
```css
.auth-input:focus-visible,
.auth-button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

**Responsive Typography:**
```css
.auth-heading {
  font-size: clamp(1.5rem, 5vw, 2.25rem);
}

.auth-label {
  font-size: clamp(0.75rem, 2vw, 0.875rem);
}
```

**Mobile Optimization:**
```css
@media (max-width: 640px) {
  .auth-card {
    padding: 1.5rem; /* p-6 on mobile */
  }
  
  .auth-input,
  .auth-button {
    height: 2.75rem; /* h-11 on mobile */
    font-size: 16px; /* Prevent zoom on input focus */
  }
}
```

#### **6. Animation & Transitions**

**Entrance Animations:**
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-card {
  animation: fadeInUp 0.6s ease-out;
}
```

**Interactive Transitions:**
```css
.auth-button {
  transition: all 200ms ease-in-out;
}

.auth-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(var(--primary-rgb), 0.2);
}

.auth-input {
  transition: border-color 150ms, box-shadow 150ms;
}
```

**Loading States:**
```css
.auth-button.loading {
  position: relative;
  color: transparent;
}

.auth-button.loading::after {
  content: '';
  position: absolute;
  width: 1rem;
  height: 1rem;
  top: 50%;
  left: 50%;
  margin-left: -0.5rem;
  margin-top: -0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 5-Step Builder Flow

### Overview

The 5-Step Builder guides users through creating a complete full-stack application with a structured, intuitive interface.

### Builder Architecture

```
┌─────────────────────────────────────────┐
│        5-Step Builder Interface          │
├─────────────────────────────────────────┤
│  Progress Indicator (5 circles)          │
│  ✅ Step 1 │ → │ 2 │ → │ 3 │ → │ 4 │ → │ 5
├─────────────────────────────────────────┤
│  Page Content                           │
│  ├─ Current step UI                     │
│  ├─ Back button (except step 1)         │
│  └─ Continue/Next button                │
├─────────────────────────────────────────┤
│  localStorage State                     │
│  {                                      │
│    projectName: string,                 │
│    modules: string[],                   │
│    templates: Record<string, string>,   │
│    backends: Record<string, string>     │
│  }                                      │
└─────────────────────────────────────────┘
```

### Step-by-Step Flow

#### **Step 1: Project Name** (`/builder/new`)

**Purpose:** Get project name and initialize builder state

**Page Layout:**
```
Hero Section
├─ "Create Your Full-Stack App"
├─ "Give your project a name to get started"
│
Input Section
├─ Text input: "Project name"
└─ Placeholder: "e.g. MyAwesomeApp"
│
CTA Section
├─ "Continue to Module Selection →" button
└─ Progress: 1 of 5
```

**User Actions:**
1. Enter project name (e.g., "MyApp")
2. Click "Continue"
3. localStorage saves `{ projectName: "MyApp" }`
4. Redirects to `/builder/select-modules`

**Validation:**
- Project name is required (min 1 char)
- Project name is alphanumeric + hyphens (no spaces)
- Provides clear error messages

**localStorage Update:**
```javascript
{
  projectName: "MyApp"
}
```

#### **Step 2: Select Modules** (`/builder/select-modules`)

**Purpose:** Choose features/modules for the application

**Page Layout:**
```
Header
├─ "Select Modules"
├─ "Choose features to include in your app"
├─ Progress: ✅ → 2 of 5
│
Module Cards (Grid)
├─ Auth Module (current)
│  ├─ Icon & name
│  ├─ Description
│  ├─ Checkbox: selected
│  └─ Feature list
├─ Blog Module (coming soon)
├─ E-commerce Module (coming soon)
└─ Analytics Module (coming soon)
│
CTA Section
├─ "Back" button
└─ "Next: Select Templates →" button
```

**Available Modules:**
- ✅ **Auth** (Production-Ready)
  - Email/password signup
  - Email/password login
  - JWT token management
  - User sessions
  - Fully functional

- **Blog** (Coming Soon)
  - Posts CRUD
  - Comments system
  - Tags & categories
  - Full-text search

- **E-commerce** (Coming Soon)
  - Product catalog
  - Shopping cart
  - Order management
  - Payment integration

- **Analytics** (Coming Soon)
  - Events tracking
  - Dashboard
  - Reports

**User Actions:**
1. See all available modules
2. Check/uncheck modules
3. Click "Next"
4. localStorage adds modules list
5. Redirects to `/builder/select-templates`

**localStorage Update:**
```javascript
{
  projectName: "MyApp",
  modules: ["auth"]
}
```

#### **Step 3: Select Templates** (`/builder/select-templates`)

**Purpose:** Choose UI design templates for each module

**Page Layout:**
```
Header
├─ "Choose UI Templates"
├─ "Select design style for your app"
├─ Progress: ✅ → ✅ → 3 of 5
├─ "View Full Template Showcase →" link
│
Template Cards (Grid 3 columns)
├─ Minimal Template
│  ├─ Preview screenshot
│  ├─ "Live Preview →" button (opens in new tab)
│  ├─ Description
│  ├─ Feature checkmarks
│  └─ Selection indicator
├─ Modern Template (with glassmorphism preview)
└─ Classic Template (with split-screen preview)
│
CTA Section
├─ "Back" button
└─ "Next: Backend Options →" button
```

**Template Details:**

**Minimal:**
- Clean white design
- Simple, fast-loading
- Great for MVP
- Best for: Quick prototypes

**Modern:**
- Glassmorphism + gradients
- Animated interactions
- Vibrant brand colors
- Best for: SaaS, modern apps

**Classic:**
- Split-screen layout
- Professional styling
- Enterprise-ready
- Best for: Traditional apps

**User Actions:**
1. See 3 template cards with previews
2. Click "Live Preview" to see full design (new tab)
3. Click card to select (purple border + checkmark)
4. Click "Next"
5. localStorage adds template choice
6. Redirects to `/builder/select-backend`

**localStorage Update:**
```javascript
{
  projectName: "MyApp",
  modules: ["auth"],
  templates: {
    auth: "modern"
  }
}
```

#### **Step 4: Select Backend** (`/builder/select-backend`)

**Purpose:** Choose database and authentication implementation

**Page Layout:**
```
Header
├─ "Configure Backend"
├─ "Choose database and auth method"
├─ Progress: ✅ → ✅ → ✅ → 4 of 5
│
Backend Options (Grid 4 columns)
├─ JWT + MongoDB
│  ├─ Icon & name
│  ├─ "NoSQL database"
│  ├─ "Stateless JWT auth"
│  ├─ "Best for: Scalability"
│  └─ Selection indicator
├─ JWT + PostgreSQL
│  ├─ Traditional SQL
│  ├─ Strong typing
│  └─ Best for: Complex queries
├─ JWT + MySQL
│  ├─ SQL compatibility
│  ├─ Wide hosting support
│  └─ Best for: Shared hosting
└─ Session + Redis
   ├─ Stateful sessions
   ├─ In-memory cache
   └─ Best for: Sessions
│
CTA Section
├─ "Back" button
└─ "Next: Deployment Options →" button
```

**Backend Options:**

| Option | Database | Auth Type | Best For |
|--------|----------|-----------|----------|
| **JWT + MongoDB** | NoSQL (Mongoose) | JWT tokens | Scalability, microservices |
| **JWT + PostgreSQL** | SQL (pg pool) | JWT tokens | Complex schemas, transactions |
| **JWT + MySQL** | SQL (mysql2) | JWT tokens | Shared hosting, traditional |
| **Session + Redis** | In-memory (Redis) | Sessions | Real-time, caching |

**User Actions:**
1. See 4 backend option cards
2. Click a card to select (highlighted border)
3. See details: database type, auth method, use case
4. Click "Next"
5. localStorage adds backend choice
6. Redirects to `/builder/deployment`

**localStorage Update:**
```javascript
{
  projectName: "MyApp",
  modules: ["auth"],
  templates: {
    auth: "modern"
  },
  backends: {
    auth: "jwt-mongodb"
  }
}
```

#### **Step 5: Deployment Options** (`/builder/deployment`)

**Purpose:** Generate and deploy the application

**Page Layout:**
```
Header
├─ "Deploy Your App"
├─ "Choose how to get your code"
├─ Progress: ✅ → ✅ → ✅ → ✅ → 5 of 5
│
Project Summary
├─ Project name: MyApp
├─ Modules: Auth
├─ Template: Modern
├─ Backend: JWT + MongoDB
├─ Generated files: 23 files
├─ Backend build: TypeScript + Express
└─ Frontend build: Next.js + React + Tailwind
│
Deployment Options
├─ Download ZIP
│  ├─ Icon: ↓
│  ├─ Description: "Download complete project as ZIP"
│  ├─ "What's included": List of files
│  └─ "Download →" button
│
├─ Push to GitHub
│  ├─ Icon: GitHub logo
│  ├─ Description: "Push directly to GitHub repo"
│  ├─ "Create new repo or select existing"
│  ├─ GitHub auth required
│  └─ "Push to GitHub →" button
│
└─ CTA Section
   ├─ "Back" button
   └─ "Generate & [Deploy]" button
```

**Download ZIP Includes:**
```
my-app/
├─ backend/
│  ├─ src/
│  │  ├─ modules/auth/
│  │  ├─ config/
│  │  └─ server.ts
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ .env.example
│  └─ README.md
│
├─ frontend/
│  ├─ pages/
│  │  ├─ login.tsx
│  │  └─ signup.tsx
│  ├─ components/
│  ├─ pages/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ tailwind.config.js
│  └─ README.md
│
└─ SETUP.md
```

**User Actions:**
1. See deployment options
2. Either:
   - Click "Download ZIP" → automatic ZIP download
   - Click "Push to GitHub" → OAuth flow → repo created
3. Get complete, ready-to-run project
4. Follow setup instructions

**localStorage Final State:**
```javascript
{
  projectName: "MyApp",
  modules: ["auth"],
  templates: {
    auth: "modern"
  },
  backends: {
    auth: "jwt-mongodb"
  }
}
```

### Progress Indicator Component

**Visual Design:**
```
Step 1          Step 2          Step 3
  ✅              →              ⭕
Project      Modules        Templates
  Name       Selection      Selection

Step 4          Step 5
  ⭕              ⭕
Backend        Deploy
Options       Options

Legend:
✅ = Completed (green)
→  = Arrow connector
⭕ = Current/upcoming (neutral)
```

**Responsive Behavior:**
- Desktop: Horizontal progress bar
- Mobile: Vertical stacked circles with step names

### Data Flow Diagram

```
Step 1 (new.tsx)
    ↓
Save projectName → localStorage
    ↓
Step 2 (select-modules.tsx)
    ↓
Load projectName, add modules → localStorage
    ↓
Step 3 (select-templates.tsx)
    ↓
Load project + modules, add templates → localStorage
    ↓
Step 4 (select-backend.tsx)
    ↓
Load full state, add backends → localStorage
    ↓
Step 5 (deployment.tsx)
    ↓
Load final state, call API
    ↓
POST /api/project/generate with full config
    ↓
AI Generates complete project
    ↓
User downloads ZIP or pushes to GitHub
```

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── pages/                          # Next.js pages (routed automatically)
│   ├── _app.tsx                   # App wrapper, global config
│   ├── _document.tsx              # HTML document meta
│   ├── index.tsx                  # Home page (redirects to /home)
│   ├── home.tsx                   # Landing page
│   ├── login.tsx                  # User login
│   ├── signup.tsx                 # User registration
│   ├── dashboard.tsx              # Protected user dashboard
│   │
│   └── builder/                   # Builder flow pages
│       ├── new.tsx                # Step 1: Project name
│       ├── select-modules.tsx      # Step 2: Choose modules
│       ├── select-templates.tsx    # Step 3: Choose UI style
│       ├── select-backend.tsx      # Step 4: Choose database
│       ├── deployment.tsx          # Step 5: Deploy options
│       ├── ai-generate.tsx         # AI code generator + preview
│       ├── preview-runner.tsx      # Preview iframe sandbox
│       ├── preview.tsx             # Preview page
│       ├── choose-path.tsx         # Path selection (future)
│       └── design/
│           └── canvas.tsx          # Design studio canvas
│
├── components/                     # Reusable React components
│   └── AuthForm.tsx               # Shared auth UI component
│
├── templates/                      # Feature-specific templates
│   └── auth/                      # Auth module templates
│       ├── pages/
│       │   ├── login.tsx
│       │   └── signup.tsx
│       ├── components/
│       │   └── AuthForm.tsx
│       ├── services/
│       │   └── auth.service.ts
│       └── variants/              # UI design variants
│           ├── minimal/
│           │   ├── Login.tsx
│           │   └── Signup.tsx
│           ├── modern/
│           │   ├── Login.tsx
│           │   └── Signup.tsx
│           └── classic/
│               ├── Login.tsx
│               └── Signup.tsx
│
├── styles/                        # Global styles
│   └── globals.css               # Tailwind + custom CSS
│
├── config/                        # Configuration
│   └── features.ts               # Feature flags
│
├── package.json
├── tsconfig.json
├── tailwind.config.js            # Tailwind CSS configuration
├── next.config.js                # Next.js configuration
└── postcss.config.js             # PostCSS configuration
```

### Key Frontend Components

#### **1. AuthForm.tsx** (Reused Component)

```typescript
interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string | null;
  loading?: boolean;
}

export function AuthForm({ mode, onSubmit, error, loading }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Returns JSX rendering auth form
  // Uses design DNA colors and Tailwind styling
  // Includes validation, error display, loading state
}
```

#### **2. Preview Runner** (Sandbox Execution)

Purpose: Execute generated code in secure iframe

**Key Features:**
- Babel compiler for TS/JSX transformation
- Local module resolver for imports
- Framework mocks (React, Next.js, axios)
- Navigation blocking
- Source sanitization
- Sandbox communication via postMessage

**Process:**
```
Generated Code (string)
    ↓
Babel.transform(code) → CommonJS
    ↓
Execute with mocks + local require()
    ↓
Render to DOM in iframe
    ↓
Send READY signal back to parent
```

#### **3. AI Generate Page**

Purpose: Show generated code and live preview

**Layout:**
```
Top: File listing
├─ backend/...
├─ frontend/...
└─ config files

Left: Code editor
├─ Syntax-highlighted code
├─ Line numbers
└─ Copy button

Right: Live preview iframe
├─ Rendered component
├─ Error messages
└─ SANDBOX ACTIVE indicator
```

**Progressive:**
- Streaming generation shows chunks as they arrive
- Files appear in list as extracted
- Preview updates on file completion
- Real-time messaging

### Technology Stack

**Core Framework:**
- **Next.js 14:** React framework with file-based routing
- **React 18:** UI library with hooks
- **TypeScript:** Type safety and better DX

**Styling:**
- **Tailwind CSS 3:** Utility-first CSS framework
- **PostCSS:** CSS transformation tool
- **Custom CSS:** For animations, custom colors, dark mode

**HTTP Client:**
- **Axios:** HTTP requests with interceptors
- **Error handling:** Automatic error boundaries

**State Management:**
- **React Hooks:** useState, useEffect per component
- **localStorage:** Client-side state persistence
- **Next.js Router:** Navigation and route params

**Development:**
- **ESLint:** Code quality
- **Prettier:** Code formatting
- **npm:** Package management

### Frontend Routing

```
/                    → Home (redirects to /home)
/home                → Landing page
/login               → User login
/signup              → User registration
/dashboard           → Protected user area

/builder/new         → Step 1: Project name
/builder/select-modules      → Step 2: Modules
/builder/select-templates    → Step 3: Templates
/builder/select-backend      → Step 4: Backend
/builder/deployment          → Step 5: Deploy
/builder/ai-generate         → AI generation + preview
/builder/preview-runner      → Preview iframe
/builder/preview             → Preview page
/builder/design/canvas       → Design studio

/templates/preview   → Template showcase
```

---

## Backend Architecture

### Directory Structure

```
backend/
├── src/
│   ├── server.ts                  # Express app entry point
│   │
│   ├── config/
│   │   └── modules.ts             # Module enable/disable config
│   │
│   └── modules/                   # Business logic modules
│       │
│       ├── auth/                  # Authentication module
│       │   ├── auth.routes.ts     # API route definitions
│       │   ├── auth.controller.ts # Request handlers
│       │   ├── auth.service.ts    # Business logic
│       │   ├── auth.schema.ts     # Zod validation
│       │   ├── auth.model.ts      # Mongoose schema
│       │   └── implementations/   # DB-specific implementations
│       │       ├── jwt-mongodb/
│       │       ├── jwt-postgresql/
│       │       ├── jwt-mysql/
│       │       └── session-based/
│       │
│       ├── ai/                    # AI code generation module
│       │   ├── ai.routes.ts       # API routes
│       │   ├── ai.controller.ts   # Generation handlers
│       │   ├── ai.service.ts      # Provider logic
│       │   ├── ai.prompts.ts      # Prompt templates
│       │   └── ai.utils.ts        # Helper functions
│       │
│       └── project/               # Project management module
│           ├── project.routes.ts
│           ├── project.controller.ts
│           ├── project.service.ts
│           └── project.model.ts
│
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── .env.example                   # Environment template
└── README.md
```

### Module Architecture Pattern

Every module follows this consistent pattern:

```
module/
├── module.routes.ts      # Export router
│   └── router.post('/endpoint', controller.handler)
│
├── module.controller.ts  # Handle requests
│   └── handler = async (req, res) => { const data = await service.do() }
│
├── module.service.ts     # Execute logic
│   └── execute = async (input) => { const result = db.create(input); }
│
├── module.schema.ts      # Validate input (Zod)
│   └── schema = z.object({ ... })
│
└── module.model.ts       # Database schema (Mongoose)
    └── schema = new Schema({ ... })
```

**Data Flow:**
```
POST /api/auth/login
    ↓
auth.routes.ts (matched route)
    ↓
auth.controller.ts (extract body, call service)
    ↓
auth.schema.ts (validate with Zod)
    ↓
auth.service.ts (call model)
    ↓
auth.model.ts (query database)
    ↓
Response: { success: bool, data: T, error: string | null }
```

### Authentication Module

**Routes:**
```
POST   /api/auth/signup    → Create new user
POST   /api/auth/login     → Authenticate user
GET    /api/auth/me        → Get current user (protected)
```

**Controller (auth.controller.ts):**
```typescript
export class AuthController {
  signup = async (req, res) => {
    // Validate input with Zod schema
    // Call auth.service.signup()
    // Return { success, data: { user, token }, error }
  }
  
  login = async (req, res) => {
    // Validate email/password
    // Call auth.service.login()
    // Return token and user data
  }
  
  me = async (req, res) => {
    // Extract JWT from Authorization header
    // Verify token
    // Return current user
  }
}
```

**Service (auth.service.ts):**
```typescript
export class AuthService {
  async signup(input: SignupInput) {
    // Check if user exists
    // Hash password with bcrypt
    // Create user in database
    // Generate JWT token
    // Return user + token
  }
  
  async login(input: LoginInput) {
    // Find user by email
    // Compare password with bcrypt
    // Generate JWT token
    // Return user + token
  }
  
  async verifyToken(token: string) {
    // Verify JWT signature
    // Check expiration
    // Return decoded payload
  }
}
```

**Schema (auth.schema.ts):**
```typescript
export const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 chars required')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required')
});
```

**Model (auth.model.ts):**
```typescript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
```

### AI Generation Module

**Routes:**
```
POST   /api/ai/generate       → Generate full-stack code
POST   /api/ai/refine         → Refine existing code
GET    /api/ai/providers      → List available AI providers
```

**Controller (ai.controller.ts):**
- Stream generation chunks via Server-Sent Events (SSE)
- Extract JSON from potentially malformed AI responses
- Apply quality gates to generated code
- Auto-retry on quality failures
- Send file events as they're extracted
- Complete event with metadata

**Service (ai.service.ts):**
- Route to appropriate AI provider
- OpenAI, Gemini, Anthropic, Ollama
- Generate with seeded variation
- Support streaming and non-streaming
- Handle API errors and quota limits
- Temperature control for quality vs diversity

**Prompts (ai.prompts.ts):**
- System prompt: "You are expert full-stack developer"
- Design DNA generation: Seeded layout, palette, typography...
- Architecture rules: Routes, controllers, schemas pattern
- Visual design rules: Tailwind, colors, spacing
- Quality gates: Auth UI acceptance criteria
- Auto-retry prompt: Enhanced guidance for failed generation

### Project Management Module

**Routes:**
```
POST   /api/project/generate  → Create project files
POST   /api/project/download  → Get ZIP file
POST   /api/project/github    → Push to GitHub
```

**Operations:**
- Collect user selections (modules, templates, backends)
- Call AI service to generate code
- Organize files by backend type
- Add environment files (.env, README)
- Create ZIP file or push to GitHub
- Stream file to client or return GitHub URL

### API Response Format

**Standard Response Structure:**
```typescript
interface ApiResponse<T> {
  success: boolean;      // true if successful
  data: T | null;        // Response data or null
  error: string | null;  // Error message or null
}
```

**Examples:**

Success:
```json
{
  "success": true,
  "data": {
    "user": { "id": "123", "email": "user@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "error": null
}
```

Error:
```json
{
  "success": false,
  "data": null,
  "error": "Invalid email address"
}
```

### Technology Stack

**Core Framework:**
- **Express.js:** Minimal, fast HTTP server
- **TypeScript:** Type safety for Node.js
- **Node.js 18+:** JavaScript runtime

**Database:**
- **MongoDB:** NoSQL, flexible schemas
- **Mongoose:** MongoDB ORM
- **PostgreSQL:** SQL database
- **MySQL:** SQL database
- **Redis:** In-memory cache, sessions

**Authentication:**
- **bcrypt:** Password hashing
- **jsonwebtoken (JWT):** Token-based auth
- **express-session:** Session management

**Validation:**
- **Zod:** Runtime schema validation
- **Error handling:** Async/await try-catch

**AI Integration:**
- **openai:** Official OpenAI SDK
- **@google/generative-ai:** Gemini API
- **@anthropic-ai/sdk:** Claude API
- **axios:** HTTP client for Ollama

**File Operations:**
- **archiver:** ZIP file creation
- **fs/promises:** Async file operations
- **path:** Path manipulation

**Development:**
- **ts-node:** Run TypeScript directly
- **nodemon:** Auto reload on file changes
- **npm:** Package management

### Error Handling

**Controller Level (Client-Facing):**
```typescript
try {
  const validated = signupSchema.parse(req.body);
  const result = await authService.signup(validated);
  res.json({ success: true, data: result, error: null });
} catch (error) {
  res.status(400).json({
    success: false,
    data: null,
    error: error.message || 'Signup failed'
  });
}
```

**Service Level (Logic):**
```typescript
async signup(input: SignupInput) {
  const existingUser = await User.findOne({ email: input.email });
  if (existingUser) {
    throw new Error('User already exists');
  }
  // ... proceed with signup
}
```

**Global Error Handler:**
```typescript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    data: null,
    error: 'Internal server error'
  });
});
```

---

## Database Models

### User Model (Authentication)

**Mongoose Schema:**
```typescript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  createdAt: Date (default: now),
  updatedAt: Date (default: now)
}
```

**Indices:**
- `email`: Unique, for efficient lookups

**Methods:**
- `comparePassword(plaintext)`: bcrypt compare
- `generateToken()`: JWT token creation

### Future Models (Roadmap)

**Blog Post Model:**
```
{
  _id: ObjectId,
  title: String,
  content: String,
  author: ObjectId (ref: User),
  published: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Product Model (E-commerce):**
```
{
  _id: ObjectId,
  name: String,
  price: Number,
  inventory: Number,
  category: String,
  image: String,
  createdAt: Date
}
```

**Order Model (E-commerce):**
```
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  items: [{ product: ObjectId, quantity: Number, price: Number }],
  total: Number,
  status: String,
  createdAt: Date
}
```

---

## API Endpoints

### Authentication Endpoints

#### **POST /api/auth/signup**
Create a new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "error": null
}
```

**Error (400):**
```json
{
  "success": false,
  "data": null,
  "error": "User already exists"
}
```

---

#### **POST /api/auth/login**
Authenticate user and get JWT token

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "error": null
}
```

**Error (401):**
```json
{
  "success": false,
  "data": null,
  "error": "Invalid credentials"
}
```

---

#### **GET /api/auth/me**
Get current authenticated user (protected endpoint)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com"
    }
  },
  "error": null
}
```

**Error (401):**
```json
{
  "success": false,
  "data": null,
  "error": "No token provided"
}
```

---

### AI Generation Endpoints

#### **POST /api/ai/generate** (Server-Sent Events)
Generate full-stack code using AI

**Request:**
```json
{
  "provider": "gemini",
  "apiKey": "user's_api_key_optional",
  "model": "gemini-2.5-flash",
  "userPrompt": "Create an auth app",
  "selectedModules": ["auth"],
  "projectName": "MyApp"
}
```

**Response Stream Events:**

1. **start event:**
```json
{
  "message": "Generation started",
  "provider": "gemini"
}
```

2. **chunk events** (streaming):
```json
{
  "text": "...[part of response]..."
}
```

3. **quality_retry event** (if quality check fails):
```json
{
  "message": "Auth UI quality below...",
  "reasons": ["Missing vibrant colors...", "..."]
}
```

4. **file events** (as files extracted):
```json
{
  "path": "backend/src/server.ts",
  "content": "...full file content...",
  "language": "typescript"
}
```

5. **complete event:**
```json
{
  "projectName": "MyApp",
  "description": "...",
  "fileCount": 23,
  "tokensUsed": 4521
}
```

---

#### **POST /api/project/generate**
Generate project and prepare for deployment

**Request:**
```json
{
  "projectName": "MyApp",
  "modules": ["auth"],
  "templates": {
    "auth": "modern"
  },
  "backends": {
    "auth": "jwt-mongodb"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectName": "MyApp",
    "files": 23,
    "downloadUrl": "/downloads/MyApp.zip"
  },
  "error": null
}
```

---

### Provider Information Endpoint

#### **GET /api/ai/providers**
List available AI providers and models

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "gemini",
        "name": "Google Gemini",
        "logo": "✨",
        "models": [
          {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash",
            "freeTier": true,
            "speed": "very-fast",
            "quality": "high"
          }
        ],
        "requiresKey": false,
        "description": "Google's most capable AI..."
      },
      {
        "id": "openai",
        "name": "OpenAI GPT",
        "models": [...],
        "requiresKey": true
      },
      {
        "id": "anthropic",
        "name": "Anthropic Claude",
        "models": [...],
        "requiresKey": true
      },
      {
        "id": "ollama",
        "name": "Ollama Local",
        "models": [...],
        "requiresKey": false
      }
    ]
  },
  "error": null
}
```

---

## Environment Configuration

### Backend Environment Variables

**.env file:**
```bash
# Server
NODE_ENV=development
PORT=5000

# Database (MongoDB)
DATABASE_URL=mongodb://localhost:27017/idea_platform

# JWT
JWT_SECRET=your-very-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Bcrypt
BCRYPT_SALT_ROUNDS=10

# AI Providers (optional - only if not using platform free tier)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_URL=http://localhost:11434

# Enabled Modules
ENABLED_MODULES=auth

# Feature Flags
FEATURE_AI_GENERATION=true
FEATURE_LIVE_PREVIEW=true
```

**Environment Groups:**

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `NODE_ENV` | Environment | Optional | development, production |
| `PORT` | Server port | Optional | 5000, 3000 |
| `DATABASE_URL` | DB connection | **Yes** | mongodb://localhost:27017/db |
| `JWT_SECRET` | Token signing key | **Yes** | randomstring |
| `JWT_EXPIRES_IN` | Token expiration | Optional | 7d, 24h |
| `BCRYPT_SALT_ROUNDS` | Password hash rounds | Optional | 10 |
| `OPENAI_API_KEY` | OpenAI access | Optional | sk-... |
| `GEMINI_API_KEY` | Google Gemini access | Optional | AIza... |
| `ANTHROPIC_API_KEY` | Claude access | Optional | sk-ant-... |
| `OLLAMA_URL` | Local OLLAMA server | Optional | http://localhost:11434 |
| `ENABLED_MODULES` | Active modules | Optional | auth,blog,ecommerce |

### Frontend Environment Variables

**.env.local (frontend):**
```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_GENERATION=true
NEXT_PUBLIC_ENABLE_TEMPLATES=true

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXX
```

### Docker Environment (Optional)

**docker-compose.yml:**
```yaml
version: '3.9'

services:
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: idea_platform
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: mongodb://mongodb:27017/idea_platform
      JWT_SECRET: dev-secret-key
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:5000
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## Installation & Setup

### Prerequisites

- **Node.js:** v18+ ([download](https://nodejs.org))
- **npm or yarn:** Comes with Node.js
- **MongoDB:** v5.0+ ([download](https://www.mongodb.com/try/download/community))
- **Git:** For version control ([download](https://git-scm.com))

### Clone Repository

```bash
git clone https://github.com/yourrepo/idea-platform.git
cd idea-platform
```

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings
# - Update DATABASE_URL if needed
# - Set JWT_SECRET to random value
nano .env

# (Optional) Add API keys for AI providers
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=AIza...
```

**Verify installation:**
```bash
npm run build  # Should compile without errors
```

### Frontend Setup

```bash
# Navigate to frontend (from root)
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Verify installation
npm run build  # Should compile without errors
```

### Database Setup

**MongoDB Local:**
```bash
# Start MongoDB server (on macOS with Homebrew)
brew services start mongodb-community

# Or Docker
docker run -d -p 27017:27017 --name mongodb mongo:7
```

**MongoDB Atlas (Cloud):**
1. Go to [mongodb.com/cloud](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create cluster
4. Get connection string
5. Add to `.env`: `DATABASE_URL=mongodb+srv://...`

---

## Running the Platform

### Start Backend Server

```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start

# Expected output:
# Server running on http://localhost:5000
# MongoDB connected
```

### Start Frontend Server

```bash
cd frontend

# Development mode
npm run dev

# Production build
npm run build
npm start

# Expected output:
# Ready on http://localhost:3000
```

### Access the Platform

1. **Home Page:** [http://localhost:3000](http://localhost:3000)
2. **Builder:** [http://localhost:3000/builder/new](http://localhost:3000/builder/new)
3. **Templates:** [http://localhost:3000/templates/preview](http://localhost:3000/templates/preview)
4. **API Docs:** [http://localhost:5000/api](http://localhost:5000/api) (if implemented)

### Verify Everything Works

**Backend health check:**
```bash
curl http://localhost:5000/api/auth/me
# Should return: No token provided (expected)
```

**Frontend loads:**
```bash
curl http://localhost:3000
# Should return HTML
```

**AI Generation test:**
1. Go to [http://localhost:3000/builder/new](http://localhost:3000/builder/new)
2. Enter project name
3. Follow builder steps
4. On AI step, choose provider
5. See code generation in real-time

---

## Feature Flags

### Backend Flags

Control which features are available:

**config/modules.ts:**
```typescript
const enabledModules = (process.env.ENABLED_MODULES || 'auth').split(',');

export const isModuleEnabled = (moduleName: string): boolean => {
  return enabledModules.includes(moduleName);
};

// Usage in routes
if (isModuleEnabled('auth')) {
  app.use('/api/auth', authRoutes);
}
```

**Common Flags:**
- `auth` - Authentication module
- `ai` - AI code generation
- `project` - Project management
- `blog` - Blog/CMS module (coming)
- `ecommerce` - E-commerce module (coming)

### Frontend Flags

**config/features.ts:**
```typescript
export const FEATURES = {
  auth: true,
  aiGeneration: true,
  livePreview: true,
  deploymentOptions: true,
  templateShowcase: true,
  designStudio: false, // Coming soon
  ecommerce: false,    // Coming soon
};

// Usage in components
{FEATURES.aiGeneration && <AIGenerationPanel />}
```

---

## Security Implementation

### Password Security

**Bcrypt Hashing:**
```typescript
import bcrypt from 'bcrypt';

// Hash password on signup
const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds
await User.create({ email, password: hashedPassword });

// Verify on login
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

**Salt Rounds:** 10 (takes ~100ms per hash, good security/speed balance)

### Token Security

**JWT Implementation:**
```typescript
import jwt from 'jsonwebtoken';

// Generate token
const token = jwt.sign(
  { userId: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Verify token
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // Token is valid
} catch (err) {
  // Token invalid or expired
}
```

**Token Best Practices:**
- Store in secure httpOnly cookies (frontend)
- Include exp (expiration) claim
- Use RS256 (RSA) for high-security apps
- Refresh tokens for long sessions

### Input Validation

**Zod Schema Validation:**
```typescript
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Must be valid email'),
  password: z.string().min(6, 'Min 6 characters')
});

// In controller
try {
  const validated = signupSchema.parse(req.body);
  // Process validated data
} catch (err) {
  // Return validation errors
}
```

### CORS Configuration

**Enable specific origins:**
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:3000',
  credentials: true
}));
```

### Environment Secrets

**Never commit secrets:**
```
# .gitignore
.env
.env.local
.env.production.local

# .env.example (safe to commit)
JWT_SECRET=change-this-in-production
DATABASE_URL=mongodb://...
```

### HTTPS/TLS

**Production requirement:**
- Always use HTTPS
- Get SSL certificate (Let's Encrypt, AWS ACM, etc.)
- Redirect HTTP to HTTPS
- Set Secure flag on cookies

---

## Deployment Options

### Option 1: Download & Self-Host

**Process:**
1. Generate project via builder
2. Download ZIP file
3. Extract locally
4. Follow SETUP.md
5. Deploy to your server

**Hosting options:**
- **Heroku:** Easy, free tier available
- **DigitalOcean:** $5/month droplets
- **AWS EC2:** Pay-as-you-go
- **Railway:** Simple, free tier
- **Render:** Easy free tier

### Option 2: GitHub Integration

**Process:**
1. Generate project via builder
2. Click "Push to GitHub"
3. OAuth authorize
4. Select existing repo or create new
5. Code pushed to GitHub

**Setup CI/CD:**
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install && npm run build
      - run: cd frontend && npm install && npm run build
      - run: npm run deploy
```

### Vercel Deployment (Frontend)

```bash
npm install -g vercel

cd frontend
vercel
# Follow prompts, auto-deploys on git push
```

### Railway Deployment (Full Stack)

```bash
cd backend
railway link
railway up

cd ../frontend
railway link
railway up

# Auto-deploys on git push
```

### Docker Deployment

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t idea-backend ./backend
docker build -t idea-frontend ./frontend
docker-compose up
```

---

## Conclusion

**IDEA Platform** is a comprehensive full-stack application builder that combines:
- ✅ AI code generation with quality gates
- ✅ Live preview sandbox with safety controls
- ✅ Professional template system with 3 UI variants
- ✅ Design studio with vibrant color palettes
- ✅ 5-step intuitive builder flow
- ✅ Multiple database & authentication options
- ✅ Easy deployment (ZIP, GitHub, Docker)

**Current Status:**
- ✅ Frontend: Production-ready
- ✅ AI Generation: Fully functional with quality gates
- ✅ Live Preview: Stable sandbox execution
- ✅ Auth Module: Complete
- 🔄 Backend Build: Minor type fixes needed

**Next Steps:**
- Deploy to production
- Add more modules (Blog, E-commerce)
- Enhance design studio
- User analytics & feedback
- Team collaboration features

**To Get Started:**
1. Follow [Installation & Setup](#installation--setup)
2. Run backend + frontend
3. Visit [http://localhost:3000/builder/new](http://localhost:3000/builder/new)
4. Create your first application!

---

*For questions, issues, or contributions, visit the [GitHub repository](https://github.com/yourrepo/idea-platform) or [documentation site](https://docs.idea-platform.com).*
