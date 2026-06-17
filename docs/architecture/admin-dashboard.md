# Mobile-first administrator dashboard

The administrator workspace is a static Astro route at `/admin`. It contains no business data at build time. ClerkJS handles browser sign-in, while the Fastify API verifies every session and applies the administrator allowlist before any protected operation runs.

## Boundaries

1. The static site receives only public browser configuration.
2. ClerkJS manages the browser session.
3. Cross-origin requests obtain a short-lived session token and send it as a Bearer token.
4. The API verifies identity, authorized frontend origin and administrator access.
5. Provider credentials and database credentials remain server-side.

The HTML shell is public and noindexed. Leads, notifications, payments, audit events and diagnostics remain inaccessible until the API authorizes the request.

Official references:

- https://clerk.com/docs/js-frontend/getting-started/quickstart
- https://clerk.com/docs/js-frontend/reference/components/authentication/sign-in
- https://clerk.com/docs/guides/development/making-requests

## Operational views

The dashboard provides:

- operational totals and recent activity;
- lead search, filtering, export, detail, notes and status actions;
- email, phone and WhatsApp shortcuts;
- notification attempt history and retry;
- fixed payment request creation, activation, cancellation, sharing and history;
- global audit filtering;
- secret-free service diagnostics.

The browser remains a thin client over existing application services. Domain transitions and authorization decisions remain server responsibilities.

## Mobile interaction

Below 820 pixels, navigation becomes a fixed five-action bottom bar with safe-area padding. Touch controls remain large, views collapse to one column and lead detail follows the list. Android, tablet and desktop use the same application.

No polling or artificial keepalive traffic is introduced. Refresh occurs after sign-in, explicit refresh or successful mutations.

## Environment setup

The static site requires its canonical origin, API origin and Clerk publishable key. The API requires matching Clerk identity configuration, an exact authorized frontend origin and an administrator user or email allowlist.

Staging and Production should use separate environment configuration and independently maintained allowlists.

## Failure behaviour

- Missing browser identity configuration shows a setup panel and no data.
- A signed-in identity outside the allowlist sees access denied.
- An expired session signs out and returns to `/admin`.
- Disabled providers appear in diagnostics without breaking unrelated workflows.
- API errors display stable messages and correlation IDs rather than provider payloads.

## Mobile recovery

On a replacement phone, open `/admin`, sign in with the same verified identity and complete the configured recovery or second-factor flow. Revoke the lost-device session in the Clerk Dashboard. No application data or API authorization rule needs to be disabled.
