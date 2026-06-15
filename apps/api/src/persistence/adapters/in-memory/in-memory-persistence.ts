import type { PersistenceRepositories, UnitOfWork } from '../../application/ports.js';
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

export class InMemoryPersistence implements UnitOfWork {
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

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    const snapshots = {
      leads: this.leads.snapshot(),
      leadNotes: this.leadNotes.snapshot(),
      notifications: this.notifications.snapshot(),
      notificationAttempts: this.notificationAttempts.snapshot(),
      paymentRequests: this.paymentRequests.snapshot(),
      paymentEvents: this.paymentEvents.snapshot(),
      paypalWebhookEvents: this.paypalWebhookEvents.snapshot(),
      auditEvents: this.auditEvents.snapshot(),
    };

    try {
      return await work();
    } catch (error) {
      this.leads.restore(snapshots.leads);
      this.leadNotes.restore(snapshots.leadNotes);
      this.notifications.restore(snapshots.notifications);
      this.notificationAttempts.restore(snapshots.notificationAttempts);
      this.paymentRequests.restore(snapshots.paymentRequests);
      this.paymentEvents.restore(snapshots.paymentEvents);
      this.paypalWebhookEvents.restore(snapshots.paypalWebhookEvents);
      this.auditEvents.restore(snapshots.auditEvents);
      throw error;
    }
  }
}
