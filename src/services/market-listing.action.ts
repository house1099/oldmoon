"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateSystemSetting as repoUpdateSystemSetting } from "@/lib/repositories/server/admin.repository";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import {
  adminCancelListing,
  countActiveListingsBySeller,
  createListing,
  executeBuyMarketItem,
  executeCancelListing,
  expireMyStaleListings,
  findActiveListingByRewardId,
  findActiveListings,
  findAllListingsForAdmin,
  findMyListings,
  findRecentSoldListings,
  findSoldListingsForAdmin,
  findSuspiciousListings,
  getMarketStats,
  type AdminListingsFilters,
  type AdminSoldListingsFilters,
  type ActiveListingsFilters,
  type BuyMarketItemResult,
  type MarketListingWithDetail,
  type RecentSoldItem,
} from "@/lib/repositories/server/market-listing.repository";
import {
  findUserRewardById,
  unequipReward,
} from "@/lib/repositories/server/rewards.repository";
import { findShopItemById } from "@/lib/repositories/server/shop.repository";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { requireRole } from "@/services/admin.action";
import { sendPushToUser } from "@/lib/push/send-push";

export type { BuyMarketItemResult, MarketListingWithDetail };
export type { ActiveListingsFilters, RecentSoldItem };

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

export async function getRecentSoldListingsAction(): Promise<RecentSoldItem[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const cached = unstable_cache(
    async () => findRecentSoldListings(),
    ["market-recent-sold"],
    { revalidate: 60, tags: ["market_sold"] },
  );
  return cached();
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

  const enabled = await findSystemSettingByKey("market_enabled");
  if (enabled === "false") {
    return { ok: false, error: "market_disabled" };
  }

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

  const enabled = await findSystemSettingByKey("market_enabled");
  if (enabled === "false") {
    return { ok: false, error: "market_disabled" };
  }

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

  revalidateTag("market_sold");
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

export type MarketAdminSettingsPatch = {
  market_tax_rate?: number;
  market_max_listings_per_user?: number;
  market_listing_days?: number;
  market_enabled?: boolean;
};

export type MarketSettingsSnapshot = {
  market_tax_rate: string | null;
  market_max_listings_per_user: string | null;
  market_listing_days: string | null;
  market_enabled: string | null;
};

export async function getMarketStatsAction(): Promise<{
  activeCount: number;
  todaySoldCount: number;
  totalSoldAmount: { free: number; premium: number };
  suspiciousCount: number;
}> {
  await requireRole(["master", "moderator"]);
  return getMarketStats();
}

export async function getAllListingsForAdminAction(
  filters?: AdminListingsFilters,
): Promise<{ data: MarketListingWithDetail[]; total: number }> {
  await requireRole(["master", "moderator"]);
  return findAllListingsForAdmin(filters);
}

export async function getSoldListingsForAdminAction(
  filters?: AdminSoldListingsFilters,
): Promise<{ data: MarketListingWithDetail[]; total: number }> {
  await requireRole(["master", "moderator"]);
  return findSoldListingsForAdmin(filters);
}

export async function adminCancelListingAction(
  listingId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireRole(["master", "moderator"]);
    await adminCancelListing(listingId);
    revalidateTag("market_sold");
    revalidatePath("/");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getSuspiciousListingsAction(): Promise<
  MarketListingWithDetail[]
> {
  await requireRole(["master", "moderator"]);
  return findSuspiciousListings();
}

export async function getMarketSettingsSnapshotAction(): Promise<MarketSettingsSnapshot> {
  await requireRole(["master", "moderator"]);
  const [
    market_tax_rate,
    market_max_listings_per_user,
    market_listing_days,
    market_enabled,
  ] = await Promise.all([
    findSystemSettingByKey("market_tax_rate"),
    findSystemSettingByKey("market_max_listings_per_user"),
    findSystemSettingByKey("market_listing_days"),
    findSystemSettingByKey("market_enabled"),
  ]);
  return {
    market_tax_rate,
    market_max_listings_per_user,
    market_listing_days,
    market_enabled,
  };
}

export async function updateMarketSettingsAction(
  settings: MarketAdminSettingsPatch,
): Promise<{ ok: boolean }> {
  try {
    const { user } = await requireRole(["master"]);
    if (settings.market_tax_rate !== undefined) {
      const n = Math.floor(Number(settings.market_tax_rate));
      if (!Number.isFinite(n) || n < 0 || n > 20) {
        return { ok: false };
      }
      await repoUpdateSystemSetting("market_tax_rate", String(n), user.id);
    }
    if (settings.market_max_listings_per_user !== undefined) {
      const n = Math.floor(Number(settings.market_max_listings_per_user));
      if (!Number.isFinite(n) || n < 1 || n > 20) {
        return { ok: false };
      }
      await repoUpdateSystemSetting(
        "market_max_listings_per_user",
        String(n),
        user.id,
      );
    }
    if (settings.market_listing_days !== undefined) {
      const n = Math.floor(Number(settings.market_listing_days));
      if (!Number.isFinite(n) || n < 1 || n > 30) {
        return { ok: false };
      }
      await repoUpdateSystemSetting("market_listing_days", String(n), user.id);
    }
    if (settings.market_enabled !== undefined) {
      await repoUpdateSystemSetting(
        "market_enabled",
        settings.market_enabled ? "true" : "false",
        user.id,
      );
    }
    revalidateTag("system_settings");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
