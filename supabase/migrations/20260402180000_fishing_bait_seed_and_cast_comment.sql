-- shop_items.sku unique (idempotent) for ON CONFLICT (sku)
CREATE UNIQUE INDEX IF NOT EXISTS shop_items_sku_unique ON public.shop_items (sku);

COMMENT ON COLUMN public.fishing_rod_cast_state.last_cast_at IS '上次拋竿時間（拋竿冷卻起點）。';

INSERT INTO public.shop_items
  (name, sku, item_type, currency_type, price, description,
   is_active, metadata)
VALUES
  (
    '🪱 普通餌料',
    'BAIT_NORMAL_01',
    'fishing_bait',
    'free_coins',
    50,
    '只能釣到普通魚，適合新手練習。',
    true,
    '{"bait_common_rate": 100}'::jsonb
  ),
  (
    '🐙 章魚餌料',
    'BAIT_OCTOPUS_01',
    'fishing_bait',
    'free_coins',
    200,
    '可釣到稀有魚、傳說魚，極低機率遇見深海巨獸。',
    true,
    '{"bait_rare_rate": 89.9, "bait_legendary_rate": 10, "bait_leviathan_rate": 0.1}'::jsonb
  ),
  (
    '💕 愛心餌料',
    'BAIT_HEART_01',
    'fishing_bait',
    'premium_coins',
    30,
    '專屬月老魚餌，使用後只會釣到月老魚。需先設定單身狀態。',
    true,
    '{"bait_matchmaker_rate": 100}'::jsonb
  )
ON CONFLICT (sku) DO NOTHING;

NOTIFY pgrst, 'reload schema';
