# Persistence architecture

The API owns all access to private business data. Public browser code never connects directly to Supabase tables.

## Dependency direction

- Application modules depend on repository and `UnitOfWork` ports.
- In-memory adapters support deterministic tests.
- Supabase repositories translate application records into database rows through a narrow gateway.
- Supabase SDK types and query builders remain outside domain and application modules.

## Transaction rule

Application workflows request atomic execution through `UnitOfWork`. In-memory tests use snapshot rollback. Production Supabase wiring must supply a transaction runner backed by a PostgreSQL transaction or dedicated database function rather than pretending independent HTTP requests are atomic.

## Private schema

The initial migration creates leads, notes, notifications, notification attempts, payment requests, payment events, PayPal webhook events and audit events. It includes relational constraints, indexes, idempotency keys, webhook uniqueness, positive minor-unit amounts, ISO currency validation and UTC-aware timestamps.

Every table has Row Level Security enabled and forced. No browser policy is created, and table privileges are revoked from `anon` and `authenticated`.

## Migration discipline

Migrations are numbered, transactional and guarded for repeat execution where PostgreSQL supports it. Applied migrations are immutable. New changes require a new migration file.
