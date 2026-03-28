"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  findActiveShopItems,
  findShopItemById,
  insertShopOrder,
  getDailyPurchaseCount,
  upsertDailyLimit,
  findMyOrders,
  type ShopItemRow,
  type ShopOrderRow,
} from "@/lib/repositories/server/shop.repository";
import { creditCoins } from "@/lib/repositories/server/coin.repository";
import { insertUserReward } from "@/lib/repositories/server/prize.repository";
import { drawFromPool } from "@/services/prize-engine";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { updateProfile } from "@/lib/repositories/server/user.repository";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { taipeiCalendarDateKey } from "@/lib/utils/date";
import { insertExpLog } from "@/lib/repositories/server/exp.repository";

export type ShopItemDto = ShopItemRow & {
  /** sale_end_at 有值且尚未結束（特賣期間） */
  isOnSale: boolean;
  /** 同時有起迄且在區間內時顯示倒數 */
  showSaleCountdown: boolean;
  /** original_price 有值即顯示劃線原價 */
  hasDiscountDisplay: boolean;
  remainingSeconds: number;
};

function toShopItemDto(item: ShopItemRow, now: Date): ShopItemDto {
  const saleStart = item.sale_start_at ? new Date(item.sale_start_at) : null;
  const saleEnd = item.sale_end_at ? new Date(item.sale_end_at) : null;
  const isOnSale = saleEnd != null && saleEnd > now;
  const showSaleCountdown =
    saleStart != null &&
    saleEnd != null &&
    saleStart <= now &&
    now <= saleEnd;
  const remainingSeconds =
    showSaleCountdown && saleEnd
      ? Math.max(0, Math.floor((saleEnd.getTime() - now.getTime()) / 1000))
      : 0;
  const hasDiscountDisplay = item.original_price != null;
  return {
    ...item,
    isOnSale,
    showSaleCountdown,
    hasDiscountDisplay,
    remainingSeconds,
  };
}

export async function getShopItemsAction(
  currencyType?: "free_coins" | "premium_coins",
): Promise<ShopItemDto[]> {
  const cached = unstable_cache(
    async () => {
      const items = await findActiveShopItems(currencyType);
      const now = new Date();
      return items.map((item) => toShopItemDto(item, now));
    },
    [`shop-items-${currencyType ?? "all"}`],
    { revalidate: 60, tags: ["shop_items"] },
  );
  return cached();
}

type PurchaseResult =
  | { ok: true; item: ShopItemDto }
  | { ok: false; error: string };

export async function purchaseItemAction(
  itemId: string,
  quantity: number = 1,
): Promise<PurchaseResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "未登入" };

    const item = await findShopItemById(itemId);
    if (!item || !item.is_active) {
      return { ok: false, error: "商品不存在或已下架" };
    }

    if (
      item.sale_end_at &&
      new Date(item.sale_end_at) < new Date()
    ) {
      return { ok: false, error: "商品已過期" };
    }

    const dateKey = taipeiCalendarDateKey();
    if (item.daily_limit != null) {
      const purchased = await getDailyPurchaseCount(user.id, item.id, dateKey);
      if (purchased + quantity > item.daily_limit) {
        return { ok: false, error: "daily_limit_reached" };
      }
    }

    const totalPrice = item.price * quantity;
    const profile = await findProfileById(user.id);
    if (!profile) return { ok: false, error: "用戶不存在" };

    const coinType = item.currency_type === "premium_coins" ? "premium" : "free";
    const currentBalance =
      coinType === "premium" ? profile.premium_coins : profile.free_coins;
    if (currentBalance < totalPrice) {
      return { ok: false, error: "insufficient_balance" };
    }

    const deductResult = await creditCoins({
      userId: user.id,
      coinType,
      amount: -totalPrice,
      source: "shop_purchase",
      note: `商城購買：${item.name} x${quantity}`,
    });
    if (!deductResult.success) {
      console.error("purchaseItemAction 扣款失敗:", deductResult.error);
      return { ok: false, error: "insufficient_balance" };
    }

    try {
      await dispatchItemToUser(user.id, item, quantity);
    } catch (dispatchErr) {
      console.error("purchaseItemAction 發放失敗:", dispatchErr);
      const refund = await creditCoins({
        userId: user.id,
        coinType,
        amount: totalPrice,
        source: "refund",
        note: `購買失敗退款：${item.name}`,
      });
      if (!refund.success) {
        console.error("purchaseItemAction 退款失敗:", refund.error);
      }
      const msg =
        dispatchErr instanceof Error
          ? dispatchErr.message
          : "購買失敗，請稍後再試";
      return { ok: false, error: msg };
    }

    await insertShopOrder({
      user_id: user.id,
      item_id: item.id,
      sku: item.sku,
      quantity,
      unit_price: item.price,
      currency_type: item.currency_type,
      total_price: totalPrice,
      status: "completed",
    });

    if (item.daily_limit != null) {
      const currentCount = await getDailyPurchaseCount(user.id, item.id, dateKey);
      await upsertDailyLimit(user.id, item.id, dateKey, currentCount + quantity);
    }

    revalidateTag("shop_items");

    await notifyUserMailboxSilent({
      user_id: user.id,
      type: "system",
      message: `🛍️ 購買成功！「${item.name}」x${quantity} 已存入背包。`,
    });

    const now = new Date();
    return { ok: true, item: toShopItemDto(item, now) };
  } catch (err) {
    console.error("purchaseItemAction 失敗:", err);
    return { ok: false, error: "購買失敗，請稍後再試" };
  }
}

