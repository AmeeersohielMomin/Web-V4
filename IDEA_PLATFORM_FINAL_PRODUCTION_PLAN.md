# IDEA Platform — Final Production Implementation Plan
> Single Source of Truth for Completing & Launching the Platform
> Version: 2.0 | Date: 2026-03-18
> Prepared from: COMPLETE_PLATFORM_DOCUMENTATION.md + IMPLEMENTATION_REPORT_MAR18_2026.md

---

## AGENT EXECUTION INSTRUCTIONS

This document is the authoritative guide for bringing IDEA Platform to production.

- `[DONE]` — Already implemented. Do NOT rewrite or break.
- `[FIX]` — Exists but broken. Must be repaired exactly as specified.
- `[BUILD]` — Does not exist yet. Must be built from scratch.
- `[EXTEND]` — Exists but incomplete. Must be expanded.

Read every section before writing a single line of code. Execute phases in strict order. Do not skip phases. Do not modify `[DONE]` items unless a `[FIX]` tag is present on that specific item.

---

## PART 1 — REALITY CHECK: WHAT IS ACTUALLY BUILT

### What Works Right Now

The platform has a functional core that generates full-stack applications. Here is the honest state:

**Frontend (Next.js 14) — WORKING**
- 5-step builder flow: `/builder/new` → `/builder/select-modules` → `/builder/select-templates` → `/builder/select-backend` → `/builder/deployment`
- AI generation page with streaming SSE: `/builder/ai-generate`
- Live preview sandbox in iframe: `/builder/preview-runner`
- Template showcase: 3 variants (Minimal, Modern, Classic) for Login + Signup pages
- Design studio canvas page
- Builder state managed via `localStorage`
- Frontend build: **PASSING**

**Backend (Express.js + TypeScript) — PARTIALLY BROKEN**
- AI generation module: multi-provider support (OpenAI, Gemini, Anthropic, Ollama)
- Design DNA seeded variation system: 10 palettes, 7 layouts, 5 theme modes
- Quality gate system with auto-retry on failed generation
- Auth module with 4 backend implementations (MongoDB, PostgreSQL, MySQL, Redis/Session)
- Project module: ZIP generation with archiver, GitHub push stub
- Streaming response via Server-Sent Events (SSE)
- Backend build: **FAILING** — TypeScript errors block production deployment

**What the Platform Does NOT Have Yet (Critical Gaps)**
- Platform-level user accounts (users cannot log in to the IDEA platform itself)
- Project history / dashboard (generated projects are lost on page refresh)
- Usage tracking and rate limiting (anyone can generate unlimited times)
- Billing and subscription system (no way to charge users)
- Landing page (no homepage to convert visitors)
- Production deployment (platform is only runnable locally)
- Email notifications
- Error monitoring

---

## PART 2 — TECH STACK (CONFIRMED, DO NOT CHANGE)

### Backend (Express.js — NOT NestJS)
The backend is Express.js, not NestJS. All new backend code must follow Express patterns.

| Layer | Technology | Status |
|---|---|---|
| Runtime | Node.js 18+ | Done |
| Framework | Express.js | Done |
| Language | TypeScript | Done |
| Primary DB | MongoDB (Mongoose) | Done |
| Optional DBs | PostgreSQL (pg), MySQL (mysql2), Redis | Partially done |
| Auth (platform) | JWT + bcrypt | Build |
| Validation | Zod | Done |
| AI Providers | OpenAI, Gemini, Anthropic, Ollama | Done |
| File ops | archiver, fs/promises | Done |
| Queue | Bull + Redis | Build |
| Email | Nodemailer / Resend | Build |

### Frontend (Next.js 14)
| Layer | Technology | Status |
|---|---|---|
| Framework | Next.js 14 (Pages Router) | Done |
| Language | TypeScript | Done |
| Styling | Tailwind CSS | Done |
| HTTP | Axios | Done |
| State | localStorage + React hooks | Done — extend with Zustand |
| Editor | Monaco Editor | Build |
| Auth state | Context / Zustand | Build |

### Infrastructure
| Service | Tool | Status |
|---|---|---|
| Local dev DB | MongoDB (local or Docker) | Done |
| Containers | Docker + Compose | Partial |
| Frontend deploy | Vercel | Build |
| Backend deploy | Railway | Build |
| CI/CD | GitHub Actions | Build |
| Monitoring | Sentry | Build |
| Analytics | PostHog | Build |

---

## PART 3 — COMPLETE DIRECTORY STRUCTURE

```
idea-platform/
│
├── frontend/                              [DONE — preserve all existing files]
│   ├── pages/
│   │   ├── index.tsx                      [BUILD — landing page]
│   │   ├── home.tsx                       [DONE]
│   │   ├── login.tsx                      [BUILD — platform login]
│   │   ├── signup.tsx                     [BUILD — platform signup]
│   │   ├── dashboard.tsx                  [BUILD — user project dashboard]
│   │   ├── _app.tsx                       [EXTEND — add auth context]
│   │   └── builder/
│   │       ├── new.tsx                    [DONE]
│   │       ├── select-modules.tsx         [DONE]
│   │       ├── select-templates.tsx       [DONE]
│   │       ├── select-backend.tsx         [DONE]
│   │       ├── deployment.tsx             [DONE]
│   │       ├── ai-generate.tsx            [DONE — preserve exactly]
│   │       ├── preview-runner.tsx         [DONE — preserve exactly]
│   │       └── preview.tsx               [DONE]
│   ├── components/
│   │   ├── AuthForm.tsx                   [DONE]
│   │   ├── Navbar.tsx                     [BUILD — with auth state]
│   │   ├── ProtectedRoute.tsx             [BUILD]
│   │   ├── ProjectCard.tsx                [BUILD]
│   │   └── UsageMeter.tsx                 [BUILD]
│   ├── contexts/
│   │   └── AuthContext.tsx                [BUILD]
│   ├── lib/
│   │   ├── api.ts                         [BUILD — Axios instance + interceptors]
│   │   └── auth.ts                        [BUILD — token helpers]
│   ├── templates/                         [DONE — preserve all]
│   │   └── auth/
│   │       └── variants/
│   │           ├── minimal/
│   │           ├── modern/
│   │           └── classic/
│   ├── config/
│   │   └── features.ts                    [DONE]
│   └── styles/
│       └── globals.css                    [DONE]
│
├── backend/                               [PARTIALLY DONE]
│   ├── src/
│   │   ├── server.ts                      [DONE — entry point]
│   │   ├── config/
│   │   │   ├── modules.ts                 [DONE]
│   │   │   └── database.ts                [DONE]
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts          [BUILD — JWT verify middleware]
│   │   │   ├── rateLimit.middleware.ts     [BUILD]
│   │   │   └── errorHandler.middleware.ts  [DONE — extend]
│   │   └── modules/
│   │       ├── platform-auth/             [BUILD — platform user accounts]
│   │       │   ├── platform-auth.routes.ts
│   │       │   ├── platform-auth.controller.ts
│   │       │   ├── platform-auth.service.ts
│   │       │   ├── platform-auth.schema.ts
│   │       │   └── platform-user.model.ts
│   │       ├── platform-projects/         [BUILD — save user projects]
│   │       │   ├── platform-projects.routes.ts
│   │       │   ├── platform-projects.controller.ts
│   │       │   ├── platform-projects.service.ts
│   │       │   └── platform-project.model.ts
│   │       ├── billing/                   [BUILD]
│   │       │   ├── billing.routes.ts
│   │       │   ├── billing.controller.ts
│   │       │   └── billing.service.ts
│   │       ├── auth/                      [DONE — FIX build errors]
│   │       │   ├── auth.routes.ts
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.service.ts        [FIX — jwt.sign typing]
│   │       │   ├── auth.schema.ts
│   │       │   ├── auth.model.ts
│   │       │   └── implementations/
│   │       │       ├── jwt-mongodb/       [DONE]
│   │       │       ├── jwt-postgresql/    [FIX — missing deps]
│   │       │       ├── jwt-mysql/         [FIX — missing deps]
│   │       │       └── session-based/     [FIX — missing deps]
│   │       ├── ai/                        [DONE — preserve]
│   │       │   ├── ai.routes.ts
│   │       │   ├── ai.controller.ts
│   │       │   ├── ai.service.ts
│   │       │   ├── ai.prompts.ts          [DONE — Design DNA]
│   │       │   └── ai.utils.ts
│   │       ├── project/                   [DONE — FIX signature errors]
│   │       │   ├── project.routes.ts
│   │       │   ├── project.controller.ts
│   │       │   ├── project.service.ts     [FIX — method signatures]
│   │       │   └── project.model.ts
│   │       └── deploy/                    [BUILD — user-facing deployment]
│   │           ├── deploy.routes.ts
│   │           ├── deploy.controller.ts
│   │           ├── vercel.service.ts      [BUILD — Vercel API integration]
│   │           ├── github.service.ts      [BUILD — GitHub OAuth + push]
│   │           └── railway.service.ts     [BUILD — Railway GraphQL API]
│   ├── package.json                       [FIX — add missing deps]
│   ├── tsconfig.json                      [FIX — exclude broken implementations]
│   └── .env.example
│
├── docker-compose.yml                     [EXTEND — add Redis]
├── .env.example                           [EXTEND — add new vars]
└── .github/
    └── workflows/
        └── main.yml                       [BUILD — CI/CD]
```

