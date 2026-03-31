ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS relationship_status text
    CHECK (relationship_status IN ('single', 'not_single')),
  ADD COLUMN IF NOT EXISTS birth_year integer
    CHECK (birth_year >= 1940 AND birth_year <= 2006),
  ADD COLUMN IF NOT EXISTS matchmaker_age_range integer
    DEFAULT 10
    CHECK (matchmaker_age_range >= 1 AND matchmaker_age_range <= 50),
  ADD COLUMN IF NOT EXISTS matchmaker_region_pref text
    DEFAULT '["all"]';

COMMENT ON COLUMN public.users.relationship_status
  IS '感情狀態：single/not_single，月老魚篩選用，不公開顯示';
COMMENT ON COLUMN public.users.birth_year
  IS '出生年份，月老魚年齡差篩選用，不公開顯示';
COMMENT ON COLUMN public.users.matchmaker_age_range
  IS '月老魚可接受年齡差距（歲），預設 10';
COMMENT ON COLUMN public.users.matchmaker_region_pref
  IS '月老魚地區偏好 JSON 陣列，例如 ["all"] 或 ["台北市","新北市"]';

NOTIFY pgrst, 'reload schema';
