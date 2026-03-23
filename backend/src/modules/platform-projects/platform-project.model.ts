import mongoose from 'mongoose';

const generatedFileSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    content: { type: String, required: true },
    language: { type: String }
  },
  { _id: false }
);

const chatEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['generate', 'refine'],
      required: true
    },
    prompt: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const versionSnapshotSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true },
    label: { type: String, default: '' },
    prompt: { type: String, default: '' },
    files: [generatedFileSchema],
    fileCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const platformProjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformUser',
      required: true,
      index: true
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
      index: true
    },
    name: { type: String, required: true },
    description: { type: String },
    modules: [String],
    template: { type: String },
    backend: { type: String },
    provider: { type: String },
    status: {
      type: String,
      enum: ['generating', 'complete', 'failed'],
      default: 'generating'
    },
    chatHistory: [chatEntrySchema],
    files: [generatedFileSchema],
    fileCount: { type: Number, default: 0 },
    versions: [versionSnapshotSchema],
    currentVersion: { type: Number, default: 1 },
    tags: [String],
    isPublic: { type: Boolean, default: false },
    designSeed: { type: String },
    deployUrl: { type: String },
    githubUrl: { type: String },
    vercelDeployUrl: { type: String },
    vercelDeployId: { type: String },
    githubRepoUrl: { type: String },
    githubRepoName: { type: String },
    railwayServiceUrl: { type: String },
    railwayServiceId: { type: String },
    railwayProjectId: { type: String },
    lastDeployedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

export const PlatformProject = mongoose.model(
  'PlatformProject',
  platformProjectSchema
);
