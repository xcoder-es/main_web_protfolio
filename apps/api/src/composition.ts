import { randomUUID } from 'node:crypto';

import type { Clock, IdGenerator } from '@carlos-pinto/contracts';

import type { ServiceProbe } from './application/readiness.js';
import { createAdministratorAuthentication } from './http/admin-authentication.js';
import { ClerkIdentityVerifier, createClerkIdentityVerifier } from './identity/adapters/clerk-identity-verifier.js';
import { DisabledIdentityVerifier } from './identity/adapters/disabled-identity-verifier.js';
import { AdministratorAuthorizer } from './identity/application/authorization.js';
import type { IdentityVerifier } from './identity/application/ports.js';
import type { ApiRuntimeConfig } from './infrastructure/config.js';
import { LeadsService } from './leads/application/service.js';
import { DisabledNotificationSender } from './notifications/adapters/disabled-notification-sender.js';
import { ResendNotificationSender } from './notifications/adapters/resend-notification-sender.js';
import type { NotificationSender } from './notifications/application/ports.js';
import { NotificationsService } from './notifications/application/service.js';
import { SubmissionNotificationCoordinator } from './notifications/application/submission-coordinator.js';
import { PayPalGateway } from './payments/adapters/paypal-gateway.js';
import { UnavailablePaymentGateway } from './payments/adapters/unavailable-payment-gateway.js';
import type { PaymentGateway } from './payments/application/ports.js';
import { PaymentsService } from './payments/application/service.js';
import { PayPalWebhookService } from './payments/application/webhook-service.js';
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
  payments: PaymentsService;
  paypalWebhooks: PayPalWebhookService;
  administratorAuthentication: ReturnType<typeof createAdministratorAuthentication>;
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
  identityVerifier?: IdentityVerifier;
  paymentGateway?: PaymentGateway;
  administratorUserIds?: readonly string[];
  administratorEmails?: readonly string[];
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

  const administratorUserIds =
    overrides.administratorUserIds ?? config.identity?.administratorUserIds ?? [];
  const administratorEmails =
    overrides.administratorEmails ?? config.identity?.administratorEmails ?? [];
  const authorizer = new AdministratorAuthorizer(administratorUserIds, administratorEmails);
  const clerkConfigured = Boolean(
    config.identity?.clerkSecretKey &&
      config.identity.clerkPublishableKey &&
      config.identity.authorizedParties.length > 0 &&
      authorizer.configured,
  );
  const identityVerifier: IdentityVerifier =
    overrides.identityVerifier ??
    (clerkConfigured && config.identity?.clerkSecretKey && config.identity.clerkPublishableKey
      ? createClerkIdentityVerifier({
          secretKey: config.identity.clerkSecretKey,
          publishableKey: config.identity.clerkPublishableKey,
          ...(config.identity.clerkJwtKey ? { jwtKey: config.identity.clerkJwtKey } : {}),
          authorizedParties: config.identity.authorizedParties,
          resolvePrimaryEmail: administratorEmails.length > 0,
        })
      : new DisabledIdentityVerifier());
  const identityConfigured = Boolean(
    authorizer.configured && (overrides.identityVerifier || identityVerifier instanceof ClerkIdentityVerifier),
  );

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

  const paymentConfigured = Boolean(
    overrides.paymentGateway ||
      (config.payment?.clientId && config.payment.clientSecret && config.payment.webhookId),
  );
  const paymentGateway =
    overrides.paymentGateway ??
    (paymentConfigured &&
    config.payment?.clientId &&
    config.payment.clientSecret &&
    config.payment.webhookId
      ? new PayPalGateway({
          clientId: config.payment.clientId,
          clientSecret: config.payment.clientSecret,
          webhookId: config.payment.webhookId,
          baseUrl: config.payment.baseUrl,
        })
      : new UnavailablePaymentGateway());

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
  const paymentDependencies = {
    paymentRequests: persistence.repositories.paymentRequests,
    paymentEvents: persistence.repositories.paymentEvents,
    audit: persistence.repositories.auditEvents,
    unitOfWork: persistence.unitOfWork,
    gateway: paymentGateway,
    clock,
    ids,
  };
  const payments = new PaymentsService(paymentDependencies);
  const paypalWebhooks = new PayPalWebhookService({
    ...paymentDependencies,
    webhookEvents: persistence.repositories.paypalWebhookEvents,
  });

  return {
    probes: [
      capabilityProbe('persistence', config.features.persistence),
      capabilityProbe('identity', config.features.identity, identityConfigured),
      capabilityProbe('notifications', config.features.notifications, notificationConfigured),
      capabilityProbe('payments', config.features.payments, paymentConfigured),
      capabilityProbe('spam-verification', config.features.spamVerification),
    ],
    leads,
    notifications,
    submissions: new SubmissionNotificationCoordinator(leads, notifications),
    payments,
    paypalWebhooks,
    administratorAuthentication: createAdministratorAuthentication(identityVerifier, authorizer),
  };
}
