import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { PlatformProject } from '../platform-projects/platform-project.model';
import { PlatformUser } from '../platform-auth/platform-user.model';
import { vercelService } from './vercel.service';
import { githubService } from './github.service';
import { railwayService } from './railway.service';

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, '')
  };
}


function getFrontendBase(): string {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',')[0].trim();
}

function resolveGithubOauthConfig() {
  const clientId = String(
    process.env.GITHUB_CLIENT_ID || process.env.GITHUB_OAUTH_CLIENT_ID || ''
  ).trim();
  const clientSecret = String(
    process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_OAUTH_CLIENT_SECRET || ''
  ).trim();
  const callback = String(
    process.env.GITHUB_CALLBACK_URL ||
      process.env.GITHUB_OAUTH_CALLBACK_URL ||
      `${getFrontendBase().replace('3000', '5000')}/api/deploy/github/callback`
  ).trim();

  return { clientId, clientSecret, callback };
}

async function getProjectWithDeployAccess(
  projectId: string,
  userId: string,
  requireWrite = true
) {
  const user = await PlatformUser.findById(userId).select('teamId teamRole');
  const teamId = user?.teamId ? String(user.teamId) : null;

  const project = await PlatformProject.findById(projectId);
  if (!project) {
    return { project: null as any, error: 'Project not found', status: 404 };
  }

  if (!project.teamId && teamId && String(project.userId) !== String(userId)) {
    const owner = await PlatformUser.findById(project.userId).select('teamId');
    const ownerTeamId = owner?.teamId ? String(owner.teamId) : null;
    if (ownerTeamId && ownerTeamId === teamId) {
      project.teamId = owner?.teamId;
      await project.save();
    }
  }

  const isOwner = String(project.userId) === String(userId);
  const isTeamMatch = !!(project.teamId && teamId && String(project.teamId) === teamId);
  if (!isOwner && !isTeamMatch) {
    return { project: null as any, error: 'Project not found', status: 404 };
  }

  const role = isOwner ? 'owner' : ((user?.teamRole as string) || 'viewer');
  const canWrite = role === 'owner' || role === 'editor';

  if (requireWrite && !canWrite) {
    return {
      project: null as any,
      error: 'You do not have permission to deploy this team project',
      status: 403
    };
  }

  return { project, error: null, status: 200 };
}

