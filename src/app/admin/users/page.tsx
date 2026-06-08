import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "@/components/admin/user-actions";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">View and manage platform users</p>
      </div>

      <div className="space-y-3">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{user.full_name || "Unnamed"}</h3>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                  {user.is_suspended && <Badge variant="destructive">Suspended</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {user.vip_tier} &middot; {user.vip_points} pts &middot; Joined {formatDate(user.created_at)}
                </p>
              </div>
              <UserActions userId={user.id} role={user.role} isSuspended={user.is_suspended} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
