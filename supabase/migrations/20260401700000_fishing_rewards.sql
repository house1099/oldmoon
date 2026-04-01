-- =============================================
-- fish_type enum、fishing_logs 遷移、fishing_rewards、
-- coin_transactions.source=fishing、system_settings
-- =============================================

-- 1. fish_type enum（五種魚）
DO $$ BEGIN
  CREATE TYPE public.fish_type AS ENUM (
    'common',
    'rare',
    'legendary',
    'matchmaker',
    'leviathan'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. fishing_logs：TEXT + CHECK → fish_type enum
ALTER TABLE public.fishing_logs
  DROP CONSTRAINT IF EXISTS fishing_logs_fish_type_check;

ALTER TABLE public.fishing_logs
  ALTER COLUMN fish_type TYPE public.fish_type
  USING fish_type::public.fish_type;

-- 3. reward enums
DO $$ BEGIN
  CREATE TYPE public.fishing_reward_tier AS ENUM ('small', 'medium', 'large');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fishing_reward_type AS ENUM (
    'coins_free',
    'coins_premium',
    'exp',
    'shop_item'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. fishing_rewards
CREATE TABLE IF NOT EXISTS public.fishing_rewards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fish_type    public.fish_type NOT NULL,
  reward_tier  public.fishing_reward_tier NOT NULL,
  reward_type  public.fishing_reward_type NOT NULL,
  shop_item_id uuid REFERENCES public.shop_items (id) ON DELETE SET NULL,
  coins_amount integer CHECK (coins_amount IS NULL OR coins_amount > 0),
  exp_amount   integer CHECK (exp_amount IS NULL OR exp_amount > 0),
  weight       integer NOT NULL DEFAULT 1 CHECK (weight > 0),
  stock        integer CHECK (stock IS NULL OR stock > 0),
  stock_used   integer NOT NULL DEFAULT 0 CHECK (stock_used >= 0),
  is_active    boolean NOT NULL DEFAULT true,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fishing_rewards_fish_type_idx
  ON public.fishing_rewards (fish_type, reward_tier, is_active);

DROP TRIGGER IF EXISTS fishing_rewards_updated_at ON public.fishing_rewards;
CREATE TRIGGER fishing_rewards_updated_at
  BEFORE UPDATE ON public.fishing_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.fishing_rewards ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.fishing_rewards.stock IS 'NULL = 無限量；有值時配合 stock_used 與 consume_fishing_reward_stock';

-- 5. 原子扣庫存（僅限 stock IS NOT NULL；無限量獎品不呼叫）
CREATE OR REPLACE FUNCTION public.consume_fishing_reward_stock(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.fishing_rewards
  SET stock_used = stock_used + 1
  WHERE id = p_id
    AND stock IS NOT NULL
    AND stock_used < stock;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_fishing_reward_stock(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_fishing_reward_stock(uuid) TO service_role;

-- 6. coin_transactions.source 補 fishing
ALTER TABLE public.coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_source_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_source_check
  CHECK (
    source = ANY (
      ARRAY[
        'checkin'::text,
        'loot_box'::text,
        'admin_grant'::text,
        'admin_deduct'::text,
        'admin_adjust'::text,
        'shop_purchase'::text,
        'shop_resell'::text,
        'refund'::text,
        'convert_in'::text,
        'convert_out'::text,
        'topup'::text,
        'market_trade_buy'::text,
        'market_trade_sell'::text,
        'fishing'::text
      ]
    )
  );

-- 7. system_settings
INSERT INTO public.system_settings (key, value)
VALUES
  ('fishing_enabled', 'true'),
  ('fishing_age_max', '30')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
