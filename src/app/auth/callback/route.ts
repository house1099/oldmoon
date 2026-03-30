import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth 成功後導向目標頁並觸發公會大門過場 */
function withGuildEntranceFlag(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const q = normalized.indexOf("?");
  if (q === -1) return `${normalized}?guild_entrance=1`;
  const pathPart = normalized.slice(0, q);
  const qs = new URLSearchParams(normalized.slice(q + 1));
  qs.set("guild_entrance", "1");
  return `${pathPart}?${qs.toString()}`;
}

/**
 * Supabase Auth（含 Google OAuth）PKCE 回呼：交換 code → 寫入 session cookie。
 * Supabase Dashboard 請將 Redirect URL 設為 `{NEXT_PUBLIC_APP_URL}/auth/callback`。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return NextResponse.redirect(`${origin}${withGuildEntranceFlag(next)}`);
}
