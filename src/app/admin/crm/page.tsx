import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  MessageCircle,
  Phone,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_PROFILE_SELECT,
  profileDisplayName,
  profileHandle,
  profileIsBanned,
  profileNum,
} from "@/lib/admin/spinora-profile";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "CRM" };

const PAGE_SIZE = 25;

const SEGMENTS = [
  { key: "all", label: "All Players" },
  { key: "new", label: "New (7d)" },
  { key: "active", label: "Active (7d)" },
  { key: "vip", label: "VIP" },
  { key: "banned", label: "Banned" },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

const CONTACT_ICONS: Record<string, typeof Phone> = {
  whatsapp: MessageCircle,
  telegram: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
};

function contactLink(method: string, value: string): string {
  const v = value.replace(/\D/g, "");
  if (method === "whatsapp") return `https://wa.me/${v}`;
  if (method === "telegram") return `https://t.me/${value.replace(/^@/, "")}`;
  return "#";
}

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; page?: string }>;
}) {
  await requirePermission("users.manage");
  const params = await searchParams;
  const segment = (SEGMENTS.find((s) => s.key === params.segment)?.key ?? "all") as SegmentKey;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const db = adminDb();
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // ── Global stats (always unfiltered) ──────────────────────────────────────
  const [totalResult, newResult, activeResult, vipUserIdsResult, fulfilledAmountsResult] =
    await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
      db.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", since7d),
      db.from("vip_status").select("user_id"),
      db.from("deposit_requests").select("amount").eq("status", "completed"),
    ]);

  const totalPlayers = totalResult.count ?? 0;
  const newThisWeek = newResult.count ?? 0;
  const activeLast7d = activeResult.count ?? 0;
  const vipUserIds = (vipUserIdsResult.data ?? []).map((r) => r.user_id);
  const totalFulfilled = (fulfilledAmountsResult.data ?? []).reduce(
    (s, r) => s + Number(r.amount ?? 0),
    0
  );

  let profileQuery = db
    .from("profiles")
    .select(ADMIN_PROFILE_SELECT, {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (segment === "new") profileQuery = profileQuery.gte("created_at", since7d);
  else if (segment === "active") profileQuery = profileQuery.gte("last_seen_at", since7d);
  else if (segment === "vip") {
    if (vipUserIds.length > 0) profileQuery = profileQuery.in("id", vipUserIds);
    else profileQuery = profileQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // no results
  } else if (segment === "banned") profileQuery = profileQuery.eq("is_suspended", true);

  const { data: profilesRaw, count: segmentCount } = await profileQuery.range(from, to);
  const profiles = profilesRaw ?? [];
  const totalPages = Math.max(1, Math.ceil((segmentCount ?? 0) / PAGE_SIZE));
  const profileIds = profiles.map((p) => p.id);

  // ── Per-player request stats + VIP lookup (independent, run together) ────
  const [{ data: requestRows }, { data: vipRows }] = profileIds.length
    ? await Promise.all([
        db
          .from("deposit_requests")
          .select("user_id, status, amount, created_at")
          .in("user_id", profileIds),
        db.from("vip_status").select("user_id, vip_tiers(name, color)").in("user_id", profileIds),
      ])
    : [{ data: [] }, { data: [] }];

  // Aggregate by user_id
  type RequestStats = {
    fulfilledCount: number;
    totalDeposited: number;
  };
  const statsByUser = new Map<string, RequestStats>();
  for (const r of requestRows ?? []) {
    if (!r.user_id) continue;
    const existing = statsByUser.get(r.user_id) ?? {
      fulfilledCount: 0,
      totalDeposited: 0,
    };
    if (r.status === "completed") {
      existing.fulfilledCount++;
      existing.totalDeposited += Number(r.amount ?? 0);
    }
    statsByUser.set(r.user_id, existing);
  }

  type VipRow = { user_id: string; vip_tiers: { name: string; color: string } | null };
  const vipByUser = new Map<string, { name: string; color: string }>();
  for (const v of (vipRows ?? []) as unknown as VipRow[]) {
    if (v.vip_tiers) vipByUser.set(v.user_id, v.vip_tiers);
  }

  function segmentHref(key: string, p = 1) {
    return `/admin/crm?segment=${key}&page=${p}`;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="CRM"
        description="Customer intelligence — player activity, deposit history and contact details."
      />

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total players"
          value={totalPlayers.toLocaleString()}
          icon={<Users />}
          accent="cyan"
        />
        <StatCard
          label="New this week"
          value={newThisWeek.toLocaleString()}
          icon={<TrendingUp />}
          accent="emerald"
        />
        <StatCard
          label="Active last 7 days"
          value={activeLast7d.toLocaleString()}
          icon={<UserCheck />}
          accent="purple"
        />
        <StatCard
          label="Total fulfilled ($)"
          value={`$${totalFulfilled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<DollarSign />}
          accent="gold"
        />
      </div>

      {/* ── Segment tabs ──────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Player segments"
        className="glass mb-4 inline-flex flex-wrap gap-1 rounded-full p-1"
      >
        {SEGMENTS.map((s) => (
          <Link
            key={s.key}
            href={segmentHref(s.key)}
            role="tab"
            aria-selected={s.key === segment}
            className={cn(
              "min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              s.key === segment
                ? "bg-emerald-500 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* ── Player table ──────────────────────────────────────────────────── */}
      <GlassCard className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-foreground/8 hover:bg-transparent">
              <TableHead>Player</TableHead>
              <TableHead>Level / VIP</TableHead>
              <TableHead className="text-right">Coins</TableHead>
              <TableHead className="text-right">Deposits</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No players in this segment.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => {
                const stats = statsByUser.get(p.id);
                const vip = vipByUser.get(p.id);

                return (
                  <TableRow key={p.id} className="border-foreground/8">
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {profileDisplayName(p)}
                          {profileIsBanned(p) && (
                            <Badge className="ml-2 bg-ws-danger/20 text-ws-danger text-xs">
                              Suspended
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{profileHandle(p)}</p>
                        <p className="text-xs text-ws-text-faint">
                          Joined{" "}
                          {p.created_at
                            ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true })
                            : "—"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className="w-fit bg-foreground/8 text-xs">
                          Lv {profileNum(p.level, 1)}
                        </Badge>
                        {vip && (
                          <Badge
                            className="w-fit text-xs"
                            style={{
                              backgroundColor: `${vip.color}22`,
                              color: vip.color,
                            }}
                          >
                            {vip.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Coins */}
                    <TableCell className="text-right tnum font-medium">
                      {profileNum(p.coins_balance).toLocaleString()}
                    </TableCell>

                    {/* Deposits */}
                    <TableCell className="text-right">
                      {stats && stats.fulfilledCount > 0 ? (
                        <div>
                          <p className="tnum font-medium text-ws-emerald">
                            ${stats.totalDeposited.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stats.fulfilledCount}{" "}
                            {stats.fulfilledCount === 1 ? "deposit" : "deposits"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {p.email ? (
                        <span className="max-w-[140px] truncate text-xs text-muted-foreground">
                          {p.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Last seen */}
                    <TableCell className="text-sm text-muted-foreground">
                      {p.last_seen_at
                        ? formatDistanceToNow(new Date(p.last_seen_at), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/${p.id}`}>View Profile</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </GlassCard>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Page {page} of {totalPages} &middot;{" "}
            {(segmentCount ?? 0).toLocaleString()} players
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={segmentHref(segment, page - 1)}>
                  <ChevronLeft className="size-4" aria-hidden />
                  Prev
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={segmentHref(segment, page + 1)}>
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
