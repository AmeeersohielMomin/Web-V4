// frontend/types/generation.ts
// Type definitions for the V2 requirements-gathering generation flow.

export type GenerationPhase =
  | 'idle'          // Prompt input shown, waiting for user to describe idea
  | 'questioning'   // API call in progress to generate questions
  | 'answering'     // Questions shown, user typing answers
  | 'confirming'    // Compiled summary shown, user reviewing
  | 'generating'    // SSE generation in progress
  | 'complete'      // Files received, preview rendered
  | 'error';        // Something failed

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

export interface QuestionsApiResponse {
  appType: string;
  projectName: string;
  questions: RequirementsQuestion[];
}
