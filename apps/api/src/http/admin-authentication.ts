import type { FastifyReply, FastifyRequest } from 'fastify';

import { IdentityAccessError } from '../identity/application/authorization.js';
import type { AdministratorAuthorizer } from '../identity/application/authorization.js';
import type { IdentityVerifier } from '../identity/application/ports.js';
import { setAuthenticatedPrincipal } from './identity-context.js';

export function createAdministratorAuthentication(
  verifier: IdentityVerifier,
  authorizer: AdministratorAuthorizer,
) {
  return async function authenticateAdministrator(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const principal = await verifier.verify({
      url: `${request.protocol}://${request.headers.host ?? 'localhost'}${request.raw.url ?? request.url}`,
      method: request.method,
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([name, value]) => [
          name,
          Array.isArray(value) ? value[0] : value,
        ]),
      ),
    });

    if (!principal) {
      throw new IdentityAccessError(
        'AUTHENTICATION_REQUIRED',
        'Administrator authentication is required.',
        401,
      );
    }

    if (!authorizer.isAllowed(principal)) {
      throw new IdentityAccessError(
        'ADMIN_ACCESS_FORBIDDEN',
        'The authenticated identity is not an administrator.',
        403,
      );
    }

    setAuthenticatedPrincipal(request, principal);
  };
}
