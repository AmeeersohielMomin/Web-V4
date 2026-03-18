import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { platformAuthService } from './platform-auth.service';
import { registerSchema, loginSchema } from './platform-auth.schema';

export class PlatformAuthController {
  register = async (req: Request, res: Response) => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await platformAuthService.register(
        input.email,
        input.password,
        input.name
      );
      res.status(201).json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await platformAuthService.login(input.email, input.password);
      res.status(200).json({ success: true, data: result, error: null });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ success: false, data: null, error: err.issues[0]?.message || 'Invalid request' });
      }
      res.status(401).json({ success: false, data: null, error: err.message });
    }
  };

  me = async (req: Request, res: Response) => {
    try {
      const user = await platformAuthService.getMe((req as any).userId);
      res.json({ success: true, data: { user }, error: null });
    } catch (err: any) {
      res.status(404).json({ success: false, data: null, error: err.message });
    }
  };
}

export const platformAuthController = new PlatformAuthController();
