/**
 * 將連線／Auth 錯誤訊息改為可讀提示，避免把 DB constraint 等技術內容直接顯示給使用者。
 */
export function friendlyAuthErrorMessage(
  raw: string | undefined | null,
  fallback: string,
): string {
  const msg = raw?.trim() ?? "";
  if (!msg) return fallback;

  if (
    /23505|unique constraint|duplicate key|violates unique|already (registered|exists)/i.test(
      msg,
    )
  ) {
    return "這組資料可能已被使用，請換一組再試。";
  }

  if (
    /constraint|violates foreign key|foreign key constraint|check constraint|not-null violation/i.test(
      msg,
    )
  ) {
    return "資料不符合公會規則，請檢查輸入後再試。";
  }

  if (msg.length > 180) return fallback;
  return msg;
}
