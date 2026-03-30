"use client";

import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { cn } from "@/lib/utils";

const rowClass =
  "flex w-full items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-left text-zinc-100";

export function PushNotifyGuildRow() {
  const { state, subscribe } = usePushSubscription();

  if (state === "subscribed") {
    return (
      <div
        className={cn(rowClass, "border-emerald-500/20 bg-emerald-950/20")}
        role="status"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-950/50 text-emerald-200">
            <Check className="size-5" aria-hidden />
          </span>
          <span className="font-medium text-emerald-100">已開啟推播通知</span>
        </span>
        <span className="text-xs text-emerald-200/70">私訊、@、信件</span>
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <div className={cn(rowClass, "text-zinc-400")} role="status">
        <span className="text-sm">此裝置或瀏覽器不支援推播</span>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className={cn(rowClass, "border-amber-500/15")} role="status">
        <span className="text-sm text-amber-100/90">
          通知權限已關閉，請至系統或瀏覽器設定開啟後再試
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void subscribe().then((r) => {
          if (r.message) {
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          }
        });
      }}
      disabled={state === "subscribing"}
      className={cn(
        rowClass,
        "mb-0 transition hover:border-violet-500/25 hover:bg-zinc-900/70",
        state === "subscribing" && "pointer-events-none opacity-70",
      )}
    >
      <span className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-950/40 text-amber-200">
          <Bell className="size-5" aria-hidden />
        </span>
        <span className="font-medium">開啟通知</span>
      </span>
      <span className="text-xs text-zinc-500">
        {state === "subscribing" ? "設定中…" : "私訊、@、信件"}
      </span>
    </button>
  );
}
