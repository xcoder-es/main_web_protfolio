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
  identity?: {
    clerkSecretKey?: string;
    clerkPublishableKey?: string;
    clerkJwtKey?: string;
    authorizedParties: readonly string[];
    administratorUserIds: readonly string[];
    administratorEmails: readonly string[];
  };
  notification?: {
    recipientAddress: string;
    fromAddress: string;
    resendApiKey?: string;
    resendBaseUrl: string;
  };
  payment?: {
    mode: 'sandbox' | 'live';
    clientId?: string;
    clientSecret?: string;
    webhookId?: string;
    baseUrl: string;
  };
  spam?: {
    turnstileSecretKey?: string;
    allowedHostnames: readonly string[];
    siteverifyUrl: string;
    minimumCompletionMs: number;
    maximumCompletionMs: number;
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

function csvValues(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function origins(value: string | undefined, environment: ApiRuntimeConfig['environment']): string[] {
  const configured = csvValues(value ?? 'http://localhost:4321');

  for (const origin of configured) {
    if (origin === '*') throw new Error('CORS_ORIGINS cannot contain a wildcard');
    new URL(origin);
  }

  if (environment === 'production' && configured.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  return configured;
}

function optionalIdentityConfig(env: Record<string, string | undefined>) {
  const clerkSecretKey = env.CLERK_SECRET_KEY?.trim();
  const clerkPublishableKey = env.CLERK_PUBLISHABLE_KEY?.trim();
  const clerkJwtKey = env.CLERK_JWT_KEY?.trim();
  const authorizedParties = csvValues(env.CLERK_AUTHORIZED_PARTIES);
  const administratorUserIds = csvValues(env.CLERK_ADMIN_USER_IDS);
  const administratorEmails = csvValues(env.CLERK_ADMIN_EMAILS).map((email) => email.toLowerCase());

  for (const party of authorizedParties) {
    if (party === '*') throw new Error('CLERK_AUTHORIZED_PARTIES cannot contain a wildcard');
    new URL(party);
  }

  if (
    !clerkSecretKey &&
    !clerkPublishableKey &&
    !clerkJwtKey &&
    authorizedParties.length === 0 &&
    administratorUserIds.length === 0 &&
    administratorEmails.length === 0
  ) {
    return undefined;
  }

  return {
    ...(clerkSecretKey ? { clerkSecretKey } : {}),
    ...(clerkPublishableKey ? { clerkPublishableKey } : {}),
    ...(clerkJwtKey ? { clerkJwtKey } : {}),
    authorizedParties,
    administratorUserIds,
    administratorEmails,
  };
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

function optionalPaymentConfig(env: Record<string, string | undefined>) {
  const configuredMode = env.PAYPAL_MODE?.trim();
  if (configuredMode && configuredMode !== 'sandbox' && configuredMode !== 'live') {
    throw new Error('PAYPAL_MODE must be sandbox or live');
  }
  const mode: 'sandbox' | 'live' = configuredMode === 'live' ? 'live' : 'sandbox';
  const clientId = env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = env.PAYPAL_CLIENT_SECRET?.trim();
  const webhookId = env.PAYPAL_WEBHOOK_ID?.trim();
  const defaultBaseUrl =
    mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const baseUrl = env.PAYPAL_BASE_URL?.trim() || defaultBaseUrl;
  new URL(baseUrl);

  if (!clientId && !clientSecret && !webhookId && !env.PAYPAL_MODE && !env.PAYPAL_BASE_URL) {
    return undefined;
  }
  return {
    mode,
    ...(clientId ? { clientId } : {}),
    ...(clientSecret ? { clientSecret } : {}),
    ...(webhookId ? { webhookId } : {}),
    baseUrl,
  };
}

function optionalSpamConfig(env: Record<string, string | undefined>) {
  const turnstileSecretKey = env.TURNSTILE_SECRET_KEY?.trim();
  const allowedHostnames = csvValues(env.TURNSTILE_ALLOWED_HOSTNAMES);
  const configuredUrl = env.TURNSTILE_SITEVERIFY_URL?.trim();
  const configuredMinimum = env.FORM_MINIMUM_COMPLETION_MS;
  const configuredMaximum = env.FORM_MAXIMUM_COMPLETION_MS;

  for (const hostname of allowedHostnames) {
    if (hostname === '*' || hostname.includes('://') || hostname.includes('/')) {
      throw new Error('TURNSTILE_ALLOWED_HOSTNAMES must contain exact hostnames');
    }
  }

  if (
    !turnstileSecretKey &&
    allowedHostnames.length === 0 &&
    !configuredUrl &&
    !configuredMinimum &&
    !configuredMaximum
  ) {
    return undefined;
  }

  const siteverifyUrl =
    configuredUrl || 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  new URL(siteverifyUrl);
  const minimumCompletionMs = positiveInteger(
    configuredMinimum,
    1_200,
    'FORM_MINIMUM_COMPLETION_MS',
  );
  const maximumCompletionMs = positiveInteger(
    configuredMaximum,
    7_200_000,
    'FORM_MAXIMUM_COMPLETION_MS',
  );
  if (maximumCompletionMs <= minimumCompletionMs) {
    throw new Error('FORM_MAXIMUM_COMPLETION_MS must exceed FORM_MINIMUM_COMPLETION_MS');
  }

  return {
    ...(turnstileSecretKey ? { turnstileSecretKey } : {}),
    allowedHostnames,
    siteverifyUrl,
    minimumCompletionMs,
    maximumCompletionMs,
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

  const identity = optionalIdentityConfig(env);
  const notification = optionalNotificationConfig(env);
  const payment = optionalPaymentConfig(env);
  const spam = optionalSpamConfig(env);
  return {
    ...base,
    logLevel: logLevel as ApiRuntimeConfig['logLevel'],
    trustProxy: booleanValue(env.TRUST_PROXY, base.environment === 'production'),
    allowedOrigins: origins(env.CORS_ORIGINS, base.environment),
    bodyLimit: positiveInteger(env.BODY_LIMIT_BYTES, 64 * 1024, 'BODY_LIMIT_BYTES'),
    rateLimitMax: positiveInteger(env.RATE_LIMIT_MAX, 100, 'RATE_LIMIT_MAX'),
    rateLimitWindowMs: positiveInteger(env.RATE_LIMIT_WINDOW_MS, 60_000, 'RATE_LIMIT_WINDOW_MS'),
    ...(identity ? { identity } : {}),
    ...(notification ? { notification } : {}),
    ...(payment ? { payment } : {}),
    ...(spam ? { spam } : {}),
  };
}
