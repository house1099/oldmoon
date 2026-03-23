import { getAuthStatus } from "@/services/auth.service";
import { GuildProfileHome } from "@/components/profile/guild-profile-home";

export default async function AppHomePage() {
  const auth = await getAuthStatus();

  if (auth.kind !== "authenticated") {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4 pb-24 pt-8">
      <GuildProfileHome
        key={auth.profile.updated_at}
        profile={auth.profile}
      />
    </div>
  );
}
