"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Sparkles, UserRound } from "lucide-react";
import {
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  LEGACY_REGION_MAP,
  REGION_OPTIONS,
  resolveLegacyLabel,
  resolveOfflineOkLabel,
} from "@/lib/constants/adventurer-questionnaire";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import {
  getLikeStatusForTargetAction,
  toggleLikeAction,
} from "@/services/social.action";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getMoodCountdown, isMoodActive } from "@/lib/utils/mood";

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function isRecentlyActive(lastSeen: string | null, withinMs: number): boolean {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < withinMs;
}

export type UserDetailModalProps = {
  user: UserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserDetailModal({
  user,
  open,
  onOpenChange,
}: UserDetailModalProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(true);
  const [likePending, setLikePending] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [moodCountdownLabel, setMoodCountdownLabel] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setLikeLoading(true);
    let cancelled = false;
    void getLikeStatusForTargetAction(user.id).then((r) => {
      if (cancelled) return;
      if (r.success) {
        setIsLiked(r.liked);
      } else {
        toast.error(r.error);
      }
      setLikeLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, user.id]);

  useEffect(() => {
    if (
      !open ||
      !isMoodActive(user.mood_at) ||
      !(user.mood?.trim().length ?? 0)
    ) {
      setMoodCountdownLabel(null);
      return;
    }
    const tick = () => setMoodCountdownLabel(getMoodCountdown(user.mood_at));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [open, user.mood_at, user.mood]);

  const active = isRecentlyActive(user.last_seen_at, 15 * 60 * 1000);
  const genderLabel = resolveLegacyLabel(user.gender, GENDER_OPTIONS);
  const regionLabel = resolveLegacyLabel(
    user.region,
    REGION_OPTIONS,
    LEGACY_REGION_MAP,
  );
  const offlineLabel = resolveOfflineOkLabel(user.offline_ok);

  function applyToggleToasts(
    liked: boolean,
    isMatch: boolean,
  ) {
    if (isMatch) {
      toast.success("🎉 互有緣分！", {
        description:
          "你與對方都按下了有緣分 — 星光交織，命運在此刻對齊 ✦",
        duration: 6500,
        className:
          "border border-amber-400/40 bg-gradient-to-br from-violet-950 via-slate-950 to-amber-950/90 text-amber-50 shadow-xl shadow-amber-900/20",
      });
      return;
    }
    if (liked) {
      toast.success("💕 緣分已點亮！", {
        description: "你的心意已傳達給這位冒險者 ✨ 願星光眷顧這段邂逅",
        duration: 5200,
        className:
          "border border-rose-500/40 bg-gradient-to-br from-rose-600/25 via-zinc-950 to-violet-950/90 text-rose-50 shadow-2xl shadow-rose-950/30",
      });
    } else {
      toast.message("已收回有緣分", {
        description: "隨時可以再送出心意喵～",
        className:
          "border border-zinc-700/60 bg-zinc-950 text-zinc-100 shadow-xl",
      });
    }
  }

  async function handleToggleLike() {
    if (likeLoading || likePending) return;
    if (isLiked) {
      setShowCancelDialog(true);
      return;
    }
    setLikePending(true);
    try {
      const result = await toggleLikeAction(user.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setIsLiked(result.liked);
      applyToggleToasts(result.liked, result.isMatch);
    } finally {
      setLikePending(false);
    }
  }

  async function confirmCancelLike() {
    setLikePending(true);
    try {
      const result = await toggleLikeAction(user.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setIsLiked(result.liked);
      setShowCancelDialog(false);
      applyToggleToasts(result.liked, result.isMatch);
    } finally {
      setLikePending(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden border border-amber-900/45 bg-zinc-950 p-0 text-slate-200 sm:max-w-md"
        >
          <DialogHeader className="relative border-b border-amber-900/35 bg-zinc-950/95 px-4 pb-4 pt-5">
            <div className="flex gap-4 pr-8">
              <div className="relative aspect-square size-[4.5rem] shrink-0 overflow-hidden rounded-full border-2 border-zinc-800 bg-slate-900/90">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 頭像可能為任意 HTTPS 網址
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900">
                    <UserRound
                      className="h-10 w-10 text-amber-200/60"
                      aria-hidden
                    />
                  </div>
                )}
                <span
                  className={cn(
                    "absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950",
                    active
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                      : "bg-slate-600",
                  )}
                  title={active ? "近期活躍" : "離線或未更新活躍狀態"}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <DialogTitle className="font-serif text-lg font-semibold tracking-tight text-amber-50/95">
                  {user.nickname}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-amber-600/50 bg-amber-950/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-100/95"
                    title="等級"
                  >
                    <Sparkles className="h-3 w-3 text-amber-300/90" />
                    Lv.{user.level}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {active ? "活躍中" : "未上線或較少活動"}
                  </span>
                </div>
                <dl className="space-y-1 text-xs text-slate-300/95">
                  <div className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-violet-400/90" />
                    <dt className="sr-only">性別</dt>
                    <dd>{genderLabel}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-400/90" />
                    <dt className="sr-only">地區</dt>
                    <dd className="truncate">{regionLabel}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">線下意願</dt>
                    <dd className="text-slate-400/90">{offlineLabel}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </DialogHeader>

          {isMoodActive(user.mood_at) && user.mood?.trim() ? (
            <div className="border-b border-amber-900/25 px-4 py-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">今日心情</span>
                  <span className="text-xs text-zinc-500">
                    {moodCountdownLabel ?? getMoodCountdown(user.mood_at)}
                  </span>
                </div>
                <p className="text-sm text-white">{user.mood}</p>
              </div>
            </div>
          ) : null}

          <div className="max-h-[min(52vh,420px)] space-y-4 overflow-y-auto px-4 py-4">
            <div className="mx-auto w-full max-w-[min(100%,22rem)] space-y-4 sm:max-w-full">
              <div className="space-y-3">
                {user.bio_village?.trim() ? (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">興趣自白</p>
                    <p className="text-sm leading-relaxed text-white">
                      {user.bio_village}
                    </p>
                  </div>
                ) : null}
                {user.bio_market?.trim() ? (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">技能自白</p>
                    <p className="text-sm leading-relaxed text-white">
                      {user.bio_market}
                    </p>
                  </div>
                ) : null}
                {!user.bio_village?.trim() && !user.bio_market?.trim() ? (
                  <p className="text-xs text-zinc-500">
                    這位冒險者尚未留下自白。
                  </p>
                ) : null}
              </div>

              <Separator className="bg-amber-900/35" />

              <div className="space-y-3">
                {user.interests && user.interests.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-violet-400">
                      興趣村莊
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-violet-500/40 bg-violet-500/20 px-3 py-1 text-xs text-violet-200"
                        >
                          {tagLabel(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(user.skills_offer?.length ?? 0) > 0 ||
                (user.skills_want?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-400">
                      技能市集
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.skills_offer?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs text-amber-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {user.skills_want?.map((tag) => (
                        <span
                          key={`want-${tag}`}
                          className="rounded-full border border-sky-500/40 bg-sky-500/20 px-3 py-1 text-xs text-sky-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-amber-900/35 bg-zinc-950 px-6 pb-8 pt-4">
            <div className="flex w-full max-w-[min(100%,22rem)] flex-row items-center justify-center gap-4 sm:max-w-full">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-[2.75rem] min-w-0 flex-1 rounded-full border-violet-800/50 px-4 py-2.5 text-sm font-medium text-violet-100/95 transition-transform hover:bg-violet-950/40 active:scale-95"
                onClick={() =>
                  toast.message("即將開啟私訊功能喵！", {
                    description: "私訊通道建置中，敬請期待。",
                    className:
                      "border border-violet-700/50 bg-zinc-950 text-violet-50 shadow-lg",
                  })
                }
              >
                💬 聊聊
              </Button>
              <button
                type="button"
                disabled={likeLoading || likePending}
                onClick={() => void handleToggleLike()}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-60",
                  isLiked
                    ? "bg-rose-500/80 text-white"
                    : "bg-white/10 text-white hover:bg-white/20",
                )}
                aria-label={isLiked ? "已送出緣分，點擊可收回" : "送出緣分"}
              >
                {likeLoading || likePending
                  ? "…"
                  : isLiked
                    ? "💖 已送出緣分"
                    : "🤍 送出緣分"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="glass-panel border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              確定取消緣分？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              取消後對方將不再收到你的緣分通知。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel className="flex-1 rounded-full border-0 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white">
              再想想
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-full bg-rose-600 text-white hover:bg-rose-500"
              disabled={likePending}
              onClick={(e) => {
                e.preventDefault();
                void confirmCancelLike();
              }}
            >
              確定取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
