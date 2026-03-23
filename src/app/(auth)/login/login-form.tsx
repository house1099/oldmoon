"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import {
  guildAuthInputClass,
  guildAuthOAuthButtonClass,
  guildAuthPrimaryButtonClass,
} from "@/components/auth/auth-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getSiteOrigin } from "@/lib/app-url";
import { friendlyAuthErrorMessage } from "@/lib/utils/auth-errors";
import { cn } from "@/lib/utils";

const REMEMBER_STORAGE_KEY = "guild-login-remember";
const REMEMBER_EMAIL_KEY = "guild-login-email";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const banned = searchParams.get("error") === "banned";
  const authError = searchParams.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBER_STORAGE_KEY) === "1";
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (remembered && savedEmail) {
        setRememberMe(true);
        setEmail(savedEmail);
      }
    } catch {
      /* private mode / disabled storage */
    }
  }, []);

  async function onGoogleSignIn() {
    setOauthLoading(true);
    const supabase = createClient();
    const origin = getSiteOrigin();
    const next = nextPath.startsWith("/") ? nextPath : "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast.error(
        friendlyAuthErrorMessage(error.message, "Google 登入失敗，請稍後再試。"),
      );
      setOauthLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(friendlyAuthErrorMessage(error.message, "登入失敗，請檢查帳密後再試。"));
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_STORAGE_KEY, "1");
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_STORAGE_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      /* ignore */
    }

    toast.success("登入成功，正在進入公會…");
    router.push(nextPath.startsWith("/") ? nextPath : "/");
    router.refresh();
  }

  return (
    <GuildAuthShell
      title="月老事務所 · 傳奇公會"
      subtitle="以真名與誓約，推開公會大門"
    >
      {banned ? (
        <p
          className="rounded-lg border border-red-500/45 bg-red-950/40 px-3 py-2 text-sm text-zinc-100"
          role="alert"
        >
          你的帳號已被放逐，無法進入公會。如有疑問請聯絡管理員。
        </p>
      ) : null}
      {authError ? (
        <p
          className="rounded-lg border border-amber-500/40 bg-amber-950/35 px-3 py-2 text-sm text-zinc-100"
          role="alert"
        >
          第三方登入未完成或已取消，請再試一次。
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <Button
          type="button"
          size="lg"
          className={cn(
            guildAuthOAuthButtonClass,
            "disabled:opacity-70",
            oauthLoading &&
              "relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:animate-pulse before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          )}
          disabled={loading || oauthLoading}
          onClick={onGoogleSignIn}
        >
          {oauthLoading ? "⏳ 時空連線中..." : "使用 Google 登入"}
        </Button>

        <div className="relative py-0.5 text-center text-xs text-zinc-400">
          <span className="relative z-[1] rounded-md bg-zinc-950/90 px-2 text-zinc-300">
            或使用 Email
          </span>
          <span
            className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-white/15"
            aria-hidden
          />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-100"
            >
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adventurer@example.com"
              className={guildAuthInputClass}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-100"
            >
              密碼
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={guildAuthInputClass}
            />
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-950/25 px-3 py-2.5 transition-colors hover:border-violet-400/40 hover:bg-violet-950/35">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-500/60 bg-background text-violet-600 accent-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            />
            <label htmlFor="remember-me" className="cursor-pointer text-sm text-zinc-100">
              <span className="font-medium">記住我的冒險者身分</span>
              <span className="mt-0.5 block text-xs text-zinc-400">
                僅在此裝置記住 Email，密碼不會被儲存
              </span>
            </label>
          </div>
          <Button
            type="submit"
            className={cn(
              guildAuthPrimaryButtonClass,
              loading &&
                "relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:animate-pulse before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
            )}
            size="lg"
            disabled={loading || oauthLoading}
          >
            {loading ? "⏳ 時空連線中..." : "進入公會"}
          </Button>
        </form>
      </div>

      <p className="border-t border-white/10 pt-6 text-center text-sm text-zinc-300">
        尚未成為冒險者？{" "}
        <Link
          href="/register"
          className="font-medium text-zinc-100 underline decoration-violet-400/80 underline-offset-4 hover:decoration-violet-300"
        >
          建立帳號
        </Link>
      </p>
    </GuildAuthShell>
  );
}
