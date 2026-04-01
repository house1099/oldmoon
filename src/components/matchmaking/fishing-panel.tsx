"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as swrMutate } from "swr";

import { UserDetailModal } from "@/components/modals/UserDetailModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MasterAvatarShell } from "@/components/ui/MasterAvatarShell";
import { SWR_KEYS } from "@/lib/swr/keys";
import { INTEREST_TAG_OPTIONS } from "@/lib/constants/adventurer-questionnaire";
import {
  collectFishAction,
  getFishingStatusAction,
  type CollectFishResult,
  type FishingStatusDto,
} from "@/services/fishing.action";
import { getMemberProfileByIdAction } from "@/services/profile.action";
import type { MemberProfileView } from "@/services/profile.action";

const CAST_MS = 2_200;
/** AlertDialog 文案用（實際等待為 CAST_MS） */
const CAST_COPY_MINUTES = 2;

type UiPhase = "idle" | "casting" | "ready";

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function LakeArea({
  serverPhase,
  uiPhase,
}: {
  serverPhase: FishingStatusDto["phase"];
  uiPhase: UiPhase;
}) {
  const showCasting = uiPhase === "casting";
  const showReady = uiPhase === "ready";

  if (serverPhase === "no_rod" || serverPhase === "no_bait") {
    return (
      <div
        className="relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/40 bg-gradient-to-b from-zinc-900 to-blue-950/40"
        aria-hidden
      >
        <WaveSvg />
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-5xl">🎣</span>
          <span className="mt-1 text-xs text-zinc-400">命運之湖</span>
        </div>
      </div>
    );
  }

  if (showReady) {
    return (
      <div
        className="relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-orange-400/50 bg-gradient-to-b from-zinc-900 to-orange-950/30 animate-pulse"
        aria-hidden
      >
        <WaveSvg />
        <div className="relative z-10 flex flex-col items-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-400 text-3xl shadow-[0_0_24px_rgba(251,146,60,0.35)]">
            ❗
          </span>
          <span className="mt-2 text-sm font-medium text-orange-200">
            有東西上鉤了！
          </span>
        </div>
      </div>
    );
  }

  if (showCasting) {
    return (
      <div
        className="relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/40 bg-gradient-to-b from-zinc-900 to-blue-950/40"
        aria-hidden
      >
        <WaveSvg />
        <div className="relative z-10 flex flex-col items-center rod-sway">
          <span className="text-5xl">🎣</span>
          <span className="mt-1 text-xs font-medium text-orange-400">
            魚竿已拋出…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/40 bg-gradient-to-b from-zinc-900 to-blue-950/40"
      aria-hidden
    >
      <WaveSvg />
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-5xl">🎣</span>
        <span className="mt-1 text-xs text-zinc-300">準備好拋竿了</span>
      </div>
    </div>
  );
}

function WaveSvg() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-90">
      <svg
        className="h-full w-full text-violet-500/25"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,20 Q300,5 600,20 T1200,20 L1200,40 L0,40 Z"
        />
      </svg>
      <svg
        className="absolute inset-x-0 bottom-0 h-10 w-full text-blue-500/20"
        viewBox="0 0 1200 32"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,16 Q400,28 800,16 T1200,16 L1200,32 L0,32 Z"
        />
      </svg>
    </div>
  );
}

function LottiePlaceholder() {
  return (
    <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-zinc-700/40 bg-zinc-900/40">
      <span className="text-xs text-zinc-600">✨ 動畫區（即將更新）</span>
    </div>
  );
}

