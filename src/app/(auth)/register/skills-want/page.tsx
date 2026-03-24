import { redirect } from "next/navigation";

/** 舊 Step5 路徑：已合併至 **`/register/skills`**。 */
export default function SkillsWantRedirectPage() {
  redirect("/register/skills");
}
