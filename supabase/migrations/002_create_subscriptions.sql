-- 002_create_subscriptions.sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  user_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  customer_id text,
  raw jsonb,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
