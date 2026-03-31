import { redirect } from "next/navigation";
import { getAuthStatus } from "@/services/auth.service";
import {
  getMyStreakAction,
  getStreakRewardSettingsAction,
} from "@/services/daily-checkin.action";
import { findEquippedRewardLabels } from "@/lib/repositories/server/rewards.repository";
import { getMessageLimitsAction } from "@/services/system-settings.action";
import HomePageClient from "./home-page-client";

function HomeFramePreloadLinks({ hrefs }: { hrefs: string[] }) {
  if (hrefs.length === 0) return null;
  return (
    <>
      {hrefs.map((href) => (
        <link key={href} rel="preload" href={href} as="image" />
      ))}
    </>
  );
}

export default async function HomePage() {
  const [authStatus, streakData, streakSettings, { moodMax }] =
    await Promise.all([
      getAuthStatus(),
      getMyStreakAction(),
      getStreakRewardSettingsAction(),
      getMessageLimitsAction(),
    ]);

  if (authStatus.kind === "unauthenticated") {
    redirect("/login");
  }
  if (authStatus.kind === "needs_profile") {
    redirect("/register/profile");
  }
  if (authStatus.kind === "banned") {
    redirect("/login?error=banned");
  }
  if (authStatus.kind === "pending") {
    redirect("/register/pending");
  }

  const equipped = await findEquippedRewardLabels(authStatus.profile.id);
  const preloadImageUrls = [
    equipped.equippedTitleImageUrl,
    equipped.equippedAvatarFrameImageUrl,
    equipped.equippedCardFrameImageUrl,
  ].filter((u): u is string => Boolean(u?.trim()));

  return (
    <>
      <HomeFramePreloadLinks hrefs={preloadImageUrls} />
      <HomePageClient
        moodMax={moodMax}
        initialProfile={authStatus.profile}
        initialStreak={streakData}
        initialStreakSettings={streakSettings}
        preloadImageUrls={preloadImageUrls}
      />
    </>
  );
}
