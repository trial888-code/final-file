import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { VIP_TIERS } from "@/lib/constants";
import { Crown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function VipDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("vip_tier, vip_points")
    .eq("id", user!.id)
    .single();

  const currentIndex = VIP_TIERS.findIndex((t) => t.id === profile?.vip_tier);
  const nextTier = VIP_TIERS[currentIndex + 1];
  const progress = nextTier
    ? ((profile?.vip_points || 0) / nextTier.minPoints) * 100
    : 100;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Crown className="h-7 w-7 text-yellow-400" /> VIP Status
        </h1>
        <p className="text-muted-foreground">Track your VIP tier and benefits</p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Tier</p>
              <p className="text-3xl font-bold capitalize">{profile?.vip_tier}</p>
            </div>
            <Badge className="text-lg px-4 py-2">{profile?.vip_points || 0} pts</Badge>
          </div>
          <Progress value={Math.min(progress, 100)} className="mb-2" />
          {nextTier && (
            <p className="text-sm text-muted-foreground">
              {nextTier.minPoints - (profile?.vip_points || 0)} points until {nextTier.name}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {VIP_TIERS.map((tier) => {
          const isCurrent = tier.id === profile?.vip_tier;
          const isUnlocked = (profile?.vip_points || 0) >= tier.minPoints;
          return (
            <Card key={tier.id} className={cn(isCurrent && "ring-2 ring-primary")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{tier.name}</span>
                  {isCurrent && <Badge>Current</Badge>}
                  {!isCurrent && isUnlocked && <Badge variant="success">Unlocked</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
