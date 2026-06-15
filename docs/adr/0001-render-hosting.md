# ADR 0001: Render hosts the static frontend and API

- Status: Accepted
- Date: 2026-06-15
- Decision owners: Carlos Pinto and principal engineering

## Context

The initial budget is zero and the platform must be deployable and maintainable from an Android browser. The public site must remain available when the API is sleeping. The API needs standard Node.js hosting, environment variables, health checks and GitHub-driven deployment.

Official references:

- https://render.com/docs/free
- https://render.com/docs/static-sites
- https://render.com/docs/blueprint-spec

## Decision

Deploy the Astro output as a Render Static Site and the Fastify API as a separate Render Free Web Service. Describe both resources in `render.yaml`.

Store all durable state in Supabase. Treat the Render filesystem as ephemeral. Define secret environment variables with `sync: false` and enter their values through the Render dashboard.

## Consequences

Positive:

- No required hosting charge for the first release.
- Public content is served independently of the sleeping API.
- GitHub pushes can drive deployment.
- Static content receives managed TLS and CDN delivery.

Negative:

- The API spins down after 15 minutes without inbound traffic and can take about one minute to restart.
- Free instance hours are shared at workspace level.
- No persistent disk, edge caching, shell access or horizontal scaling is available for the API.
- Common SMTP ports are blocked, so email must use an HTTPS API.

## Operational rules

- Do not create keep-alive traffic intended to evade Render's free-service policies.
- Forms may call readiness while the visitor is actively completing a form.
- Show a clear waking-service state and preserve user-entered data during startup.
- Persist nothing important to local files.
- Health endpoints must not require external providers; readiness endpoints may report provider availability.

## Replacement seam

Hosting is configuration, not domain logic. The Astro static output and Node.js API can move to another provider without changing domain or application modules.

## Failure behaviour

- If the API is sleeping, public pages continue rendering.
- If the API cannot wake, forms preserve local input and present a retry path.
- If Render restarts the API, no data is lost because state is external.
