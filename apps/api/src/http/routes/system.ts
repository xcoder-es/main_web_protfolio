import type { FastifyInstance } from 'fastify';

import { checkServices, type ServiceProbe } from '../../application/readiness.js';
import { getHealthStatus } from '../../server.js';

const healthResponseSchema = {
  type: 'object',
  required: ['status', 'service', 'version'],
  properties: {
    status: { type: 'string', const: 'ok' },
    service: { type: 'string' },
    version: { type: 'string' },
  },
} as const;

export async function registerSystemRoutes(
  app: FastifyInstance,
  probes: readonly ServiceProbe[],
): Promise<void> {
  app.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        tags: ['system'],
        summary: 'Process health',
        response: { 200: healthResponseSchema },
      },
    },
    async () => getHealthStatus(),
  );

  app.get(
    '/ready',
    {
      config: { rateLimit: false },
      schema: { tags: ['system'], summary: 'Dependency readiness' },
    },
    async (_request, reply) => {
      const report = await checkServices(probes);
      return reply.code(report.ready ? 200 : 503).send(report);
    },
  );

  app.get(
    '/openapi.json',
    {
      config: { rateLimit: false },
      schema: { hide: true },
    },
    async () => app.swagger(),
  );
}
