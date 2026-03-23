"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import {
  guildAuthInputClass,
  guildAuthPrimaryButtonClass,
} from "@/components/auth/auth-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Hash, Instagram, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerStep1Schema } from "@/lib/validation/register-step1";
import { friendlyAuthErrorMessage } from "@/lib/utils/auth-errors";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instagram, setInstagram] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const parsed = registerStep1Schema.safeParse({
      email,
      password,
      instagram,
      inviteCode: inviteCode.trim() || undefined,
      termsAccepted,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      const first = parsed.error.issues[0]?.message;
      if (first) toast.error(first);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          instagram_handle: parsed.data.instagram,
          ...(parsed.data.inviteCode
            ? { invite_code: parsed.data.inviteCode }
            : {}),
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(
        friendlyAuthErrorMessage(error.message, "註冊失敗，請稍後再試或換一組 Email。"),
      );
      return;
    }

    if (data.session) {
      toast.success("註冊成功，請補上冒險者檔案");
      router.push("/register/profile");
      router.refresh();
      return;
    }

    toast.message("請至信箱完成驗證後再登入", {
      description: "若專案已關閉信箱驗證，請改由管理員檢查 Supabase Auth 設定。",
    });
    router.push("/login");
  }

  return (
    <GuildAuthShell
      title="加入傳奇公會"
      subtitle="註冊後將引導你補上冒險者名冊"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="space-y-2">
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <Input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              className={guildAuthInputClass}
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </div>
          {fieldErrors.email ? (
            <p className="text-xs text-red-300">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <Input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼（至少 6 字，需含英文與數字）"
              aria-label="密碼"
              className={cn(guildAuthInputClass, "pr-12")}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-zinc-900/50 p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/80 hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-violet-500/60"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
            >
              {showPassword ? (
                <EyeOff className="size-4 shrink-0" aria-hidden />
              ) : (
                <Eye className="size-4 shrink-0" aria-hidden />
              )}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="text-xs text-red-300">{fieldErrors.password}</p>
          ) : (
            <p className="text-xs text-zinc-400">
              至少 6 字元，且需同時包含英文字母與數字
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reg-ig"
            className="text-sm font-medium text-zinc-100"
          >
            IG 帳號
          </label>
          <div className="relative">
            <Instagram
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <Input
              id="reg-ig"
              name="instagram"
              type="text"
              autoComplete="username"
              required
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="不含空白，例：oldmoon.guild"
              className={guildAuthInputClass}
              aria-invalid={Boolean(fieldErrors.instagram)}
            />
          </div>
          {fieldErrors.instagram ? (
            <p className="text-xs text-red-300">{fieldErrors.instagram}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reg-invite"
            className="text-sm font-medium text-zinc-100"
          >
            邀請碼（選填）
          </label>
          <div className="relative">
            <Hash
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <Input
              id="reg-invite"
              name="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="目前僅留存紀錄，無額外效果"
              className={guildAuthInputClass}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-950/25 px-3 py-2.5 transition-colors hover:border-violet-400/40 hover:bg-violet-950/35">
          <input
            id="reg-terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-500/60 bg-background accent-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            aria-invalid={Boolean(fieldErrors.termsAccepted)}
          />
          <label htmlFor="reg-terms" className="cursor-pointer text-sm text-zinc-100">
            <span className="font-medium">同意冒險者公會使用條款</span>
            <span className="mt-0.5 block text-xs text-zinc-400">
              必須勾選才能建立誓約帳號
            </span>
          </label>
        </div>
        {fieldErrors.termsAccepted ? (
          <p className="text-xs text-red-300">{fieldErrors.termsAccepted}</p>
        ) : null}

        <Button
          type="submit"
          className={guildAuthPrimaryButtonClass}
          size="lg"
          disabled={loading}
        >
          {loading ? "⏳ 時空連線中..." : "建立帳號"}
        </Button>
      </form>

      <p className="border-t border-white/10 pt-6 text-center text-sm text-zinc-300">
        已有帳號？{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-100 underline decoration-violet-400/80 underline-offset-4 hover:decoration-violet-300"
        >
          回到登入
        </Link>
      </p>
    </GuildAuthShell>
  );
}
