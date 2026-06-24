# Data Architecture

This application has a small but explicit data model. The goal is to keep every persistent object explainable from the user flow that creates it.

## Data domains

- leads
- lead notes
- audit events
- notifications
- notification attempts
- payment requests and related payment events
- webhook delivery records

## Data flow

```mermaid
flowchart LR
  Browser[Public browser]
  Admin[Administrator dashboard]
  API[Fastify API]
  Leads[(Lead repository)]
  Notes[(Lead notes)]
  Audit[(Audit log)]
  Notifications[(Notifications)]
  Attempts[(Notification attempts)]
  Payments[(Payment requests)]
  Webhooks[(Webhook events)]
  Resend[Resend]
  PayPal[PayPal]

  Browser --> API
  Admin --> API
  API --> Leads
  API --> Notes
  API --> Audit
  API --> Notifications
  API --> Attempts
  API --> Payments
  API --> Webhooks
  Notifications --> Resend
  Payments --> PayPal
```

## Storage principles

- Public submissions are persisted before any best-effort outbound side effects.
- Notification delivery is tracked as a separate record from the lead itself.
- Attempt records provide a timeline for retries and failures.
- Audit events are append-only and capture actor, action, and entity references.

## Logical model

```mermaid
erDiagram
  LEAD ||--o{ LEAD_NOTE : has
  LEAD ||--o{ NOTIFICATION : triggers
  NOTIFICATION ||--o{ NOTIFICATION_ATTEMPT : records
  PAYMENT_REQUEST ||--o{ PAYMENT_EVENT : emits
  PAYMENT_REQUEST ||--o{ WEBHOOK_EVENT : receives

  LEAD {
    string id
    string leadType
    string status
    string email
    string pageUrl
    string submittedAt
  }

  NOTIFICATION {
    string id
    string leadId
    string status
    string templateKey
    string recipient
    string scheduledAt
  }

  NOTIFICATION_ATTEMPT {
    string id
    string notificationId
    string status
    string startedAt
    string finishedAt
  }
```

## Consistency rules

- Lead creation is authoritative.
- Notification state can fail independently without rolling back the lead.
- Retry is idempotent on the notification record.
- Webhook records are minimized to avoid storing provider payload noise.
