import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type ExpLogRow = Database["public"]["Tables"]["exp_logs"]["Row"];

/**
 * 寫入 exp_logs：**`delta`**／**`delta_exp`** 預設 **1**（簽到），避免雲端 **`delta`** NOT NULL（23502）。
 * 其他來源可於呼叫端覆寫。
 */
export type ExpLogInsertPayload = Pick<
  Database["public"]["Tables"]["exp_logs"]["Insert"],
  "user_id" | "unique_key" | "source"
> & {
  delta?: number;
  delta_exp?: number;
};

/** 與 Postgres `23505` unique_violation 對應之業務訊息（Layer 3 可再包裝） */
export const DUPLICATE_EXP_REWARD_MESSAGE = "你已經領取過這份獎勵了喵！";

export class DuplicateExpRewardError extends Error {
  readonly code = "DUPLICATE_REWARD" as const;

  constructor(message: string = DUPLICATE_EXP_REWARD_MESSAGE) {
    super(message);
    this.name = "DuplicateExpRewardError";
  }
}

/** Postgres unique_violation（23505）或等效訊息；Layer 3 簽到等可重用。 */
export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "23505") return true;
  if (typeof e.message === "string" && e.message.includes("23505")) return true;
  if (
    typeof e.message === "string" &&
    e.message.includes("duplicate key") &&
    e.message.includes("unique")
  ) {
    return true;
  }
  return false;
}

/**
 * Layer 2：寫入 exp_logs（admin client）。
 * 若觸發 unique_key 衝突（重複領獎），拋出 {@link DuplicateExpRewardError}。
 */
function logSupabaseError(context: string, error: unknown) {
  console.error(`❌ ${context} — raw error:`, error);
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    console.error(`❌ ${context} — keys:`, Object.keys(o));
    console.error(
      `❌ ${context} — serialized:`,
      JSON.stringify(error, Object.getOwnPropertyNames(error as object)),
    );
  }
}

/**
 * 該使用者在台北曆日 **`dayTaipeiYmd`**（`YYYY-MM-DD`）是否已有簽到列。
 * 以 **`unique_key === daily_checkin:{day}:{userId}`** 精準比對，與 DB UNIQUE 索引一致。
 */
export async function findDailyCheckinForUserOnTaipeiDay(
  userId: string,
  dayTaipeiYmd: string,
): Promise<ExpLogRow | null> {
  const unique_key = `daily_checkin:${dayTaipeiYmd}:${userId}`;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exp_logs")
    .select("*")
    .eq("unique_key", unique_key)
    .eq("source", "daily_checkin")
    .maybeSingle();

  if (error) {
    logSupabaseError("findDailyCheckinForUserOnTaipeiDay", error);
    throw error;
  }

  return (data as ExpLogRow) ?? null;
}

export async function insertExpLog(
  data: ExpLogInsertPayload,
): Promise<ExpLogRow> {
  const delta = data.delta ?? 1;
  const delta_exp = data.delta_exp ?? 1;
  const payload = {
    user_id: data.user_id,
    unique_key: data.unique_key,
    source: data.source,
    delta,
    delta_exp,
  };
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("exp_logs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    logSupabaseError("insertExpLog", error);
    if (isUniqueConstraintError(error)) {
      throw new DuplicateExpRewardError();
    }
    throw error;
  }

  return row as ExpLogRow;
}
