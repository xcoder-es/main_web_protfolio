import {
  NotificationSenderError,
  type NotificationMessage,
  type NotificationSender,
  type NotificationSendResult,
} from '../application/ports.js';

export class DisabledNotificationSender implements NotificationSender {
  public async send(_message: NotificationMessage): Promise<NotificationSendResult> {
    throw new NotificationSenderError(
      'NOTIFICATION_SENDER_DISABLED',
      'Notification delivery is disabled.',
      true,
    );
  }
}
