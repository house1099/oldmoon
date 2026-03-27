import { InterestsClient } from "./interests-client";
import { getTagLimitsAction } from "@/services/system-settings.action";

export default async function InterestsPage() {
  const { interestsMax } = await getTagLimitsAction();
  return <InterestsClient interestsMax={interestsMax} />;
}
