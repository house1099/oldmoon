import { createAdminClient } from "@/lib/supabase/admin";
import type { CoinTransactionRow, UserRow } from "@/types/database.types";

const PAGE_SIZE = 20;

export async function getCoinBalance(userId: string): Promise<{
  premium_coins: number;
  free_coins: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("premium_coins, free_coins")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as { premium_coins: number; free_coins: number } | null;
  return {
    premium_coins: row?.premium_coins ?? 0,
    free_coins: row?.free_coins ?? 0,
  };
}

export async function creditCoins(params: {
  userId: string;
  coinType: "premium" | "free";
  amount: number;
  source: CoinTransactionRow["source"];
  referenceId?: string;
  note?: string;
  operatorId?: string;
}): Promise<{ success: boolean; balanceAfter: number; error?: string }> {
  const admin = createAdminClient();

  const { data: userRow, error: readErr } = await admin
    .from("users")
    .select("premium_coins, free_coins")
    .eq("id", params.userId)
    .maybeSingle();
  if (readErr) throw readErr;

  const u = userRow as { premium_coins: number; free_coins: number } | null;
  const current =
    params.coinType === "premium"
      ? (u?.premium_coins ?? 0)
      : (u?.free_coins ?? 0);
  const newBalance = current + params.amount;
  if (newBalance < 0) {
    return { success: false, balanceAfter: current, error: "餘額不足" };
  }

  const patch =
    params.coinType === "premium"
      ? { premium_coins: newBalance }
      : { free_coins: newBalance };

  const { error: updErr } = await admin
    .from("users")
    .update(patch)
    .eq("id", params.userId);
  if (updErr) throw updErr;

  const { error: insErr } = await admin.from("coin_transactions").insert({
    user_id: params.userId,
    coin_type: params.coinType,
    amount: params.amount,
    balance_after: newBalance,
    source: params.source,
    reference_id: params.referenceId ?? null,
    note: params.note ?? null,
    operator_id: params.operatorId ?? null,
  });
  if (insErr) throw insErr;

  return { success: true, balanceAfter: newBalance };
}

export async function spendCoins(params: {
  userId: string;
  amount: number;
  source: "shop_purchase";
  referenceId?: string;
  note?: string;
}): Promise<{
  success: boolean;
  freeCoinsUsed: number;
  premiumCoinsUsed: number;
  error?: string;
}> {
  if (params.amount <= 0) {
    return {
      success: false,
      freeCoinsUsed: 0,
      premiumCoinsUsed: 0,
      error: "金額無效",
    };
  }

  const balance = await getCoinBalance(params.userId);
  const freeUsed = Math.min(balance.free_coins, params.amount);
  const rest = params.amount - freeUsed;
  const premiumUsed = Math.min(balance.premium_coins, rest);
  if (freeUsed + premiumUsed < params.amount) {
    return {
      success: false,
      freeCoinsUsed: 0,
      premiumCoinsUsed: 0,
      error: "金幣不足",
    };
  }

  if (freeUsed > 0) {
    const r = await creditCoins({
      userId: params.userId,
      coinType: "free",
      amount: -freeUsed,
      source: params.source,
      referenceId: params.referenceId,
      note: params.note,
    });
    if (!r.success) {
      return {
        success: false,
        freeCoinsUsed: 0,
        premiumCoinsUsed: 0,
        error: r.error ?? "金幣不足",
      };
    }
  }

  if (premiumUsed > 0) {
    const r = await creditCoins({
      userId: params.userId,
      coinType: "premium",
      amount: -premiumUsed,
      source: params.source,
      referenceId: params.referenceId,
      note: params.note,
    });
    if (!r.success) {
      return {
        success: false,
        freeCoinsUsed: freeUsed,
        premiumCoinsUsed: 0,
        error: r.error ?? "金幣不足",
      };
    }
  }

  return {
    success: true,
    freeCoinsUsed: freeUsed,
    premiumCoinsUsed: premiumUsed,
  };
}

export async function convertFreeToPremium(params: {
  userId: string;
  freeAmount: number;
  rate: number;
}): Promise<{
  success: boolean;
  premiumCoinsAdded: number;
  freeCoinsDeducted: number;
  error?: string;
}> {
  if (params.freeAmount <= 0 || !Number.isFinite(params.rate) || params.rate <= 0) {
    return {
      success: false,
      premiumCoinsAdded: 0,
      freeCoinsDeducted: 0,
      error: "參數無效",
    };
  }

  const premiumCoinsAdded = Math.floor(params.freeAmount * params.rate);
  if (premiumCoinsAdded < 1) {
    return {
      success: false,
      premiumCoinsAdded: 0,
      freeCoinsDeducted: 0,
      error: "兌換後付費幣不足 1，請提高數量",
    };
  }

  const out = await creditCoins({
    userId: params.userId,
    coinType: "free",
    amount: -params.freeAmount,
    source: "convert_out",
  });
  if (!out.success) {
    return {
      success: false,
      premiumCoinsAdded: 0,
      freeCoinsDeducted: 0,
      error: out.error,
    };
  }

  const inn = await creditCoins({
    userId: params.userId,
    coinType: "premium",
    amount: premiumCoinsAdded,
    source: "convert_in",
  });
  if (!inn.success) {
    await creditCoins({
      userId: params.userId,
      coinType: "free",
      amount: params.freeAmount,
      source: "refund",
      note: "convert rollback",
    });
    return {
      success: false,
      premiumCoinsAdded: 0,
      freeCoinsDeducted: 0,
      error: inn.error ?? "兌換失敗",
    };
  }

  return {
    success: true,
    premiumCoinsAdded,
    freeCoinsDeducted: params.freeAmount,
  };
}

export async function findCoinTransactions(
  userId: string,
  params: { page?: number; coinType?: "premium" | "free" },
): Promise<{ transactions: CoinTransactionRow[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = admin
    .from("coin_transactions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.coinType) {
    q = q.eq("coin_type", params.coinType);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    transactions: (data ?? []) as CoinTransactionRow[],
    total: count ?? 0,
  };
}

export async function getCoinStats(): Promise<{
  totalPremiumCoins: number;
  totalFreeCoins: number;
  totalUsers: number;
  totalTopupAmount: number;
  totalPaidOrders: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_coin_stats");
  if (error) throw error;
  return data as {
    totalPremiumCoins: number;
    totalFreeCoins: number;
    totalUsers: number;
    totalTopupAmount: number;
    totalPaidOrders: number;
  };
}

export async function findUsersWithCoins(params: {
  search?: string;
  page?: number;
}): Promise<{
  users: (UserRow & { premium_coins: number; free_coins: number })[];
  total: number;
}> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = admin
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.search?.trim()) {
    q = q.ilike("nickname", `%${params.search.trim()}%`);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    users: (data ?? []) as (UserRow & {
      premium_coins: number;
      free_coins: number;
    })[],
    total: count ?? 0,
  };
}
