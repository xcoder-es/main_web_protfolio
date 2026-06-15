begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_type text not null check (lead_type in ('contact', 'project')),
  status text not null default 'new' check (
    status in ('new', 'reviewing', 'qualified', 'contacted', 'won', 'lost', 'archived', 'spam')
  ),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 128),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) between 7 and 40),
  subject text check (subject is null or char_length(subject) between 3 and 160),
  company text check (company is null or char_length(company) between 2 and 160),
  project_type text,
  message text not null check (char_length(message) between 20 and 8000),
  desired_outcome text check (desired_outcome is null or char_length(desired_outcome) between 20 and 4000),
  budget_range text,
  timeline text,
  language text not null check (language in ('en', 'es')),
  page_url text not null check (char_length(page_url) <= 2048),
  consented_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_type_payload_check check (
    (lead_type = 'contact' and subject is not null)
    or
    (lead_type = 'project' and project_type is not null)
  ),
  constraint leads_archive_state_check check (
    archived_at is null or status = 'archived'
  )
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  author_principal_id text not null check (char_length(author_principal_id) between 1 and 255),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  template_key text not null check (char_length(template_key) between 1 and 120),
  recipient text not null check (char_length(recipient) between 3 and 320),
  status text not null default 'pending' check (
    status in ('pending', 'sending', 'sent', 'failed', 'skipped')
  ),
  deduplication_key text not null unique check (char_length(deduplication_key) between 16 and 160),
  provider_message_id text,
  last_error_code text,
  last_error_message text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_sent_state_check check (
    (status = 'sent' and sent_at is not null)
    or
    (status <> 'sent')
  )
);

create table if not exists public.notification_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('sending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_attempt_number_unique unique (notification_id, attempt_number),
  constraint notification_attempt_time_check check (
    finished_at is null or finished_at >= started_at
  )
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  public_token uuid not null default gen_random_uuid() unique,
  title text not null check (char_length(title) between 3 and 160),
  description text check (description is null or char_length(description) <= 2000),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (
    status in ('draft', 'active', 'processing', 'paid', 'cancelled', 'expired', 'failed', 'refunded')
  ),
  provider text check (provider is null or provider in ('paypal')),
  provider_order_id text,
  expires_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_paid_state_check check (
    (status = 'paid' and paid_at is not null)
    or
    (status <> 'paid')
  ),
  constraint payment_cancelled_state_check check (
    (status = 'cancelled' and cancelled_at is not null)
    or
    (status <> 'cancelled')
  )
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  provider text not null check (provider in ('paypal', 'internal')),
  event_type text not null check (char_length(event_type) between 1 and 120),
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.paypal_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique check (char_length(provider_event_id) between 1 and 255),
  event_type text not null check (char_length(event_type) between 1 and 120),
  verification_status text not null default 'pending' check (
    verification_status in ('pending', 'verified', 'rejected', 'failed')
  ),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('visitor', 'administrator', 'system', 'provider')),
  actor_id text,
  action text not null check (char_length(action) between 1 and 160),
  entity_type text not null check (char_length(entity_type) between 1 and 120),
  entity_id uuid,
  correlation_id text not null check (char_length(correlation_id) between 8 and 128),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_submitted_idx
  on public.leads (status, submitted_at desc);
create index if not exists leads_email_idx
  on public.leads (lower(email));
create index if not exists lead_notes_lead_created_idx
  on public.lead_notes (lead_id, created_at desc);
create index if not exists notifications_status_scheduled_idx
  on public.notifications (status, scheduled_at);
create index if not exists notification_attempts_notification_idx
  on public.notification_attempts (notification_id, attempt_number desc);
create index if not exists payment_requests_status_created_idx
  on public.payment_requests (status, created_at desc);
create unique index if not exists payment_requests_provider_order_unique
  on public.payment_requests (provider_order_id)
  where provider_order_id is not null;
create unique index if not exists payment_events_provider_event_unique
  on public.payment_events (provider, provider_event_id)
  where provider_event_id is not null;
create index if not exists payment_events_request_occurred_idx
  on public.payment_events (payment_request_id, occurred_at desc);
create index if not exists paypal_webhooks_status_received_idx
  on public.paypal_webhook_events (verification_status, received_at);
create index if not exists audit_events_entity_created_idx
  on public.audit_events (entity_type, entity_id, created_at desc);
create index if not exists audit_events_correlation_idx
  on public.audit_events (correlation_id);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

drop trigger if exists payment_requests_set_updated_at on public.payment_requests;
create trigger payment_requests_set_updated_at
before update on public.payment_requests
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_attempts enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_events enable row level security;
alter table public.paypal_webhook_events enable row level security;
alter table public.audit_events enable row level security;

alter table public.leads force row level security;
alter table public.lead_notes force row level security;
alter table public.notifications force row level security;
alter table public.notification_attempts force row level security;
alter table public.payment_requests force row level security;
alter table public.payment_events force row level security;
alter table public.paypal_webhook_events force row level security;
alter table public.audit_events force row level security;

revoke all on table public.leads from anon, authenticated;
revoke all on table public.lead_notes from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.notification_attempts from anon, authenticated;
revoke all on table public.payment_requests from anon, authenticated;
revoke all on table public.payment_events from anon, authenticated;
revoke all on table public.paypal_webhook_events from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;

commit;
