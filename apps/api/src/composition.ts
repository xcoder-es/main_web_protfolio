import { randomUUID } from 'node:crypto';

import type { Clock, IdGenerator } from '@carlos-pinto/contracts';

import type { ServiceProbe } from './application/readiness.js';
import type { ApiRuntimeConfig } from './infrastructure/config.js';
import { LeadsService } from './leads/application/service.js';
import { DisabledNotificationSender } from './notifications/adapters/disabled-notification-sender.js';
import { ResendNotificationSender } from './notifications/adapters/resend-notification-sender.js';
import type { NotificationSender } from './notifications/application/ports.js';
import { NotificationsService } from './notifications/application/service.js';
import { SubmissionNotificationCoordinator } from './notifications/application/submission-coordinator.js';
import { InMemoryPersistence } from './persistence/adapters/in-memory/in-memory-persistence.js';
import type { PersistenceRepositories, UnitOfWork } from './persistence/application/ports.js';

function capabilityProbe(name: string, enabled: boolean, configured = false): ServiceProbe {
  return {
    async run() {
      if (!enabled) {
        return { name, ok: true, required: false, state: 'disabled' as const };
      }
      if (configured) {
        return { name, ok: true, required: true, state: 'ready' as const };
      }
      return { name, ok: false, required: true, state: 'unavailable' as const };
    },
  };
}

export type ApplicationDependencies = {
  probes: readonly ServiceProbe[];
  leads: LeadsService;
  notifications: NotificationsService;
  submissions: SubmissionNotificationCoordinator;
};

export type PersistenceBundle = Readonly<{
  repositories: PersistenceRepositories;
  unitOfWork: UnitOfWork;
}>;

export type ApplicationOverrides = Readonly<{
  persistence?: PersistenceBundle;
  clock?: Clock;
  ids?: IdGenerator;
  notificationSender?: NotificationSender;
}>;

export function createApplicationDependencies(
  config: ApiRuntimeConfig,
  overrides: ApplicationOverrides = {},
): ApplicationDependencies {
  const memory = new InMemoryPersistence();
  const persistence = overrides.persistence ?? {
    repositories: memory.repositories,
    unitOfWork: memory,
  };
  const clock: Clock = overrides.clock ?? { now: () => new Date() };
  const ids: IdGenerator = overrides.ids ?? { generate: () => randomUUID() };
  const notificationConfigured = Boolean(
    overrides.notificationSender ||
      (config.notification?.resendApiKey &&
        config.notification.fromAddress &&
        config.notification.recipientAddress),
  );
  const notificationSender =
    overrides.notificationSender ??
    (notificationConfigured && config.notification?.resendApiKey
      ? new ResendNotificationSender({
          apiKey: config.notification.resendApiKey,
          baseUrl: config.notification.resendBaseUrl,
        })
      : new DisabledNotificationSender());

  const notifications = new NotificationsService({
    notifications: persistence.repositories.notifications,
    attempts: persistence.repositories.notificationAttempts,
    leads: persistence.repositories.leads,
    unitOfWork: persistence.unitOfWork,
    sender: notificationSender,
    clock,
    ids,
    fromAddress: config.notification?.fromAddress || 'notifications-disabled@invalid',
    recipientAddress: config.notification?.recipientAddress || 'notifications-disabled@invalid',
  });
  const leads = new LeadsService({
    leads: persistence.repositories.leads,
    notes: persistence.repositories.leadNotes,
    audit: persistence.repositories.auditEvents,
    unitOfWork: persistence.unitOfWork,
    clock,
    ids,
  });

  return {
    probes: [
      capabilityProbe('persistence', config.features.persistence),
      capabilityProbe('identity', config.features.identity),
      capabilityProbe('notifications', config.features.notifications, notificationConfigured),
      capabilityProbe('payments', config.features.payments),
      capabilityProbe('spam-verification', config.features.spamVerification),
    ],
    leads,
    notifications,
    submissions: new SubmissionNotificationCoordinator(leads, notifications),
  };
}
