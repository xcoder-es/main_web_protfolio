# ADR 0002: Supabase PostgreSQL behind repository ports

- Status: Accepted
- Date: 2026-06-15

## Context

The platform needs relational persistence for leads, notes, notifications, payment records, webhook events and audits. The first release needs a zero-cost starting point and phone-friendly database administration.

Official references:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Decision

Use Supabase-hosted PostgreSQL. The API is the only component allowed to access private business tables. Commit versioned SQL migrations under `database/migrations` and support applying them through the Supabase SQL Editor.

Application use cases depend on repository and `UnitOfWork` ports. Supabase clients, query syntax and row shapes remain inside outbound adapters.

Privileged Supabase credentials are server-only. They must never enter Astro, Preact or public JavaScript bundles.

## Consequences

Benefits:

- Standard PostgreSQL constraints and transactions.
- Portable SQL migrations.
- A free quota suitable for initial low-volume operation.
- A dashboard and SQL Editor usable from a phone.

Costs:

- Free projects can pause after inactivity.
- Automatic backups are not included on Free.
- Privileged credentials can bypass RLS and require strict isolation.
- Database size and egress quotas require monitoring.

## Security rules

- Enable RLS on all private tables.
- Provide no anonymous browser policies for private business data.
- Use a dedicated server client that cannot inherit a visitor session.
- Validate database records before mapping them into domain objects.
- Keep domain transitions out of database adapters.

## Replacement seam

Repository ports and application-owned records isolate Supabase. Another PostgreSQL host can replace it without changing domain or application modules.

## Failure behaviour

Database access is mandatory in production. Missing configuration or an unreachable database fails readiness. In-memory repositories are limited to tests and explicit local development.

## Operations

- Export critical data regularly while using Free.
- Review capacity when usage reaches 70% of a quota.
- Keep phone-based migration and reactivation steps in the operations runbook.
