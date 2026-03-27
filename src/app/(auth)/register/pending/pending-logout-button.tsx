"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PendingLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 active:scale-[0.99]"
    >
      登出
    </button>
  );
}
