// backend/src/utils/telemetry.ts
// Lightweight in-process counter telemetry.
// No external dependency - counters reset on server restart.

type TelemetryEvent =
  | 'requirements.question_gen.success'
  | 'requirements.question_gen.quota_exceeded'
  | 'requirements.question_gen.parse_failed'
  | 'requirements.question_gen.repaired'
  | 'requirements.compile.success'
  | 'requirements.compile.parse_failed'
  | 'requirements.compile.repaired'
  | 'generation.started'
  | 'generation.completed'
  | 'generation.quality_retry'
  | 'generation.failed'
  | 'generation.persisted'
  | 'generation.persist_failed';

const counters: Record<string, number> = {};

export function track(event: TelemetryEvent, meta?: Record<string, any>): void {
  counters[event] = (counters[event] || 0) + 1;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[telemetry] ${event}`, meta ? JSON.stringify(meta) : '');
  }
}

export function getCounters(): Record<string, number> {
  return { ...counters };
}

export function resetCounters(): void {
  Object.keys(counters).forEach((k) => delete counters[k]);
}
