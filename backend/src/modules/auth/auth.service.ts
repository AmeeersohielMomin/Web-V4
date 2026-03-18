import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { User } from './auth.model';
import { SignupInput, LoginInput } from './auth.schema';

export class AuthService {
  private saltRounds: number;
  private jwtSecret: string;
  private jwtExpiresIn: SignOptions['expiresIn'];

  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  }

  async signup(input: SignupInput) {
    // Check if user already exists
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, this.saltRounds);

    // Create user
    const user = await User.create({
      email: input.email,
      password: hashedPassword
    });

    // Generate JWT
    const signOptions: SignOptions = { expiresIn: this.jwtExpiresIn };
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      this.jwtSecret,
      signOptions
    );

    return {
      user: {
        id: user._id.toString(),
        email: user.email
      },
      token
    };
  }

  async login(input: LoginInput) {
    // Find user
    const user = await User.findOne({ email: input.email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const signOptions: SignOptions = { expiresIn: this.jwtExpiresIn };
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      this.jwtSecret,
      signOptions
    );

    return {
      user: {
        id: user._id.toString(),
        email: user.email
      },
      token
    };
  }

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        userId: string;
        email: string;
      };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getUserById(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id.toString(),
      email: user.email
    };
  }
}
