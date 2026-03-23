// frontend/hooks/useRequirementsFlow.ts
// Custom hook that owns the full idle→questioning→answering→confirming state machine.
// Used by select-ai.tsx to keep that page clean.

import { useState } from 'react';
import api from '../lib/api';
import type {
  GenerationPhase,
  RequirementsQuestion,
  RequirementsAnswer,
  RequirementsDocument,
  QuestionsApiResponse
} from '../types/generation';

interface UseRequirementsFlowParams {
  selectedModules: string[];
  provider: string;
  apiKey?: string;
  model?: string;
}

interface UseRequirementsFlowReturn {
  phase: GenerationPhase;
  userIdea: string;
  setUserIdea: (v: string) => void;
  questions: RequirementsQuestion[];
  answers: Record<string, string>;
  setAnswer: (questionId: string, value: string) => void;
  requirements: RequirementsDocument | null;
  projectName: string;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  retryAfter: string | null;
  clearError: () => void;
  askQuestions: () => Promise<void>;
  compileRequirements: () => Promise<void>;
  resetToAnswering: () => void;
  skipToConfirm: () => void;
}

function normalizeModelForRequest(provider: string, model?: string): string | undefined {
  const p = String(provider || '').trim().toLowerCase();
  const m = String(model || '').trim();
  if (!m) return undefined;

  if (p === 'openai') {
    return m.replace(/^openai\//i, '');
  }

  if (p === 'github') {
    if (/^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(m)) return m;
    if (/^gpt-/i.test(m)) return `openai/${m}`;
  }

  return m;
}

function sanitizeProjectSlug(rawName: string, fallbackIdea = ''): string {
  const source = String(rawName || '').trim() || String(fallbackIdea || '').trim();
  if (!source) return 'untitled-project';

  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^i\s+want\s+to\s+build\s+/, '')
    .replace(/^i\s+want\s+build\s+/, '')
    .replace(/^want\s+to\s+build\s+/, '')
    .replace(/^want\s+build\s+/, '')
    .replace(/^i\s+need\s+to\s+build\s+/, '')
    .replace(/^i\s+need\s+build\s+/, '')
    .replace(/^need\s+to\s+build\s+/, '')
    .replace(/^need\s+build\s+/, '')
    .replace(/^build\s+(a|an|the)\s+/, '')
    .replace(/^create\s+(a|an|the)\s+/, '')
    .trim();

  const slug = normalized
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  return slug || 'untitled-project';
}

export function useRequirementsFlow(
  params: UseRequirementsFlowParams
): UseRequirementsFlowReturn {
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [userIdea, setUserIdea] = useState('');
  const [questions, setQuestions] = useState<RequirementsQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [requirements, setRequirements] = useState<RequirementsDocument | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [retryAfter, setRetryAfter] = useState<string | null>(null);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const clearError = () => {
    setError(null);
    setErrorStatus(null);
    setRetryAfter(null);
  };

  /**
   * Call POST /api/ai/requirements with the user's idea.
   * On success: transitions to 'answering' phase with questions populated.
   * On failure: returns to 'idle' with error message shown.
   */
  const askQuestions = async (): Promise<void> => {
    if (userIdea.trim().length < 10) {
      setError('Please describe your idea in a bit more detail - at least a sentence.');
      setErrorStatus(null);
      setRetryAfter(null);
      return;
    }
    setError(null);
    setErrorStatus(null);
    setRetryAfter(null);
    setPhase('questioning');
    setLoading(true);

    try {
      const { data } = await api.post('/api/ai/requirements', {
        userIdea: userIdea.trim(),
        selectedModules: params.selectedModules,
        provider: params.provider,
        apiKey: params.apiKey || undefined,
        model: normalizeModelForRequest(params.provider, params.model)
      });

      const result = data.data as QuestionsApiResponse;

      // Initialise answers map with empty strings
      const emptyAnswers: Record<string, string> = {};
      result.questions.forEach(q => { emptyAnswers[q.id] = ''; });

      setQuestions(result.questions);
      setProjectName(sanitizeProjectSlug(result.projectName, userIdea));
      setAnswers(emptyAnswers);
      setPhase('answering');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to generate questions. Please try again.';
      setError(msg);
      setErrorStatus(typeof err?.response?.status === 'number' ? err.response.status : null);
      setRetryAfter(
        err?.response?.headers?.['retry-after']
          ? String(err.response.headers['retry-after'])
          : null
      );
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate answers then call POST /api/ai/requirements/compile.
   * On success: transitions to 'confirming' phase with compiled requirements.
   * On failure: stays on 'answering' with error message shown.
   */
  const compileRequirements = async (): Promise<void> => {
    // Validate required questions
    const firstUnanswered = questions.find(
      q => q.required && !answers[q.id]?.trim()
    );
    if (firstUnanswered) {
      setError(`Please answer this question: "${firstUnanswered.question}"`);
      return;
    }

    setError(null);
    setLoading(true);

    const answersArray: RequirementsAnswer[] = questions.map(q => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id]?.trim() || '(skipped)'
    }));

    try {
      const { data } = await api.post('/api/ai/requirements/compile', {
        originalPrompt: userIdea.trim(),
        projectName,
        answers: answersArray,
        selectedModules: params.selectedModules,
        provider: params.provider,
        apiKey: params.apiKey || undefined,
        model: normalizeModelForRequest(params.provider, params.model)
      });

      setRequirements(data.data.requirements as RequirementsDocument);
      setPhase('confirming');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to compile requirements. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Go back from confirming to answering, preserving existing answers.
   */
  const resetToAnswering = (): void => {
    setPhase('answering');
    setRequirements(null);
    setError(null);
  };

  /**
   * Skip the questions entirely. Creates a minimal requirements document
   * from the raw idea alone and jumps straight to confirming.
   * Preserves V1 behaviour for power users.
   */
  const skipToConfirm = (): void => {
    const sanitizedProjectName = sanitizeProjectSlug(userIdea, userIdea);
    const minimal: RequirementsDocument = {
      originalPrompt: userIdea.trim(),
      projectName: sanitizedProjectName,
      appType: 'general',
      targetUsers: 'general users',
      coreFeatures: [],
      designPreference: 'professional and modern',
      themeMode: 'light',
      scale: 'personal',
      techPreferences: '',
      additionalNotes: '',
      answers: [],
      compiledSummary: `You're building: "${userIdea}". The AI will make sensible defaults for all choices.`
    };
    setRequirements(minimal);
    setPhase('confirming');
  };

  return {
    phase,
    userIdea, setUserIdea,
    questions,
    answers, setAnswer,
    requirements,
    projectName,
    loading,
    errorStatus,
    retryAfter,
    error, clearError,
    askQuestions,
    compileRequirements,
    resetToAnswering,
    skipToConfirm
  };
}
