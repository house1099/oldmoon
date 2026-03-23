-- 🗄️ 首頁個人卡：自白分欄、邀請制欄位（若已存在則略過）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio_village text,
  ADD COLUMN IF NOT EXISTS bio_market text,
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS invited_by uuid;

NOTIFY pgrst, 'reload schema';