---

## PART 4 — PHASE 1: FIX BACKEND BUILD BLOCKERS
> Priority: CRITICAL — Nothing else can be done until backend builds cleanly.
> Estimated time: 2–4 hours

### Step 1.1 — Install missing dependencies

```bash
cd backend
npm install mysql2 pg express-session connect-redis redis
npm install --save-dev @types/pg @types/express-session @types/connect-redis @types/redis
```

### Step 1.2 — Fix TypeScript session type augmentation

Create new file `backend/src/types/express/index.d.ts`:
```typescript
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
  }
}
```

Also add to `backend/tsconfig.json` under `compilerOptions`:
```json
{
  "compilerOptions": {
    "typeRoots": ["./src/types", "./node_modules/@types"]
  }
}
```

### Step 1.3 — Fix jwt.sign typing in auth.service.ts

Find every file that calls `jwt.sign()` and apply this fix:
```typescript
// WRONG — causes TypeScript overload error
jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })

// CORRECT — explicit SignOptions type resolves overload
import { SignOptions } from 'jsonwebtoken';

const options: SignOptions = { expiresIn: '7d' };
jwt.sign({ userId }, process.env.JWT_SECRET as string, options);
```

Files to fix:
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/implementations/jwt-postgresql/auth.service.ts`
- `backend/src/modules/auth/implementations/jwt-mysql/auth.service.ts`

### Step 1.4 — Fix project.service.ts method signatures

Open `backend/src/modules/project/project.service.ts`.
Find the four methods where call sites pass more arguments than the signatures accept.
Update signatures to match calls exactly.

Define these interfaces at the top of the file:
```typescript
interface GenerateOptions {
  template?: string;        // 'minimal' | 'modern' | 'classic'
  backend?: string;         // 'jwt-mongodb' | 'jwt-postgresql' | 'jwt-mysql' | 'session-redis'
  framework?: string;
  designSeed?: string;
}

interface EnvConfig {
  database?: string;
  jwtSecret?: string;
  port?: number;
  extras?: Record<string, string>;
}
```

Apply to method signatures:
```typescript
// Before
async generateBackend(projectId: string, prompt: string): Promise<any>
async generateFrontend(projectId: string, prompt: string): Promise<any>
async addEnvironmentFiles(projectId: string): Promise<void>
async addDocumentation(projectId: string, title: string): Promise<void>

// After
async generateBackend(projectId: string, prompt: string, options: GenerateOptions): Promise<any>
async generateFrontend(projectId: string, prompt: string, options: GenerateOptions): Promise<any>
async addEnvironmentFiles(projectId: string, envConfig: EnvConfig): Promise<void>
async addDocumentation(projectId: string, title: string, description: string, techStack: string[]): Promise<void>
```

### Step 1.5 — Exclude broken auth implementations from default build

Update `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "typeRoots": ["./src/types", "./node_modules/@types"]
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "src/modules/auth/implementations/jwt-mysql",
    "src/modules/auth/implementations/jwt-postgresql",
    "src/modules/auth/implementations/session-based"
  ]
}
```

Note: These implementations remain on disk for reference and for users who download the generated projects. They are excluded only from the platform's own build.

### Step 1.6 — Verify Phase 1 is complete

```bash
cd backend && npm run build
```

Expected output: zero TypeScript errors. Build succeeds and produces `dist/` folder.

```bash
cd frontend && npm run build
```

Expected output: build passes (already working, confirm no regressions).

**Do NOT proceed to Phase 2 until both builds pass.**

---

## PART 5 — PHASE 2: PLATFORM USER ACCOUNTS
> The platform itself needs its own user system so users can save projects, track usage, and be billed.
> This is SEPARATE from the auth code the platform generates for users' apps.
> Estimated time: 6–8 hours

### Step 2.1 — Platform user Mongoose model

Create `backend/src/modules/platform-auth/platform-user.model.ts`:
```typescript
import mongoose from 'mongoose';

const platformUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'team'],
    default: 'free'
  },
  generationsUsed: {
    type: Number,
    default: 0
  },
  generationsLimit: {
    type: Number,
    default: 3          // free tier: 3 generations
  },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

export const PlatformUser = mongoose.model('PlatformUser', platformUserSchema);
```

### Step 2.2 — Platform auth service

Create `backend/src/modules/platform-auth/platform-auth.service.ts`:
```typescript
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PlatformUser } from './platform-user.model';

export class PlatformAuthService {

  async register(email: string, password: string, name?: string) {
    const existing = await PlatformUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await PlatformUser.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name || ''
    });

    const token = this.signToken(user._id.toString(), user.email);
    return {
      user: { id: user._id, email: user.email, name: user.name, plan: user.plan },
      token
    };
  }

  async login(email: string, password: string) {
    const user = await PlatformUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const token = this.signToken(user._id.toString(), user.email);
    return {
      user: { id: user._id, email: user.email, name: user.name, plan: user.plan,
              generationsUsed: user.generationsUsed, generationsLimit: user.generationsLimit },
      token
    };
  }

  async getMe(userId: string) {
    const user = await PlatformUser.findById(userId).select('-passwordHash');
    if (!user) throw new Error('User not found');
    return user;
  }

  async checkGenerationLimit(userId: string): Promise<boolean> {
    const user = await PlatformUser.findById(userId);
    if (!user) return false;
    if (user.generationsLimit === -1) return true;      // unlimited (pro)
    return user.generationsUsed < user.generationsLimit;
  }

  async incrementGenerationCount(userId: string): Promise<void> {
    await PlatformUser.findByIdAndUpdate(userId, { $inc: { generationsUsed: 1 } });
  }

  verifyToken(token: string): { userId: string; email: string } {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    return { userId: decoded.userId, email: decoded.email };
  }

  private signToken(userId: string, email: string): string {
    const options: SignOptions = { expiresIn: '7d' };
    return jwt.sign({ userId, email }, process.env.JWT_SECRET as string, options);
  }
}

export const platformAuthService = new PlatformAuthService();
```

### Step 2.3 — Platform auth Zod schema

Create `backend/src/modules/platform-auth/platform-auth.schema.ts`:
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required')
});
```

### Step 2.4 — Platform auth controller

Create `backend/src/modules/platform-auth/platform-auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { platformAuthService } from './platform-auth.service';
import { registerSchema, loginSchema } from './platform-auth.schema';

export class PlatformAuthController {

  register = async (req: Request, res: Response) => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await platformAuthService.register(input.email, input.password, input.name);
      res.status(201).json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await platformAuthService.login(input.email, input.password);
      res.status(200).json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(401).json({ success: false, data: null, error: err.message });
    }
  };

  me = async (req: Request, res: Response) => {
    try {
      const user = await platformAuthService.getMe((req as any).userId);
      res.json({ success: true, data: { user }, error: null });
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };
}

export const platformAuthController = new PlatformAuthController();
```

### Step 2.5 — JWT authentication middleware

Create `backend/src/middleware/auth.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { platformAuthService } from '../modules/platform-auth/platform-auth.service';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, data: null, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = platformAuthService.verifyToken(token);
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ success: false, data: null, error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = platformAuthService.verifyToken(token);
      (req as any).userId = decoded.userId;
      (req as any).userEmail = decoded.email;
    }
  } catch {
    // silently ignore invalid tokens in optional auth
  }
  next();
}
```

### Step 2.6 — Platform auth routes

Create `backend/src/modules/platform-auth/platform-auth.routes.ts`:
```typescript
import { Router } from 'express';
import { platformAuthController } from './platform-auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', platformAuthController.register);
router.post('/login', platformAuthController.login);
router.get('/me', requireAuth, platformAuthController.me);

export default router;
```

### Step 2.7 — Wire platform auth into server.ts

In `backend/src/server.ts`, add:
```typescript
import platformAuthRoutes from './modules/platform-auth/platform-auth.routes';

// Add after existing routes
app.use('/api/platform/auth', platformAuthRoutes);
```

### Step 2.8 — Test platform auth endpoints

```bash
# Register
curl -X POST http://localhost:5000/api/platform/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
# Expected: { success: true, data: { user, token } }

# Login
curl -X POST http://localhost:5000/api/platform/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: { success: true, data: { user, token } }
```

---

## PART 6 — PHASE 3: PROJECT PERSISTENCE
> Users must be able to save, view and re-open their generated projects.
> Estimated time: 4–6 hours

### Step 3.1 — Platform project Mongoose model

Create `backend/src/modules/platform-projects/platform-project.model.ts`:
```typescript
import mongoose from 'mongoose';

const generatedFileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  content: { type: String, required: true },
  language: { type: String }
}, { _id: false });

const platformProjectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformUser',
    required: true,
    index: true
  },
  name: { type: String, required: true },
  description: { type: String },
  modules: [String],                              // ['auth', 'blog']
  template: { type: String },                     // 'minimal' | 'modern' | 'classic'
  backend: { type: String },                      // 'jwt-mongodb' | etc
  provider: { type: String },                     // 'gemini' | 'openai' | etc
  status: {
    type: String,
    enum: ['generating', 'complete', 'failed'],
    default: 'generating'
  },
  files: [generatedFileSchema],
  fileCount: { type: Number, default: 0 },
  designSeed: { type: String },
  deployUrl: { type: String },
  githubUrl: { type: String }
}, {
  timestamps: true
});

export const PlatformProject = mongoose.model('PlatformProject', platformProjectSchema);
```

