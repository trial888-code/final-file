import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { Logo } from "@/components/shared/logo";
import { ADMIN_MODULES, can, requireStaff } from "@/lib/data/admin";
import { adminDb } from "@/lib/actions/admin/core";
import AdminLoading from "./loading";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Spinora Admin" },
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  support_agent: "Support Agent",
  moderator: "Moderator",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStaff();

  // only show modules the user can access
  const items = ADMIN_MODULES.filter(
    (m) => m.permission === null || can(ctx, m.permission)
  ).map((m) => ({
    href: m.href,
    label: m.label,
    icon: m.icon,
    group: m.group,
  }));

  const topRole =
    ROLE_LABEL[
      ["super_admin", "admin", "manager", "support_agent", "moderator"].find(
        (r) => ctx.roles.includes(r as never)
      ) ?? "moderator"
    ] ?? "Staff";

  // Action-needed counts → sidebar badges (new deposits to fulfill, cash-outs to pay).
  const badges: Record<string, number> = {};
  if (can(ctx, "requests.manage")) {
    try {
      const db = adminDb();
      const [pendingReq, cashoutOwed, pendingDeposits, pendingLoads] = await Promise.all([
        db.from("requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("profiles").select("id", { count: "exact", head: true }).gt("cashout_wallet", 0),
        db.from("deposit_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
        db.from("game_load_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
      ]);
      if (pendingReq.count) badges["/admin/requests"] = pendingReq.count;
      if (cashoutOwed.count) badges["/admin/payouts"] = cashoutOwed.count;
      if (pendingDeposits.count) badges["/admin/deposits"] = pendingDeposits.count;
      if (pendingLoads.count) badges["/admin/game-loads"] = pendingLoads.count;
    } catch {
      // badge counts are optional when tables are missing
    }
  }

  return (
    <div className="relative flex min-h-dvh text-foreground">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-ws-green focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground"
      >
        Skip to content
      </a>

      <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-y-0 border-l-0 lg:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Logo size="sm" href="/admin" />
          <Badge className="bg-ws-green/15 text-ws-green-deep uppercase dark:text-ws-green">Admin</Badge>
        </div>
        <AdminSidebar items={items} badges={badges} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar items={items} email={ctx.email} topRole={topRole} badges={badges} />
        <main id="admin-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<AdminLoading />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
