export class LeadApplicationError extends Error {
  public constructor(
    public readonly code:
      | 'LEAD_NOT_FOUND'
      | 'INVALID_LEAD_TRANSITION'
      | 'INVALID_LEAD_NOTE'
      | 'INVALID_LEAD_FILTER',
    message: string,
    public readonly statusCode: number,
    public readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
    this.name = 'LeadApplicationError';
  }
}
