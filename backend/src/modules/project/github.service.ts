import { Octokit } from '@octokit/rest';
import archiver from 'archiver';
import { ProjectService } from './project.service';
import { Readable } from 'stream';

export class GithubDeploymentService {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  async deployToGithub(
    projectName: string,
    modules: string[],
    templates: { [key: string]: string },
    backends: { [key: string]: string },
    githubRepo: string,
    githubToken: string
  ) {
    const octokit = new Octokit({
      auth: githubToken
    });

    // Verify token and get authenticated user
    let user;
    let owner;
    try {
      const response = await octokit.users.getAuthenticated();
      user = response.data;
      owner = user.login;
    } catch (error: any) {
      console.error('GitHub authentication error:', error.message);
      if (error.status === 401) {
        throw new Error('Invalid GitHub token. Please check your Personal Access Token.');
      }
      throw new Error(`GitHub authentication failed: ${error.message}`);
    }

    // Create repository
    try {
      await octokit.repos.createForAuthenticatedUser({
        name: githubRepo,
        description: `${projectName} - Generated with Template Builder`,
        private: false,
        auto_init: true
      });
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error('Repository already exists');
      }
      throw error;
    }

    // Wait for repo initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate all project files
    const files = await this.generateAllFiles(projectName, modules, templates, backends);

