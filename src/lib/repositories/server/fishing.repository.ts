import { createAdminClient } from "@/lib/supabase/admin";
import { taipeiCalendarDateKey } from "@/lib/utils/date";
import type { Database, Json } from "@/types/database.types";
import type {
  FishType,
  FishingRewardInsert,
  FishingRewardRow,
  FishingRewardTier,
} from "@/types/database.types";

export type FishingLogInsert = Database["public"]["Tables"]["fishing_logs"]["Insert"];
export type FishingLogRow = Database["public"]["Tables"]["fishing_logs"]["Row"];

export async function insertFishingLog(
  row: FishingLogInsert,
): Promise<FishingLogRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_logs")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as FishingLogRow;
}

export async function findFishingLogsForUser(
  userId: string,
  limit = 200,
): Promise<FishingLogRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FishingLogRow[];
}

/**
 * 月老魚曾「確認留存」的對象（`fish_item.matchmakerReleased` 不為 true 的紀錄）；
 * 放生列不列入，之後仍可能再配對到同一人。
 */
export async function findMatchmakerKeptPeerIds(
  userId: string,
): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_logs")
    .select("fish_user_id, fish_item")
    .eq("user_id", userId)
    .eq("fish_type", "matchmaker")
    .not("fish_user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  const out = new Set<string>();
  for (const row of data ?? []) {
    const fid = row.fish_user_id as string | null;
    if (!fid) continue;
    const fi = row.fish_item;
    const released =
      fi &&
      typeof fi === "object" &&
      !Array.isArray(fi) &&
      (fi as Record<string, unknown>).matchmakerReleased === true;
    if (released) continue;
    out.add(fid);
  }
  return out;
}

/** 第一支釣竿顯示名：優先 `shop_items.name`，否則 `prize_items.label`。 */
export async function findFirstFishingRodDisplayName(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("shop_items(name), prize_items(label)")
    .eq("user_id", userId)
    .eq("reward_type", "fishing_rod")
    .is("used_at", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    shop_items: { name: string } | { name: string }[] | null;
    prize_items: { label: string } | { label: string }[] | null;
  };
  const shop = Array.isArray(row.shop_items)
    ? row.shop_items[0]
    : row.shop_items;
  const prize = Array.isArray(row.prize_items)
    ? row.prize_items[0]
    : row.prize_items;
  if (shop?.name) return shop.name;
  if (prize?.label) return prize.label;
  return null;
}

/** 第一個釣餌顯示名（同上邏輯）。 */
export async function findFirstFishingBaitDisplayName(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("shop_items(name), prize_items(label)")
    .eq("user_id", userId)
    .eq("reward_type", "fishing_bait")
    .is("used_at", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    shop_items: { name: string } | { name: string }[] | null;
    prize_items: { label: string } | { label: string }[] | null;
  };
  const shop = Array.isArray(row.shop_items)
    ? row.shop_items[0]
    : row.shop_items;
  const prize = Array.isArray(row.prize_items)
    ? row.prize_items[0]
    : row.prize_items;
  if (shop?.name) return shop.name;
  if (prize?.label) return prize.label;
  return null;
}

export type FishItemSnapshot = {
  name: string;
} | null;

export function buildFishItemJson(f: FishItemSnapshot): Json | null {
  if (!f) return null;
  return { name: f.name } as unknown as Json;
}

const FISH_TYPES: FishType[] = [
  "common",
  "rare",
  "legendary",
  "matchmaker",
  "leviathan",
];

export interface FishingRewardWithItem extends FishingRewardRow {
  shop_item: {
    name: string;
    image_url: string | null;
    item_type: string;
  } | null;
}

function weightedPickRewards(rows: FishingRewardRow[]): FishingRewardRow {
  const total = rows.reduce((s, row) => s + Number(row.weight), 0);
  let r = Math.random() * total;
  for (const row of rows) {
    r -= Number(row.weight);
    if (r <= 0) return row;
  }
  return rows[rows.length - 1]!;
}

