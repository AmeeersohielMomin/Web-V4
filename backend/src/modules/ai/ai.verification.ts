// backend/src/modules/ai/ai.verification.ts

import { validateGeneratedFiles } from './ai.validators';

export interface VerificationReport {
  passed: boolean;
  criticalFailures: string[];
  warnings: string[];
  checks: Array<{ name: string; passed: boolean; details?: string }>;
}

export async function verifyGeneratedProject(
  files: Array<{ path: string; content: string }>
): Promise<VerificationReport> {
  // NOTE:
  // Start with structural + static checks (fast), then expand to isolated build checks.
  // This function must return passed=false if any critical check fails.
  const criticalFailures: string[] = [];
  const warnings: string[] = [];
  const checks: Array<{ name: string; passed: boolean; details?: string }> = [];

  const hasBackendServer = files.some(f => f.path.includes('backend/src/server.ts'));
  checks.push({ name: 'backend-server-file', passed: hasBackendServer });
  if (!hasBackendServer) criticalFailures.push('Missing backend/src/server.ts');

  const hasFrontendApp = files.some(f => f.path.includes('frontend/pages/_app.tsx'));
  checks.push({ name: 'frontend-app-shell', passed: hasFrontendApp });
  if (!hasFrontendApp) criticalFailures.push('Missing frontend/pages/_app.tsx');

  const hasAnyModuleRoutes = files.some(f => /backend\/src\/modules\/.+\.routes\.ts$/.test(f.path.replace(/\\/g, '/')));
  checks.push({ name: 'module-routes-present', passed: hasAnyModuleRoutes });
  if (!hasAnyModuleRoutes) criticalFailures.push('No backend module routes generated');

  const structural = validateGeneratedFiles(files);
  const hasNoCriticalValidationIssues = structural.critical.length === 0;
  checks.push({
      name: 'structural-validation-criticals',
      passed: hasNoCriticalValidationIssues,
      details: hasNoCriticalValidationIssues ? undefined : structural.critical.slice(0, 3).join(' | '),
  });

  if (!hasNoCriticalValidationIssues) {
      criticalFailures.push(...structural.critical.slice(0, 10));
  }
  if (structural.warnings.length > 0) {
      warnings.push(...structural.warnings.slice(0, 10));
  }

  return {
    passed: criticalFailures.length === 0,
    criticalFailures,
    warnings,
    checks,
  };
}
