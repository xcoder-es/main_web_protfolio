import type { PersistenceRepositories } from '../../application/ports.js';
import {
  InMemoryLeadNoteRepository,
  InMemoryLeadRepository,
  InMemoryNotificationAttemptRepository,
  InMemoryNotificationRepository,
} from './lead-repositories.js';
import {
  InMemoryAuditEventRepository,
  InMemoryPaymentEventRepository,
  InMemoryPaymentRequestRepository,
  InMemoryPaypalWebhookEventRepository,
} from './payment-repositories.js';

export class InMemoryPersistence {
  public readonly leads = new InMemoryLeadRepository();
  public readonly leadNotes = new InMemoryLeadNoteRepository();
  public readonly notifications = new InMemoryNotificationRepository();
  public readonly notificationAttempts = new InMemoryNotificationAttemptRepository();
  public readonly paymentRequests = new InMemoryPaymentRequestRepository();
  public readonly paymentEvents = new InMemoryPaymentEventRepository();
  public readonly paypalWebhookEvents = new InMemoryPaypalWebhookEventRepository();
  public readonly auditEvents = new InMemoryAuditEventRepository();

  public readonly repositories: PersistenceRepositories = {
    leads: this.leads,
    leadNotes: this.leadNotes,
    notifications: this.notifications,
    notificationAttempts: this.notificationAttempts,
    paymentRequests: this.paymentRequests,
    paymentEvents: this.paymentEvents,
    paypalWebhookEvents: this.paypalWebhookEvents,
    auditEvents: this.auditEvents,
  };
}