/** 取得某魚種某 tier 的有效獎品列（不篩庫存；呼叫端或 pickReward 再篩）。 */
export async function findActiveRewards(
  fishType: FishType,
  tier: FishingRewardTier,
): Promise<FishingRewardRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_rewards")
    .select("*")
    .eq("fish_type", fishType)
    .eq("reward_tier", tier)
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as FishingRewardRow[];
}

async function consumeFishingRewardStockRpc(rewardId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_fishing_reward_stock", {
    p_id: rewardId,
  });
  if (error) throw error;
  return Boolean(data);
}

/**
 * 加權隨機抽選；限量獎品以 RPC 原子扣庫存，競態時重試。
 * 無限量（stock IS NULL）不呼叫 RPC。
 */
export async function pickReward(
  fishType: FishType,
  tier: FishingRewardTier,
): Promise<FishingRewardRow | null> {
  const maxAttempts = 48;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rows = await findActiveRewards(fishType, tier);
    const available = rows.filter(
      (row) => row.stock == null || row.stock_used < (row.stock ?? 0),
    );
    if (available.length === 0) return null;

    const picked = weightedPickRewards(available);
    if (picked.stock == null) {
      return picked;
    }
    const ok = await consumeFishingRewardStockRpc(picked.id);
    if (ok) {
      return {
        ...picked,
        stock_used: picked.stock_used + 1,
      };
    }
  }
  return null;
}

/** 限量獎品扣庫存（通常已由 pickReward 內部完成；保留供特殊路徑）。 */
export async function consumeRewardStock(rewardId: string): Promise<void> {
  const ok = await consumeFishingRewardStockRpc(rewardId);
  if (!ok) {
    throw new Error("consumeRewardStock: no stock or invalid id");
  }
}

export async function findAllRewardsForAdmin(filters?: {
  fishType?: FishType;
  isActive?: boolean;
}): Promise<FishingRewardWithItem[]> {
  const admin = createAdminClient();
  let q = admin
    .from("fishing_rewards")
    .select(
      `
      *,
      shop_items ( name, image_url, item_type )
    `,
    )
    .order("fish_type", { ascending: true })
    .order("reward_tier", { ascending: true })
    .order("created_at", { ascending: false });
  if (filters?.fishType) {
    q = q.eq("fish_type", filters.fishType);
  }
  if (filters?.isActive !== undefined) {
    q = q.eq("is_active", filters.isActive);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as (FishingRewardRow & {
    shop_items:
      | { name: string; image_url: string | null; item_type: string }
      | { name: string; image_url: string | null; item_type: string }[]
      | null;
  })[];
  return rows.map((r) => {
    const si = r.shop_items;
    const shop = Array.isArray(si) ? si[0] : si;
    const { shop_items: _nested, ...rest } = r as FishingRewardRow & {
      shop_items:
        | { name: string; image_url: string | null; item_type: string }
        | { name: string; image_url: string | null; item_type: string }[]
        | null;
    };
    void _nested;
    return {
      ...(rest as FishingRewardRow),
      shop_item: shop
        ? {
            name: shop.name,
            image_url: shop.image_url,
            item_type: shop.item_type,
          }
        : null,
    };
  });
}

export async function createReward(
  data: FishingRewardInsert,
): Promise<FishingRewardRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("fishing_rewards")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as FishingRewardRow;
}

export async function updateReward(
  id: string,
  data: Partial<FishingRewardInsert> & {
    is_active?: boolean;
    stock?: number | null;
    weight?: number;
  },
): Promise<FishingRewardRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("fishing_rewards")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as FishingRewardRow;
}

export async function deleteReward(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("fishing_rewards").delete().eq("id", id);
  if (error) throw error;
}

