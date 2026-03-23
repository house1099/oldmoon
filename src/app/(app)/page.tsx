import { getAuthStatus } from "@/services/auth.service";
import { GuildProfileHome } from "@/components/profile/guild-profile-home";

export default async function AppHomePage() {
  const auth = await getAuthStatus();

  if (auth.kind !== "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-violet-950/25 to-black">
      <GuildProfileHome
        key={auth.profile.updated_at}
        profile={auth.profile}
      />
    </div>
  );
}
