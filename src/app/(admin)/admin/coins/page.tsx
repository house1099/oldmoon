import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import CoinsAdminClient from "./coins-admin-client";

export default async function AdminCoinsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await findProfileById(user.id);
  if (profile?.role !== "master") redirect("/admin");
  return <CoinsAdminClient />;
}
