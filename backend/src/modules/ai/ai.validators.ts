// backend/src/modules/ai/ai.validators.ts
// Validates structural correctness of generated file sets.
// Catches missing route mounts, missing services, broken imports.

export interface ValidationResult {
  passed: boolean;
  critical: string[];
  warnings: string[];
}

/**
 * Validates a set of generated files for structural correctness.
 * Does NOT run a real compiler — uses fast static analysis.
 */
export function validateGeneratedFiles(
  files: Array<{ path: string; content: string }>,
  plan?: { modules?: Array<{ name: string }> }
): ValidationResult {
  const critical: string[] = [];
  const warnings: string[] = [];

  const paths    = files.map(f => f.path);
  const contents = files.reduce((acc, f) => ({ ...acc, [f.path]: f.content }), {} as Record<string, string>);

  // ── Check 1: server.ts exists ─────────────────────────────────────────
  const serverFile = paths.find(p => p.includes('server.ts') && !p.includes('modules'));
  if (!serverFile) {
    critical.push('server.ts is missing from generated files');
  }

  // ── Check 2: server.ts registers all module routes ────────────────────
  if (serverFile && plan?.modules) {
    const serverContent = contents[serverFile] || '';
    for (const mod of plan.modules) {
      const routeVarName = `${mod.name}Routes`;
      if (!serverContent.includes(routeVarName)) {
        critical.push(`server.ts does not register "${routeVarName}" for module "${mod.name}"`);
      }
    }
  }

  // ── Check 3: All planned modules have their 5 backend files ───────────
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
        if (!paths.some(p => p.includes(required))) {
          critical.push(`Missing backend file: ${required}`);
        }
      }

      // Frontend files
      const requiredFrontend = [
        `pages/${mod.name}/index.tsx`,
        `pages/${mod.name}/new.tsx`,
        `src/services/${mod.name}.service.ts`,
      ];
      for (const required of requiredFrontend) {
        if (!paths.some(p => p.includes(required))) {
          warnings.push(`Missing frontend file: ${required}`);
        }
      }
    }
  }

  // ── Check 4: No commented-out service calls ───────────────────────────
  const commentedServicePattern = /\/\/ (import|await) .*(Service|service)\./g;
  for (const file of files) {
    if (file.path.includes('pages/') && commentedServicePattern.test(file.content)) {
      warnings.push(`Commented-out service call in ${file.path} — API may not be called`);
    }
  }

  // ── Check 5: No TODO or placeholder literals ──────────────────────────
  const todoPattern = /TODO:|PLACEHOLDER|'your-.*-here'|"your-.*-here"|'xxx'|"xxx"/gi;
  for (const file of files) {
    if (todoPattern.test(file.content)) {
      warnings.push(`Potential placeholder/TODO in ${file.path}`);
    }
  }

  // ── Check 6: dashboard.tsx calls real APIs ────────────────────────────
  const dashboardFile = paths.find(p => p.includes('pages/dashboard'));
  if (dashboardFile) {
    const dash = contents[dashboardFile] || '';
    if (!dash.includes('Service') || !dash.includes('useEffect')) {
      warnings.push('dashboard.tsx may not call any API services');
    }
    if (dash.includes('// import') || dash.includes('// await')) {
      critical.push('dashboard.tsx has commented-out API calls — dashboard shows no real data');
    }
  }

  // ── Check 7: Sidebar.tsx or Navbar.tsx exists ─────────────────────────
  const hasSidebar = paths.some(p => p.includes('Sidebar.tsx') || p.includes('sidebar.tsx'));
  if (!hasSidebar) {
    warnings.push('Sidebar.tsx not found — app may use top navbar instead of sidebar');
  }

  // ── Check 8: Alert() usage (should use toast instead) ─────────────────
  for (const file of files) {
    if (file.path.includes('pages/') && /[^a-z]alert\s*\(/.test(file.content)) {
      warnings.push(`browser alert() found in ${file.path} — should use toast notifications`);
    }
  }

  return {
    passed:   critical.length === 0,
    critical,
    warnings,
  };
}
