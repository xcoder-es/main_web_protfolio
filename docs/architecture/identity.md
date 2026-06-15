# Administrator identity and Clerk boundary

All routes below `/api/admin` are fail-closed. Public submission, health, readiness and webhook route groups remain outside the administrator authentication plugin.

## Architecture

`IdentityVerifier` is an application-owned port that returns an `AuthenticatedPrincipal` containing only the Clerk user ID, session ID and optional primary email address. Domain and application modules never import Clerk.

`ClerkIdentityVerifier` uses Clerk's backend `authenticateRequest()` helper and passes the configured `authorizedParties`. A public JWT key can be supplied for networkless signature validation. When administrator authorization uses email addresses, the adapter resolves the authenticated Clerk user and reads the primary email address through the backend user API.

Authentication and authorization are separate:

1. Clerk validates the session token.
2. `AdministratorAuthorizer` checks an explicit user-ID or normalized email allowlist.
3. The verified principal is stored in request-scoped context.
4. Administrator audit events use the verified Clerk user ID.

Missing or invalid identities return `401 AUTHENTICATION_REQUIRED`. Authenticated identities outside the allowlist return `403 ADMIN_ACCESS_FORBIDDEN`. Missing Clerk configuration returns `503 IDENTITY_CONFIGURATION_ERROR` rather than allowing anonymous access.

## Required Render variables

Set these separately in Staging and Production:

- `IDENTITY_ENABLED=true`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_JWT_KEY` when using networkless verification
- `CLERK_AUTHORIZED_PARTIES`, as comma-separated exact frontend origins
- `CLERK_ADMIN_USER_IDS` and/or `CLERK_ADMIN_EMAILS`

Never expose `CLERK_SECRET_KEY` through an Astro `PUBLIC_` variable. Do not use wildcard authorized parties or administrator allowlists.

## Mobile setup

The application remains responsive on mobile, tablet and desktop. These steps describe performing administration from an Android browser, not limiting the application to phones.

1. Open the Clerk Dashboard and select the correct Staging or Production instance.
2. Configure the intended sign-in method, preferably verified email with a strong password or email-code flow.
3. Add the exact Staging and Production frontend origins and redirect URLs.
4. Open **Users**, select the administrator account and copy its Clerk user ID.
5. Add that ID to `CLERK_ADMIN_USER_IDS` in the matching Render environment.
6. Add the exact frontend origin to `CLERK_AUTHORIZED_PARTIES`.
7. Save the Clerk keys in Render's secret environment-variable controls.
8. Confirm `/ready` reports identity as ready before testing an administrator workflow.

The protected frontend sign-in experience is added with the administrator web application. The API already expects the Clerk session token as `Authorization: Bearer <token>`.

## Recovery and incident procedure

- If a password is forgotten, use Clerk's configured password-reset or verified-email recovery flow from the sign-in screen.
- If a phone is lost, sign in on a replacement device through the same verified identity. The account is not tied to one handset.
- From the Clerk Dashboard, revoke active sessions for a lost or compromised device before using the administrator application again.
- Rotate the Clerk secret key in Clerk and Render if a server credential may have leaked.
- Remove compromised user IDs or emails from the Render allowlist immediately.
- Keep at least one separately secured recovery method for the administrator identity. Do not create a shared administrator account.

A recovery action must never require changing domain data or disabling authentication on the API.
