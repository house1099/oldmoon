-- 拋竿時記錄選定的釣餌列；收成「確認」時才扣 quantity（與舊行為「拋竿即扣」分離）
ALTER TABLE public.fishing_rod_cast_state
  ADD COLUMN IF NOT EXISTS pending_bait_user_reward_id uuid;

COMMENT ON COLUMN public.fishing_rod_cast_state.pending_bait_user_reward_id IS '本次拋竿選定之 user_rewards.id；確認收成時才扣釣餌';

NOTIFY pgrst, 'reload schema';
