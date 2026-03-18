import fetch from 'node-fetch';

type GeneratedFile = { path: string; content: string };

interface VercelFile {
  file: string;
  data: string;
  encoding: 'utf-8' | 'base64';
}

export interface VercelDeployResult {
  deployId: string;
  url: string;
  readyState:
    | 'BUILDING'
    | 'ERROR'
    | 'INITIALIZING'
    | 'QUEUED'
    | 'READY'
    | 'CANCELED';
}

export class VercelService {
  private readonly baseUrl = 'https://api.vercel.com';

  async deployFrontend(
    vercelToken: string,
    projectName: string,
    files: GeneratedFile[]
  ): Promise<VercelDeployResult> {
    const frontendFiles = files.filter(
      (f) => f.path.startsWith('frontend/') || f.path === 'SETUP.md'
    );

    if (frontendFiles.length === 0) {
      throw new Error('No frontend files found in this project');
    }

    const vercelFiles: VercelFile[] = frontendFiles.map((f) => ({
      file: f.path.replace(/^frontend\//, ''),
      data: f.content,
      encoding: 'utf-8'
    }));

    const hasPackageJson = vercelFiles.some((f) => f.file === 'package.json');
    if (!hasPackageJson) {
      vercelFiles.push({
        file: 'package.json',
        data: JSON.stringify(
          {
            name: projectName.toLowerCase().replace(/\s+/g, '-'),
            version: '0.1.0',
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start'
            },
            dependencies: {
              next: '^16.0.0',
              react: '^19.0.0',
              'react-dom': '^19.0.0'
            }
          },
          null,
          2
        ),
        encoding: 'utf-8'
      });
    }

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
      const error = (await response.json()) as any;
      throw new Error(
        `Vercel deployment failed: ${error?.error?.message || response.statusText}`
      );
    }

    const deployment = (await response.json()) as any;

    return {
      deployId: String(deployment.id),
      url: `https://${deployment.url}`,
      readyState: deployment.readyState
    };
  }

  async getDeploymentStatus(
    vercelToken: string,
    deployId: string
  ): Promise<VercelDeployResult> {
    const response = await fetch(`${this.baseUrl}/v13/deployments/${deployId}`, {
      headers: { Authorization: `Bearer ${vercelToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to get Vercel deployment status');
    }

    const deployment = (await response.json()) as any;

    return {
      deployId: String(deployment.id),
      url: `https://${deployment.url}`,
      readyState: deployment.readyState
    };
  }

  async verifyToken(
    vercelToken: string
  ): Promise<{ valid: boolean; username?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/user`, {
        headers: { Authorization: `Bearer ${vercelToken}` }
      });

      if (!response.ok) {
        return { valid: false };
      }

      const data = (await response.json()) as any;
      return { valid: true, username: data?.user?.username || data?.user?.name };
    } catch {
      return { valid: false };
    }
  }
}

export const vercelService = new VercelService();
