import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { PaymentsService } from '../../payments/application/service.js';
import { ApplicationError } from '../errors.js';
import { requireAuthenticatedPrincipal } from '../identity-context.js';

export async function registerPaymentAdminRoutes(
  app: FastifyInstance,
  payments: PaymentsService,
): Promise<void> {
  app.get('/payment-requests', async () => payments.list());

  app.get('/payment-requests/:paymentRequestId', async (request) => {
    return payments.getById(idFrom(request));
  });

  app.get('/payment-requests/:paymentRequestId/events', async (request) => {
    return payments.getHistory(idFrom(request));
  });

  app.post('/payment-requests', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const expiresAt = parseOptionalDate(body.expiresAt);
    if (body.expiresAt !== undefined && !expiresAt) {
      throw new ApplicationError('VALIDATION_ERROR', 'The request contains invalid fields.', 400, {
        expiresAt: ['Expiration must be a valid ISO date.'],
      });
    }
    const created = await payments.createRequest(
      {
        ...(typeof body.leadId === 'string' ? { leadId: body.leadId } : {}),
        title: typeof body.title === 'string' ? body.title : '',
        ...(typeof body.description === 'string' ? { description: body.description } : {}),
        amountMinor: typeof body.amountMinor === 'number' ? body.amountMinor : Number.NaN,
        currency: typeof body.currency === 'string' ? body.currency : '',
        ...(expiresAt ? { expiresAt } : {}),
      },
      adminActor(request),
    );
    return reply.code(201).send(created);
  });

  app.post('/payment-requests/:paymentRequestId/activate', async (request) => {
    return payments.activate(idFrom(request), adminActor(request));
  });

  app.post('/payment-requests/:paymentRequestId/cancel', async (request) => {
    return payments.cancel(idFrom(request), adminActor(request));
  });
}

function idFrom(request: FastifyRequest): string {
  return (request.params as { paymentRequestId: string }).paymentRequestId;
}

function adminActor(request: FastifyRequest) {
  const principal = requireAuthenticatedPrincipal(request);
  return {
    type: 'administrator' as const,
    id: principal.userId,
    correlationId: request.id,
  };
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
