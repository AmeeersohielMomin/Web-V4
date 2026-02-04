import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import bcrypt from 'bcrypt';
import mongoose, { Schema, Document } from 'mongoose';

// User interface
interface IUser extends Document {
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }
}, {
  timestamps: true
});

const User = mongoose.model<IUser>('User', UserSchema);

// Redis client for session storage
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  legacyMode: true
});

redisClient.connect().catch(console.error);

// Session middleware configuration
export const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient as any }),
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
});

// Extend Express Request to include session user
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    email?: string;
  }
}

export class AuthService {
  async signup(email: string, password: string) {
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email
      }
    };
  }

  async login(email: string, password: string, req: express.Request) {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Create session
    req.session.userId = user._id.toString();
    req.session.email = user.email;

    return {
      user: {
        id: user._id.toString(),
        email: user.email
      }
    };
  }

  async logout(req: express.Request) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(new Error('Failed to logout'));
        } else {
          resolve({ message: 'Logged out successfully' });
        }
      });
    });
  }

  async getUserById(userId: string) {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt
    };
  }

  verifySession(req: express.Request) {
    if (!req.session.userId) {
      throw new Error('Not authenticated');
    }
    return {
      userId: req.session.userId,
      email: req.session.email
    };
  }
}
