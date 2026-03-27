"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
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
import { LevelBadge } from "@/components/ui/LevelBadge";
import { LevelCardEffect } from "@/components/ui/LevelCardEffect";

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

export type UserCardProps = {
  user: UserRow;
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

  const handleActivate = () => {
    if (onClick) {
      onClick();
    } else {
      setDetailOpen(true);
    }
  };

  return (
    <>
      <LevelCardEffect
        level={Number(user.level) || 1}
        role={user.role}
        className={cn("cursor-pointer overflow-visible", className)}
      >
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
          className="relative overflow-visible rounded-2xl bg-zinc-900/60 p-4 transition-all duration-200 hover:bg-zinc-900/80 active:scale-[0.99]"
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

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
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
              <LevelBadge level={user.level} />
              {user.activity_status === "resting" ? (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] leading-none text-zinc-500">
                  💤 休息中
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-zinc-500" />
              <span className="truncate text-xs text-zinc-400">
                {regionLabel}
              </span>
            </div>

            {isMoodActive && user.mood ? (
              <div className="mt-1.5 inline-flex max-w-[90%] items-center gap-1 rounded-full border border-violet-500/20 bg-violet-950/50 px-2.5 py-0.5">
                <span className="shrink-0 text-[10px] text-violet-400">✨</span>
                <span className="truncate text-[11px] text-violet-200">
                  {user.mood}
                </span>
              </div>
            ) : null}
          </div>

          {variant === "market" && isPerfectMatch ? (
            <div className="shrink-0">
              <span className="whitespace-nowrap rounded-full bg-gradient-to-r from-amber-600 to-orange-500 px-2.5 py-1 text-[10px] font-medium text-white">
                ⚔️ 命定師徒
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-3 border-t border-zinc-800/50" />

        <div className="mt-2.5 space-y-1.5">
          {variant === "village" ? (
            <div className="flex flex-wrap gap-1.5">
              {(user.interests ?? []).slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-violet-700/30 bg-violet-950/60 px-2.5 py-0.5 text-[11px] text-violet-300"
                >
                  {tagLabel(tag)}
                </span>
              ))}
              {(user.interests ?? []).length > 3 ? (
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-500">
                  +{(user.interests ?? []).length - 3}
                </span>
              ) : null}
              {(user.interests ?? []).length === 0 ? (
                <span className="text-xs italic text-zinc-600">
                  尚未設定興趣
                </span>
              ) : null}
            </div>
          ) : null}

          {variant === "market" ? (
            <div className="space-y-1">
              {(user.skills_offer ?? []).length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="shrink-0 text-[10px] text-amber-500">
                    能教
                  </span>
                  {(user.skills_offer ?? []).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-700/30 bg-amber-950/50 px-2.5 py-0.5 text-[11px] text-amber-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {(user.skills_offer ?? []).length > 2 ? (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
                      +{(user.skills_offer ?? []).length - 2}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {(user.skills_want ?? []).length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="shrink-0 text-[10px] text-sky-500">
                    想學
                  </span>
                  {(user.skills_want ?? []).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-sky-700/30 bg-sky-950/50 px-2.5 py-0.5 text-[11px] text-sky-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {(user.skills_want ?? []).length > 2 ? (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
                      +{(user.skills_want ?? []).length - 2}
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
          ) : null}
        </div>
        </div>
      </LevelCardEffect>

      <UserDetailModal
        user={user}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
