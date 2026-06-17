# Carlos Pinto Digital Consulting Platform

A premium bilingual consulting portfolio, lead intake platform, private operations dashboard and payment-request experience for Carlos Pinto.

## Status

The repository is delivered issue by issue. The current foundation establishes a strict TypeScript monorepo, an Astro public application shell, an API application shell, shared package boundaries, automated validation and phone-friendly operating documentation.

## Workspace

```text
apps/
  api/       API and business capabilities
  web/       Static public experience and focused interactive islands
packages/
  config/    Provider-neutral configuration contracts
  contracts/ Shared API and form contracts
  testing/   Reusable deterministic test helpers
database/    Versioned SQL migrations and database operating notes
docs/        Architecture, deployment, operations and ADRs
tests/       Cross-application acceptance and architecture tests
```

## Local commands

```bash
corepack enable
pnpm install --no-frozen-lockfile
pnpm run ci
pnpm build
```

Run the API and web frontend from two terminals:

```bash
pnpm --filter @carlos-pinto/api start
pnpm --filter @carlos-pinto/web dev -- --host 127.0.0.1 --port 4321
```

Node.js 24 LTS and pnpm 11.5.2 are pinned. CI is the source of truth when operating only from a phone.

## Architecture direction

```mermaid
flowchart LR
  Web[Astro public site] --> API[Fastify inbound adapters]
  API --> Application[Application use cases]
  Application --> Domain[Domain model]
  Application --> Ports[Outbound ports]
  Ports --> Providers[Replaceable provider adapters]
```

Business rules point inward. Provider SDKs, transport payloads and deployment concerns must not enter domain modules.

## Delivery workflow

1. Select the next numbered GitHub issue.
2. Create a dedicated branch.
3. Implement only that issue's coherent scope.
4. Run lint, typecheck, tests and builds.
5. Open a pull request linked to the issue.
6. Merge only after CI succeeds.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [docs/architecture](docs/architecture/README.md).
