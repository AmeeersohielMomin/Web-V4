# Template-Driven Full-Stack Builder - Auth Module

A fully working authentication system built as the first module of a template-driven full-stack builder platform.

## 🎯 What This Is

This is a **production-ready authentication module** designed to be:
- Fully functional out of the box
- Template-based and modular
- Feature-flag controlled
- Reusable across multiple applications

## 📋 Features

- ✅ Email/password signup
- ✅ Email/password login
- ✅ JWT-based authentication
- ✅ User session management
- ✅ Protected `/me` endpoint
- ✅ Feature flag system
- ✅ Modular architecture

## 🏗️ Architecture

### Backend Structure
```
backend/
├── src/
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.routes.ts      # API routes
│   │       ├── auth.controller.ts  # Request handlers
│   │       ├── auth.service.ts     # Business logic
│   │       ├── auth.schema.ts      # Validation schemas
│   │       └── auth.model.ts       # Database model
│   ├── config/
│   │   └── modules.ts              # Module configuration
│   └── server.ts                   # Server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

### Frontend Structure
```
frontend/
├── templates/
│   └── auth/
│       ├── pages/
│       │   ├── login.tsx
│       │   └── signup.tsx
│       ├── components/
│       │   └── AuthForm.tsx
│       └── services/
│           └── auth.service.ts
├── config/
│   └── features.ts                 # Feature flags
├── pages/
│   ├── index.tsx                   # Home page
│   ├── login.tsx                   # Login route
│   └── signup.tsx                  # Signup route
├── styles/
│   └── globals.css
├── package.json
└── tailwind.config.js
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB running locally or connection string
- npm or yarn

### Installation

#### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
# IMPORTANT: Update DATABASE_URL and JWT_SECRET
```

**Backend Environment Variables (.env):**
```env
DATABASE_URL=mongodb://localhost:27017/auth_app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
PORT=5000
ENABLED_MODULES=auth
```

#### 2. Frontend Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local if needed
```

**Frontend Environment Variables (.env.local):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### Running the Application

#### Start Backend (Terminal 1)

```powershell
cd backend
npm run dev
```

Backend will start on: `http://localhost:5000`

#### Start Frontend (Terminal 2)

```powershell
cd frontend
npm run dev
```

Frontend will start on: `http://localhost:3000`

### Testing the Application

1. Open `http://localhost:3000` in your browser
2. Click "Sign Up" to create a new account
3. Enter email and password
4. You'll be redirected to the home page showing your email
5. Click "Logout" to logout
6. Click "Login" to sign back in

## 🔌 API Endpoints

### POST /api/auth/signup
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "error": null
}
```

### POST /api/auth/login
Authenticate an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "error": null
}
```

### GET /api/auth/me
Get the authenticated user's information.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response:**
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

## 🎛️ Feature Flag System

### Enabling/Disabling Auth

#### Backend (config/modules.ts)
The auth module is controlled via the `ENABLED_MODULES` environment variable:

```env
# Enable auth
ENABLED_MODULES=auth

# Disable auth (leave empty or omit 'auth')
ENABLED_MODULES=
```

When auth is disabled, the routes won't be registered, and the backend will not expose auth endpoints.

#### Frontend (config/features.ts)
```typescript
export const FEATURES: Record<string, boolean> = {
  auth: true  // Set to false to disable
};
```

When auth is disabled:
- Login/signup pages return 404
- Home page shows "Authentication feature is disabled"
- Auth-related UI elements are hidden

## 🧩 How This Fits Into the Builder System

This authentication module demonstrates the **template-driven architecture**:

### 1. Backend Modules
- Each feature (auth, blog, e-commerce) is a **standalone module**
- Modules are in `backend/src/modules/`
- Modules register routes only if enabled
- Clean separation of concerns (routes, controller, service, model)

### 2. Frontend Templates
- UI components are in `frontend/templates/`
- Each template is a complete feature (pages + components + services)
- Templates are imported into Next.js pages
- Feature flags control visibility

### 3. Future Builder Flow
When a developer uses the full builder platform:

1. **Select features:** "I want auth + blog + payments"
2. **Builder assembles:** Copies required modules and templates
3. **Configure:** Sets feature flags and environment variables
4. **Generate:** Creates a complete, working application
5. **Developer owns:** Full codebase with no vendor lock-in

### 4. Adding More Modules

To add a new module (e.g., "blog"):

**Backend:**
```
backend/src/modules/blog/
├── blog.routes.ts
├── blog.controller.ts
├── blog.service.ts
├── blog.schema.ts
└── blog.model.ts
```

**Frontend:**
```
frontend/templates/blog/
├── pages/
├── components/
└── services/
```

**Configuration:**
- Add `blog` to `ENABLED_MODULES` in backend `.env`
- Add `blog: true` to `FEATURES` in frontend `config/features.ts`
- Register routes conditionally in `server.ts`

## 🔒 Security Considerations

- Passwords are hashed with bcrypt (configurable salt rounds)
- JWT tokens are signed and verified
- Environment variables required for sensitive data
- CORS enabled (configure for production)
- Input validation using Zod schemas

## 📦 Production Build

### Backend
```powershell
cd backend
npm run build
npm start
```

### Frontend
```powershell
cd frontend
npm run build
npm start
```

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- TypeScript
- MongoDB (via Mongoose)
- JWT (jsonwebtoken)
- bcrypt
- Zod (validation)

**Frontend:**
- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios

## ✅ Validation

This module is **fully functional** and includes:
- Real database operations
- Working authentication flow
- JWT generation and verification
- Error handling
- Input validation
- Type safety

## 📝 Notes

- This is a **foundation module** designed for reusability
- No pseudo-code or placeholders
- Production-ready patterns
- Clean, maintainable code
- Follows the API contract exactly
- Fail-fast on missing configuration

---

**Built as part of the Template-Driven Full-Stack Builder project.**
