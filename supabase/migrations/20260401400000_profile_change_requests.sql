-- =============================================
-- 1. users 新增 matchmaker_opt_in 欄位
-- =============================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS matchmaker_opt_in boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.matchmaker_opt_in
  IS '是否願意加入月老魚配對池，預設 true，玩家可隨時關閉';

-- =============================================
-- 2. profile_change_requests 表
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.profile_change_status AS ENUM
    ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status         public.profile_change_status NOT NULL DEFAULT 'pending',

  -- 申請變更的欄位（null 表示此次不申請變更此欄位）
  new_region         text,
  new_orientation    text,
  new_birth_year     integer,

  -- 審核相關
  reviewed_by    uuid REFERENCES public.users(id),
  reviewed_at    timestamptz,
  reject_reason  text,

  -- 玩家填寫的原因
  note           text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 每個用戶只能有一筆 pending 申請
CREATE UNIQUE INDEX IF NOT EXISTS profile_change_requests_pending_unique
  ON public.profile_change_requests (user_id)
  WHERE status = 'pending';

-- RLS
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can view own requests"
  ON public.profile_change_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS profile_change_requests_updated_at
  ON public.profile_change_requests;
CREATE TRIGGER profile_change_requests_updated_at
  BEFORE UPDATE ON public.profile_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- 3. system_settings Banner 相關設定
-- =============================================
INSERT INTO public.system_settings (key, value) VALUES
  ('profile_banner_enabled',   'false'),
  ('profile_banner_title',     '🎣 新功能上線！請補充你的冒險者資料'),
  ('profile_banner_force',     'false')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
