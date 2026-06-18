# Render environment intent

The Render project is named `Portfolio` and currently has two environments:

- Production: intended for the `main` branch.
- Staging: intended for non-main development branches.

This file records intent only. Render services, environment variables, health checks, preview behaviour and deployment policies are implemented in the dedicated deployment issue.

## Planned variable split

```mermaid
flowchart TB
  subgraph Static["Static site build"]
    A[PUBLIC_SITE_URL]
    B[PUBLIC_API_URL]
    C[PUBLIC_CLERK_PUBLISHABLE_KEY]
    D[PUBLIC_TURNSTILE_SITE_KEY]
  end

  subgraph API["API runtime"]
    E[IDENTITY_ENABLED]
    F[CLERK_SECRET_KEY]
    G[CLERK_AUTHORIZED_PARTIES]
    H[CLERK_ADMIN_USER_IDS]
    I[Persistence, email, payment and spam secrets]
  end

  Static --> Browser[Browser]
  Browser --> API
```

Staging should use Clerk development credentials. Production should use Clerk production credentials
only after staging sign-in, API readiness and administrator workflows are verified.
