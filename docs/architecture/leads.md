# Leads, notes and audit workflows

The lead capability follows hexagonal architecture inside the API application.

## Domain

`leads/domain/model.ts` defines lead types, statuses, contact details, project briefs, source metadata and allowed status transitions. Terminal states reject further movement except that won and lost leads may be archived.

## Application

`LeadsService` owns the use cases for:

- contact and project request submission
- exact-once handling through browser-generated idempotency keys
- lead retrieval, filtering and search
- status changes, notes, archive and spam actions
- CSV export
- transactional audit-event creation

The service depends only on repository, unit-of-work, clock and ID-generation ports. It does not know about Fastify, Supabase or Clerk.

## HTTP adapters

Public submission routes live under `/api/public` and require no authentication. Administrator workflows live under `/api/admin`, which keeps the boundary ready for the Clerk identity adapter without coupling the lead domain to Clerk.

Until identity enforcement is introduced, administrator audit events use the optional `x-admin-principal-id` header or the explicit local placeholder principal.

## Persistence

The composition root currently connects the use cases to the existing in-memory persistence adapter for deterministic local operation and tests. The same use cases can be connected to the Supabase repository adapters without changing domain or route logic.

## Auditing

Submission, status change and note creation write an audit event in the same unit of work as the lead mutation. Audit metadata excludes message bodies and other unnecessary personal data.
