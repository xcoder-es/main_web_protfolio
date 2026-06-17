export class PublicSubmissionError extends Error {
  public constructor(
    public readonly code:
      | 'SUBMISSION_REJECTED'
      | 'SUBMISSION_EXPIRED'
      | 'SPAM_VERIFICATION_FAILED'
      | 'SPAM_VERIFICATION_UNAVAILABLE',
    message: string,
    public readonly statusCode: number,
    public readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
    this.name = 'PublicSubmissionError';
  }
}
