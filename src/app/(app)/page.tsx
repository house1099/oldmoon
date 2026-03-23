import { getAuthStatus } from "@/services/auth.service";

export default async function AppHomePage() {
  const auth = await getAuthStatus();

  if (auth.kind !== "authenticated") {
    return null;
  }

  const name = auth.profile.nickname;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <p className="text-center font-serif text-xl font-medium tracking-wide text-amber-100/95 sm:text-2xl">
        🐱 歡迎回到公會，冒險者 {name}！
      </p>
    </main>
  );
}
