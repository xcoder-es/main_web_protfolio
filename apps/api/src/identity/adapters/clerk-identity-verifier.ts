import { createClerkClient } from '@clerk/backend';

import {
  IdentityVerificationError,
  type AuthenticatedPrincipal,
  type IdentityVerificationRequest,
  type IdentityVerifier,
} from '../application/ports.js';

export type ClerkAuthState = Readonly<{
  isAuthenticated: boolean;
  toAuth(): Readonly<{
    userId?: string | null;
    sessionId?: string | null;
  }>;
}>;

export type ClerkUser = Readonly<{
  primaryEmailAddressId?: string | null;
  emailAddresses: readonly Readonly<{
    id: string;
    emailAddress: string;
  }>[];
}>;

export type ClerkClientGateway = Readonly<{
  authenticateRequest(
    request: Request,
    options: Readonly<{ authorizedParties?: readonly string[] }>,
  ): Promise<ClerkAuthState>;
  users: Readonly<{
    getUser(userId: string): Promise<ClerkUser>;
  }>;
}>;

export type ClerkIdentityConfig = Readonly<{
  secretKey: string;
  publishableKey: string;
  jwtKey?: string;
  authorizedParties: readonly string[];
  resolvePrimaryEmail: boolean;
}>;

export class ClerkIdentityVerifier implements IdentityVerifier {
  public constructor(
    private readonly client: ClerkClientGateway,
    private readonly authorizedParties: readonly string[],
    private readonly resolvePrimaryEmail: boolean,
  ) {}

  public async verify(
    input: IdentityVerificationRequest,
  ): Promise<AuthenticatedPrincipal | null> {
    let state: ClerkAuthState;
    try {
      const request = new Request(input.url, {
        method: input.method,
        headers: new Headers(
          Object.entries(input.headers).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        ),
      });
      state = await this.client.authenticateRequest(request, {
        authorizedParties: this.authorizedParties,
      });
    } catch {
      throw new IdentityVerificationError(
        'IDENTITY_PROVIDER_UNAVAILABLE',
        'The identity provider could not validate the request.',
        503,
      );
    }

    if (!state.isAuthenticated) return null;
    const auth = state.toAuth();
    if (!auth.userId || !auth.sessionId) return null;

    let primaryEmail: string | undefined;
    if (this.resolvePrimaryEmail) {
      try {
        const user = await this.client.users.getUser(auth.userId);
        const primary = user.emailAddresses.find(
          (email) => email.id === user.primaryEmailAddressId,
        );
        primaryEmail = primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
      } catch {
        throw new IdentityVerificationError(
          'IDENTITY_PROVIDER_UNAVAILABLE',
          'The identity provider could not load the authenticated user.',
          503,
        );
      }
    }

    return {
      userId: auth.userId,
      sessionId: auth.sessionId,
      ...(primaryEmail ? { primaryEmail: primaryEmail.toLowerCase() } : {}),
      provider: 'clerk',
    };
  }
}

export function createClerkIdentityVerifier(config: ClerkIdentityConfig): ClerkIdentityVerifier {
  const client = createClerkClient({
    secretKey: config.secretKey,
    publishableKey: config.publishableKey,
    ...(config.jwtKey ? { jwtKey: config.jwtKey } : {}),
  }) as unknown as ClerkClientGateway;

  return new ClerkIdentityVerifier(
    client,
    config.authorizedParties,
    config.resolvePrimaryEmail,
  );
}
