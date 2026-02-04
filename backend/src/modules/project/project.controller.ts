import { Request, Response } from 'express';
import { ProjectService } from './project.service';
import { GithubDeploymentService } from './github.service';
import archiver from 'archiver';
import path from 'path';

export class ProjectController {
  private projectService: ProjectService;
  private githubService: GithubDeploymentService;

  constructor() {
    this.projectService = new ProjectService();
    this.githubService = new GithubDeploymentService();
  }

  generate = async (req: Request, res: Response) => {
    try {
      const { projectName, modules, templates, backends } = req.body;

      if (!projectName || !modules || !Array.isArray(modules)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Project name and modules array are required'
        });
      }

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`);

      // Create archive
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      // Handle errors
      archive.on('error', (err) => {
        throw err;
      });

      // Pipe archive to response
      archive.pipe(res);

      // Generate project files with template and backend selections
      await this.projectService.generateProject(
        archive, 
        projectName, 
        modules,
        templates || {},
        backends || {}
      );

      // Finalize archive
      await archive.finalize();

    } catch (error: any) {
      console.error('Generation error:', error);
      
      // If headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          data: null,
          error: error.message || 'Project generation failed'
        });
      }
    }
  };
  deployGithub = async (req: Request, res: Response) => {
    try {
      const { projectName, modules, templates, backends, githubRepo, githubToken } = req.body;

      if (!projectName || !modules || !githubRepo || !githubToken) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required fields'
        });
      }

      const result = await this.githubService.deployToGithub(
        projectName,
        modules,
        templates || {},
        backends || {},
        githubRepo,
        githubToken
      );

      res.status(200).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error: any) {
      console.error('GitHub deployment error:', error);
      res.status(500).json({
        success: false,
        data: null,
        error: error.message || 'Failed to deploy to GitHub'
      });
    }
  };}
