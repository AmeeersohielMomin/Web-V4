# 🏛️ Architecture & Design Patterns

## Overview

This authentication module implements a **template-driven, modular architecture** designed for scalability, reusability, and maintainability.

## Core Design Principles

### 1. **Separation of Concerns**
Each layer has a single, well-defined responsibility:
- **Routes:** Handle HTTP routing
- **Controllers:** Process requests/responses
- **Services:** Contain business logic
- **Models:** Define data structure
- **Schemas:** Validate input data

### 2. **Feature Flags**
Both frontend and backend use feature flags to enable/disable modules:
- Backend: `ENABLED_MODULES` environment variable
- Frontend: `FEATURES` configuration object

### 3. **Template-Based Development**
- UI templates are completely isolated
- Business logic modules are self-contained
- Each feature can be enabled/disabled independently

### 4. **Contract-First API Design**
All endpoints follow a consistent response format:
```typescript
{
  success: boolean;
  data: T | null;
  error: string | null;
}
```

## Backend Architecture

### Module Structure

```
backend/src/modules/auth/
├── auth.routes.ts      → Express router, defines endpoints
├── auth.controller.ts  → Request handlers, input/output
├── auth.service.ts     → Business logic, database operations
├── auth.schema.ts      → Zod validation schemas
└── auth.model.ts       → Mongoose model
```

### Data Flow

```
Request
  ↓
auth.routes.ts (routing)
  ↓
auth.controller.ts (validation, error handling)
  ↓
auth.service.ts (business logic)
  ↓
auth.model.ts (database)
  ↓
Response
```

### Key Patterns

#### 1. Dependency Injection
```typescript
export class AuthController {
  private authService: AuthService;
  
  constructor() {
    this.authService = new AuthService();
  }
}
```

#### 2. Environment Validation
Server fails fast if required variables are missing:
```typescript
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', ...];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables');
  process.exit(1);
}
```

#### 3. Conditional Module Loading
```typescript
if (isModuleEnabled('auth')) {
  import('./modules/auth/auth.routes').then(({ authRoutes }) => {
    app.use('/api/auth', authRoutes);
  });
}
```

### Security Implementation

1. **Password Hashing:** bcrypt with configurable salt rounds
2. **JWT Tokens:** Signed with secret, configurable expiration
3. **Input Validation:** Zod schemas on all endpoints
4. **Error Messages:** Generic messages to prevent information leakage

## Frontend Architecture

### Template Structure

```
frontend/templates/auth/
├── pages/
│   ├── login.tsx       → Login page component
│   └── signup.tsx      → Signup page component
├── components/
│   └── AuthForm.tsx    → Shared form component
└── services/
    └── auth.service.ts → API communication layer
```

### Data Flow

```
User Action
  ↓
Page Component (login.tsx/signup.tsx)
  ↓
Auth Service (auth.service.ts)
  ↓
Axios HTTP Client
  ↓
Backend API
  ↓
Response Processing
  ↓
State Update & Navigation
```

### Key Patterns

#### 1. Service Layer Pattern
All API calls go through a centralized service:
```typescript
class AuthServiceClass {
  private api: AxiosInstance;
  
  async signup(email: string, password: string) { ... }
  async login(email: string, password: string) { ... }
  async me(token: string) { ... }
}

export const authService = new AuthServiceClass();
```

#### 2. Template Composition
Pages import templates dynamically:
```typescript
// frontend/pages/login.tsx
export { default } from '@/templates/auth/pages/login';
```

#### 3. Feature Flag Integration
```typescript
export async function getStaticProps() {
  if (!FEATURES.auth) {
    return { notFound: true };
  }
  return { props: {} };
}
```

#### 4. Token Management
```typescript
// Store token after login
authService.setToken(token);

// Include token in requests
authService.me(authService.getToken());

// Remove token on logout
authService.removeToken();
```

## Configuration System

### Backend Configuration

**modules.ts:**
```typescript
export const modules: Record<string, ModuleConfig> = {
  auth: {
    name: 'auth',
    enabled: enabledModulesList.includes('auth')
  }
};
```

