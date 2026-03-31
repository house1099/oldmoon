import { redirect } from "next/navigation";
import { getAuthStatus } from "@/services/auth.service";
import MarketAdminClient from "./market-admin-client";

export default async function MarketAdminPage() {
  const auth = await getAuthStatus();
  if (auth.kind !== "authenticated") {
    redirect("/admin");
  }
  const role = auth.profile.role ?? "";
  if (!["master", "moderator"].includes(role)) {
    redirect("/admin");
  }
  return <MarketAdminClient role={role} />;
}
