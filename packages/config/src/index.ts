export type RuntimeEnvironment = 'development' | 'test' | 'production';

export type FeatureState = {
  enabled: boolean;
  reason?: string;
};
