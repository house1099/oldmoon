/** 與後台 `tavern_message_max_length` 一致；超過硬上限仍以硬上限為準（與 `sendTavernMessageAction` 相同）。 */
export const TAVERN_MESSAGE_HARD_CAP = 500;
export const TAVERN_MESSAGE_DEFAULT_MAX = 50;

export function resolveTavernMessageMaxLength(raw: string | null): number {
  const n = parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return TAVERN_MESSAGE_DEFAULT_MAX;
  return Math.min(n, TAVERN_MESSAGE_HARD_CAP);
}
