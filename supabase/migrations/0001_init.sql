-- SaaS Subscription Starter — initial schema
-- Entitlements are mirrored from Stripe via webhooks. Users may only READ their
-- own rows; every write happens through the service-role client in server code.

create table billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id text primary key,                        -- Stripe subscription id
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,                       -- Stripe status verbatim
  price_id text not null,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on subscriptions (user_id);

create table stripe_events (
  id text primary key,                        -- Stripe event id (idempotency key)
  type text not null,
  status text not null default 'received',    -- 'received' | 'processed'
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table billing_customers enable row level security;
alter table subscriptions enable row level security;
alter table stripe_events enable row level security;

-- Users can SELECT their own rows. No insert/update/delete policies exist for
-- users, so all writes are rejected unless performed by the service role
-- (which bypasses RLS entirely).

create policy "billing_customers: select own"
  on billing_customers
  for select
  using (auth.uid() = user_id);

create policy "subscriptions: select own"
  on subscriptions
  for select
  using (auth.uid() = user_id);

-- stripe_events has RLS enabled and NO policies: no user can read or write it.
-- Only the service-role client (which bypasses RLS) touches this table.