export class DeployController {
  githubOauthStart = async (req: Request, res: Response) => {
    const { clientId, callback } = resolveGithubOauthConfig();

    if (!clientId) {
      return res.status(400).json({
        success: false,
        data: null,
        error:
          'GitHub OAuth is not configured on this server. Set GITHUB_CLIENT_ID (or GITHUB_OAUTH_CLIENT_ID) and restart backend.'
      });
    }

    const state = `${Date.now()}`;
    const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(callback)}&scope=repo%20read:user&state=${encodeURIComponent(
      state
    )}`;

    return res.redirect(url);
  };

  githubOauthCallback = async (req: Request, res: Response) => {
    const code = String(req.query.code || '');
    const { clientId, clientSecret } = resolveGithubOauthConfig();

    if (!code || !clientId || !clientSecret) {
      return res.status(400).send('GitHub OAuth failed: missing code or server config.');
    }

    try {
      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });

      const tokenData = (await tokenResp.json()) as any;
      const accessToken = tokenData?.access_token;

      if (!accessToken) {
        throw new Error('Failed to exchange OAuth code for token');
      }

      const verified = await githubService.verifyToken(accessToken);
      const payload = {
        type: 'GITHUB_OAUTH_SUCCESS',
        token: accessToken,
        username: verified.username || null
      };

      return res.send(`<!doctype html>
<html>
  <body>
    <script>
      (function () {
        var payload = ${JSON.stringify(payload)};
        if (window.opener) {
          window.opener.postMessage(payload, '*');
        }
        window.close();
      })();
    </script>
  </body>
</html>`);
    } catch (err: any) {
      return res.status(500).send(`GitHub OAuth failed: ${err.message}`);
    }
  };

  deployToVercel = async (req: Request, res: Response) => {
    try {
      const { projectId, vercelToken } = req.body as {
        projectId?: string;
        vercelToken?: string;
      };
      const userId = (req as any).userId as string;

      if (!vercelToken) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Enter your Vercel token'
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'projectId is required'
        });
      }

      const verified = await vercelService.verifyToken(vercelToken);
      if (!verified.valid) {
        return res.status(401).json({
          success: false,
          data: null,
          error: 'Invalid Vercel token'
        });
      }

      const access = await getProjectWithDeployAccess(projectId, userId, true);
      if (!access.project) {
        return res.status(access.status).json({ success: false, data: null, error: access.error });
      }
      const project = access.project;

      const result = await vercelService.deployFrontend(
        vercelToken,
        project.name,
        project.files as any[]
      );

      await PlatformProject.findByIdAndUpdate(projectId, {
        vercelDeployId: result.deployId,
        vercelDeployUrl: result.url,
        lastDeployedAt: new Date()
      });

      return res.json({
        success: true,
        data: {
          deployId: result.deployId,
          url: result.url,
          readyState: result.readyState,
          vercelUser: verified.username || null
        },
        error: null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  getVercelStatus = async (req: Request, res: Response) => {
    try {
      const { vercelToken, projectId } = req.query as {
        vercelToken?: string;
        projectId?: string;
      };

      if (!vercelToken) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'vercelToken query param required'
        });
      }

      const result = await vercelService.getDeploymentStatus(
        vercelToken,
        req.params.deployId
      );

      if (result.readyState === 'READY' && projectId) {
        await PlatformProject.findByIdAndUpdate(projectId, {
          vercelDeployUrl: result.url,
          lastDeployedAt: new Date()
        });
      }

      return res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      return res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  pushToGitHub = async (req: Request, res: Response) => {
    try {
      const { projectId, githubToken, repoName, isPrivate } = req.body as {
        projectId?: string;
        githubToken?: string;
        repoName?: string;
        isPrivate?: boolean;
      };
      const userId = (req as any).userId as string;

      if (!githubToken) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Connect GitHub first'
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'projectId is required'
        });
      }

      const verified = await githubService.verifyToken(githubToken);
      if (!verified.valid) {
        return res.status(401).json({
          success: false,
          data: null,
          error: 'Invalid GitHub token'
        });
      }

      const access = await getProjectWithDeployAccess(projectId, userId, true);
      if (!access.project) {
        return res.status(access.status).json({ success: false, data: null, error: access.error });
      }
      const project = access.project;

      const result = await githubService.pushToGitHub(
        githubToken,
        repoName || project.name,
        project.files as any[],
        !!isPrivate
      );

      await PlatformProject.findByIdAndUpdate(projectId, {
        githubRepoUrl: result.repoUrl,
        githubRepoName: result.repoName,
        lastDeployedAt: new Date()
      });

      return res.json({
        success: true,
        data: {
          repoUrl: result.repoUrl,
          repoName: result.repoName,
          owner: result.owner,
          isNew: result.isNew,
          githubUser: verified.username || result.owner
        },
        error: null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  deployToRailway = async (req: Request, res: Response) => {
    try {
      const { projectId, railwayToken, githubOwner, githubRepo } = req.body as {
        projectId?: string;
        railwayToken?: string;
        githubOwner?: string;
        githubRepo?: string;
      };
      const userId = (req as any).userId as string;

      if (!railwayToken) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Enter your Railway token'
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'projectId is required'
        });
      }

      const access = await getProjectWithDeployAccess(projectId, userId, true);
      if (!access.project) {
        return res.status(access.status).json({ success: false, data: null, error: access.error });
      }
      const project = access.project;

      const verified = await railwayService.verifyToken(railwayToken);
      if (!verified.valid) {
        return res.status(401).json({
          success: false,
          data: null,
          error: 'Invalid Railway token'
        });
      }

      let owner = githubOwner;
      let repo = githubRepo;

      if ((!owner || !repo) && project.githubRepoUrl) {
        const parsed = parseGitHubRepo(project.githubRepoUrl);
        if (parsed) {
          owner = parsed.owner;
          repo = parsed.repo;
        }
      }

      if (!owner || !repo) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Push to GitHub first, then deploy to Railway'
        });
      }

      const result = await railwayService.deployBackend(
        railwayToken,
        project.name,
        owner,
        repo
      );

      await PlatformProject.findByIdAndUpdate(projectId, {
        railwayServiceUrl: result.serviceUrl,
        railwayServiceId: result.serviceId,
        railwayProjectId: result.projectId,
        lastDeployedAt: new Date()
      });

      return res.json({
        success: true,
        data: {
          serviceUrl: result.serviceUrl,
          serviceId: result.serviceId,
          projectId: result.projectId,
          status: result.status,
          railwayUser: verified.username || null
        },
        error: null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  getRailwayStatus = async (req: Request, res: Response) => {
    try {
      const { railwayToken } = req.query as { railwayToken?: string };

      if (!railwayToken) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'railwayToken query param required'
        });
      }

      const result = await railwayService.getDeploymentStatus(
        railwayToken,
        req.params.serviceId
      );

      return res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      return res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  getAllDeployStatus = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string;
      const access = await getProjectWithDeployAccess(req.params.projectId, userId, false);
      if (!access.project) {
        return res.status(access.status).json({ success: false, data: null, error: access.error });
      }

      const project = await PlatformProject.findById(access.project._id).select(
        'name vercelDeployUrl githubRepoUrl railwayServiceUrl vercelDeployId railwayServiceId lastDeployedAt'
      );

      if (!project) {
        return res.status(404).json({ success: false, data: null, error: 'Project not found' });
      }

      return res.json({
        success: true,
        data: {
          projectName: project.name,
          vercelUrl: project.vercelDeployUrl || null,
          githubUrl: project.githubRepoUrl || null,
          railwayUrl: project.railwayServiceUrl || null,
          lastDeployedAt: project.lastDeployedAt || null
        },
        error: null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, data: null, error: err.message });
    }
  };
}

export const deployController = new DeployController();
