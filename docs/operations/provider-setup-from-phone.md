# Provider setup from an Android phone

**Verified:** 2026-06-15

This runbook assumes access to GitHub and each provider dashboard from a mobile browser. Use the browser's desktop-site mode when a dashboard hides configuration controls on a narrow viewport.

Never paste production secrets into GitHub issues, pull requests, source files, screenshots or chat messages. Store them only in the relevant provider dashboard and Render environment settings.

## Recommended setup order

1. Supabase database.
2. Clerk administrator identity.
3. Resend sending domain.
4. Cloudflare Turnstile widget.
5. PayPal sandbox application.
6. Render Blueprint and environment variables.
7. PayPal live credentials and webhook after the public API URL exists.

## Supabase

1. Sign in to the Supabase dashboard.
2. Create a Free organization or use an existing Free organization with available project capacity.
3. Create one project for this platform and record the project URL.
4. Open **Project Settings > API Keys**.
5. Create or copy a server secret key. Use the legacy service-role key only when the newer key type is unavailable for the required client.
6. Open **SQL Editor**.
7. Apply migration files from `database/migrations` in filename order.
8. Confirm that RLS is enabled on every private table and that no anonymous policies expose business data.
9. Add the project URL and server credential to the Render API service, not to the static site.
10. Create a recurring manual export routine while the project remains on Free.

Checks:

- The key is absent from frontend build settings.
- The database accepts a server-side readiness query.
- Anonymous REST requests cannot read private tables.

## Clerk

1. Sign in to the Clerk dashboard.
2. Create an application dedicated to this platform.
3. Enable only the sign-in methods Carlos intends to use.
4. Configure the production and development frontend origins.
5. Copy the publishable key for the administrator frontend configuration.
6. Copy the secret key or JWT public key for the API environment.
7. Add Carlos's Clerk subject or verified email to the application administrator allowlist.
8. Verify that an authenticated Clerk user outside the allowlist receives no administrator access.

Checks:

- Public pages and forms do not require Clerk.
- The API validates the expected authorised party.
- Raw Clerk tokens are not logged.

## Resend

1. Sign in to Resend.
2. Add the sending domain.
3. Copy the DNS records shown by Resend into the DNS provider dashboard.
4. Wait for domain verification.
5. Create a narrowly scoped API key for sending.
6. Add the API key, sender address and notification recipient to the Render API environment.
7. Send a test notification only after the domain reports verified.

Free-plan operating limits recorded on 2026-06-15:

- 3,000 emails per month.
- 100 emails per day.
- One domain.
- 30-day provider dashboard retention.

Checks:

- The application uses HTTPS, not SMTP.
- A forced notification failure does not lose the saved lead.
- Retrying an unchanged notification uses the same logical idempotency key.

## Cloudflare Turnstile

1. Sign in to Cloudflare and open Turnstile.
2. Create one widget for public lead forms.
3. Add the production hostname and any approved preview hostname.
4. Select the appropriate managed widget type.
5. Copy the site key to the public web configuration.
6. Copy the secret key to the Render API environment only.
7. Configure the expected hostname and separate action names for contact and project-request forms.
8. Use Cloudflare's official test keys in automated or non-production tests.

Checks:

- The API calls Siteverify for every configured submission.
- Expired or reused tokens fail with a user-friendly retry state.
- Removing Turnstile configuration leaves honeypot, timing, size and rate-limit protection active.

## PayPal sandbox

1. Sign in to the PayPal Developer dashboard.
2. Create or select a sandbox business account.
3. Create a REST application for this platform.
4. Copy the sandbox client ID and secret into the Render API environment.
5. Set the API mode to sandbox.
6. Create a webhook subscription after the API has a public HTTPS URL.
7. Subscribe only to events required by the implemented payment state machine, including capture completion and relevant failure, reversal or refund events.
8. Store the webhook ID in the API environment.
9. Test create, approve, capture and duplicate webhook flows with sandbox buyer accounts.

Checks:

- Browser requests never contain the client secret.
- The order amount is loaded from the database.
- Webhook signatures are verified before state changes.
- Repeated events and repeated capture calls do not duplicate processing.

## PayPal live activation

Do this only after sandbox acceptance tests pass.

1. Confirm the PayPal Business account is eligible to receive the intended currencies.
2. Review the current Spanish seller fees in the PayPal dashboard and official fee page.
3. Create or select the live REST application.
4. Replace sandbox credentials with live credentials in Render.
5. Register the live webhook URL and store its live webhook ID.
6. Change the API mode to live.
7. Perform a small real payment and verify order, capture, webhook and audit records.
8. Refund the test payment when appropriate and verify refund state handling.

Never reuse sandbox credentials, webhook IDs or endpoints in live mode.

## Render Blueprint

1. Open the Render dashboard and choose **New > Blueprint**.
2. Connect `xcoder-es/main_web_protfolio`.
3. Select the `main` branch and the repository `render.yaml`.
4. During the first Blueprint creation, enter every secret marked `sync: false`.
5. Confirm the frontend is a Static Site and the API is a Web Service using the Free instance type.
6. Verify the API health-check path.
7. Add any secret introduced after initial creation manually because later Blueprint syncs ignore new `sync: false` values.
8. Record the generated public frontend and API URLs.
9. Update allowed CORS origins, Clerk authorised parties, Turnstile hostnames and PayPal webhooks with those final URLs.

Checks:

- No secret value appears in `render.yaml`.
- The frontend renders while the API is sleeping.
- The first form interaction displays a waking-service state rather than losing input.
- No artificial keep-alive process is configured.

## Configuration rotation

When rotating a provider credential:

1. Create the replacement credential first.
2. Add it to Render without deleting the old credential where the provider supports overlap.
3. Deploy and verify readiness.
4. Revoke the old credential.
5. Verify logs and provider dashboards for unexpected failures.
6. Record the rotation date without recording the secret value.

## Quota review

Review provider dashboards weekly during the first month and monthly afterwards. Escalate when any quota reaches 70%, when the API cold start causes material lead abandonment, or when payment volume makes the verified PayPal transaction costs commercially significant.
