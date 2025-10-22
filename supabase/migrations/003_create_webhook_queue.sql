-- 003_create_webhook_queue.sql
CREATE TABLE IF NOT EXISTS webhook_queue (
  id serial PRIMARY KEY,
  event_id text UNIQUE,
  event_type text,
  payload jsonb,
  attempts integer DEFAULT 0,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_processed ON webhook_queue(processed);
