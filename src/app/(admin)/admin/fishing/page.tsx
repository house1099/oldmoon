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
      };

  return (
    <FishingAdminClient
      initialSettings={initialSettings}
      canAccessShopAdmin={role === "master"}
    />
  );
}
