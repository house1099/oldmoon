-- Pending cast: bait consumed at cast; fish rolled at harvest after rod_wait_until_harvest_minutes.

ALTER TABLE public.fishing_rod_cast_state
  ADD COLUMN IF NOT EXISTS pending_cast_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_bait_shop_item_id uuid REFERENCES public.shop_items (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.fishing_rod_cast_state.pending_cast_started_at IS '拋竿時間；收成前不可再拋。';
COMMENT ON COLUMN public.fishing_rod_cast_state.pending_bait_shop_item_id IS '已消耗魚餌對應之商城商品，收成時依 metadata 抽魚種。';

NOTIFY pgrst, 'reload schema';
