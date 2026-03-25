// ============================================================
// IDEA Platform — AI Prompt Templates v3.0
// Fixed: external services wiring, custom domain scaffolding,
//        service file generation, and stronger uniqueness.
// ============================================================

import type { RequirementsAnswer, RequirementsDocument } from './ai.types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — EXTERNAL SERVICE CATALOGUE
// Maps user-requested features → exact implementation instructions.
// ─────────────────────────────────────────────────────────────────────────────

interface ExternalServiceSpec {
  /** Short label shown in prompts */
  label: string;
  /** npm packages to add to backend */
  backendPackages: string[];
  /** npm packages to add to frontend (if any) */
  frontendPackages?: string[];
  /** Files the AI MUST generate */
  requiredFiles: string[];
  /** Exact implementation note injected into the prompt */
  implementationNote: string;
  /** Environment variables needed */
  envVars: Record<string, string>;
}

const EXTERNAL_SERVICE_CATALOGUE: Record<string, ExternalServiceSpec> = {
  stripe: {
    label: 'Stripe Payments',
    backendPackages: ['stripe'],
    frontendPackages: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
    requiredFiles: [
      'backend/src/services/stripe.service.ts',
      'backend/src/modules/payments/payments.routes.ts',
      'backend/src/modules/payments/payments.controller.ts',
      'backend/src/modules/payments/payments.service.ts',
      'frontend/src/services/payment.service.ts',
      'frontend/pages/checkout.tsx',
    ],
    implementationNote: `
STRIPE INTEGRATION (MANDATORY):
  backend/src/services/stripe.service.ts:
    - import Stripe from 'stripe'
    - const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
    - export createPaymentIntent(amount: number, currency: string, metadata: object)
    - export createCheckoutSession(lineItems, successUrl, cancelUrl, metadata)
    - export constructWebhookEvent(payload, signature)
    - export retrievePaymentIntent(id)
  backend/src/modules/payments/payments.routes.ts:
    - POST /payments/create-intent → createPaymentIntent
    - POST /payments/checkout-session → createCheckoutSession
    - POST /payments/webhook (raw body parser) → handleWebhook
    - GET  /payments/:id → getPaymentStatus
  frontend/pages/checkout.tsx:
    - Use @stripe/react-stripe-js Elements + PaymentElement
    - Load stripe with loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
    - Call backend /payments/create-intent → pass clientSecret to Elements
  .env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
    envVars: {
      STRIPE_SECRET_KEY: 'sk_test_...',
      STRIPE_WEBHOOK_SECRET: 'whsec_...',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_...',
    },
  },

  razorpay: {
    label: 'Razorpay Payments',
    backendPackages: ['razorpay'],
    frontendPackages: [],
    requiredFiles: [
      'backend/src/services/razorpay.service.ts',
      'backend/src/modules/payments/payments.routes.ts',
      'backend/src/modules/payments/payments.controller.ts',
      'frontend/pages/checkout.tsx',
    ],
    implementationNote: `
RAZORPAY INTEGRATION (MANDATORY):
  backend/src/services/razorpay.service.ts:
    - import Razorpay from 'razorpay'
    - const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! })
    - export createOrder(amount: number, currency: string, receipt: string)
    - export verifySignature(orderId, paymentId, signature): boolean
  frontend/pages/checkout.tsx:
    - Load Razorpay script dynamically
    - Open Razorpay checkout with order_id from backend
    - On success call backend /payments/verify
  .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID`,
    envVars: {
      RAZORPAY_KEY_ID: 'rzp_test_...',
      RAZORPAY_KEY_SECRET: '...',
      NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_...',
    },
  },

  paypal: {
    label: 'PayPal Payments',
    backendPackages: ['@paypal/paypal-server-sdk'],
    frontendPackages: ['@paypal/react-paypal-js'],
    requiredFiles: [
      'backend/src/services/paypal.service.ts',
      'backend/src/modules/payments/payments.routes.ts',
      'frontend/pages/checkout.tsx',
    ],
    implementationNote: `
PAYPAL INTEGRATION (MANDATORY):
  backend/src/services/paypal.service.ts:
    - Use @paypal/paypal-server-sdk to create orders and capture payments
    - export createOrder(amount, currency, items[])
    - export captureOrder(orderId)
  frontend/pages/checkout.tsx:
    - Use PayPalScriptProvider + PayPalButtons from @paypal/react-paypal-js
    - createOrder calls backend, onApprove captures
  .env: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, NEXT_PUBLIC_PAYPAL_CLIENT_ID`,
    envVars: {
      PAYPAL_CLIENT_ID: '...',
      PAYPAL_CLIENT_SECRET: '...',
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: '...',
    },
  },

  email: {
    label: 'Email via Nodemailer',
    backendPackages: ['nodemailer', '@types/nodemailer'],
    requiredFiles: [
      'backend/src/services/email.service.ts',
    ],
    implementationNote: `
EMAIL SERVICE (MANDATORY):
  backend/src/services/email.service.ts:
    - import nodemailer from 'nodemailer'
    - const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
    - export sendWelcomeEmail(to: string, name: string)
    - export sendPasswordResetEmail(to: string, resetLink: string)
    - export sendNotificationEmail(to: string, subject: string, body: string)
    - export sendOrderConfirmationEmail(to: string, order: object)  // if e-commerce
  Use HTML templates inside the functions (inline HTML strings).
  .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM`,
    envVars: {
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: '587',
      SMTP_USER: 'your@email.com',
      SMTP_PASS: '...',
      SMTP_FROM: 'noreply@yourapp.com',
    },
  },

  resend: {
    label: 'Resend Email',
    backendPackages: ['resend'],
    requiredFiles: ['backend/src/services/email.service.ts'],
    implementationNote: `
RESEND EMAIL SERVICE (MANDATORY):
  backend/src/services/email.service.ts:
    - import { Resend } from 'resend'
    - const resend = new Resend(process.env.RESEND_API_KEY)
    - export sendWelcomeEmail(to, name)
    - export sendPasswordResetEmail(to, resetLink)
    - export sendNotificationEmail(to, subject, html)
    Use resend.emails.send({ from, to, subject, html }) in each function.
  .env: RESEND_API_KEY, EMAIL_FROM`,
    envVars: {
      RESEND_API_KEY: 're_...',
      EMAIL_FROM: 'noreply@yourdomain.com',
    },
  },

  sendgrid: {
    label: 'SendGrid Email',
    backendPackages: ['@sendgrid/mail'],
    requiredFiles: ['backend/src/services/email.service.ts'],
    implementationNote: `
