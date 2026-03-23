/**
 * OAuth `redirectTo` 等需絕對 URL；瀏覽器端可省略 env，伺服端建議設定 `NEXT_PUBLIC_APP_URL`。
 */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "http://localhost:3000";
}
