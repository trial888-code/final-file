import { createClient } from "@/lib/supabase/server";
import { AdminUsersList } from "@/components/admin/admin-users-list";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Search users, manage roles, and start conversations
        </p>
      </div>

      <AdminUsersList users={users ?? []} />
    </div>
  );
}
