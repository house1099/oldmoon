/**
 * Layer 4／Utils：暱稱等欄位用的不雅字範例清單（可隨產品政策擴充）。
 * 比對時請一律正規化大小寫（見 `adventurerNicknameSchema`）。
 */
export const FORBIDDEN_WORDS: readonly string[] = [
  "幹",
  "白痴",
  "垃圾",
  "笨蛋",
  "去死",
  "幹你",
  "媽的",
  "王八蛋",
  "智障",
  "廢物",
] as const;
