import { SkillsClient } from "./skills-client";
import { getTagLimitsAction } from "@/services/system-settings.action";

export default async function SkillsPage() {
  const { skillsMax } = await getTagLimitsAction();
  return <SkillsClient skillsMax={skillsMax} />;
}
