CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Family',
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
