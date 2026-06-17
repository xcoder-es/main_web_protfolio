import {
  contactSubmissionSchema,
  projectRequestSubmissionSchema,
} from '@carlos-pinto/contracts';
import type { FastifyInstance } from 'fastify';

import type { PublicSubmissionService } from '../../submissions/application/service.js';
import { ApplicationError } from '../errors.js';

const contactRouteOptions = {
  bodyLimit: 12 * 1024,
  config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
} as const;

const projectRouteOptions = {
  bodyLimit: 24 * 1024,
  config: { rateLimit: { max: 3, timeWindow: '10 minutes' } },
} as const;

export async function registerPublicRoutes(
  app: FastifyInstance,
  submissions: PublicSubmissionService,
): Promise<void> {
  app.get('/status', async () => ({ available: true }));

  app.post('/contact', contactRouteOptions, async (request, reply) => {
    const parsed = contactSubmissionSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const result = await submissions.submitContact(parsed.data, {
      actor: { type: 'visitor', correlationId: request.id },
      remoteIp: request.ip,
    });
    return reply.code(result.created ? 201 : 200).send({
      leadId: result.lead.id,
      status: result.lead.status,
      created: result.created,
    });
  });

  app.post('/project-requests', projectRouteOptions, async (request, reply) => {
    const parsed = projectRequestSubmissionSchema.safeParse(request.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const result = await submissions.submitProject(parsed.data, {
      actor: { type: 'visitor', correlationId: request.id },
      remoteIp: request.ip,
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
