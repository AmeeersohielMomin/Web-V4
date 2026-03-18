import { Request, Response, NextFunction } from 'express';
import { platformAuthService } from '../modules/platform-auth/platform-auth.service';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ success: false, data: null, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = platformAuthService.verifyToken(token);
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, data: null, error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = platformAuthService.verifyToken(token);
      (req as any).userId = decoded.userId;
      (req as any).userEmail = decoded.email;
    }
  } catch {
    // Optional auth intentionally ignores invalid tokens.
  }

  next();
}
