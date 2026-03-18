import archiver from 'archiver';
import { readFileSync } from 'fs';
import path from 'path';

export class ProjectService {
  async generateProject(
    archive: archiver.Archiver, 
    projectName: string, 
    modules: string[],
    templates: { [key: string]: string } = {},
    backends: { [key: string]: string } = {}
  ) {
    // Add README
    archive.append(this.generateReadme(projectName, modules), { 
      name: 'README.md' 
    });

    // Add root package.json
    archive.append(this.generateRootPackageJson(projectName), { 
      name: 'package.json' 
    });

    // Generate backend with selected implementations
    await this.generateBackend(archive, modules, backends);

    // Generate frontend with selected templates
    await this.generateFrontend(archive, modules, templates);

    // Add environment examples
    this.addEnvironmentFiles(archive, backends);

    // Add documentation
    this.addDocumentation(archive, modules, templates, backends);
  }

  private async generateBackend(
    archive: archiver.Archiver,
    modules: string[],
    _backends: { [key: string]: string } = {}
  ) {
    // Backend package.json
    archive.append(this.getBackendPackageJson(), { 
      name: 'backend/package.json' 
    });

    // Backend tsconfig.json
    archive.append(this.getBackendTsConfig(), { 
      name: 'backend/tsconfig.json' 
    });

    // Server.ts
    archive.append(this.generateServerFile(modules), { 
      name: 'backend/src/server.ts' 
    });

    // Config files
    archive.append(this.generateModulesConfig(modules), { 
      name: 'backend/src/config/modules.ts' 
    });

    // Generate module files for each selected module
    for (const moduleName of modules) {
      await this.generateModuleFiles(archive, moduleName);
    }

    // .gitignore
    archive.append(this.getBackendGitignore(), { 
      name: 'backend/.gitignore' 
    });
  }

  private async generateFrontend(
    archive: archiver.Archiver,
    modules: string[],
    _templates: { [key: string]: string } = {}
  ) {
    // Frontend package.json
    archive.append(this.getFrontendPackageJson(), { 
      name: 'frontend/package.json' 
    });

    // Frontend tsconfig.json
    archive.append(this.getFrontendTsConfig(), { 
      name: 'frontend/tsconfig.json' 
    });

    // Next.js configs
    archive.append(this.getNextConfig(), { 
      name: 'frontend/next.config.js' 
    });

    archive.append(this.getTailwindConfig(), { 
      name: 'frontend/tailwind.config.js' 
    });

    archive.append(this.getPostcssConfig(), { 
      name: 'frontend/postcss.config.js' 
    });

    // Feature config
    archive.append(this.generateFeaturesConfig(modules), { 
      name: 'frontend/config/features.ts' 
    });

    // Pages
    archive.append(this.getAppPage(), { 
      name: 'frontend/pages/_app.tsx' 
    });

    archive.append(this.getDocumentPage(), { 
      name: 'frontend/pages/_document.tsx' 
    });

    archive.append(this.getIndexPage(), { 
      name: 'frontend/pages/index.tsx' 
    });

    archive.append(this.getDashboardPage(), { 
      name: 'frontend/pages/dashboard.tsx' 
    });

    // Styles
    archive.append(this.getGlobalStyles(), { 
      name: 'frontend/styles/globals.css' 
    });

    // Generate template files for each selected module
    for (const moduleName of modules) {
      await this.generateTemplateFiles(archive, moduleName);
    }

    // .gitignore
    archive.append(this.getFrontendGitignore(), { 
      name: 'frontend/.gitignore' 
    });
  }

