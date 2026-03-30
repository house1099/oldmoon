-- 廣播券：商品說明字數 30→50（僅替換明確片語）；空白描述補預設文案
UPDATE public.shop_items
SET description = TRIM(
  BOTH
  FROM
    replace(
      replace(
        replace(COALESCE(description, ''), '1〜30 字', '1〜50 字'),
        '1～30 字',
        '1～50 字'
      ),
      '1-30 字',
      '1-50 字'
    )
)
WHERE item_type = 'broadcast';

UPDATE public.shop_items
SET description = '使用後可於全站頂部橫幅發布一則訊息（1〜50 字），約 24 小時內有效。'
WHERE item_type = 'broadcast'
  AND (description IS NULL OR btrim(description) = '');

NOTIFY pgrst, 'reload schema';
