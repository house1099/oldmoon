ALTER TABLE public.users
  -- 飲食習慣
  ADD COLUMN IF NOT EXISTS diet_type text,
  -- 抽菸相關
  ADD COLUMN IF NOT EXISTS smoking_habit text,
  ADD COLUMN IF NOT EXISTS accept_smoking text,
  -- 寵物相關
  ADD COLUMN IF NOT EXISTS my_pets text,
  ADD COLUMN IF NOT EXISTS accept_pets text,
  -- 單親相關
  ADD COLUMN IF NOT EXISTS has_children text,
  ADD COLUMN IF NOT EXISTS accept_single_parent text,
  -- 生育意願
  ADD COLUMN IF NOT EXISTS fertility_self text,
  ADD COLUMN IF NOT EXISTS fertility_pref text,
  -- 婚姻觀念
  ADD COLUMN IF NOT EXISTS marriage_view text,
  -- 星座相關
  ADD COLUMN IF NOT EXISTS zodiac text,
  ADD COLUMN IF NOT EXISTS exclude_zodiac text,
  -- 三觀（1-5 整數）
  ADD COLUMN IF NOT EXISTS v1_money integer
    CHECK (v1_money BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS v3_clingy integer
    CHECK (v3_clingy BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS v4_conflict integer
    CHECK (v4_conflict BETWEEN 1 AND 5);

COMMENT ON COLUMN public.users.diet_type IS '飲食習慣：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.smoking_habit IS '自身抽菸習慣：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.accept_smoking IS '接受對方抽菸程度：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.my_pets IS '自身寵物：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.accept_pets IS '接受對方寵物：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.has_children IS '是否有子女：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.accept_single_parent IS '接受單親：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.fertility_self IS '自身生育意願：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.fertility_pref IS '希望對方生育意願：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.marriage_view IS '婚姻觀念：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.zodiac IS '星座：月老魚配對用';
COMMENT ON COLUMN public.users.exclude_zodiac IS '排除星座：月老魚配對硬鎖用';
COMMENT ON COLUMN public.users.v1_money IS '金錢觀 1-5：月老魚三觀配對用';
COMMENT ON COLUMN public.users.v3_clingy IS '黏人程度 1-5：月老魚三觀配對用';
COMMENT ON COLUMN public.users.v4_conflict IS '衝突處理 1-5：月老魚三觀配對用';

-- system_settings 月老配對開關
INSERT INTO public.system_settings (key, value) VALUES
  ('matchmaker_lock_diet',          'false'),
  ('matchmaker_lock_smoking',       'false'),
  ('matchmaker_lock_pets',          'false'),
  ('matchmaker_lock_single_parent', 'false'),
  ('matchmaker_lock_fertility',     'false'),
  ('matchmaker_lock_marriage',      'false'),
  ('matchmaker_lock_zodiac',        'false'),
  ('matchmaker_lock_v1',            'false'),
  ('matchmaker_lock_v3',            'false'),
  ('matchmaker_lock_v4',            'false'),
  ('matchmaker_v_max_diff',         '2')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
