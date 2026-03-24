// backend/src/modules/ai/ai.types.ts
// Shared types for the requirements gathering system.
// Imported by ai.service.ts, ai.controller.ts, and ai.prompts.ts.

export interface RequirementsQuestion {
  id: string;
  question: string;
  hint?: string;
  category: 'features' | 'design' | 'users' | 'technical' | 'scope';
  required: boolean;
}

export interface RequirementsAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface RequirementsDocument {
  originalPrompt: string;
  projectName: string;
  appType: string;
  targetUsers: string;
  coreFeatures: string[];
  designPreference: string;
  themeMode: 'light' | 'dark' | 'hybrid' | 'any';
  scale: 'personal' | 'startup' | 'enterprise';
  techPreferences: string;
  additionalNotes: string;
  answers: RequirementsAnswer[];
  compiledSummary: string;
  _meta?: {
    source: 'ai' | 'fallback';
    provider: string;
    model: string;
    timestamp: string;
  };
}

export interface QuestionsResponse {
  appType: string;
  projectName: string;
  questions: RequirementsQuestion[];
}

export interface NonStreamingParams {
  provider: string;
  apiKey?: string;
  model?: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  forceJson?: boolean;
  timeoutMs?: number;
}
