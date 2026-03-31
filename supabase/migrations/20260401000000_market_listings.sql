-- =============================================
-- 玩家自由市場：coin_transactions.source、system_settings、market_listings、RPC
-- coin_transactions.source 沿用既有值並新增 market_trade_buy / market_trade_sell（勿改用 purchase 等別名，以免破壞現有流水）。
-- =============================================

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
        'market_trade_sell'::text
      ]
    )
  );

INSERT INTO public.system_settings (key, value) VALUES
  ('market_tax_rate',              '0'),
  ('market_max_listings_per_user', '5'),
  ('market_listing_days',          '7')
ON CONFLICT (key) DO NOTHING;

-- status enum
DO $$ BEGIN
  CREATE TYPE public.market_listing_status AS ENUM
    ('active', 'sold', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.market_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_reward_id  uuid NOT NULL REFERENCES public.user_rewards(id) ON DELETE CASCADE,
  shop_item_id    uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  price           integer NOT NULL CHECK (price > 0),
  currency_type   text NOT NULL CHECK (currency_type IN ('free_coins', 'premium_coins')),
  status          public.market_listing_status NOT NULL DEFAULT 'active',
  expires_at      timestamptz NOT NULL,
  buyer_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sold_at         timestamptz,
  seller_received integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS market_listings_reward_active_unique
  ON public.market_listings (user_reward_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS market_listings_status_idx
  ON public.market_listings (status);
CREATE INDEX IF NOT EXISTS market_listings_seller_idx
  ON public.market_listings (seller_id);
CREATE INDEX IF NOT EXISTS market_listings_shop_item_idx
  ON public.market_listings (shop_item_id);

ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS market_listings_updated_at ON public.market_listings;
CREATE TRIGGER market_listings_updated_at
  BEFORE UPDATE ON public.market_listings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================
-- RPC：buy_market_item（coin_transactions 使用 coin_type free/premium 與 balance_after，與 L2 coin.repository 一致）
-- =============================================
CREATE OR REPLACE FUNCTION public.buy_market_item(
  p_listing_id uuid,
  p_buyer_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing       public.market_listings%ROWTYPE;
  v_buyer_coins   integer;
  v_tax_rate      numeric;
  v_tax_amount    integer;
  v_seller_gets   integer;
  v_coin_pg       text;
  v_buyer_after   integer;
  v_seller_after  integer;
BEGIN
  SELECT * INTO v_listing
  FROM public.market_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'listing_not_found');
  END IF;

  IF v_listing.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'listing_not_active');
  END IF;

  IF v_listing.expires_at < now() THEN
    UPDATE public.market_listings
    SET status = 'expired', updated_at = now()
    WHERE id = p_listing_id;
    RETURN jsonb_build_object('ok', false, 'error', 'listing_expired');
  END IF;

  IF v_listing.seller_id = p_buyer_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_buy_own_listing');
  END IF;

  IF v_listing.currency_type = 'free_coins' THEN
    v_coin_pg := 'free';
  ELSIF v_listing.currency_type = 'premium_coins' THEN
    v_coin_pg := 'premium';
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_currency');
  END IF;

  IF v_listing.currency_type = 'free_coins' THEN
    SELECT free_coins INTO v_buyer_coins
    FROM public.users WHERE id = p_buyer_id FOR UPDATE;
  ELSE
    SELECT premium_coins INTO v_buyer_coins
    FROM public.users WHERE id = p_buyer_id FOR UPDATE;
  END IF;

  IF v_buyer_coins < v_listing.price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  SELECT COALESCE(value::numeric, 0) INTO v_tax_rate
  FROM public.system_settings WHERE key = 'market_tax_rate';

  v_tax_amount  := FLOOR(v_listing.price * v_tax_rate / 100)::integer;
  v_seller_gets := v_listing.price - v_tax_amount;

  IF v_listing.currency_type = 'free_coins' THEN
    UPDATE public.users
    SET free_coins = free_coins - v_listing.price
    WHERE id = p_buyer_id;

    UPDATE public.users
    SET free_coins = free_coins + v_seller_gets
    WHERE id = v_listing.seller_id;
  ELSE
    UPDATE public.users
    SET premium_coins = premium_coins - v_listing.price
    WHERE id = p_buyer_id;

    UPDATE public.users
    SET premium_coins = premium_coins + v_seller_gets
    WHERE id = v_listing.seller_id;
  END IF;

  IF v_listing.currency_type = 'free_coins' THEN
    SELECT free_coins INTO v_buyer_after FROM public.users WHERE id = p_buyer_id;
    SELECT free_coins INTO v_seller_after FROM public.users WHERE id = v_listing.seller_id;
  ELSE
    SELECT premium_coins INTO v_buyer_after FROM public.users WHERE id = p_buyer_id;
    SELECT premium_coins INTO v_seller_after FROM public.users WHERE id = v_listing.seller_id;
  END IF;

  UPDATE public.user_rewards
  SET user_id     = p_buyer_id,
      is_equipped = false,
      used_at     = NULL
  WHERE id = v_listing.user_reward_id;

  UPDATE public.market_listings
  SET status          = 'sold',
      buyer_id        = p_buyer_id,
      sold_at         = now(),
      seller_received = v_seller_gets,
      updated_at      = now()
  WHERE id = p_listing_id;

  INSERT INTO public.coin_transactions
    (user_id, amount, coin_type, balance_after, source, reference_id, note)
  VALUES
    (p_buyer_id,
     -v_listing.price,
     v_coin_pg,
     v_buyer_after,
     'market_trade_buy',
     p_listing_id,
     '購買市場道具，訂單 ' || p_listing_id::text);

  INSERT INTO public.coin_transactions
    (user_id, amount, coin_type, balance_after, source, reference_id, note)
  VALUES
    (v_listing.seller_id,
     v_seller_gets,
     v_coin_pg,
     v_seller_after,
     'market_trade_sell',
     p_listing_id,
     '市場道具售出，訂單 ' || p_listing_id::text);

  RETURN jsonb_build_object(
    'ok',           true,
    'seller_id',    v_listing.seller_id,
    'item_id',      v_listing.shop_item_id,
    'price',        v_listing.price,
    'seller_gets',  v_seller_gets,
    'currency',     v_listing.currency_type
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- RPC：cancel_market_listing
-- =============================================
CREATE OR REPLACE FUNCTION public.cancel_market_listing(
  p_listing_id uuid,
  p_user_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.market_listings%ROWTYPE;
BEGIN
  SELECT * INTO v_listing
  FROM public.market_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'listing_not_found');
  END IF;

  IF v_listing.seller_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_your_listing');
  END IF;

  IF v_listing.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'listing_not_active');
  END IF;

  UPDATE public.market_listings
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_listing_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.buy_market_item(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_market_item(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_market_listing(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_market_listing(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
