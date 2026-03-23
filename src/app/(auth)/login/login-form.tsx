"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const banned = searchParams.get("error") === "banned";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
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
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
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
          />
        </div>
        <Button type="submit" className="mt-2 w-full" size="lg" disabled={loading}>
          {loading ? "登入中…" : "進入公會"}
        </Button>
      </form>

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
