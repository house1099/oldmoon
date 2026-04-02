-- 隨機可收竿時間、中魚通知、收成預覽（確認後才入帳）
ALTER TABLE public.fishing_rod_cast_state
  ADD COLUMN IF NOT EXISTS pending_harvest_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS bite_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_harvest_preview jsonb;

COMMENT ON COLUMN public.fishing_rod_cast_state.pending_harvest_ready_at IS '可收竿時間（拋竿後隨機，≤ 釣竿冷卻分鐘）';
COMMENT ON COLUMN public.fishing_rod_cast_state.bite_notified_at IS '已發送「中魚」站內信／推播之時間';
COMMENT ON COLUMN public.fishing_rod_cast_state.pending_harvest_preview IS '收成預覽（確認後才寫 fishing_logs 與發獎）';

NOTIFY pgrst, 'reload schema';
