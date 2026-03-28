import { getMessageLimitsAction } from "@/services/system-settings.action";
import { getActiveBroadcastsAction } from "@/services/rewards.action";
import HomePageClient from "./home-page-client";

export default async function HomePage() {
  const { moodMax } = await getMessageLimitsAction();
  const activeBroadcasts = await getActiveBroadcastsAction();
  return (
    <HomePageClient moodMax={moodMax} activeBroadcasts={activeBroadcasts} />
  );
}
