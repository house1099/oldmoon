"use client";

import { Bell, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { cn } from "@/lib/utils";

const rowClass =
  "flex w-full items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-left text-zinc-100";

export function PushNotifyGuildRow() {
  const { state, subscribe, vapidConfigured, clearLocalSubscription } =
    usePushSubscription();

  if (!vapidConfigured) {
    return (
      <div
        className={cn(
          rowClass,
          "flex-col items-stretch gap-3 border-violet-500/30 bg-violet-950/30 py-4",
        )}
        role="region"
        aria-label="推播設定說明"
      >
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-950/60 text-violet-200">
            <Info className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-2">
            <p className="font-medium text-zinc-100">推播尚未就緒</p>
            <p className="text-xs leading-relaxed text-zinc-400">
              網站尚未完成推播金鑰設定，因此暫時無法在這台裝置開啟通知。若你是一般會員，請向公會管理員反映；管理員需在主機環境設定{" "}
              <span className="font-mono text-[11px] text-zinc-500">
                NEXT_PUBLIC_VAPID_PUBLIC_KEY
              </span>{" "}
              並重新部署後，此處才會出現「開啟通知」按鈕。
            </p>
            {process.env.NODE_ENV === "development" ? (
              <p className="border-t border-white/10 pt-2 text-xs leading-relaxed text-violet-200/85">
                【本機開發】在專案根目錄{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px]">
                  .env.local
                </code>{" "}
                加入{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px]">
                  NEXT_PUBLIC_VAPID_PUBLIC_KEY
                </code>
                （可執行{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px]">
                  npx web-push generate-vapid-keys
                </code>{" "}
                產生）。儲存後務必<strong className="text-violet-100">重啟</strong>
                <code className="mx-0.5 rounded bg-black/30 px-1 py-0.5 font-mono text-[10px]">
                  npm run dev
                </code>
                ，否則瀏覽器仍拿不到金鑰。
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="space-y-2">
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
        <button
          type="button"
          onClick={() => {
            void clearLocalSubscription().then(() => {
              toast.message("已清除此裝置訂閱，可再次點「開啟通知」");
            });
          }}
          className="w-full text-center text-xs text-zinc-500 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-400"
        >
          在此裝置重新設定推播
        </button>
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
        <span className="font-medium">
          {state === "error" ? "再試一次" : "開啟通知"}
        </span>
      </span>
      <span className="text-xs text-zinc-500">
        {state === "subscribing" ? "設定中…" : "私訊、@、信件"}
      </span>
    </button>
  );
}