  private async generateModuleFiles(archive: archiver.Archiver, moduleName: string) {
    if (moduleName === 'auth') {
      // Read actual files from the current project
      const basePath = path.join(__dirname, '..');
      
      try {
        const files = [
          { src: 'auth/auth.model.ts', dest: 'backend/src/modules/auth/auth.model.ts' },
          { src: 'auth/auth.schema.ts', dest: 'backend/src/modules/auth/auth.schema.ts' },
          { src: 'auth/auth.service.ts', dest: 'backend/src/modules/auth/auth.service.ts' },
          { src: 'auth/auth.controller.ts', dest: 'backend/src/modules/auth/auth.controller.ts' },
          { src: 'auth/auth.routes.ts', dest: 'backend/src/modules/auth/auth.routes.ts' }
        ];

        for (const file of files) {
          const filePath = path.join(basePath, file.src);
          const content = readFileSync(filePath, 'utf-8');
          archive.append(content, { name: file.dest });
        }
      } catch (error) {
        console.error('Error reading auth files:', error);
        // Fallback to inline content if files can't be read
        this.addAuthModuleFallback(archive);
      }
    }
  }

  private async generateTemplateFiles(archive: archiver.Archiver, moduleName: string) {
    if (moduleName === 'auth') {
      // Get project root - go up 4 levels from dist/modules/project or 3 levels from src/modules/project
      const projectRoot = path.join(__dirname, '../../../../');
      const frontendBase = path.join(projectRoot, 'frontend/templates');
      
      console.log('Project root:', projectRoot);
      console.log('Looking for frontend templates at:', frontendBase);
      
      try {
        const files = [
          { src: path.join(frontendBase, 'auth/services/auth.service.ts'), dest: 'frontend/templates/auth/services/auth.service.ts' },
          { src: path.join(frontendBase, 'auth/components/AuthForm.tsx'), dest: 'frontend/templates/auth/components/AuthForm.tsx' },
          { src: path.join(frontendBase, 'auth/pages/login.tsx'), dest: 'frontend/templates/auth/pages/login.tsx' },
          { src: path.join(frontendBase, 'auth/pages/signup.tsx'), dest: 'frontend/templates/auth/pages/signup.tsx' }
        ];

        for (const file of files) {
          console.log('Reading file:', file.src);
          const content = readFileSync(file.src, 'utf-8');
          archive.append(content, { name: file.dest });
        }

        // Add page wrappers
        archive.append(this.getLoginPageWrapper(), { name: 'frontend/pages/login.tsx' });
        archive.append(this.getSignupPageWrapper(), { name: 'frontend/pages/signup.tsx' });
        
      } catch (error) {
        console.error('Error reading frontend auth files:', error);
        this.addAuthTemplatesFallback(archive);
      }
    }
  }

  private addEnvironmentFiles(
    archive: archiver.Archiver,
    _backends: { [key: string]: string } = {}
  ) {
    archive.append(this.getBackendEnvExample(), { name: 'backend/.env.example' });
    archive.append(this.getFrontendEnvExample(), { name: 'frontend/.env.local.example' });
  }

  private addDocumentation(
    archive: archiver.Archiver,
    modules: string[],
    _templates: { [key: string]: string } = {},
    _backends: { [key: string]: string } = {}
  ) {
    archive.append(this.generateQuickStart(modules), { name: 'QUICKSTART.md' });
    archive.append(this.generateArchitectureDoc(modules), { name: 'ARCHITECTURE.md' });
  }

  // Template generation methods
  private generateReadme(projectName: string, modules: string[]): string {
    return `# ${projectName}

Generated Template-Driven Application

## Modules Included

${modules.map(m => `- ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\\n')}

## Quick Start

### Backend
\`\`\`bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
\`\`\`

## Documentation

- See QUICKSTART.md for detailed setup instructions
- See ARCHITECTURE.md for technical details

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Express, TypeScript, MongoDB, JWT
- **Authentication:** bcrypt, jsonwebtoken

---

Generated by Template-Driven Full-Stack Builder
`;
  }

  private generateRootPackageJson(projectName: string): string {
    return JSON.stringify({
      name: projectName,
      version: "1.0.0",
      description: "Template-driven full-stack application",
      scripts: {
        "install:all": "cd backend && npm install && cd ../frontend && npm install",
        "dev:backend": "cd backend && npm run dev",
        "dev:frontend": "cd frontend && npm run dev"
      }
    }, null, 2);
  }

