import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthStatus } from "@/services/auth.service";
import ProfileChangesClient from "./profile-changes-client";

export default async function ProfileChangesPage() {
  const auth = await getAuthStatus();
  if (auth.kind !== "authenticated") {
    redirect("/admin");
  }
  const role = auth.profile.role ?? "";
  if (!["master", "moderator"].includes(role)) {
    redirect("/admin");
  }
  return (
    <Suspense fallback={null}>
      <ProfileChangesClient />
    </Suspense>
  );
}
