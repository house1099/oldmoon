import { getUsersAction } from "@/services/admin.action";
import UsersClient from "./users-client";

export default async function AdminUsersPage() {
  const result = await getUsersAction({ page: 1, pageSize: 20 });
  const initialData = result.ok
    ? result.data
    : { users: [], total: 0 };

  return <UsersClient initialData={initialData} />;
}
