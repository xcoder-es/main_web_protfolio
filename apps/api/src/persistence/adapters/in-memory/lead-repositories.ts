import type {
  LeadNoteRecord,
  LeadRecord,
  NotificationAttemptRecord,
  NotificationRecord,
} from '../../application/records.js';
import type {
  LeadNoteRepository,
  LeadRepository,
  NotificationAttemptRepository,
  NotificationRepository,
} from '../../application/ports.js';
import { InMemoryRepository } from './base-repository.js';

export class InMemoryLeadRepository
  extends InMemoryRepository<LeadRecord>
  implements LeadRepository
{
  public override async insert(record: LeadRecord): Promise<void> {
    if (await this.findByIdempotencyKey(record.idempotencyKey)) {
      throw new Error(`Duplicate lead idempotency key: ${record.idempotencyKey}`);
    }
    await super.insert(record);
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<LeadRecord | null> {
    return this.find((record) => record.idempotencyKey === idempotencyKey);
  }
}

export class InMemoryLeadNoteRepository
  extends InMemoryRepository<LeadNoteRecord>
  implements LeadNoteRepository
{
  public async listByLeadId(leadId: string): Promise<readonly LeadNoteRecord[]> {
    return this.filter((record) => record.leadId === leadId);
  }
}

export class InMemoryNotificationRepository
  extends InMemoryRepository<NotificationRecord>
  implements NotificationRepository
{
  public override async insert(record: NotificationRecord): Promise<void> {
    if (await this.findByDeduplicationKey(record.deduplicationKey)) {
      throw new Error(`Duplicate notification key: ${record.deduplicationKey}`);
    }
    await super.insert(record);
  }

  public async findByDeduplicationKey(
    deduplicationKey: string,
  ): Promise<NotificationRecord | null> {
    return this.find((record) => record.deduplicationKey === deduplicationKey);
  }

  public async listPending(): Promise<readonly NotificationRecord[]> {
    const records = await this.filter((record) => record.status === 'pending');
    return [...records].sort(
      (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime(),
    );
  }
}

export class InMemoryNotificationAttemptRepository
  extends InMemoryRepository<NotificationAttemptRecord>
  implements NotificationAttemptRepository
{
  public override async insert(record: NotificationAttemptRecord): Promise<void> {
    const attempts = await this.listByNotificationId(record.notificationId);
    if (attempts.some((attempt) => attempt.attemptNumber === record.attemptNumber)) {
      throw new Error(
        `Duplicate notification attempt: ${record.notificationId}/${record.attemptNumber}`,
      );
    }
    await super.insert(record);
  }

  public async listByNotificationId(
    notificationId: string,
  ): Promise<readonly NotificationAttemptRecord[]> {
    const records = await this.filter((record) => record.notificationId === notificationId);
    return [...records].sort((left, right) => left.attemptNumber - right.attemptNumber);
  }
}
