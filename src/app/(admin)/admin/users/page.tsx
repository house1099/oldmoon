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

  return <UsersClient initialData={initialData} initialFilter={filter} />;
}
