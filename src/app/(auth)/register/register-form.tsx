"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { registerStep1Schema } from "@/lib/validation/register-step1";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instagram, setInstagram] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
      toast.error(error.message || "註冊失敗");
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
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <label
            htmlFor="reg-email"
            className="text-sm font-medium text-foreground"
          >
            Email
          </label>
          <Input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="adventurer@example.com"
            className="guild-energy-focus"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reg-password"
            className="text-sm font-medium text-foreground"
          >
            密碼
          </label>
          <Input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 字，需含英文與數字"
            className="guild-energy-focus"
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password ? (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              至少 6 字元，且需同時包含英文字母與數字
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reg-ig"
            className="text-sm font-medium text-foreground"
          >
            IG 帳號
          </label>
          <Input
            id="reg-ig"
            name="instagram"
            type="text"
            autoComplete="username"
            required
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="不含空白，例：oldmoon.guild"
            className="guild-energy-focus"
            aria-invalid={Boolean(fieldErrors.instagram)}
          />
          {fieldErrors.instagram ? (
            <p className="text-xs text-destructive">{fieldErrors.instagram}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reg-invite"
            className="text-sm font-medium text-foreground"
          >
            邀請碼（選填）
          </label>
          <Input
            id="reg-invite"
            name="inviteCode"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="目前僅留存紀錄，無額外效果"
            className="guild-energy-focus"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-2.5 text-sm text-foreground transition-colors hover:border-violet-400/35 hover:bg-violet-950/30">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-500/60 bg-background accent-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            aria-invalid={Boolean(fieldErrors.termsAccepted)}
          />
          <span>
            <span className="font-medium">同意冒險者公會使用條款</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              必須勾選才能建立誓約帳號
            </span>
          </span>
        </label>
        {fieldErrors.termsAccepted ? (
          <p className="text-xs text-destructive">{fieldErrors.termsAccepted}</p>
        ) : null}

        <Button
          type="submit"
          className="mt-2 w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? "⏳ 時空連線中..." : "建立帳號"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        已有帳號？{" "}
        <Link
          href="/login"
          className="font-medium text-violet-300 underline-offset-4 hover:text-violet-200 hover:underline"
        >
          回到登入
        </Link>
      </p>
    </GuildAuthShell>
  );
}
