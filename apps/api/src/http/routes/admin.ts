import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { LeadsService } from '../../leads/application/service.js';
import { isLeadStatus } from '../../leads/domain/model.js';
import { ApplicationError } from '../errors.js';
import { requireAuthenticatedPrincipal } from '../identity-context.js';

export async function registerAdminRoutes(
  app: FastifyInstance,
  leads: LeadsService,
): Promise<void> {
  app.get('/status', async (request) => ({
    available: true,
    authentication: 'verified',
    userId: requireAuthenticatedPrincipal(request).userId,
  }));

  app.get('/leads/export.csv', async (request, reply) => {
    const csv = protectSpreadsheetCells(await leads.exportCsv(queryFilter(request)));
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="leads.csv"')
      .send(csv);
  });

  app.get('/leads', async (request) => leads.listLeads(queryFilter(request)));

  app.get('/leads/:leadId', async (request) => {
    const { leadId } = request.params as { leadId: string };
    return leads.getLead(leadId);
  });

  app.patch('/leads/:leadId/status', async (request) => {
    const { leadId } = request.params as { leadId: string };
    const { status } = (request.body ?? {}) as { status?: unknown };
    if (typeof status !== 'string' || !isLeadStatus(status)) {
      throw new ApplicationError('VALIDATION_ERROR', 'The request contains invalid fields.', 400, {
        status: ['Unknown lead status.'],
      });
    }
    return leads.changeStatus(leadId, status, administrator(request));
  });

  app.post('/leads/:leadId/notes', async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const { body } = (request.body ?? {}) as { body?: unknown };
    if (typeof body !== 'string') {
      throw new ApplicationError('VALIDATION_ERROR', 'The request contains invalid fields.', 400, {
        body: ['A note body is required.'],
      });
    }
    const note = await leads.addNote(leadId, body, administrator(request));
    return reply.code(201).send(note);
  });

  app.post('/leads/:leadId/archive', async (request) => {
    const { leadId } = request.params as { leadId: string };
    return leads.archive(leadId, administrator(request));
  });

  app.post('/leads/:leadId/spam', async (request) => {
    const { leadId } = request.params as { leadId: string };
    return leads.markSpam(leadId, administrator(request));
  });
}

function queryFilter(request: FastifyRequest) {
  const query = request.query as { status?: string; type?: string; search?: string };
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.search ? { search: query.search } : {}),
  };
}

function administrator(request: FastifyRequest) {
  const principal = requireAuthenticatedPrincipal(request);
  return {
    type: 'administrator' as const,
    id: principal.userId,
    correlationId: request.id,
  };
}

function protectSpreadsheetCells(csv: string): string {
  return csv.replace(/(^|,)"([=+@-])/gm, '$1"\'$2');
}
