"use server";

import { createClient } from "@/lib/supabase/server";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import {
  getCoinBalance,
  findCoinTransactions,
  convertFreeToPremium,
} from "@/lib/repositories/server/coin.repository";

export async function getMyCoinsAction(): Promise<{
  premium_coins: number;
  free_coins: number;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { premium_coins: 0, free_coins: 0 };
  }
  return getCoinBalance(user.id);
}

export async function getMyCoinTransactionsAction(
  page: number,
  coinType?: "premium" | "free",
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { transactions: [], total: 0 };
  }
  return findCoinTransactions(user.id, { page, coinType });
}

export async function getFreeToPremiumRateAction(): Promise<number> {
  const raw = await findSystemSettingByKey("free_to_premium_rate");
  const n = raw ? parseFloat(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return 0.01;
  return n;
}

export async function convertMyCoinsAction(
  freeAmount: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "請先登入" };
  }
  if (!Number.isInteger(freeAmount) || freeAmount < 10) {
    return { success: false, error: "最少兌換 10 免費幣" };
  }

  const raw = await findSystemSettingByKey("free_to_premium_rate");
  const rate = raw ? parseFloat(raw) : NaN;
  if (!Number.isFinite(rate) || rate <= 0) {
    return { success: false, error: "系統轉換率未設定" };
  }

  const result = await convertFreeToPremium({
    userId: user.id,
    freeAmount,
    rate,
  });
  if (!result.success) {
    return { success: false, error: result.error ?? "兌換失敗" };
  }
  return { success: true };
}
