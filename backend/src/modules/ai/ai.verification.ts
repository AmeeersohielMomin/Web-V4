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
    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const checks: Array<{ name: string; passed: boolean; details?: string }> = [];
    const normalizedPaths = files.map((f) => String(f.path || '').replace(/\\/g, '/'));

    const hasBackendServer = normalizedPaths.some((p) => /(^|\/)backend\/src\/server\.ts$/i.test(p));
    checks.push({ name: 'backend-server-file', passed: hasBackendServer });
    if (!hasBackendServer) criticalFailures.push('Missing backend/src/server.ts');

    const hasFrontendApp = normalizedPaths.some((p) => /(^|\/)frontend\/pages\/_app\.tsx$/i.test(p));
    checks.push({ name: 'frontend-app-shell', passed: hasFrontendApp });
    if (!hasFrontendApp) criticalFailures.push('Missing frontend/pages/_app.tsx');

    const hasAnyModuleRoutes = normalizedPaths.some((p) => /backend\/src\/modules\/.+\.routes\.ts$/.test(p));
    checks.push({ name: 'module-routes-present', passed: hasAnyModuleRoutes });
    if (!hasAnyModuleRoutes) criticalFailures.push('No backend module routes generated');

    const hasLanding = normalizedPaths.some((p) => /(^|\/)frontend\/pages\/index\.tsx$/i.test(p));
    checks.push({ name: 'landing-page-present', passed: hasLanding });
    if (!hasLanding) warnings.push('Missing frontend/pages/index.tsx');

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

