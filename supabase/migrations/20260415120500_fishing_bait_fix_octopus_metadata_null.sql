-- 章魚餌：若 metadata 為空或誤設普通餌，改為稀有+傳說+深海巨獸（與 20260402180000 BAIT_OCTOPUS_01 比例一致）
UPDATE public.shop_items
SET metadata = '{"bait_rare_rate": 89.9, "bait_legendary_rate": 10, "bait_leviathan_rate": 0.1}'::jsonb,
    updated_at = now()
WHERE item_type = 'fishing_bait'
  AND (
    name LIKE '%章魚%'
    OR sku ILIKE '%OCTO%'
    OR sku = 'FISHFOOD_02'
  )
  AND (
    metadata IS NULL
    OR (metadata->>'bait_common_rate')::numeric = 100
    OR (
      coalesce((metadata->>'bait_rare_rate')::numeric, 0)
      + coalesce((metadata->>'bait_legendary_rate')::numeric, 0)
      + coalesce((metadata->>'bait_leviathan_rate')::numeric, 0)
    ) < 99.5
  );
