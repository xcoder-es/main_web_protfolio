# Durable notifications

New contact and project submissions are persisted before notification work begins. `SubmissionNotificationCoordinator` then queues and attempts the notification on a best-effort path, so email and notification-storage failures cannot roll back a valid lead.

## Lifecycle

Notifications move through `pending`, `sending`, `sent`, `failed` or `skipped`. Each delivery creates an immutable numbered attempt record that is completed as sent or failed. Failed notifications may return to `sending` through manual retry. Sent and currently sending notifications are idempotent no-ops when retried.

## Deduplication

Each logical lead notification uses `lead-submitted/<lead-id>` as its durable database deduplication key. The same value is sent to Resend in the `Idempotency-Key` header. Database uniqueness remains authoritative because Resend retains its provider idempotency window for only 24 hours.

## Provider boundary

`NotificationSender` is an application-owned outbound port. `ResendNotificationSender` translates the message to `POST /emails` and returns only the provider message identifier. Provider payloads, API keys and raw error messages do not enter domain or application records.

`DisabledNotificationSender` produces a controlled failed attempt. This keeps local and partially configured environments observable without pretending delivery occurred.

## Administrator operations

- `GET /api/admin/notifications`
- `GET /api/admin/notifications?status=failed`
- `GET /api/admin/notifications/pending`
- `GET /api/admin/notifications/:notificationId`
- `POST /api/admin/notifications/:notificationId/retry`

These routes remain inside the administrator route boundary and will inherit Clerk enforcement when the identity issue is implemented.

## Configuration

Set `NOTIFICATIONS_ENABLED=true` only after configuring:

- `NOTIFICATION_RECIPIENT_EMAIL`
- `RESEND_FROM_EMAIL`
- `RESEND_API_KEY`
- `RESEND_BASE_URL` only when overriding the official API origin

The sender address must use a domain verified in Resend before sending to arbitrary recipients. Secrets remain server-side and must never use a public frontend prefix.
