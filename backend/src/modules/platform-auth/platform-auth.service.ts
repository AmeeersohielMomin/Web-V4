import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PlatformUser } from './platform-user.model';

export class PlatformAuthService {
  async register(email: string, password: string, name?: string) {
    const existing = await PlatformUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await PlatformUser.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name || ''
    });

    const token = this.signToken(user._id.toString(), user.email);
    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan
      },
      token
    };
  }

  async login(email: string, password: string) {
    const user = await PlatformUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const token = this.signToken(user._id.toString(), user.email);
    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        generationsUsed: user.generationsUsed,
        generationsLimit: user.generationsLimit
      },
      token
    };
  }

  async getMe(userId: string) {
    const user = await PlatformUser.findById(userId).select('-passwordHash');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async checkGenerationLimit(userId: string): Promise<boolean> {
    const user = await PlatformUser.findById(userId);
    if (!user) {
      return false;
    }

    if (user.generationsLimit === -1) {
      return true;
    }

    return user.generationsUsed < user.generationsLimit;
  }

  async incrementGenerationCount(userId: string): Promise<void> {
    await PlatformUser.findByIdAndUpdate(userId, { $inc: { generationsUsed: 1 } });
  }

  verifyToken(token: string): { userId: string; email: string } {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    return { userId: decoded.userId, email: decoded.email };
  }

  private signToken(userId: string, email: string): string {
    const options: SignOptions = { expiresIn: '7d' };
    return jwt.sign({ userId, email }, process.env.JWT_SECRET as string, options);
  }
}

export const platformAuthService = new PlatformAuthService();
