# Verified provider baseline

**Verification date:** 2026-06-15

This document records the official provider constraints used to design the first production release. Pricing, quotas and product behaviour can change. Recheck the linked official source and the account dashboard before enabling production traffic.

## Decision summary

| Capability             | Initial provider          | Zero-budget position                                | Application boundary              |
| ---------------------- | ------------------------- | --------------------------------------------------- | --------------------------------- |
| Static frontend        | Render Static Site        | Suitable                                            | Deployment configuration only     |
| API hosting            | Render Free Web Service   | Suitable with cold-start constraints                | Deployment configuration only     |
| PostgreSQL             | Supabase Free             | Suitable for initial low-volume operation           | Repository and unit-of-work ports |
| Administrator identity | Clerk Hobby               | Suitable for a very small administrator allowlist   | `IdentityVerifier` port           |
| Email notifications    | Resend Free               | Suitable within daily and monthly limits            | `NotificationSender` port         |
| Payments               | PayPal Checkout           | No fixed hosting dependency, transaction fees apply | `PaymentGateway` port             |
| Bot verification       | Cloudflare Turnstile Free | Suitable and optional                               | `SpamVerifier` port               |

## Render

Official sources:

- https://render.com/docs/free
- https://render.com/docs/static-sites
- https://render.com/docs/blueprint-spec
- https://render.com/docs/faq

Confirmed constraints:

- A free web service spins down after 15 minutes without inbound traffic.
- The next request starts the service again and startup takes about one minute.
- Each workspace receives 750 free instance hours per calendar month.
- Free web services have an ephemeral filesystem and no persistent disks.
- Free web services do not include edge caching, shell access, scaling beyond one instance or inbound private-network traffic.
- Outbound SMTP ports 25, 465 and 587 are blocked on free web services. Notification delivery must use the Resend HTTPS API.
- Static sites include managed TLS, HTTP/2, Brotli compression and DDoS protection.
- Blueprint secrets must use `sync: false`. Render prompts for those values only during the initial Blueprint creation. Later secrets must be entered manually in the dashboard.

Architecture consequence:

- The public Astro site must remain fully useful while the API sleeps.
- Form journeys may issue a real readiness request while the visitor is completing the form, but the platform must not send artificial keep-alive traffic.
- No durable state can be written to the Render filesystem.

## Supabase

Official sources:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security

Confirmed Free plan baseline:

- Two active free projects across organizations where the user is an owner or administrator.
- 500 MB database size per project.
- 50,000 monthly active users.
- 5 GB uncached egress and 5 GB cached egress.
- 1 GB file storage.
- Free projects can be paused after one week of inactivity.
- Automatic backups are not included in the Free plan.

Security consequence:

- New Supabase secret keys, or legacy `service_role` keys, are server-only credentials and can bypass Row Level Security.
- The browser must never receive a secret or service-role key.
- Private tables must enable RLS and expose no anonymous browser policy.
- The API owns persistence. Supabase remains an outbound adapter behind repository ports.

Operational consequence:

- SQL migrations must be committed and executable from the Supabase SQL Editor on a phone.
- Export procedures are required because the Free plan does not include automatic backups.
- Readiness diagnostics must distinguish a paused or unreachable Supabase project from an application fault.

## Clerk

Official sources:

- https://clerk.com/pricing
- https://clerk.com/docs/reference/backend/verify-token

Confirmed Hobby baseline:

- Base price is zero.
- 50,000 monthly retained users are included per application.
- Applications are unlimited.
- Up to three Clerk dashboard seats are included.
- Removing Clerk branding is not included on Hobby.
- Clerk session tokens can be verified by the backend with `verifyToken`.
- Token verification supports `authorizedParties`, audience checks, clock skew and networkless verification with the JWT public key.

Architecture consequence:

- Clerk authenticates administrators only. Public visitors do not need an account.
- Clerk SDK objects and claims must be mapped to the internal `AuthenticatedPrincipal` type.
- Authorisation remains an application concern through a configured administrator email or subject allowlist.
- The adapter should validate authorised parties to reduce subdomain cookie leakage risk.

## Resend

Official sources:

- https://resend.com/pricing
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/docs/api-reference/emails

Confirmed Free plan baseline:

- 3,000 emails per month.
- 100 emails per day.
- One sending domain.
- 30-day data retention in Resend.
- HTTPS API and inbound email capabilities are included.
- Resend idempotency keys are retained for 24 hours and can be sent through the `Idempotency-Key` header.

Architecture consequence:

- Use the HTTPS API, not SMTP, because Render Free blocks common SMTP ports.
- The database notification record is the source of truth. Resend retention is not an operational archive.
- Lead persistence must succeed even when Resend is unavailable or the quota is exhausted.
- Notification deduplication must exist in the database and also use Resend idempotency keys as a provider-level safeguard.

## PayPal

Official sources:

- https://developer.paypal.com/api/rest/integration/orders-api/
- https://developer.paypal.com/reference/guidelines/idempotency/
- https://developer.paypal.com/docs/api/webhooks/v1/
- https://developer.paypal.com/api/rest/webhooks/event-names
- https://www.paypal.com/es/business/paypal-business-fees

Confirmed integration baseline:

- Orders API v2 supports create, approval and capture flows.
- Server-side POST retries should use the `PayPal-Request-Id` header.
- Webhook signatures can be verified with PayPal's verify-webhook-signature API.
- Capture completion should be confirmed from server responses and relevant webhook events such as `PAYMENT.CAPTURE.COMPLETED`.
- Sandbox and live credentials are separate.

Confirmed Spanish fee baseline, last updated by PayPal on 2026-02-09:

- Standard domestic commercial transactions: 2.90% plus the fixed fee.
- Fixed fee when receiving EUR: EUR 0.35.
- Additional international percentage: no additional fee for EEA senders, 1.29% for United Kingdom senders and 1.99% for other markets.

Architecture consequence:

- PayPal is not a zero-cost transaction processor. The platform has no paid deployment dependency, but every live payment can incur PayPal fees.
- Amount and currency come from the persisted payment request, never from browser input.
- Provider access tokens remain transient and are never persisted.
- Webhook event IDs and provider order IDs require unique constraints.

## Cloudflare Turnstile

Official sources:

- https://developers.cloudflare.com/turnstile/plans/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

Confirmed Free plan baseline:

- Up to 20 widgets per account.
- Unlimited challenges and verification requests.
- Up to 10 hostnames per widget.
- Seven days of analytics lookback.
- Turnstile can operate independently of other Cloudflare services.
- Cloudflare branding cannot be removed on Free.
- Free includes WCAG 2.2 AAA compliance.

Validation constraints:

- Server-side Siteverify validation is mandatory.
- Tokens are valid for 300 seconds and are single-use.
- Siteverify accepts an optional idempotency key for safe retries.
- The backend should validate expected hostname and action when configured.

Architecture consequence:

- Turnstile is an optional adapter. When it is not configured, honeypot, timing, request-size and rate-limit controls remain active.
- A configured Turnstile outage should return a controlled verification failure rather than bypassing verification silently.
- The secret key remains server-only.

## Review triggers

Reverify this document when any of the following occurs:

- A provider announces pricing or plan changes.
- The application approaches 70% of a quota.
- The project moves from demonstration traffic to regular commercial use.
- A provider adapter is upgraded across a major SDK or API version.
- A production incident suggests the documented behaviour has changed.
