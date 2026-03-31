"use client";

import { useState } from "react";
import {
  INTEREST_TAG_OPTIONS,
  LEGACY_REGION_MAP,
  REGION_OPTIONS,
  resolveLegacyLabel,
} from "@/lib/constants/adventurer-questionnaire";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { cn } from "@/lib/utils";
import { getRoleDisplay } from "@/lib/utils/role-display";
import { UserDetailModal } from "@/components/modals/UserDetailModal";
import { MasterAvatarShell } from "@/components/ui/MasterAvatarShell";
import type { ShopFrameLayout } from "@/lib/utils/avatar-frame-layout";
import type { CardDecorationConfig } from "@/lib/utils/card-decoration";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { LevelCardEffect } from "@/components/ui/LevelCardEffect";
import { CardDecorationWrapper } from "@/components/ui/CardDecorationWrapper";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { TitleBadgeRow } from "@/components/ui/title-badge-row";

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

export type UserCardProps = {
  user: UserRow & {
    equippedTitle?: string | null;
    equippedTitleImageUrl?: string | null;
    equippedAvatarFrameEffectKey?: string | null;
    equippedAvatarFrameImageUrl?: string | null;
    equippedAvatarFrameLayout?: ShopFrameLayout | null;
    equippedCardFrameEffectKey?: string | null;
    equippedCardFrameImageUrl?: string | null;
    equippedCardFrameLayout?: ShopFrameLayout | null;
    /** 若未傳，會由既有 equippedCardFrame* 組出 */
    cardDecoration?: CardDecorationConfig | null;
  };
  className?: string;
  /** 技能市集：命定師徒時顯示光暈與標籤 */
  perfectMatch?: boolean;
  variant?: "village" | "market";
  /** 未提供時，點擊改為開啟詳情 Modal */
  onClick?: () => void;
};

