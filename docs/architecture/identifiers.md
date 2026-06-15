# Identifier contracts

Correlation IDs, lead IDs, payment request IDs and idempotency keys are validated centrally before entering application workflows.

Later modules may refine the branded types, but transport adapters must continue validating identifier syntax at their boundaries.
