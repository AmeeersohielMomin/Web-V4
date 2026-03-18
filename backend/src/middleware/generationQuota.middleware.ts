import { Request, Response, NextFunction } from 'express';
import { platformAuthService } from '../modules/platform-auth/platform-auth.service';

export async function checkGenerationQuota(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req as any).userId as string | undefined;

  if (!userId) {
    return next();
  }

  const allowed = await platformAuthService.checkGenerationLimit(userId);
  if (!allowed) {
    return res.status(403).json({
      success: false,
      data: null,
      error:
        'You have reached your generation limit. Upgrade your plan to generate more apps.'
    });
  }

  return next();
}
