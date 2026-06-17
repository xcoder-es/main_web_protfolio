import type { FastifyRequest } from 'fastify';

import type { AuthenticatedPrincipal } from '../identity/application/ports.js';

const principals = new WeakMap<FastifyRequest, AuthenticatedPrincipal>();

export function setAuthenticatedPrincipal(
  request: FastifyRequest,
  principal: AuthenticatedPrincipal,
): void {
  principals.set(request, principal);
}

export function getAuthenticatedPrincipal(
  request: FastifyRequest,
): AuthenticatedPrincipal | undefined {
  return principals.get(request);
}

export function requireAuthenticatedPrincipal(request: FastifyRequest): AuthenticatedPrincipal {
  const principal = principals.get(request);
  if (!principal) throw new Error('Authenticated principal is missing from the request context.');
  return principal;
}
