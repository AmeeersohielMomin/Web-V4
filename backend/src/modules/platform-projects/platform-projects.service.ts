import archiver from 'archiver';
import { Response } from 'express';
import { PlatformProject } from './platform-project.model';
import { PlatformUser } from '../platform-auth/platform-user.model';

type GeneratedFile = { path: string; content: string; language?: string };
type ProjectAccessRole = 'owner' | 'editor' | 'viewer' | null;
type ReadableAccessRole = 'owner' | 'editor' | 'viewer';

type UserTeamContext = {
  teamId: string | null;
  teamRole: 'owner' | 'editor' | 'viewer' | null;
};

function normalizeFiles(files: GeneratedFile[]) {
  return (Array.isArray(files) ? files : [])
    .filter((file: any) => file && typeof file.path === 'string')
    .map((file: any) => {
      const rawContent = file.content;
      let content: string;

      if (typeof rawContent === 'string') {
        content = rawContent;
      } else {
        try {
          content = JSON.stringify(rawContent, null, 2);
        } catch {
          content = String(rawContent ?? '');
        }
      }

      return {
        path: String(file.path),
        content,
        language: typeof file.language === 'string' ? file.language : undefined
      };
    });
}

export class PlatformProjectsService {
  private async getUserTeamContext(userId: string): Promise<UserTeamContext> {
    const user = await PlatformUser.findById(userId).select('teamId teamRole');
    return {
      teamId: user?.teamId ? String(user.teamId) : null,
      teamRole: (user?.teamRole as UserTeamContext['teamRole']) || null
    };
  }

  private resolveProjectAccessRole(project: any, userId: string, userTeam: UserTeamContext): ProjectAccessRole {
    if (String(project?.userId || '') === String(userId)) {
      return 'owner';
    }

    const projectTeamId = project?.teamId ? String(project.teamId) : null;
    if (projectTeamId && userTeam.teamId && projectTeamId === userTeam.teamId) {
      return userTeam.teamRole || 'viewer';
    }

    return null;
  }

  private async getProjectWithAccess(projectId: string, userId: string): Promise<{ project: any; role: ProjectAccessRole }> {
    const userTeam = await this.getUserTeamContext(userId);
    const project = await PlatformProject.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Backward compatibility: old projects may not have teamId populated.
    if (!project.teamId && userTeam.teamId && String(project.userId) !== String(userId)) {
      const owner = await PlatformUser.findById(project.userId).select('teamId');
      const ownerTeamId = owner?.teamId ? String(owner.teamId) : null;
      if (ownerTeamId && ownerTeamId === userTeam.teamId) {
        project.teamId = owner?.teamId;
        await project.save();
      }
    }

    const role = this.resolveProjectAccessRole(project, userId, userTeam);
    if (!role) {
      throw new Error('Project not found');
    }

    return { project, role };
  }

  private ensureWriteAccess(role: ProjectAccessRole) {
    if (role !== 'owner' && role !== 'editor') {
      throw new Error('You do not have permission to modify this project');
    }
  }

  private ensureOwnerAccess(role: ProjectAccessRole) {
    if (role !== 'owner') {
      throw new Error('Only the project owner can perform this action');
    }
  }

  private buildAccessMeta(project: any, role: ProjectAccessRole, userId: string) {
    const safeRole: ReadableAccessRole = (role || 'viewer') as ReadableAccessRole;
    const isOwner = safeRole === 'owner';
    const canWrite = safeRole === 'owner' || safeRole === 'editor';

    return {
      accessRole: safeRole,
      isOwner,
      canWrite,
      canDelete: isOwner,
      canPublish: isOwner,
      canDeploy: canWrite,
      isTeamProject: !!(project?.teamId && String(project?.userId || '') !== String(userId))
    };
  }

  async createProject(
    userId: string,
    data: {
      name: string;
      modules: string[];
      template: string;
      backend: string;
      provider: string;
      designSeed?: string;
      description?: string;
    }
  ) {
    const user = await PlatformUser.findById(userId).select('teamId');
    return PlatformProject.create({
      userId,
      teamId: user?.teamId || null,
      ...data,
      status: 'generating'
    });
  }

  async saveFiles(projectId: string, userId: string, files: GeneratedFile[], prompt?: string) {
    const access = await this.getProjectWithAccess(projectId, userId);
    this.ensureWriteAccess(access.role);

    const normalizedFiles = normalizeFiles(files);

    // Get current project to determine version number
    const project = access.project;
    const versionNumber = project ? (project.currentVersion || 0) + 1 : 1;

    // Save version snapshot
    await PlatformProject.findByIdAndUpdate(projectId, {
      $push: {
        versions: {
          versionNumber,
          label: `v${versionNumber}`,
          prompt: prompt || '',
          files: normalizedFiles,
          fileCount: normalizedFiles.length
        }
      }
    });

    return PlatformProject.findByIdAndUpdate(
      projectId,
      {
        files: normalizedFiles,
        fileCount: normalizedFiles.length,
        status: 'complete',
        currentVersion: versionNumber
      },
      { new: true }
    );
  }

