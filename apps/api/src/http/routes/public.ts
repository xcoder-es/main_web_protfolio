import type { FastifyInstance } from 'fastify';

export async function registerPublicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async () => ({ available: true }));
}
