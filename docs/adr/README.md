# Architecture decision records

Architecture decisions record context, the selected approach, consequences, provider replacement seams and controlled failure behaviour.

## Accepted decisions

1. [ADR 0001: Render hosts the static frontend and API](0001-render-hosting.md)
2. [ADR 0002: Supabase PostgreSQL behind repository ports](0002-supabase-persistence.md)
3. [ADR 0003: Clerk authenticates administrators only](0003-clerk-administrator-identity.md)
4. [ADR 0004: Resend delivers email through an outbound port](0004-resend-notifications.md)
5. [ADR 0005: PayPal Orders v2 handles payment requests](0005-paypal-payments.md)
6. [ADR 0006: Turnstile is an optional spam-verification adapter](0006-turnstile-spam-verification.md)

## Supporting evidence

- [Verified provider baseline, 2026-06-15](../providers/verified-provider-baseline-2026-06-15.md)
- [Phone-only provider setup runbook](../operations/provider-setup-from-phone.md)

## Maintenance rule

Recheck official provider documentation when quotas, pricing, APIs, SDK major versions or production traffic materially change. Update the dated provider baseline first, then amend or supersede the affected ADR.
