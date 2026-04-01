"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SWR_KEYS } from "@/lib/swr/keys";
import { cn } from "@/lib/utils";
import {
  collectFishAction,
  getFishingStatusAction,
  type CollectFishResult,
  type FishingStatusDto,
} from "@/services/fishing.action";

type LogEntry = { id: string; text: string; at: string };

export function FishingPanel() {
  const { data: status } = useSWR<FishingStatusDto>(
    SWR_KEYS.fishingStatus,
    getFishingStatusAction,
    { refreshInterval: 10_000, revalidateOnFocus: true },
  );

  const [uiPhase, setUiPhase] = useState<
    "idle" | "casting" | "reeling"
  >("idle");
  const [resultOpen, setResultOpen] = useState(false);
  const [lastResult, setLastResult] = useState<CollectFishResult | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const castTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (castTimerRef.current) clearTimeout(castTimerRef.current);
    };
  }, []);

  const phase = status?.phase ?? "no_rod";

  const appendLog = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const at = new Date().toLocaleString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogEntries((prev) => [{ id, text, at }, ...prev].slice(0, 30));
  }, []);

  const runCollect = useCallback(async () => {
    setUiPhase("reeling");
    try {
      const res = await collectFishAction();
      setLastResult(res);
      setResultOpen(true);
      void swrMutate(SWR_KEYS.fishingStatus);
      if (res.ok) {
        if (res.noMatchFound) {
          appendLog("緣分不足，未釣到月老魚");
        } else if (res.matchmakerUser) {
          appendLog(
            `釣到月老魚：${res.matchmakerUser.nickname}（+${res.fishCoins ?? 0} 幣 / +${res.fishExp ?? 0} EXP）`,
          );
        }
      } else {
        appendLog(`失敗：${res.error}`);
      }
    } finally {
      setUiPhase("idle");
    }
  }, [appendLog]);

  const handleCast = useCallback(() => {
    if (phase !== "can_cast" || uiPhase !== "idle") return;
    setUiPhase("casting");
    if (castTimerRef.current) clearTimeout(castTimerRef.current);
    castTimerRef.current = setTimeout(() => {
      castTimerRef.current = null;
      void runCollect();
    }, 2200);
  }, [phase, uiPhase, runCollect]);

  return (
    <div className="space-y-6 pb-6">
      <div className="glass-panel rounded-2xl border border-white/10 p-6 text-center">
        {phase === "no_rod" ? (
          <>
            <p className="text-4xl" aria-hidden>
              🎣
            </p>
            <p className="mt-3 text-sm text-zinc-300">尚未持有釣竿</p>
            <p className="mt-1 text-xs text-zinc-500">
              請至商店購買釣竿後再來命運之湖
            </p>
          </>
        ) : phase === "no_bait" ? (
          <>
            <p className="text-4xl" aria-hidden>
              🪱
            </p>
            <p className="mt-3 text-sm text-zinc-300">沒有釣餌</p>
            <p className="mt-1 text-xs text-zinc-500">
              請至商店購買釣餌後再拋竿
            </p>
          </>
        ) : uiPhase === "casting" || uiPhase === "reeling" ? (
          <>
            <div
              className={cn(
                "mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-violet-500/40 bg-violet-950/40",
                uiPhase === "casting" && "animate-pulse",
              )}
            >
              <span className="text-5xl" aria-hidden>
                🌊
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-violet-200">
              {uiPhase === "casting" ? "等待上鉤…" : "收線中…"}
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl" aria-hidden>
              💧
            </p>
            <p className="mt-3 text-sm text-zinc-300">命運之湖平靜如鏡</p>
            <Button
              type="button"
              className="mt-5 rounded-full bg-violet-600 px-8 py-6 text-base font-semibold"
              onClick={handleCast}
            >
              拋竿釣魚
            </Button>
            <p className="mt-3 text-xs text-zinc-500">
              每次消耗 1 個釣餌；釣竿可重複使用
            </p>
          </>
        )}
      </div>

      <details className="group rounded-xl border border-white/10 bg-zinc-900/30 px-2 open:pb-2">
        <summary className="cursor-pointer list-none px-2 py-3 text-sm font-medium text-zinc-200 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="inline-flex w-full items-center justify-between">
            🎣 釣魚日誌
            <span className="text-zinc-500 transition group-open:rotate-180">▼</span>
          </span>
        </summary>
        <div className="px-2 pb-3">
          {logEntries.length === 0 ? (
            <p className="text-center text-xs text-zinc-500">尚無紀錄</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto text-left text-xs text-zinc-400">
              {logEntries.map((e) => (
                <li key={e.id} className="flex gap-2 border-b border-white/5 pb-2">
                  <span className="shrink-0 text-zinc-600">{e.at}</span>
                  <span className="text-zinc-300">{e.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="border border-zinc-700 bg-zinc-950 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {lastResult && lastResult.ok && lastResult.noMatchFound
                ? "月老魚"
                : "釣獲結果"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-center text-sm">
            {lastResult && !lastResult.ok ? (
              <p className="text-rose-300">{lastResult.error}</p>
            ) : null}
            {lastResult && lastResult.ok && lastResult.noMatchFound ? (
              <p className="text-zinc-200">
                目前緣分不夠，未釣到月老魚 💔
              </p>
            ) : null}
            {lastResult && lastResult.ok && lastResult.matchmakerUser ? (
              <>
                <p className="text-lg font-semibold text-white">
                  {lastResult.matchmakerUser.nickname}
                </p>
                <p className="text-zinc-400">
                  探險幣 +{lastResult.fishCoins ?? 0} · EXP +
                  {lastResult.fishExp ?? 0}
                </p>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="w-full rounded-full bg-violet-600"
              onClick={() => setResultOpen(false)}
            >
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