SENDGRID EMAIL SERVICE (MANDATORY):
  backend/src/services/email.service.ts:
    - import sgMail from '@sendgrid/mail'
    - sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
    - export sendWelcomeEmail(to, name)
    - export sendPasswordResetEmail(to, resetLink)
    - export sendNotificationEmail(to, subject, html)
  .env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL`,
    envVars: {
      SENDGRID_API_KEY: 'SG...',
      SENDGRID_FROM_EMAIL: 'noreply@yourdomain.com',
    },
  },

  cloudinary: {
    label: 'Cloudinary File/Image Upload',
    backendPackages: ['cloudinary', 'multer', 'multer-storage-cloudinary', '@types/multer'],
    requiredFiles: [
      'backend/src/services/cloudinary.service.ts',
      'backend/src/middleware/upload.ts',
    ],
    implementationNote: `
CLOUDINARY UPLOAD (MANDATORY):
  backend/src/services/cloudinary.service.ts:
    - import { v2 as cloudinary } from 'cloudinary'
    - cloudinary.config({ cloud_name, api_key, api_secret })
    - export uploadImage(file: Express.Multer.File, folder: string): Promise<{ url, publicId }>
    - export deleteImage(publicId: string)
    - export uploadVideo(file, folder)
  backend/src/middleware/upload.ts:
    - Use multer with CloudinaryStorage
    - export uploadSingle = multer({ storage }).single('file')
    - export uploadMultiple = multer({ storage }).array('files', 10)
  For any module that has image fields: add POST /[module]/:id/upload endpoint
    using uploadSingle middleware → calls cloudinaryService.uploadImage
  .env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET`,
    envVars: {
      CLOUDINARY_CLOUD_NAME: '...',
      CLOUDINARY_API_KEY: '...',
      CLOUDINARY_API_SECRET: '...',
    },
  },

  s3: {
    label: 'AWS S3 File Upload',
    backendPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'multer', '@types/multer'],
    requiredFiles: [
      'backend/src/services/s3.service.ts',
      'backend/src/middleware/upload.ts',
    ],
    implementationNote: `
AWS S3 UPLOAD (MANDATORY):
  backend/src/services/s3.service.ts:
    - import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
    - import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
    - const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: { accessKeyId, secretAccessKey } })
    - export uploadFile(buffer, key, contentType, bucket?): Promise<{ url, key }>
    - export deleteFile(key, bucket?)
    - export getPresignedUrl(key, expiresIn?): Promise<string>
  backend/src/middleware/upload.ts:
    - Use multer memoryStorage() to get buffer
    - export uploadSingle = multer({ storage: memoryStorage() }).single('file')
  .env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET`,
    envVars: {
      AWS_ACCESS_KEY_ID: '...',
      AWS_SECRET_ACCESS_KEY: '...',
      AWS_REGION: 'us-east-1',
      AWS_S3_BUCKET: 'my-app-bucket',
    },
  },

  oauth: {
    label: 'OAuth (Google/GitHub Social Login)',
    backendPackages: ['passport', 'passport-google-oauth20', 'passport-github2', '@types/passport', '@types/passport-google-oauth20'],
    requiredFiles: [
      'backend/src/services/oauth.service.ts',
      'backend/src/middleware/passport.ts',
      'backend/src/modules/auth/auth.routes.ts', // updated to add /google /github routes
    ],
    implementationNote: `
OAUTH SOCIAL LOGIN (MANDATORY):
  backend/src/middleware/passport.ts:
    - Configure GoogleStrategy with clientID, clientSecret, callbackURL
    - Configure GithubStrategy similarly
    - On verify callback: find or create user, return user with JWT
  backend/src/modules/auth/auth.routes.ts — ADD:
    - GET /auth/google → passport.authenticate('google', { scope: ['profile','email'] })
    - GET /auth/google/callback → passport.authenticate + redirect with token
    - GET /auth/github → passport.authenticate('github', { scope: ['user:email'] })
    - GET /auth/github/callback → same pattern
  frontend: Add "Sign in with Google" and "Sign in with GitHub" buttons
    on login.tsx and signup.tsx that link to backend OAuth endpoints.
    On callback, backend redirects to /auth/social-callback?token=JWT
    frontend/pages/auth/social-callback.tsx reads token from query, stores in localStorage, redirects to /dashboard
  .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET`,
    envVars: {
      GOOGLE_CLIENT_ID: '...',
      GOOGLE_CLIENT_SECRET: '...',
      GITHUB_CLIENT_ID: '...',
      GITHUB_CLIENT_SECRET: '...',
    },
  },

  twilio: {
    label: 'Twilio SMS/WhatsApp',
    backendPackages: ['twilio'],
    requiredFiles: ['backend/src/services/sms.service.ts'],
    implementationNote: `
TWILIO SMS/WHATSAPP (MANDATORY):
  backend/src/services/sms.service.ts:
    - import twilio from 'twilio'
    - const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    - export sendSms(to: string, message: string)
    - export sendWhatsApp(to: string, message: string)
    - export sendOtp(to: string, code: string)
  Call sendSms/sendOtp from relevant controllers (e.g. booking confirmations, auth OTP).
  .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER`,
    envVars: {
      TWILIO_ACCOUNT_SID: 'AC...',
      TWILIO_AUTH_TOKEN: '...',
      TWILIO_PHONE_NUMBER: '+1...',
    },
  },

  firebase: {
    label: 'Firebase Push Notifications',
    backendPackages: ['firebase-admin'],
    requiredFiles: ['backend/src/services/push.service.ts'],
    implementationNote: `
FIREBASE PUSH NOTIFICATIONS (MANDATORY):
  backend/src/services/push.service.ts:
    - import * as admin from 'firebase-admin'
    - admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) })
    - export sendPushNotification(token: string, title: string, body: string, data?: object)
    - export sendMulticast(tokens: string[], title: string, body: string, data?: object)
  Add fcmToken field to User model (updated when user logs in from device).
  Call push service from relevant controllers after key events.
  .env: FIREBASE_SERVICE_ACCOUNT (stringified JSON)`,
    envVars: {
      FIREBASE_SERVICE_ACCOUNT: '{"type":"service_account",...}',
    },
  },

  websockets: {
    label: 'Real-time WebSockets (Socket.io)',
    backendPackages: ['socket.io'],
    frontendPackages: ['socket.io-client'],
    requiredFiles: [
      'backend/src/services/socket.service.ts',
      'frontend/src/hooks/useSocket.ts',
    ],
    implementationNote: `
SOCKET.IO REAL-TIME (MANDATORY):
  backend/src/services/socket.service.ts:
    - import { Server as SocketServer } from 'socket.io'
    - export function initSocketServer(httpServer): SocketServer
    - Attach to express http server in server.ts: const io = initSocketServer(httpServer)
    - Implement rooms: io.on('connection', socket => { socket.join(userId); ... })
    - export emit(room: string, event: string, data: any) for use in controllers
  server.ts — use http.createServer(app) then attach socket server
  frontend/src/hooks/useSocket.ts:
    - import { io } from 'socket.io-client'
    - const socket = io(process.env.NEXT_PUBLIC_API_URL!)
    - export useSocket() hook returning socket instance + connection status
  Use the hook in relevant pages (chat, notifications, live dashboards).
  .env: (no extra vars needed; uses same PORT)`,
    envVars: {},
  },

  redis: {
    label: 'Redis (Caching / Queue)',
    backendPackages: ['ioredis', '@types/ioredis'],
    requiredFiles: ['backend/src/services/redis.service.ts'],
    implementationNote: `
