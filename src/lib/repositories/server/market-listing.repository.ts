import { createAdminClient } from "@/lib/supabase/admin";
import {
  nextTaipeiCalendarDateAfter,
  taipeiCalendarDateKey,
} from "@/lib/utils/date";
import type {
  MarketListingInsert,
  MarketListingRow,
  MarketListingStatus,
} from "@/types/database.types";

export interface MarketListingWithDetail extends MarketListingRow {
  shop_item: {
    label: string;
    image_url: string | null;
    item_type: string;
    effect_key: string | null;
  };
  seller: {
    nickname: string;
    avatar_url: string | null;
  };
  buyer?: {
    nickname: string;
    avatar_url: string | null;
  } | null;
}

export interface BuyMarketItemResult {
  ok: boolean;
  error?: string;
  seller_id?: string;
  seller_gets?: number;
  currency?: string;
  price?: number;
  item_id?: string;
}

const ACTIVE_LISTING_SELECT = `
  *,
  shop_items!market_listings_shop_item_id_fkey(name, image_url, item_type, effect_key),
  seller:users!market_listings_seller_id_fkey(nickname, avatar_url),
  buyer:users!market_listings_buyer_id_fkey(nickname, avatar_url)
`;

type RawListingRow = MarketListingRow & {
  shop_items:
    | {
        name: string;
        image_url: string | null;
        item_type: string;
        effect_key: string | null;
      }
    | {
        name: string;
        image_url: string | null;
        item_type: string;
        effect_key: string | null;
      }[]
    | null;
  seller:
    | { nickname: string; avatar_url: string | null }
    | { nickname: string; avatar_url: string | null }[]
    | null;
  buyer?:
    | { nickname: string; avatar_url: string | null }
    | { nickname: string; avatar_url: string | null }[]
    | null;
};

function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function mapRawToDetail(raw: RawListingRow): MarketListingWithDetail {
  const si = embedOne(raw.shop_items);
  const se = embedOne(raw.seller);
  const bu = embedOne(raw.buyer);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip embeds from row spread
  const { shop_items, seller, buyer, ...rest } = raw;
  void shop_items;
  void seller;
  void buyer;
  return {
    ...rest,
    shop_item: {
      label: si?.name ?? "（未命名）",
      image_url: si?.image_url ?? null,
      item_type: si?.item_type ?? "",
      effect_key: si?.effect_key ?? null,
    },
    seller: {
      nickname: se?.nickname ?? "—",
      avatar_url: se?.avatar_url ?? null,
    },
    buyer: bu
      ? {
          nickname: bu.nickname ?? "—",
          avatar_url: bu.avatar_url ?? null,
        }
      : null,
  };
}

function parseBuyMarketItemResult(data: unknown): BuyMarketItemResult {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "invalid_response" };
  }
  const o = data as Record<string, unknown>;
  const ok = o.ok === true;
  const err =
    typeof o.error === "string" ? o.error : undefined;
  if (!ok) {
    return { ok: false, error: err ?? "unknown_error" };
  }
  return {
    ok: true,
    seller_id: typeof o.seller_id === "string" ? o.seller_id : undefined,
    seller_gets:
      typeof o.seller_gets === "number" ? o.seller_gets : undefined,
    currency: typeof o.currency === "string" ? o.currency : undefined,
    price: typeof o.price === "number" ? o.price : undefined,
    item_id: typeof o.item_id === "string" ? o.item_id : undefined,
  };
}

function parseCancelResult(data: unknown): { ok: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "invalid_response" };
  }
  const o = data as Record<string, unknown>;
  if (o.ok === true) return { ok: true };
  return {
    ok: false,
    error: typeof o.error === "string" ? o.error : "unknown_error",
  };
}

export type ActiveListingsFilters = {
  rewardType?: string;
  currencyType?: "free_coins" | "premium_coins";
  sortBy?: "price_asc" | "price_desc" | "newest";
};

export interface RecentSoldItem {
  id: string;
  itemLabel: string;
  itemType: string;
  price: number;
  currencyType: "free_coins" | "premium_coins";
  soldAt: string;
}

const RECENT_SOLD_SELECT = `
  id,
  price,
  currency_type,
  sold_at,
  shop_items!market_listings_shop_item_id_fkey(name, item_type)
`;

type RawRecentSoldRow = Pick<
  MarketListingRow,
  "id" | "price" | "currency_type" | "sold_at"
> & {
  shop_items:
    | { name: string; item_type: string }
    | { name: string; item_type: string }[]
    | null;
};

