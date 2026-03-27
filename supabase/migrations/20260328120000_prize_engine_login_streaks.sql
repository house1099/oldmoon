-- 通用抽獎引擎 + 七日簽到 streak（若雲端已手動建立表可略過；與 MCP 執行 DDL 對齊）
CREATE TABLE IF NOT EXISTS public.login_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_claim_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.prize_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prize_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.prize_pools(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  label text NOT NULL,
  min_value int NULL,
  max_value int NULL,
  weight int NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prize_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pool_id uuid NOT NULL REFERENCES public.prize_pools(id),
  item_id uuid NOT NULL REFERENCES public.prize_items(id),
  pool_type text NOT NULL,
  reward_type text NOT NULL,
  reward_value int NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  item_ref_id uuid REFERENCES public.prize_items(id),
  label text NOT NULL,
  is_equipped boolean NOT NULL DEFAULT false,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.prize_pools (pool_type, label, description)
VALUES ('loot_box', '公會盲盒', '七日連續報到第7天獲得')
ON CONFLICT (pool_type) DO NOTHING;

INSERT INTO public.prize_items (pool_id, reward_type, label, min_value, max_value, weight)
SELECT p.id, v.reward_type, v.label, v.min_value, v.max_value, v.weight
FROM public.prize_pools p,
(VALUES
  ('coins',        '探險幣小袋',   5,  10, 40),
  ('coins',        '探險幣大袋',  11,  20, 20),
  ('exp',          '經驗值小瓶',   5,  10, 25),
  ('exp',          '經驗值大瓶',  11,  15, 10),
  ('title',        '傳奇冒險者', NULL, NULL, 3),
  ('avatar_frame', '星辰之框',   NULL, NULL, 1),
  ('broadcast',    '廣播大聲公', NULL, NULL, 1)
) AS v(reward_type, label, min_value, max_value, weight)
WHERE p.pool_type = 'loot_box'
AND NOT EXISTS (SELECT 1 FROM public.prize_items WHERE pool_id = p.id);

NOTIFY pgrst, 'reload schema';
