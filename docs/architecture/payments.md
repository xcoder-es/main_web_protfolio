# Payment requests and PayPal reconciliation

The payment capability is a server-owned workflow. Administrators create an agreed payment request with a fixed amount in minor currency units. Public callers receive only an unguessable payment token and cannot submit or override amount, currency, title or provider status.

## Domain and application boundaries

- `Money` validates positive safe-integer minor units and ISO-style currency codes.
- `PaymentStatus` controls draft, active, processing, paid, cancelled, expired, failed and refunded transitions.
- `PaymentsService` owns creation, activation, cancellation, order creation, capture, history and audit workflows.
- `PayPalWebhookService` owns signature verification, unique event ingestion and provider-driven reconciliation.
- `PaymentGateway` isolates OAuth, Orders v2, capture and webhook-verification payloads from application code.

## Idempotency

Order and capture calls use deterministic PayPal request IDs derived from the internal payment request ID. Provider order IDs, capture IDs and webhook event IDs are persisted under unique constraints. A repeated public call returns the existing order or paid state without creating a second charge.

## Verification rules

- Create-order amounts come only from the persisted payment request.
- Capture responses must match the persisted order ID, amount and currency.
- Webhook state changes occur only after PayPal reports successful signature verification.
- Verified amount mismatches are retained for investigation and never mark a payment paid.
- Card details, OAuth tokens, PayPal credentials and raw approval secrets are never stored.

## HTTP boundaries

Clerk-protected owner operations:

- `POST /api/admin/payment-requests`
- `GET /api/admin/payment-requests`
- `GET /api/admin/payment-requests/:paymentRequestId`
- `GET /api/admin/payment-requests/:paymentRequestId/events`
- `POST /api/admin/payment-requests/:paymentRequestId/activate`
- `POST /api/admin/payment-requests/:paymentRequestId/cancel`

Public payment operations:

- `GET /api/public/payment-requests/:publicToken`
- `POST /api/public/payment-requests/:publicToken/orders`
- `POST /api/public/payment-requests/:publicToken/capture`

Provider callback:

- `POST /api/webhooks/paypal`

## Render and PayPal setup

Configure Staging with Sandbox credentials and Production with Live credentials. Never copy Sandbox webhook IDs or credentials into Production.

Required server-side variables:

- `PAYMENTS_ENABLED=true`
- `PAYPAL_MODE=sandbox` in Staging and `PAYPAL_MODE=live` in Production
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_BASE_URL` only when overriding the mode-derived official endpoint

In the PayPal Developer Dashboard, register the environment-specific callback URL ending in `/api/webhooks/paypal` and subscribe at minimum to capture completed, capture denied and capture refunded events.

## Failure and recovery

A missing configuration keeps payment readiness unavailable without affecting leads, identity or notifications. Ambiguous provider failures remain retryable through the same deterministic request ID. Webhook verification failures return a retryable service response, while verified duplicate events become harmless no-ops.