  async restoreVersion(projectId: string, userId: string, versionNumber: number) {
    const access = await this.getProjectWithAccess(projectId, userId);
    this.ensureWriteAccess(access.role);
    const project = access.project;

    const version = (project.versions as any[])?.find(
      (v: any) => v.versionNumber === versionNumber
    );
    if (!version) throw new Error('Version not found');

    return PlatformProject.findByIdAndUpdate(
      projectId,
      {
        files: version.files,
        fileCount: version.fileCount,
        currentVersion: versionNumber
      },
      { new: true }
    );
  }

  async getVersionHistory(projectId: string, userId: string) {
    const access = await this.getProjectWithAccess(projectId, userId);
    const project = await PlatformProject.findById(access.project._id)
      .select('versions currentVersion name');
    if (!project) {
      throw new Error('Project not found');
    }

    return {
      currentVersion: project.currentVersion,
      versions: (project.versions as any[])?.map((v: any) => ({
        versionNumber: v.versionNumber,
        label: v.label,
        prompt: v.prompt,
        fileCount: v.fileCount,
        createdAt: v.createdAt
      })) || []
    };
  }

  async appendChatEntry(
    projectId: string,
    userId: string,
    entry: { type: 'generate' | 'refine'; prompt: string }
  ) {
    const access = await this.getProjectWithAccess(projectId, userId);
    this.ensureWriteAccess(access.role);

    return PlatformProject.findOneAndUpdate(
      { _id: projectId },
      {
        $push: {
          chatHistory: {
            type: entry.type,
            prompt: entry.prompt,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
  }

  async listUserProjects(userId: string) {
    const userTeam = await this.getUserTeamContext(userId);
    const query: any = { userId };

    if (userTeam.teamId) {
      query.$or = [{ userId }, { teamId: userTeam.teamId }];
    }

    const projects = await PlatformProject.find(query)
      .select(
        'userId teamId name modules template backend status fileCount createdAt updatedAt vercelDeployUrl githubRepoUrl railwayServiceUrl isPublic tags'
      )
      .sort({ updatedAt: -1 })
      .limit(50);

    return projects.map((project: any) => {
      const role = this.resolveProjectAccessRole(project, userId, userTeam);
      const access = this.buildAccessMeta(project, role, userId);
      return {
        ...project.toObject(),
        ...access
      };
    });
  }

  async getProject(projectId: string, userId: string) {
    const access = await this.getProjectWithAccess(projectId, userId);
    return {
      ...access.project.toObject(),
      ...this.buildAccessMeta(access.project, access.role, userId)
    };
  }

  async deleteProject(projectId: string, userId: string) {
    const access = await this.getProjectWithAccess(projectId, userId);
    this.ensureOwnerAccess(access.role);

    const result = await PlatformProject.deleteOne({ _id: projectId });
    if (result.deletedCount === 0) {
      throw new Error('Project not found');
    }
  }

  // ─── Template Gallery ──────────────────────────────────────────
  async listPublicTemplates(page = 1, limit = 20, search?: string) {
    const query: any = { isPublic: true, status: 'complete' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [templates, total] = await Promise.all([
      PlatformProject.find(query)
        .select('name description modules template backend tags fileCount createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PlatformProject.countDocuments(query)
    ]);

    return { templates, total, page, limit };
  }

  async togglePublic(projectId: string, userId: string, isPublic: boolean) {
    const access = await this.getProjectWithAccess(projectId, userId);
    this.ensureOwnerAccess(access.role);

    const project = await PlatformProject.findOneAndUpdate(
      { _id: projectId },
      { isPublic },
      { new: true }
    );
    if (!project) throw new Error('Project not found');
    return { isPublic: project.isPublic };
  }

  async cloneTemplate(templateId: string, userId: string, newName?: string) {
    const template = await PlatformProject.findOne({ _id: templateId, isPublic: true });
    if (!template) throw new Error('Template not found');

    const user = await PlatformUser.findById(userId).select('teamId');

    const clone = await PlatformProject.create({
      userId,
      teamId: user?.teamId || null,
      name: newName || `${template.name}-clone`,
      description: template.description,
      modules: template.modules,
      template: template.template,
      backend: template.backend,
      tags: template.tags,
      files: template.files,
      fileCount: template.fileCount,
      status: 'complete'
    });

    return clone;
  }

  async streamZipDownload(projectId: string, userId: string, res: Response) {
    const project = await this.getProject(projectId, userId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of project.files as GeneratedFile[]) {
      archive.append(file.content, { name: file.path });
    }

    archive.append(this.buildReadme(project), { name: 'SETUP.md' });
    await archive.finalize();
  }

  private buildReadme(project: any): string {
    return `# ${project.name}

Generated by IDEA Platform on ${new Date(project.createdAt).toLocaleDateString()}

## Stack
- Template: ${project.template}
- Backend: ${project.backend}
- Modules: ${Array.isArray(project.modules) ? project.modules.join(', ') : ''}

## Setup

\`\`\`bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL, JWT_SECRET
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Access
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
`;
  }
}

export const platformProjectsService = new PlatformProjectsService();
