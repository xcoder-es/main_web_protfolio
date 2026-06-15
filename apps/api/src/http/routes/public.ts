import {
  contactSubmissionSchema,
  projectRequestSubmissionSchema,
} from '@carlos-pinto/contracts';
import type { FastifyInstance } from 'fastify';

import type { LeadsService } from '../../leads/application/service.js';
import { ApplicationError } from '../errors.js';

export async function registerPublicRoutes(
  app: FastifyInstance,
  leads: LeadsService,
): Promise<void> {
  app.get('/status', async () => ({ available: true }));

  app.post('/contact', async (request, reply) => {
    const parsed = contactSubmissionSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const result = await leads.submitContact(parsed.data, {
      type: 'visitor',
      correlationId: request.id,
    });
    return reply.code(result.created ? 201 : 200).send({
      leadId: result.lead.id,
      status: result.lead.status,
      created: result.created,
    });
  });

  app.post('/project-requests', async (request, reply) => {
    const parsed = projectRequestSubmissionSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const result = await leads.submitProject(parsed.data, {
      type: 'visitor',
      correlationId: request.id,
    });
    return reply.code(result.created ? 201 : 200).send({
      leadId: result.lead.id,
      status: result.lead.status,
      created: result.created,
    });
  });
}

function validationError(
  issues: readonly Readonly<{ path: readonly PropertyKey[]; message: string }>[],
): ApplicationError {
  const fields: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'request';
    fields[key] = [...(fields[key] ?? []), issue.message];
  }
  return new ApplicationError(
    'VALIDATION_ERROR',
    'The request contains invalid fields.',
    400,
    fields,
  );
}