function mapRawToRecentSold(raw: RawRecentSoldRow): RecentSoldItem | null {
  const si = embedOne(raw.shop_items);
  const soldAt = raw.sold_at;
  if (!soldAt) return null;
  const cur = raw.currency_type;
  if (cur !== "free_coins" && cur !== "premium_coins") return null;
  return {
    id: raw.id,
    itemLabel: si?.name ?? "（未命名）",
    itemType: si?.item_type ?? "",
    price: raw.price,
    currencyType: cur,
    soldAt,
  };
}

export async function findRecentSoldListings(): Promise<RecentSoldItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("market_listings")
    .select(RECENT_SOLD_SELECT)
    .eq("status", "sold")
    .not("sold_at", "is", null)
    .order("sold_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  const rows = (data ?? []) as unknown as RawRecentSoldRow[];
  return rows
    .map(mapRawToRecentSold)
    .filter((x): x is RecentSoldItem => x != null);
}

export async function createListing(
  data: MarketListingInsert,
): Promise<MarketListingRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("market_listings")
    .insert(data)
    .select("*")
    .single();
  if (error) throw error;
  return row as MarketListingRow;
}

export async function findActiveListings(
  filters?: ActiveListingsFilters,
): Promise<MarketListingWithDetail[]> {
  const admin = createAdminClient();
  const sortBy = filters?.sortBy ?? "newest";
  const ascending =
    sortBy === "price_asc"
      ? true
      : sortBy === "price_desc"
        ? false
        : false;
  const sortColumn =
    sortBy === "price_asc" || sortBy === "price_desc" ? "price" : "created_at";

  let q = admin
    .from("market_listings")
    .select(ACTIVE_LISTING_SELECT)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (filters?.currencyType) {
    q = q.eq("currency_type", filters.currencyType);
  }

  if (filters?.rewardType) {
    q = q.eq("shop_items.item_type", filters.rewardType);
  }

  q = q.order(sortColumn, { ascending });

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as RawListingRow[];
  return rows.map(mapRawToDetail);
}

export async function findMyListings(
  userId: string,
): Promise<MarketListingWithDetail[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("market_listings")
    .select(ACTIVE_LISTING_SELECT)
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawListingRow[]).map(mapRawToDetail);
}

export async function findListingById(
  listingId: string,
): Promise<MarketListingWithDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("market_listings")
    .select(ACTIVE_LISTING_SELECT)
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRawToDetail(data as unknown as RawListingRow);
}

export async function executeBuyMarketItem(
  listingId: string,
  buyerId: string,
): Promise<BuyMarketItemResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("buy_market_item", {
    p_listing_id: listingId,
    p_buyer_id: buyerId,
  });
  if (error) {
    console.error("executeBuyMarketItem rpc:", error);
    return { ok: false, error: error.message };
  }
  return parseBuyMarketItemResult(data);
}

export async function executeCancelListing(
  listingId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_market_listing", {
    p_listing_id: listingId,
    p_user_id: userId,
  });
  if (error) {
    console.error("executeCancelListing rpc:", error);
    return { ok: false, error: error.message };
  }
  return parseCancelResult(data);
}

export async function expireMyStaleListings(userId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("market_listings")
    .update({ status: "expired" })
    .eq("seller_id", userId)
    .eq("status", "active")
    .lte("expires_at", now);
  if (error) throw error;
}

export async function findActiveListingByRewardId(
  rewardId: string,
): Promise<MarketListingRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("market_listings")
    .select("*")
    .eq("user_reward_id", rewardId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return (data as MarketListingRow) ?? null;
}

