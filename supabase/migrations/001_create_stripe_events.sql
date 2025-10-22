-- 001_create_stripe_events.sql
CREATE TABLE IF NOT EXISTS stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz DEFAULT now()
);

-- Ensure idempotency by having a primary key on id
