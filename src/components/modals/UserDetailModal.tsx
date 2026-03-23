"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { MapPin, Sparkles, UserRound } from "lucide-react";
import {
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  REGION_OPTIONS,
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

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function isRecentlyActive(lastSeen: string | null, withinMs: number): boolean {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < withinMs;
}

function TagBlock({
  title,
  slugs,
}: {
  title: string;
  slugs: string[];
}) {
  const list = slugs.filter(Boolean);
  return (
    <div className="rounded-xl border border-amber-900/25 bg-zinc-950/40 p-4">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-violet-400/85">
        {title}
      </p>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">尚無標籤</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {list.map((tag) => (
            <li key={tag}>
              <span className="tag-gold">{tagLabel(tag)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
  const [pending, startTransition] = useTransition();
  const [likedByMe, setLikedByMe] = useState(false);
  const [unlikeConfirmOpen, setUnlikeConfirmOpen] = useState(false);
  const [moodCountdownLabel, setMoodCountdownLabel] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const r = await getLikeStatusForTargetAction(user.id);
      if (cancelled) return;
      if (r.success) setLikedByMe(r.liked);
    })();
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

  function handleLike() {
    startTransition(async () => {
      const result = await toggleLikeAction(user.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLikedByMe(result.liked);
      if (result.isMatch) {
        toast.success("🎉 互有緣分！", {
          description:
            "你與對方都按下了有緣分 — 星光交織，命運在此刻對齊 ✦",
          duration: 6500,
          className:
            "border border-amber-400/40 bg-gradient-to-br from-violet-950 via-slate-950 to-amber-950/90 text-amber-50 shadow-xl shadow-amber-900/20",
        });
        return;
      }
      if (result.liked) {
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
    });
  }

  function onLoveButtonClick() {
    if (likedByMe) {
      setUnlikeConfirmOpen(true);
      return;
    }
    handleLike();
  }

  function confirmEndAffinity() {
    setUnlikeConfirmOpen(false);
    handleLike();
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
                  active ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" : "bg-slate-600",
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
                  <dd>{labelFor(GENDER_OPTIONS, user.gender)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-400/90" />
                  <dt className="sr-only">地區</dt>
                  <dd className="truncate">
                    {labelFor(REGION_OPTIONS, user.region)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[min(52vh,420px)] space-y-4 overflow-y-auto px-4 py-4">
          <div className="mx-auto w-full max-w-[min(100%,22rem)] space-y-4 sm:max-w-full">
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-violet-400/85">
                自白
              </p>
              <p className="text-sm leading-relaxed text-slate-200/95">
                {user.bio?.trim()
                  ? user.bio
                  : "這位冒險者尚未留下自白。"}
              </p>
            </div>

            {isMoodActive(user.mood_at) && user.mood?.trim() ? (
              <div className="glass-panel p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">今日心情</span>
                  <span className="text-xs text-zinc-500">
                    {moodCountdownLabel ?? getMoodCountdown(user.mood_at)}
                  </span>
                </div>
                <p className="text-sm text-white">{user.mood}</p>
              </div>
            ) : null}

            <Separator className="bg-amber-900/35" />

            <div className="flex flex-col gap-3">
              <TagBlock title="興趣" slugs={user.interests ?? []} />
              <TagBlock title="可提供的技能" slugs={user.skills_offer ?? []} />
              <TagBlock title="想尋找的共學" slugs={user.skills_want ?? []} />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-amber-900/35 bg-zinc-950 px-6 pb-8 pt-4">
          <div className="flex w-full flex-row items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[2.75rem] min-w-0 flex-1 rounded-full border-violet-800/50 px-4 py-2.5 text-sm font-medium text-violet-100/95 transition-transform active:scale-95 hover:bg-violet-950/40"
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
            <Button
              type="button"
              variant="secondary"
              className={cn(
                "h-11 min-h-[2.75rem] min-w-0 flex-1 gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-transform active:scale-95",
                likedByMe
                  ? "border-rose-500/55 bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-950/40 hover:from-rose-500 hover:to-rose-600"
                  : "border-amber-800/40 bg-rose-950/40 text-amber-50 hover:bg-rose-900/45",
              )}
              disabled={pending}
              onClick={onLoveButtonClick}
              aria-label={likedByMe ? "已送出緣分，點擊可收回" : "送出緣分"}
            >
              <span className="text-base leading-none" aria-hidden>
                {likedByMe ? "💖" : "🤍"}
              </span>
              <span>{likedByMe ? "已送出緣分" : "送出緣分"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={unlikeConfirmOpen} onOpenChange={setUnlikeConfirmOpen}>
      <AlertDialogContent className="border-amber-900/40 bg-zinc-950 text-zinc-100">
        <AlertDialogHeader>
          <AlertDialogTitle>結束緣分</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            你確定要結束這段緣分嗎？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-zinc-800 bg-zinc-900/50">
          <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-white hover:bg-rose-500"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              confirmEndAffinity();
            }}
          >
            確定結束
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