export async function countActiveListingsBySeller(
  userId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("market_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}

/** 取消某用戶所有 active 上架單（封號用） */
export async function cancelAllActiveListingsByUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("market_listings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("seller_id", userId)
    .eq("status", "active");
  if (error) throw error;
}

export async function getMarketStats(): Promise<{
  activeCount: number;
  todaySoldCount: number;
  totalSoldAmount: { free: number; premium: number };
  suspiciousCount: number;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [{ count: activeCount, error: e1 }, { count: suspiciousCount, error: e2 }] =
    await Promise.all([
      admin
        .from("market_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expires_at", now),
      admin
        .from("market_listings")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "sold"])
        .or("price.lte.1,price.gt.99999"),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const todayKey = taipeiCalendarDateKey();
  const nextKey = nextTaipeiCalendarDateAfter(todayKey);
  const soldStart = `${todayKey}T00:00:00+08:00`;
  const soldEnd = `${nextKey}T00:00:00+08:00`;

  const { count: todaySoldCount, error: e3 } = await admin
    .from("market_listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "sold")
    .gte("sold_at", soldStart)
    .lt("sold_at", soldEnd);
  if (e3) throw e3;

  const { data: soldRows, error: e4 } = await admin
    .from("market_listings")
    .select("price, currency_type")
    .eq("status", "sold");
  if (e4) throw e4;

  let free = 0;
  let premium = 0;
  for (const row of soldRows ?? []) {
    const p = row as { price: number; currency_type: string };
    if (p.currency_type === "free_coins") free += p.price;
    else if (p.currency_type === "premium_coins") premium += p.price;
  }

  return {
    activeCount: activeCount ?? 0,
    todaySoldCount: todaySoldCount ?? 0,
    totalSoldAmount: { free, premium },
    suspiciousCount: suspiciousCount ?? 0,
  };
}

const ADMIN_LISTING_STATUSES: MarketListingStatus[] = [
  "active",
  "sold",
  "cancelled",
  "expired",
];

export type AdminListingsFilters = {
  status?: MarketListingStatus | "all";
  sellerNickname?: string;
  itemName?: string;
  page?: number;
  pageSize?: number;
};

export type AdminSoldListingsFilters = {
  sellerNickname?: string;
  buyerNickname?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_ADMIN_PAGE_SIZE = 20;

export async function findAllListingsForAdmin(
  filters?: AdminListingsFilters,
): Promise<{ data: MarketListingWithDetail[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.max(1, filters?.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let sellerIds: string[] | null = null;
  const sn = filters?.sellerNickname?.trim();
  if (sn) {
    const { data: matched, error } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", `%${sn}%`);
    if (error) throw error;
    sellerIds = (matched ?? []).map((u) => u.id as string);
    if (sellerIds.length === 0) {
      return { data: [], total: 0 };
    }
  }

  let shopItemIds: string[] | null = null;
  const itemTerm = filters?.itemName?.trim();
  if (itemTerm) {
    const { data: items, error } = await admin
      .from("shop_items")
      .select("id")
      .ilike("name", `%${itemTerm}%`);
    if (error) throw error;
    shopItemIds = (items ?? []).map((r) => r.id as string);
    if (shopItemIds.length === 0) {
      return { data: [], total: 0 };
    }
  }

  let q = admin
    .from("market_listings")
    .select(ACTIVE_LISTING_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const st = filters?.status;
  if (st && st !== "all" && ADMIN_LISTING_STATUSES.includes(st)) {
    q = q.eq("status", st);
  }

  if (sellerIds) {
    q = q.in("seller_id", sellerIds);
  }
  if (shopItemIds) {
    q = q.in("shop_item_id", shopItemIds);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as RawListingRow[];
  return {
    data: rows.map(mapRawToDetail),
    total: count ?? 0,
  };
}

export async function findSoldListingsForAdmin(
  filters?: AdminSoldListingsFilters,
): Promise<{ data: MarketListingWithDetail[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.max(1, filters?.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let sellerIds: string[] | null = null;
  const sn = filters?.sellerNickname?.trim();
  if (sn) {
    const { data: matched, error } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", `%${sn}%`);
    if (error) throw error;
    sellerIds = (matched ?? []).map((u) => u.id as string);
    if (sellerIds.length === 0) {
      return { data: [], total: 0 };
    }
  }

  let buyerIds: string[] | null = null;
  const bn = filters?.buyerNickname?.trim();
  if (bn) {
    const { data: matched, error } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", `%${bn}%`);
    if (error) throw error;
    buyerIds = (matched ?? []).map((u) => u.id as string);
    if (buyerIds.length === 0) {
      return { data: [], total: 0 };
    }
  }

  let q = admin
    .from("market_listings")
    .select(ACTIVE_LISTING_SELECT, { count: "exact" })
    .eq("status", "sold")
    .order("sold_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (sellerIds) {
    q = q.in("seller_id", sellerIds);
  }
  if (buyerIds) {
    q = q.in("buyer_id", buyerIds);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as RawListingRow[];
  return {
    data: rows.map(mapRawToDetail),
    total: count ?? 0,
  };
}

export async function adminCancelListing(listingId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("market_listings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("status", "active")
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    throw new Error("上架單非上架中或不存在");
  }
}

export async function findSuspiciousListings(): Promise<
  MarketListingWithDetail[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("market_listings")
    .select(ACTIVE_LISTING_SELECT)
    .in("status", ["active", "sold"])
    .or("price.lte.1,price.gt.99999")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as RawListingRow[]).map(mapRawToDetail);
}
