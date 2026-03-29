-- 商城商品：玩家持有後的贈送／刪除／回賣／未來市集買賣 等後台開關
ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS allow_gift boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_player_trade boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_resell boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resell_price integer,
  ADD COLUMN IF NOT EXISTS resell_currency_type text,
  ADD COLUMN IF NOT EXISTS allow_delete boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.shop_items.allow_gift IS '血盟贈送等：是否允許玩家轉讓';
COMMENT ON COLUMN public.shop_items.allow_player_trade IS '預留：玩家間買賣／市集';
COMMENT ON COLUMN public.shop_items.allow_resell IS '是否允許回賣給系統';
COMMENT ON COLUMN public.shop_items.resell_price IS '單件回收價（與 resell_currency_type 或幣種）';
COMMENT ON COLUMN public.shop_items.resell_currency_type IS '回收幣種；NULL 表示沿用 currency_type';
COMMENT ON COLUMN public.shop_items.allow_delete IS '是否允許玩家從背包刪除';

NOTIFY pgrst, 'reload schema';
