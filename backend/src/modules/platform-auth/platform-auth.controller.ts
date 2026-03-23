import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { platformAuthService } from './platform-auth.service';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  saveApiKeySchema
} from './platform-auth.schema';

export class PlatformAuthController {
  register = async (req: Request, res: Response) => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await platformAuthService.register(
        input.email,
        input.password,
        input.name,
        input.inviteToken
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

  updateProfile = async (req: Request, res: Response) => {
    try {
      const input = updateProfileSchema.parse(req.body);
      const user = await platformAuthService.updateProfile((req as any).userId, input);
      res.json({ success: true, data: { user }, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      const input = changePasswordSchema.parse(req.body);
      await platformAuthService.changePassword(
        (req as any).userId,
        input.currentPassword,
        input.newPassword
      );
      res.json({ success: true, data: { message: 'Password changed successfully' }, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const input = forgotPasswordSchema.parse(req.body);
      const result = await platformAuthService.generateResetToken(input.email);
      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await platformAuthService.resetPassword(input.token, input.newPassword);
      res.json({ success: true, data: { message: 'Password has been reset' }, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  saveApiKey = async (req: Request, res: Response) => {
    try {
      const input = saveApiKeySchema.parse(req.body);
      const result = await platformAuthService.saveApiKey(
        (req as any).userId,
        input.provider,
        input.key
      );
      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  removeApiKey = async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      await platformAuthService.removeApiKey((req as any).userId, provider);
      res.json({ success: true, data: { provider, removed: true }, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  // ─── Admin ───────────────────────────────────────────────────────
  getAdminStats = async (req: Request, res: Response) => {
    try {
      const stats = await platformAuthService.getAdminStats();
      res.json({ success: true, data: stats, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  listUsers = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await platformAuthService.listAllUsers(page, limit);
      res.json({ success: true, data: result, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };
}

export const platformAuthController = new PlatformAuthController();