REDIS CACHING (MANDATORY):
  backend/src/services/redis.service.ts:
    - import Redis from 'ioredis'
    - const redis = new Redis(process.env.REDIS_URL)
    - export set(key: string, value: any, ttlSeconds?: number)
    - export get<T>(key: string): Promise<T | null>
    - export del(key: string)
    - export invalidatePattern(pattern: string)  // uses SCAN + DEL
  Use redis caching in service layers for expensive reads (e.g. product lists, user sessions).
  .env: REDIS_URL`,
    envVars: {
      REDIS_URL: 'redis://localhost:6379',
    },
  },

  'google-maps': {
    label: 'Google Maps',
    backendPackages: [],
    frontendPackages: ['@react-google-maps/api'],
    requiredFiles: ['frontend/src/components/MapView.tsx'],
    implementationNote: `
GOOGLE MAPS (MANDATORY):
  frontend/src/components/MapView.tsx:
    - import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
    - Accept props: lat, lng, markers[], zoom, onMarkerClick
    - Render fully styled map inside a container div
  Use MapView in relevant pages (e.g. property listings, delivery tracking, store locator).
  .env: NEXT_PUBLIC_GOOGLE_MAPS_KEY`,
    envVars: {
      NEXT_PUBLIC_GOOGLE_MAPS_KEY: '...',
    },
  },

  openai: {
    label: 'OpenAI API Integration',
    backendPackages: ['openai'],
    requiredFiles: [
      'backend/src/services/openai.service.ts',
      'backend/src/modules/ai/ai.routes.ts',
      'backend/src/modules/ai/ai.controller.ts',
    ],
    implementationNote: `
OPENAI API INTEGRATION (MANDATORY):
  backend/src/services/openai.service.ts:
    - import OpenAI from 'openai'
    - const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    - export chatCompletion(messages: {role,content}[], model?: string): Promise<string>
    - export generateEmbedding(text: string): Promise<number[]>
    - export analyzeImage(imageUrl: string, prompt: string): Promise<string>
  backend/src/modules/ai/ai.routes.ts + ai.controller.ts:
    - POST /ai/chat → streaming chat completion
    - POST /ai/analyze → image/text analysis
  frontend: relevant pages call AI endpoints and display streaming responses
  .env: OPENAI_API_KEY`,
    envVars: {
      OPENAI_API_KEY: 'sk-...',
    },
  },
};

/**
 * Detect which external services the user wants and return
 * the combined implementation instructions + required files list.
 */
export function detectExternalServices(
  userDescription: string,
  requirements?: RequirementsDocument
): { instructions: string; requiredFiles: string[]; envVars: Record<string, string> } {
  const text = [
    userDescription,
    requirements?.coreFeatures?.join(' ') || '',
    requirements?.techPreferences || '',
    requirements?.additionalNotes || '',
    requirements?.originalPrompt || '',
  ].join(' ').toLowerCase();

  const detectionMap: Record<keyof typeof EXTERNAL_SERVICE_CATALOGUE, string[]> = {
    stripe: ['stripe', 'credit card', 'card payment', 'stripe payment'],
    razorpay: ['razorpay', 'razorpay payment'],
    paypal: ['paypal'],
    email: ['email', 'nodemailer', 'smtp', 'send email', 'email notification', 'mailer'],
    resend: ['resend', 'resend email'],
    sendgrid: ['sendgrid'],
    cloudinary: ['cloudinary', 'image upload', 'photo upload', 'file upload', 'upload image'],
    s3: ['s3', 'aws s3', 'amazon s3', 'file storage', 'aws storage'],
    oauth: ['google login', 'github login', 'social login', 'oauth', 'sso', 'sign in with google'],
    twilio: ['twilio', 'sms', 'whatsapp', 'text message', 'otp sms'],
    firebase: ['firebase', 'push notification', 'fcm', 'mobile notification'],
    websockets: ['real-time', 'realtime', 'socket', 'websocket', 'live chat', 'live update', 'socket.io'],
    redis: ['redis', 'cache', 'caching', 'session store', 'rate limit'],
    'google-maps': ['google maps', 'map', 'location', 'geolocation', 'address lookup'],
    openai: ['openai', 'gpt', 'ai chat', 'ai assistant', 'chatgpt integration', 'llm'],
  };

  const detected = new Set<string>();

  // If email is requested but no specific provider found, default to nodemailer
  let emailDetected = false;

  for (const [serviceKey, keywords] of Object.entries(detectionMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      if (['email', 'resend', 'sendgrid'].includes(serviceKey)) {
        emailDetected = true;
      }
      detected.add(serviceKey);
    }
  }

  // Deduplicate: if multiple email providers, pick the most specific one
  if (detected.has('resend') || detected.has('sendgrid')) {
    detected.delete('email'); // prefer specific provider
  }
  if (emailDetected && !detected.has('resend') && !detected.has('sendgrid')) {
    detected.add('email'); // default to nodemailer
  }

  // Deduplicate: if multiple payment providers detected, all are fine (keep all)

  if (detected.size === 0) {
    return { instructions: '', requiredFiles: [], envVars: {} };
  }

  const instructions: string[] = [
    `\n╔══════════════════════════════════════════════════════════════╗`,
    `║  EXTERNAL SERVICES — GENERATE ALL OF THESE (MANDATORY)      ║`,
    `╚══════════════════════════════════════════════════════════════╝`,
    ``,
    `The user has requested the following external integrations.`,
    `You MUST generate every file listed and implement each service fully.`,
    `DO NOT stub or comment out these integrations.`,
    ``,
  ];

  const allRequiredFiles: string[] = [];
  const allEnvVars: Record<string, string> = {};

  for (const key of detected) {
    const spec = EXTERNAL_SERVICE_CATALOGUE[key];
    if (!spec) continue;
    instructions.push(`── ${spec.label} ──`);
    instructions.push(spec.implementationNote);
    instructions.push('');
    allRequiredFiles.push(...spec.requiredFiles);
    Object.assign(allEnvVars, spec.envVars);
  }

  instructions.push(`INTEGRATION CHECKLIST — every item below MUST appear in the generated files:`);
  for (const f of [...new Set(allRequiredFiles)]) {
    instructions.push(`  ✓ ${f}`);
  }
  instructions.push('');

  return {
    instructions: instructions.join('\n'),
    requiredFiles: [...new Set(allRequiredFiles)],
    envVars: allEnvVars,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — SYSTEM PROMPT: CORE ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_FULLSTACK = `You are an expert full-stack developer generating complete, production-ready web applications.

