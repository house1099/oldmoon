-- 蝦仁豬心餌（heart）：確保為月老餌權重；若商品名稱含關鍵字且仍為普通餌可修正
UPDATE public.shop_items
SET metadata = '{"bait_matchmaker_rate": 100}'::jsonb,
    updated_at = now()
WHERE item_type = 'fishing_bait'
  AND (
    name LIKE '%蝦仁%'
    OR name LIKE '%豬心%'
    OR sku ILIKE '%SHRIMP%'
    OR sku ILIKE '%HEART%'
  )
  AND (
    metadata IS NULL
    OR metadata->>'bait_matchmaker_rate' IS NULL
    OR (metadata->>'bait_common_rate')::numeric = 100
  );
