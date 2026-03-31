"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import {
  countActiveListingsBySeller,
  createListing,
  executeBuyMarketItem,
  executeCancelListing,
  expireMyStaleListings,
  findActiveListingByRewardId,
  findActiveListings,
  findMyListings,
  type ActiveListingsFilters,
  type BuyMarketItemResult,
  type MarketListingWithDetail,
} from "@/lib/repositories/server/market-listing.repository";
import {
  findUserRewardById,
  unequipReward,
} from "@/lib/repositories/server/rewards.repository";
import { findShopItemById } from "@/lib/repositories/server/shop.repository";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { sendPushToUser } from "@/lib/push/send-push";

export type { BuyMarketItemResult, MarketListingWithDetail };
export type { ActiveListingsFilters };

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw == null || !raw.trim()) return fallback;
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function currencyDisplayName(currencyType: string | undefined): string {
  if (currencyType === "premium_coins") return "純金";
  return "探險幣";
}

export async function getActiveListingsAction(
  filters?: ActiveListingsFilters,
): Promise<MarketListingWithDetail[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  try {
    return await findActiveListings(filters);
  } catch (e) {
    console.error("getActiveListingsAction:", e);
    return [];
  }
}

export async function getMyListingsAction(): Promise<MarketListingWithDetail[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  await expireMyStaleListings(user.id);
  return findMyListings(user.id);
}

export async function createListingAction(input: {
  rewardId: string;
  price: number;
  currencyType: "free_coins" | "premium_coins";
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };

  const price = Math.floor(Number(input.price));
  if (!Number.isFinite(price) || price < 1) {
    return { ok: false, error: "價格須為至少 1 的正整數" };
  }

  await expireMyStaleListings(user.id);

  const maxRaw = await findSystemSettingByKey("market_max_listings_per_user");
  const maxListings = parsePositiveInt(maxRaw, 5);
  if (maxListings < 1) {
    return { ok: false, error: "系統設定異常" };
  }
  const activeCount = await countActiveListingsBySeller(user.id);
  if (activeCount >= maxListings) {
    return { ok: false, error: "已達上架數量上限" };
  }

  const row = await findUserRewardById(input.rewardId);
  if (!row || row.user_id !== user.id) {
    return { ok: false, error: "找不到道具" };
  }
  if (row.used_at != null) {
    return { ok: false, error: "此道具已無法上架" };
  }
  if (!row.shop_item_id) {
    return { ok: false, error: "此道具來源不支援玩家市集" };
  }

  const shopItem = await findShopItemById(row.shop_item_id);
  if (!shopItem || shopItem.allow_player_trade === false) {
    return { ok: false, error: "此商品不開放玩家交易" };
  }

  const existing = await findActiveListingByRewardId(input.rewardId);
  if (existing) {
    return { ok: false, error: "此道具已在市集上架中" };
  }

  if (row.is_equipped) {
    await unequipReward(input.rewardId);
  }

  const daysRaw = await findSystemSettingByKey("market_listing_days");
  const days = parsePositiveInt(daysRaw, 7);
  const safeDays = Math.max(1, Math.min(days, 365));
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + safeDays);

  try {
    await createListing({
      seller_id: user.id,
      user_reward_id: input.rewardId,
      shop_item_id: row.shop_item_id,
      price,
      currency_type: input.currencyType,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });
    return { ok: true };
  } catch (e) {
    console.error("createListingAction:", e);
    return { ok: false, error: "上架失敗，請稍後再試" };
  }
}

export async function buyListingAction(
  listingId: string,
): Promise<BuyMarketItemResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };

  await expireMyStaleListings(user.id);

  const result = await executeBuyMarketItem(listingId, user.id);
  if (!result.ok) return result;

  const sellerId = result.seller_id;
  const gets = result.seller_gets;
  const cur = result.currency;
  if (sellerId && gets != null && cur) {
    const coinLabel = currencyDisplayName(cur);
    const msg = `💰 你的道具已售出，獲得 ${gets} ${coinLabel}`;
    await notifyUserMailboxSilent({
      user_id: sellerId,
      type: "system",
      message: msg,
    });
    try {
      await sendPushToUser(sellerId, {
        title: "市集售出",
        body: msg,
        url: "/guild",
      });
    } catch {
      /* 靜默 */
    }
  }

  return result;
}

export async function cancelListingAction(
  listingId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };

  const result = await executeCancelListing(listingId, user.id);
  if (result.ok) {
    revalidatePath("/");
  }
  return result;
}
