import { Request, Response } from 'express';
import { platformProjectsService } from './platform-projects.service';

export class PlatformProjectsController {
  list = async (req: Request, res: Response) => {
    try {
      const projects = await platformProjectsService.listUserProjects(
        (req as any).userId
      );
      res.json({ success: true, data: { projects }, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const project = await platformProjectsService.getProject(
        req.params.id,
        (req as any).userId
      );
      res.json({ success: true, data: { project }, error: null });
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };

  download = async (req: Request, res: Response) => {
    try {
      await platformProjectsService.streamZipDownload(
        req.params.id,
        (req as any).userId,
        res
      );
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await platformProjectsService.deleteProject(req.params.id, (req as any).userId);
      res.json({ success: true, data: null, error: null });
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };

  // ─── Version History ──────────────────────────────────────────
  getVersionHistory = async (req: Request, res: Response) => {
    try {
      const result = await platformProjectsService.getVersionHistory(
        req.params.id,
        (req as any).userId
      );
      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };

  restoreVersion = async (req: Request, res: Response) => {
    try {
      const { versionNumber } = req.body;
      const project = await platformProjectsService.restoreVersion(
        req.params.id,
        (req as any).userId,
        versionNumber
      );
      res.json({ success: true, data: { project }, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  // ─── Template Gallery ─────────────────────────────────────────
  listTemplates = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || undefined;
      const result = await platformProjectsService.listPublicTemplates(page, limit, search);
      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  togglePublic = async (req: Request, res: Response) => {
    try {
      const { isPublic } = req.body;
      const result = await platformProjectsService.togglePublic(
        req.params.id,
        (req as any).userId,
        !!isPublic
      );
      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  cloneTemplate = async (req: Request, res: Response) => {
    try {
      const { newName } = req.body;
      const project = await platformProjectsService.cloneTemplate(
        req.params.templateId,
        (req as any).userId,
        newName
      );
      res.json({ success: true, data: { project }, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };
}

export const platformProjectsController = new PlatformProjectsController();
