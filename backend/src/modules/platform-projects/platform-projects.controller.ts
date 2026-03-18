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
}

export const platformProjectsController = new PlatformProjectsController();
