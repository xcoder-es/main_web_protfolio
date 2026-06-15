# Contributing

Every production change must reference a GitHub issue and use a dedicated branch. Keep pull requests small enough to review from a mobile browser.

## Required validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI must pass before merge. Do not bypass a failing quality gate by weakening tests, suppressing types or disabling security checks.

## Architecture rules

- Domain code cannot import frameworks or provider SDKs.
- Application code depends on ports rather than provider implementations.
- HTTP adapters translate transport concerns and contain no business rules.
- Dependencies are assembled in an explicit composition root.
- Prefer small cohesive modules over speculative abstractions.

Use concise conventional commits such as `feat:`, `fix:`, `test:`, `docs:` and `chore:`.
