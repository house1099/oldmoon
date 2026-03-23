import {
  findMarketUsers,
  findProfileById,
} from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";

function normalizeTags(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  return Array.from(new Set(raw.filter(Boolean)));
}

/**
 * 由使用者列推算「技能市集」語意下的**可提供的**標籤。
 * v1：雲端尚無獨立 `skills_offered` 時，使用 **`interests`**。
 */
export function marketOffersFromUser(user: UserRow): string[] {
  return normalizeTags(user.interests);
}

/**
 * 由使用者列推算「技能市集」語意下的**想尋找的**標籤。
 * v1：與 {@link marketOffersFromUser} 同源（同一批興趣／技能標籤）；日後可改讀獨立欄位。
 */
export function marketWantsFromUser(user: UserRow): string[] {
  return normalizeTags(user.interests);
}

function intersectNonEmpty(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  return a.some((x) => setB.has(x));
}

/**
 * 完美匹配：(**我想要的** ∩ **他提供的**) 與 (**他想要的** ∩ **我提供的**) 皆不為空。
 */
export function evaluatePerfectMatch(
  currentUser: UserRow,
  targetUser: UserRow,
): { isPerfectMatch: boolean } {
  const myWants = marketWantsFromUser(currentUser);
  const myOffers = marketOffersFromUser(currentUser);
  const theirWants = marketWantsFromUser(targetUser);
  const theirOffers = marketOffersFromUser(targetUser);

  const isPerfectMatch =
    intersectNonEmpty(myWants, theirOffers) &&
    intersectNonEmpty(theirWants, myOffers);

  return { isPerfectMatch };
}

function compareLastSeenDesc(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const ta = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY;
  const tb = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY;
  return tb - ta;
}

export type MarketUserEntry = {
  user: UserRow;
  isPerfectMatch: boolean;
};

/**
 * Layer 3：技能市集 — 活躍冒險者清單與 **Perfect Match** 旗標。
 * 排序：**完美匹配在前**，其餘依 **`last_seen_at`** 新到舊。
 */
export async function getMarketUsers(
  currentUserId: string,
): Promise<MarketUserEntry[]> {
  const [rows, me] = await Promise.all([
    findMarketUsers(currentUserId),
    findProfileById(currentUserId),
  ]);

  const entries: MarketUserEntry[] = rows.map((user) => {
    if (!me) {
      return { user, isPerfectMatch: false };
    }
    return { user, ...evaluatePerfectMatch(me, user) };
  });

  return entries.sort((a, b) => {
    if (a.isPerfectMatch !== b.isPerfectMatch) {
      return a.isPerfectMatch ? -1 : 1;
    }
    return compareLastSeenDesc(a.user.last_seen_at, b.user.last_seen_at);
  });
}