    // Upload files to GitHub
    for (const file of files) {
      try {
        // Check if file exists
        let sha: string | undefined;
        try {
          const { data: existingFile } = await octokit.repos.getContent({
            owner,
            repo: githubRepo,
            path: file.path
          });
          if ('sha' in existingFile) {
            sha = existingFile.sha;
          }
        } catch (error) {
          // File doesn't exist, that's fine
        }

        // Create or update file
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo: githubRepo,
          path: file.path,
          message: `Add ${file.path}`,
          content: Buffer.from(file.content).toString('base64'),
          ...(sha && { sha })
        });
      } catch (error: any) {
        console.error(`Failed to upload ${file.path}:`, error.message);
      }
    }

    return {
      success: true,
      repoUrl: `https://github.com/${owner}/${githubRepo}`,
      cloneUrl: `https://github.com/${owner}/${githubRepo}.git`
    };
  }

  private async generateAllFiles(
    projectName: string,
    modules: string[],
    templates: { [key: string]: string },
    backends: { [key: string]: string }
  ) {
    const files: Array<{ path: string; content: string }> = [];
    const path = require('path');
    const { readFileSync } = require('fs');

    // Get project root
    const projectRoot = path.join(__dirname, '../../../../');
    
    // Add README
    files.push({
      path: 'README.md',
      content: this.generateReadme(projectName, modules, templates, backends)
    });

    // Add .gitignore
    files.push({
      path: '.gitignore',
      content: `node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
`
    });

    // Generate backend files for each module
    if (modules.includes('auth')) {
      const backendType = backends.auth || 'jwt-mongodb';
      
      // Add backend package.json with correct dependencies
      const backendDeps = this.getBackendDependencies(backendType);
      files.push({
        path: 'backend/package.json',
        content: JSON.stringify(backendDeps, null, 2)
      });

      // Add backend tsconfig.json
      files.push({
        path: 'backend/tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            lib: ['ES2020'],
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules']
        }, null, 2)
      });

      // Add .env.example
      files.push({
        path: 'backend/.env.example',
        content: this.getEnvExample(backendType)
      });

      // Add backend auth module files
      const authBasePath = path.join(projectRoot, 'backend/src/modules/auth');
      
      try {
        // Read auth module files
        const authFiles = [
          'auth.model.ts',
          'auth.schema.ts',
          'auth.service.ts',
          'auth.controller.ts',
          'auth.routes.ts'
        ];

        for (const file of authFiles) {
          const filePath = path.join(authBasePath, file);
          const content = readFileSync(filePath, 'utf-8');
          files.push({
            path: `backend/src/modules/auth/${file}`,
            content
          });
        }

        // Add server.ts and config
        files.push({
          path: 'backend/src/server.ts',
          content: readFileSync(path.join(projectRoot, 'backend/src/server.ts'), 'utf-8')
        });

        files.push({
          path: 'backend/src/config/modules.ts',
          content: readFileSync(path.join(projectRoot, 'backend/src/config/modules.ts'), 'utf-8')
        });

      } catch (error) {
        console.error('Error reading backend files:', error);
      }
    }

    // Generate frontend files
    const templateVariant = templates.auth || 'minimal';
    
    // Add frontend package.json
    files.push({
      path: 'frontend/package.json',
      content: JSON.stringify({
        name: `${projectName}-frontend`,
        version: '1.0.0',
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          next: '^14.0.4',
          axios: '^1.6.2'
        },
        devDependencies: {
          '@types/react': '^18.2.45',
          '@types/node': '^20.10.5',
          typescript: '^5.3.3',
          tailwindcss: '^3.4.0',
          autoprefixer: '^10.4.16',
          postcss: '^8.4.32'
        }
      }, null, 2)
    });

    // Add frontend config files
    files.push({
      path: 'frontend/tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'es5',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
        exclude: ['node_modules']
      }, null, 2)
    });

    files.push({
      path: 'frontend/next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
`
    });

    files.push({
      path: 'frontend/tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`
    });

    files.push({
      path: 'frontend/.env.local.example',
      content: `NEXT_PUBLIC_API_URL=http://localhost:5000
`
    });

    // Add frontend template files for selected variant
    try {
      const frontendBase = path.join(projectRoot, 'frontend/templates/auth');
      
      // Add selected variant files
      const variantPath = path.join(frontendBase, 'variants', templateVariant);
      const loginContent = readFileSync(path.join(variantPath, 'Login.tsx'), 'utf-8');
      const signupContent = readFileSync(path.join(variantPath, 'Signup.tsx'), 'utf-8');
      
      files.push({
        path: 'frontend/pages/login.tsx',
        content: loginContent
      });
      
      files.push({
        path: 'frontend/pages/signup.tsx',
        content: signupContent
      });

      // Add auth service
      files.push({
        path: 'frontend/services/auth.service.ts',
        content: readFileSync(path.join(frontendBase, 'services/auth.service.ts'), 'utf-8')
      });

      // Add components
      files.push({
        path: 'frontend/components/AuthForm.tsx',
        content: readFileSync(path.join(frontendBase, 'components/AuthForm.tsx'), 'utf-8')
      });

      // Add basic pages
      files.push({
        path: 'frontend/pages/_app.tsx',
        content: `import type { AppProps } from 'next/app'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
`
      });

      files.push({
        path: 'frontend/pages/index.tsx',
        content: `import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/login')
  }, [])
  
  return <div>Redirecting...</div>
}
`
      });

      files.push({
        path: 'frontend/pages/dashboard.tsx',
        content: `import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    
    // Fetch user data
    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: \`Bearer \${token}\` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.data)
        } else {
          router.push('/login')
        }
      })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <p className="text-gray-600 mb-4">Welcome, {user.name}!</p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
`
      });

      files.push({
        path: 'frontend/styles/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`
      });

    } catch (error) {
      console.error('Error reading frontend template files:', error);
    }

    return files;
  }

  private getBackendDependencies(backendType: string): any {
    const base: any = {
      name: 'backend',
      version: '1.0.0',
      scripts: {
        dev: 'ts-node-dev --respawn src/server.ts',
        build: 'tsc',
        start: 'node dist/server.js'
      },
      dependencies: {
        express: '^4.18.2',
        bcrypt: '^5.1.1',
        jsonwebtoken: '^9.0.2',
        zod: '^3.22.4',
        cors: '^2.8.5',
        dotenv: '^16.3.1'
      },
      devDependencies: {
        '@types/express': '^4.17.21',
        '@types/bcrypt': '^5.0.2',
        '@types/jsonwebtoken': '^9.0.5',
        '@types/cors': '^2.8.17',
        '@types/node': '^20.10.5',
        'ts-node-dev': '^2.0.0',
        typescript: '^5.3.3'
      }
    };

    if (backendType === 'jwt-mongodb') {
      base.dependencies.mongoose = '^8.0.3';
    } else if (backendType === 'jwt-postgresql') {
      base.dependencies.pg = '^8.11.3';
      base.devDependencies['@types/pg'] = '^8.10.9';
    } else if (backendType === 'jwt-mysql') {
      base.dependencies.mysql2 = '^3.6.5';
    } else if (backendType === 'session-based') {
      base.dependencies.mongoose = '^8.0.3';
      base.dependencies.redis = '^4.6.11';
      base.dependencies['express-session'] = '^1.17.3';
      base.dependencies['connect-redis'] = '^7.1.0';
      base.devDependencies['@types/express-session'] = '^1.17.10';
    }

    return base;
  }

  private getEnvExample(backendType: string) {
    let content = `PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this
`;

    if (backendType === 'jwt-mongodb') {
      content += `MONGODB_URI=mongodb://localhost:27017/your-database
`;
    } else if (backendType === 'jwt-postgresql') {
      content += `DATABASE_URL=postgresql://user:password@localhost:5432/your-database
`;
    } else if (backendType === 'jwt-mysql') {
      content += `MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=your-database
`;
    } else if (backendType === 'session-based') {
      content += `MONGODB_URI=mongodb://localhost:27017/your-database
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-super-secret-session-key
`;
    }

    return content;
  }

  private generateReadme(
    projectName: string,
    modules: string[],
    templates: { [key: string]: string },
    backends: { [key: string]: string }
  ) {
    return `# ${projectName}

Generated with Template Builder

## 🎯 Project Configuration

### Modules
${modules.map(m => `- **${m}**`).join('\n')}

### Templates
${Object.entries(templates).map(([mod, template]) => `- ${mod}: **${template}**`).join('\n')}

### Backend Implementation
${Object.entries(backends).map(([mod, backend]) => `- ${mod}: **${backend}**`).join('\n')}

## 🚀 Getting Started

### Backend Setup
\`\`\`bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
\`\`\`

### Frontend Setup
\`\`\`bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local if needed
npm run dev
\`\`\`

## 📁 Project Structure

\`\`\`
${projectName}/
├── backend/          # Express + TypeScript backend
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   ├── config/   # Configuration
│   │   └── server.ts # Entry point
│   └── package.json
│
└── frontend/         # Next.js + React frontend
    ├── pages/        # Routes
    ├── components/   # Components
    ├── services/     # API services
    └── package.json
\`\`\`

## 🔧 Configuration

Make sure to update the following:
1. Backend \`.env\` file with your database credentials
2. Frontend \`.env.local\` with API URL (if different)
3. Install required databases (MongoDB/PostgreSQL/MySQL/Redis)

## 📝 API Documentation

Default backend runs on: \`http://localhost:5000\`
Default frontend runs on: \`http://localhost:3000\`

### Auth Endpoints
- POST \`/api/auth/signup\` - Create new user
- POST \`/api/auth/login\` - Login user
- GET \`/api/auth/me\` - Get current user (requires auth)

---

**Built with Template Builder** 🚀
`;
    return `# ${projectName}

Generated with Template Builder

## Modules Included
${modules.map(m => `- ${m}`).join('\n')}

## Getting Started

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
npm run dev
\`\`\`

## Documentation

See the docs folder for detailed information about each module.
`;
  }
}
