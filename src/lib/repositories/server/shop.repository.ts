import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type ShopItemRow = Database["public"]["Tables"]["shop_items"]["Row"];
type ShopItemInsert = Database["public"]["Tables"]["shop_items"]["Insert"];
type ShopItemUpdate = Database["public"]["Tables"]["shop_items"]["Update"];
type ShopOrderInsert = Database["public"]["Tables"]["shop_orders"]["Insert"];
type ShopOrderRow = Database["public"]["Tables"]["shop_orders"]["Row"];
type ShopDailyLimitRow = Database["public"]["Tables"]["shop_daily_limits"]["Row"];

export type { ShopItemRow, ShopOrderRow };

export async function findActiveShopItems(
  currencyType?: string,
): Promise<ShopItemRow[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  let q = admin
    .from("shop_items")
    .select("*")
    .eq("is_active", true)
    .eq("is_archived", false)
    .or(`sale_end_at.is.null,sale_end_at.gt.${nowIso}`)
    .order("sort_order", { ascending: true });
  if (currencyType) {
    q = q.eq("currency_type", currencyType);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ShopItemRow[];
}

export async function findShopItemById(
  id: string,
): Promise<ShopItemRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ShopItemRow) ?? null;
}

export async function findShopItemBySku(
  sku: string,
): Promise<ShopItemRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select("*")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  return (data as ShopItemRow) ?? null;
}

export async function findAllShopItems(): Promise<ShopItemRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShopItemRow[];
}

export async function insertShopItem(
  data: Omit<ShopItemInsert, "id" | "created_at" | "updated_at">,
): Promise<ShopItemRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("shop_items")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as ShopItemRow;
}

export async function updateShopItem(
  id: string,
  patch: ShopItemUpdate,
): Promise<ShopItemRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("shop_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as ShopItemRow;
}

export async function deleteShopItem(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("shop_items").delete().eq("id", id);
  if (error) throw error;
}

export async function hasShopOrders(itemId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("shop_orders")
    .select("*", { count: "exact", head: true })
    .eq("item_id", itemId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function insertShopOrder(
  data: Omit<ShopOrderInsert, "id" | "created_at">,
): Promise<ShopOrderRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("shop_orders")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as ShopOrderRow;
}

export async function getDailyPurchaseCount(
  userId: string,
  itemId: string,
  dateKey: string,
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_daily_limits")
    .select("quantity")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("date_key", dateKey)
    .maybeSingle();
  if (error) throw error;
  return (data as ShopDailyLimitRow | null)?.quantity ?? 0;
}

export async function upsertDailyLimit(
  userId: string,
  itemId: string,
  dateKey: string,
  quantity: number,
): Promise<void> {
  const admin = createAdminClient();
  const { data: existing, error: findErr } = await admin
    .from("shop_daily_limits")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("date_key", dateKey)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const { error } = await admin
      .from("shop_daily_limits")
      .update({ quantity })
      .eq("id", (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("shop_daily_limits").insert({
      user_id: userId,
      item_id: itemId,
      date_key: dateKey,
      quantity,
    });
    if (error) throw error;
  }
}

export async function findMyOrders(
  userId: string,
  limit: number = 20,
): Promise<ShopOrderRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ShopOrderRow[];
}
