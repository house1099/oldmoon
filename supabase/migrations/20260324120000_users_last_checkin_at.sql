-- 每日簽到 24h 冷卻 SSOT（與 exp_logs 並存；應用層以 last_checkin_at 判斷）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_checkin_at timestamptz;

COMMENT ON COLUMN public.users.last_checkin_at IS '上次簽到時間（ISO）；24h 內不可再簽';
