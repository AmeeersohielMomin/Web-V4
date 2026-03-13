export interface ModuleConfig {
  name: string;
  enabled: boolean;
  routes?: any;
}

// Parse enabled modules from environment
const enabledModulesEnv = process.env.ENABLED_MODULES || '';
const enabledModulesList = enabledModulesEnv
  .split(',')
  .map(m => m.trim())
  .filter(m => m.length > 0);

export const modules: Record<string, ModuleConfig> = {
  auth: {
    name: 'auth',
    enabled: enabledModulesList.includes('auth')
  },
  project: {
    name: 'project',
    enabled: true // Always enabled for project generation
  },
  ai: {
    name: 'ai',
    enabled: true // Always enabled — core platform feature
  }
};

export function getEnabledModules(): ModuleConfig[] {
  return Object.values(modules).filter(m => m.enabled);
}

export function isModuleEnabled(moduleName: string): boolean {
  return modules[moduleName]?.enabled || false;
}
