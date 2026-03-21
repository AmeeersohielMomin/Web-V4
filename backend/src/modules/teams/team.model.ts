import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformUser',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'editor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const teamInviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'editor'
    },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformUser',
      required: true
    },
    members: [teamMemberSchema],
    invites: [teamInviteSchema],
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'team'],
      default: 'team'
    }
  },
  {
    timestamps: true
  }
);

export const Team = mongoose.model('Team', teamSchema);
