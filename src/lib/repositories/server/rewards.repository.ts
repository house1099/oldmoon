import { createAdminClient } from "@/lib/supabase/admin";
import { insertUserReward } from "@/lib/repositories/server/prize.repository";
import type { Database, UserRewardRow } from "@/types/database.types";
import {
  parseShopFrameLayoutFromMetadata,
  type ShopFrameLayout,
} from "@/lib/utils/avatar-frame-layout";
import {
  parseCardDecorationFromMetadata,
  type CardDecorationConfig,
} from "@/lib/utils/card-decoration";

type UserRewardUpdate = Database["public"]["Tables"]["user_rewards"]["Update"];
type UserRewardInsert = Database["public"]["Tables"]["user_rewards"]["Insert"];
type BroadcastInsert = Database["public"]["Tables"]["broadcasts"]["Insert"];

export type UserRewardWithEffect = UserRewardRow & {
  effect_key: string | null;
  image_url: string | null;
  /** 僅商城來源頭像框／卡框：來自 `shop_items.metadata.frame_layout` */
  frame_layout: ShopFrameLayout | null;
  /** 以下欄位來自 `shop_items`；無 `shop_item_id` 時為 null（非商城來源） */
  shop_allow_gift: boolean | null;
  /** 與 `shop_allow_player_trade` 同源；供 UI 條件 `allow_player_trade !== false` */
  allow_player_trade: boolean | null;
  shop_allow_player_trade: boolean | null;
  shop_allow_resell: boolean | null;
  shop_resell_price: number | null;
  shop_resell_currency_type: string | null;
  /** 商品原幣種（回收幣種空白時與此相同） */
  shop_currency_type: string | null;
  shop_allow_delete: boolean | null;
};

/** 相容舊庫曾用 reward_ref_id；effect_key 僅在 prize_items */
type RawUserRewardRow = UserRewardRow & { reward_ref_id?: string | null };

function prizeItemRefId(row: RawUserRewardRow): string | null {
  return row.item_ref_id ?? row.reward_ref_id ?? null;
}