export function FishingPanel() {
  const router = useRouter();
  const { data: status } = useSWR<FishingStatusDto>(
    SWR_KEYS.fishingStatus,
    getFishingStatusAction,
    { refreshInterval: 10_000, revalidateOnFocus: true },
  );

  const [uiPhase, setUiPhase] = useState<UiPhase>("idle");
  const [castProgress, setCastProgress] = useState(0);
  const [castRemainMs, setCastRemainMs] = useState(CAST_MS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOverlay, setResultOverlay] = useState(false);
  const [fishStep, setFishStep] = useState<"fly" | "detail">("fly");
  const [lastResult, setLastResult] = useState<CollectFishResult | null>(null);
  const [detailUser, setDetailUser] = useState<MemberProfileView | null>(null);
  const [peerExtra, setPeerExtra] = useState<MemberProfileView | null>(null);
  const castTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phase = status?.phase ?? "no_rod";
  const rodName = status?.equippedRodName ?? "命運釣竿";
  const baitName = status?.defaultBaitName ?? "釣餌";
  const remaining = status?.todayRemainingCasts ?? status?.baitCount ?? 0;

  const showLottie =
    (phase === "no_rod" || phase === "no_bait" || phase === "can_cast") &&
    uiPhase === "idle";

  const clearCastTimer = useCallback(() => {
    if (castTimerRef.current) {
      clearInterval(castTimerRef.current);
      castTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCastTimer();
      if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    };
  }, [clearCastTimer]);

  const startCasting = useCallback(() => {
    setUiPhase("casting");
    setCastProgress(0);
    setCastRemainMs(CAST_MS);
    const start = Date.now();
    clearCastTimer();
    castTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / CAST_MS);
      setCastProgress(p);
      setCastRemainMs(Math.max(0, CAST_MS - elapsed));
      if (elapsed >= CAST_MS) {
        clearCastTimer();
        setUiPhase("ready");
      }
    }, 50);
  }, [clearCastTimer]);

  const runCollect = useCallback(async () => {
    setUiPhase("idle");
    try {
      const res = await collectFishAction();
      setLastResult(res);
      void swrMutate(SWR_KEYS.fishingStatus);
      void swrMutate(SWR_KEYS.fishingLogs);
      if (res.ok) {
        setResultOverlay(true);
        setFishStep("fly");
        if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
        flyTimerRef.current = setTimeout(() => {
          setFishStep("detail");
        }, 800);
      }
    } catch {
      setLastResult({ ok: false, error: "收竿失敗，請稍後再試。" });
      setResultOverlay(true);
      setFishStep("detail");
    }
  }, []);

  const openPeerDetail = useCallback(async (userId: string) => {
    const p = await getMemberProfileByIdAction(userId);
    if (p) setDetailUser(p);
  }, []);

  useEffect(() => {
    if (
      !resultOverlay ||
      !lastResult ||
      !lastResult.ok ||
      lastResult.noMatchFound ||
      !lastResult.matchmakerUser ||
      fishStep !== "detail"
    ) {
      setPeerExtra(null);
      return;
    }
    let cancelled = false;
    void getMemberProfileByIdAction(lastResult.matchmakerUser.id).then((p) => {
      if (!cancelled && p) setPeerExtra(p);
    });
    return () => {
      cancelled = true;
    };
  }, [resultOverlay, lastResult, fishStep]);

  const overlayEmoji = useMemo(() => {
    if (!lastResult || !lastResult.ok) return "🎣";
    if (lastResult.noMatchFound) return "💔";
    if (lastResult.matchmakerUser) return "❤️";
    return "🐟";
  }, [lastResult]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <LakeArea serverPhase={phase} uiPhase={uiPhase} />

      {showLottie ? <LottiePlaceholder /> : null}

      {/* StatusSection */}
      {phase === "no_rod" ? (
        <div className="glass-panel rounded-2xl border border-zinc-800/40 p-4 text-center">
          <p className="text-4xl" aria-hidden>
            🎣
          </p>
          <h2 className="mt-3 text-base font-semibold text-white">
            你需要一支魚竿
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            裝備魚竿後才能在命運之湖垂釣
          </p>
          <Button
            type="button"
            className="mt-4 w-full rounded-xl bg-violet-600"
            onClick={() => router.push("/shop")}
          >
            前往商城
          </Button>
        </div>
      ) : null}

      {phase === "no_bait" ? (
        <>
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-4">
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-500">裝備中：</span>
              {rodName}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              今日剩餘 {remaining} 次
            </p>
          </div>
          <div className="glass-panel rounded-2xl border border-zinc-800/40 p-4 text-center">
            <p className="text-2xl" aria-hidden>
              🪱
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              沒有魚餌，去商城補充吧
            </p>
            <Button
              type="button"
              className="mt-4 w-full rounded-xl bg-violet-600"
              onClick={() => router.push("/shop")}
            >
              前往商城購買魚餌
            </Button>
          </div>
        </>
      ) : null}

      {phase === "can_cast" && uiPhase === "idle" ? (
        <>
          <div className="rounded-xl bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-white">
                {rodName}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">
                今日剩餘 {remaining} 次
              </span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">
              選擇魚餌
            </p>
            <button
              type="button"
              className="w-full rounded-xl border border-violet-500 bg-violet-950/40 p-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white">{baitName}</span>
                <span className="text-xs text-zinc-500">等待約 {CAST_COPY_MINUTES} 分鐘</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                🐟25% 🐠25% 🐡25% ❤️25%
              </p>
            </button>
          </div>
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-violet-600 text-base font-semibold"
            onClick={() => setConfirmOpen(true)}
          >
            拋竿！🎣
          </Button>
        </>
      ) : null}

      {phase === "can_cast" && uiPhase === "casting" ? (
        <div className="glass-panel rounded-2xl border border-zinc-800/40 p-4 text-center">
          <p className="text-2xl font-semibold tabular-nums text-violet-400">
            {Math.ceil(castRemainMs / 1000)}s
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${castProgress * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            {baitName} · 等待中
          </p>
          <p className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
            離開此畫面不影響釣魚，稍後回來收竿即可
          </p>
        </div>
      ) : null}

      {phase === "can_cast" && uiPhase === "ready" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-orange-400/60 bg-orange-950/20 p-4 text-center animate-pulse">
            <p className="text-lg font-semibold text-orange-200">
              有東西上鉤了！🎣
            </p>
          </div>
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
            onClick={() => void runCollect()}
          >
            收竿！
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確認拋竿</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-zinc-400">
              <p>
                消耗【{baitName}】，等待約 {CAST_COPY_MINUTES} 分鐘
              </p>
              <p className="text-amber-200/90">
                ⚠️ 若命運之湖找不到符合條件的有緣人，將自動釣中稀有魚 🐠
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-zinc-300">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600"
              onClick={() => {
                setConfirmOpen(false);
                startCasting();
              }}
            >
              確認
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resultOverlay && lastResult ? (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-950/95 px-6">
          {lastResult.ok && lastResult.noMatchFound ? (
            <>
              {fishStep === "fly" ? (
                <span className="animate-fish-fly-in text-8xl">💔</span>
              ) : (
                <div className="w-full max-w-sm space-y-4 text-center">
                  <p className="text-xl font-semibold text-white">
                    緣分不夠，未釣到月老魚 💔
                  </p>
                  <p className="text-sm text-zinc-500">
                    目前緣分不夠，未釣到月老魚
                  </p>
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-violet-600"
                    onClick={() => {
                      setResultOverlay(false);
                      void swrMutate(SWR_KEYS.fishingLogs);
                    }}
                  >
                    確認
                  </Button>
                </div>
              )}
            </>
          ) : lastResult.ok && lastResult.matchmakerUser ? (
            <>
              {fishStep === "fly" ? (
                <span className="animate-fish-fly-in text-8xl">{overlayEmoji}</span>
              ) : (
                <div className="w-full max-w-sm space-y-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    月老魚 ❤️
                  </p>
                  <div className="space-y-1 text-sm">
                    {lastResult.fishExp != null && lastResult.fishExp > 0 ? (
                      <p className="text-amber-400">+{lastResult.fishExp} EXP</p>
                    ) : null}
                    {lastResult.fishCoins != null && lastResult.fishCoins > 0 ? (
                      <p className="text-amber-300">
                        +{lastResult.fishCoins} 免費幣
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-violet-400/40 bg-violet-950/60 p-4 text-left">
                    <p className="text-center text-sm font-medium text-violet-200">
                      ❤️ 命運之湖的有緣人
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <MasterAvatarShell
                        src={lastResult.matchmakerUser.avatar_url}
                        nickname={lastResult.matchmakerUser.nickname}
                        size={40}
                      />
                      <span className="font-medium text-white">
                        {lastResult.matchmakerUser.nickname}
                      </span>
                    </div>
                    {peerExtra ? (
                      <>
                        <p className="mt-2 text-xs text-zinc-400">
                          📍 {peerExtra.region}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(peerExtra.interests ?? [])
                            .slice(0, 3)
                            .map((slug) => (
                              <span
                                key={slug}
                                className="rounded-full border border-violet-500/40 bg-violet-950/50 px-2 py-0.5 text-[10px] text-violet-200"
                              >
                                {tagLabel(slug)}
                              </span>
                            ))}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                          {[peerExtra.bio_village, peerExtra.bio]
                            .find((b) => b?.trim()) ?? "尚未填寫自介"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">載入資料中…</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 bg-violet-600"
                        onClick={() => {
                          void openPeerDetail(lastResult.matchmakerUser!.id);
                        }}
                      >
                        查看完整資料
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 border-zinc-600"
                        onClick={() => {
                          setResultOverlay(false);
                          void swrMutate(SWR_KEYS.fishingLogs);
                        }}
                      >
                        下次再說
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full max-w-sm space-y-4 text-center">
              <p className="text-rose-300">
                {!lastResult.ok ? lastResult.error : ""}
              </p>
              <Button
                type="button"
                className="w-full rounded-xl bg-violet-600"
                onClick={() => setResultOverlay(false)}
              >
                確認
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {detailUser ? (
        <UserDetailModal
          user={detailUser}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDetailUser(null);
              setResultOverlay(false);
              void swrMutate(SWR_KEYS.fishingLogs);
            }
          }}
        />
      ) : null}
    </div>
  );
}
