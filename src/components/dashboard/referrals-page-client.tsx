"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferralShare } from "@/components/dashboard/referral-share";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardRouteLoading } from "@/components/dashboard/dashboard-route-loading";
import { useDashboardSession } from "@/lib/dashboard/use-dashboard-session";
import { formatDate } from "@/lib/utils";

interface ReferralRow {
  id: string;
  reward_points: number;
  created_at: string;
  referred: { full_name?: string | null; email?: string } | null;
}

export function ReferralsPageClient() {
  const { supabase, userId, ready } = useDashboardSession();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || !supabase || !userId) return;

    let cancelled = false;
    void Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", userId).single(),
      supabase
        .from("referrals")
        .select("*, referred:profiles!referrals_referred_id_fkey(full_name, email)")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false }),
    ]).then(([profileRes, referralsRes]) => {
      if (cancelled) return;
      setReferralCode(profileRes.data?.referral_code ?? "");
      setReferrals((referralsRes.data ?? []) as ReferralRow[]);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [ready, supabase, userId]);

  if (!loaded) {
    return <DashboardRouteLoading cards={3} />;
  }

  const totalPoints = referrals.reduce((sum, r) => sum + r.reward_points, 0);

  return (
    <div>
      <DashboardPageHeader
        title="Referral Program"
        description="Share your link and earn VIP points"
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold gradient-text">{referrals.length}</p>
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
            <ReferralShare code={referralCode} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {ref.referred?.full_name || "User"}
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
