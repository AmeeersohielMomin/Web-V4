import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['openai', 'github', 'gemini', 'anthropic', 'ollama'], required: true },
    key: { type: String, required: true }
  },
  { _id: false }
);

const platformUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'team'],
      default: 'free'
    },
    generationsUsed: {
      type: Number,
      default: 0
    },
    generationsLimit: {
      type: Number,
      default: 3
    },
    apiKeys: [apiKeySchema],
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    githubAccessToken: String,
    googleId: String,
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },
    teamRole: {
      type: String,
      enum: ['owner', 'editor', 'viewer', null],
      default: null
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    lastLoginAt: Date
  },
  {
    timestamps: true
  }
);

export const PlatformUser = mongoose.model('PlatformUser', platformUserSchema);
