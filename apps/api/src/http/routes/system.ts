import type { FastifyInstance } from 'fastify';

import { checkServices, type ServiceProbe } from '../../application/readiness.js';
import { getHealthStatus, serviceMetadata } from '../../server.js';

const healthResponseSchema = {
  type: 'object',
  required: ['status', 'service', 'version'],
  properties: {
    status: { type: 'string', const: 'ok' },
    service: { type: 'string' },
    version: { type: 'string' },
  },
} as const;

const readinessResponseSchema = {
  type: 'object',
  required: ['ready', 'status', 'service', 'version', 'generatedAt', 'durationMs'],
  properties: {
    ready: { type: 'boolean' },
    status: { type: 'string', enum: ['ready', 'not_ready'] },
    service: { type: 'string' },
    version: { type: 'string' },
    generatedAt: { type: 'string' },
    durationMs: { type: 'number' },
  },
} as const;

type SystemRouteOptions = Readonly<{
  openApiEnabled?: boolean;
}>;

export async function registerSystemRoutes(
  app: FastifyInstance,
  probes: readonly ServiceProbe[],
  options: SystemRouteOptions = {},
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
      schema: {
        tags: ['system'],
        summary: 'Dependency readiness',
        response: { 200: readinessResponseSchema, 503: readinessResponseSchema },
      },
    },
    async (_request, reply) => {
      const report = await checkServices(probes);
      return reply.code(report.ready ? 200 : 503).send({
        ready: report.ready,
        status: report.ready ? 'ready' : 'not_ready',
        service: serviceMetadata.name,
        version: serviceMetadata.version,
        generatedAt: report.generatedAt,
        durationMs: report.durationMs,
      });
    },
  );

  if (options.openApiEnabled) {
    app.get(
      '/openapi.json',
      {
        config: { rateLimit: false },
        schema: { hide: true },
      },
      async () => app.swagger(),
    );
  }
}
