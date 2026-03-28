import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import AdminPrizesClient from "./prizes-client";

/** 等同 requireRole(['master'])：獎池管理僅 master 可進入 */
export default async function AdminPrizesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await findProfileById(user.id);
  if (profile?.role !== "master") redirect("/admin");
  return <AdminPrizesClient />;
}
