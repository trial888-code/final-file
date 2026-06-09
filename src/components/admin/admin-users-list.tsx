"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserActions } from "@/components/admin/user-actions";
import { AdminWalletGrant } from "@/components/admin/admin-wallet-grant";
import { WalletCard } from "@/components/wallet/wallet-card";
import { formatDate } from "@/lib/utils";
import { MessageCircle, Search } from "lucide-react";
import type { Profile } from "@/types/database";

interface AdminUsersListProps {
  users: Profile[];
}

export function AdminUsersList({ users }: AdminUsersListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.phone?.toLowerCase().includes(q) ||
        user.whatsapp?.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name, email, or phone..."
          className="pl-9"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} user{filtered.length === 1 ? "" : "s"}
        {query.trim() ? " found" : " total"}
      </p>

      <div className="space-y-3">
        {filtered.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{user.full_name || "Unnamed"}</h3>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    {user.is_suspended && <Badge variant="destructive">Suspended</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.vip_tier} &middot; {user.vip_points} pts &middot; Joined {formatDate(user.created_at)}
                  </p>
                </div>
                <WalletCard
                  walletBalance={Number(user.wallet_balance ?? 0)}
                  bonusWallet={Number(user.bonus_wallet ?? 0)}
                  className="w-full sm:w-56 shrink-0"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-border">
                <AdminWalletGrant userId={user.id} />
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {user.role !== "admin" && (
                    <Button variant="outline" size="sm" asChild className="gap-1.5">
                      <Link href={`/admin/chat?userId=${user.id}`}>
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </Link>
                    </Button>
                  )}
                  <UserActions userId={user.id} role={user.role} isSuspended={user.is_suspended} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No users match your search.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
