export interface FeatureConfig {
  name: string;
  enabled: boolean;
}

export const FEATURES: Record<string, boolean> = {
  auth: true
};

export function isFeatureEnabled(featureName: string): boolean {
  return FEATURES[featureName] === true;
}
