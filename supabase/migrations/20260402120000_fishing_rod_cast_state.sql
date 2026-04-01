-- Per-user per-rod-instance: daily cast count (Taipei calendar) + last cast time for cooldown.
-- Application resets casts_used when taipei_date_key differs from today.

CREATE TABLE public.fishing_rod_cast_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  rod_user_reward_id uuid NOT NULL REFERENCES public.user_rewards (id) ON DELETE CASCADE,
  taipei_date_key text NOT NULL,
  casts_used integer NOT NULL DEFAULT 0 CHECK (casts_used >= 0),
  last_cast_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rod_user_reward_id)
);

CREATE INDEX idx_fishing_rod_cast_state_user ON public.fishing_rod_cast_state (user_id);

ALTER TABLE public.fishing_rod_cast_state ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fishing_rod_cast_state IS '釣魚：釣竿每日拋竿次數與上次收竿時間（冷卻）；由 service_role 寫入';

NOTIFY pgrst, 'reload schema';
