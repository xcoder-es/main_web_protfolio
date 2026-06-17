import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { AdministratorOverviewService } from '../../admin/application/overview-service.js';

export async function registerAdministratorOverviewRoutes(
  app: FastifyInstance,
  overview: AdministratorOverviewService,
): Promise<void> {
  app.get('/diagnostics', async () => overview.diagnostics());

  app.get('/audit', async (request) => {
    const query = request.query as {
      entityType?: string;
      entityId?: string;
      action?: string;
      limit?: string;
    };
    return overview.auditTimeline({
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.limit ? { limit: parseLimit(query.limit, request) } : {}),
    });
  });
}

function parseLimit(value: string, request: FastifyRequest): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 250) {
    request.log.warn({ correlationId: request.id }, 'Invalid administrator audit limit');
    return 100;
  }
  return parsed;
}
