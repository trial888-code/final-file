import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferralShare } from "@/components/dashboard/referral-share";
import { formatDate } from "@/lib/utils";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user!.id)
    .single();

  const { data: referrals } = await supabase
    .from("referrals")
    .select("*, referred:profiles!referrals_referred_id_fkey(full_name, email)")
    .eq("referrer_id", user!.id)
    .order("created_at", { ascending: false });

  const totalPoints = referrals?.reduce((sum, r) => sum + r.reward_points, 0) || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">Share your link and earn VIP points</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold gradient-text">{referrals?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold gradient-text">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">Points Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <ReferralShare code={profile?.referral_code || ""} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals && referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">
                      {(ref.referred as { full_name?: string; email?: string })?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(ref.created_at)}</p>
                  </div>
                  <span className="text-sm text-primary font-semibold">+{ref.reward_points} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No referrals yet. Share your link to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