You generate ENTIRE applications — not just auth screens. Every app must have ALL domain modules fully functional with working frontend pages.

ABSOLUTE RULES:
1. ALWAYS generate the COMPLETE Auth module (login, signup, auth middleware) exactly as specified, IN ADDITION TO the requested domain modules.
2. ALWAYS generate full CRUD for every domain resource the user described.
3. EVERY backend module: routes.ts + controller.ts + service.ts + model.ts + schema.ts
4. EVERY frontend module: list page (index.tsx) + create page (new.tsx) + edit page ([id]/edit.tsx) + service file
5. server.ts MUST register routes for EVERY module.
6. Navbar MUST link to EVERY module's list page.
7. Dashboard MUST fetch real stats from ALL domain module services.
8. External service files MUST be fully implemented — never stubbed or commented out.
9. Return ONLY raw JSON. No markdown. Start with { end with }.
10. NO UNRESOLVED IMPORTS: Never import components, hooks, or assets that you do not generate. All imports must be strictly valid to prevent preview engine crashes.
11. NO JSX SYNTAX ERRORS: Ensure every JSX tag is properly closed. Never use empty attributes (e.g., use required={true} not just required) to prevent Turbopack/Babel crash.
12. SERVICE PROMISES: Every method in your frontend services must explicitly 'return axios...' so components can safely call '.then()' without TypeError crashes.
13. ICONS & SVGS: NEVER write raw <svg> tags. Always import icons from 'lucide-react' to save maximum tokens.
14. ZERO COMMENTS: Do NOT write code comments. You must save context tokens to prevent file truncation.

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
  .env.example — DATABASE_URL, JWT_SECRET, PORT, FRONTEND_URL + all external service vars

FRONTEND FILES TO GENERATE:

  services/auth.service.ts — axios instance with Bearer interceptor, signup/login/me methods
  services/[domain].service.ts — axios CRUD: getAll(params), getById(id), create(data), update(id,data), remove(id), getStats()
  contexts/AuthContext.tsx — user state, login/signup/logout, token in localStorage, auto-check /me on mount
  pages/_app.tsx — AuthProvider wrapper + globals.css import
  pages/index.tsx — COMPULSORY premium landing page (hero + feature sections + social proof + CTA)
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

  styles/globals.css — ONLY @tailwind directives. No custom CSS classes.
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

  PREMIUM QUALITY REQUIREMENTS (MANDATORY):
    1) TRUE TAILWIND STYLING (MANDATORY ON ALL PAGES):
      DO NOT write custom CSS or variables in styles/globals.css. Leave it perfectly clean with just @tailwind directives.
      INSTEAD, configure your design system natively inside tailwind.config.js under theme.extend.colors (e.g., primary, secondary, accent, surface, background, muted).
      Use these native Tailwind classes directly on JSX elements (e.g. className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg").
      EVERY page (dashboard, domain lists, forms, landing) MUST be perfectly styled with deep Tailwind configurations. Do not leave any domain page unstyled.

    2) MANDATORY ANIMATIONS
      Include meaningful motion primitives:
       - page-load reveal animation
       - staggered card/list reveal
       - button/input hover + focus transitions
      Implement via Tailwind animation utilities and/or @keyframes in globals.css.

    3) LAYOUT COMPOSITION RULES
      Landing page must include:
       - Hero section with strong value proposition and primary CTA
       - At least 3 feature/value blocks
       - Trust/social proof/testimonial or metrics section
       - Final CTA section before footer
      Use layered backgrounds (gradient/shapes/pattern), not flat single-color background.

    4) HARD FAIL CRITERIA
      If any requirement above is missing, the output is INVALID and must be regenerated.
      Do not return "almost complete" output.

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
    "frontend": { "next": "14.0.4", "axios": "^1.6.2", "react": "^18.2.0", "react-dom": "^18.2.0", "lucide-react": "^0.300.0" }
  },
  "setupInstructions": ["cd backend && npm install && npm run dev", "cd frontend && npm install && npm run dev"]
}`;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — DESIGN DNA SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_DNA_PRESETS = {
  layoutArchetypes: [
    'editorial split-screen with oversized hero headings',
    'minimal bento grid with asymmetrical card proportions',
    'dashboard with modular blocks and collapsible side rail',
    'storytelling hero-first flow with sectional reveals',
    'compact productivity layout with dense information hierarchy',
    'neo-brutalist block layout with sharp section separation',
    'soft rounded SaaS layout with high whitespace discipline',
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
    'green-fresh | primary:#16a34a secondary:#f0fdf4 accent:#8b5cf6',
  ],
  typographyMoods: [
    'high-contrast editorial with bold display headings',
    'technical mono-accent for data-heavy interfaces',
    'clean geometric sans with precise kerning',
    'friendly rounded sans with warm letter-spacing',
    'elegant condensed headings with refined hierarchy',
    'modern grotesk with oversized bold display titles',
  ],
  surfaces: [
    'flat matte panels with subtle 1px borders',
    'soft glass cards with backdrop blur and layered depth',
    'paper-like cards with gentle drop shadows',
    'high-contrast blocks with sharp edges and bold dividers',
    'gradient-tinted panels with restrained ambient glow',
  ],
  motionProfiles: [
    'subtle fade-and-rise on first paint 200ms ease-out',
    'snappy 120ms transitions on hover and active states',
    'staggered reveal for lists and card grids',
    'minimal motion with emphasis on hover state changes only',
    'spring-based micro-interactions on buttons and inputs',
  ],
  themeModes: [
    'light professional with white surfaces and dark text',
    'dark professional with gray-900 surfaces and gray-100 text',
    'hybrid light-with-dark-header sections',
    'neutral warm daylight palette',
    'high-contrast enterprise with pure black and white accented',
  ],
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
// SECTION 4 — APP-TYPE MODULE DETECTOR
// ─────────────────────────────────────────────────────────────────────────────

function detectDomainModules(
  userDescription: string,
  requirements?: RequirementsDocument,
): string {
  const text = [
    userDescription,
    requirements?.appType || '',
    requirements?.coreFeatures?.join(' ') || '',
    requirements?.originalPrompt || '',
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

    // ── NEW: Additional well-known domain patterns ──

    lms: `
DOMAIN MODULES TO GENERATE (learning management system):
  1. courses     — title, description, instructorId, price, thumbnail, status(draft/published), category, totalLessons
  2. lessons     — courseId, title, content, videoUrl, duration(min), order, isFree
  3. enrollments — courseId, userId, progress(0-100), completedLessons[], enrolledAt, completedAt
  4. quizzes     — courseId, lessonId, questions[{text,options[],correctAnswer,points}], timeLimit
  5. progress    — userId, lessonId, courseId, watchedSeconds, completed, lastAccessedAt
