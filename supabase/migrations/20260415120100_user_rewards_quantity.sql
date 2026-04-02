-- 背包堆疊：釣餌等可合併數量
ALTER TABLE public.user_rewards
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1
  CONSTRAINT user_rewards_quantity_check CHECK (quantity >= 1);

COMMENT ON COLUMN public.user_rewards.quantity IS '堆疊數量（釣餌等）；預設 1';

-- 合併重複的釣餌列（僅當該組沒有任何一筆為市集 active 上架）
DO $$
DECLARE
  rec RECORD;
  keeper_id uuid;
  total_n int;
  has_listing boolean;
BEGIN
  FOR rec IN
    SELECT ur.user_id, ur.shop_item_id
    FROM public.user_rewards ur
    WHERE ur.reward_type = 'fishing_bait'
      AND ur.shop_item_id IS NOT NULL
    GROUP BY ur.user_id, ur.shop_item_id
    HAVING count(*) > 1
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.user_rewards u2
      INNER JOIN public.market_listings ml ON ml.user_reward_id = u2.id AND ml.status = 'active'
      WHERE u2.user_id = rec.user_id
        AND u2.shop_item_id = rec.shop_item_id
        AND u2.reward_type = 'fishing_bait'
    ) INTO has_listing;

    IF has_listing THEN
      CONTINUE;
    END IF;

    SELECT count(*)::int INTO total_n
    FROM public.user_rewards
    WHERE user_id = rec.user_id
      AND shop_item_id = rec.shop_item_id
      AND reward_type = 'fishing_bait';

    SELECT id INTO keeper_id
    FROM public.user_rewards
    WHERE user_id = rec.user_id
      AND shop_item_id = rec.shop_item_id
      AND reward_type = 'fishing_bait'
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.user_rewards
    SET quantity = total_n
    WHERE id = keeper_id;

    DELETE FROM public.user_rewards
    WHERE user_id = rec.user_id
      AND shop_item_id = rec.shop_item_id
      AND reward_type = 'fishing_bait'
      AND id <> keeper_id;
  END LOOP;
END $$;
