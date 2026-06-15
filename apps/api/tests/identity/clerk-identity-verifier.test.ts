import { describe, expect, it } from 'vitest';

import {
  ClerkIdentityVerifier,
  type ClerkClientGateway,
} from '../../src/identity/adapters/clerk-identity-verifier.js';

function request(headers: Record<string, string | undefined> = {}) {
  return {
    url: 'https://api.example.com/api/admin/status',
    method: 'GET',
    headers,
  } as const;
}

describe('ClerkIdentityVerifier', () => {
  it('authenticates the request, forwards authorized parties and resolves the primary email', async () => {
    const calls: Array<{ request: Request; authorizedParties?: readonly string[] }> = [];
    const client: ClerkClientGateway = {
      async authenticateRequest(clerkRequest, options) {
        calls.push({
          request: clerkRequest,
          ...(options.authorizedParties
            ? { authorizedParties: options.authorizedParties }
            : {}),
        });
        return {
          isAuthenticated: true,
          toAuth: () => ({ userId: 'user_123', sessionId: 'sess_123' }),
        };
      },
      users: {
        async getUser(userId) {
          expect(userId).toBe('user_123');
          return {
            primaryEmailAddressId: 'email_primary',
            emailAddresses: [
              { id: 'email_other', emailAddress: 'other@example.com' },
              { id: 'email_primary', emailAddress: 'ADMIN@EXAMPLE.COM' },
            ],
          };
        },
      },
    };
    const verifier = new ClerkIdentityVerifier(
      client,
      ['https://portfolio.example.com'],
      true,
    );

    const principal = await verifier.verify(
      request({ authorization: 'Bearer clerk-session-token' }),
    );

    expect(principal).toEqual({
      userId: 'user_123',
      sessionId: 'sess_123',
      primaryEmail: 'admin@example.com',
      provider: 'clerk',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.request.headers.get('authorization')).toBe(
      'Bearer clerk-session-token',
    );
    expect(calls[0]?.authorizedParties).toEqual(['https://portfolio.example.com']);
  });

  it('returns null for unauthenticated or incomplete Clerk auth states', async () => {
    const unauthenticated: ClerkClientGateway = {
      async authenticateRequest() {
        return { isAuthenticated: false, toAuth: () => ({}) };
      },
      users: { async getUser() { throw new Error('must not be called'); } },
    };
    const incomplete: ClerkClientGateway = {
      async authenticateRequest() {
        return {
          isAuthenticated: true,
          toAuth: () => ({ userId: 'user_123', sessionId: null }),
        };
      },
      users: { async getUser() { throw new Error('must not be called'); } },
    };

    await expect(
      new ClerkIdentityVerifier(unauthenticated, [], false).verify(request()),
    ).resolves.toBeNull();
    await expect(
      new ClerkIdentityVerifier(incomplete, [], false).verify(request()),
    ).resolves.toBeNull();
  });

  it('maps Clerk validation and user lookup failures to controlled service errors', async () => {
    const validationFailure: ClerkClientGateway = {
      async authenticateRequest() {
        throw new Error('network detail');
      },
      users: { async getUser() { throw new Error('must not be called'); } },
    };
    const lookupFailure: ClerkClientGateway = {
      async authenticateRequest() {
        return {
          isAuthenticated: true,
          toAuth: () => ({ userId: 'user_123', sessionId: 'sess_123' }),
        };
      },
      users: { async getUser() { throw new Error('provider detail'); } },
    };

    await expect(
      new ClerkIdentityVerifier(validationFailure, [], false).verify(request()),
    ).rejects.toMatchObject({
      code: 'IDENTITY_PROVIDER_UNAVAILABLE',
      statusCode: 503,
    });
    await expect(
      new ClerkIdentityVerifier(lookupFailure, [], true).verify(request()),
    ).rejects.toMatchObject({
      code: 'IDENTITY_PROVIDER_UNAVAILABLE',
      statusCode: 503,
    });
  });
});
