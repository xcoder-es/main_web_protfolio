export type NotificationMessage = Readonly<{
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}>;

export type NotificationSendResult = Readonly<{
  providerMessageId: string;
}>;

export interface NotificationSender {
  send(message: NotificationMessage): Promise<NotificationSendResult>;
}

export class NotificationSenderError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'NotificationSenderError';
  }
}
