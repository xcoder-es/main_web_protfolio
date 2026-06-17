import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import Fastify, { type FastifyInstance } from 'fastify';
import type { ApplicationDependencies } from './composition.js';
import type { ApiRuntimeConfig } from './infrastructure/config.js';
import { registerErrorHandlers } from './http/errors.js';
import { registerAdministratorOverviewRoutes } from './http/routes/admin-overview.js';
import { registerAdminRoutes } from './http/routes/admin.js';
import { registerNotificationAdminRoutes } from './http/routes/notifications.js';
import { registerPayPalWebhookRoute } from './http/routes/paypal-webhook.js';
import { registerPaymentAdminRoutes } from './http/routes/payments-admin.js';
import { registerPaymentPublicRoutes } from './http/routes/payments-public.js';
import { registerPublicRoutes } from './http/routes/public.js';
import { registerSystemRoutes } from './http/routes/system.js';
import { registerWebhookRoutes } from './http/routes/webhooks.js';
import { serviceMetadata } from './server.js';

const correlationIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export async function buildApp(
  config: ApiRuntimeConfig,
  dependencies: ApplicationDependencies,
): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: config.bodyLimit,
    trustProxy: config.trustProxy,
    logger: {
      level: config.logLevel,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
        '*.password',
        '*.secret',
        '*.token',
      ],
    },
    genReqId(request) {
      const supplied = request.headers['x-correlation-id'];
      const candidate = Array.isArray(supplied) ? supplied[0] : supplied;
      return candidate && correlationIdPattern.test(candidate) ? candidate : randomUUID();
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Carlos Pinto Digital Consulting API',
        version: serviceMetadata.version,
      },
      tags: [
        { name: 'system', description: 'Health and operational endpoints' },
        { name: 'public', description: 'Public visitor endpoints' },
        { name: 'administrator', description: 'Protected administrator endpoints' },
        { name: 'webhooks', description: 'Provider webhook endpoints' },
      ],
    },
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(cors, {
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'content-type',
      'authorization',
      'x-correlation-id',
      'idempotency-key',
    ],
    exposedHeaders: ['x-correlation-id', 'retry-after'],
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed'), false);
    },
  });
  await app.register(rateLimit, {
    global: true,
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-correlation-id', request.id);
  });

  registerErrorHandlers(app);
  await registerSystemRoutes(app, dependencies.probes);
  await app.register(
    async (scope) => {
      await registerPublicRoutes(scope, dependencies.submissions);
      await registerPaymentPublicRoutes(scope, dependencies.payments);
    },
    { prefix: '/api/public' },
  );
  await app.register(
    async (scope) => {
      scope.addHook('onRequest', dependencies.administratorAuthentication);
      await registerAdminRoutes(scope, dependencies.leads);
      await registerAdministratorOverviewRoutes(scope, dependencies.adminOverview);
      await registerNotificationAdminRoutes(scope, dependencies.notifications);
      await registerPaymentAdminRoutes(scope, dependencies.payments);
    },
    { prefix: '/api/admin' },
  );
  await app.register(
    async (scope) => {
      await registerWebhookRoutes(scope);
      await registerPayPalWebhookRoute(scope, dependencies.paypalWebhooks);
    },
    { prefix: '/api/webhooks' },
  );
  return app;
}
