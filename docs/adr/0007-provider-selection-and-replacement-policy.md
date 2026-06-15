# ADR 0007: Provider integrations remain replaceable

- Status: Accepted
- Date: 2026-06-15

## Context

The initial operating budget is zero, but free plans and provider policies can change. The platform must avoid business logic becoming coupled to Render, Supabase, Clerk, Resend, PayPal or Cloudflare Turnstile.

Official provider evidence is recorded in the dated baseline under `docs/providers`.

## Decision

Every external provider is isolated behind an application-owned port or deployment boundary:

- Hosting remains deployment configuration.
- Persistence uses repository and unit-of-work ports.
- Identity uses `IdentityVerifier`.
- Notifications use `NotificationSender` and `NotificationRepository`.
- Payments use `PaymentGateway` and application-owned payment records.
- Spam verification uses `SpamVerifier`.

Provider payloads, SDK types, identifiers and error codes are translated inside adapters. Application use cases consume provider-neutral inputs and results.

## Selection criteria

A provider may be replaced when one or more of these conditions becomes material:

- Free-plan limits no longer support the operating profile.
- Reliability or cold-start behaviour causes measurable lead loss.
- Security or privacy requirements exceed the available controls.
- Transaction or usage fees become commercially inefficient.
- Mobile-only administration becomes impractical.
- A provider removes a required capability.

## Consequences

Benefits:

- Provider changes remain localised.
- In-memory adapters can support deterministic tests.
- Disabled adapters provide explicit graceful degradation.
- Commercial decisions do not require rewriting domain rules.

Costs:

- Adapter contracts and mapping code require maintenance.
- Provider-specific optimisations must not leak across boundaries.
- Integration contract tests are required for each adapter.

## Replacement seam

The ports and deployment contracts listed above are the replacement seams. A replacement provider must satisfy the same application contract and pass the same contract tests before activation.

## Failure behaviour

Optional providers degrade explicitly when disabled. Mandatory production capabilities, especially persistence and administrator identity, fail readiness or protected requests rather than silently using insecure fallbacks.

## Review process

1. Update the dated provider baseline using current official documentation.
2. Compare the replacement against the existing port contract.
3. Add or update adapter contract tests.
4. Run both providers in sandbox or non-production mode where practical.
5. Record the migration, rollback and credential-rotation plan.
6. Supersede the affected provider ADR after successful verification.
