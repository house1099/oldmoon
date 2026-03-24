import { redirect } from "next/navigation";

/** 技能選填已合併至 **`/register/interests`**。 */
export default function SkillsPage() {
  redirect("/register/interests");
}
