-- 🗄️ IG 限時動態風格心情：確保欄位存在（雲端若已建可安全 no-op）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS mood_at timestamptz;

NOTIFY pgrst, 'reload schema';
