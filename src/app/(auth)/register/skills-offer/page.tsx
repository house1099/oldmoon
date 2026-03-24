import { redirect } from "next/navigation";

/** 舊 Step4 路徑：已合併至 **`/register/interests`**。 */
export default function SkillsOfferRedirectPage() {
  redirect("/register/interests");
}
