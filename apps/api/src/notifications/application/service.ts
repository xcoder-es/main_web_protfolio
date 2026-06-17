import type { Clock, IdGenerator } from '@carlos-pinto/contracts';

import type {
  LeadRepository,
  NotificationAttemptRepository,
  NotificationRepository,
  UnitOfWork,
} from '../../persistence/application/ports.js';
import type {
  LeadRecord,
  NotificationAttemptRecord,
  NotificationRecord,
} from '../../persistence/application/records.js';
import { assertNotificationTransition, notificationStatuses } from '../domain/model.js';
import { NotificationApplicationError } from './notification-errors.js';
import {
  NotificationSenderError,
  type NotificationMessage,
  type NotificationSender,
} from './ports.js';

export type NotificationDetails = Readonly<{
  notification: NotificationRecord;
  attempts: readonly NotificationAttemptRecord[];
}>;

export type NotificationListFilter = Readonly<{
  status?: string;
}>;

type Dependencies = Readonly<{
  notifications: NotificationRepository;
  attempts: NotificationAttemptRepository;
  leads: LeadRepository;
  unitOfWork: UnitOfWork;
  sender: NotificationSender;
  clock: Clock;
  ids: IdGenerator;
  fromAddress: string;
  recipientAddress: string;
}>;

export class NotificationsService {
  public constructor(private readonly dependencies: Dependencies) {}

