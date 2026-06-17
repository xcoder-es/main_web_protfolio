# Self-hosted forms and layered spam protection

The contact and project-request journeys submit directly from the static Astro site to the Fastify API. No third-party form relay owns or stores the enquiry workflow.

## Request path

1. The static page remains readable while the API is sleeping.
2. The first form interaction sends one lightweight request to `/api/public/status` to wake the Render API.
3. The browser validates with the same Zod contracts used by the API.
4. A browser-generated idempotency key remains stable across retries.
5. The API validates payload size, schema, route rate limits, honeypot and completion timing.
6. When enabled, the `SpamVerifier` port delegates to Cloudflare Turnstile.
7. The lead is persisted before notification delivery is attempted.
8. Notification failure remains an administrator-retry concern and never changes a successful lead submission into a failed visitor response.

The client does not poll or send artificial keepalive traffic.

## Idempotency

The internal lead repository owns the uniqueness guarantee for browser idempotency keys. `PublicSubmissionService` checks for an existing lead before consuming an external challenge token. This is important because Turnstile tokens are single-use. A retry after persistence returns the existing lead without a second verification request.

## Local controls

- Contact payload limit: 12 KiB.
- Project-request payload limit: 24 KiB.
- Contact route limit: 5 submissions per 10 minutes per rate-limit key.
- Project route limit: 3 submissions per 10 minutes per rate-limit key.
- Hidden honeypot field: `website`.
- Default minimum completion time: 1,200 ms.
- Default challenge-backed form lifetime: 7,200,000 ms.
- Global API body and rate limits remain in force as outer controls.

These controls reduce low-effort automation but do not pretend that browser-visible techniques are authoritative. Provider verification and durable idempotency are enforced on the server.

## Turnstile adapter

`TurnstileSpamVerifier` is the only module that understands Cloudflare's request and response shape. Application code depends on the internal `SpamVerifier` port.

When Turnstile is configured, the adapter:

- calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` over HTTPS;
- sends the server secret, browser response token and requesting IP address;
- validates the expected widget action;
- validates an exact configured hostname allowlist;
- treats network, invalid-response and non-success provider responses as controlled unavailable or rejected states;
- never logs or persists the challenge token or secret.

Official references:

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

## Environment configuration

Public Astro variable:

- `PUBLIC_TURNSTILE_SITE_KEY`: environment-specific widget site key. Leave empty to render no widget.

Private Fastify variables:

- `SPAM_VERIFICATION_ENABLED=true`
- `TURNSTILE_SECRET_KEY`: matching environment secret stored only in Render's secret controls
- `TURNSTILE_ALLOWED_HOSTNAMES`: comma-separated exact hostnames without schemes or paths
- `TURNSTILE_SITEVERIFY_URL`: optional official-endpoint override for testing
- `FORM_MINIMUM_COMPLETION_MS`
- `FORM_MAXIMUM_COMPLETION_MS`

Staging and Production must use separate Turnstile widgets, site keys, secrets and exact hostnames. Never place `TURNSTILE_SECRET_KEY` in an Astro `PUBLIC_` variable or repository file.

## Render setup

The public static site and API are separate services. Set `PUBLIC_API_URL` on the static site to the matching Staging or Production API origin. Set the API origin in `CORS_ORIGINS` on the API service.

A free Render web service can spin down after inactivity. The form controller sends one wake request when the visitor begins interacting, allowing the API to start while the visitor completes the form. The submit action still handles a slow or unavailable API with a retryable message.

Official reference:

- https://render.com/docs/free

## Disabled and failure behaviour

- With Turnstile disabled, honeypot, timing, schema, payload, rate-limit and idempotency controls remain active.
- With Turnstile enabled but unavailable, new submissions fail closed with `503 SPAM_VERIFICATION_UNAVAILABLE`; no lead is saved.
- Rejected challenges return `400 SPAM_VERIFICATION_FAILED`; the browser resets the widget for another attempt.
- Duplicate requests already persisted remain successful even if the original one-time token has expired.
- Notification-provider failure leaves the lead persisted and the notification marked failed for later administrator retry.

## Accessible interaction

Both forms provide explicit labels, native required constraints, field-linked error messages, an aria-live status region, visible focus states, keyboard-compatible controls and responsive layouts. JavaScript-disabled visitors receive direct email instructions instead of a broken form.
