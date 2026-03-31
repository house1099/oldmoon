import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MarketListingInsert,
  MarketListingRow,
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
  seller:users!market_listings_seller_id_fkey(nickname, avatar_url)
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
};

function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function mapRawToDetail(raw: RawListingRow): MarketListingWithDetail {
  const si = embedOne(raw.shop_items);
  const se = embedOne(raw.seller);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip embeds from row spread
  const { shop_items, seller, ...rest } = raw;
  void shop_items;
  void seller;
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