  public async enqueueForLead(lead: LeadRecord): Promise<NotificationRecord> {
    const deduplicationKey = `lead-submitted/${lead.id}`;
    const existing = await this.dependencies.notifications.findByDeduplicationKey(deduplicationKey);
    if (existing) return existing;

    const now = this.dependencies.clock.now();
    const notification: NotificationRecord = {
      id: this.dependencies.ids.generate(),
      leadId: lead.id,
      channel: 'email',
      templateKey: 'lead-submitted',
      recipient: this.dependencies.recipientAddress,
      status: 'pending',
      deduplicationKey,
      scheduledAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.dependencies.notifications.insert(notification);
    return notification;
  }

  public async dispatchBestEffort(id: string): Promise<void> {
    try {
      await this.dispatch(id);
    } catch {
      // Lead creation must remain successful even when post-commit delivery bookkeeping fails.
    }
  }

  public async retry(id: string): Promise<NotificationRecord> {
    const notification = await this.requireNotification(id);
    if (notification.status === 'sent' || notification.status === 'skipped') return notification;
    if (notification.status === 'sending') return notification;
    return this.dispatch(id);
  }

  public async dispatch(id: string): Promise<NotificationRecord> {
    const current = await this.requireNotification(id);
    if (current.status === 'sent' || current.status === 'skipped' || current.status === 'sending') {
      return current;
    }

    assertNotificationTransition(current.status, 'sending');
    const attempts = await this.dependencies.attempts.listByNotificationId(id);
    const attemptNumber = attempts.length + 1;
    const startedAt = this.dependencies.clock.now();
    const attempt: NotificationAttemptRecord = {
      id: this.dependencies.ids.generate(),
      notificationId: id,
      attemptNumber,
      status: 'sending',
      startedAt,
      createdAt: startedAt,
    };
    const sending = clearFailure({ ...current, status: 'sending', updatedAt: startedAt });

    await this.dependencies.unitOfWork.execute(async () => {
      await this.dependencies.notifications.update(sending);
      await this.dependencies.attempts.insert(attempt);
    });

    try {
      const lead = current.leadId ? await this.dependencies.leads.getById(current.leadId) : null;
      if (!lead) {
        throw new NotificationSenderError(
          'NOTIFICATION_LEAD_NOT_FOUND',
          'The notification lead could not be loaded.',
          false,
        );
      }
      const result = await this.dependencies.sender.send(this.render(current, lead));
      const finishedAt = this.dependencies.clock.now();
      const sent: NotificationRecord = {
        ...sending,
        status: 'sent',
        providerMessageId: result.providerMessageId,
        sentAt: finishedAt,
        updatedAt: finishedAt,
      };
      const completedAttempt: NotificationAttemptRecord = {
        ...attempt,
        status: 'sent',
        providerMessageId: result.providerMessageId,
        finishedAt,
      };
      await this.dependencies.unitOfWork.execute(async () => {
        await this.dependencies.notifications.update(sent);
        await this.dependencies.attempts.update(completedAttempt);
      });
      return sent;
    } catch (error) {
      const failure = normalizeFailure(error);
      const finishedAt = this.dependencies.clock.now();
      const failed: NotificationRecord = {
        ...sending,
        status: 'failed',
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
        updatedAt: finishedAt,
      };
      const failedAttempt: NotificationAttemptRecord = {
        ...attempt,
        status: 'failed',
        errorCode: failure.code,
        errorMessage: failure.message,
        finishedAt,
      };
      await this.dependencies.unitOfWork.execute(async () => {
        await this.dependencies.notifications.update(failed);
        await this.dependencies.attempts.update(failedAttempt);
      });
      return failed;
    }
  }

  public async getDetails(id: string): Promise<NotificationDetails> {
    const notification = await this.requireNotification(id);
    return {
      notification,
      attempts: await this.dependencies.attempts.listByNotificationId(id),
    };
  }

  public async list(filter: NotificationListFilter = {}): Promise<readonly NotificationRecord[]> {
    const status = filter.status;
    if (status && !(notificationStatuses as readonly string[]).includes(status)) {
      throw new NotificationApplicationError(
        'INVALID_NOTIFICATION_FILTER',
        'Unknown notification status.',
        400,
        { status: ['Unknown notification status.'] },
      );
    }
    const notifications = await this.dependencies.notifications.list();
    return notifications
      .filter((notification) => !status || notification.status === status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  public listPending(): Promise<readonly NotificationRecord[]> {
    return this.dependencies.notifications.listPending();
  }

  private async requireNotification(id: string): Promise<NotificationRecord> {
    const notification = await this.dependencies.notifications.getById(id);
    if (!notification) {
      throw new NotificationApplicationError(
        'NOTIFICATION_NOT_FOUND',
        'Notification was not found.',
        404,
      );
    }
    return notification;
  }

  private render(notification: NotificationRecord, lead: LeadRecord): NotificationMessage {
    const kind = lead.leadType === 'project' ? 'project request' : 'contact enquiry';
    const subject = `New ${kind} from ${lead.name}`;
    const text = [
      subject,
      `Email: ${lead.email}`,
      lead.company ? `Company: ${lead.company}` : undefined,
      lead.subject ? `Subject: ${lead.subject}` : undefined,
      '',
      lead.message,
    ]
      .filter((value): value is string => value !== undefined)
      .join('\n');
    const html = `<h1>${escapeHtml(subject)}</h1><p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>${
      lead.company ? `<p><strong>Company:</strong> ${escapeHtml(lead.company)}</p>` : ''
    }${lead.subject ? `<p><strong>Subject:</strong> ${escapeHtml(lead.subject)}</p>` : ''}<p>${escapeHtml(
      lead.message,
    ).replaceAll('\n', '<br>')}</p>`;

    return {
      from: this.dependencies.fromAddress,
      to: notification.recipient,
      subject,
      text,
      html,
      idempotencyKey: notification.deduplicationKey,
    };
  }
}

function clearFailure(notification: NotificationRecord): NotificationRecord {
  const { lastErrorCode: _code, lastErrorMessage: _message, ...rest } = notification;
  return rest;
}

function normalizeFailure(error: unknown): NotificationSenderError {
  if (error instanceof NotificationSenderError) return error;
  return new NotificationSenderError(
    'NOTIFICATION_DELIVERY_FAILED',
    'Notification delivery failed.',
    true,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
