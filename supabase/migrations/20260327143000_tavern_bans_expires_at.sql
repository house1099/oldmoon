ALTER TABLE public.tavern_bans
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
