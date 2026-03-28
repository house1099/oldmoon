import { getMessageLimitsAction } from "@/services/system-settings.action";
import HomePageClient from "./home-page-client";

export default async function HomePage() {
  const { moodMax } = await getMessageLimitsAction();
  return <HomePageClient moodMax={moodMax} />;
}
