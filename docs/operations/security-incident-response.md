# Security incident response and credential rotation

This runbook is designed to be executable from an Android browser using GitHub, Render and provider dashboards. Record every action with an exact UTC timestamp. Do not paste credentials, personal data or raw callback bodies into GitHub issues, chat, screenshots or commit messages.

## Severity

- **SEV-1:** confirmed administrator-account takeover, database exposure, payment credential compromise or unauthorized payment state change.
- **SEV-2:** suspected credential disclosure, repeated unauthorized access, webhook verification bypass attempt or material personal-data exposure.
- **SEV-3:** blocked abuse, isolated provider outage, misconfiguration or security alert with no confirmed access.

## Immediate containment

1. Open the Render dashboard and select the affected environment: Staging or Production.
2. Disable the affected capability using its feature flag when possible:
   - `IDENTITY_ENABLED=false`
   - `NOTIFICATIONS_ENABLED=false`
   - `PAYMENTS_ENABLED=false`
   - `SPAM_VERIFICATION_ENABLED=false`
3. For public-form abuse, keep the static website available but disable the affected API integration or temporarily remove the API origin from the public deployment.
4. For administrator compromise, remove the affected user ID and email from `CLERK_ADMIN_USER_IDS` and `CLERK_ADMIN_EMAILS`, then redeploy.
5. For payment compromise, disable payments before rotating PayPal credentials or webhook configuration.
6. Capture correlation IDs, audit event IDs, provider event IDs, approximate time range and affected environment. Never capture raw secrets.

## Evidence preservation

Preserve only what is needed to investigate:

- exact UTC start and discovery times;
- environment and release commit shown in protected diagnostics;
- correlation IDs from public errors or safe logs;
- relevant audit-event IDs and actions;
- provider event IDs and verification states;
- affected record IDs, never complete record contents in public channels;
- screenshots with personal data and credentials redacted.

Do not turn on body logging. Do not add temporary logging of tokens, headers, forms or callback bodies.

## Credential rotation order

Use separate Staging and Production credentials. Rotate Staging first when the incident permits, validate, then rotate Production. For an active SEV-1 compromise, revoke Production immediately and accept temporary downtime.

### Render

1. Open **Portfolio** in Render.
2. Select the affected environment.
3. Open the API service and then **Environment**.
4. Replace the credential value using Render's secret controls.
5. Save and deploy the service.
6. Confirm `/health`, `/ready` and protected `/api/admin/diagnostics`.
7. Remove obsolete values from any environment groups after all services use the replacement.

Render logs record stdout and stderr. Never print a credential to verify it.

### Clerk

1. Remove the compromised administrator from the application allowlist immediately.
2. In Clerk, revoke active sessions for the affected identity.
3. Rotate the backend secret key if server credentials may be exposed.
4. Update `CLERK_SECRET_KEY` in Render.
5. Update the publishable key only when Clerk requires it, then update both `CLERK_PUBLISHABLE_KEY` and `PUBLIC_CLERK_PUBLISHABLE_KEY`.
6. Verify authorized parties and administrator allowlists before re-enabling identity.
7. Sign in from a private browser session and confirm unauthorized accounts receive 403.

### Supabase

1. Restrict or pause the affected project if database access is confirmed.
2. Rotate the server database credential used by the API.
3. Update only the private Render API variable. Never expose a service-role or database credential to Astro `PUBLIC_` variables.
4. Verify RLS remains enabled and forced, and browser roles retain no direct table privileges.
5. Review database logs and affected record IDs.
6. Confirm migrations and repository contract tests before restoring writes.

### Resend

1. Revoke the affected API key in Resend.
2. Create a replacement restricted to the required sending domain where supported.
3. Update `RESEND_API_KEY` in Render.
4. Verify `RESEND_FROM_EMAIL` and recipient configuration.
5. Re-enable notifications and retry one failed notification from the protected administrator dashboard.
6. Confirm duplicate notification protection remains effective.

### PayPal

1. Set `PAYMENTS_ENABLED=false` and deploy.
2. Revoke or rotate the affected PayPal REST application secret.
3. Update `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in the affected Render environment.
4. Replace the webhook endpoint registration or webhook ID when compromise includes callback configuration.
5. Update `PAYPAL_WEBHOOK_ID`.
6. Confirm `PAYPAL_MODE=sandbox` in Staging and `PAYPAL_MODE=live` only in Production.
7. Validate one Sandbox order, capture and verified callback before restoring Production.
8. Reconcile recent provider event IDs against internal payment history. Do not store or paste raw payer details.

### Cloudflare Turnstile

1. Set `SPAM_VERIFICATION_ENABLED=false` only when accepting temporarily reduced protection is safer than total form outage; local rate, timing and honeypot controls remain active.
2. Rotate the Turnstile secret in Cloudflare.
3. Update `TURNSTILE_SECRET_KEY` in Render.
4. If the widget site key changes, update `PUBLIC_TURNSTILE_SITE_KEY` on the static site.
5. Confirm `TURNSTILE_ALLOWED_HOSTNAMES` contains exact Staging or Production hostnames.
6. Re-enable verification and submit one test form from the matching public origin.

## Validation after rotation

- `/health` returns 200.
- `/ready` returns only aggregate readiness and no provider detail.
- `/api/admin/diagnostics` works only for an allowlisted administrator.
- release commit and environment are correct.
- no capability unexpectedly reports unavailable.
- OpenAPI remains disabled in Production unless intentionally enabled for a controlled period.
- public form retry creates no duplicate lead.
- notification retry creates no duplicate email.
- payment order and callback remain idempotent.
- logs contain correlation IDs and controlled codes, not request bodies or credentials.

## Recovery

1. Restore features one at a time.
2. Confirm Staging before Production where containment does not require immediate Production action.
3. Monitor rejected requests, readiness and provider dashboards.
4. Review audit events for status changes, notes, exports and payment actions.
5. Notify affected clients or authorities only after confirming the facts and applicable contractual or legal requirements.

## Post-incident work

Create a private incident record containing:

- severity and impact;
- factual timeline in UTC;
- affected systems and records;
- containment and credential rotations;
- root cause and contributing controls;
- client or legal notifications;
- corrective actions with owners;
- test or runbook changes preventing recurrence.

Do not include live credentials or unnecessary personal data in the incident record.

## Mobile rollback

When a deployment causes the incident:

1. Open the Render service from the mobile browser.
2. Find the last known-good deployment.
3. redeploy that release or revert the pull request in GitHub.
4. Keep compromised credentials revoked; rollback does not make an old credential safe.
5. Confirm the active commit through protected diagnostics.
