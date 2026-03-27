"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getMyProfileAction } from "@/services/profile.action";
import { updateMyProfile } from "@/services/profile-update.action";
import { instagramHandleSchema } from "@/lib/validation/instagram-handle";

export default function RegisterPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState<string | null>(null);
  const [inputIg, setInputIg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getMyProfileAction().then((p) => {
      if (cancelled) return;
      const h = p?.instagram_handle?.trim().replace(/^@+/, "") ?? "";
      setHandle(h.length > 0 ? h : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleResubmit() {
    const parsed = instagramHandleSchema.safeParse(inputIg);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "IG 格式不正確");
      return;
    }
    setSubmitting(true);
    try {
      const result = await updateMyProfile({
        instagram_handle: parsed.data,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("已重新提交，請等待審核");
      setHandle(parsed.data.replace(/^@+/, ""));
      setInputIg("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setLogoutPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLogoutPending(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-panel w-full space-y-6 rounded-3xl border border-white/10 px-6 py-10 shadow-xl">
        <div className="mx-auto max-w-xs space-y-3">
          <div className="h-6 animate-pulse rounded-lg bg-zinc-700/60" />
          <div className="h-4 animate-pulse rounded-lg bg-zinc-800/50" />
          <div className="h-20 animate-pulse rounded-xl bg-zinc-800/40" />
        </div>
      </div>
    );
  }

  const hasHandle = Boolean(handle);

  return (
    <div className="glass-panel w-full space-y-6 rounded-3xl border border-white/10 px-6 py-10 text-center shadow-xl">
      {hasHandle ? (
        <>
          <h1 className="font-serif text-xl font-semibold tracking-wide text-zinc-50">
            ⏳ 帳號審核中
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            管理員正在確認您的 Instagram 帳號，審核通過後即可進入公會。
          </p>
          <p className="text-xs text-zinc-500">
            您填寫的帳號：@{handle}
          </p>
        </>
      ) : (
        <>
          <h1 className="font-serif text-xl font-semibold tracking-wide text-zinc-50">
            📋 請重新填寫 IG 帳號
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            您的 IG 帳號審核未通過，請重新填寫後等待審核。
          </p>
          <div className="space-y-2 text-left">
            <label
              htmlFor="pending-ig"
              className="block text-xs font-medium text-zinc-500"
            >
              Instagram（不含 @）
            </label>
            <input
              id="pending-ig"
              type="text"
              value={inputIg}
              onChange={(e) => setInputIg(e.target.value.trimStart())}
              autoComplete="off"
              placeholder="your_handle"
              className="w-full rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleResubmit()}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? "送出中…" : "重新提交"}
          </button>
        </>
      )}

      <button
        type="button"
        disabled={logoutPending}
        onClick={() => void handleLogout()}
        className="text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline disabled:opacity-50"
      >
        {logoutPending ? "登出中…" : "登出"}
      </button>
    </div>
  );
}
