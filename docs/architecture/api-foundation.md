# Fastify API foundation

The API is assembled through `apps/api/src/app.ts` and a single explicit composition root. Route modules never construct providers or persistence clients.

## Runtime controls

- Validated environment, host, port and feature switches.
- Explicit CORS allowlist with no wildcard support.
- Configurable request body and rate limits.
- Render-aware proxy trust configuration.
- Structured JSON logs with credential redaction.
- Validated or generated correlation IDs returned in every response.

## Operational endpoints

- `GET /health` reports process health without calling external providers.
- `GET /ready` evaluates configured dependency probes and returns 503 when a required enabled capability has no working adapter.
- `GET /openapi.json` exposes generated OpenAPI documentation.

Health and readiness are excluded from rate limiting so hosting platforms can probe them safely.

## Route boundaries

Public, administrator and webhook routes are registered through separate Fastify plugins and prefixes. Authentication and provider-specific webhook verification are added through later adapters, not embedded in the application factory.

## Error contract

Every HTTP error is translated to the shared shape:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "correlationId": "request-identifier",
  "fieldErrors": {}
}
```

Unknown errors are logged with their correlation ID but return no stack trace, provider payload or internal exception message.

## Minimum local configuration

Copy `.env.example`. The API starts locally with every optional integration disabled. Enabling a capability without supplying its adapter makes readiness fail deliberately rather than silently using a fake production dependency.
