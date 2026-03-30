-- 廣播券：確保背包可贈送／刪除（與後台預設一致；修正曾被誤設為 false 的列）
UPDATE public.shop_items
SET
  allow_gift = true,
  allow_delete = true
WHERE item_type = 'broadcast';

NOTIFY pgrst, 'reload schema';
