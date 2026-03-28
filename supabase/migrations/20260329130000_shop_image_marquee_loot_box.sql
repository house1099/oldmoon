-- 商城圖片欄位、跑馬燈設定、公會盲盒獎池（雲端若缺 loot_box 時補齊）
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS image_url text NULL;

INSERT INTO public.system_settings (key, value) VALUES
  ('marquee_speed_seconds', '10'),
  ('marquee_broadcast_effect', 'glow')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.prize_pools (pool_type, label, description, is_active)
SELECT 'loot_box', '公會盲盒', '商城與簽到盲盒', true
WHERE NOT EXISTS (SELECT 1 FROM public.prize_pools WHERE pool_type = 'loot_box');

INSERT INTO public.prize_items (pool_id, reward_type, label, min_value, max_value, weight)
SELECT p.id, v.reward_type::text, v.label, v.min_value, v.max_value, v.weight
FROM public.prize_pools p,
(VALUES
  ('coins'::text, '探險幣小袋', 5, 10, 40),
  ('coins', '探險幣大袋', 11, 20, 20),
  ('exp', '經驗值小瓶', 5, 10, 25),
  ('exp', '經驗值大瓶', 11, 15, 10),
  ('title', '傳奇冒險者', NULL::int, NULL::int, 3),
  ('avatar_frame', '星辰之框', NULL::int, NULL::int, 1),
  ('broadcast', '廣播大聲公', NULL::int, NULL::int, 1)
) AS v(reward_type, label, min_value, max_value, weight)
WHERE p.pool_type = 'loot_box'
AND NOT EXISTS (SELECT 1 FROM public.prize_items WHERE pool_id = p.id);

NOTIFY pgrst, 'reload schema';
