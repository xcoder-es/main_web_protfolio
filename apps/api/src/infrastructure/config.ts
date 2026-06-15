import { parsePrivateRuntimeConfig } from '@carlos-pinto/config/private-runtime';

export type ApiRuntimeConfig = {
  environment: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  trustProxy: boolean;
  allowedOrigins: readonly string[];
  bodyLimit: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  features: {
    persistence: boolean;
    identity: boolean;
    notifications: boolean;
    payments: boolean;
    spamVerification: boolean;
  };
  notification?: {
    recipientAddress: string;
    fromAddress: string;
    resendApiKey?: string;
    resendBaseUrl: string;
  };
};

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid boolean configuration value: ${value}`);
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function origins(value: string | undefined, environment: ApiRuntimeConfig['environment']): string[] {
  const configured = (value ?? 'http://localhost:4321')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const origin of configured) {
    if (origin === '*') throw new Error('CORS_ORIGINS cannot contain a wildcard');
    new URL(origin);
  }

  if (environment === 'production' && configured.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  return configured;
}

function optionalNotificationConfig(env: Record<string, string | undefined>) {
  const recipientAddress = env.NOTIFICATION_RECIPIENT_EMAIL?.trim() ?? '';
  const fromAddress = env.RESEND_FROM_EMAIL?.trim() ?? '';
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const resendBaseUrl = env.RESEND_BASE_URL?.trim() || 'https://api.resend.com';
  new URL(resendBaseUrl);

  if (!recipientAddress && !fromAddress && !resendApiKey) return undefined;
  return {
    recipientAddress,
    fromAddress,
    ...(resendApiKey ? { resendApiKey } : {}),
    resendBaseUrl,
  };
}

export function loadApiRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): ApiRuntimeConfig {
  const environment = env.NODE_ENV ?? 'development';
  const base = parsePrivateRuntimeConfig({
    environment,
    host: env.HOST ?? '0.0.0.0',
    port: env.PORT ?? '3000',
    features: {
      persistence: booleanValue(env.PERSISTENCE_ENABLED, false),
      identity: booleanValue(env.IDENTITY_ENABLED, false),
      notifications: booleanValue(env.NOTIFICATIONS_ENABLED, false),
      payments: booleanValue(env.PAYMENTS_ENABLED, false),
      spamVerification: booleanValue(env.SPAM_VERIFICATION_ENABLED, false),
    },
  });

  const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
  const logLevel = env.LOG_LEVEL ?? (base.environment === 'production' ? 'info' : 'debug');
  if (!logLevels.includes(logLevel as (typeof logLevels)[number])) {
    throw new Error(`Invalid LOG_LEVEL: ${logLevel}`);
  }

  const notification = optionalNotificationConfig(env);
  return {
    ...base,
    logLevel: logLevel as ApiRuntimeConfig['logLevel'],
    trustProxy: booleanValue(env.TRUST_PROXY, base.environment === 'production'),
    allowedOrigins: origins(env.CORS_ORIGINS, base.environment),
    bodyLimit: positiveInteger(env.BODY_LIMIT_BYTES, 64 * 1024, 'BODY_LIMIT_BYTES'),
    rateLimitMax: positiveInteger(env.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX'),
    rateLimitWindowMs: positiveInteger(env.RATE_LIMIT_WINDOW_MS, 60_000, 'RATE_LIMIT_WINDOW_MS'),
    ...(notification ? { notification } : {}),
  };
}
