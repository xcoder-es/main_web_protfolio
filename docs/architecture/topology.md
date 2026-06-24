# Topology

This repository uses a monorepo topology with a strict separation between public presentation and backend application behavior.

## Repository topology

```mermaid
flowchart TB
  Root[Repository root]
  Apps[apps/]
  Web[apps/web]
  Api[apps/api]
  Packages[packages/]
  Config[packages/config]
  Contracts[packages/contracts]
  Docs[docs/]
  Infra[infra/render]
  GH[.github/workflows]

  Root --> Apps
  Root --> Packages
  Root --> Docs
  Root --> Infra
  Root --> GH
  Apps --> Web
  Apps --> Api
  Packages --> Config
  Packages --> Contracts
```

## Runtime topology

```mermaid
flowchart LR
  Visitor[Visitor]
  Browser[Astro static site]
  API[Fastify API]
  Clerk[Clerk]
  Resend[Resend]
  PayPal[PayPal]
  Turnstile[Turnstile]
  Data[(Private persistence)]

  Visitor --> Browser
  Browser --> API
  API --> Clerk
  API --> Resend
  API --> PayPal
  API --> Turnstile
  API --> Data
```

## Environment topology

```mermaid
flowchart TB
  subgraph Production
    PWeb[web-prod]
    PApi[api-prod]
    PEnv[production env groups]
  end

  subgraph Staging
    SWeb[web-staging]
    SApi[api-staging]
    SEnv[staging env groups]
  end

  PWeb --> PApi
  SWeb --> SApi
```

## Operational notes

- Render services are expected to be recreated or reconciled from code.
- The `staging` branch is not a developer scratchpad. It is a promotion target.
- `main` is the release line and should be tagged using SemVer.
