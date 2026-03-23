import { Request, Response, NextFunction } from 'express';

export async function checkGenerationQuota(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Temporarily allow unlimited generations for all authenticated users.
  return next();
}
