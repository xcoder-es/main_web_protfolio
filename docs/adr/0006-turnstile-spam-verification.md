# ADR 0006: Turnstile is an optional spam-verification adapter

- Status: Accepted
- Date: 2026-06-15

## Context

Public forms need layered abuse protection without making a third-party challenge mandatory for local development or initial configuration. The platform already requires honeypot, timing, request-size and rate-limit controls.

Official references:

- https://developers.cloudflare.com/turnstile/plans/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## Decision

Use Cloudflare Turnstile behind the `SpamVerifier` port when site and secret keys are configured. Keep the other passive controls active regardless of Turnstile state.

The browser sends the generated token to the API. The API alone calls Siteverify and validates success, expected action and expected hostname where configured. Siteverify requests use an idempotency key when retried.

## Confirmed constraints

- Free includes up to 20 widgets and unlimited challenges.
- Each free widget supports up to 10 hostnames.
- Free analytics lookback is seven days.
- Tokens are valid for 300 seconds and are single-use.
- Server-side verification is mandatory.

## Consequences

Benefits:

- No charge for the expected traffic profile.
- It can be used without routing the site through Cloudflare.
- WCAG 2.2 AAA support is included.
- Unlimited verification requests avoid a per-challenge cost risk.

Costs:

- Cloudflare branding cannot be removed on Free.
- Expired tokens require a widget reset and another submission attempt.
- Siteverify availability affects configured form submissions.

## Replacement seam

`SpamVerifier` returns an application-owned verification result. Cloudflare field names, actions and error codes remain in the adapter.

## Disabled and failure behaviour

When Turnstile is not configured, the disabled adapter reports that no provider challenge is required and the remaining spam controls still execute. Once production configuration marks Turnstile as required, a provider outage or invalid token fails verification explicitly. The API must never silently accept a failed configured challenge.

## Security rules

- Keep the secret key server-side.
- Never trust client-only widget success.
- Apply a request timeout and controlled retry policy.
- Do not expose provider internals in public errors.
- Rate limit the form endpoint and Siteverify attempts.