export async function findMyRewards(
  userId: string,
): Promise<UserRewardWithEffect[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as RawUserRewardRow[];

  const itemIds = Array.from(
    new Set(rows.map(prizeItemRefId).filter((id): id is string => Boolean(id))),
  );
  const effectByItemId = new Map<string, string | null>();
  const imageByPrizeItemId = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const { data: items, error: itemErr } = await admin
      .from("prize_items")
      .select("id, effect_key, image_url")
      .in("id", itemIds);
    if (itemErr) throw itemErr;
    for (const it of items ?? []) {
      effectByItemId.set(it.id as string, (it.effect_key as string | null) ?? null);
      imageByPrizeItemId.set(it.id as string, (it.image_url as string | null) ?? null);
    }
  }

  const shopItemIds = Array.from(
    new Set(
      rows
        .map((row) => row.shop_item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const imageByShopItemId = new Map<string, string | null>();
  const effectByShopItemId = new Map<string, string | null>();
  const layoutByShopItemId = new Map<string, ShopFrameLayout | null>();
  const policyByShopItemId = new Map<
    string,
    {
      allow_gift: boolean;
      allow_player_trade: boolean;
      allow_resell: boolean;
      resell_price: number | null;
      resell_currency_type: string | null;
      allow_delete: boolean;
      currency_type: string;
    }
  >();
  if (shopItemIds.length > 0) {
    const { data: shopItems, error: shopErr } = await admin
      .from("shop_items")
      .select(
        "id, effect_key, image_url, metadata, currency_type, allow_gift, allow_player_trade, allow_resell, resell_price, resell_currency_type, allow_delete",
      )
      .in("id", shopItemIds);
    if (shopErr) throw shopErr;
    for (const it of shopItems ?? []) {
      const sid = it.id as string;
      const ek = (it.effect_key as string | null)?.trim() || null;
      effectByShopItemId.set(sid, ek);
      imageByShopItemId.set(sid, (it.image_url as string | null) ?? null);
      layoutByShopItemId.set(
        sid,
        parseShopFrameLayoutFromMetadata(it.metadata as unknown),
      );
      policyByShopItemId.set(sid, {
        // 與贈送／後台預設一致：null 視為允許，僅明確 false 才關閉
        allow_gift: it.allow_gift !== false,
        allow_player_trade: it.allow_player_trade !== false,
        allow_resell: it.allow_resell === true,
        resell_price:
          it.resell_price != null && Number.isFinite(Number(it.resell_price))
            ? Number(it.resell_price)
            : null,
        resell_currency_type:
          typeof it.resell_currency_type === "string" &&
          it.resell_currency_type.trim()
            ? it.resell_currency_type.trim()
            : null,
        allow_delete: it.allow_delete !== false,
        currency_type: String(it.currency_type ?? "free_coins"),
      });
    }
  }

  return rows.map((row) => {
    const refId = prizeItemRefId(row);
    const sid = row.shop_item_id;
    const effectFromPrize = refId ? (effectByItemId.get(refId) ?? null) : null;
    const effectFromShop = sid ? (effectByShopItemId.get(sid) ?? null) : null;
    const pol = sid ? policyByShopItemId.get(sid) : undefined;
    return {
      id: row.id,
      user_id: row.user_id,
      reward_type: row.reward_type,
      item_ref_id: refId,
      shop_item_id: sid,
      label: row.label,
      is_equipped: row.is_equipped,
      used_at: row.used_at,
      created_at: row.created_at,
      effect_key: effectFromPrize ?? effectFromShop,
      image_url:
        (refId ? (imageByPrizeItemId.get(refId) ?? null) : null) ??
        (sid ? (imageByShopItemId.get(sid) ?? null) : null),
      frame_layout: sid ? (layoutByShopItemId.get(sid) ?? null) : null,
      shop_allow_gift: pol ? pol.allow_gift : null,
      allow_player_trade: pol ? pol.allow_player_trade : null,
      shop_allow_player_trade: pol ? pol.allow_player_trade : null,
      shop_allow_resell: pol ? pol.allow_resell : null,
      shop_resell_price: pol ? pol.resell_price : null,
      shop_resell_currency_type: pol ? pol.resell_currency_type : null,
      shop_currency_type: pol ? pol.currency_type : null,
      shop_allow_delete: pol ? pol.allow_delete : null,
    };
  });
}

type JoinedUserRewardForGift = RawUserRewardRow & {
  shop_items: { allow_gift: boolean } | { allow_gift: boolean }[] | null;
  prize_items: { reward_type: string } | { reward_type: string }[] | null;
};

function userRewardRowFromJoined(data: JoinedUserRewardForGift): UserRewardRow {
  const { shop_items, prize_items, ...rest } = data;
  void shop_items;
  void prize_items;
  const raw = rest as RawUserRewardRow;
  return {
    id: raw.id,
    user_id: raw.user_id,
    reward_type: raw.reward_type,
    item_ref_id: prizeItemRefId(raw),
    shop_item_id: raw.shop_item_id,
    label: raw.label,
    is_equipped: raw.is_equipped,
    used_at: raw.used_at,
    created_at: raw.created_at,
  };
}

function embeddedGiftJoin<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

async function fetchJoinedUserReward(
  rewardId: string,
): Promise<JoinedUserRewardForGift | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*, shop_items(allow_gift), prize_items(reward_type)")
    .eq("id", rewardId)
    .maybeSingle();
  if (error) throw error;
  return (data as JoinedUserRewardForGift) ?? null;
}

/**
 * 單筆 user_rewards，LEFT JOIN shop_items（allow_gift）、prize_items（reward_type）。
 * 其餘呼叫端僅使用回傳之列欄位。
 */
export async function findUserRewardById(
  rewardId: string,
): Promise<UserRewardRow | null> {
  const j = await fetchJoinedUserReward(rewardId);
  return j ? userRewardRowFromJoined(j) : null;
}

/** 贈送流程用：同筆 JOIN，附是否允許贈送（商城看 allow_gift；獎池來源預設 true） */
export async function findUserRewardGiftMeta(
  rewardId: string,
): Promise<{
  row: UserRewardRow;
  allowGift: boolean;
  prizeRewardType: string | null;
} | null> {
  const j = await fetchJoinedUserReward(rewardId);
  if (!j) return null;
  const row = userRewardRowFromJoined(j);
  const shop = embeddedGiftJoin(j.shop_items);
  const prize = embeddedGiftJoin(j.prize_items);
  const allowGift =
    row.shop_item_id != null ? shop?.allow_gift !== false : true;
  return {
    row,
    allowGift,
    prizeRewardType: prize?.reward_type ?? null,
  };
}

export type GiftRecipientSearchRow = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  level: number;
};

