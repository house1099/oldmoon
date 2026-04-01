"use client";

import type { UserRow } from "@/lib/repositories/server/user.repository";
import { Suspense } from "react";
import { useMyProfile } from "@/hooks/useMyProfile";
import { GuildProfileHome } from "@/components/profile/guild-profile-home";
import { HomeParticlesBackground } from "@/components/effects/HomeParticlesBackground";
import { PwaInstallOverlay } from "@/components/shared/PwaInstallOverlay";
import type {
  getMyStreakAction,
  StreakRewardDay,
} from "@/services/daily-checkin.action";

export default function HomePageClient({
  moodMax,
  initialProfile,
  initialStreak,
  initialStreakSettings,
  preloadImageUrls,
}: {
  moodMax: number;
  initialProfile: UserRow;
  initialStreak: Awaited<ReturnType<typeof getMyStreakAction>>;
  initialStreakSettings: StreakRewardDay[];
  preloadImageUrls: string[];
}) {
  const { profile } = useMyProfile(
    initialProfile
      ? {
          fallbackData: initialProfile,
          revalidateOnMount: false,
          revalidateIfStale: false,
          revalidateOnFocus: false,
        }
      : undefined,
  );

  const effectiveProfile = profile ?? initialProfile;

  if (!initialProfile) {
    return (
      <div className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-4 p-4 pt-[max(3rem,env(safe-area-inset-top,0px))]">
        <HomeParticlesBackground />
        <div className="relative z-10 flex w-full flex-col gap-4">
          <HomePageSkeleton />
        </div>
      </div>
    );
  }

  if (!effectiveProfile) {
    return null;
  }

  return (
    <div className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center gap-4 p-4 pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom,0px)))] pt-[max(3rem,env(safe-area-inset-top,0px))]">
      <HomeParticlesBackground />
      <div className="relative z-10 flex w-full flex-col items-center gap-4">
        <Suspense fallback={null}>
          <GuildProfileHome
            profile={effectiveProfile}
            moodMax={moodMax}
            initialStreak={initialStreak}
            initialStreakSettings={initialStreakSettings}
            preloadImageUrls={preloadImageUrls}
          />
        </Suspense>
      </div>
      <PwaInstallOverlay />
    </div>
  );
}

function HomePageSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="glass-panel animate-pulse space-y-4 p-6">
        <div className="mx-auto h-24 w-24 rounded-full bg-zinc-800" />
        <div className="mx-auto h-4 w-32 rounded-full bg-zinc-800" />
        <div className="mx-auto h-3 w-48 rounded-full bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-800" />
      </div>
      <div className="animate-pulse space-y-3 rounded-3xl border border-violet-500/20 bg-violet-950/20 p-4">
        <div className="h-3 w-24 rounded-full bg-zinc-800" />
        <div className="h-16 w-full rounded-2xl bg-zinc-800" />
      </div>
      <div className="glass-panel animate-pulse space-y-3 p-4">
        <div className="h-3 w-16 rounded-full bg-zinc-800" />
        <div className="h-3 w-full rounded-full bg-zinc-800" />
        <div className="h-3 w-3/4 rounded-full bg-zinc-800" />
      </div>
    </div>
  );
}
