import { creditCoins } from "@/lib/repositories/server/coin.repository";
import { insertExpLog } from "@/lib/repositories/server/exp.repository";
import {
  findActiveItemsByPoolId,
  findPoolByType,
  insertPrizeLog,
  insertUserReward,
  type PrizeItemRow,
} from "@/lib/repositories/server/prize.repository";

export type DrawResult = {
  poolType: string;
  rewardType: string;
  label: string;
  value?: number;
  itemId: string;
};

function pickWeightedItem(items: PrizeItemRow[]): PrizeItemRow {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (total <= 0) {
    return items[Math.floor(Math.random() * items.length)]!;
  }
  let r = Math.random() * total;
  for (const item of items) {
    const w = Math.max(0, item.weight);
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Layer 3：通用加權抽獎（非 Server Action）。由簽到／活動 Action 呼叫。
 */
export async function drawFromPool(
  poolType: string,
  userId: string,
): Promise<DrawResult> {
  const pool = await findPoolByType(poolType);
  if (!pool || !pool.is_active) {
    throw new Error(`獎池不可用：${poolType}`);
  }

  const items = await findActiveItemsByPoolId(pool.id);
  if (items.length === 0) {
    throw new Error("獎池沒有可用獎項");
  }

  const item = pickWeightedItem(items);
  let value: number | undefined;

  if (item.reward_type === "coins") {
    if (item.min_value == null || item.max_value == null) {
      throw new Error("coins 獎項需設定 min/max");
    }
    value = randomIntInclusive(item.min_value, item.max_value);
    const coinResult = await creditCoins({
      userId,
      coinType: "free",
      amount: value,
      source: "loot_box",
      note: `${pool.label}：${item.label}`,
    });
    if (!coinResult.success) {
      value = 0;
    }
  } else if (item.reward_type === "exp") {
    if (item.min_value == null || item.max_value == null) {
      throw new Error("exp 獎項需設定 min/max");
    }
    value = randomIntInclusive(item.min_value, item.max_value);
    const unique_key = `prize_${poolType}:${userId}:${item.id}:${Date.now()}`;
    await insertExpLog({
      user_id: userId,
      source: poolType,
      unique_key,
      delta: value,
      delta_exp: value,
    });
  } else if (
    item.reward_type === "title" ||
    item.reward_type === "avatar_frame" ||
    item.reward_type === "card_frame" ||
    item.reward_type === "broadcast"
  ) {
    await insertUserReward({
      user_id: userId,
      reward_type: item.reward_type,
      item_ref_id: item.id,
      label: item.label,
      is_equipped: false,
    });
  } else {
    throw new Error(`不支援的 reward_type：${item.reward_type}`);
  }

  await insertPrizeLog({
    user_id: userId,
    pool_id: pool.id,
    item_id: item.id,
    pool_type: pool.pool_type,
    reward_type: item.reward_type,
    reward_value: value ?? null,
    label: item.label,
  });

  return {
    poolType: pool.pool_type,
    rewardType: item.reward_type,
    label: item.label,
    value,
    itemId: item.id,
  };
}
