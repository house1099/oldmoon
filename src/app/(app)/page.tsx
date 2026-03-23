import { getAuthStatus } from "@/services/auth.service";
import { GuildProfileHome } from "@/components/profile/guild-profile-home";

export default async function AppHomePage() {
  const auth = await getAuthStatus();

  if (auth.kind !== "authenticated") {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center gap-4 p-4 pt-8 pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom,0px)))]">
      <GuildProfileHome
        key={auth.profile.updated_at}
        profile={auth.profile}
      />
    </div>
  );
}
