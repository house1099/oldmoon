import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type ExpLogInsert = Database["public"]["Tables"]["exp_logs"]["Insert"];
export type ExpLogRow = Database["public"]["Tables"]["exp_logs"]["Row"];

/** 與 Postgres `23505` unique_violation 對應之業務訊息（Layer 3 可再包裝） */
export const DUPLICATE_EXP_REWARD_MESSAGE = "你已經領取過這份獎勵了喵！";

export class DuplicateExpRewardError extends Error {
  readonly code = "DUPLICATE_REWARD" as const;

  constructor(message: string = DUPLICATE_EXP_REWARD_MESSAGE) {
    super(message);
    this.name = "DuplicateExpRewardError";
  }
}

function isUniqueViolation(error: unknown): boolean {
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
export async function insertExpLog(data: ExpLogInsert): Promise<ExpLogRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("exp_logs")
    .insert(data)
    .select()
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateExpRewardError();
    }
    throw error;
  }

  return row as ExpLogRow;
}
