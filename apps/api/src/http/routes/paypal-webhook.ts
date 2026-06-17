import type { FastifyInstance } from 'fastify';

import type { PayPalWebhookService } from '../../payments/application/webhook-service.js';
import { ApplicationError } from '../errors.js';

export async function registerPayPalWebhookRoute(
  app: FastifyInstance,
  service: PayPalWebhookService,
): Promise<void> {
  app.post('/paypal', async (request) => {
    if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid webhook payload.', 400);
    }

    const headers: Record<string, string | undefined> = {};
    for (const [name, value] of Object.entries(request.headers)) {
      headers[name.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }

    return service.process(headers, request.body as Readonly<Record<string, unknown>>);
  });
}
