# Shared contracts

This package owns provider-neutral Zod schemas and TypeScript types used by the web and API applications.

Included contracts:

- branded identifiers and idempotency keys
- stable API error responses
- pagination inputs and outputs
- contact and project request forms
- payment request DTOs and money values
- foundational application ports for time, IDs and logging

Provider SDK types and provider payloads must not be exported from this package.