Backend: all 5 modules × 5 files each
Frontend: all 5 modules × 3 pages each + 5 service files
Dashboard must show: enrolled students count, revenue, course completion rate, popular courses`,

    realestate: `
DOMAIN MODULES TO GENERATE (real estate):
  1. properties — title, type(sale/rent), propertyType(house/apartment/land), price, area, bedrooms, bathrooms, address, images[], status(available/sold/rented), agentId, features[]
  2. agents     — name, email, phone, avatar, bio, licenseNumber, listings[], rating
  3. viewings   — propertyId, agentId, clientName, clientEmail, clientPhone, date, time, status(scheduled/completed/cancelled), notes
  4. inquiries  — propertyId, name, email, phone, message, status(new/contacted/closed), createdAt
Backend: all 4 modules × 5 files each
Frontend: all 4 modules × 3 pages each + 4 service files
Dashboard must show: active listings, viewings this week, new inquiries, revenue pipeline`,

    healthcare: `
DOMAIN MODULES TO GENERATE (healthcare/clinic):
  1. patients     — name, dateOfBirth, gender, phone, email, address, bloodGroup, allergies[], insuranceInfo
  2. appointments — patientId, doctorId, date, startTime, endTime, type(consultation/followup/procedure), status(scheduled/confirmed/completed/cancelled), notes, fee
  3. doctors      — name, specialization, qualifications[], licenseNumber, phone, email, availableDays[], consultationFee
  4. records      — patientId, doctorId, appointmentId, diagnosis, prescription[{medicine,dosage,duration}], notes, attachments[]
  5. billing      — patientId, appointmentId, amount, status(pending/paid/insurance), paymentMethod, paidAt
Backend: all 5 modules × 5 files each
Frontend: all 5 modules × 3 pages each + 5 service files
Dashboard must show: today's appointments, new patients this month, pending billing, doctor schedule`,

    fleet: `
DOMAIN MODULES TO GENERATE (fleet management):
  1. vehicles     — make, model, year, plateNumber, vin, type(truck/van/car), status(available/in-use/maintenance), fuelType, currentMileage, assignedDriverId
  2. drivers      — name, licenseNumber, licenseExpiry, phone, email, status(active/inactive), assignedVehicleId, rating
  3. trips        — vehicleId, driverId, origin, destination, startOdometer, endOdometer, startTime, endTime, distance, purpose, status(planned/in-progress/completed)
  4. maintenance  — vehicleId, type(oil/tires/brake/inspection), date, mileageAtService, cost, vendor, notes, nextDueDate, nextDueMileage
  5. fuellogs     — vehicleId, driverId, date, liters, costPerLiter, totalCost, mileage, station
Backend: all 5 modules × 5 files each
Frontend: all 5 modules × 3 pages each + 5 service files
Dashboard must show: vehicles on road, maintenance alerts, fuel cost this month, driver utilization`,

    hr: `
DOMAIN MODULES TO GENERATE (HR / employee management):
  1. employees    — name, email, phone, department, position, salary, startDate, status(active/on-leave/terminated), managerId, photo
  2. departments  — name, headId, budget, location, headCount
  3. attendance   — employeeId, date, checkIn, checkOut, status(present/absent/late/leave), hoursWorked
  4. leaves       — employeeId, type(annual/sick/unpaid/maternity), startDate, endDate, days, status(pending/approved/rejected), reason, approvedBy
  5. payroll      — employeeId, month, year, basicSalary, allowances, deductions, netSalary, status(draft/processed/paid), paidAt
Backend: all 5 modules × 5 files each
Frontend: all 5 modules × 3 pages each + 5 service files
Dashboard must show: headcount, attendance today, leave requests pending, payroll this month`,

    jobboard: `
DOMAIN MODULES TO GENERATE (job board / recruitment):
  1. jobs         — title, company, location, type(full-time/part-time/contract/remote), salary, description, requirements[], skills[], status(open/closed/draft), expiresAt
  2. companies    — name, logo, website, industry, size, description, location, verified
  3. applications — jobId, candidateId, resumeUrl, coverLetter, status(applied/screening/interview/offer/rejected), appliedAt, notes
  4. candidates   — name, email, phone, resumeUrl, skills[], experience[], education[], currentTitle, location
  5. interviews   — applicationId, scheduledAt, type(phone/video/onsite), interviewer, status(scheduled/completed/cancelled), feedback, rating
Backend: all 5 modules × 5 files each
Frontend: all 5 modules × 3 pages each + 5 service files
Dashboard must show: open positions, applications today, interviews scheduled, offer acceptance rate`,

    events: `
DOMAIN MODULES TO GENERATE (event management):
  1. events     — title, description, type(conference/workshop/concert/meetup), date, startTime, endTime, venue, capacity, price, status(upcoming/live/completed/cancelled), organizerId, images[]
  2. venues     — name, address, city, capacity, facilities[], contactPhone, contactEmail, pricePerHour
  3. tickets    — eventId, userId, type(general/vip/early-bird), price, quantity, status(active/used/cancelled), qrCode, purchasedAt
  4. attendees  — eventId, userId, name, email, ticketId, checkedIn, checkedInAt
  5. speakers   — name, bio, photo, title, company, eventIds[], sessionTitle, sessionTime
Backend: all 5 modules × 5 files each
Frontend: all 5 modules × 3 pages each + 5 service files
Dashboard must show: upcoming events, tickets sold, revenue, check-in rate`,
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
    social: ['social', 'feed', 'follow', 'like', 'community', 'network', 'friend', 'share'],
    lms: ['lms', 'course', 'lesson', 'enrollment', 'quiz', 'e-learning', 'elearning', 'learning management', 'student', 'instructor', 'lecture', 'curriculum'],
    realestate: ['real estate', 'property', 'listing', 'mortgage', 'agent', 'rent', 'sale', 'house', 'apartment', 'viewing', 'realty'],
    healthcare: ['healthcare', 'clinic', 'hospital', 'patient', 'doctor', 'medical', 'prescription', 'diagnosis', 'appointment', 'health'],
    fleet: ['fleet', 'vehicle', 'driver', 'truck', 'delivery', 'logistics', 'transport', 'fuel log', 'maintenance log'],
    hr: ['hr', 'human resource', 'employee', 'payroll', 'attendance', 'leave management', 'department', 'onboarding', 'offboarding'],
    jobboard: ['job board', 'job listing', 'recruitment', 'candidate', 'application', 'resume', 'hiring', 'career'],
    events: ['event', 'conference', 'concert', 'meetup', 'ticket', 'venue', 'attendee', 'speaker', 'workshop'],
  };

  for (const [type, keywords] of Object.entries(checks)) {
    if (keywords.some(kw => text.includes(kw))) {
      return guides[type] || buildCustomDomainPrompt(text);
    }
  }

  return buildCustomDomainPrompt(text);
}

