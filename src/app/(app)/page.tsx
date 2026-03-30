import { redirect } from "next/navigation";
import { getAuthStatus } from "@/services/auth.service";
import {
  getMyStreakAction,
  getStreakRewardSettingsAction,
} from "@/services/daily-checkin.action";
import { getMessageLimitsAction } from "@/services/system-settings.action";
import HomePageClient from "./home-page-client";

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

  return (
    <HomePageClient
      moodMax={moodMax}
      initialProfile={authStatus.profile}
      initialStreak={streakData}
      initialStreakSettings={streakSettings}
    />
  );
}
