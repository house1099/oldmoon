-- 將 user_rewards 對獎勵定義的 FK 對齊為 prize_items（effect_key、抽獎引擎 item_ref_id）。
-- 若本地已由舊 migration 建立 item_ref_id，則略過 rename；若雲端曾誤用 reward_ref_id → loot_box_rewards，則修正欄名與 FK。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_rewards' AND column_name = 'reward_ref_id'
  ) THEN
    ALTER TABLE public.user_rewards DROP CONSTRAINT IF EXISTS user_rewards_reward_ref_id_fkey;
    ALTER TABLE public.user_rewards RENAME COLUMN reward_ref_id TO item_ref_id;
  END IF;
END $$;

ALTER TABLE public.user_rewards DROP CONSTRAINT IF EXISTS user_rewards_item_ref_id_fkey;
ALTER TABLE public.user_rewards
  ADD CONSTRAINT user_rewards_item_ref_id_fkey
  FOREIGN KEY (item_ref_id) REFERENCES public.prize_items(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
