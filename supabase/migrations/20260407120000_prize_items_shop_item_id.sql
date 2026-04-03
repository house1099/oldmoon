-- 獎池獎項可選關聯商城商品；發獎時寫入 user_rewards.shop_item_id 供玩家市集上架
ALTER TABLE public.prize_items
  ADD COLUMN IF NOT EXISTS shop_item_id uuid NULL REFERENCES public.shop_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.prize_items.shop_item_id IS
  '可選。對應商城商品 id；抽獎發放 user_rewards 時一併寫入，與商城購買同款道具一致。';

CREATE INDEX IF NOT EXISTS prize_items_shop_item_id_idx
  ON public.prize_items (shop_item_id)
  WHERE shop_item_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
