import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { getCounters } from './utils/telemetry';

// Load environment variables FIRST
dotenv.config();

import { isModuleEnabled } from './config/modules';

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'ENABLED_MODULES'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ FATAL ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

const app: Express = express();
const PORT = process.env.PORT || 5000;
const isSentryEnabled = !!process.env.SENTRY_DSN;
const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isSentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1
  });
  console.log('✅ Sentry monitoring enabled');
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use('/api/platform/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database connection and server start
async function startServer() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL!);
    console.log('✅ Database connected successfully');

    // Register module routes conditionally
    if (isModuleEnabled('auth')) {
      const { authRoutes } = await import('./modules/auth/auth.routes');
      app.use('/api/auth', authRoutes);
      console.log('✅ Auth module enabled and routes registered');
    } else {
      console.log('⚠️  Auth module disabled');
    }

    // Always enable project generation routes
    if (isModuleEnabled('project')) {
      const { projectRoutes } = await import('./modules/project/project.routes');
      app.use('/api/project', projectRoutes);
      console.log('✅ Project generation enabled');
    }

    // AI generation routes (always enabled)
    if (isModuleEnabled('ai')) {
      const { aiRoutes } = await import('./modules/ai/ai.routes');
      app.use('/api/ai', aiRoutes);
      console.log('✅ AI generation module enabled');
    }

    // Platform auth routes (always enabled)
    const platformAuthRoutes = (await import(
      './modules/platform-auth/platform-auth.routes'
    )).default;
    app.use('/api/platform/auth', platformAuthRoutes);
    console.log('✅ Platform auth routes enabled');

    const platformProjectsRoutes = (await import(
      './modules/platform-projects/platform-projects.routes'
    )).default;
    app.use('/api/platform/projects', platformProjectsRoutes);
    console.log('✅ Platform project routes enabled');

    // Dev-only telemetry endpoint - not exposed in production
    if (process.env.NODE_ENV !== 'production') {
      app.get('/api/dev/telemetry', (_req: Request, res: Response) => {
        res.json({ success: true, data: getCounters(), error: null });
      });
    }

    const billingRoutes = (await import('./modules/billing/billing.routes')).default;
    app.use('/api/platform/billing', billingRoutes);
    console.log('✅ Platform billing routes enabled');

    const deployRoutes = (await import('./modules/deploy/deploy.routes')).default;
    app.use('/api/deploy', deployRoutes);
    console.log('✅ Deployment routes enabled');

    const teamRoutes = (await import('./modules/teams/team.routes')).default;
    app.use('/api/platform/teams', teamRoutes);
    console.log('✅ Team routes enabled');

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        data: null,
        error: 'Route not found'
      });
    });

    // Error handler
    app.use((err: any, req: Request, res: Response, next: any) => {
      console.error('Error:', err);

      if (isSentryEnabled) {
        Sentry.captureException(err);
      }

      res.status(500).json({
        success: false,
        data: null,
        error: err.message || 'Internal server error'
      });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
