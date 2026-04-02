-- Public product images under /shop/fishing/* ; seed three fishing rods; set image_url for six SKUs

INSERT INTO public.shop_items
  (name, sku, item_type, currency_type, price, description, is_active, metadata, image_url)
VALUES
  (
    '初階釣竿',
    'ROD_BEGINNER_01',
    'fishing_rod',
    'free_coins',
    150,
    '入門款釣竿，每日可拋竿次數較少，適合熟悉操作。',
    true,
    '{"rod_max_casts_per_day": 3, "rod_wait_until_harvest_minutes": 1, "rod_cooldown_minutes": 1}'::jsonb,
    '/shop/fishing/rod-beginner.png'
  ),
  (
    '中階釣竿',
    'ROD_INTERMEDIATE_01',
    'fishing_rod',
    'free_coins',
    400,
    '中階款釣竿，每日拋竿額度與體驗平衡。',
    true,
    '{"rod_max_casts_per_day": 5, "rod_wait_until_harvest_minutes": 1, "rod_cooldown_minutes": 1}'::jsonb,
    '/shop/fishing/rod-intermediate.png'
  ),
  (
    '高級釣竿',
    'ROD_ADVANCED_01',
    'fishing_rod',
    'premium_coins',
    80,
    '高級釣竿，每日可拋竿次數較多。',
    true,
    '{"rod_max_casts_per_day": 10, "rod_wait_until_harvest_minutes": 1, "rod_cooldown_minutes": 1}'::jsonb,
    '/shop/fishing/rod-advanced.png'
  )
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  item_type = EXCLUDED.item_type,
  currency_type = EXCLUDED.currency_type,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  image_url = EXCLUDED.image_url;

UPDATE public.shop_items
SET image_url = '/shop/fishing/bait-normal.png'
WHERE sku = 'BAIT_NORMAL_01';

UPDATE public.shop_items
SET image_url = '/shop/fishing/bait-octopus.png'
WHERE sku = 'BAIT_OCTOPUS_01';

UPDATE public.shop_items
SET image_url = '/shop/fishing/bait-heart.png'
WHERE sku = 'BAIT_HEART_01';

NOTIFY pgrst, 'reload schema';
