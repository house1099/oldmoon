"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Hash } from "lucide-react";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import { guildAuthPrimaryButtonClass } from "@/components/auth/auth-styles";
import LoadingButton from "@/components/ui/LoadingButton";
import { createClient } from "@/lib/supabase/client";
import {
  saveInviteCodeToMetadataAction,
  validateInvitationCodeAction,
} from "@/services/invitation.action";

export default function RegisterInvitePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("請輸入邀請碼");
      return;
    }

    const upper = trimmed.toUpperCase();
    setBusy(true);
    try {
      const check = await validateInvitationCodeAction(upper);
      if (!check.valid) {
        toast.error("邀請碼無效或已過期");
        return;
      }

      const saved = await saveInviteCodeToMetadataAction(upper);
      if (!saved.ok) {
        toast.error(saved.error ?? "無法儲存邀請碼，請稍後再試");
        return;
      }

      router.push("/register/profile");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      <GuildAuthShell
        title="輸入邀請碼"
        subtitle="加入傳奇公會需要有效的邀請碼"
      >
        <div className="relative">
          <Hash
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="oauth-invite-code"
            name="inviteCode"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/\s/g, ""))
            }
            placeholder="邀請碼"
            className="w-full rounded-full border border-white/10 bg-zinc-900/50 py-4 pl-11 pr-4 text-base uppercase tracking-wider text-white placeholder:text-zinc-600 transition-colors focus:border-white/30 focus:outline-none"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
        </div>

        <LoadingButton
          className={guildAuthPrimaryButtonClass}
          loading={busy}
          loadingText="驗證中…"
          onClick={() => void handleSubmit()}
        >
          驗證並繼續
        </LoadingButton>

        <p className="border-t border-white/10 pt-6 text-center">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-4 transition-colors hover:text-zinc-200"
          >
            登出
          </button>
          <span className="mt-1 block text-xs text-zinc-500">
            若想改以其他帳號登入
          </span>
        </p>
      </GuildAuthShell>

      <p className="mt-6 text-center text-sm text-zinc-500">
        已有邀請碼於註冊時填寫？{" "}
        <Link
          href="/login"
          className="text-zinc-300 underline decoration-violet-500/60 underline-offset-4 hover:text-white"
        >
          回到登入
        </Link>
      </p>
    </div>
  );
}
