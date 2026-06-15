import type { UnitOfWork } from '../../application/ports.js';
import type { InMemoryPersistence } from './in-memory-persistence.js';

export class InMemoryWorkScope implements UnitOfWork {
  public constructor(private readonly persistence: InMemoryPersistence) {}

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    const snapshots = this.capture();
    try {
      return await work();
    } catch (error) {
      this.restore(snapshots);
      throw error;
    }
  }

  private capture() {
    return {
      leads: this.persistence.leads.snapshot(),
      leadNotes: this.persistence.leadNotes.snapshot(),
      notifications: this.persistence.notifications.snapshot(),
      notificationAttempts: this.persistence.notificationAttempts.snapshot(),
      paymentRequests: this.persistence.paymentRequests.snapshot(),
      paymentEvents: this.persistence.paymentEvents.snapshot(),
      paypalWebhookEvents: this.persistence.paypalWebhookEvents.snapshot(),
      auditEvents: this.persistence.auditEvents.snapshot(),
    };
  }

  private restore(snapshots: ReturnType<InMemoryWorkScope['capture']>): void {
    this.persistence.leads.restore(snapshots.leads);
    this.persistence.leadNotes.restore(snapshots.leadNotes);
    this.persistence.notifications.restore(snapshots.notifications);
    this.persistence.notificationAttempts.restore(snapshots.notificationAttempts);
    this.persistence.paymentRequests.restore(snapshots.paymentRequests);
    this.persistence.paymentEvents.restore(snapshots.paymentEvents);
    this.persistence.paypalWebhookEvents.restore(snapshots.paypalWebhookEvents);
    this.persistence.auditEvents.restore(snapshots.auditEvents);
  }
}
