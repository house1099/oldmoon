-- 商城：封存（不再主打列表顯示；有購買紀錄不可刪時可移入此區）
ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_items.is_archived IS '封存：後台整理用；玩家賣場 findActiveShopItems 應排除';

CREATE INDEX IF NOT EXISTS idx_shop_items_archived ON public.shop_items (is_archived);
