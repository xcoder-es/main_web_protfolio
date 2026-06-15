# Shared contracts and configuration

Issue #3 establishes application-owned schemas and runtime boundaries before provider adapters are introduced.

## Browser-safe contracts

`@carlos-pinto/contracts` contains Zod schemas for identifiers, API errors, pagination, public forms and payment DTOs. These contracts describe application inputs and outputs rather than provider payloads.

`packages/config/src/index.ts` contains browser-safe URLs only.

## Server-only configuration

`packages/config/src/private-runtime.ts` validates runtime environment, host, port and provider feature flags. It is not exported through the browser-safe package root.

CI scans `apps/web/src` and rejects imports or credential names associated with private configuration.

## Testability

`@carlos-pinto/testing` exposes deterministic clock, ID and logger implementations for application and adapter tests.

## Render environment model

The intended promotion model is recorded but not deployed yet:

- `main` targets Render Production.
- Non-main branches may target Render Staging or preview deployments.
- Concrete Render resources and deployment triggers remain part of the dedicated deployment issue.
