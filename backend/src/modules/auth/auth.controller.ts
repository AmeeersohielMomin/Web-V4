import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { signupSchema, loginSchema } from './auth.schema';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  signup = async (req: Request, res: Response) => {
    try {
      // Validate input
      const validatedData = signupSchema.parse(req.body);

      // Process signup
      const result = await this.authService.signup(validatedData);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        },
        error: null
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        data: null,
        error: error.message || 'Signup failed'
      });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      // Validate input
      const validatedData = loginSchema.parse(req.body);

      // Process login
      const result = await this.authService.login(validatedData);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        },
        error: null
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        data: null,
        error: error.message || 'Login failed'
      });
    }
  };

  me = async (req: Request, res: Response) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
      }

      const token = authHeader.substring(7);

      // Verify token
      const decoded = await this.authService.verifyToken(token);

      // Get user
      const user = await this.authService.getUserById(decoded.userId);

      res.status(200).json({
        success: true,
        data: {
          user
        },
        error: null
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        data: null,
        error: error.message || 'Authentication failed'
      });
    }
  };
}
