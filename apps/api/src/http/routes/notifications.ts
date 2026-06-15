import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { NotificationsService } from '../../notifications/application/service.js';

export async function registerNotificationAdminRoutes(
  app: FastifyInstance,
  notifications: NotificationsService,
): Promise<void> {
  app.get('/notifications/pending', async () => notifications.listPending());

  app.get('/notifications', async (request) => {
    const query = request.query as { status?: string };
    return notifications.list(query.status ? { status: query.status } : {});
  });

  app.get('/notifications/:notificationId', async (request) => {
    return notifications.getDetails(notificationId(request));
  });

  app.post('/notifications/:notificationId/retry', async (request) => {
    return notifications.retry(notificationId(request));
  });
}

function notificationId(request: FastifyRequest): string {
  return (request.params as { notificationId: string }).notificationId;
}
