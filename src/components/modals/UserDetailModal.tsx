"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { MapPin, Sparkles, UserRound } from "lucide-react";
import {
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/constants/adventurer-questionnaire";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { toggleLikeAction } from "@/services/social.action";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function isMoodFresh(moodAt: string | null): boolean {
  if (!moodAt) return false;
  const t = new Date(moodAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
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
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-violet-400/85">
        {title}
      </p>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">尚無標籤</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
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

  const moodVisible =
    isMoodFresh(user.mood_at) && (user.mood?.trim().length ?? 0) > 0;
  const active = isRecentlyActive(user.last_seen_at, 15 * 60 * 1000);

  function handleLike() {
    startTransition(async () => {
      const result = await toggleLikeAction(user.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.isMatch) {
        toast.success("🎉 互有緣分！", {
          description:
            "你與對方都按下了有緣分 — 星光交織，命運在此刻對齊 ✦",
          duration: 6500,
          className:
            "border border-amber-400/40 bg-gradient-to-br from-violet-950 via-slate-950 to-amber-950/90 text-amber-50 shadow-xl shadow-amber-900/20",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,640px)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden border border-amber-900/45 bg-gradient-to-b from-slate-950 via-violet-950/25 to-slate-950 p-0 text-slate-200 sm:max-w-md"
      >
        <DialogHeader className="relative border-b border-amber-900/35 bg-slate-950/80 px-4 pb-4 pt-5">
          <div className="flex gap-4 pr-8">
            <div className="relative w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-amber-800/45 bg-slate-900/90">
              <AspectRatio ratio={1}>
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 頭像可能為任意 HTTPS 網址
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <UserRound
                      className="h-10 w-10 text-amber-200/60"
                      aria-hidden
                    />
                  </div>
                )}
              </AspectRatio>
              <span
                className={cn(
                  "absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-slate-950",
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

          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-violet-400/85">
              今日心情
            </p>
            <p className="text-sm leading-relaxed text-slate-200/95">
              {moodVisible ? user.mood : "尚未更新或已超過 24 小時。"}
            </p>
          </div>

          <Separator className="bg-amber-900/35" />

          <TagBlock title="興趣" slugs={user.interests ?? []} />
          <TagBlock title="可提供的技能" slugs={user.skills_offer ?? []} />
          <TagBlock title="想尋找的共學" slugs={user.skills_want ?? []} />
        </div>

        <DialogFooter className="border-t border-amber-900/35 bg-slate-950/90 px-4 py-3 sm:flex-row sm:justify-stretch sm:gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 border-amber-800/40 bg-rose-950/40 text-amber-50 hover:bg-rose-900/45"
            disabled={pending}
            onClick={handleLike}
          >
            ❤️ 有緣分
          </Button>
          <span
            className="inline-flex flex-1"
            title="需雙方互有緣分才可解鎖"
          >
            <Button
              type="button"
              variant="outline"
              className="w-full border-rose-900/50 text-rose-200/90"
              disabled
            >
              🩸 申請血盟
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
