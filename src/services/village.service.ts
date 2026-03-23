import {
  findActiveUsers,
  findProfileById,
} from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";

function normalizeInterests(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  return raw.filter(Boolean);
}

function interestOverlapCount(
  mySet: Set<string>,
  other: string[] | null | undefined,
): number {
  if (!other?.length) return 0;
  let n = 0;
  for (const x of other) {
    if (mySet.has(x)) n += 1;
  }
  return n;
}

/** 最活躍在前；`null` 視為最舊，排在後面 */
function compareLastSeenDesc(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const ta = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY;
  const tb = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY;
  return tb - ta;
}

/**
 * Layer 3：興趣村莊 — 取得其他活躍冒險者，並依**與自己的興趣重疊數**優先排序，
 * 同分再依 **`last_seen_at`**（與 Repository 初始順序一致）。
 */
export async function getVillageUsers(
  currentUserId: string,
): Promise<UserRow[]> {
  const [rows, me] = await Promise.all([
    findActiveUsers(currentUserId),
    findProfileById(currentUserId),
  ]);

  const mySet = new Set(normalizeInterests(me?.interests));

  return [...rows].sort((a, b) => {
    const overlapA = interestOverlapCount(mySet, a.interests);
    const overlapB = interestOverlapCount(mySet, b.interests);
    if (overlapB !== overlapA) return overlapB - overlapA;
    return compareLastSeenDesc(a.last_seen_at, b.last_seen_at);
  });
}
