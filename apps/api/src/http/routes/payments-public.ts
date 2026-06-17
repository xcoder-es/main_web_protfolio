import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { PaymentsService } from '../../payments/application/service.js';
import { ApplicationError } from '../errors.js';

export async function registerPaymentPublicRoutes(
  app: FastifyInstance,
  payments: PaymentsService,
): Promise<void> {
  app.get('/payment-requests/:publicToken', async (request) => {
    const payment = await payments.getByPublicToken(tokenFrom(request));
    return {
      title: payment.title,
      description: payment.description,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      status: payment.status,
      expiresAt: payment.expiresAt,
    };
  });

  app.post('/payment-requests/:publicToken/orders', async (request, reply) => {
    const result = await payments.createProviderOrder(tokenFrom(request), visitorActor(request));
    return reply.code(result.created ? 201 : 200).send(result);
  });

  app.post('/payment-requests/:publicToken/capture', async (request) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (typeof body.orderId !== 'string' || body.orderId.trim().length === 0) {
      throw new ApplicationError('VALIDATION_ERROR', 'The request contains invalid fields.', 400, {
        orderId: ['PayPal order ID is required.'],
      });
    }
    const payment = await payments.captureProviderOrder(
      tokenFrom(request),
      body.orderId,
      visitorActor(request),
    );
    return { status: payment.status, paidAt: payment.paidAt };
  });
}

function tokenFrom(request: FastifyRequest): string {
  return (request.params as { publicToken: string }).publicToken;
}

function visitorActor(request: FastifyRequest) {
  return { type: 'visitor' as const, correlationId: request.id };
}