**Environment Variables:**
```env
ENABLED_MODULES=auth,blog,payments  # Comma-separated
DATABASE_URL=mongodb://...
JWT_SECRET=...
PORT=5000
```

### Frontend Configuration

**features.ts:**
```typescript
export const FEATURES: Record<string, boolean> = {
  auth: true,
  blog: false,
  payments: false
};
```

## Extensibility

### Adding a New Module

#### Backend

1. **Create module directory:**
   ```
   backend/src/modules/blog/
   ```

2. **Implement standard files:**
   - `blog.routes.ts`
   - `blog.controller.ts`
   - `blog.service.ts`
   - `blog.schema.ts`
   - `blog.model.ts`

3. **Register in config:**
   ```typescript
   // config/modules.ts
   export const modules = {
     auth: { ... },
     blog: {
       name: 'blog',
       enabled: enabledModulesList.includes('blog')
     }
   };
   ```

4. **Add to server.ts:**
   ```typescript
   if (isModuleEnabled('blog')) {
     import('./modules/blog/blog.routes').then(({ blogRoutes }) => {
       app.use('/api/blog', blogRoutes);
     });
   }
   ```

5. **Update .env:**
   ```env
   ENABLED_MODULES=auth,blog
   ```

#### Frontend

1. **Create template directory:**
   ```
   frontend/templates/blog/
   ├── pages/
   ├── components/
   └── services/
   ```

2. **Add feature flag:**
   ```typescript
   // config/features.ts
   export const FEATURES = {
     auth: true,
     blog: true
   };
   ```

3. **Create Next.js pages:**
   ```typescript
   // pages/blog.tsx
   export { default } from '@/templates/blog/pages/blog';
   ```

## Error Handling

### Backend

```typescript
try {
  const result = await this.authService.signup(validatedData);
  res.status(201).json({
    success: true,
    data: result,
    error: null
  });
} catch (error: any) {
  res.status(400).json({
    success: false,
    data: null,
    error: error.message || 'Signup failed'
  });
}
```

### Frontend

```typescript
try {
  const response = await authService.login(email, password);
  if (response.success && response.data?.token) {
    // Success handling
  } else {
    setError(response.error || 'Login failed');
  }
} catch (err: any) {
  setError(err.response?.data?.error || 'An error occurred');
}
```

## Type Safety

### Backend (TypeScript)

```typescript
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### Frontend (TypeScript)

```typescript
interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
    };
    token?: string;
  } | null;
  error: string | null;
}
```

## Testing Strategy

### Backend Testing
- Unit tests for services (business logic)
- Integration tests for controllers
- E2E tests for complete API flows

### Frontend Testing
- Component tests (React Testing Library)
- Integration tests (user flows)
- E2E tests (Cypress/Playwright)

## Performance Considerations

1. **Database Indexing:** Email field is indexed (unique)
2. **Password Hashing:** Configurable bcrypt rounds
3. **JWT:** Stateless authentication (no session storage)
4. **Frontend:** Next.js static optimization where possible

## Security Best Practices

1. ✅ Passwords never stored in plain text
2. ✅ JWT secrets in environment variables
3. ✅ Input validation on all endpoints
4. ✅ CORS configuration
5. ✅ Error messages don't leak sensitive info
6. ✅ HTTPS required in production
7. ✅ Token expiration configured

## Deployment Considerations

### Backend
- Use production MongoDB cluster
- Set strong JWT_SECRET
- Enable HTTPS
- Configure CORS for production domains
- Use process manager (PM2)
- Set up monitoring

### Frontend
- Build optimized production bundle
- Configure API base URL for production
- Enable HTTPS
- Set up CDN for static assets
- Configure environment variables

## Builder Integration

This module is designed to be **assembled** by a builder:

1. **Selection:** Developer selects "auth" module
2. **Copy:** Builder copies template files
3. **Configure:** Builder sets feature flags
4. **Connect:** Builder registers routes and imports
5. **Output:** Complete, working application

The module is:
- ✅ Self-contained
- ✅ Well-documented
- ✅ Consistent with patterns
- ✅ Production-ready
- ✅ Easily extensible

---

This architecture supports the vision of a **template-driven builder** where modules are assembled, not invented.
