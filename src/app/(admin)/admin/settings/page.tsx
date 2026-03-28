import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import AdminSettingsClient from "./settings-client";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await findProfileById(user.id) : null;
  const isMaster = profile?.role === "master";
  return <AdminSettingsClient isMaster={isMaster} />;
}
