# Architecture

The platform is a modular TypeScript monorepo. Backend business capabilities follow ports and adapters with inward dependency direction. The public Astro application remains primarily static and does not receive ceremonial domain layers.

## Non-negotiable boundaries

1. Domain modules import no framework or provider SDK.
2. Application use cases depend on ports.
3. Inbound adapters translate HTTP and identity concerns.
4. Outbound adapters translate provider payloads.
5. A single explicit composition root assembles runtime dependencies.
6. No global mutable service locator is permitted.

Automated boundary checks begin in `scripts/check-boundaries.mjs` and become stricter as modules are introduced.
