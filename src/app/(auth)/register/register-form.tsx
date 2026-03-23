"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
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
          <label htmlFor="reg-email" className="text-sm font-medium text-foreground">
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
          />
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 字元"
          />
        </div>
        <Button type="submit" className="mt-2 w-full" size="lg" disabled={loading}>
          {loading ? "建立中…" : "建立帳號"}
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
