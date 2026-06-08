import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Gamepad2, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { count: userCount },
    { count: requestCount },
    { count: pendingCount },
    { count: conversationCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("game_requests").select("*", { count: "exact", head: true }),
    supabase.from("game_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/chat">Open Customer Chat</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/requests">Manage Requests</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/users">Manage Users</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Total Users", value: userCount || 0 },
          { icon: Gamepad2, label: "Game Requests", value: requestCount || 0 },
          { icon: TrendingUp, label: "Pending Requests", value: pendingCount || 0 },
          { icon: MessageSquare, label: "Active Chats", value: conversationCount || 0 },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
