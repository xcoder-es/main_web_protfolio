export class NotificationApplicationError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
    this.name = 'NotificationApplicationError';
  }
}
