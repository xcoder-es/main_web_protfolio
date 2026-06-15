import type { FastifyInstance } from 'fastify';

export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async () => ({ available: true, verification: 'provider-specific' }));
}
