import type { FastifyInstance } from 'fastify';

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async () => ({ available: true, authentication: 'not-configured' }));
}
