import { apiErrorSchema, type ApiError } from '@carlos-pinto/contracts';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { IdentityAccessError } from '../identity/application/authorization.js';
import { IdentityVerificationError } from '../identity/application/ports.js';
import { LeadApplicationError } from '../leads/application/errors.js';
import { NotificationApplicationError } from '../notifications/application/notification-errors.js';
import { PaymentApplicationError } from '../payments/application/errors.js';
import { PaymentGatewayError } from '../payments/application/ports.js';

export class ApplicationError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

function response(
  request: FastifyRequest,
  code: string,
  message: string,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
): ApiError {
  return apiErrorSchema.parse({
    code,
    message,
    correlationId: request.id,
    ...(fieldErrors
      ? {
          fieldErrors: Object.fromEntries(
            Object.entries(fieldErrors).map(([key, values]) => [key, [...values]]),
          ),
        }
      : {}),
  });
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    void reply
      .code(404)
      .send(response(request, 'ROUTE_NOT_FOUND', 'The requested route does not exist.'));
  });

  app.setErrorHandler(
    (
      error:
        | FastifyError
        | ApplicationError
        | IdentityAccessError
        | IdentityVerificationError
        | LeadApplicationError
        | NotificationApplicationError
        | PaymentApplicationError
        | PaymentGatewayError,
      request,
      reply: FastifyReply,
    ) => {
      if (
        error instanceof ApplicationError ||
        error instanceof LeadApplicationError ||
        error instanceof NotificationApplicationError ||
        error instanceof PaymentApplicationError
      ) {
        void reply
          .code(error.statusCode)
          .send(response(request, error.code, error.message, error.fieldErrors));
        return;
      }

      if (error instanceof IdentityAccessError || error instanceof IdentityVerificationError) {
        void reply.code(error.statusCode).send(response(request, error.code, error.message));
        return;
      }

      if (error instanceof PaymentGatewayError) {
        const statusCode = error.retryable ? 503 : 502;
        void reply.code(statusCode).send(response(request, error.code, error.message));
        return;
      }

      if (error.validation) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of error.validation) {
          const key = issue.instancePath || issue.params.missingProperty?.toString() || 'request';
          fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message ?? 'Invalid value'];
        }
        void reply
          .code(400)
          .send(
            response(
              request,
              'VALIDATION_ERROR',
              'The request contains invalid fields.',
              fieldErrors,
            ),
          );
        return;
      }

      if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
        void reply
          .code(413)
          .send(response(request, 'PAYLOAD_TOO_LARGE', 'The request payload is too large.'));
        return;
      }

      if (error.statusCode === 429) {
        void reply
          .code(429)
          .send(response(request, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Try again later.'));
        return;
      }

      request.log.error({ err: error, correlationId: request.id }, 'Unhandled request error');
      void reply
        .code(500)
        .send(response(request, 'INTERNAL_ERROR', 'An unexpected error occurred.'));
    },
  );
}
