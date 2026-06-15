export const notificationStatuses = ['pending', 'sending', 'sent', 'failed', 'skipped'] as const;
export type NotificationStatus = (typeof notificationStatuses)[number];

export const notificationAttemptStatuses = ['sending', 'sent', 'failed', 'skipped'] as const;
export type NotificationAttemptStatus = (typeof notificationAttemptStatuses)[number];

const allowedTransitions: Readonly<Record<NotificationStatus, readonly NotificationStatus[]>> = {
  pending: ['sending', 'failed', 'skipped'],
  sending: ['sent', 'failed', 'skipped'],
  sent: [],
  failed: ['sending'],
  skipped: [],
};

export class NotificationDomainError extends Error {
  public constructor(
    public readonly code: 'INVALID_NOTIFICATION_TRANSITION',
    message: string,
  ) {
    super(message);
    this.name = 'NotificationDomainError';
  }
}

export function assertNotificationTransition(
  from: NotificationStatus,
  to: NotificationStatus,
): void {
  if (from === to) return;
  if (!allowedTransitions[from].includes(to)) {
    throw new NotificationDomainError(
      'INVALID_NOTIFICATION_TRANSITION',
      `Notification status cannot change from ${from} to ${to}.`,
    );
  }
}
