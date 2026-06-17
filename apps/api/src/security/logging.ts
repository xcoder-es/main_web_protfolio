import type { FastifyReply, FastifyRequest } from 'fastify';

export type ApplicationLogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'silent';

export const sensitiveLogPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.proxy-authorization',
  'req.headers.x-api-key',
  'res.headers.set-cookie',
  'body',
  'payload',
  'webhookEvent',
  '*.password',
  '*.secret',
  '*.secretKey',
  '*.clientSecret',
  '*.apiKey',
  '*.token',
  '*.turnstileToken',
  '*.authorization',
  '*.cookie',
  '*.email',
  '*.phone',
  '*.message',
  '*.summary',
  '*.description',
] as const;

export function createLoggerOptions(
  environment: 'development' | 'test' | 'production',
  level: ApplicationLogLevel,
) {
  return {
    level,
    redact: {
      paths: [...sensitiveLogPaths],
      censor: '[REDACTED]',
    },
    serializers: {
      req(request: unknown) {
        const candidate = request as {
          id?: unknown;
          method?: unknown;
          routeOptions?: { url?: unknown };
        };
        return {
          requestId: safeLogText(candidate.id),
          method: safeLogText(candidate.method) ?? 'UNKNOWN',
          route: safeLogText(candidate.routeOptions?.url) ?? 'unmatched',
        };
      },
      res(reply: unknown) {
        const candidate = reply as { statusCode?: unknown };
        return {
          statusCode: typeof candidate.statusCode === 'number' ? candidate.statusCode : 0,
        };
      },
      err(error: unknown) {
        return serializeError(error, environment !== 'production');
      },
    },
  };
}

export function logRequestCompleted(request: FastifyRequest, reply: FastifyReply): void {
  const statusCode = reply.statusCode;
  const context = {
    event: 'http.request.completed',
    correlationId: request.id,
    method: request.method,
    route: routeTemplate(request),
    statusCode,
    durationMs: Math.max(0, Math.round(reply.elapsedTime)),
    outcome: statusCode >= 500 ? 'failure' : statusCode >= 400 ? 'rejected' : 'success',
  } as const;

  if (statusCode >= 500) request.log.error(context, 'HTTP request failed');
  else if (statusCode >= 400) request.log.warn(context, 'HTTP request rejected');
  else request.log.info(context, 'HTTP request completed');
}

export function logHandledError(
  request: FastifyRequest,
  statusCode: number,
  errorCode: string,
): void {
  const context = {
    event: 'application.request.rejected',
    correlationId: request.id,
    method: request.method,
    route: routeTemplate(request),
    statusCode,
    errorCode: safeLogText(errorCode) ?? 'UNKNOWN_ERROR',
  } as const;

  if (statusCode >= 500) request.log.error(context, 'Application request failed');
  else if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
    request.log.warn(context, 'Security-relevant request rejected');
  } else request.log.info(context, 'Application request rejected');
}

export function safeLogText(value: unknown, maximumLength = 180): string | undefined {
  if (typeof value !== 'string') return undefined;
  const controlCharacters = new RegExp(
    `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]+`,
    'g',
  );
  const sanitized = value.replace(controlCharacters, ' ').trim();
  if (!sanitized) return undefined;
  return sanitized.length <= maximumLength
    ? sanitized
    : `${sanitized.slice(0, maximumLength - 1)}…`;
}

function routeTemplate(request: FastifyRequest): string {
  return safeLogText(request.routeOptions.url) ?? 'unmatched';
}

function serializeError(error: unknown, includeStack: boolean) {
  if (!(error instanceof Error)) {
    return { type: 'UnknownError', message: 'Non-error value thrown', stack: '' };
  }
  const candidate = error as Error & { code?: unknown; statusCode?: unknown };
  return {
    type: safeLogText(error.name) ?? 'Error',
    message: safeLogText(error.message, 240) ?? 'Error',
    stack: includeStack && error.stack ? (safeLogText(error.stack, 2_000) ?? '') : '',
    code: safeLogText(candidate.code),
    statusCode: typeof candidate.statusCode === 'number' ? candidate.statusCode : undefined,
  };
}
