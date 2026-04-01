-- 月老年齡模式三欄位 + system_settings 年齡上限
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS matchmaker_age_mode text
    NOT NULL DEFAULT 'both'
    CHECK (matchmaker_age_mode IN ('older', 'younger', 'both')),
  ADD COLUMN IF NOT EXISTS matchmaker_age_older integer
    NOT NULL DEFAULT 10
    CHECK (matchmaker_age_older >= 0),
  ADD COLUMN IF NOT EXISTS matchmaker_age_younger integer
    NOT NULL DEFAULT 10
    CHECK (matchmaker_age_younger >= 0);

UPDATE public.users
SET
  matchmaker_age_older = COALESCE(matchmaker_age_range, 10),
  matchmaker_age_younger = COALESCE(matchmaker_age_range, 10)
WHERE matchmaker_age_range IS NOT NULL;

INSERT INTO public.system_settings (key, value) VALUES
  ('matchmaker_age_max', '30')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
