export type AuthenticatedPrincipal = Readonly<{
  userId: string;
  sessionId: string;
  primaryEmail?: string;
  provider: 'clerk';
}>;

export type IdentityVerificationRequest = Readonly<{
  url: string;
  method: string;
  headers: Readonly<Record<string, string | undefined>>;
}>;

export interface IdentityVerifier {
  verify(request: IdentityVerificationRequest): Promise<AuthenticatedPrincipal | null>;
}

export class IdentityVerificationError extends Error {
  public constructor(
    public readonly code: 'IDENTITY_PROVIDER_UNAVAILABLE' | 'IDENTITY_CONFIGURATION_ERROR',
    message: string,
    public readonly statusCode: 500 | 503,
  ) {
    super(message);
    this.name = 'IdentityVerificationError';
  }
}