export function UserCard({
  user,
  className,
  perfectMatch = false,
  variant = "village",
  onClick,
}: UserCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const isPerfectMatch = perfectMatch;
  const isMoodActive = user.mood_at
    ? Date.now() - new Date(user.mood_at).getTime() < 24 * 60 * 60 * 1000
    : false;
  const { crown, nameClass } = getRoleDisplay(user.role);
  const regionLabel = resolveLegacyLabel(
    user.region,
    REGION_OPTIONS,
    LEGACY_REGION_MAP,
  );

  /** 僅明確 true 顯示可面交（與問卷 offline_ok 一致） */
  const offlineOk = user.offline_ok === true;

  const handleActivate = () => {
    if (onClick) {
      onClick();
    } else {
      setDetailOpen(true);
    }
  };

  const moodText = user.mood?.trim() ?? "";
  const shouldTruncateMood = moodText.length > 15;
  const moodPreview = shouldTruncateMood ? `${moodText.slice(0, 15)}...` : moodText;
  const moodTime = user.mood_at
    ? new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(user.mood_at))
    : "";

  const cardDecoration: CardDecorationConfig =
    user.cardDecoration ?? {
      cardFrameImageUrl: user.equippedCardFrameImageUrl,
      cardFrameEffectKey: user.equippedCardFrameEffectKey,
      cardFrameLayout: user.equippedCardFrameLayout ?? null,
    };

  const showEquippedTitle =
    Boolean(user.equippedTitle?.trim()) ||
    Boolean(user.equippedTitleImageUrl?.trim());

  return (
    <>
      <LevelCardEffect
        level={Number(user.level) || 1}
        role={user.role}
        className={cn("cursor-pointer overflow-visible", className)}
      >
        <CardDecorationWrapper decoration={cardDecoration}>
          <div
            role="button"
            tabIndex={0}
            onClick={handleActivate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleActivate();
              }
            }}
            className="relative overflow-visible rounded-2xl bg-zinc-900/60 p-4 pt-5 transition-all duration-200 hover:bg-zinc-900/80 active:scale-[0.99]"
          >
        {variant === "market" && isPerfectMatch ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            aria-hidden
          />
        ) : null}

        <div className="flex items-start gap-3">
          <div className="relative shrink-0 overflow-visible">
            <MasterAvatarShell
              role={user.role}
              size={56}
              src={user.avatar_url}
              nickname={user.nickname}
              frameImageUrl={user.equippedAvatarFrameImageUrl}
              frameEffectKey={user.equippedAvatarFrameEffectKey}
              frameLayout={user.equippedAvatarFrameLayout ?? null}
            >
              <span
                className={cn(
                  "absolute bottom-0.5 right-0.5 z-[15] h-3 w-3 rounded-full border-2 border-zinc-900",
                  user.activity_status === "active"
                    ? "bg-emerald-500"
                    : "bg-zinc-600",
                )}
                aria-hidden
              />
            </MasterAvatarShell>
          </div>

          <div className="min-w-0 flex-1 pl-1">
            <div className="flex w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {crown ? (
                  <span className="text-sm leading-none" aria-hidden>
                    {crown}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "truncate text-[15px] font-semibold leading-tight",
                    nameClass,
                  )}
                >
                  {user.nickname}
                </span>
                {user.activity_status === "resting" ? (
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] leading-none text-zinc-500">
                    💤 休息中
                  </span>
                ) : null}
              </div>
              <LevelBadge level={user.level} className="shrink-0" />
              {variant === "market" && isPerfectMatch ? (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-600 to-orange-500 px-2.5 py-1 text-[10px] font-medium text-white">
                  ⚔️ 命定師徒
                </span>
              ) : null}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <div
                className="flex min-h-[26px] min-w-0 max-w-[min(100%,12rem)] shrink-0 items-center justify-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-400"
                title={regionLabel}
              >
                <span className="truncate">
                  📍 {user.region?.trim() ? regionLabel : "未知"}
                </span>
              </div>
              {user.gender === "male" ? (
                <div className="flex shrink-0 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[11px] font-semibold text-sky-400">
                  ♂ 男
                </div>
              ) : user.gender === "female" ? (
                <div className="flex shrink-0 items-center justify-center rounded-full border border-pink-400/25 bg-pink-400/10 px-2 py-0.5 text-[11px] font-semibold text-pink-400">
                  ♀ 女
                </div>
              ) : null}
              {offlineOk ? (
                <div className="flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                  🤝 可面交
                </div>
              ) : (
                <div className="flex shrink-0 items-center justify-center rounded-full border border-green-400/20 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-400">
                  💻 僅線上
                </div>
              )}
            </div>

            {isMoodActive && user.mood ? (
              crown ? (
                <div className="mt-1.5 flex min-w-0 items-center gap-1">
                  <span
                    className="relative shrink-0 text-sm leading-none"
                    aria-hidden
                  >
                    <span className="invisible">{crown}</span>
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-violet-400">
                      ✨
                    </span>
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-violet-500/20 bg-violet-950/50 px-2.5 py-0.5">
                    <span className="truncate text-[11px] text-violet-200">
                      {moodPreview}
                    </span>
                    {shouldTruncateMood ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoodOpen(true);
                        }}
                        className="shrink-0 text-[10px] text-violet-300 hover:text-violet-100"
                      >
                        展開
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 inline-flex max-w-[90%] items-center gap-1 rounded-full border border-violet-500/20 bg-violet-950/50 px-2.5 py-0.5">
                  <span className="shrink-0 text-[10px] text-violet-400">✨</span>
                  <span className="truncate text-[11px] text-violet-200">
                    {moodPreview}
                  </span>
                  {shouldTruncateMood ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoodOpen(true);
                      }}
                      className="shrink-0 text-[10px] text-violet-300 hover:text-violet-100"
                    >
                      展開
                    </button>
                  ) : null}
                </div>
              )
            ) : null}
          </div>
        </div>

        <div className="mt-3 border-t border-zinc-800/50" />

        <div className="mt-2.5 space-y-1.5">
          {variant === "village" ? (
            <div className="flex items-center justify-between gap-x-2 gap-y-1.5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {(user.interests ?? []).slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-violet-700/30 bg-violet-950/60 px-2.5 py-0.5 text-[11px] text-violet-300"
                  >
                    {tagLabel(tag)}
                  </span>
                ))}
                {(user.interests ?? []).length > 4 ? (
                  <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-500">
                    +{(user.interests ?? []).length - 4}
                  </span>
                ) : null}
                {(user.interests ?? []).length === 0 ? (
                  <span className="text-xs italic text-zinc-600">
                    尚未設定興趣
                  </span>
                ) : null}
              </div>
              {showEquippedTitle ? (
                <div className="pointer-events-none shrink-0 self-center">
                  <TitleBadgeRow
                    title={user.equippedTitle}
                    imageUrl={user.equippedTitleImageUrl}
                    size="card"
                    className="shrink-0 drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)]"
                    pillClassName="border border-white/[0.12] bg-zinc-800/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-violet-500/15"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {variant === "market" ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                {(user.skills_offer ?? []).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="shrink-0 text-[10px] text-amber-500">
                      能教
                    </span>
                    {(user.skills_offer ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-700/30 bg-amber-950/50 px-2.5 py-0.5 text-[11px] text-amber-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {(user.skills_offer ?? []).length > 3 ? (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
                        +{(user.skills_offer ?? []).length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {(user.skills_want ?? []).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="shrink-0 text-[10px] text-sky-500">
                      想學
                    </span>
                    {(user.skills_want ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-sky-700/30 bg-sky-950/50 px-2.5 py-0.5 text-[11px] text-sky-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {(user.skills_want ?? []).length > 3 ? (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
                        +{(user.skills_want ?? []).length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {(user.skills_offer ?? []).length === 0 &&
                (user.skills_want ?? []).length === 0 ? (
                  <span className="text-xs italic text-zinc-600">
                    尚未設定技能
                  </span>
                ) : null}
              </div>
              {showEquippedTitle ? (
                <div className="pointer-events-none shrink-0 self-center">
                  <TitleBadgeRow
                    title={user.equippedTitle}
                    imageUrl={user.equippedTitleImageUrl}
                    size="card"
                    className="shrink-0 drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)]"
                    pillClassName="border border-white/[0.12] bg-zinc-800/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-violet-500/15"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
          </div>
        </CardDecorationWrapper>
      </LevelCardEffect>

      <UserDetailModal
        user={user}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <Dialog open={moodOpen} onOpenChange={setMoodOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm">
          <DialogTitle className="sr-only">今日心情</DialogTitle>
          <div className="p-5">
            <p className="text-xs text-violet-400 mb-2">✨ 今日心情</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{moodText}</p>
            <p className="text-xs text-zinc-600 mt-3">{moodTime}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
