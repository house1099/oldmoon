"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as swrMutate } from "swr";
import { toast } from "sonner";

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
import { FishingLakeVisual } from "@/components/matchmaking/fishing-lake-visual";
import { FishingRewardModal } from "@/components/matchmaking/fishing-reward-modal";
import { SWR_KEYS } from "@/lib/swr/keys";
import { INTEREST_TAG_OPTIONS } from "@/lib/constants/adventurer-questionnaire";
import {
  castFishAction,
  confirmHarvestFishAction,
  getFishingStatusAction,
  prepareHarvestFishAction,
  type CollectFishResult,
  type FishingStatusDto,
  type FishingStatusResult,
} from "@/services/fishing.action";
import { getMemberProfileByIdAction } from "@/services/profile.action";
import type { MemberProfileView } from "@/services/profile.action";
import { detectBaitType } from "@/lib/utils/fishing-shop-metadata";
import type { Json } from "@/types/database.types";

type FishingRodRow = FishingStatusDto["rods"][number];

const FISH_TYPE_LABEL: Record<string, string> = {
  common: "普通魚",
  rare: "稀有魚",
  legendary: "傳說魚",
  matchmaker: "月老魚",
  leviathan: "深海巨獸",
};

type LakeUiPhase = "idle" | "casting" | "ready";

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function formatRemainHms(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h} 小時 ${m} 分 ${sec} 秒`;
}

function rodChipStatus(r: FishingRodRow): { label: string; detail: string } {
  if (r.hasPendingCast) {
    if (r.pendingHarvestRemainSec > 0) {
      return {
        label: "等待",
        detail: "等待收竿倒數中",
      };
    }
    return { label: "可收竿", detail: "可點收竿結算" };
  }
  if (r.cooldownAfterHarvestRemainingSec > 0) {
    return {
      label: "冷卻",
      detail: `冷卻 ${formatRemainHms(r.cooldownAfterHarvestRemainingSec)}`,
    };
  }
  if (r.castsRemainingToday < 1) {
    return { label: "額滿", detail: "今日次數已用完" };
  }
  return {
    label: "可拋",
    detail: `今日剩 ${r.castsRemainingToday} 次`,
  };
}

function FishingRodStrip({
  rods,
  selectedRodId,
  onSelect,
}: {
  rods: FishingRodRow[];
  selectedRodId: string | null;
  onSelect: (id: string) => void;
}) {
  if (rods.length < 2) return null;
  return (
    <div className="rounded-xl bg-zinc-900/60 p-3 space-y-2">
      <p className="text-xs font-medium text-zinc-400">選擇釣竿</p>
      <p className="text-[11px] text-zinc-500">
        每支釣竿狀態獨立；一支在等待或冷卻時，可切換到其他釣竿操作。
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rods.map((r) => {
          const selected = selectedRodId === r.id;
          const st = rodChipStatus(r);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={`relative flex shrink-0 flex-col items-center rounded-xl border-2 p-1.5 transition-colors ${
                selected
                  ? "border-violet-500 bg-violet-950/40"
                  : "border-zinc-700/80 bg-zinc-900/50"
              }`}
              title={`${r.name} · ${st.detail}`}
            >
              <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-zinc-800">
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 商城圖可能為本機路徑或任意 CDN
                  <img
                    src={r.imageUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-2xl"
                    aria-hidden
                  >
                    🎣
                  </span>
                )}
              </div>
              <span className="mt-1 max-w-[4.75rem] truncate text-center text-[10px] leading-tight text-zinc-500">
                {r.name}
              </span>
              <span
                className={`mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  st.label === "可拋"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : st.label === "可收竿"
                      ? "bg-orange-500/25 text-orange-200"
                      : st.label === "等待"
                        ? "bg-violet-500/20 text-violet-200"
                        : "bg-zinc-700/80 text-zinc-400"
                }`}
              >
                {st.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function metadataRecord(m: Json | null): Record<string, unknown> {
  if (m && typeof m === "object" && !Array.isArray(m)) {
    return m as Record<string, unknown>;
  }
  return {};
}

function BaitFishTags({ metadata }: { metadata: Json | null }) {
  const t = detectBaitType(metadataRecord(metadata));
  if (t === "normal") {
    return <span className="text-zinc-400">🐟 普通魚</span>;
  }
  if (t === "octopus") {
    return (
      <span className="text-zinc-400">
        🐠 稀有魚 🐡 傳說魚 🦈 深海巨獸
      </span>
    );
  }
  return (
    <span className="text-zinc-400">❤️ 月老魚（需單身狀態）</span>
  );
}

function CooldownTimer({
  nextCastAt,
  onElapsed,
}: {
  nextCastAt: string | null;
  onElapsed: () => void;
}) {
  const [tick, setTick] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [nextCastAt]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remainSec = useMemo(() => {
    void tick;
    if (!nextCastAt) return 0;
    const targetMs = new Date(nextCastAt).getTime();
    return Math.max(0, (targetMs - Date.now()) / 1000);
  }, [nextCastAt, tick]);

  useEffect(() => {
    if (!nextCastAt || remainSec > 0) return;
    if (firedRef.current) return;
    firedRef.current = true;
    onElapsed();
  }, [nextCastAt, remainSec, onElapsed]);

  if (!nextCastAt) return null;
  return <span className="tabular-nums">{formatRemainHms(remainSec)}</span>;
}

/** 收竿前等待：以伺服器給的 ready ISO 每秒本地重算，避免僅依 SWR 輪詢導致數字不跳動 */
function PendingHarvestCountdown({
  readyAtIso,
  fallbackRemainSec,
  onElapsed,
}: {
  readyAtIso: string | null;
  fallbackRemainSec: number;
  onElapsed: () => void;
}) {
  const [tick, setTick] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [readyAtIso]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remainSec = useMemo(() => {
    void tick;
    if (readyAtIso) {
      const targetMs = new Date(readyAtIso).getTime();
      const sec = (targetMs - Date.now()) / 1000;
      return Number.isFinite(sec) ? Math.max(0, sec) : Math.max(0, fallbackRemainSec);
    }
    return Math.max(0, fallbackRemainSec);
  }, [readyAtIso, fallbackRemainSec, tick]);

  useEffect(() => {
    if (remainSec > 0) return;
    if (firedRef.current) return;
    firedRef.current = true;
    onElapsed();
  }, [remainSec, onElapsed]);

  return (
    <span className="tabular-nums">{formatRemainHms(remainSec)}</span>
  );
}

export function FishingPanel() {
  const router = useRouter();
  const { data: status } = useSWR<FishingStatusResult>(
    SWR_KEYS.fishingStatus,
    getFishingStatusAction,
    {
      refreshInterval: (d) =>
        d?.ok === true && d.data.hasPendingHarvest ? 1_000 : 10_000,
      revalidateOnFocus: true,
    },
  );

  const statusDto: FishingStatusDto | undefined =
    status?.ok === true ? status.data : undefined;
  const fishingDisabled =
    status?.ok === false && status.error === "fishing_disabled";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [castBusy, setCastBusy] = useState(false);
  const [resultOverlay, setResultOverlay] = useState(false);
  const [revealPlaybackKey, setRevealPlaybackKey] = useState(0);
  const [lastResult, setLastResult] = useState<CollectFishResult | null>(null);
  const [detailUser, setDetailUser] = useState<MemberProfileView | null>(null);
  const [peerExtra, setPeerExtra] = useState<MemberProfileView | null>(null);
  const [selectedRodId, setSelectedRodId] = useState<string | null>(null);
  const [selectedBaitId, setSelectedBaitId] = useState<string | null>(null);

  useEffect(() => {
    if (!statusDto?.rods.length) return;
    setSelectedRodId((prev) => {
      if (prev && statusDto.rods.some((r) => r.id === prev)) return prev;
      const pending = statusDto.rods.find((r) => r.hasPendingCast);
      return pending?.id ?? statusDto.rods[0].id;
    });
  }, [statusDto]);

  useEffect(() => {
    if (!statusDto?.baits.length) return;
    setSelectedBaitId((prev) => {
      if (prev && statusDto.baits.some((b) => b.id === prev)) return prev;
      return statusDto.baits[0].id;
    });
  }, [statusDto]);

  const phase = statusDto?.phase ?? "no_rod";
  const activeRod =
    statusDto?.rods.find((r) => r.id === selectedRodId) ?? statusDto?.rods[0];
  const activeBait =
    statusDto?.baits.find((b) => b.id === selectedBaitId) ?? statusDto?.baits[0];
  const rodName = activeRod?.name ?? statusDto?.equippedRodName ?? "命運釣竿";
  const baitName = activeBait?.name ?? statusDto?.defaultBaitName ?? "釣餌";
  const displayBaitName =
    activeRod?.hasPendingCast && activeRod.pendingBaitName
      ? activeRod.pendingBaitName
      : baitName;
  const pendingTagsMetadata =
    activeRod?.hasPendingCast && activeRod.pendingBaitMetadata != null
      ? activeRod.pendingBaitMetadata
      : null;

  const lakeUiPhase: LakeUiPhase = useMemo(() => {
    if (!activeRod?.hasPendingCast) return "idle";
    if (activeRod.pendingHarvestRemainSec > 0) return "casting";
    return "ready";
  }, [activeRod]);

  const remaining = useMemo(() => {
    if (!statusDto || !activeRod) {
      return statusDto?.todayRemainingCasts ?? statusDto?.baitCount ?? 0;
    }
    if (activeRod.hasPendingCast) return 0;
    if (activeRod.cooldownAfterHarvestRemainingSec > 0) return 0;
    return Math.min(statusDto.baitCount, activeRod.castsRemainingToday);
  }, [statusDto, activeRod]);

  const runCast = useCallback(async () => {
    setCastBusy(true);
    try {
      const res = await castFishAction({
        rodUserRewardId: selectedRodId ?? undefined,
        baitUserRewardId: selectedBaitId ?? undefined,
      });
      void swrMutate(SWR_KEYS.fishingStatus);
      if (!res.ok) {
        if (res.error === "cooldown_not_ready") {
          toast.error(`冷卻中，還需等待 ${res.remainMinutes ?? 0} 分鐘`);
          return;
        }
        if (res.error === "daily_limit_reached") {
          toast.error("今日釣魚次數已達上限，明天再來吧！");
          return;
        }
        if (res.error === "fishing_disabled") {
          toast.error("釣魚系統維護中，請稍後再試");
          return;
        }
        if (res.error === "need_birth_year") {
          toast.error("使用愛心餌料需先設定出生年份與單身狀態");
          return;
        }
        if (res.error === "pending_harvest") {
          toast.error("請先收成上一輪拋竿，或稍後再試。");
          return;
        }
        setLastResult({ ok: false, error: res.error });
        setRevealPlaybackKey((k) => k + 1);
        setResultOverlay(true);
      }
    } catch {
      setLastResult({ ok: false, error: "拋竿失敗，請稍後再試。" });
      setRevealPlaybackKey((k) => k + 1);
      setResultOverlay(true);
    } finally {
      setCastBusy(false);
    }
  }, [selectedRodId, selectedBaitId]);

  const runHarvest = useCallback(async () => {
    try {
      const res = await prepareHarvestFishAction({
        rodUserRewardId: selectedRodId ?? undefined,
      });
      setLastResult(res);
      void swrMutate(SWR_KEYS.fishingStatus);
      setRevealPlaybackKey((k) => k + 1);
      setResultOverlay(true);
    } catch {
      setLastResult({ ok: false, error: "收竿失敗，請稍後再試。" });
      setRevealPlaybackKey((k) => k + 1);
      setResultOverlay(true);
    }
  }, [selectedRodId]);

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
      !lastResult.matchmakerUser
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
  }, [resultOverlay, lastResult]);

  const closeRewardModal = useCallback(async () => {
    if (lastResult?.ok === true) {
      const r = await confirmHarvestFishAction({
        rodUserRewardId: selectedRodId ?? undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
    }
    setResultOverlay(false);
    void swrMutate(SWR_KEYS.fishingLogs);
    void swrMutate(SWR_KEYS.fishingStatus);
  }, [lastResult, selectedRodId]);

  if (fishingDisabled) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="rounded-2xl border border-amber-500/35 bg-zinc-900/80 p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🔧
          </p>
          <p className="mt-3 text-sm font-medium text-zinc-100">
            釣魚系統維護中，請稍後再試
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <FishingLakeVisual serverPhase={phase} uiPhase={lakeUiPhase} />

      {phase === "can_cast" && statusDto && statusDto.rods.length > 1 ? (
        <FishingRodStrip
          rods={statusDto.rods}
          selectedRodId={selectedRodId}
          onSelect={setSelectedRodId}
        />
      ) : null}

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

      {phase === "can_cast" && lakeUiPhase === "idle" ? (
        <>
          {statusDto && statusDto.rods.length === 1 ? (
            <div className="rounded-xl bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-white">
                  {rodName}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {activeRod && activeRod.cooldownAfterHarvestRemainingSec > 0
                    ? `冷卻 ${formatRemainHms(activeRod.cooldownAfterHarvestRemainingSec)}`
                    : `今日剩餘 ${remaining} 次`}
                </span>
              </div>
            </div>
          ) : null}
          {statusDto && statusDto.rods.length > 1 ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-900/40 px-1 py-1 text-xs text-zinc-500">
              <span>目前釣竿 · 今日可拋（含釣餌上限）</span>
              <span>{remaining} 次</span>
            </div>
          ) : null}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">
              選擇魚餌
            </p>
            {statusDto && statusDto.baits.length > 1 ? (
              <select
                className="mb-2 w-full rounded-lg border border-violet-500/50 bg-violet-950/40 px-3 py-2 text-sm text-white"
                value={selectedBaitId ?? ""}
                onChange={(e) => setSelectedBaitId(e.target.value)}
              >
                {statusDto.baits.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.quantity > 1 ? ` ×${b.quantity}` : ""}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="w-full rounded-xl border border-violet-500 bg-violet-950/40 p-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white">
                  {baitName}
                  {activeBait && activeBait.quantity > 1 ? (
                    <span className="ml-2 rounded-full bg-amber-500/25 px-2 py-0.5 text-xs font-semibold text-amber-200">
                      {activeBait.quantity > 99 ? "99+" : `×${activeBait.quantity}`}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-zinc-500">
                  拋竿後等待與該釣竿冷卻同步
                </span>
              </div>
              <p className="mt-2 text-xs">
                <BaitFishTags metadata={activeBait?.metadata ?? null} />
              </p>
            </div>
          </div>
          {activeRod?.cooldownInfo?.isOnCooldown &&
          activeRod.cooldownInfo.nextCastAt &&
          lakeUiPhase === "idle" ? (
            <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/60 p-4 text-center">
              <div className="mb-1 text-sm text-zinc-400">下次可拋竿</div>
              <div className="text-xl font-semibold text-violet-400">
                <CooldownTimer
                  nextCastAt={activeRod.cooldownInfo.nextCastAt}
                  onElapsed={() => void swrMutate(SWR_KEYS.fishingStatus)}
                />
              </div>
              <div className="mt-2 text-xs text-zinc-600">冷卻中，請耐心等待</div>
            </div>
          ) : null}
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-violet-600 text-base font-semibold"
            disabled={castBusy || remaining < 1}
            onClick={() => setConfirmOpen(true)}
          >
            {castBusy ? "拋竿中…" : "拋竿！🎣"}
          </Button>
        </>
      ) : null}

      {phase === "can_cast" && lakeUiPhase === "casting" ? (
        <div className="space-y-3">
          <div className="glass-panel rounded-2xl border border-zinc-800/40 p-4 text-center">
            <p className="mb-1 text-xs text-zinc-500">
              收竿倒數（依拋竿時鎖定的可收竿時間）
            </p>
            <p className="text-2xl font-semibold tabular-nums text-violet-400">
              <PendingHarvestCountdown
                readyAtIso={activeRod?.pendingHarvestReadyAtIso ?? null}
                fallbackRemainSec={activeRod?.pendingHarvestRemainSec ?? 0}
                onElapsed={() => void swrMutate(SWR_KEYS.fishingStatus)}
              />
            </p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-full animate-pulse rounded-full bg-violet-500/80" />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {displayBaitName} · 等待中
            </p>
            {pendingTagsMetadata != null ? (
              <p className="mt-2 text-xs">
                <BaitFishTags metadata={pendingTagsMetadata} />
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-zinc-600">
              倒數結束後會出現「收竿」按鈕
            </p>
            <p className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
              離開此畫面不影響釣魚，稍後回來收竿即可
            </p>
          </div>
        </div>
      ) : null}

      {phase === "can_cast" && lakeUiPhase === "ready" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-orange-400/60 bg-orange-950/20 p-4 text-center animate-pulse">
            <p className="text-lg font-semibold text-orange-200">
              有東西上鉤了！🎣
            </p>
          </div>
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
            onClick={() => void runHarvest()}
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
                消耗【{baitName}】。等待時間與該釣竿冷卻相同，倒數結束即可收竿；收竿後若要再拋，須等同一支釣竿冷卻結束，或改用其他釣竿。
              </p>
              <p className="text-amber-200/90">
                ⚠️ 月老魚須符合配對條件；若無符合對象將記為未配對成功。
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
                void runCast();
              }}
            >
              確認
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resultOverlay && lastResult ? (
        <FishingRewardModal
          open={resultOverlay}
          playbackKey={revealPlaybackKey}
          lastResult={lastResult}
          fishTypeLabels={FISH_TYPE_LABEL}
          tagLabel={tagLabel}
          peerExtra={peerExtra}
          onConfirm={closeRewardModal}
          onOpenPeerDetail={(userId) => {
            void openPeerDetail(userId);
          }}
        />
      ) : null}

      {detailUser ? (
        <UserDetailModal
          user={detailUser}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDetailUser(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