/**
 * For truly unique/custom apps that don't match any known template,
 * this generates a structured scaffold prompt that gives the AI
 * concrete guidance on HOW to derive domain modules rather than just
 * saying "figure it out yourself".
 */
function buildCustomDomainPrompt(text: string): string {
  return `
DOMAIN: CUSTOM / UNIQUE APPLICATION
The app does not match any standard template. Derive the correct modules from the description.

═══ STEP-BY-STEP MODULE DERIVATION PROCESS ═══

STEP 1 — Identify all main NOUNS (things the app manages).
  Read: "${text.slice(0, 400)}"

  Examples of how to derive modules from various ideas:
  ┌─────────────────────────┬──────────────────────────────────────────────────────────┐
  │ App Idea                │ Derived Modules                                          │
  ├─────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Dating app              │ profiles, matches, messages, likes, preferences          │
  │ Fitness tracker         │ workouts, exercises, programs, progress, goals           │
  │ Pet care                │ pets, appointments, medications, vet-records, reminders  │
  │ Legal case mgmt         │ cases, clients, documents, hearings, invoices, tasks     │
  │ Real estate             │ properties, viewings, offers, agents, clients            │
  │ Library                 │ books, loans, members, reservations, fines               │
  │ Recipe / food           │ recipes, ingredients, collections, reviews, meal-plans   │
  │ Donation / charity      │ campaigns, donations, donors, causes, receipts           │
  │ Agriculture / farm      │ farms, crops, harvests, expenses, equipment, weather-log │
  │ Freelance management    │ clients, projects, timesheets, invoices, contracts       │
  │ Gym management          │ members, plans, trainers, sessions, payments             │
  │ Hotel management        │ rooms, reservations, guests, housekeeping, billing       │
  │ Podcast platform        │ shows, episodes, subscriptions, analytics, comments      │
  │ NFT / art marketplace   │ artworks, collections, bids, sales, artists              │
  │ Bug tracker             │ projects, issues, comments, sprints, releases            │
  │ IoT dashboard           │ devices, sensors, readings, alerts, rules               │
  └─────────────────────────┴──────────────────────────────────────────────────────────┘

STEP 2 — For EACH noun, define Mongoose model fields using REAL domain vocabulary.
  ✅ CORRECT for pet: { name, species, breed, dateOfBirth, weight, color, ownerId, medicalHistory[], vaccinations[] }
  ❌ WRONG:           { title, description, status }

STEP 3 — Generate ALL 5 backend files per module:
  backend/src/modules/[noun]/[noun].routes.ts
  backend/src/modules/[noun]/[noun].controller.ts
  backend/src/modules/[noun]/[noun].service.ts
  backend/src/modules/[noun]/[noun].model.ts      ← REAL fields, not generic
  backend/src/modules/[noun]/[noun].schema.ts     ← Zod validation

STEP 4 — Generate ALL 3 frontend pages per module:
  frontend/pages/[noun]/index.tsx       ← list with domain-specific columns
  frontend/pages/[noun]/new.tsx         ← create form with real field names
  frontend/pages/[noun]/[id]/edit.tsx   ← edit form, pre-fills data by ID
  frontend/src/services/[noun].service.ts

STEP 5 — Design dashboard stats specific to THIS app:
  ✅ Fitness app:  workouts this week, calories burned, active programs, goal completion %
  ✅ Pet care app: upcoming appointments, medication reminders, total pets, vet visits this month
  ✅ Legal app:    open cases, hearings this week, overdue invoices, client count
  Derive from what the app actually tracks — do not use generic counts.

MINIMUM MODULES: at least 3 domain modules (excluding auth).
Complex apps (legal, healthcare, fleet) should have 5–7 modules.

WHAT YOU ARE BUILDING: "${text.slice(0, 300)}"

Identify the nouns, derive the modules, then generate the full application.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — MAIN PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export function buildFullstackPrompt(
  userDescription: string,
  selectedModules: string[],
  variationSeed: string,
  requirements?: RequirementsDocument,
): string {
  const selectedModulesLabel = selectedModules.length > 0
    ? selectedModules.join(', ')
    : 'auto-infer-from-idea';

  const designDNA = buildDesignDNA(variationSeed);
  const domainGuide = detectDomainModules(userDescription, requirements);

  // ── Detect & inject external service instructions ──
  const externalServices = detectExternalServices(userDescription, requirements);
  const externalServicesBlock = externalServices.instructions
    ? externalServices.instructions
    : '';

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

SHARED FILES (generate exactly once):
  backend/src/middleware/auth.ts
  backend/src/server.ts                ← MUST register ALL module routes
  backend/package.json + tsconfig.json + .env.example
  frontend/pages/_app.tsx              ← wraps with AuthProvider
  frontend/pages/index.tsx             ← compulsory premium landing page
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
SELECTED MODULES: ${selectedModulesLabel}

${moduleChecklist}

${externalServicesBlock}

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

PREMIUM UI ENFORCEMENT (NON-NEGOTIABLE):
  • Must define and use CSS design tokens in globals.css:
    --primary, --secondary, --accent, --background, --surface, --text, --muted
  • Must include page-level and component-level animations:
    page reveal, staggered card reveal, hover/focus transitions
  • Must follow strong composition:
    hero + value sections + trust section + CTA footer on landing page
  • Landing page is compulsory. No app is valid without frontend/pages/index.tsx as a marketing-quality page.
  • DEFAULT COLOR POLICY: use light/professional UI by default.
    Do NOT use black/near-black full-page backgrounds unless the user explicitly asks for dark mode.

╔══════════════════════════════════════════════╗
║  FILE GENERATION ORDER — CRITICAL             ║
╚══════════════════════════════════════════════╝

Generate files in MODULE-BY-MODULE order, NOT layer-by-layer.

CORRECT ORDER:
  1. Shared files: middleware/auth.ts, AuthContext, _app.tsx, globals.css, configs
  2. External service files (stripe.service.ts, email.service.ts, etc.) — if requested
  3. Auth module: schema → model → service → controller → routes → login.tsx → signup.tsx
  4. Module A: schema → model → service → controller → routes → pages/A/index.tsx → pages/A/new.tsx → pages/A/[id]/edit.tsx → services/A.service.ts
  5. Module B: (same pattern) — and so on for all modules
  6. Last: server.ts (registers all routes), dashboard.tsx, Navbar.tsx

╔══════════════════════════════════════════════╗
║  COMPLETENESS CHECK — VERIFY BEFORE OUTPUT   ║
╚══════════════════════════════════════════════╝

✓ server.ts registers routes for EVERY module (not just auth)
✓ Navbar.tsx has links to EVERY module list page
✓ dashboard.tsx calls real API endpoints and shows live data
✓ Every module has 5 backend files + 3 frontend pages + 1 service
✓ _app.tsx wraps entire app with AuthProvider
✓ globals.css defines CSS variables for the design system
✓ Both package.json files have correct dependencies INCLUDING external service packages
✓ index.tsx is a premium compulsory landing page with CTA(s)
✓ Edit pages pre-fill form data by fetching the item by ID first
✓ All external service files are FULLY implemented (not stubbed)
✓ .env.example includes ALL environment variables (including external services)

CRITICAL: Return ONLY raw JSON. No markdown. No explanation.
Start with { and end with }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — REFINE PROMPT
// ─────────────────────────────────────────────────────────────────────────────

export function buildRefinePrompt(
  previousFiles: Array<{ path: string; content: string }>,
  refinementRequest: string,
  projectName?: string,
): string {
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

  // Detect if the refinement is adding a new external service
  const externalServices = detectExternalServices(refinementRequest);
  const serviceBlock = externalServices.instructions
    ? `\n${externalServices.instructions}\n`
    : '';

  return `You are an expert full-stack developer refining an existing application.

PROJECT: ${projectName || 'my-app'}
TOTAL FILES IN PROJECT: ${previousFiles.length}

ALL FILES IN THIS PROJECT:
${fileList}

KEY FILE CONTENTS (for context):
${fileContext}

REFINEMENT REQUEST:
"${refinementRequest}"
${serviceBlock}
RULES:
1. Apply ONLY the requested change. Do not remove existing features.
2. If adding a new module: include all 5 backend files + 3 frontend pages + 1 service.
3. If adding new routes: update server.ts to register them.
4. If adding new pages: update Navbar.tsx to link to them.
5. If adding an external service (Stripe, email, etc.): generate the full service file + all required endpoints.
6. Return ONLY files that you are creating or changing.
7. Keep the same JSON output format.
8. Return ONLY raw JSON. No markdown. Start with { end with }.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — DESIGN-TO-CODE PROMPT
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
  designDescription?: string,
): string {
  return `${SYSTEM_PROMPT_DESIGN_TO_CODE}

${designDescription ? `DESIGN DESCRIPTION: "${designDescription}"\n\n` : ''}DESIGN SPECIFICATION:
${JSON.stringify(designJSON, null, 2)}

Generate the complete React + Tailwind component now.
Return only TypeScript — no markdown fences, no explanation.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — REQUIREMENTS PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

export function buildRequirementsQuestionsPrompt(
  userIdea: string,
  selectedModules: string[],
): string {
  const normalizedModules = selectedModules.map(m => String(m || '').toLowerCase()).filter(Boolean);
  const onlyAuthSelected = normalizedModules.length === 1 && normalizedModules[0] === 'auth';
  const selectedModulesLabel = selectedModules.length > 0
    ? selectedModules.join(', ')
    : 'auto-infer-from-idea';

  // Detect potential external services to ask about
  const serviceHints = detectExternalServices(userIdea);
  const serviceQuestion = serviceHints.requiredFiles.length === 0
    ? `  { "id": "q_ext", "question": "Do you need any third-party integrations like payments (Stripe/Razorpay), file uploads, email notifications, or social login?", "hint": "e.g. Stripe for payments, Nodemailer for emails, Google OAuth", "category": "technical", "required": false },`
    : '';

  return `You are a senior product engineer interviewing a user before building their web application.

User's idea: "${userIdea}"
Selected modules: ${selectedModulesLabel}

Generate 3 to 5 targeted questions to gather everything needed to build this app correctly.
Questions must be SPECIFIC to this app type — not generic.

${serviceQuestion ? `IMPORTANT: Include a question about external service integrations if not already detected.` : `External services already detected from description — no need to ask about them.`}

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
9. Do NOT focus only on authentication/security unless the user explicitly asks for auth-only app.
10. Include at least 2 domain workflow questions about core business entities/features.
11. If selected modules are only "auth", treat it as a starter default and still infer the full product domain.

${onlyAuthSelected ? `IMPORTANT CONTEXT:
Selected modules currently show only "auth". This is a default starter selection.
You MUST ask questions for the full domain app in the user's idea, not just auth.` : ''}

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
    ${serviceQuestion}
  ]
}`;
}

export function buildRequirementsCompilePrompt(
  originalPrompt: string,
  projectName: string,
  answers: RequirementsAnswer[],
  selectedModules: string[],
): string {
  const selectedModulesLabel = selectedModules.length > 0
    ? selectedModules.join(', ')
    : 'auto-infer-from-idea';
  const answersText = answers
    .map(a => `Q: ${a.question}\nA: ${a.answer}`)
    .join('\n\n');

  // Pre-detect external services from the combined text
  const combinedText = `${originalPrompt} ${answersText}`;
  const detectedServices = detectExternalServices(combinedText);
  const servicesNote = detectedServices.requiredFiles.length > 0
    ? `\nDetected external services from user answers: ${Object.keys(EXTERNAL_SERVICE_CATALOGUE)
      .filter(k => detectedServices.requiredFiles.some(f => f.includes(k)))
      .join(', ')}. Include these in coreFeatures and techPreferences.`
    : '';

  return `You are a senior software architect compiling a structured requirements document.