export async function getFishingStats(): Promise<{
  todayCount: number;
  totalCount: number;
  matchmakerCount: number;
  leviathanCount: number;
  fishTypeBreakdown: Record<FishType, number>;
}> {
  const admin = createAdminClient();
  const todayStart = `${taipeiCalendarDateKey()}T00:00:00+08:00`;

  const [
    todayRes,
    totalRes,
    matchmakerRes,
    leviathanRes,
    ...perTypeRes
  ] = await Promise.all([
    admin
      .from("fishing_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart),
    admin.from("fishing_logs").select("*", { count: "exact", head: true }),
    admin
      .from("fishing_logs")
      .select("*", { count: "exact", head: true })
      .eq("fish_type", "matchmaker"),
    admin
      .from("fishing_logs")
      .select("*", { count: "exact", head: true })
      .eq("fish_type", "leviathan"),
    ...FISH_TYPES.map((ft) =>
      admin
        .from("fishing_logs")
        .select("*", { count: "exact", head: true })
        .eq("fish_type", ft),
    ),
  ]);

  const fishTypeBreakdown = {} as Record<FishType, number>;
  FISH_TYPES.forEach((ft, i) => {
    fishTypeBreakdown[ft] = perTypeRes[i]?.count ?? 0;
  });

  return {
    todayCount: todayRes.count ?? 0,
    totalCount: totalRes.count ?? 0,
    matchmakerCount: matchmakerRes.count ?? 0,
    leviathanCount: leviathanRes.count ?? 0,
    fishTypeBreakdown,
  };
}

const ADMIN_LOG_PAGE = 20;

export type FishingLogAdminRow = {
  id: string;
  created_at: string;
  fish_type: FishType;
  fish_coins: number | null;
  fish_exp: number | null;
  fish_item: Json | null;
  no_match_found: boolean | null;
  fish_user_id: string | null;
  fisher: { nickname: string; avatar_url: string | null };
  fish_user: { nickname: string } | null;
};

export async function findFishingLogsForAdmin(options: {
  nickname?: string;
  fishType?: FishType;
  page?: number;
}): Promise<{ rows: FishingLogAdminRow[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * ADMIN_LOG_PAGE;
  const to = from + ADMIN_LOG_PAGE - 1;

  let userIds: string[] | undefined;
  if (options.nickname?.trim()) {
    const q = `%${options.nickname.trim()}%`;
    const { data: users, error: uErr } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", q);
    if (uErr) throw uErr;
    userIds = (users ?? []).map((u) => (u as { id: string }).id);
    if (userIds.length === 0) {
      return { rows: [], total: 0 };
    }
  }

  let countQ = admin
    .from("fishing_logs")
    .select("*", { count: "exact", head: true });
  let dataQ = admin
    .from("fishing_logs")
    .select(
      `
      id,
      created_at,
      fish_type,
      fish_coins,
      fish_exp,
      fish_item,
      no_match_found,
      fish_user_id,
      fisher:users!fishing_logs_user_id_fkey ( nickname, avatar_url ),
      fish_user:users!fishing_logs_fish_user_id_fkey ( nickname )
    `,
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (userIds) {
    countQ = countQ.in("user_id", userIds);
    dataQ = dataQ.in("user_id", userIds);
  }
  if (options.fishType) {
    countQ = countQ.eq("fish_type", options.fishType);
    dataQ = dataQ.eq("fish_type", options.fishType);
  }

  const [{ count, error: cErr }, { data, error: dErr }] = await Promise.all([
    countQ,
    dataQ,
  ]);
  if (cErr) throw cErr;
  if (dErr) throw dErr;

  const rowsRaw = (data ?? []) as unknown as {
    id: string;
    created_at: string;
    fish_type: FishType;
    fish_coins: number | null;
    fish_exp: number | null;
    fish_item: Json | null;
    no_match_found: boolean | null;
    fish_user_id: string | null;
    fisher:
      | { nickname: string; avatar_url: string | null }
      | { nickname: string; avatar_url: string | null }[]
      | null;
    fish_user: { nickname: string } | { nickname: string }[] | null;
  }[];

  const rows: FishingLogAdminRow[] = rowsRaw.map((r) => {
    const fisher = Array.isArray(r.fisher) ? r.fisher[0] : r.fisher;
    const fu = Array.isArray(r.fish_user) ? r.fish_user[0] : r.fish_user;
    return {
      id: r.id,
      created_at: r.created_at,
      fish_type: r.fish_type,
      fish_coins: r.fish_coins,
      fish_exp: r.fish_exp,
      fish_item: r.fish_item,
      no_match_found: r.no_match_found,
      fish_user_id: r.fish_user_id,
      fisher: {
        nickname: fisher?.nickname ?? "?",
        avatar_url: fisher?.avatar_url ?? null,
      },
      fish_user: fu ? { nickname: fu.nickname } : null,
    };
  });

  return { rows, total: count ?? 0 };
}

export type MatchmakerLogAdminRow = {
  id: string;
  created_at: string;
  fisher: { nickname: string; avatar_url: string | null };
  target: { nickname: string; avatar_url: string | null } | null;
  no_match: boolean;
};

export async function findMatchmakerLogsForAdmin(options: {
  fisherNickname?: string;
  targetNickname?: string;
  page?: number;
}): Promise<{ rows: MatchmakerLogAdminRow[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * ADMIN_LOG_PAGE;
  const to = from + ADMIN_LOG_PAGE - 1;

  let fisherIds: string[] | undefined;
  let targetIds: string[] | undefined;
  if (options.fisherNickname?.trim()) {
    const q = `%${options.fisherNickname.trim()}%`;
    const { data: users, error } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", q);
    if (error) throw error;
    fisherIds = (users ?? []).map((u) => (u as { id: string }).id);
    if (fisherIds.length === 0) return { rows: [], total: 0 };
  }
  if (options.targetNickname?.trim()) {
    const q = `%${options.targetNickname.trim()}%`;
    const { data: users, error } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", q);
    if (error) throw error;
    targetIds = (users ?? []).map((u) => (u as { id: string }).id);
    if (targetIds.length === 0) return { rows: [], total: 0 };
  }

  let countQ = admin
    .from("fishing_logs")
    .select("*", { count: "exact", head: true })
    .eq("fish_type", "matchmaker");
  let dataQ = admin
    .from("fishing_logs")
    .select(
      `
      id,
      created_at,
      no_match_found,
      fisher:users!fishing_logs_user_id_fkey ( nickname, avatar_url ),
      target:users!fishing_logs_fish_user_id_fkey ( nickname, avatar_url )
    `,
    )
    .eq("fish_type", "matchmaker")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (fisherIds) {
    countQ = countQ.in("user_id", fisherIds);
    dataQ = dataQ.in("user_id", fisherIds);
  }
  if (targetIds) {
    countQ = countQ.in("fish_user_id", targetIds);
    dataQ = dataQ.in("fish_user_id", targetIds);
  }

  const [{ count, error: cErr }, { data, error: dErr }] = await Promise.all([
    countQ,
    dataQ,
  ]);
  if (cErr) throw cErr;
  if (dErr) throw dErr;

  const rowsRaw = (data ?? []) as unknown as {
    id: string;
    created_at: string;
    no_match_found: boolean | null;
    fisher:
      | { nickname: string; avatar_url: string | null }
      | { nickname: string; avatar_url: string | null }[]
      | null;
    target:
      | { nickname: string; avatar_url: string | null }
      | { nickname: string; avatar_url: string | null }[]
      | null;
  }[];

  const rows: MatchmakerLogAdminRow[] = rowsRaw.map((r) => {
    const fisher = Array.isArray(r.fisher) ? r.fisher[0] : r.fisher;
    const target = Array.isArray(r.target) ? r.target[0] : r.target;
    return {
      id: r.id,
      created_at: r.created_at,
      fisher: {
        nickname: fisher?.nickname ?? "?",
        avatar_url: fisher?.avatar_url ?? null,
      },
      target: target
        ? {
            nickname: target.nickname,
            avatar_url: target.avatar_url,
          }
        : null,
      no_match: Boolean(r.no_match_found),
    };
  });

  return { rows, total: count ?? 0 };
}
