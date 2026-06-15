# Database

The production data store is Supabase-hosted PostgreSQL. SQL migrations remain provider-portable and are committed in filename order under `database/migrations`.

No production credentials or personal data may be committed.

## Apply migrations from an Android browser

1. Open the Supabase dashboard and select the correct project.
2. Open **SQL Editor**.
3. Create a new query.
4. Open the next unapplied migration file in GitHub.
5. Copy the complete SQL file into the Supabase query editor.
6. Confirm the target project and environment before running it.
7. Run the migration once and keep the complete result visible until it succeeds.
8. Run the same migration a second time in Staging to verify its repeatable guards.
9. Record the filename, environment, date and outcome without copying credentials.
10. Apply the validated migration to Production only after the related pull request is merged.

## Environment order

- Feature branches and unmerged database changes are validated against Staging.
- `main` represents the Production schema contract.
- Production migrations are applied only from files already merged into `main`.

## Security expectations

- All private tables have Row Level Security enabled and forced.
- No anonymous or authenticated browser policies are created.
- `anon` and `authenticated` receive no table privileges.
- The browser never receives a Supabase secret or legacy service-role key.
- The API is the only application component allowed to access private business tables.

## Migration rules

- Migrations run inside an explicit transaction.
- Use `if not exists` or equivalent guarded DDL where PostgreSQL supports it.
- Constraints and indexes are part of the schema contract, not application-only validation.
- Never edit an already-applied migration. Add a new numbered migration instead.
- Export critical data before destructive production changes while the project remains on the Free plan.

## Automated validation

`scripts/check-database-schema.mjs` verifies required tables, repeatable DDL, RLS, access revocation, idempotency constraints, positive payment amounts, currencies and webhook uniqueness.