Original idea: "${originalPrompt}"
Project name: ${projectName}
Modules: ${selectedModulesLabel}

User answers:
${answersText}
${servicesNote}

RULES:
1. Return ONLY valid JSON. No markdown. No preamble.
2. "coreFeatures": concrete actionable feature strings, max 8.
   SPECIFIC: "Stripe payment checkout" not "payments".
   SPECIFIC: "Admin panel to manage products" not "admin".
   SPECIFIC: "Nodemailer email notifications on booking" not "emails".
3. "themeMode": exactly one of: light | dark | hybrid | any
4. "scale": exactly one of: personal | startup | enterprise
5. "compiledSummary": 2–4 sentences, plain English, starts with "You're building".
   MUST describe a full production build delivered in one go.
   DO NOT use words: "first release", "MVP", "phase 1", "later phase".
6. Infer values for unanswered fields. Never leave any field empty.
7. "techPreferences": single string summarising all tech choices mentioned + detected services.
8. "designPreference": single string describing visual style.
9. Do NOT collapse to "authentication module" unless user explicitly says auth-only.
10. For non-auth ideas, coreFeatures must be domain-heavy (at least 3 non-auth domain features).
11. If user mentions a payment provider, email service, file upload, OAuth — include it as a specific coreFeature.
12. If the user does not explicitly ask for dark mode, set themeMode to "light".

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

