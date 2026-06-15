import type { FastifyInstance } from 'fastify';

import type { PaymentsService } from '../../payments/application/service.js';

export async function registerPaymentAdminRoutes(
  app: FastifyInstance,
  payments: PaymentsService,
): Promise<void> {
  app.get('/payment-requests', async () => payments.list());

  app.get('/payment-requests/:paymentRequestId', async (request) => {
    const { paymentRequestId } = request.params as { paymentRequestId: string };
    return payments.getById(paymentRequestId);
  });

  app.get('/payment-requests/:paymentRequestId/events', async (request) => {
    const { paymentRequestId } = request.params as { paymentRequestId: string };
    return payments.getHistory(paymentRequestId);
  });
}
