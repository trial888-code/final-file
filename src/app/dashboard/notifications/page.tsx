import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Stay updated on your account activity</p>
      </div>

      <div className="space-y-3">
        {notifications && notifications.length > 0 ? (
          notifications.map((notif) => (
            <Card key={notif.id} className={!notif.is_read ? "border-primary/30" : ""}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{notif.title}</h3>
                    {!notif.is_read && <Badge variant="default">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatRelativeTime(notif.created_at)}
                </span>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No notifications yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
