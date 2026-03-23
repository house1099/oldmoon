"use client";

import { MapPin, Sparkles, UserRound } from "lucide-react";
import {
  GENDER_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/constants/adventurer-questionnaire";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export type UserCardProps = {
  user: UserRow;
  className?: string;
};

export function UserCard({ user, className }: UserCardProps) {
  const interests = user.interests?.filter(Boolean) ?? [];

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={120}
        closeDelay={80}
        render={(props) => (
          <div
            {...props}
            className={cn(
              "block w-full rounded-2xl border-2 border-violet-500/40 bg-gradient-to-b from-slate-950/95 via-violet-950/35 to-slate-950/95 p-4 text-left shadow-xl backdrop-blur-sm guild-breathe-ring outline-none transition-[transform] duration-300 hover:-translate-y-0.5",
              className,
            )}
          >
            <div className="flex gap-4">
              <div className="w-[5.25rem] shrink-0 overflow-hidden rounded-xl border border-amber-800/45 bg-slate-900/90">
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
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-serif text-lg font-semibold text-amber-50/95">
                    {user.nickname}
                  </h2>
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-amber-600/50 bg-amber-950/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-100/95"
                    title="等級"
                  >
                    <Sparkles className="h-3 w-3 text-amber-300/90" />
                    Lv.{user.level}
                  </span>
                </div>

                <dl className="mt-2 space-y-1 text-xs text-slate-300/95">
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

            <Separator className="my-3 bg-amber-900/35" />

            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-violet-400/85">
                興趣
              </p>
              {interests.length === 0 ? (
                <p className="text-xs text-muted-foreground">尚未標記興趣</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {interests.map((tag) => (
                    <li key={tag}>
                      <span className="tag-gold">{tag}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      />
      <HoverCardContent className="w-72 border border-amber-900/40 bg-slate-950/98 p-3 text-slate-200 shadow-2xl">
        <p className="font-serif text-sm font-medium text-amber-100/95">
          {user.nickname}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          累積 EXP（<code className="text-amber-200/80">total_exp</code>）{" "}
          <span className="tabular-nums text-amber-100/90">
            {user.total_exp.toLocaleString("zh-TW")}
          </span>
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400/95">
          暫停在此可查看數值；完整資料與互動功能將於後續任務開放 🐱
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
