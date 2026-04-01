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

  const shouldShowBase = useMemo(() => {
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

  const visible =
    shouldShowBase && settings && (!isDismissedForCurrentTitle || settings.force);

  const handleDismiss = useCallback(() => {
    if (!settings || settings.force) return;
    writeStoredDismissTitle(settings.title);
    setDismissedTitle(settings.title);
  }, [settings]);

  const goFill = useCallback(() => {
    router.push("/?accountSettings=profileChange");
  }, [router]);

  if (!visible || !settings) return null;

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
        onClick={goFill}
        className="shrink-0 rounded-full bg-violet-500/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-400/90"
      >
        前往填寫 ›
      </button>
    </div>
  );
}
