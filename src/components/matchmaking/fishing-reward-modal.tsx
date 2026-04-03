"use client";

import { useCallback, useEffect, useState } from "react";
import Lottie from "lottie-react";

import { Button } from "@/components/ui/button";
import { MasterAvatarShell } from "@/components/ui/MasterAvatarShell";
import { getFishingRevealLottiePath } from "@/lib/utils/fishing-reveal-lottie";
import { instagramProfileUrlFromHandle } from "@/lib/utils/instagram";
import type { CollectFishResult } from "@/services/fishing.action";
import type { MemberProfileView } from "@/services/profile.action";

import "./fishing-reveal-modal.css";

const FISH_TYPE_LABEL: Record<string, string> = {
  common: "普通魚",
  rare: "稀有魚",
  legendary: "傳說魚",
  matchmaker: "月老魚",
  leviathan: "深海巨獸",
};

type FishingRewardModalProps = {
  open: boolean;
  playbackKey: number;
  lastResult: CollectFishResult;
  fishTypeLabels?: Record<string, string>;
  tagLabel: (slug: string) => string;
  peerExtra: MemberProfileView | null;
  onConfirm: () => void;
  onOpenPeerDetail: (userId: string) => void;
};

export function FishingRewardModal({
  open,
  playbackKey,
  lastResult,
  fishTypeLabels = FISH_TYPE_LABEL,
  tagLabel,
  peerExtra,
  onConfirm,
  onOpenPeerDetail,
}: FishingRewardModalProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [loadError, setLoadError] = useState(false);

  const lottiePath =
    lastResult.ok === true
      ? getFishingRevealLottiePath(lastResult)
      : "/animations/normal.json";

  const resultOk = lastResult.ok;

  useEffect(() => {
    if (!open || !resultOk) {
      setAnimationData(null);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setAnimationData(null);
    setLoadError(false);
    void fetch(lottiePath)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<object>;
      })
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, resultOk, lottiePath, playbackKey]);

  const titleText = useCallback(() => {
    if (!lastResult.ok) {
      return lastResult.error === "fishing_disabled"
        ? "系統維護中"
        : "收竿失敗";
    }
    if (lastResult.noMatchFound) {
      return "緣分不足";
    }
    if (lastResult.matchmakerUser) {
      return "月老魚";
    }
    return fishTypeLabels[lastResult.fishType] ?? lastResult.fishType;
  }, [lastResult, fishTypeLabels]);

  const subtitleLines = useCallback(() => {
    if (!lastResult.ok) return null;
    const parts: string[] = [];
    if (lastResult.fishExp != null && lastResult.fishExp > 0) {
      parts.push(`+${lastResult.fishExp} EXP`);
    }
    if (lastResult.fishCoins != null && lastResult.fishCoins > 0) {
      parts.push(`+${lastResult.fishCoins} 免費幣`);
    }
    return parts.length ? parts.join(" · ") : null;
  }, [lastResult]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-zinc-950/95 px-4 py-8">
      <div className="fishing-reveal-shell noselect mx-auto flex w-full max-w-md flex-col items-center gap-5">
        {!lastResult.ok ? (
          <div className="w-full max-w-sm space-y-4 text-center">
            <p className="text-rose-300">
              {lastResult.error === "fishing_disabled"
                ? "釣魚系統維護中，請稍後再試"
                : lastResult.error}
            </p>
            <Button
              type="button"
              className="w-full rounded-xl bg-violet-600"
              onClick={onConfirm}
            >
              確認
            </Button>
          </div>
        ) : (
          <>
            <div className="fr-container scale-[1.05] sm:scale-110">
              <div className="fr-tracker" aria-hidden />
              <div id="fishingRevealCard">
                <div className="glowing-elements" aria-hidden>
                  <div className="glow-1" />
                  <div className="glow-2" />
                  <div className="glow-3" />
                </div>
                <div className="card-particles" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="cyber-lines" aria-hidden>
                  <span />
                  <span />
                </div>
                <div className="corner-elements" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="scan-line" aria-hidden />
                <div className="card-glare" aria-hidden />
                <div className="fr-card-content">
                  <h2 className="fr-title">{titleText()}</h2>
                  <div className="fr-lottie-wrap">
                    {animationData && !loadError ? (
                      <Lottie
                        key={`${lottiePath}-${playbackKey}`}
                        animationData={animationData}
                        loop={false}
                        className="lottie-inner max-h-[150px] w-full"
                      />
                    ) : (
                      <div className="flex h-[120px] w-full items-center justify-center text-5xl">
                        {lastResult.noMatchFound ? "💔" : "🐟"}
                      </div>
                    )}
                  </div>
                  <p className="fr-subtitle">
                    {subtitleLines() ? (
                      <>
                        獎勵
                        <span className="fr-highlight">{subtitleLines()}</span>
                      </>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {lastResult.ok && lastResult.noMatchFound ? (
              <div className="w-full max-w-sm space-y-3 text-center">
                <p className="text-sm text-zinc-400">
                  目前緣分不夠，未釣到月老魚
                </p>
                <Button
                  type="button"
                  className="w-full rounded-xl bg-violet-600"
                  onClick={onConfirm}
                >
                  確認
                </Button>
              </div>
            ) : null}

            {lastResult.ok &&
            !lastResult.noMatchFound &&
            lastResult.fishType !== "matchmaker" &&
            !lastResult.matchmakerUser ? (
              <div className="w-full max-w-sm">
                <Button
                  type="button"
                  className="w-full rounded-xl bg-violet-600"
                  onClick={onConfirm}
                >
                  確認
                </Button>
              </div>
            ) : null}

            {lastResult.ok && lastResult.matchmakerUser ? (
              <div className="w-full max-w-sm space-y-4">
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
                  {(() => {
                    const mm = lastResult.matchmakerUser;
                    const regionLine =
                      mm.region?.trim() ||
                      peerExtra?.region ||
                      "未填寫";
                    const interestSlugs =
                      mm.interests && mm.interests.length > 0
                        ? mm.interests
                        : (peerExtra?.interests ?? []);
                    const bioLine =
                      [mm.bioVillage, peerExtra?.bio_village, peerExtra?.bio].find(
                        (b) => b?.trim(),
                      ) ?? "尚未填寫自介";
                    const igHandle =
                      mm.instagramHandle?.trim() ||
                      peerExtra?.instagram_handle?.trim();
                    const igUrl = instagramProfileUrlFromHandle(igHandle ?? "");
                    const hasLocal =
                      Boolean(mm.region?.trim()) ||
                      (mm.interests && mm.interests.length > 0) ||
                      Boolean(mm.bioVillage?.trim()) ||
                      Boolean(mm.instagramHandle?.trim());
                    if (!hasLocal && !peerExtra) {
                      return (
                        <p className="mt-2 text-xs text-zinc-500">載入資料中…</p>
                      );
                    }
                    return (
                      <>
                        <p className="mt-2 text-xs text-zinc-400">
                          📍 {regionLine}
                        </p>
                        {interestSlugs.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {interestSlugs.slice(0, 3).map((slug) => (
                              <span
                                key={slug}
                                className="rounded-full border border-violet-500/40 bg-violet-950/50 px-2 py-0.5 text-[10px] text-violet-200"
                              >
                                {tagLabel(slug)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                          {bioLine}
                        </p>
                        {igHandle && igUrl ? (
                          <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-700/40 bg-zinc-900/60 p-3">
                            <div>
                              <div className="mb-0.5 text-xs text-zinc-500">
                                Instagram
                              </div>
                              <div className="text-sm font-medium text-white">
                                @{igHandle.replace(/^@+/, "")}
                              </div>
                            </div>
                            <a
                              href={igUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full bg-violet-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-violet-500"
                            >
                              前往 IG
                            </a>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-violet-600"
                      onClick={() => {
                        onOpenPeerDetail(lastResult.matchmakerUser!.id);
                      }}
                    >
                      查看完整資料
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-zinc-600"
                      onClick={onConfirm}
                    >
                      下次再說
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
