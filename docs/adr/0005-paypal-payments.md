# ADR 0005: PayPal Orders v2 handles payment requests

- Status: Accepted
- Date: 2026-06-15

## Context

Carlos needs to create agreed payment requests, share a payment URL and track settlement without handling card details. Visitors must not be able to select arbitrary amounts.

Official references:

- https://developer.paypal.com/api/rest/integration/orders-api/
- https://developer.paypal.com/reference/guidelines/idempotency/
- https://developer.paypal.com/docs/api/webhooks/v1/
- https://developer.paypal.com/api/rest/webhooks/event-names
- https://www.paypal.com/es/business/paypal-business-fees

## Decision

Use PayPal Checkout with Orders API v2 and `CAPTURE` intent behind the `PaymentGateway` port.

The API creates an order only for an existing active payment request. Amount and currency are read from PostgreSQL and validated on the server. Create and capture POST requests use stable `PayPal-Request-Id` values.

Webhook requests are verified before processing. Provider webhook event IDs and order IDs are persisted with unique constraints. Capture results and relevant webhook events update application-owned payment state idempotently.

## Consequences

Benefits:

- The application never receives or stores card details.
- Sandbox accounts support testing without real payments.
- PayPal provides buyer approval, capture and webhook infrastructure.

Costs:

- Live transactions incur PayPal fees.
- For a Spanish account, the verified standard domestic commercial rate is 2.90% plus EUR 0.35 when receiving EUR, with possible international additions.
- PayPal API and webhook availability become external dependencies.

## Security rules

- Keep the client secret and access tokens server-side.
- Do not persist OAuth access tokens.
- Separate sandbox and live credentials and endpoints.
- Verify webhook signatures before any state transition.
- Never trust browser amount, currency, order status or capture status.
- Return payment success only after server verification.

## Replacement seam

`PaymentGateway` owns provider-neutral create-order, capture and verification operations. PayPal request and response shapes stay in the adapter.

## Disabled and failure behaviour

When PayPal is not configured, payment pages explain that online payment is unavailable and administrator payment creation remains disabled. Existing lead and contact features continue working. Timeout or ambiguous capture responses are reconciled with the same idempotency key and provider order lookup before retrying.