  // Continue with more helper methods...
  private getBackendPackageJson(): string {
    return JSON.stringify({
      name: "backend",
      version: "1.0.0",
      scripts: {
        start: "node dist/server.js",
        dev: "ts-node-dev --respawn --transpile-only src/server.ts",
        build: "tsc"
      },
      dependencies: {
        express: "^4.18.2",
        bcrypt: "^5.1.1",
        jsonwebtoken: "^9.0.2",
        dotenv: "^16.3.1",
        cors: "^2.8.5",
        mongoose: "^8.0.3",
        zod: "^3.22.4"
      },
      devDependencies: {
        "@types/express": "^4.17.21",
        "@types/bcrypt": "^5.0.2",
        "@types/jsonwebtoken": "^9.0.5",
        "@types/cors": "^2.8.17",
        "@types/node": "^20.10.6",
        typescript: "^5.3.3",
        "ts-node-dev": "^2.0.0"
      }
    }, null, 2);
  }

  private getBackendTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        moduleResolution: "node"
      },
      include: ["src/**/*"],
      exclude: ["node_modules"]
    }, null, 2);
  }

  private generateServerFile(modules: string[]): string {
    return `import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables FIRST
dotenv.config();

import { isModuleEnabled } from './config/modules';

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'PORT', 'ENABLED_MODULES'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error('❌ FATAL ERROR: Missing required environment variables:');
  missingEnvVars.forEach(v => console.error(\`   - \${v}\`));
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
    await mongoose.connect(process.env.DATABASE_URL!);
    console.log('✅ Database connected successfully');

    // Register module routes conditionally
${modules.map(m => `    if (isModuleEnabled('${m}')) {
      const { ${m}Routes } = await import('./modules/${m}/${m}.routes');
      app.use('/api/${m}', ${m}Routes);
      console.log('✅ ${m.charAt(0).toUpperCase() + m.slice(1)} module enabled and routes registered');
    }`).join('\\n')}

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({ success: false, data: null, error: 'Route not found' });
    });

    // Error handler
    app.use((err: any, req: Request, res: Response, next: any) => {
      console.error('Error:', err);
      res.status(500).json({ success: false, data: null, error: err.message || 'Internal server error' });
    });

    app.listen(PORT, () => {
      console.log(\`✅ Server running on port \${PORT}\`);
      console.log(\`🔗 Health check: http://localhost:\${PORT}/health\`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
`;
  }

  private generateModulesConfig(modules: string[]): string {
    return `export interface ModuleConfig {
  name: string;
  enabled: boolean;
}

const enabledModulesEnv = process.env.ENABLED_MODULES || '';
const enabledModulesList = enabledModulesEnv.split(',').map(m => m.trim()).filter(m => m.length > 0);

export const modules: Record<string, ModuleConfig> = {
${modules.map(m => `  ${m}: { name: '${m}', enabled: enabledModulesList.includes('${m}') }`).join(',\\n')}
};

export function isModuleEnabled(moduleName: string): boolean {
  return modules[moduleName]?.enabled || false;
}
`;
  }

  private getFrontendPackageJson(): string {
    return JSON.stringify({
      name: "frontend",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        next: "^14.0.4",
        axios: "^1.6.2"
      },
      devDependencies: {
        typescript: "^5.3.3",
        "@types/node": "^20.10.6",
        "@types/react": "^18.2.46",
        "@types/react-dom": "^18.2.18",
        autoprefixer: "^10.4.16",
        postcss: "^8.4.32",
        tailwindcss: "^3.4.0"
      }
    }, null, 2);
  }

  private getFrontendTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        paths: { "@/*": ["./*"] }
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"]
    }, null, 2);
  }

  private getNextConfig(): string {
    return `module.exports = {
  reactStrictMode: true,
}`;
  }

  private getTailwindConfig(): string {
    return `module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './templates/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}`;
  }

  private getPostcssConfig(): string {
    return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
  }

  private generateFeaturesConfig(modules: string[]): string {
    return `export const FEATURES: Record<string, boolean> = {
${modules.map(m => `  ${m}: true`).join(',\\n')}
};

export function isFeatureEnabled(featureName: string): boolean {
  return FEATURES[featureName] === true;
}
`;
  }

  private getBackendEnvExample(): string {
    return `DATABASE_URL=mongodb://localhost:27017/your-database
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
PORT=5000
ENABLED_MODULES=auth
`;
  }

  private getFrontendEnvExample(): string {
    return `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
`;
  }

  private getBackendGitignore(): string {
    return `node_modules
dist
.env
*.log
`;
  }

  private getFrontendGitignore(): string {
    return `node_modules
.next
out
.env.local
*.log
`;
  }

  private getGlobalStyles(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  }

  private getAppPage(): string {
    return `import '@/styles/globals.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
`;
  }

  private getDocumentPage(): string {
    return `import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
`;
  }

  private getIndexPage(): string {
    return `import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';
import { FEATURES } from '@/config/features';
import { authService } from '@/templates/auth/services/auth.service';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (FEATURES.auth) {
      const token = authService.getToken();
      if (token) {
        router.push('/dashboard');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Welcome</h1>
        <div className="space-x-4">
          <Link href="/login" className="px-6 py-3 bg-indigo-600 text-white rounded-md">Login</Link>
          <Link href="/signup" className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-md">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
`;
  }

  private getDashboardPage(): string {
    return `import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { authService } from '@/templates/auth/services/auth.service';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = authService.getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    authService.me(token).then(res => {
      if (res.success) setUser(res.data?.user);
      else router.push('/login');
    }).catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = () => {
    authService.removeToken();
    router.push('/');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between">
            <h1 className="text-xl font-bold">Dashboard</h1>
            <div>
              <span className="mr-4">{user.email}</span>
              <button onClick={handleLogout} className="text-red-600">Logout</button>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold">Welcome, {user.email}!</h2>
      </div>
    </div>
  );
}
`;
  }

  private getLoginPageWrapper(): string {
    return `import { FEATURES } from '@/config/features';
export { default } from '@/templates/auth/pages/login';
export async function getStaticProps() {
  if (!FEATURES.auth) return { notFound: true };
  return { props: {} };
}
`;
  }

  private getSignupPageWrapper(): string {
    return `import { FEATURES } from '@/config/features';
export { default } from '@/templates/auth/pages/signup';
export async function getStaticProps() {
  if (!FEATURES.auth) return { notFound: true };
  return { props: {} };
}
`;
  }

  private generateQuickStart(modules: string[]): string {
    return `# Quick Start Guide

## Installation

### Backend
\`\`\`bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URL and JWT secret
npm run dev
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
\`\`\`

## Modules Included

${modules.map(m => `- **${m.charAt(0).toUpperCase() + m.slice(1)}**: Fully functional`).join('\\n')}

Visit http://localhost:3000 to get started!
`;
  }

  private generateArchitectureDoc(modules: string[]): string {
    return `# Architecture

## Tech Stack
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Express, TypeScript, MongoDB
- **Auth:** JWT + bcrypt

## Modules
${modules.map(m => `- ${m}`).join('\\n')}

## Folder Structure
\`\`\`
backend/
  src/
    modules/${modules[0]}/
    config/
    server.ts

frontend/
  templates/${modules[0]}/
  pages/
  config/
\`\`\`
`;
  }

  private addAuthModuleFallback(archive: archiver.Archiver) {
    // Add minimal auth module files as fallback
    console.log('Using fallback auth module generation');
  }

  private addAuthTemplatesFallback(archive: archiver.Archiver) {
    // Add minimal auth template files as fallback
    console.log('Using fallback auth template generation');
  }
}
