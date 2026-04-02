"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import useSWR from "swr";
import { useMyProfile } from "@/hooks/useMyProfile";
import { SWR_KEYS } from "@/lib/swr/keys";
import { getProfileBannerSettingsAction } from "@/services/profile-change.action";
import { cn } from "@/lib/utils";

const DISMISS_STORAGE_KEY = "profile_banner_dismissed_v1";

const MATCHMAKER_FIELD_DEFS: { key: string; label: string }[] = [
  { key: "height_cm", label: "身高" },
  { key: "diet_type", label: "飲食習慣" },
  { key: "smoking_habit", label: "抽菸習慣" },
  { key: "my_pets", label: "寵物狀況" },
  { key: "fertility_self", label: "生育意願" },
  { key: "marriage_view", label: "婚姻觀念" },
  { key: "zodiac", label: "星座" },
  { key: "v1_money", label: "金錢觀" },
  { key: "v3_clingy", label: "黏人程度" },
  { key: "v4_conflict", label: "衝突處理" },
];

function readStoredDismissTitle(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DISMISS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredDismissTitle(title: string) {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, title);
  } catch {
    /* ignore */
  }
}

export function ProfileBanner() {
  const router = useRouter();
  const { profile } = useMyProfile();
  const [dismissedTitle, setDismissedTitle] = useState<string | null>(null);

  useEffect(() => {
    setDismissedTitle(readStoredDismissTitle());
  }, []);

  const { data: settings } = useSWR(
    SWR_KEYS.profileBannerSettings,
    getProfileBannerSettingsAction,
    { refreshInterval: 300_000, revalidateOnFocus: true },
  );

  const missingMatchmakerFields = useMemo(() => {
    if (!profile) return [];
    return MATCHMAKER_FIELD_DEFS.filter((f) => {
      const v = profile[f.key as keyof typeof profile];
      return v === null || v === undefined;
    });
  }, [profile]);

  const showMatchmakerBanner = Boolean(
    settings?.checkMatchmakerFields && missingMatchmakerFields.length > 0,
  );

  const shouldShowProfileBase = useMemo(() => {
    if (!settings?.enabled) return false;
    return (
      settings.force ||
      profile?.birth_year == null ||
      profile?.relationship_status == null
    );
  }, [
    settings?.enabled,
    settings?.force,
    profile?.birth_year,
    profile?.relationship_status,
  ]);

  const isDismissedForCurrentTitle =
    settings &&
    !settings.force &&
    dismissedTitle !== null &&
    dismissedTitle === settings.title;

  const showProfileBanner =
    Boolean(settings) &&
    shouldShowProfileBase &&
    (!isDismissedForCurrentTitle || Boolean(settings?.force));

  const visible = showMatchmakerBanner || showProfileBanner;

  const handleDismiss = useCallback(() => {
    if (!settings || settings.force) return;
    writeStoredDismissTitle(settings.title);
    setDismissedTitle(settings.title);
  }, [settings]);

  const goFillProfile = useCallback(() => {
    router.push("/?accountSettings=profileChange");
  }, [router]);

  const goMatchmakerSettings = useCallback(() => {
    router.push("/matchmaking?tab=settings");
  }, [router]);

  if (!visible || !settings) return null;

  if (showMatchmakerBanner) {
    const n = missingMatchmakerFields.length;
    const labels = missingMatchmakerFields.map((f) => f.label).join("、");
    return (
      <div
        className={cn(
          "fixed left-0 right-0 z-[48] flex min-h-14 items-center gap-2 border-t border-amber-500/40 bg-amber-950/90 px-3 py-2 backdrop-blur-xl",
          "bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] w-full",
        )}
        role="region"
        aria-label="月老配對資料補填"
      >
        <Bell className="size-5 shrink-0 text-amber-200" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-amber-50">
          <span className="font-medium">⚠️ 你有 {n} 個月老配對條件尚未填寫</span>
          <span className="mt-0.5 block truncate text-xs text-amber-200/90">
            缺少：{labels}
          </span>
        </p>
        <button
          type="button"
          onClick={goMatchmakerSettings}
          className="shrink-0 rounded-full bg-amber-500/80 px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-amber-400/90"
        >
          前往填寫 ›
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[48] flex h-14 items-center gap-2 border-t border-violet-400/40 bg-violet-950/90 px-3 backdrop-blur-xl",
        "bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] w-full",
      )}
      role="region"
      aria-label="資料補填通知"
    >
      <Bell className="size-5 shrink-0 text-violet-200" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-sm text-violet-100">
        {settings.title}
      </p>
      {!settings.force ? (
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1.5 text-violet-200 transition hover:bg-white/10"
          aria-label="關閉通知"
        >
          <X className="size-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={goFillProfile}
        className="shrink-0 rounded-full bg-violet-500/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-400/90"
      >
        前往填寫 ›
      </button>
    </div>
  );
}