async function dispatchItemToUser(
  userId: string,
  item: ShopItemRow,
  quantity: number,
): Promise<void> {
  for (let i = 0; i < quantity; i++) {
    switch (item.item_type) {
      case "broadcast":
        await insertUserReward({
          user_id: userId,
          reward_type: "broadcast",
          label: item.name,
          is_equipped: false,
        });
        break;

      case "bag_expansion": {
        const p = await findProfileById(userId);
        const currentSlots = p?.inventory_slots ?? 16;
        const newSlots = Math.min(48, currentSlots + 4);
        await updateProfile(userId, { inventory_slots: newSlots });
        break;
      }

      case "rename_card":
        await insertUserReward({
          user_id: userId,
          reward_type: "rename_card",
          label: "改名卡",
          is_equipped: false,
        });
        break;

      case "loot_box":
        await drawFromPool("loot_box", userId);
        break;

      case "fishing_bait":
      case "fishing_rod":
        await insertUserReward({
          user_id: userId,
          reward_type: item.item_type,
          label: item.name,
          is_equipped: false,
        });
        break;

      case "avatar_frame":
      case "card_frame":
      case "title":
        await insertUserReward({
          user_id: userId,
          reward_type: item.item_type,
          label: item.name,
          is_equipped: false,
        });
        break;

      case "exp_boost": {
        const expVal =
          item.metadata && typeof item.metadata === "object" && "value" in item.metadata
            ? Number((item.metadata as Record<string, unknown>).value) || 0
            : 0;
        if (expVal > 0) {
          await insertExpLog({
            user_id: userId,
            source: "shop_exp_boost",
            unique_key: `shop_exp:${userId}:${item.id}:${Date.now()}`,
            delta: expVal,
            delta_exp: expVal,
          });
        }
        break;
      }

      case "coins_pack": {
        const coinsVal =
          item.metadata && typeof item.metadata === "object" && "value" in item.metadata
            ? Number((item.metadata as Record<string, unknown>).value) || 0
            : 0;
        const packCoinType =
          item.metadata &&
          typeof item.metadata === "object" &&
          "coin_type" in item.metadata &&
          (item.metadata as Record<string, unknown>).coin_type === "premium"
            ? "premium"
            : "free";
        if (coinsVal > 0) {
          await creditCoins({
            userId,
            coinType: packCoinType as "premium" | "free",
            amount: coinsVal,
            source: "shop_purchase",
            note: `商城道具：${item.name}`,
          });
        }
        break;
      }

      default:
        await insertUserReward({
          user_id: userId,
          reward_type: item.item_type,
          label: item.name,
          is_equipped: false,
        });
        break;
    }
  }
}

export async function getMyOrdersAction(): Promise<ShopOrderRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return findMyOrders(user.id);
}

/** 今日尚可購買數量（無每日上限則 remaining 為 null） */
export async function getShopDailyRemainingAction(
  itemId: string,
): Promise<
  | { ok: true; remaining: number | null; dailyLimit: number | null }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const item = await findShopItemById(itemId);
  if (!item) return { ok: false, error: "商品不存在" };
  if (item.daily_limit == null) {
    return { ok: true, remaining: null, dailyLimit: null };
  }
  const dateKey = taipeiCalendarDateKey();
  const purchased = await getDailyPurchaseCount(user.id, item.id, dateKey);
  const remaining = Math.max(0, item.daily_limit - purchased);
  return {
    ok: true,
    remaining,
    dailyLimit: item.daily_limit,
  };
}
