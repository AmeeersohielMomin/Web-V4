import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
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
