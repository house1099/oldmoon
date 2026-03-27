import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { getUsersAction } from "@/services/admin.action";
import UsersClient from "./users-client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = searchParams.filter ?? "";

  let initialStatus = "";
  if (filter === "pending") initialStatus = "pending";
  else if (filter === "active") initialStatus = "active";

  const result = await getUsersAction({
    page: 1,
    pageSize: 20,
    status: initialStatus || undefined,
  });
  const initialData = result.ok ? result.data : { users: [], total: 0 };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let viewerRole: "master" | "moderator" | "member" = "member";
  if (user) {
    const p = await findProfileById(user.id);
    if (p?.role === "master" || p?.role === "moderator") {
      viewerRole = p.role;
    }
  }

  return (
    <UsersClient
      initialData={initialData}
      initialFilter={filter}
      viewerRole={viewerRole}
    />
  );
}
