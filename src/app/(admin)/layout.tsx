import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { findModeratorPermissions } from "@/lib/repositories/server/admin.repository";
import { AdminShell } from "@/app/(admin)/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await findProfileById(user.id);
  if (!profile || !["master", "moderator"].includes(profile.role ?? "")) {
    redirect("/");
  }

  const permissions = profile.role === "moderator"
    ? await findModeratorPermissions(user.id)
    : null;

  return (
    <AdminShell
      role={profile.role ?? "moderator"}
      nickname={profile.nickname ?? ""}
      permissions={permissions}
    >
      {children}
    </AdminShell>
  );
}