### Step 3.2 — Platform projects service

Create `backend/src/modules/platform-projects/platform-projects.service.ts`:
```typescript
import archiver from 'archiver';
import { Response } from 'express';
import { PlatformProject } from './platform-project.model';

export class PlatformProjectsService {

  async createProject(userId: string, data: {
    name: string;
    modules: string[];
    template: string;
    backend: string;
    provider: string;
    designSeed?: string;
  }) {
    return PlatformProject.create({ userId, ...data, status: 'generating' });
  }

  async saveFiles(projectId: string, files: Array<{ path: string; content: string; language?: string }>) {
    return PlatformProject.findByIdAndUpdate(
      projectId,
      { files, fileCount: files.length, status: 'complete' },
      { new: true }
    );
  }

  async listUserProjects(userId: string) {
    return PlatformProject.find({ userId })
      .select('name modules template backend status fileCount createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);
  }

  async getProject(projectId: string, userId: string) {
    const project = await PlatformProject.findOne({ _id: projectId, userId });
    if (!project) throw new Error('Project not found');
    return project;
  }

  async deleteProject(projectId: string, userId: string) {
    const result = await PlatformProject.deleteOne({ _id: projectId, userId });
    if (result.deletedCount === 0) throw new Error('Project not found');
  }

  async streamZipDownload(projectId: string, userId: string, res: Response) {
    const project = await this.getProject(projectId, userId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of project.files) {
      archive.append(file.content, { name: file.path });
    }

    archive.append(this.buildReadme(project), { name: 'SETUP.md' });
    await archive.finalize();
  }

  private buildReadme(project: any): string {
    return `# ${project.name}

Generated by IDEA Platform on ${new Date(project.createdAt).toLocaleDateString()}

## Stack
- Template: ${project.template}
- Backend: ${project.backend}
- Modules: ${project.modules.join(', ')}

## Setup

\`\`\`bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL, JWT_SECRET
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Access
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
`;
  }
}

export const platformProjectsService = new PlatformProjectsService();
```

### Step 3.3 — Platform projects controller and routes

Create `backend/src/modules/platform-projects/platform-projects.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { platformProjectsService } from './platform-projects.service';

export class PlatformProjectsController {

  list = async (req: Request, res: Response) => {
    try {
      const projects = await platformProjectsService.listUserProjects((req as any).userId);
      res.json({ success: true, data: { projects }, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const project = await platformProjectsService.getProject(req.params.id, (req as any).userId);
      res.json({ success: true, data: { project }, error: null });
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };

  download = async (req: Request, res: Response) => {
    try {
      await platformProjectsService.streamZipDownload(req.params.id, (req as any).userId, res);
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await platformProjectsService.deleteProject(req.params.id, (req as any).userId);
      res.json({ success: true, data: null, error: null });
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };
}

export const platformProjectsController = new PlatformProjectsController();
```

Create `backend/src/modules/platform-projects/platform-projects.routes.ts`:
```typescript
import { Router } from 'express';
import { platformProjectsController } from './platform-projects.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);                                         // all routes require auth

router.get('/', platformProjectsController.list);
router.get('/:id', platformProjectsController.get);
router.get('/:id/download', platformProjectsController.download);
router.delete('/:id', platformProjectsController.delete);

export default router;
```

### Step 3.4 — Wire projects into server.ts

```typescript
import platformProjectsRoutes from './modules/platform-projects/platform-projects.routes';

app.use('/api/platform/projects', platformProjectsRoutes);
```

### Step 3.5 — Connect AI generation to project saving

In `backend/src/modules/ai/ai.controller.ts`, update the generate handler to:
1. Check if request has a valid JWT (optionalAuth middleware)
2. If authenticated, save files to PlatformProject after generation completes
3. Return `projectId` in the `complete` SSE event

```typescript
// In the generate handler, after files are extracted and quality-gated:
if ((req as any).userId) {
  const project = await platformProjectsService.createProject(
    (req as any).userId,
    { name: req.body.projectName, modules: req.body.selectedModules,
      template: req.body.template, backend: req.body.backend,
      provider: req.body.provider, designSeed: designSeed }
  );
  await platformProjectsService.saveFiles(project._id.toString(), extractedFiles);
  projectId = project._id.toString();
}

// Include in complete SSE event:
res.write(`data: ${JSON.stringify({
  type: 'complete',
  projectName, description, fileCount, tokensUsed,
  projectId: projectId || null   // null for unauthenticated users
})}\n\n`);
```

Also apply the `optionalAuth` middleware to the AI generate route so unauthenticated users can still generate but projects won't be saved.

---

## PART 7 — PHASE 4: RATE LIMITING AND USAGE TRACKING
> Prevent abuse and enforce free tier limits.
> Estimated time: 2–3 hours

### Step 4.1 — Install rate limiting packages

```bash
cd backend
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

### Step 4.2 — Global rate limiting middleware

Create `backend/src/middleware/rateLimit.middleware.ts`:
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max: 100,
  message: { success: false, data: null, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limit for AI generation
export const generationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,          // 1 hour
  max: 10,                            // 10 generation requests per hour per IP
  message: { success: false, data: null, error: 'Generation rate limit reached. Please wait before generating again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, data: null, error: 'Too many auth attempts. Please try again in 15 minutes.' }
});
```

### Step 4.3 — Generation limit check for authenticated users

Add a middleware that checks the platform user's generation quota:

Create `backend/src/middleware/generationQuota.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { platformAuthService } from '../modules/platform-auth/platform-auth.service';

export async function checkGenerationQuota(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;

  if (!userId) {
    // Anonymous users get 1 generation per session (tracked by IP)
    // No DB check needed — they cannot save projects anyway
    return next();
  }

  const allowed = await platformAuthService.checkGenerationLimit(userId);
  if (!allowed) {
    return res.status(403).json({
      success: false,
      data: null,
      error: 'You have reached your generation limit. Upgrade your plan to generate more apps.'
    });
  }

  next();
}
```

Apply in `ai.routes.ts`:
```typescript
import { generationLimiter } from '../../middleware/rateLimit.middleware';
import { optionalAuth } from '../../middleware/auth.middleware';
import { checkGenerationQuota } from '../../middleware/generationQuota.middleware';

router.post('/generate', generationLimiter, optionalAuth, checkGenerationQuota, aiController.generate);
```

After successful generation, increment the counter:
```typescript
if ((req as any).userId) {
  await platformAuthService.incrementGenerationCount((req as any).userId);
}
```

---

## PART 8 — PHASE 5: FRONTEND AUTH INTEGRATION
> Build the platform's own login, signup, dashboard pages and auth context.
> Estimated time: 6–8 hours

### Step 5.1 — Axios API client

Create `frontend/lib/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 60000         // 60s for generation requests
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('idea_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('idea_token');
        localStorage.removeItem('idea_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

### Step 5.2 — Auth context

Create `frontend/contexts/AuthContext.tsx`:
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  plan: 'free' | 'starter' | 'pro' | 'team';
  generationsUsed: number;
  generationsLimit: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('idea_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/api/platform/auth/me');
      setUser(data.data.user);
    } catch {
      localStorage.removeItem('idea_token');
      localStorage.removeItem('idea_user');
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/api/platform/auth/login', { email, password });
    localStorage.setItem('idea_token', data.data.token);
    localStorage.setItem('idea_user', JSON.stringify(data.data.user));
    setUser(data.data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const { data } = await api.post('/api/platform/auth/register', { email, password, name });
    localStorage.setItem('idea_token', data.data.token);
    localStorage.setItem('idea_user', JSON.stringify(data.data.user));
    setUser(data.data.user);
  };

  const logout = () => {
    localStorage.removeItem('idea_token');
    localStorage.removeItem('idea_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

### Step 5.3 — Wrap app in AuthProvider

Update `frontend/pages/_app.tsx`:
```typescript
import { AuthProvider } from '../contexts/AuthContext';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
```

### Step 5.4 — Platform login page

Create `frontend/pages/login.tsx`:
```typescript
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-indigo-100">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">Welcome back</h1>
        <p className="text-gray-500 mb-8">Sign in to your IDEA account</p>

        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="you@example.com" required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••" required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full h-12 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-60 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link href="/signup" className="text-indigo-600 font-semibold hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### Step 5.5 — Platform signup page

Create `frontend/pages/signup.tsx` — same structure as login page with fields for name, email, password, confirm password. On success, redirect to `/builder/new` (not dashboard, so user immediately starts building).

### Step 5.6 — User dashboard page

Create `frontend/pages/dashboard.tsx`:

This page must:
- Redirect to `/login` if user is not authenticated
- Show user name, plan, and usage meter (`generationsUsed / generationsLimit`)
- List all saved projects from `GET /api/platform/projects`
- Each project card shows: name, template, backend, file count, created date
- Buttons on each card: "Open", "Download", "Delete"
- "New Project" button → routes to `/builder/new`
- Upgrade CTA if on free plan and near limit

### Step 5.7 — Navbar with auth state

Create `frontend/components/Navbar.tsx`:
```typescript
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
      <Link href="/" className="text-xl font-bold text-indigo-600">IDEA</Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
            <span className="text-sm text-gray-400">{user.email}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium
              ${user.plan === 'free' ? 'bg-gray-100 text-gray-600' : 'bg-indigo-100 text-indigo-700'}`}>
              {user.plan}
            </span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-600 hover:text-indigo-600">Login</Link>
            <Link href="/signup"
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              Get Started Free
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
```

### Step 5.8 — Protected route component

Create `frontend/components/ProtectedRoute.tsx`:
```typescript
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${router.pathname}`);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
```

---

## PART 9 — PHASE 6: LANDING PAGE
> First impression for every new visitor. Must clearly explain what IDEA does and convert them to sign up.
> Estimated time: 4–6 hours

### Step 6.1 — Landing page at `/`

Update `frontend/pages/index.tsx`:

The page must contain these sections in order:

**Section 1 — Hero**
- Headline: "Build a full-stack app in seconds"
- Sub-headline: "Describe your idea. AI generates the complete code — frontend, backend, database, auth. Live preview included."
- Two CTAs: "Start building free →" (→ /signup) and "See how it works" (→ scrolls to demo)
- Visual: animated preview of a generated app

**Section 2 — 3-Step Process**
- Step 1: "Describe your app" — text input illustration
- Step 2: "AI generates the code" — animated code illustration
- Step 3: "Preview and download" — preview window illustration

**Section 3 — Feature Highlights (3 cards)**
- Design DNA: "Every app is visually unique — 10 professional palettes, 7 layout styles"
- Live Preview: "See your app render in real-time as code is generated"
- Multi-Provider AI: "Use Gemini (free), OpenAI, Anthropic, or run locally with Ollama"

**Section 4 — Template Showcase**
- Show the 3 template variants (Minimal / Modern / Classic) as screenshots
- Link to `/templates/preview`

**Section 5 — Pricing**
Three cards:

| Plan | Price | Limit | CTA |
|------|-------|-------|-----|
| Free | $0/mo | 3 apps | Get started |
| Starter | $19/mo | 50 apps/mo | Start free trial |
| Pro | $49/mo | Unlimited | Start free trial |

**Section 6 — CTA Footer**
- "Ready to build your app?" with signup button

### Step 6.2 — Update SEO metadata

In `frontend/pages/_document.tsx` or each page `<Head>`:
```html
<title>IDEA — AI Full-Stack App Builder</title>
<meta name="description" content="Generate complete full-stack applications with AI. Frontend, backend, database, auth — all generated in seconds. Live preview included." />
<meta property="og:title" content="IDEA — AI Full-Stack App Builder" />
<meta property="og:description" content="Describe your idea. Get complete code." />
```

---

## PART 10 — PHASE 7: BILLING
> Without billing, you cannot make money. This unlocks the entire business model.
> Estimated time: 6–8 hours

### Step 7.1 — Install Stripe

```bash
cd backend
npm install stripe
npm install --save-dev @types/stripe

cd ../frontend
npm install @stripe/stripe-js
```

### Step 7.2 — Plan definitions

Create `backend/src/modules/billing/billing.config.ts`:
```typescript
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    generationsLimit: 3,
    stripePriceId: null
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 19,
    generationsLimit: 50,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID!
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    generationsLimit: -1,                // -1 = unlimited
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!
  }
};

export type PlanId = keyof typeof PLANS;
```

### Step 7.3 — Billing service

Create `backend/src/modules/billing/billing.service.ts`:
```typescript
import Stripe from 'stripe';
import { PlatformUser } from '../platform-auth/platform-user.model';
import { PLANS, PlanId } from './billing.config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' });

export class BillingService {

  async createCheckoutSession(userId: string, planId: PlanId, successUrl: string, cancelUrl: string) {
    const plan = PLANS[planId];
    if (!plan.stripePriceId) throw new Error('Invalid plan');

    const user = await PlatformUser.findById(userId);
    if (!user) throw new Error('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await PlatformUser.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planId }
    });

    return session.url;
  }

  async createPortalSession(userId: string, returnUrl: string) {
    const user = await PlatformUser.findById(userId);
    if (!user?.stripeCustomerId) throw new Error('No billing account found');

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl
    });

    return session.url;
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(
      rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, planId } = session.metadata!;
        const plan = PLANS[planId as PlanId];
        await PlatformUser.findByIdAndUpdate(userId, {
          plan: planId,
          generationsLimit: plan.generationsLimit,
          generationsUsed: 0,                        // reset on upgrade
          stripeSubscriptionId: session.subscription
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await PlatformUser.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { plan: 'free', generationsLimit: PLANS.free.generationsLimit, stripeSubscriptionId: null }
        );
        break;
      }
    }
  }
}

