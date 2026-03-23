"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getSiteOrigin } from "@/lib/app-url";
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
      toast.error(error.message || "Google 登入失敗");
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
      toast.error(error.message || "登入失敗");
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
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          你的帳號已被放逐，無法進入公會。如有疑問請聯絡管理員。
        </p>
      ) : null}
      {authError ? (
        <p
          className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          role="alert"
        >
          第三方登入未完成或已取消，請再試一次。
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <Button
          type="button"
          size="lg"
          className={cn(
            "w-full border-0 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.35)] hover:from-orange-400 hover:via-orange-500 hover:to-red-500 hover:text-white disabled:opacity-70",
            oauthLoading &&
              "relative overflow-hidden shadow-[0_0_28px_rgba(234,88,12,0.5)] before:pointer-events-none before:absolute before:inset-0 before:animate-pulse before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
          )}
          disabled={loading || oauthLoading}
          onClick={onGoogleSignIn}
        >
          {oauthLoading ? "⏳ 時空連線中..." : "使用 Google 登入"}
        </Button>

        <div className="relative py-1 text-center text-xs text-muted-foreground">
          <span className="relative z-[1] bg-card px-2">或使用 Email</span>
          <span
            className="absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-border"
            aria-hidden
          />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
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
              className="guild-energy-focus"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
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
              className="guild-energy-focus"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-2.5 text-sm text-foreground transition-colors hover:border-violet-400/35 hover:bg-violet-950/30">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-500/60 bg-background text-violet-600 accent-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            />
            <span>
              <span className="font-medium">[v] 記住我的冒險者身分</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                僅在此裝置記住 Email，密碼不會被儲存
              </span>
            </span>
          </label>
          <Button
            type="submit"
            className={cn(
              "mt-2 w-full",
              loading &&
                "relative overflow-hidden shadow-[0_0_24px_rgba(139,92,246,0.35)] before:pointer-events-none before:absolute before:inset-0 before:animate-pulse before:bg-gradient-to-r before:from-transparent before:via-violet-200/10 before:to-transparent",
            )}
            size="lg"
            disabled={loading || oauthLoading}
          >
            {loading ? "⏳ 時空連線中..." : "進入公會"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        尚未成為冒險者？{" "}
        <Link
          href="/register"
          className="font-medium text-violet-300 underline-offset-4 hover:text-violet-200 hover:underline"
        >
          建立帳號
        </Link>
      </p>
    </GuildAuthShell>
  );
}
