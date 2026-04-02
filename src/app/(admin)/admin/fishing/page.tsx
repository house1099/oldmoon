import { redirect } from "next/navigation";
import { getAuthStatus } from "@/services/auth.service";
import { getFishingAdminSettingsAction } from "@/services/admin.action";
import FishingAdminClient from "./fishing-admin-client";

export default async function FishingAdminPage() {
  const auth = await getAuthStatus();
  if (auth.kind !== "authenticated") {
    redirect("/admin");
  }
  if (!["master", "moderator"].includes(auth.profile?.role ?? "")) {
    redirect("/admin");
  }
  const role = auth.profile?.role ?? "";
  const settingsRes = await getFishingAdminSettingsAction();
  const initialSettings = settingsRes.ok
    ? settingsRes.data
    : {
        fishing_enabled: true,
        fishing_age_max: 10,
        fishing_rod_cooldown_basic_minutes: 1440,
        fishing_rod_cooldown_mid_minutes: 720,
        fishing_rod_cooldown_high_minutes: 480,
        matchmaker_lock_diet: false,
        matchmaker_lock_smoking: false,
        matchmaker_lock_pets: false,
        matchmaker_lock_single_parent: false,
        matchmaker_lock_fertility: false,
        matchmaker_lock_marriage: false,
        matchmaker_lock_zodiac: false,
        matchmaker_lock_v1: false,
        matchmaker_lock_v3: false,
        matchmaker_lock_v4: false,
        matchmaker_v_max_diff: 2,
      };

  return (
    <FishingAdminClient
      initialSettings={initialSettings}
      canAccessShopAdmin={role === "master"}
    />
  );
}
