import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { PlatformUser } from './platform-user.model';

export class PlatformAuthService {
  async register(email: string, password: string, name?: string, inviteToken?: string) {
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

    if (inviteToken) {
      const { teamService } = await import('../teams/team.service');
      await teamService.acceptInvite(user._id.toString(), inviteToken);
    }

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

    await PlatformUser.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

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
    const user = await PlatformUser.findById(userId).select('-passwordHash -resetPasswordToken');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // ─── Profile Management ────────────────────────────────────────
  async updateProfile(userId: string, data: { name?: string; avatar?: string }) {
    const updates: Record<string, any> = {};
    if (typeof data.name === 'string') updates.name = data.name.trim();
    if (typeof data.avatar === 'string') updates.avatar = data.avatar.trim();

    if (Object.keys(updates).length === 0) {
      throw new Error('No changes provided');
    }

    const user = await PlatformUser.findByIdAndUpdate(userId, updates, { new: true })
      .select('-passwordHash -resetPasswordToken');
    if (!user) throw new Error('User not found');
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await PlatformUser.findById(userId);
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await PlatformUser.findByIdAndUpdate(userId, { passwordHash });
    return { success: true };
  }

  // ─── Forgot / Reset Password ────────────────────────────────────
  async generateResetToken(email: string) {
    const user = await PlatformUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await PlatformUser.findByIdAndUpdate(user._id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires
    });

    // In production: send email via SendGrid/Nodemailer
    // For now, log to console in dev
    const resetUrl = `${process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:3000'}/reset-password?token=${token}`;
    console.log(`[Password Reset] For ${email}: ${resetUrl}`);

    return { message: 'If that email exists, a reset link has been sent.', token: process.env.NODE_ENV !== 'production' ? token : undefined };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await PlatformUser.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) throw new Error('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await PlatformUser.findByIdAndUpdate(user._id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    return { success: true };
  }

  // ─── API Key Management ─────────────────────────────────────────
  async saveApiKey(userId: string, provider: string, key: string) {
    const user = await PlatformUser.findById(userId);
    if (!user) throw new Error('User not found');

    // Remove existing key for this provider, then add the new one
    await PlatformUser.findByIdAndUpdate(userId, {
      $pull: { apiKeys: { provider } }
    });
    await PlatformUser.findByIdAndUpdate(userId, {
      $push: { apiKeys: { provider, key } }
    });
    return { provider, saved: true };
  }

  async removeApiKey(userId: string, provider: string) {
    await PlatformUser.findByIdAndUpdate(userId, {
      $pull: { apiKeys: { provider } }
    });
    return { provider, removed: true };
  }

  // ─── Admin ───────────────────────────────────────────────────────
  async getAdminStats() {
    const [totalUsers, totalProjects, planBreakdown] = await Promise.all([
      PlatformUser.countDocuments(),
      (await import('../platform-projects/platform-project.model')).PlatformProject.countDocuments(),
      PlatformUser.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } }
      ])
    ]);

    const totalGenerations = await PlatformUser.aggregate([
      { $group: { _id: null, total: { $sum: '$generationsUsed' } } }
    ]);

    return {
      totalUsers,
      totalProjects,
      totalGenerations: totalGenerations[0]?.total || 0,
      planBreakdown: planBreakdown.reduce((acc: any, p: any) => {
        acc[p._id || 'free'] = p.count;
        return acc;
      }, {})
    };
  }

  async listAllUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      PlatformUser.find()
        .select('email name plan role generationsUsed generationsLimit createdAt lastLoginAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PlatformUser.countDocuments()
    ]);
    return { users, total, page, limit };
  }

  // ─── Generation Quota ────────────────────────────────────────────
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
