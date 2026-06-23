# Operations

Operational procedures must be executable from an Android browser because Carlos currently has no laptop or desktop computer.

This is an administration requirement, not a product limitation. The public website and private dashboard must work across mobile, tablet, laptop and desktop browsers.

## Runbooks

- [Mobile administration and provider setup](mobile-admin-provider-setup.md)
- [Clerk administrator operations](clerk-admin-operations.md)
- [Local Clerk administrator setup](../development/local-admin-clerk.md)
- [Security incident response and credential rotation](security-incident-response.md)

## Principles

- Keep secret values out of source control.
- Prefer observable and reversible dashboard changes.
- Record migration and credential-rotation dates without recording credentials.
- Keep business state in the application database rather than provider dashboards.
- Treat Clerk dashboard membership as authentication context only; administrator authorization remains
  the application allowlist.
