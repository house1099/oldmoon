import type { TavernMessageDto } from "@/types/database.types";

/**
 * 與 {@link renderTavernMessageText}、客戶端舊版邏輯一致：`@` 後接不含空白與 `@` 的一段視為暱稱片段。
 * 每次掃描請使用新實例，避免 `g` 正則 `lastIndex` 殘留。
 */
export function createTavernMentionNickRegex(): RegExp {
  return /@([^\s@]+)/g;
}

/**
 * 以目前訊息串出現過的作者暱稱對應 `user_id`。
 * 迭代順序須與前端 `messages` 陣列一致（`findTavernMessages` 為時間升冪＝舊→新）；
 * **同暱稱則後蓋前**（較新訊息的作者勝出）。
 */
export function buildTavernNicknameToUserId(
  messages: TavernMessageDto[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of messages) {
    const n = row.user.nickname?.trim();
    if (n) map.set(n, row.user_id);
  }
  return map;
}

/**
 * 從內容中抽出「可解析的 @ 提及」對應的使用者 id（與前端可點擊 @ 條件一致：暱稱須出現在 `nicknameToUserId`）。
 * 同一使用者多次被 @ 只保留一筆；順序為文中首次出現順序。
 */
export function extractTavernMentionedUserIds(
  content: string,
  nicknameToUserId: Map<string, string>,
  options?: { excludeUserId?: string },
): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const re = createTavernMentionNickRegex();
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    const nick = m[1]!;
    const uid = nicknameToUserId.get(nick);
    if (!uid) continue;
    if (options?.excludeUserId && uid === options.excludeUserId) continue;
    if (seen.has(uid)) continue;
    seen.add(uid);
    out.push(uid);
  }
  return out;
}
