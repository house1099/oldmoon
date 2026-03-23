"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PendingIgRequestRow } from "@/lib/repositories/server/ig-request.repository";
import { reviewIgRequestAction } from "@/services/ig-request.action";
import { cn } from "@/lib/utils";

export function PendingIgRequestsList({
  initial,
}: {
  initial: PendingIgRequestRow[];
}) {
  const router = useRouter();

  async function review(id: string, action: "approved" | "rejected") {
    const r = await reviewIgRequestAction(id, action);
    if (r.ok) {
      toast.success(action === "approved" ? "已核准" : "已拒絕");
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  if (initial.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
        目前沒有待審核的 IG 變更申請
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {initial.map((row) => {
        const nick = row.users?.nickname ?? "（未知）";
        const oldH = row.old_handle ?? "—";
        const created = new Date(row.created_at).toLocaleString("zh-TW");
        return (
          <li
            key={row.id}
            className="glass-panel border border-white/10 p-4 shadow-xl"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-zinc-100">{nick}</p>
                <p className="text-sm text-zinc-400">
                  <span className="text-zinc-500">原：</span>@{oldH}
                  <span className="mx-2 text-zinc-600">→</span>
                  <span className="text-violet-200">@{row.new_handle}</span>
                </p>
                <p className="text-xs text-zinc-500">申請時間：{created}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void review(row.id, "approved")}
                  className={cn(
                    "rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200",
                    "transition hover:bg-emerald-500/25 active:scale-95",
                  )}
                >
                  ✅ 核准
                </button>
                <button
                  type="button"
                  onClick={() => void review(row.id, "rejected")}
                  className={cn(
                    "rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200",
                    "transition hover:bg-red-500/20 active:scale-95",
                  )}
                >
                  ❌ 拒絕
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
