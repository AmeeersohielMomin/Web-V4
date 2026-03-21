import { Request } from 'express';
import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    data: null,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const generationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 500 : 10,
  skip: () => isDev,
  message: {
    success: false,
    data: null,
    error:
      'Generation rate limit reached. Please wait before generating again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const requirementsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 60,
  skip: (req: Request) => {
    if (isDev) return true;
    // Skip if user provides own key or uses local Ollama
    return !!(req.body?.apiKey?.trim()) || req.body?.provider === 'ollama';
  },
  message: {
    success: false,
    data: null,
    error: 'Too many requirements requests. Please wait a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    data: null,
    error: 'Too many auth attempts. Please try again in 15 minutes.'
  }
});
