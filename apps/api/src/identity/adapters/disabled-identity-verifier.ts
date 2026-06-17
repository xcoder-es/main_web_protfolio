import {
  IdentityVerificationError,
  type AuthenticatedPrincipal,
  type IdentityVerificationRequest,
  type IdentityVerifier,
} from '../application/ports.js';

export class DisabledIdentityVerifier implements IdentityVerifier {
  public async verify(
    _request: IdentityVerificationRequest,
  ): Promise<AuthenticatedPrincipal | null> {
    throw new IdentityVerificationError(
      'IDENTITY_CONFIGURATION_ERROR',
      'Administrator identity is not configured.',
      503,
    );
  }
}
