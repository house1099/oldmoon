"use client";

import { useState } from "react";
import { MapPin, Sparkles, UserRound } from "lucide-react";
import {
  GENDER_OPTIONS,
  LEGACY_REGION_MAP,
  REGION_OPTIONS,
  resolveLegacyLabel,
  resolveOfflineOkLabel,
} from "@/lib/constants/adventurer-questionnaire";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { LevelFrame } from "@/components/cards/LevelFrame";
import { UserDetailModal } from "@/components/modals/UserDetailModal";

export type UserCardProps = {
  user: UserRow;
  className?: string;
  /** 技能市集：完美匹配時套用白金屬高光外環 */
  perfectMatch?: boolean;
  /** 村莊：興趣最多三枚 +N；市集：顯示技能標籤、不顯示興趣 */
  variant?: "village" | "market";
};

export function UserCard({
  user,
  className,
  perfectMatch = false,
  variant = "village",
}: UserCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const interests = user.interests?.filter(Boolean) ?? [];
  const skillsOffer = user.skills_offer?.filter(Boolean) ?? [];
  const skillsWant = user.skills_want?.filter(Boolean) ?? [];
  const interestShown =
    variant === "village" ? interests.slice(0, 3) : interests;
  const interestMore =
    variant === "village" ? Math.max(0, interests.length - 3) : 0;
  const offerShown = skillsOffer.slice(0, 3);
  const offerMore = Math.max(0, skillsOffer.length - 3);
  const wantShown = skillsWant.slice(0, 3);
  const wantMore = Math.max(0, skillsWant.length - 3);
  const genderLabel = resolveLegacyLabel(user.gender, GENDER_OPTIONS);
  const regionLabel = resolveLegacyLabel(
    user.region,
    REGION_OPTIONS,
    LEGACY_REGION_MAP,
  );
  const offlineLabel = resolveOfflineOkLabel(user.offline_ok);

  const shellClass = cn(
    "block w-full cursor-pointer rounded-2xl text-left outline-none transition-[transform] duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet-500/50",
    perfectMatch ? "p-[2px] perfect-match-market-shell" : "",
    className,
  );
  const frameClass = cn(
    "block w-full bg-gradient-to-b from-slate-950/95 via-violet-950/35 to-slate-950/95 p-4 shadow-xl backdrop-blur-sm",
    perfectMatch ? "rounded-[0.9375rem]" : "",
  );

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={shellClass}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
      >
        <LevelFrame level={user.level} className={frameClass}>
          <div className="flex gap-4">
            {user.avatar_url ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element -- 頭像可能為任意 HTTPS 網址 */}
                <img
                  src={user.avatar_url}
                  alt={user.nickname}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                <span className="text-sm font-medium text-white">
                  {user.nickname?.[0] ?? "?"}
                </span>
              </div>
            )}

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
                {variant === "village" ? (
                  <div className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-violet-400/90" />
                    <dt className="sr-only">性別</dt>
                    <dd>{genderLabel}</dd>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-400/90" />
                  <dt className="sr-only">地區</dt>
                  <dd className="truncate">{regionLabel}</dd>
                </div>
                {variant === "village" ? (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">線下意願</dt>
                    <dd className="truncate text-slate-400/90">{offlineLabel}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <Separator className="my-3 bg-amber-900/35" />

          {variant === "market" ? (
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-amber-400/90">
                  我能教
                </p>
                {offerShown.length === 0 ? (
                  <p className="text-xs text-muted-foreground">尚未標記</p>
                ) : (
                  <ul className="flex flex-wrap items-center gap-1.5">
                    {offerShown.map((tag) => (
                      <li key={tag}>
                        <span className="inline-flex items-center rounded-md border border-amber-500/50 bg-amber-950/50 px-2 py-0.5 text-xs font-medium text-amber-100/95">
                          {tag}
                        </span>
                      </li>
                    ))}
                    {offerMore > 0 ? (
                      <li>
                        <span className="text-xs font-medium text-amber-200/80">
                          +{offerMore}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-sky-400/90">
                  我想學
                </p>
                {wantShown.length === 0 ? (
                  <p className="text-xs text-muted-foreground">尚未標記</p>
                ) : (
                  <ul className="flex flex-wrap items-center gap-1.5">
                    {wantShown.map((tag) => (
                      <li key={tag}>
                        <span className="inline-flex items-center rounded-md border border-sky-500/45 bg-sky-950/40 px-2 py-0.5 text-xs font-medium text-sky-100/95">
                          {tag}
                        </span>
                      </li>
                    ))}
                    {wantMore > 0 ? (
                      <li>
                        <span className="text-xs font-medium text-sky-200/80">
                          +{wantMore}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-violet-400/85">
                興趣
              </p>
              {interests.length === 0 ? (
                <p className="text-xs text-muted-foreground">尚未標記興趣</p>
              ) : (
                <ul className="flex flex-wrap items-center gap-1.5">
                  {interestShown.map((tag) => (
                    <li key={tag}>
                      <span className="tag-gold">{tag}</span>
                    </li>
                  ))}
                  {interestMore > 0 ? (
                    <li>
                      <span className="text-xs font-medium text-violet-300/85">
                        +{interestMore}
                      </span>
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          )}
        </LevelFrame>
      </div>
      <UserDetailModal
        user={user}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
