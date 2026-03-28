import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import ShopAdminClient from "./shop-admin-client";

export default async function AdminShopPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await findProfileById(user.id);
  if (profile?.role !== "master") redirect("/admin");
  return <ShopAdminClient />;
}
