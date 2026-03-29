import { createAdminClient } from "@/lib/supabase/admin";
import { insertUserReward } from "@/lib/repositories/server/prize.repository";
import type { Database, UserRewardRow } from "@/types/database.types";
import {
  parseShopFrameLayoutFromMetadata,
  type ShopFrameLayout,
} from "@/lib/utils/avatar-frame-layout";

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
        allow_gift: Boolean(it.allow_gift),
        allow_player_trade: Boolean(it.allow_player_trade),
        allow_resell: Boolean(it.allow_resell),
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
      shop_allow_player_trade: pol ? pol.allow_player_trade : null,
      shop_allow_resell: pol ? pol.allow_resell : null,
      shop_resell_price: pol ? pol.resell_price : null,
      shop_resell_currency_type: pol ? pol.resell_currency_type : null,
      shop_currency_type: pol ? pol.currency_type : null,
      shop_allow_delete: pol ? pol.allow_delete : null,
    };
  });
}

export async function findUserRewardById(
  rewardId: string,
): Promise<UserRewardRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*")
    .eq("id", rewardId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRewardRow) ?? null;
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
  equippedFrame: string | null;
  equippedAvatarFrameEffectKey: string | null;
  equippedAvatarFrameImageUrl: string | null;
  equippedAvatarFrameLayout: ShopFrameLayout | null;
  equippedCardFrameEffectKey: string | null;
  equippedCardFrameImageUrl: string | null;
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
    }
  }

  let equippedTitle: string | null = null;
  let equippedFrame: string | null = null;
  let equippedAvatarFrameEffectKey: string | null = null;
  let equippedAvatarFrameImageUrl: string | null = null;
  let equippedAvatarFrameLayout: ShopFrameLayout | null = null;
  let equippedCardFrameEffectKey: string | null = null;
  let equippedCardFrameImageUrl: string | null = null;
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
    if (rt === "title" && lb) equippedTitle = lb;
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
    }
  }
  return {
    equippedTitle,
    equippedFrame,
    equippedAvatarFrameEffectKey,
    equippedAvatarFrameImageUrl,
    equippedAvatarFrameLayout,
    equippedCardFrameEffectKey,
    equippedCardFrameImageUrl,
  };
}

/** 列表／聊天／酒館等批次附掛用（與 `findEquippedRewardLabels` 商城框邏輯一致） */
export type EquippedAvatarFrameForList = {
  equippedAvatarFrameEffectKey: string | null;
  equippedAvatarFrameImageUrl: string | null;
  equippedAvatarFrameLayout: ShopFrameLayout | null;
};

/**
 * 一次查多個使用者的已裝備商城／獎池頭像框（每人最多取一筆）。
 */
export async function findEquippedAvatarFramesByUserIds(
  userIds: string[],
): Promise<Map<string, EquippedAvatarFrameForList>> {
  const out = new Map<string, EquippedAvatarFrameForList>();
  if (userIds.length === 0) return out;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*")
    .in("user_id", userIds)
    .eq("reward_type", "avatar_frame")
    .eq("is_equipped", true);
  if (error) throw error;
  const list = (data ?? []) as RawUserRewardRow[];
  if (list.length === 0) return out;

  const itemIds = Array.from(
    new Set(list.map(prizeItemRefId).filter((id): id is string => Boolean(id))),
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
    }
  }

  for (const row of list) {
    const uid = row.user_id as string;
    if (out.has(uid)) continue;
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
    const layout = row.shop_item_id
      ? (layoutByShopItemId.get(row.shop_item_id) ?? null)
      : null;
    out.set(uid, {
      equippedAvatarFrameEffectKey: ek,
      equippedAvatarFrameImageUrl: imageUrl,
      equippedAvatarFrameLayout: layout,
    });
  }
  return out;
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
