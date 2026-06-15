# ADR 0004: Resend delivers email through an outbound port

- Status: Accepted
- Date: 2026-06-15

## Context

Carlos needs prompt notification of new enquiries, but a valid lead must never be lost because email delivery fails. Render Free blocks common outbound SMTP ports, and the initial budget is zero.

Official references:

- https://resend.com/pricing
- https://resend.com/docs/api-reference/emails
- https://resend.com/docs/dashboard/emails/idempotency-keys

## Decision

Use the Resend HTTPS API behind the `NotificationSender` port. Persist a pending notification before attempting provider delivery. The database remains the source of truth for notification state and attempt history.

Use a deterministic provider idempotency key for each logical message. Resend keeps idempotency keys for 24 hours, while the application retains its own deduplication record without relying on that provider window.

## Consequences

Benefits:

- Compatible with Render Free networking.
- Free allowance supports initial low-volume operation.
- Provider idempotency reduces accidental duplicate email.
- Failed delivery can be retried manually.

Costs:

- Free is limited to 3,000 emails per month, 100 per day and one domain.
- Resend retains dashboard data for 30 days on Free.
- Delivery depends on domain verification and external API availability.

## Replacement seam

`NotificationSender` accepts an application-owned message and returns an application-owned result. Resend payloads and identifiers stay inside its outbound adapter.

## Disabled and failure behaviour

When Resend is absent, `DisabledNotificationSender` records a controlled failed or skipped attempt. Lead submission still succeeds after persistence. Quota, timeout and provider errors never alter the saved lead result.

## Operations

- Alert before daily or monthly quota exhaustion.
- Keep notification history in PostgreSQL.
- Never log API keys or full sensitive message bodies.
- Retry with the same logical deduplication key when the payload is unchanged.
