import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Coins,
  Inbox,
  LifeBuoy,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { adminDb } from "@/lib/actions/admin/core";
import {
  ADMIN_PROFILE_SELECT,
  profileDisplayName,
  profileHandle,
} from "@/lib/admin/spinora-profile";
import { requireStaff } from "@/lib/data/admin";
import { getDashboardStats } from "@/lib/data/admin-stats";

export default async function AdminOverviewPage() {
  const ctx = await requireStaff();
  const db = adminDb();

  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    stats,
    new7d,
    activePromos,
    pendingReferrals,
    recentSignups,
    recentTickets,
    fulfilledRequests,
  ] = await Promise.all([
    getDashboardStats(86_400_000),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    db.from("promotions").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("referrals").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select(ADMIN_PROFILE_SELECT)
      .order("created_at", { ascending: false })
      .limit(6),
    db.from("support_tickets").select("id, ticket_no, subject, status, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Overview"
        description={`Welcome back, ${ctx.email ?? "admin"}. Here's the pulse of Spinora.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={stats.totalUsers.toLocaleString()}
          delta={stats.newUsersInWindow}
          deltaLabel="today"
          icon={<Users />}
          accent="cyan"
        />
        <StatCard
          label="New this week"
          value={(new7d.count ?? 0).toLocaleString()}
          icon={<TrendingUp />}
          accent="emerald"
        />
        <StatCard
          label="Coins issued (24h)"
          value={stats.coinsIssuedInWindow.toLocaleString()}
          icon={<Coins />}
          accent="gold"
        />
        <StatCard
          label="Active promotions"
          value={(activePromos.count ?? 0).toLocaleString()}
          icon={<BadgePercent />}
          accent="purple"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tickets"
          value={stats.openTickets.toLocaleString()}
          icon={<LifeBuoy />}
          accent="cyan"
        />
        <StatCard
          label="Total referrals"
          value={(pendingReferrals.count ?? 0).toLocaleString()}
          icon={<UserPlus />}
          accent="purple"
        />
        <StatCard
          label="Pending requests"
          value={stats.pendingRequests.toLocaleString()}
          icon={<Inbox />}
          accent="gold"
        />
        <StatCard
          label="Completed deposits"
          value={(fulfilledRequests.count ?? 0).toLocaleString()}
          icon={<CheckCircle2 />}
          accent="emerald"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Newest members</h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-medium text-ws-cyan underline-offset-4 hover:underline"
            >
              All users
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-foreground/8">
            {(recentSignups.data ?? []).map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium">
                  {profileDisplayName(u)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {profileHandle(u)}
                  </span>
                </span>
                <time
                  dateTime={u.created_at}
                  className="text-xs text-muted-foreground"
                >
                  {formatDistanceToNow(new Date(u.created_at!), { addSuffix: true })}
                </time>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Latest tickets</h2>
            <Link
              href="/admin/support"
              className="inline-flex items-center gap-1 text-xs font-medium text-ws-cyan underline-offset-4 hover:underline"
            >
              Support inbox
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-foreground/8">
            {(recentTickets.data ?? []).length === 0 ? (
              <li className="py-2.5 text-sm text-muted-foreground">
                No tickets yet.
              </li>
            ) : (
              (recentTickets.data ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/admin/support/${t.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:text-ws-green-deep dark:text-ws-green"
                  >
                    <span className="tnum text-xs text-muted-foreground">
                      #{t.ticket_no}
                    </span>{" "}
                    {t.subject}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground uppercase">
                    {t.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
