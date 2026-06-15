import type {
  AuthenticatedPrincipal,
  IdentityVerificationRequest,
  IdentityVerifier,
} from '../../src/identity/application/ports.js';

export const administratorPrincipal: AuthenticatedPrincipal = {
  userId: 'user_admin_123',
  sessionId: 'sess_admin_123',
  primaryEmail: 'admin@example.com',
  provider: 'clerk',
};

export const nonAdministratorPrincipal: AuthenticatedPrincipal = {
  userId: 'user_other_456',
  sessionId: 'sess_other_456',
  primaryEmail: 'other@example.com',
  provider: 'clerk',
};

export const administratorHeaders = {
  authorization: 'Bearer valid-admin-token',
} as const;

export class TestIdentityVerifier implements IdentityVerifier {
  public async verify(
    request: IdentityVerificationRequest,
  ): Promise<AuthenticatedPrincipal | null> {
    if (request.headers.authorization === 'Bearer valid-admin-token') {
      return administratorPrincipal;
    }
    if (request.headers.authorization === 'Bearer valid-other-token') {
      return nonAdministratorPrincipal;
    }
    return null;
  }
}

export function administratorIdentityOverrides() {
  return {
    identityVerifier: new TestIdentityVerifier(),
    administratorUserIds: [administratorPrincipal.userId],
  } as const;
}
