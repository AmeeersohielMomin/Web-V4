import mongoose from 'mongoose';

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
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
  },
  {
    timestamps: true
  }
);

export const PlatformUser = mongoose.model('PlatformUser', platformUserSchema);
