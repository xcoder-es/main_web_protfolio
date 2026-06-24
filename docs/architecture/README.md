# Architecture

The platform is a modular TypeScript monorepo. Backend business capabilities follow ports-and-adapters direction. The public Astro application remains primarily static and does not receive ceremonial domain layers.

## Non-Negotiable Boundaries

1. Domain modules import no framework or provider SDK.
2. Application use cases depend on ports.
3. Inbound adapters translate HTTP and identity concerns.
4. Outbound adapters translate provider payloads.
5. A single explicit composition root assembles runtime dependencies.
6. No global mutable service locator is permitted.

Automated boundary checks start in `scripts/check-boundaries.mjs` and become stricter as modules are introduced.

## Supporting Documents

- [Enterprise architecture overview](enterprise-architecture.md)
- [Cloud architecture](cloud-architecture.md)
- [Topology](topology.md)
- [Data architecture](data-architecture.md)
- [Shared contracts configuration](shared-contracts-and-configuration.md)
- [Persistence architecture](persistence.md)
- [Fastify API foundation](api-foundation.md)
- [Leads, notes, audit workflows](leads.md)
- [Durable notifications](notifications.md)
- [Administrator identity Clerk boundary](identity.md)
- [Public forms verification controls](forms-and-spam-protection.md)
- [Mobile-first administrator dashboard](admin-dashboard.md)
- [Security, privacy, operational observability](security-privacy-observability.md)

## Operations

- [Security incident response credential rotation](../operations/security-incident-response.md)
