-- 自身身高
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS height_cm integer
    CHECK (height_cm BETWEEN 100 AND 250);

COMMENT ON COLUMN public.users.height_cm
  IS '自身身高（公分），月老魚配對與個人資料用';

-- 身高也加入申請修改流程
ALTER TABLE public.profile_change_requests
  ADD COLUMN IF NOT EXISTS new_height_cm integer
    CHECK (new_height_cm BETWEEN 100 AND 250);

-- system_settings Banner 月老欄位觸發開關
INSERT INTO public.system_settings (key, value) VALUES
  ('banner_check_matchmaker_fields', 'true')
ON CONFLICT (key) DO NOTHING;

-- 月老身高硬鎖（後台釣魚設定）
INSERT INTO public.system_settings (key, value) VALUES
  ('matchmaker_lock_height', 'false')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
