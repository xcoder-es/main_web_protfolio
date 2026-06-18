# Local Clerk administrator setup

The administrator dashboard uses the same security boundary locally as it does in staging and
production. Clerk authenticates the browser session, and the API authorizes only the configured
administrator user IDs or email addresses. There is no anonymous local administrator mode.

Use a Clerk development instance for local work. Do not use production keys on a laptop or in a
shared preview environment.

## Local environment

Copy the example file and keep the real file untracked:

```bash
cp .env.example .env
```

The API and Astro start scripts load the workspace-root `.env` automatically. Real shell
environment variables win over values in `.env`.

For local administrator testing, set:

```bash
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_API_URL=http://localhost:3000
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

IDENTITY_ENABLED=true
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_KEY=
CLERK_AUTHORIZED_PARTIES=http://localhost:4321
CLERK_ADMIN_USER_IDS=user_...
CLERK_ADMIN_EMAILS=
```

`PUBLIC_CLERK_PUBLISHABLE_KEY` is safe for the static site. `CLERK_SECRET_KEY` and `CLERK_JWT_KEY`
must stay server-side. `CLERK_PUBLISHABLE_KEY` should match the public key so the backend SDK is
bound to the same Clerk instance as the browser.

Prefer `CLERK_ADMIN_USER_IDS` for day-to-day local testing because it avoids an extra Clerk user
lookup on every protected API request. Use `CLERK_ADMIN_EMAILS` when user IDs are not available or
when testing email-based authorization.

## Clerk dashboard

In the Clerk dashboard for the development instance:

1. Add `http://localhost:4321` as an allowed development frontend origin and redirect target.
2. Enable the intended administrator sign-in method.
3. Create or sign in as the local administrator user.
4. Copy that user's Clerk user ID into `CLERK_ADMIN_USER_IDS`, or add the verified email address to
   `CLERK_ADMIN_EMAILS`.
5. If using networkless verification, copy the JWT public key PEM into `CLERK_JWT_KEY`.

The API always passes `CLERK_AUTHORIZED_PARTIES` to Clerk token verification. Keep it as an exact
origin list and never use a wildcard.

## Free Clerk features only

This project should stay on Clerk's Hobby plan until there is an explicit business decision to
upgrade. The current local administrator setup uses only Hobby-compatible features:

- Clerk's hosted development instance and development keys.
- Prebuilt sign-in UI with Clerk branding left in place.
- Email-based sign-in and up to three social connections.
- Backend session verification through the Clerk SDK.
- An application-owned administrator allowlist in environment variables.

Do not enable paid Clerk features for this project by default:

- Remove Clerk branding.
- Multi-factor authentication.
- Passkeys.
- Custom password requirements or custom email templates.
- Enterprise connections, satellite domains or paid B2B add-ons.
- Additional dashboard seats beyond the Hobby limit.

## Clerk-side setup checklist

The local code can be fully configured from `.env`, but these items still live in Clerk:

1. Confirm the development application is the one matching the local publishable key.
2. Confirm the application name is spelled correctly because Clerk displays it in the sign-in form.
3. Confirm `http://localhost:4321` is allowed for development origins and redirects.
4. Confirm at least one free sign-in method is enabled, preferably email code or password.
5. Sign in or create the administrator user with the intended administrator email address.
6. After the first sign-in, copy the stable `user_...` ID into `CLERK_ADMIN_USER_IDS` for faster
   authorization. Keeping the verified email in `CLERK_ADMIN_EMAILS` is acceptable for first local
   testing.

## Run and verify

Run the API and web frontend from two terminals:

```bash
pnpm dev:api
pnpm dev:web
```

Then open `http://localhost:4321/admin`, sign in through Clerk, and confirm `/api/admin/status`
returns a verified administrator. Public forms should continue to work whether or not Clerk is
configured.

Expected failure states:

- Missing `PUBLIC_CLERK_PUBLISHABLE_KEY`: `/admin` shows the configuration-required page.
- Missing API Clerk secret, authorized party, or admin allowlist: protected API routes return
  `503 IDENTITY_CONFIGURATION_ERROR`.
- Signed-in Clerk user outside the allowlist: protected API routes return
  `403 ADMIN_ACCESS_FORBIDDEN`.
- Missing or expired browser session: protected API routes return `401 AUTHENTICATION_REQUIRED`.