export function getColorPaletteFromSeed(seed: string): { primary: string; secondary: string; accent: string } {
  const palettes = [
    { primary: '#4f46e5', secondary: '#eef2ff', accent: '#06b6d4' },
    { primary: '#2563eb', secondary: '#eff6ff', accent: '#f97316' },
    { primary: '#059669', secondary: '#ecfdf5', accent: '#7c3aed' },
    { primary: '#e11d48', secondary: '#fff1f2', accent: '#f59e0b' },
    { primary: '#0d9488', secondary: '#f0fdfa', accent: '#84cc16' },
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

const TECH_STACK_RULES = `
======================================================
AI GENERATOR MASTER SOP (STANDARD OPERATING PROCEDURE)
======================================================
You are strictly trained to generate production-ready React + Node.js projects.

1. DOMAIN ABSTRACTION (THE PLANNER):
   - You MUST extract 3 to 6 unique business domains from the user's idea.
   - NEVER create a generic module called "auth", "authentication", or "users". Auth is handled globally.

2. UI & STYLING (TAILWIND STRICT MODE):
   - HOW TO STYLE: You MUST write Tailwind utility classes directly on every HTML element (e.g., <button className="bg-indigo-600 text-white rounded-lg p-2">).
   - WHAT NOT TO DO: NEVER write generic custom CSS classes like .btn-primary or .card in globals.css. ONLY CSS Variables are allowed in globals.css.
   - ICONS & SVGS: NEVER write raw <svg> tags. Always import icons from 'lucide-react'.
   - NO COMMENTS: Never write code comments. Wasting tokens is forbidden.

3. COMPONENT GENERATION (ANTI-HALLUCINATION TRAP):
   - EXPECTATION: Every generated file must be 100% self-contained. 
   - WHAT NOT TO DO: NEVER import or hallucinate external wrapper components like <Layout>, <Container>, <ErrorAlert>, or <LoadingSpinner>. They DO NOT EXIST.
   - THE FIX: If you need a dashboard layout, a navbar, or a loading spinner, write the raw JSX/Tailwind for it directly INLINE within the specific page component.
======================================================

TECH STACK:
  Backend:  Node.js + Express + TypeScript + MongoDB (Mongoose) + Zod + bcrypt
  Frontend: Next.js 14 Pages Router + React 18 + TypeScript + Tailwind CSS + axios
  NOTE: Pages Router = pages/ directory. NO "use client". NO app/ directory.

API RESPONSE FORMAT (every endpoint): { success: boolean, data: T | null, error: string | null }

VISUAL STANDARDS (Tailwind):
  Dashboard: sticky Navbar, stats cards grid, recent items table.
  List pages: search + "+ New" button, data table, status badges, edit/delete.
  Form pages: back arrow, labeled inputs h-11, p-3 text-black rounded-lg gap-4, save + cancel buttons.
  Inputs: border text-black bg-white focus:border-indigo-500 h-11 p-2 rounded-md.
  Buttons: primary=bg-indigo-600 hover:bg-indigo-700.
  All: responsive, loading spinner, error alerts, transitions.

PREMIUM QUALITY (MANDATORY): Component designs must be hyper-premium, using sophisticated layouts.
USE EXACT VISUAL TOKENS IN frontend/styles/globals.css: --primary, --secondary, --accent, --background, --surface, --text, --muted.
`;

export function buildPlannerPrompt(userDescription: string, requirements?: RequirementsDocument | null): string {
  const req = requirements ? `
Requirements summary:
- appType: ${requirements.appType}
- targetUsers: ${requirements.targetUsers}
- themeMode: ${requirements.themeMode}
- coreFeatures: ${(requirements.coreFeatures || []).join(', ')}
` : '';

  return `You are a senior software architect.
Create a generation plan for a full-stack web app.

User idea:
"${userDescription}"
${req}
Return ONLY valid JSON with this shape:
{
  "projectName": "string",
  "appType": "string",
  "modules": [
    {
      "name": "kebab-case-module",
      "label": "Human Label",
      "fields": ["fieldOne", "fieldTwo", "fieldThree"]
    }
  ]
}

Rules:
- Infer 2-6 domain-specific modules.
- NEVER include "auth", "authentication", or "users" in the modules array. Auth logic is completely hardcoded separately.
- Use robust, business-specific field names.
- Do not return markdown.`;
}

export function buildModulePrompt(
  module: { name: string; label?: string; fields?: string[] },
  plan: any,
  seed: string
): string {
  const palette = getColorPaletteFromSeed(seed);
  return `Generate files for ONE module in a full-stack app.

${TECH_STACK_RULES}

Project: ${plan?.projectName || 'my-app'}
Module: ${module.name}
Label: ${module.label || module.name}
Fields: ${(module.fields || []).join(', ')}
Palette: primary=${palette.primary}, secondary=${palette.secondary}, accent=${palette.accent}

Return ONLY valid JSON:
{
  "files": [
    { "path": "backend/src/modules/${module.name}/${module.name}.schema.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/${module.name}/${module.name}.model.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/${module.name}/${module.name}.service.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/${module.name}/${module.name}.controller.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/${module.name}/${module.name}.routes.ts", "content": "...", "language": "typescript" },
    { "path": "frontend/src/services/${module.name}.service.ts", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/${module.name}/index.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/${module.name}/new.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/${module.name}/[id]/edit.tsx", "content": "...", "language": "typescript" }
  ]
}

Rules:
- No markdown fences.
- All files must be fully implemented.
- Use the correct API response format.
- Ensure the frontend matches the visual standards.`;
}

export function buildSharedFilesPrompt(plan: any, seed: string): string {
  const palette = getColorPaletteFromSeed(seed);
  const modules = Array.isArray(plan?.modules) ? plan.modules.map((m: any) => m.name) : [];
  return `Generate shared project files for a full-stack app.

${TECH_STACK_RULES}

Project name: ${plan?.projectName || 'my-app'}
Modules: ${modules.join(', ') || 'none'}
Palette: primary=${palette.primary}, secondary=${palette.secondary}, accent=${palette.accent}

Return ONLY valid JSON:
{
  "files": [
    { "path": "backend/src/server.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/middleware/auth.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/auth/auth.schema.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/auth/auth.model.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/auth/auth.service.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/auth/auth.controller.ts", "content": "...", "language": "typescript" },
    { "path": "backend/src/modules/auth/auth.routes.ts", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/_app.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/index.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/login.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/signup.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/pages/dashboard.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/src/components/Navbar.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/src/contexts/AuthContext.tsx", "content": "...", "language": "typescript" },
    { "path": "frontend/src/services/auth.service.ts", "content": "...", "language": "typescript" },
    { "path": "frontend/styles/globals.css", "content": "...", "language": "css" }
  ]
}

Rules:
- Include route registration for all modules in backend/src/server.ts.
- Include navigation links for all modules in Navbar.
- The landing page (index.tsx) must be a premium and cinematic marketing page.
- No markdown fences.`;
}