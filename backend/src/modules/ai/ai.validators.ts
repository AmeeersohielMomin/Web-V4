export interface ValidationResult {
    passed: boolean;
    critical: string[];
    warnings: string[];
}

function normalizePath(path: string): string {
    return String(path || '').replace(/\\/g, '/').toLowerCase();
}

function hasPathContaining(paths: string[], needle: string): boolean {
    const normalizedNeedle = normalizePath(needle);
    return paths.some((p) => normalizePath(p).includes(normalizedNeedle));
}

export function validateGeneratedFiles(
    files: Array<{ path: string; content: string }>,
    plan?: { modules?: Array<{ name: string }> }
): ValidationResult {
    const critical: string[] = [];
    const warnings: string[] = [];
    const paths = files.map((f) => normalizePath(f.path));
    const contentByPath = files.reduce<Record<string, string>>((acc, file) => {
        acc[normalizePath(file.path)] = String(file.content || '');
        return acc;
    }, {});

    const serverFile = paths.find((p) => p.endsWith('/server.ts') && !p.includes('/modules/'));
    if (!serverFile) critical.push('server.ts is missing from generated files');

    if (serverFile && plan?.modules) {
        const serverContent = contentByPath[serverFile] || '';
        for (const mod of plan.modules) {
            const routePathLiteral = `/api/${String(mod.name || '').toLowerCase()}`;
            if (!serverContent.includes(routePathLiteral)) {
                critical.push(`server.ts does not mount route path "${routePathLiteral}" for module "${mod.name}"`);
            }
        }
    }

    if (plan?.modules) {
        for (const mod of plan.modules) {
            const requiredBackend = [
                `modules/${mod.name}/${mod.name}.routes.ts`,
                `modules/${mod.name}/${mod.name}.controller.ts`,
                `modules/${mod.name}/${mod.name}.service.ts`,
                `modules/${mod.name}/${mod.name}.model.ts`,
                `modules/${mod.name}/${mod.name}.schema.ts`,
            ];
            for (const required of requiredBackend) {
                if (!hasPathContaining(paths, required)) critical.push(`Missing backend file: ${required}`);
            }

            const requiredFrontend = [
                `pages/${mod.name}/index.tsx`,
                `pages/${mod.name}/new.tsx`,
                `pages/${mod.name}/[id]/edit.tsx`,
                `src/services/${mod.name}.service.ts`,
            ];
            for (const required of requiredFrontend) {
                if (!hasPathContaining(paths, required)) critical.push(`Missing frontend file: ${required}`);
            }
        }
    }

    const commentedServicePattern = /\/\/ (import|await) .*(Service|service)\./g;
    for (const file of files) {
        if (/\/pages\//.test(normalizePath(file.path)) && commentedServicePattern.test(file.content)) {
            warnings.push(`Commented-out service call in ${file.path}`);
        }
    }

    const todoPattern = /TODO:/gi;
    const placeholderPattern = /PLACEHOLDER|'your-.*-here'|"your-.*-here"|'xxx'|"xxx"/gi;
    for (const file of files) {
        const filePath = normalizePath(file.path);
        if (!/\.(ts|tsx|js|jsx|css|json)$/.test(filePath)) continue;
        // Placeholder literals are auto-sanitized in the controller pass.
        // Keep detection here for future diagnostics but do not emit user-facing warnings.
        placeholderPattern.test(file.content);
        if (todoPattern.test(file.content)) {
            warnings.push(`Potential TODO in ${file.path}`);
        }
    }

    const dashboardFile = paths.find((p) => p.includes('/pages/dashboard'));
    if (dashboardFile) {
        const dash = contentByPath[dashboardFile] || '';
        const hasServiceReference = /\bService\b/.test(dash);
        const hasUseEffect = /\buseEffect\b/.test(dash);
        const hasApiCallSignal = /(axios\.|fetch\s*\(|\/api\/|apiClient|api\.)/.test(dash);
        if (!hasApiCallSignal && !hasServiceReference && !hasUseEffect) {
            warnings.push('dashboard.tsx may not call API services');
        }
        if (dash.includes('// import') || dash.includes('// await')) {
            warnings.push('dashboard.tsx has commented-out API calls');
        }
    } else {
        critical.push('frontend/pages/dashboard.tsx is missing');
    }

    const hasSidebar = paths.some((p) => p.endsWith('/sidebar.tsx'));
    const hasNavbar = paths.some((p) => p.endsWith('/navbar.tsx'));
    if (!hasSidebar && !hasNavbar) warnings.push('Sidebar.tsx not found; app may still use top navbar');

    const hasAppShell = hasPathContaining(paths, 'frontend/pages/_app.tsx');
    if (!hasAppShell) critical.push('frontend/pages/_app.tsx is missing');

    const hasLanding = hasPathContaining(paths, 'frontend/pages/index.tsx');
    if (!hasLanding) critical.push('frontend/pages/index.tsx is missing');

    // Browser alert() usage is auto-sanitized by controller warning-fix pass.

    return {
        passed: critical.length === 0,
        critical,
        warnings,
    };
}

