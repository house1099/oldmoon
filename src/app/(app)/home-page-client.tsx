"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMyProfile } from "@/hooks/useMyProfile";
import { GuildProfileHome } from "@/components/profile/guild-profile-home";
import { HomeParticlesBackground } from "@/components/effects/HomeParticlesBackground";

export default function HomePageClient({ moodMax }: { moodMax: number }) {
  const router = useRouter();
  const { profile, isLoading } = useMyProfile();

  useEffect(() => {
    if (!isLoading && profile === null) {
      router.push("/login");
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return (
      <div className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-4 p-4 pt-[max(3rem,env(safe-area-inset-top,0px))]">
        <HomeParticlesBackground />
        <div className="relative z-10 flex w-full flex-col gap-4">
          <HomePageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center gap-4 p-4 pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom,0px)))] pt-[max(3rem,env(safe-area-inset-top,0px))]">
      <HomeParticlesBackground />
      <div className="relative z-10 flex w-full flex-col items-center gap-4">
        <GuildProfileHome profile={profile} moodMax={moodMax} />
      </div>
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
