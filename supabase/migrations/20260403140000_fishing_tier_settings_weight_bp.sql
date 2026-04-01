-- Tier distribution per fish_type (basis points: 10000 = 100.00%).
-- fishing_rewards.weight: bigint, hundredths of a percent within tier (100 = 1.00%; min 1).

CREATE TABLE IF NOT EXISTS public.fishing_tier_settings (
  fish_type public.fish_type PRIMARY KEY,
  p_small_bp  integer NOT NULL DEFAULT 6000 CHECK (p_small_bp >= 0 AND p_small_bp <= 10000),
  p_medium_bp integer NOT NULL DEFAULT 3000 CHECK (p_medium_bp >= 0 AND p_medium_bp <= 10000),
  p_large_bp  integer NOT NULL DEFAULT 1000 CHECK (p_large_bp >= 0 AND p_large_bp <= 10000),
  remainder_mode text NOT NULL DEFAULT 'interval_miss'
    CHECK (remainder_mode IN ('interval_miss', 'normalize')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fishing_tier_settings IS '小／中／大獎 tier 抽選：basis points 加總可小於 10000（interval_miss 時其餘為 miss）';
COMMENT ON COLUMN public.fishing_tier_settings.remainder_mode IS 'interval_miss：加總外為 miss；normalize：加總正規化至 10000 再抽';

INSERT INTO public.fishing_tier_settings (fish_type, p_small_bp, p_medium_bp, p_large_bp, remainder_mode)
VALUES
  ('common', 6000, 3000, 1000, 'interval_miss'),
  ('rare', 6000, 3000, 1000, 'interval_miss'),
  ('legendary', 6000, 3000, 1000, 'interval_miss'),
  ('matchmaker', 6000, 3000, 1000, 'interval_miss'),
  ('leviathan', 6000, 3000, 1000, 'interval_miss')
ON CONFLICT (fish_type) DO NOTHING;

ALTER TABLE public.fishing_tier_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS fishing_tier_settings_updated_at ON public.fishing_tier_settings;
CREATE TRIGGER fishing_tier_settings_updated_at
  BEFORE UPDATE ON public.fishing_tier_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';

-- Relative weight within tier: 1 old unit -> 100 bp (display as 1.00% when alone)
ALTER TABLE public.fishing_rewards
  DROP CONSTRAINT IF EXISTS fishing_rewards_weight_check;

ALTER TABLE public.fishing_rewards
  ALTER COLUMN weight TYPE bigint USING ((weight::bigint) * 100);

ALTER TABLE public.fishing_rewards
  ADD CONSTRAINT fishing_rewards_weight_positive CHECK (weight > 0);
