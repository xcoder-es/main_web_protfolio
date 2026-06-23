# Clerk administrator operations

Clerk authenticates administrator sessions. The application still authorizes administrators through
`CLERK_ADMIN_USER_IDS` and `CLERK_ADMIN_EMAILS`; Clerk dashboard membership alone never grants
administrator access.

## Routine rotation

Rotate Clerk credentials when maintainers change, after suspected exposure, and during scheduled
security reviews.

1. Create the replacement Clerk secret key in the Clerk dashboard.
2. Add the replacement key to the Render API service as `CLERK_SECRET_KEY`.
3. Do not add Clerk secrets to Astro `PUBLIC_` variables or frontend build settings.
4. Redeploy the API service.
5. Confirm `/ready` reports identity ready.
6. Sign in to `/admin` as an allowlisted administrator and call a protected API route.
7. Revoke the old Clerk secret key.
8. Record the rotation date and reason without recording the key value.

## Account recovery

- Use Clerk's password-reset or verified-email recovery flow from the sign-in screen.
- Keep at least one separately secured recovery method for each administrator identity.
- After a device is lost, sign in from a replacement device and revoke the old device's active
  sessions in Clerk.
- Do not create shared administrator accounts.
- Do not disable API authentication or add an anonymous administrator bypass for recovery.

## Suspected compromise

1. Remove the affected `user_...` ID and email from the Render administrator allowlist.
2. Redeploy so the allowlist change is active.
3. Revoke the user's active Clerk sessions.
4. Rotate `CLERK_SECRET_KEY` if a server credential, deployment log, or local `.env` may have leaked.
5. Review administrator audit events for unexpected lead, payment, or notification configuration
   actions.
6. Restore access only after the Clerk identity, new credential, intended user ID, and verified email
   are re-added to the application allowlist.

Public routes, health checks, readiness checks, and webhooks must remain independent of Clerk.
Protected administrator routes must continue to require a valid Clerk session plus application
allowlist authorization.
