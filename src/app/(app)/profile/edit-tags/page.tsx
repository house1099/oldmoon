import { redirect } from "next/navigation";
import { getAuthStatus } from "@/services/auth.service";
import { EditTagsClient } from "./edit-tags-client";

export default async function EditTagsPage() {
  const auth = await getAuthStatus();

  if (auth.kind === "unauthenticated") {
    redirect("/login?next=/profile/edit-tags");
  }
  if (auth.kind === "needs_profile") {
    redirect("/register/profile");
  }
  if (auth.kind === "banned") {
    redirect("/login?error=banned");
  }

  const p = auth.profile;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 bg-zinc-950 p-4 pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom,0px)))] pt-[max(3rem,env(safe-area-inset-top,0px))]">
      <EditTagsClient
        key={p.updated_at}
        initialInterests={p.interests ?? []}
        initialSkillsOffer={p.skills_offer ?? []}
        initialSkillsWant={p.skills_want ?? []}
      />
    </div>
  );
}