/** 模糊比對暱稱（僅 active），最多 5 筆；不包含 %、_ 字面量注入 */
export async function findUsersByNickname(
  nickname: string,
  excludeUserId?: string,
): Promise<GiftRecipientSearchRow[]> {
  const term = nickname.trim().replace(/[%_]/g, "");
  if (!term) return [];

  const admin = createAdminClient();
  let q = admin
    .from("users")
    .select("id, nickname, avatar_url, level")
    .eq("status", "active")
    .ilike("nickname", `%${term}%`)
    .limit(5);

  if (excludeUserId) {
    q = q.neq("id", excludeUserId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((u) => ({
    id: u.id as string,
    nickname: (u.nickname as string) ?? "",
    avatar_url: (u.avatar_url as string | null) ?? null,
    level: typeof u.level === "number" ? u.level : 1,
  }));
}

export async function equipReward(rewardId: string): Promise<void> {
  const admin = createAdminClient();
  const patch: UserRewardUpdate = { is_equipped: true };
  const { error } = await admin
    .from("user_rewards")
    .update(patch)
    .eq("id", rewardId);
  if (error) throw error;
}

export async function unequipReward(rewardId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_rewards")
    .update({ is_equipped: false })
    .eq("id", rewardId);
  if (error) throw error;
}

export async function unequipAllOfType(
  userId: string,
  rewardType: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_rewards")
    .update({ is_equipped: false })
    .eq("user_id", userId)
    .eq("reward_type", rewardType);
  if (error) throw error;
}

/** 將道具標記為已使用（僅當 used_at 仍為 null 時更新；否則拋錯） */
export async function markUserRewardConsumed(rewardId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .update({ used_at: new Date().toISOString() })
    .eq("id", rewardId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error("無法標記道具為已使用（可能已使用或不存在）");
  }
}

export async function markBroadcastUsed(rewardId: string): Promise<void> {
  return markUserRewardConsumed(rewardId);
}

export async function insertBroadcast(
  data: Omit<BroadcastInsert, "id" | "created_at" | "expires_at"> & {
    expires_at?: string;
  },
): Promise<void> {
  const admin = createAdminClient();
  const expires_at =
    data.expires_at ??
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin
    .from("broadcasts")
    .insert({ ...data, expires_at });
  if (error) throw error;
}

export async function clearUserRewardUsedAt(rewardId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_rewards")
    .update({ used_at: null })
    .eq("id", rewardId);
  if (error) throw error;
}

export async function findEarliestUnusedRenameCard(
  userId: string,
): Promise<UserRewardRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*")
    .eq("user_id", userId)
    .eq("reward_type", "rename_card")
    .is("used_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRewardRow) ?? null;
}

export type ActiveBroadcastRow = {
  id: string;
  message: string;
  nickname: string;
  created_at: string;
  expires_at: string;
  user_id: string;
};

export async function findActiveBroadcasts(): Promise<ActiveBroadcastRow[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await admin
    .from("broadcasts")
    .select("id, message, created_at, expires_at, user_id")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  const list = rows ?? [];
  if (list.length === 0) return [];

  const userIds = Array.from(
    new Set(list.map((r) => r.user_id as string)),
  );
  const { data: users, error: uerr } = await admin
    .from("users")
    .select("id, nickname")
    .in("id", userIds);
  if (uerr) throw uerr;
  const nick = new Map(
    (users ?? []).map((u) => [
      u.id as string,
      ((u.nickname as string) ?? "—").trim() || "—",
    ]),
  );

  return list.map((r) => ({
    id: r.id as string,
    message: r.message as string,
    created_at: r.created_at as string,
    expires_at: r.expires_at as string,
    user_id: r.user_id as string,
    nickname: nick.get(r.user_id as string) ?? "—",
  }));
}

export async function expireBroadcast(broadcastId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("broadcasts")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", broadcastId);
  if (error) throw error;
}

export async function findEquippedRewardLabels(userId: string): Promise<{
  equippedTitle: string | null;
  equippedTitleImageUrl: string | null;
  equippedFrame: string | null;
  equippedAvatarFrameEffectKey: string | null;
  equippedAvatarFrameImageUrl: string | null;
  equippedAvatarFrameLayout: ShopFrameLayout | null;
  equippedCardFrameEffectKey: string | null;
  equippedCardFrameImageUrl: string | null;
  equippedCardFrameLayout: ShopFrameLayout | null;
  equippedCardDecoration: CardDecorationConfig;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*")
    .eq("user_id", userId)
    .eq("is_equipped", true)
    .in("reward_type", ["title", "avatar_frame", "card_frame"]);
  if (error) throw error;
  const list = (data ?? []) as RawUserRewardRow[];

  const itemIds = Array.from(
    new Set(
      list.map(prizeItemRefId).filter((id): id is string => Boolean(id)),
    ),
  );
  const effectByItemId = new Map<string, string | null>();
  const imageByItemId = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const { data: items, error: itemErr } = await admin
      .from("prize_items")
      .select("id, effect_key, image_url")
      .in("id", itemIds);
    if (itemErr) throw itemErr;
    for (const it of items ?? []) {
      effectByItemId.set(it.id as string, (it.effect_key as string | null) ?? null);
      imageByItemId.set(it.id as string, (it.image_url as string | null) ?? null);
    }
  }
  const shopItemIds = Array.from(
    new Set(
      list
        .map((row) => row.shop_item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const effectByShopItemId = new Map<string, string | null>();
  const imageByShopItemId = new Map<string, string | null>();
  const layoutByShopItemId = new Map<string, ShopFrameLayout | null>();
  const decorationByShopItemId = new Map<string, CardDecorationConfig>();
  if (shopItemIds.length > 0) {
    const { data: shopItems, error: shopErr } = await admin
      .from("shop_items")
      .select("id, effect_key, image_url, metadata")
      .in("id", shopItemIds);
    if (shopErr) throw shopErr;
    for (const it of shopItems ?? []) {
      const sid = it.id as string;
      effectByShopItemId.set(sid, (it.effect_key as string | null) ?? null);
      imageByShopItemId.set(sid, (it.image_url as string | null) ?? null);
      layoutByShopItemId.set(
        sid,
        parseShopFrameLayoutFromMetadata(it.metadata as unknown),
      );
      decorationByShopItemId.set(
        sid,
        parseCardDecorationFromMetadata(it.metadata as unknown),
      );
    }
  }

  let equippedTitle: string | null = null;
  let equippedTitleImageUrl: string | null = null;
  let equippedFrame: string | null = null;
  let equippedAvatarFrameEffectKey: string | null = null;
  let equippedAvatarFrameImageUrl: string | null = null;
  let equippedAvatarFrameLayout: ShopFrameLayout | null = null;
  let equippedCardFrameEffectKey: string | null = null;
  let equippedCardFrameImageUrl: string | null = null;
  let equippedCardFrameLayout: ShopFrameLayout | null = null;
  let equippedCardDecoration: CardDecorationConfig = {};
  for (const row of list) {
    const rt = row.reward_type;
    const lb = row.label?.trim() || null;
    const refId = prizeItemRefId(row);
    const ek = refId
      ? effectByItemId.get(refId)?.trim() || null
      : row.shop_item_id
        ? effectByShopItemId.get(row.shop_item_id)?.trim() || null
        : null;
    const imageUrl = refId
      ? imageByItemId.get(refId)?.trim() || null
      : row.shop_item_id
        ? imageByShopItemId.get(row.shop_item_id)?.trim() || null
        : null;
    if (rt === "title") {
      if (lb) equippedTitle = lb;
      equippedTitleImageUrl = imageUrl;
    }
    if (rt === "avatar_frame" && lb) {
      equippedFrame = lb;
      equippedAvatarFrameEffectKey = ek;
      equippedAvatarFrameImageUrl = imageUrl;
      equippedAvatarFrameLayout = row.shop_item_id
        ? (layoutByShopItemId.get(row.shop_item_id) ?? null)
        : null;
    }
    if (rt === "card_frame" && lb) {
      equippedCardFrameEffectKey = ek;
      equippedCardFrameImageUrl = imageUrl;
      equippedCardFrameLayout = row.shop_item_id
        ? (layoutByShopItemId.get(row.shop_item_id) ?? null)
        : null;
      const shopDec = row.shop_item_id
        ? (decorationByShopItemId.get(row.shop_item_id) ?? {})
        : {};
      equippedCardDecoration = {
        ...shopDec,
        cardFrameEffectKey: ek,
        cardFrameImageUrl: imageUrl,
        cardFrameLayout: equippedCardFrameLayout,
      };
    }
  }
  return {
    equippedTitle,
    equippedTitleImageUrl,
    equippedFrame,
    equippedAvatarFrameEffectKey,
    equippedAvatarFrameImageUrl,
    equippedAvatarFrameLayout,
    equippedCardFrameEffectKey,
    equippedCardFrameImageUrl,
    equippedCardFrameLayout,
    equippedCardDecoration,
  };
}

/** 列表／聊天／酒館等批次附掛用（與 `findEquippedRewardLabels` 商城框邏輯一致） */
export type EquippedAvatarFrameForList = {
  equippedAvatarFrameEffectKey: string | null;
  equippedAvatarFrameImageUrl: string | null;
  equippedAvatarFrameLayout: ShopFrameLayout | null;
};

/** PostgREST 內嵌一對一關聯可能是物件或單元素陣列 */
function embeddedSingle<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const USER_REWARD_ITEM_JOIN_SELECT =
  "*, prize_items(effect_key, image_url), shop_items(metadata, effect_key, image_url)";

type JoinedUserRewardRow = RawUserRewardRow & {
  prize_items:
    | { effect_key: string | null; image_url: string | null }
    | { effect_key: string | null; image_url: string | null }[]
    | null;
  shop_items:
    | {
        metadata: unknown;
        effect_key: string | null;
        image_url: string | null;
      }
    | Array<{
        metadata: unknown;
        effect_key: string | null;
        image_url: string | null;
      }>
    | null;
};

/** 列表／探索等批次附掛：已裝備稱號文字 + 胸章圖 */
export type EquippedTitleForList = {
  equippedTitle: string | null;
  equippedTitleImageUrl: string | null;
};

function equippedTitleFromJoinedRow(
  row: JoinedUserRewardRow,
): EquippedTitleForList {
  const lb = row.label?.trim() || null;
  const refId = prizeItemRefId(row);
  const pi = embeddedSingle(row.prize_items);
  const si = embeddedSingle(row.shop_items);
  let imageUrl: string | null = null;
  if (refId && pi) {
    imageUrl = pi.image_url?.trim() || null;
  } else if (si) {
    imageUrl = si.image_url?.trim() || null;
  }
  return { equippedTitle: lb, equippedTitleImageUrl: imageUrl };
}

/**
 * 一次查多個使用者的已裝備稱號（每人最多取一筆）。
 */
export async function findEquippedTitlesByUserIds(
  userIds: string[],
): Promise<Map<string, EquippedTitleForList>> {
  const out = new Map<string, EquippedTitleForList>();
  if (userIds.length === 0) return out;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select(USER_REWARD_ITEM_JOIN_SELECT)
    .in("user_id", userIds)
    .eq("reward_type", "title")
    .eq("is_equipped", true);
  if (error) throw error;
  const list = (data ?? []) as JoinedUserRewardRow[];
  for (const row of list) {
    const uid = row.user_id as string;
    if (out.has(uid)) continue;
    out.set(uid, equippedTitleFromJoinedRow(row));
  }
  return out;
}

function equippedAvatarFrameFromJoinedRow(
  row: JoinedUserRewardRow,
): EquippedAvatarFrameForList {
  const refId = prizeItemRefId(row);
  const pi = embeddedSingle(row.prize_items);
  const si = embeddedSingle(row.shop_items);
  if (refId && pi) {
    return {
      equippedAvatarFrameEffectKey: pi.effect_key?.trim() || null,
      equippedAvatarFrameImageUrl: pi.image_url?.trim() || null,
      equippedAvatarFrameLayout:
        row.shop_item_id && si
          ? parseShopFrameLayoutFromMetadata(si.metadata)
          : null,
    };
  }
  if (si) {
    const layout = row.shop_item_id
      ? parseShopFrameLayoutFromMetadata(si.metadata)
      : null;
    return {
      equippedAvatarFrameEffectKey: si.effect_key?.trim() || null,
      equippedAvatarFrameImageUrl: si.image_url?.trim() || null,
      equippedAvatarFrameLayout: layout,
    };
  }
  return {
    equippedAvatarFrameEffectKey: null,
    equippedAvatarFrameImageUrl: null,
    equippedAvatarFrameLayout: null,
  };
}

function cardDecorationFromJoinedEquippedRow(
  row: JoinedUserRewardRow,
): CardDecorationConfig {
  const refId = prizeItemRefId(row);
  const pi = embeddedSingle(row.prize_items);
  const si = embeddedSingle(row.shop_items);
  const metaDec = si ? parseCardDecorationFromMetadata(si.metadata) : {};
  const layout = row.shop_item_id ? (metaDec.cardFrameLayout ?? null) : null;
  if (refId && pi) {
    return {
      ...metaDec,
      cardFrameLayout: layout,
      cardFrameEffectKey: pi.effect_key?.trim() || null,
      cardFrameImageUrl: pi.image_url?.trim() || null,
    };
  }
  if (si) {
    return {
      ...metaDec,
      cardFrameLayout: layout,
      cardFrameEffectKey:
        si.effect_key?.trim() || metaDec.cardFrameEffectKey || null,
      cardFrameImageUrl:
        si.image_url?.trim() || metaDec.cardFrameImageUrl || null,
    };
  }
  return { ...metaDec, cardFrameLayout: layout };
}

/**
 * 一次查多個使用者的已裝備商城／獎池頭像框（每人最多取一筆）。
 * 單次查詢：`user_rewards` LEFT JOIN `prize_items`／`shop_items`。
 */
export async function findEquippedAvatarFramesByUserIds(
  userIds: string[],
): Promise<Map<string, EquippedAvatarFrameForList>> {
  const out = new Map<string, EquippedAvatarFrameForList>();
  if (userIds.length === 0) return out;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select(USER_REWARD_ITEM_JOIN_SELECT)
    .in("user_id", userIds)
    .eq("reward_type", "avatar_frame")
    .eq("is_equipped", true);
  if (error) throw error;
  const list = (data ?? []) as JoinedUserRewardRow[];
  for (const row of list) {
    const uid = row.user_id as string;
    if (out.has(uid)) continue;
    out.set(uid, equippedAvatarFrameFromJoinedRow(row));
  }
  return out;
}

/**
 * 一次查多個使用者的已裝備商城／獎池卡框裝飾（每人最多取一筆）。
 * 單次查詢：`user_rewards` LEFT JOIN `prize_items`／`shop_items`。
 */
export async function findEquippedCardFramesByUserIds(
  userIds: string[],
): Promise<Map<string, CardDecorationConfig>> {
  const out = new Map<string, CardDecorationConfig>();
  if (userIds.length === 0) return out;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select(USER_REWARD_ITEM_JOIN_SELECT)
    .in("user_id", userIds)
    .eq("reward_type", "card_frame")
    .eq("is_equipped", true);
  if (error) throw error;
  const list = (data ?? []) as JoinedUserRewardRow[];
  for (const row of list) {
    const uid = row.user_id as string;
    if (out.has(uid)) continue;
    out.set(uid, cardDecorationFromJoinedEquippedRow(row));
  }
  return out;
}

export type FishingInventoryItem = {
  id: string;
  reward_type: string;
  shop_item_id: string | null;
  displayName: string;
};

/** 背包內釣竿／釣餌列表（含商城品名），供釣魚 UI 選擇。 */
export async function listFishingRodsAndBaits(
  userId: string,
): Promise<{ rods: FishingInventoryItem[]; baits: FishingInventoryItem[] }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("id, reward_type, shop_item_id, label, shop_items(name)")
    .eq("user_id", userId)
    .in("reward_type", ["fishing_rod", "fishing_bait"]);
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    reward_type: string;
    shop_item_id: string | null;
    label: string | null;
    shop_items: { name: string } | { name: string }[] | null;
  }[];
  const rods: FishingInventoryItem[] = [];
  const baits: FishingInventoryItem[] = [];
  for (const r of rows) {
    const shop = Array.isArray(r.shop_items)
      ? r.shop_items[0]
      : r.shop_items;
    const displayName =
      shop?.name?.trim() || r.label?.trim() || "釣魚道具";
    const item: FishingInventoryItem = {
      id: r.id,
      reward_type: r.reward_type,
      shop_item_id: r.shop_item_id,
      displayName,
    };
    if (r.reward_type === "fishing_rod") rods.push(item);
    else baits.push(item);
  }
  return { rods, baits };
}

export async function findFirstUserRewardIdOfType(
  userId: string,
  rewardType: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("id")
    .eq("user_id", userId)
    .eq("reward_type", rewardType)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export async function countUserRewardsByType(
  userId: string,
  rewardType: string,
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("user_rewards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reward_type", rewardType);
  if (error) throw error;
  return count ?? 0;
}

export async function deleteUserRewardForOwner(
  rewardId: string,
  ownerUserId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .delete()
    .eq("id", rewardId)
    .eq("user_id", ownerUserId)
    .select("id");
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export async function deleteUserRewardsForOwner(
  rewardIds: string[],
  ownerUserId: string,
): Promise<number> {
  if (rewardIds.length === 0) return 0;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .delete()
    .in("id", rewardIds)
    .eq("user_id", ownerUserId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

/** 複製一筆獎勵給對方後刪除來源列；呼叫端須已驗證身分與血盟 */
export async function transferUserRewardToUser(
  rewardId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const row = await findUserRewardById(rewardId);
  if (!row || row.user_id !== fromUserId) {
    throw new Error("USER_REWARD_NOT_FOUND");
  }
  const raw = row as RawUserRewardRow;
  const payload: Omit<UserRewardInsert, "id" | "created_at"> = {
    user_id: toUserId,
    reward_type: row.reward_type,
    item_ref_id: prizeItemRefId(raw),
    shop_item_id: row.shop_item_id,
    label: row.label,
    is_equipped: false,
    used_at: null,
  };
  await insertUserReward(payload);
  const admin = createAdminClient();
  const { error } = await admin.from("user_rewards").delete().eq("id", rewardId);
  if (error) throw error;
}