export const billingService = new BillingService();
```

### Step 7.4 — Billing routes

Create `backend/src/modules/billing/billing.routes.ts`:
```typescript
import { Router, raw } from 'express';
import { billingService } from './billing.service';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const url = await billingService.createCheckoutSession(
      (req as any).userId,
      req.body.planId,
      `${process.env.FRONTEND_URL}/dashboard?upgraded=true`,
      `${process.env.FRONTEND_URL}/pricing`
    );
    res.json({ success: true, data: { url }, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

router.post('/portal', requireAuth, async (req, res) => {
  try {
    const url = await billingService.createPortalSession(
      (req as any).userId,
      `${process.env.FRONTEND_URL}/dashboard`
    );
    res.json({ success: true, data: { url }, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

router.post('/webhook', raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  try {
    await billingService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook error: ${err.message}`);
  }
});

export default router;
```

### Step 7.5 — Wire billing into server.ts

```typescript
import billingRoutes from './modules/billing/billing.routes';
app.use('/api/platform/billing', billingRoutes);
```

### Step 7.6 — Frontend upgrade flow

In the dashboard, when a user is on the free plan and has used all generations:
```typescript
const handleUpgrade = async (planId: string) => {
  const { data } = await api.post('/api/platform/billing/checkout', { planId });
  window.location.href = data.data.url;   // redirect to Stripe checkout
};
```

---

## PART 11 — PHASE 8: PRODUCTION ENVIRONMENT & DEPLOYMENT

### Step 8.1 — Complete .env.example

Create/update `backend/.env.example`:
```bash
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# MongoDB
DATABASE_URL=mongodb://localhost:27017/idea_platform

# Platform JWT
JWT_SECRET=change-this-to-a-random-64-char-string

# AI Providers (add whichever you use)
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_URL=http://localhost:11434

# Enabled modules
ENABLED_MODULES=auth

# Stripe (billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

Create/update `frontend/.env.example`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 8.2 — Docker Compose

Update `docker-compose.yml`:
```yaml
version: '3.9'
services:
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: idea_platform
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mongodb://mongodb:27017/idea_platform
      JWT_SECRET: ${JWT_SECRET}
      PORT: 5000
      NODE_ENV: production
      FRONTEND_URL: ${FRONTEND_URL}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

### Step 8.3 — Backend Dockerfile

Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

### Step 8.4 — Frontend Dockerfile

Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### Step 8.5 — GitHub Actions CI/CD

Create `.github/workflows/main.yml`:
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: cd backend && npm ci
      - run: cd backend && npm run build      # must produce 0 TypeScript errors

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build

  deploy:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy frontend to Vercel
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Deploy backend to Railway
        run: |
          npm install -g @railway/cli
          railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Step 8.6 — Error monitoring with Sentry

```bash
cd backend && npm install @sentry/node
cd frontend && npm install @sentry/nextjs
```

In `backend/src/server.ts`:
```typescript
import * as Sentry from '@sentry/node';
if (process.env.NODE_ENV === 'production') {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  app.use(Sentry.Handlers.requestHandler());
}
// ... existing routes ...
if (process.env.NODE_ENV === 'production') {
  app.use(Sentry.Handlers.errorHandler());
}
```

---

## PART 12 — PHASE 9: END-TO-END SMOKE TEST

Run this complete test checklist before going live. Every item must pass.

### Backend API Tests
```bash
BASE=http://localhost:5000

# Health check
curl $BASE/api/platform/auth/me
# Expected: 401 No token provided

# Register
curl -X POST $BASE/api/platform/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!","name":"Smoke Test"}'
# Expected: 201 with token

# Login
TOKEN=$(curl -s -X POST $BASE/api/platform/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!"}' | jq -r '.data.token')

# Get current user
curl -H "Authorization: Bearer $TOKEN" $BASE/api/platform/auth/me
# Expected: 200 with user object

# List projects (empty)
curl -H "Authorization: Bearer $TOKEN" $BASE/api/platform/projects
# Expected: 200 with empty array
```

### Full User Journey Tests (Manual)
```
[ ] 1.  Visit http://localhost:3000 — landing page loads with hero + pricing
[ ] 2.  Click "Get Started Free" → redirects to /signup
[ ] 3.  Create account with email + password
[ ] 4.  Auto-redirected to /builder/new after signup
[ ] 5.  Complete all 5 builder steps (name → modules → template → backend → deploy)
[ ] 6.  On deploy step, click "Generate" — AI generation starts
[ ] 7.  See streaming code appear in real-time
[ ] 8.  See live preview render the generated component in sandbox
[ ] 9.  Preview stays sandboxed (clicking links does not navigate away)
[ ] 10. Generation completes — "complete" event fires
[ ] 11. Click "Download ZIP" — file downloads with correct project name
[ ] 12. ZIP contains backend/ and frontend/ folders with all generated files
[ ] 13. Navigate to /dashboard — shows the saved project
[ ] 14. Click project card → opens /builder/ai-generate with files
[ ] 15. Generate a second app — generation count increments
[ ] 16. Generate a third app — free limit reached
[ ] 17. Fourth generation attempt → blocked with upgrade message
[ ] 18. Click upgrade → Stripe checkout opens (test mode)
[ ] 19. Complete test payment — plan upgrades to Starter in dashboard
[ ] 20. Generate again — succeeds, no limit block
[ ] 21. Logout — redirects to home
[ ] 22. Try /dashboard — redirects to /login
[ ] 23. Login again → redirects back to dashboard
[ ] 24. Delete a project → removed from list
[ ] 25. Backend builds: cd backend && npm run build → 0 errors
[ ] 26. Frontend builds: cd frontend && npm run build → 0 errors

--- DEPLOYMENT TESTS ---
[ ] 27. On Step 5 (deployment page) all 3 deploy options are visible: Vercel / GitHub / Railway
[ ] 28. Click "Deploy to Vercel" without a token → shows "Enter your Vercel token" prompt
[ ] 29. Enter a valid Vercel token → deployment starts, shows progress indicator
[ ] 30. Vercel deployment completes → live URL appears and is clickable
[ ] 31. Vercel URL opens in new tab and shows the generated frontend app
[ ] 32. Click "Push to GitHub" without GitHub connected → shows GitHub OAuth button
[ ] 33. Complete GitHub OAuth → user's GitHub username appears as connected
[ ] 34. Enter repo name → "Create new repo" creates repo on GitHub
[ ] 35. GitHub push completes → repository URL shown, clickable link to GitHub
[ ] 36. GitHub repo contains frontend/ and backend/ folders with all generated files
[ ] 37. Click "Deploy to Railway" without a token → shows "Enter your Railway token" prompt
[ ] 38. Enter a valid Railway token → service creation starts
[ ] 39. Railway deployment completes → backend service URL shown
[ ] 40. Railway URL responds to GET /api/auth/me with expected JSON
[ ] 41. Dashboard shows all three deploy URLs on the project card
[ ] 42. Re-deploying to Vercel after code change creates a new deployment
[ ] 43. Tokens are never stored in the IDEA platform database in plaintext
```

---

## PART 13 — COMPLETE API REFERENCE

### Platform Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/platform/auth/register` | None | Create platform account |
| POST | `/api/platform/auth/login` | None | Login, receive JWT |
| GET | `/api/platform/auth/me` | Bearer | Get current user + usage |

### Platform Projects
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/platform/projects` | Bearer | List user's projects |
| GET | `/api/platform/projects/:id` | Bearer | Get project + all files |
| GET | `/api/platform/projects/:id/download` | Bearer | Download project as ZIP |
| DELETE | `/api/platform/projects/:id` | Bearer | Delete project |

### Billing
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/platform/billing/checkout` | Bearer | Create Stripe checkout session |
| POST | `/api/platform/billing/portal` | Bearer | Open Stripe billing portal |
| POST | `/api/platform/billing/webhook` | Stripe sig | Handle Stripe webhook events |

### Generated App Auth (Existing — Preserve)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | None | Generated app user signup |
| POST | `/api/auth/login` | None | Generated app user login |
| GET | `/api/auth/me` | Bearer | Generated app current user |

### AI Generation (Existing — Preserve)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/generate` | Optional | Generate full-stack code (SSE stream) |
| POST | `/api/ai/refine` | Optional | Refine specific file |
| GET | `/api/ai/providers` | None | List available AI providers |

### Project Build (Existing — Preserve)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/project/generate` | None | Orchestrate full generation |
| POST | `/api/project/download` | None | Get ZIP of generated project |
| POST | `/api/project/github` | None | Push to GitHub |

### User-Facing Deployment (New)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/deploy/vercel` | Bearer | Deploy generated frontend to Vercel |
| GET  | `/api/deploy/vercel/status/:deployId` | Bearer | Poll Vercel deployment status |
| POST | `/api/deploy/github` | Bearer | Push generated project to GitHub repo |
| GET  | `/api/deploy/github/callback` | None | GitHub OAuth callback |
| POST | `/api/deploy/railway` | Bearer | Deploy generated backend to Railway |
| GET  | `/api/deploy/railway/status/:serviceId` | Bearer | Poll Railway deploy status |
| GET  | `/api/deploy/status/:projectId` | Bearer | Get all deployment URLs for a project |

---

## PART 14 — IMPLEMENTATION SEQUENCE

Execute phases in strict order. Each phase must fully pass before starting the next.

```
PHASE 1 — Fix backend build (2–4 hrs)   ← START HERE
  1.1  Install missing npm deps
  1.2  Create express type augmentation file
  1.3  Fix jwt.sign typing in auth.service.ts
  1.4  Fix method signatures in project.service.ts
  1.5  Update tsconfig.json excludes
  1.6  Verify: npm run build → 0 errors

PHASE 2 — Platform user accounts (6–8 hrs)
  2.1  Create PlatformUser Mongoose model
  2.2  Create PlatformAuthService
  2.3  Create Zod schemas
  2.4  Create PlatformAuthController
  2.5  Create JWT auth middleware
  2.6  Create routes
  2.7  Wire into server.ts
  2.8  Test register + login + me endpoints

PHASE 3 — Project persistence (4–6 hrs)
  3.1  Create PlatformProject Mongoose model
  3.2  Create PlatformProjectsService (list, get, save, download, delete)
  3.3  Create controller + routes
  3.4  Wire into server.ts
  3.5  Update AI generate handler to save projects after completion

PHASE 4 — Rate limiting + quotas (2–3 hrs)
  4.1  Install express-rate-limit
  4.2  Create rate limiter middleware
  4.3  Create generation quota check middleware
  4.4  Apply middleware to AI generate route
  4.5  Increment generation counter after successful generation

PHASE 5 — Frontend auth + dashboard (6–8 hrs)
  5.1  Create lib/api.ts with Axios + interceptors
  5.2  Create AuthContext
  5.3  Wrap _app.tsx with AuthProvider
  5.4  Build login page
  5.5  Build signup page
  5.6  Build dashboard page (project list + usage meter)
  5.7  Build Navbar with auth state
  5.8  Build ProtectedRoute component
  5.9  Test: register → login → dashboard → see projects → logout

PHASE 6 — Landing page (4–6 hrs)
  6.1  Build landing page: hero + steps + features + templates + pricing + CTA
  6.2  Update SEO metadata
  6.3  Test: landing page → signup flow → builder flow

PHASE 7 — Billing (6–8 hrs)
  7.1  Install Stripe SDK
  7.2  Create Stripe products + prices in Stripe Dashboard
  7.3  Create plan config
  7.4  Create BillingService
  7.5  Create billing routes
  7.6  Wire into server.ts
  7.7  Add upgrade button in dashboard and on limit-reached error
  7.8  Test: free user hits limit → upgrades → can generate again

PHASE 8 — Production deployment (4–6 hrs)
  8.1  Complete .env.example files
  8.2  Create Docker Compose with mongodb + redis + backend + frontend
  8.3  Create backend Dockerfile
  8.4  Create frontend Dockerfile
  8.5  Set up Vercel project for frontend
  8.6  Set up Railway project for backend + MongoDB
  8.7  Add GitHub Actions CI/CD workflow
  8.8  Add Sentry error monitoring
  8.9  Set all environment variables in Railway and Vercel dashboards

PHASE 9 — Final verification (2–3 hrs)
  9.1  Run all 43 smoke test items (Part 12)
  9.2  Fix any failures
  9.3  Verify production URLs work end-to-end
  9.4  Deploy and confirm

PHASE 10 — User-facing deployment (8–12 hrs)
  10.1  Install deploy dependencies (octokit, node-fetch)
  10.2  Add GITHUB_CLIENT_ID/SECRET to env, set up GitHub OAuth app
  10.3  Build GitHubService: OAuth flow + repo create + file push
  10.4  Build VercelService: create deployment + upload files + poll status
  10.5  Build RailwayService: create project + service + deploy via GraphQL API
  10.6  Build DeployController with all endpoints
  10.7  Build deploy.routes.ts and wire into server.ts
  10.8  Save deployment URLs back to PlatformProject model
  10.9  Update deployment.tsx frontend page with 3 deploy option cards
  10.10 Build DeploymentStatus component with polling and live URL display
  10.11 Show all deployment URLs on dashboard project cards
  10.12 Run deployment smoke tests (items 27–43 in Part 12)
```

Total estimated time: **48–66 hours** of focused development.

---

## PART 15 — PRODUCTION READINESS CHECKLIST

The platform is ready for real paying users ONLY when every item below is checked.

### Build & Code Quality
- [ ] `cd backend && npm run build` passes with zero TypeScript errors
- [ ] `cd frontend && npm run build` passes with zero errors
- [ ] No `console.log` statements with sensitive data in production builds
- [ ] All `.env` files are gitignored, only `.env.example` is committed

### Functionality
- [ ] All 26 smoke test items pass (Part 12)
- [ ] AI generation works with at least 2 providers (recommend Gemini free + OpenAI)
- [ ] Live preview renders generated components without errors
- [ ] ZIP download contains valid, runnable code
- [ ] Project history saves and loads correctly

### Security
- [ ] JWT_SECRET is a random 64+ character string (not the example value)
- [ ] CORS allows only your production frontend domain
- [ ] Rate limiting is applied to AI generate and auth endpoints
- [ ] Stripe webhook validates the signature before processing
- [ ] Passwords are hashed with bcrypt (never stored in plaintext)
- [ ] No API keys committed to git

### Business
- [ ] Stripe is configured with real products and prices (not test mode)
- [ ] Free plan limit is enforced (3 generations)
- [ ] Upgrade flow completes end-to-end in Stripe test mode
- [ ] Webhook correctly upgrades user plan in MongoDB
- [ ] Billing portal allows users to cancel subscription

### Infrastructure
- [ ] Platform is accessible at a public HTTPS URL
- [ ] MongoDB has authentication enabled in production
- [ ] Sentry is configured and receiving errors
- [ ] Docker Compose runs without errors locally
- [ ] GitHub Actions CI passes on every push to main

### User-Facing Deployment
- [ ] Vercel deploy creates a live URL for the generated frontend
- [ ] GitHub push creates a real repository with all project files
- [ ] Railway deploy creates a live backend service URL
- [ ] Deployment URLs are saved to the project record and visible in dashboard
- [ ] User tokens are never persisted in the IDEA platform database
- [ ] Deploy buttons are disabled (with upgrade prompt) on free plan

---

## PART 16 — PHASE 10: USER-FACING DEPLOYMENT SYSTEM

> This is the feature that turns IDEA from a "code downloader" into a true app launcher.
> Users generate code, click one button, and have a live URL to share.
> Estimated time: 8–12 hours

### Architecture Overview

```
User clicks "Deploy to Vercel / GitHub / Railway"
             ↓
User provides their own API token (Vercel token / GitHub OAuth / Railway token)
             ↓
IDEA backend calls the target platform's API using the user's token
             ↓
Files from the generated project are uploaded / pushed
             ↓
IDEA polls for deployment completion
             ↓
Live URL is returned to user and saved to project record
             ↓
URL appears in dashboard and can be shared
```

**Token Security Model:**
- User tokens are sent in the request body for each deploy call
- Tokens are NEVER stored in the IDEA platform MongoDB
- If users want one-click re-deploy, they store tokens in browser localStorage only
- This means zero liability for IDEA if a user's token is compromised

**Plan Gating:**
- Free plan: ZIP download only
- Starter plan: GitHub push + Vercel deploy
- Pro plan: All three (Vercel + GitHub + Railway)

---

### Step 10.1 — Install deployment dependencies

```bash
cd backend
npm install @octokit/rest node-fetch
npm install --save-dev @types/node-fetch
```

---

### Step 10.2 — Update PlatformProject model to store deploy URLs

Add these fields to `backend/src/modules/platform-projects/platform-project.model.ts`:
```typescript
// Add inside platformProjectSchema
vercelDeployUrl:    { type: String },
vercelDeployId:     { type: String },
githubRepoUrl:      { type: String },
githubRepoName:     { type: String },
railwayServiceUrl:  { type: String },
railwayServiceId:   { type: String },
railwayProjectId:   { type: String },
lastDeployedAt:     { type: Date },
```

---

### Step 10.3 — Vercel Deploy Service

Create `backend/src/modules/deploy/vercel.service.ts`:

```typescript
import fetch from 'node-fetch';

interface VercelFile {
  file: string;       // file path inside deployment
  data: string;       // file content (string)
  encoding: 'utf-8' | 'base64';
}

interface VercelDeployResult {
  deployId: string;
  url: string;
  readyState: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
}

export class VercelService {
  private baseUrl = 'https://api.vercel.com';

  /**
   * Deploy the frontend files of a generated project to Vercel.
   * Only frontend/ files are deployed — backend must go to Railway separately.
   *
   * @param vercelToken  — user's own Vercel personal access token
   * @param projectName  — used as the Vercel project name (lowercase, hyphens only)
   * @param files        — all generated project files
   */
  async deployFrontend(
    vercelToken: string,
    projectName: string,
    files: Array<{ path: string; content: string }>
  ): Promise<VercelDeployResult> {

    // Filter to frontend files only
    const frontendFiles = files.filter(f =>
      f.path.startsWith('frontend/') || f.path === 'SETUP.md'
    );

    if (frontendFiles.length === 0) {
      throw new Error('No frontend files found in this project');
    }

    // Map to Vercel file format — strip the leading 'frontend/' prefix
    const vercelFiles: VercelFile[] = frontendFiles.map(f => ({
      file: f.path.replace(/^frontend\//, ''),
      data: f.content,
      encoding: 'utf-8'
    }));

    // Ensure a minimal Next.js package.json exists if not in generated files
    const hasPackageJson = vercelFiles.some(f => f.file === 'package.json');
    if (!hasPackageJson) {
      vercelFiles.push({
        file: 'package.json',
        data: JSON.stringify({
          name: projectName.toLowerCase().replace(/\s+/g, '-'),
          version: '0.1.0',
          scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
          dependencies: { next: '^14.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' }
        }, null, 2),
        encoding: 'utf-8'
      });
    }

    // Create the Vercel deployment
    const response = await fetch(`${this.baseUrl}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        files: vercelFiles,
        projectSettings: {
          framework: 'nextjs',
          buildCommand: 'next build',
          outputDirectory: '.next',
          installCommand: 'npm install'
        },
        target: 'production'
      })
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Vercel deployment failed: ${error.error?.message || response.statusText}`);
    }

    const deployment = await response.json() as any;

    return {
      deployId: deployment.id,
      url: `https://${deployment.url}`,
      readyState: deployment.readyState
    };
  }

  /**
   * Poll for deployment status until READY or ERROR.
   * Call this endpoint repeatedly from the frontend (every 3 seconds).
   */
  async getDeploymentStatus(vercelToken: string, deployId: string): Promise<VercelDeployResult> {
    const response = await fetch(`${this.baseUrl}/v13/deployments/${deployId}`, {
      headers: { Authorization: `Bearer ${vercelToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to get deployment status`);
    }

    const deployment = await response.json() as any;

    return {
      deployId: deployment.id,
      url: `https://${deployment.url}`,
      readyState: deployment.readyState
    };
  }

  /**
   * Verify a Vercel token is valid before attempting deployment.
   */
  async verifyToken(vercelToken: string): Promise<{ valid: boolean; username?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/user`, {
        headers: { Authorization: `Bearer ${vercelToken}` }
      });
      if (!response.ok) return { valid: false };
      const data = await response.json() as any;
      return { valid: true, username: data.user?.username };
    } catch {
      return { valid: false };
    }
  }
}

export const vercelService = new VercelService();
```

---

### Step 10.4 — GitHub Service

Create `backend/src/modules/deploy/github.service.ts`:

```typescript
import { Octokit } from '@octokit/rest';

interface GitHubPushResult {
  repoUrl: string;
  repoName: string;
  isNew: boolean;
}

export class GitHubService {

  /**
   * Push all generated project files to a GitHub repository.
   * Creates the repo if it doesn't exist. Updates files if repo already exists.
   *
   * @param githubToken — user's GitHub personal access token (classic, with repo scope)
   * @param repoName    — desired repository name
   * @param files       — all generated files
   * @param isPrivate   — true for private repo (default false)
   */
  async pushToGitHub(
    githubToken: string,
    repoName: string,
    files: Array<{ path: string; content: string }>,
    isPrivate: boolean = false
  ): Promise<GitHubPushResult> {

    const octokit = new Octokit({ auth: githubToken });

    // Get authenticated user
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const owner = user.login;

    const cleanRepoName = repoName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    // Check if repo already exists
    let repoExists = false;
    try {
      await octokit.rest.repos.get({ owner, repo: cleanRepoName });
      repoExists = true;
    } catch {
      repoExists = false;
    }

    // Create repo if it doesn't exist
    if (!repoExists) {
      await octokit.rest.repos.createForAuthenticatedUser({
        name: cleanRepoName,
        description: `Generated by IDEA Platform`,
        private: isPrivate,
        auto_init: true           // creates initial commit with README so the repo has a HEAD
      });
      // Brief pause to let GitHub initialise the repo
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Get the default branch SHA (needed for tree creation)
    const { data: refData } = await octokit.rest.git.getRef({
      owner, repo: cleanRepoName,
      ref: 'heads/main'
    });
    const latestCommitSha = refData.object.sha;

    const { data: commitData } = await octokit.rest.git.getCommit({
      owner, repo: cleanRepoName,
      commit_sha: latestCommitSha
    });
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for all files
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner, repo: cleanRepoName,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha
        };
      })
    );

    // Create a new tree with all files
    const { data: newTree } = await octokit.rest.git.createTree({
      owner, repo: cleanRepoName,
      base_tree: baseTreeSha,
      tree: treeItems
    });

    // Create a commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner, repo: cleanRepoName,
      message: repoExists
        ? 'Update: regenerated by IDEA Platform'
        : 'Initial commit: generated by IDEA Platform',
      tree: newTree.sha,
      parents: [latestCommitSha]
    });

    // Update the branch ref to point to the new commit
    await octokit.rest.git.updateRef({
      owner, repo: cleanRepoName,
      ref: 'heads/main',
      sha: newCommit.sha
    });

    return {
      repoUrl: `https://github.com/${owner}/${cleanRepoName}`,
      repoName: cleanRepoName,
      isNew: !repoExists
    };
  }

  /**
   * Verify a GitHub token and return the username.
   */
  async verifyToken(githubToken: string): Promise<{ valid: boolean; username?: string }> {
    try {
      const octokit = new Octokit({ auth: githubToken });
      const { data: user } = await octokit.rest.users.getAuthenticated();
      return { valid: true, username: user.login };
    } catch {
      return { valid: false };
    }
  }
}

export const githubService = new GitHubService();
```

---

### Step 10.5 — Railway Deploy Service

Create `backend/src/modules/deploy/railway.service.ts`:

```typescript
import fetch from 'node-fetch';

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

interface RailwayDeployResult {
  projectId: string;
  serviceId: string;
  serviceUrl: string;
  deploymentId: string;
  status: 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CRASHED' | 'WAITING';
}

export class RailwayService {

  private async gql(token: string, query: string, variables?: object): Promise<any> {
    const response = await fetch(RAILWAY_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    if (data.errors?.length) {
      throw new Error(`Railway GraphQL error: ${data.errors[0].message}`);
    }
    return data.data;
  }

  /**
   * Deploy the backend files of a generated project to Railway.
   * Creates a Railway project + service + deploys via a GitHub repo or template.
   *
   * NOTE: Railway's API deploys from a GitHub repo, not raw file upload.
   * Therefore, GitHub push MUST happen before Railway deploy.
   * Railway then deploys the backend/ folder from the pushed GitHub repo.
   *
   * @param railwayToken  — user's Railway API token
   * @param projectName   — name for the Railway project
   * @param githubRepoUrl — full GitHub repo URL (from GitHub push step)
   * @param repoName      — repo name for Railway GitHub integration
   * @param githubOwner   — GitHub username that owns the repo
   */
  async deployBackend(
    railwayToken: string,
    projectName: string,
    githubRepoUrl: string,
    repoOwner: string,
    repoName: string
  ): Promise<RailwayDeployResult> {

    // Step 1: Create a Railway project
    const createProjectData = await this.gql(railwayToken, `
      mutation CreateProject($name: String!) {
        projectCreate(input: { name: $name }) {
          id
          name
        }
      }
    `, { name: projectName });

    const projectId = createProjectData.projectCreate.id;

    // Step 2: Create a service in the project connected to the GitHub repo
    const createServiceData = await this.gql(railwayToken, `
      mutation CreateService($projectId: String!, $name: String!, $source: ServiceSourceInput) {
        serviceCreate(input: {
          projectId: $projectId
          name: $name
          source: $source
        }) {
          id
          name
        }
      }
    `, {
      projectId,
      name: `${projectName}-backend`,
      source: {
        repo: `${repoOwner}/${repoName}`
      }
    });

    const serviceId = createServiceData.serviceCreate.id;

    // Step 3: Set environment variables for the backend service
    await this.gql(railwayToken, `
      mutation SetVariables($projectId: String!, $serviceId: String!, $variables: EnvironmentVariablesInput!) {
        variableCollectionUpsert(
          projectId: $projectId
          serviceId: $serviceId
          variables: $variables
        )
      }
    `, {
      projectId,
      serviceId,
      variables: {
        PORT: '5000',
        NODE_ENV: 'production',
        RAILWAY_ROOT_DIR: 'backend'
      }
    });

    // Step 4: Trigger a deployment
    const deployData = await this.gql(railwayToken, `
      mutation DeployService($serviceId: String!, $environmentId: String) {
        serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
      }
    `, { serviceId });

    // Step 5: Get the service domain
    const domainData = await this.gql(railwayToken, `
      query GetServiceDomain($serviceId: String!) {
        service(id: $serviceId) {
          domains {
            serviceDomains {
              domain
            }
          }
        }
      }
    `, { serviceId });

    const domains = domainData?.service?.domains?.serviceDomains || [];
    const serviceUrl = domains.length > 0
      ? `https://${domains[0].domain}`
      : `https://${serviceId}.railway.app`;

    return {
      projectId,
      serviceId,
      serviceUrl,
      deploymentId: deployData?.serviceInstanceDeploy || '',
      status: 'BUILDING'
    };
  }

  /**
   * Poll the deployment status.
   */
  async getDeploymentStatus(
    railwayToken: string,
    serviceId: string
  ): Promise<{ status: string; url?: string }> {
    const data = await this.gql(railwayToken, `
      query GetService($serviceId: String!) {
        service(id: $serviceId) {
          deployments(last: 1) {
            edges {
              node {
                status
                staticUrl
              }
            }
          }
        }
      }
    `, { serviceId });

    const deployment = data?.service?.deployments?.edges?.[0]?.node;
    return {
      status: deployment?.status || 'BUILDING',
      url: deployment?.staticUrl
    };
  }

  /**
   * Verify a Railway API token.
   */
  async verifyToken(railwayToken: string): Promise<{ valid: boolean; username?: string }> {
    try {
      const data = await this.gql(railwayToken, `query { me { name email } }`);
      return { valid: true, username: data?.me?.name };
    } catch {
      return { valid: false };
    }
  }
}

export const railwayService = new RailwayService();
```

---

### Step 10.6 — Deploy Controller

Create `backend/src/modules/deploy/deploy.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { vercelService } from './vercel.service';
import { githubService } from './github.service';
import { railwayService } from './railway.service';
import { PlatformProject } from '../platform-projects/platform-project.model';

export class DeployController {

  // POST /api/deploy/vercel
  deployToVercel = async (req: Request, res: Response) => {
    try {
      const { projectId, vercelToken } = req.body;
      const userId = (req as any).userId;

      if (!vercelToken) {
        return res.status(400).json({ success: false, data: null,
          error: 'Vercel token is required. Get yours at vercel.com/account/tokens' });
      }

      // Validate token first
      const { valid, username } = await vercelService.verifyToken(vercelToken);
      if (!valid) {
        return res.status(401).json({ success: false, data: null,
          error: 'Invalid Vercel token. Please check and try again.' });
      }

      // Load project files from DB
      const project = await PlatformProject.findOne({ _id: projectId, userId });
      if (!project) {
        return res.status(404).json({ success: false, data: null, error: 'Project not found' });
      }

      // Start deployment
      const result = await vercelService.deployFrontend(
        vercelToken,
        project.name,
        project.files as any[]
      );

      // Save deploy ID and initial URL to project
      await PlatformProject.findByIdAndUpdate(projectId, {
        vercelDeployId: result.deployId,
        vercelDeployUrl: result.url,
        lastDeployedAt: new Date()
      });

      res.json({
        success: true,
        data: {
          deployId: result.deployId,
          url: result.url,
          readyState: result.readyState,
          vercelUser: username
        },
        error: null
      });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  // GET /api/deploy/vercel/status/:deployId
  getVercelStatus = async (req: Request, res: Response) => {
    try {
      const { vercelToken } = req.query as { vercelToken: string };
      const { deployId } = req.params;

      if (!vercelToken) {
        return res.status(400).json({ success: false, data: null, error: 'vercelToken query param required' });
      }

      const result = await vercelService.getDeploymentStatus(vercelToken, deployId);

      // If READY, update the project URL in DB
      if (result.readyState === 'READY') {
        const { projectId } = req.query as { projectId: string };
        if (projectId) {
          await PlatformProject.findByIdAndUpdate(projectId, { vercelDeployUrl: result.url });
        }
      }

      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  // POST /api/deploy/github
  pushToGitHub = async (req: Request, res: Response) => {
    try {
      const { projectId, githubToken, repoName, isPrivate } = req.body;
      const userId = (req as any).userId;

      if (!githubToken) {
        return res.status(400).json({ success: false, data: null,
          error: 'GitHub token required. Create a personal access token with "repo" scope at github.com/settings/tokens' });
      }

      const { valid, username } = await githubService.verifyToken(githubToken);
      if (!valid) {
        return res.status(401).json({ success: false, data: null,
          error: 'Invalid GitHub token. Ensure it has the "repo" scope.' });
      }

      const project = await PlatformProject.findOne({ _id: projectId, userId });
      if (!project) {
        return res.status(404).json({ success: false, data: null, error: 'Project not found' });
      }

      const targetRepoName = repoName || project.name;

      const result = await githubService.pushToGitHub(
        githubToken,
        targetRepoName,
        project.files as any[],
        isPrivate || false
      );

      await PlatformProject.findByIdAndUpdate(projectId, {
        githubRepoUrl: result.repoUrl,
        githubRepoName: result.repoName,
        lastDeployedAt: new Date()
      });

      res.json({
        success: true,
        data: {
          repoUrl: result.repoUrl,
          repoName: result.repoName,
          isNew: result.isNew,
          githubUser: username
        },
        error: null
      });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  // POST /api/deploy/railway
  deployToRailway = async (req: Request, res: Response) => {
    try {
      const { projectId, railwayToken, githubOwner, githubRepo } = req.body;
      const userId = (req as any).userId;

      if (!railwayToken) {
        return res.status(400).json({ success: false, data: null,
          error: 'Railway token required. Get yours at railway.app/account/tokens' });
      }

      if (!githubOwner || !githubRepo) {
        return res.status(400).json({ success: false, data: null,
          error: 'GitHub repo required for Railway deploy. Push to GitHub first.' });
      }

      const { valid } = await railwayService.verifyToken(railwayToken);
      if (!valid) {
        return res.status(401).json({ success: false, data: null, error: 'Invalid Railway token.' });
      }

      const project = await PlatformProject.findOne({ _id: projectId, userId });
      if (!project) {
        return res.status(404).json({ success: false, data: null, error: 'Project not found' });
      }

      const result = await railwayService.deployBackend(
        railwayToken,
        project.name,
        `https://github.com/${githubOwner}/${githubRepo}`,
        githubOwner,
        githubRepo
      );

      await PlatformProject.findByIdAndUpdate(projectId, {
        railwayServiceUrl: result.serviceUrl,
        railwayServiceId: result.serviceId,
        railwayProjectId: result.projectId,
        lastDeployedAt: new Date()
      });

      res.json({
        success: true,
        data: {
          serviceUrl: result.serviceUrl,
          serviceId: result.serviceId,
          projectId: result.projectId,
          status: result.status
        },
        error: null
      });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  // GET /api/deploy/railway/status/:serviceId
  getRailwayStatus = async (req: Request, res: Response) => {
    try {
      const { railwayToken } = req.query as { railwayToken: string };
      const { serviceId } = req.params;

      if (!railwayToken) {
        return res.status(400).json({ success: false, data: null, error: 'railwayToken query param required' });
      }

      const result = await railwayService.getDeploymentStatus(railwayToken, serviceId);
      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  // GET /api/deploy/status/:projectId — get all saved deploy URLs
  getAllDeployStatus = async (req: Request, res: Response) => {
    try {
      const project = await PlatformProject.findOne({
        _id: req.params.projectId,
        userId: (req as any).userId
      }).select('vercelDeployUrl githubRepoUrl railwayServiceUrl lastDeployedAt name');

      if (!project) {
        return res.status(404).json({ success: false, data: null, error: 'Project not found' });
      }

      res.json({
        success: true,
        data: {
          vercelUrl:   project.vercelDeployUrl || null,
          githubUrl:   project.githubRepoUrl || null,
          railwayUrl:  project.railwayServiceUrl || null,
          lastDeployedAt: project.lastDeployedAt || null
        },
        error: null
      });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };
}

export const deployController = new DeployController();
```

---

### Step 10.7 — Deploy Routes

Create `backend/src/modules/deploy/deploy.routes.ts`:

```typescript
import { Router } from 'express';
import { deployController } from './deploy.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { rateLimit } from 'express-rate-limit';

const deployLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10 minutes
  max: 5,                       // 5 deployments per 10 minutes
  message: { success: false, data: null, error: 'Too many deploy requests. Please wait.' }
});

const router = Router();

router.use(requireAuth);                                    // all deploy routes require login
router.use(deployLimiter);                                  // rate limit all deploys

router.post('/vercel',                deployController.deployToVercel);
router.get('/vercel/status/:deployId', deployController.getVercelStatus);
router.post('/github',                deployController.pushToGitHub);
router.post('/railway',               deployController.deployToRailway);
router.get('/railway/status/:serviceId', deployController.getRailwayStatus);
router.get('/status/:projectId',      deployController.getAllDeployStatus);

export default router;
```

### Step 10.8 — Wire deploy routes into server.ts

```typescript
import deployRoutes from './modules/deploy/deploy.routes';
app.use('/api/deploy', deployRoutes);
```

---

### Step 10.9 — Frontend: Deployment Step UI

Update `frontend/pages/builder/deployment.tsx` — replace the existing deploy section with three option cards.

**Component structure:**
```
DeploymentPage
  ├── ProjectSummary (name, modules, template, backend, file count)
  │
  ├── DeployOptionCard: "Download ZIP"     [always available, all plans]
  │   └── button: "Download" → GET /api/platform/projects/:id/download
  │
  ├── DeployOptionCard: "Push to GitHub"   [Starter + Pro]
  │   ├── input: GitHub Personal Access Token (type=password)
  │   ├── input: Repository name (pre-filled with project name)
  │   ├── checkbox: Private repository
  │   ├── button: "Push to GitHub →"
  │   └── result: shows repo URL when done
  │
  ├── DeployOptionCard: "Deploy Frontend to Vercel"  [Starter + Pro]
  │   ├── input: Vercel Token (type=password)
  │   ├── button: "Deploy to Vercel →"
  │   ├── progressBar: polls /api/deploy/vercel/status/:deployId every 3s
  │   └── result: shows live URL when READY
  │
  └── DeployOptionCard: "Deploy Backend to Railway"  [Pro only]
      ├── note: "GitHub push required first"
      ├── input: Railway Token (type=password)
      ├── button: "Deploy to Railway →"
      ├── progressBar: polls /api/deploy/railway/status/:serviceId every 5s
      └── result: shows backend URL when SUCCESS
```

**Key implementation notes for the frontend page:**

1. Read `projectId` from `localStorage` after generation completes
2. On plan check: read user plan from `AuthContext`. If free plan, show lock icon on GitHub / Vercel / Railway cards with "Upgrade to Starter" CTA
3. Token inputs use `type="password"` so tokens are not visible
4. Never send tokens to any endpoint other than the deploy endpoints
5. Store tokens in `sessionStorage` (not localStorage) so they clear when browser closes
6. Show a spinner while deploying, check status every 3 seconds
7. On success, show green checkmark + clickable URL + "Copy link" button
8. Show Railway card only after GitHub push succeeds (Railway needs the repo)

**Deploy status polling hook:**
```typescript
// frontend/hooks/useDeployStatus.ts
import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

type ReadyState = 'idle' | 'building' | 'ready' | 'error';

export function useVercelStatus(deployId: string | null, vercelToken: string | null) {
  const [status, setStatus] = useState<ReadyState>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!deployId || !vercelToken) return;
    setStatus('building');

    intervalRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/deploy/vercel/status/${deployId}`, {
          params: { vercelToken }
        });
        const { readyState, url: deployUrl } = data.data;

        if (readyState === 'READY') {
          setStatus('ready');
          setUrl(deployUrl);
          clearInterval(intervalRef.current!);
        } else if (readyState === 'ERROR' || readyState === 'CANCELED') {
          setStatus('error');
          clearInterval(intervalRef.current!);
        }
      } catch {
        setStatus('error');
        clearInterval(intervalRef.current!);
      }
    }, 3000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [deployId, vercelToken]);

  return { status, url };
}
```

---

### Step 10.10 — Dashboard Deploy Badges

Update `frontend/components/ProjectCard.tsx` to show deployment badges:

```typescript
// Show badges for each active deployment
{project.vercelDeployUrl && (
  <a href={project.vercelDeployUrl} target="_blank"
    className="inline-flex items-center gap-1 text-xs bg-black text-white px-2 py-1 rounded-md hover:opacity-80">
    ▲ Vercel
  </a>
)}
{project.githubRepoUrl && (
  <a href={project.githubRepoUrl} target="_blank"
    className="inline-flex items-center gap-1 text-xs bg-gray-800 text-white px-2 py-1 rounded-md hover:opacity-80">
    GitHub
  </a>
)}
{project.railwayServiceUrl && (
  <a href={project.railwayServiceUrl} target="_blank"
    className="inline-flex items-center gap-1 text-xs bg-purple-600 text-white px-2 py-1 rounded-md hover:opacity-80">
    Railway
  </a>
)}
```

---

### Step 10.11 — Updated .env.example additions

Add to `backend/.env.example`:
```bash
# User-facing deployment (NO platform keys needed — users supply their own tokens)
# These are only needed if you want to offer GitHub OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/deploy/github/callback
```

---

### Step 10.12 — Deployment User Guide (include in generated SETUP.md)

Every generated project ZIP now includes a DEPLOY.md with instructions:

```markdown
# Deploying Your App

## Frontend → Vercel
1. Go to vercel.com → Settings → Tokens → Create Token
2. In IDEA dashboard, open your project → Deploy → "Deploy to Vercel"
3. Paste your token → click Deploy
4. Your frontend is live in ~60 seconds

## All Files → GitHub
1. Go to github.com → Settings → Developer Settings → Personal Access Tokens
2. Create a token with "repo" scope
3. In IDEA dashboard, open your project → Deploy → "Push to GitHub"
4. Paste your token + choose a repo name → click Push
5. Your full project is now on GitHub

## Backend → Railway
1. Go to railway.app → Settings → Tokens → New Token
2. Push to GitHub first (Railway deploys from GitHub)
3. In IDEA dashboard, open your project → Deploy → "Deploy to Railway"
4. Paste your Railway token → click Deploy
5. Your backend API is live in ~2 minutes
6. Copy the Railway URL and set NEXT_PUBLIC_API_URL in your Vercel project settings
```

---

*End of document. Version 3.0. Generated: 2026-03-18.*
*This document supersedes all previous implementation plans.*
*Feed this entire document to your AI agent as the execution context.*
