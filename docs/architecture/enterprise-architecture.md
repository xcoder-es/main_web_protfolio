# Enterprise architecture overview

The platform is an independent consulting operating system rather than a brochure site. It combines
a static bilingual public frontend, a protected administrator workspace, a Fastify API, provider
adapters and private persistence behind explicit trust boundaries.

## Runtime topology

```mermaid
flowchart LR
  Visitor[Public visitor] --> StaticSite[Astro static site]
  Admin[Administrator] --> AdminUI[Astro /admin workspace]

  StaticSite -->|Public form and payment requests| API[Fastify API]
  AdminUI -->|Bearer Clerk session token| API

  API --> UseCases[Application use cases]
  UseCases --> Domain[Domain model]
  UseCases --> Ports[Outbound ports]

  Ports --> Supabase[(Supabase Postgres)]
  Ports --> Resend[Resend email]
  Ports --> PayPal[PayPal orders]
  Ports --> Turnstile[Cloudflare Turnstile]
  API --> Clerk[Clerk identity]
```

The static site can expose only `PUBLIC_` variables. The API owns private provider credentials,
identity verification, persistence, audit events and operational readiness.

## Trust boundaries

```mermaid
flowchart TB
  subgraph Public["Public internet"]
    Browser[Visitor browser]
    AdminBrowser[Administrator browser]
  end

  subgraph Static["Static frontend boundary"]
    Astro[Astro pages and interactive islands]
    ClerkJS[Clerk browser SDK]
  end

  subgraph APIBoundary["API trust boundary"]
    Fastify[Fastify routes]
    Auth[Clerk token verification]
    Authorization[Application admin allowlist]
    Sanitizer[Public error and log sanitization]
  end

  subgraph Private["Private provider boundary"]
    Database[(Private database)]
    Providers[Email, payment, spam and identity providers]
  end

  Browser --> Astro
  AdminBrowser --> Astro
  AdminBrowser --> ClerkJS
  Astro --> Fastify
  ClerkJS -->|Session token| Fastify
  Fastify --> Auth --> Authorization --> Sanitizer
  Sanitizer --> Database
  Sanitizer --> Providers
```

Authentication and authorization are intentionally separate. Clerk verifies that a browser session is
real; the application still decides whether the verified Clerk user is an administrator through
`CLERK_ADMIN_USER_IDS` and `CLERK_ADMIN_EMAILS`.

## Capability layering

```mermaid
flowchart BT
  Domain[Domain entities and invariants]
  Application[Application services and ports]
  Inbound[HTTP routes, identity context and request mapping]
  Outbound[Provider adapters and repositories]
  Composition[Runtime composition root]

  Application --> Domain
  Inbound --> Application
  Outbound --> Application
  Composition --> Inbound
  Composition --> Outbound
```

Domain code imports no framework or provider SDK. Provider payloads are translated at adapter edges.
Shared packages carry contracts and configuration validation, not business workflow orchestration.

## Deployment and configuration model

```mermaid
flowchart LR
  subgraph StaticEnv["Render static site"]
    PublicVars["PUBLIC_SITE_URL\nPUBLIC_API_URL\nPUBLIC_CLERK_PUBLISHABLE_KEY\nPUBLIC_TURNSTILE_SITE_KEY"]
  end

  subgraph ApiEnv["Render API service"]
    PrivateVars["CLERK_SECRET_KEY\nCLERK_AUTHORIZED_PARTIES\nCLERK_ADMIN_USER_IDS\nSUPABASE_SERVICE_ROLE_KEY\nRESEND_API_KEY\nPAYPAL_* secrets"]
  end

  PublicVars --> StaticBuild[Static build output]
  PrivateVars --> ApiRuntime[API runtime only]
  StaticBuild --> Browser[Browser]
  Browser --> ApiRuntime
```

Static-site environment changes require a rebuild because `PUBLIC_` values are embedded into the
generated frontend. API-only secrets must never be exposed through Astro public variables, logs,
GitHub issues, screenshots or documentation examples.

## Local development path

Local development mirrors the production boundary:

- Public pages and forms can run without Clerk.
- `/admin` requires a real Clerk development publishable key.
- Protected API routes require private Clerk configuration and an explicit admin allowlist.
- There is no anonymous local administrator bypass.
- `pnpm dev:api` and `pnpm dev:web` load the workspace-root `.env` file, while real shell variables
  still take precedence.

See [Local Clerk administrator setup](../development/local-admin-clerk.md) for the local runbook.

## Operational priorities

1. Fail closed for administrator access.
2. Keep provider credentials server-side.
3. Keep public form intake anonymous and abuse-resistant.
4. Sanitize public errors and operational logs.
5. Preserve deterministic tests with fakes; document real-provider smoke checks separately.
6. Treat provider replacement as an adapter concern, not a domain rewrite.
