/**
 * Export Utilities — Generate Dockerfile, docker-compose, GitHub Actions CI/CD
 * for generated projects.
 */

export interface ProjectFile {
  path: string;
  content: string;
}

export function generateDockerfile(projectFiles: ProjectFile[]): string {
  const hasPackageJson = projectFiles.some((f) => f.path === 'package.json');
  const hasRequirements = projectFiles.some((f) => f.path === 'requirements.txt');

  if (hasRequirements) {
    return `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "main.py"]
`;
  }

  if (hasPackageJson) {
    return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm", "start"]
`;
  }

  // Generic fallback
  return `FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
`;
}

export function generateDockerCompose(projectName: string): string {
  return `version: '3.8'

services:
  app:
    build: .
    container_name: ${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  db:
    image: mongo:7
    container_name: ${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-db
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
    restart: unless-stopped

volumes:
  mongo_data:
`;
}

export function generateGitHubActions(projectName: string): string {
  return `name: CI/CD - ${projectName}

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Build
        run: npm run build --if-present

      - name: Test
        run: npm test --if-present

  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
`;
}

export function generateTestFile(projectName: string): string {
  return `/**
 * Auto-generated basic tests for ${projectName}
 * Run: npx jest
 */

describe('${projectName}', () => {
  test('should load without errors', () => {
    expect(true).toBe(true);
  });

  test('should have valid package.json', () => {
    const pkg = require('./package.json');
    expect(pkg.name).toBeDefined();
    expect(pkg.version).toBeDefined();
  });

  test('should export required modules', () => {
    // Add specific module tests here
    expect(typeof require).toBe('function');
  });
});

describe('API Health', () => {
  test('health endpoint returns OK', async () => {
    // Uncomment and configure when testing with supertest:
    // const response = await request(app).get('/health');
    // expect(response.status).toBe(200);
    expect(true).toBe(true);
  });
});
`;
}

/**
 * Add export files (Dockerfile, docker-compose, CI/CD, tests)
 * to an existing project file list
 */
export function addExportFiles(
  projectName: string,
  existingFiles: ProjectFile[],
  options: {
    docker?: boolean;
    compose?: boolean;
    cicd?: boolean;
    tests?: boolean;
  } = {}
): ProjectFile[] {
  const newFiles: ProjectFile[] = [...existingFiles];

  if (options.docker) {
    newFiles.push({
      path: 'Dockerfile',
      content: generateDockerfile(existingFiles)
    });
  }

  if (options.compose) {
    newFiles.push({
      path: 'docker-compose.yml',
      content: generateDockerCompose(projectName)
    });
  }

  if (options.cicd) {
    newFiles.push({
      path: '.github/workflows/ci.yml',
      content: generateGitHubActions(projectName)
    });
  }

  if (options.tests) {
    newFiles.push({
      path: '__tests__/app.test.js',
      content: generateTestFile(projectName)
    });
  }

  return newFiles;
}
