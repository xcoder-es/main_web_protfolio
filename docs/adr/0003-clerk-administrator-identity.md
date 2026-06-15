# ADR 0003: Clerk authenticates administrators only

- Status: Accepted
- Date: 2026-06-15

## Context

Visitors must submit enquiries without creating accounts. Only Carlos and explicitly authorised administrators need protected access. The platform must not build or store its own passwords.

Official references:

- https://clerk.com/pricing
- https://clerk.com/docs/reference/backend/authenticate-request
- https://clerk.com/docs/guides/sessions/session-tokens
- https://clerk.com/docs/reference/backend/user/get-user

## Decision

Use Clerk for administrator authentication only. The API verifies Clerk session tokens behind the `IdentityVerifier` port and maps successful verification to the internal `AuthenticatedPrincipal` type.

Authorisation is separate from authentication. A configured allowlist of administrator subjects or email addresses determines access to administrator use cases.

## Verification rules

- Use `authenticateRequest()` for HTTP request authentication.
- Validate the token signature and expiry on the API.
- Configure `authorizedParties` for the expected frontend origins.
- Use the JWT public key for networkless verification when operationally preferable.
- Resolve the Clerk user only when email-based authorisation is configured.
- Never pass Clerk SDK objects, raw claims or tokens into domain code.

## Consequences

Benefits:

- No custom password or session implementation.
- Public visitors remain frictionless.
- User-ID allowlists avoid an additional user lookup on every request.

Costs:

- Clerk branding remains on Hobby prebuilt interfaces.
- Authentication availability depends on Clerk and token-verification configuration.
- Email allowlists require a backend user lookup unless email is added to a trusted custom claim.
- Provider claims require an explicit translation layer.

## Replacement seam

`IdentityVerifier` returns an application-owned principal. Another OpenID Connect or JWT identity provider can replace Clerk without changing protected use cases.

## Disabled and failure behaviour

Authentication cannot be silently disabled. If Clerk is not configured, public routes remain available but administrator routes return a clear service-configuration error. Invalid or unauthorised principals receive stable 401 or 403 responses without provider details.
