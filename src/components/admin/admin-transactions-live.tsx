"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminTransactionRow } from "@/lib/actions/wallet";
import { AdminTransactionsList } from "@/components/admin/admin-transactions-list";

interface AdminTransactionsLiveProps {
  initialTransactions: AdminTransactionRow[];
}

export function AdminTransactionsLive({ initialTransactions }: AdminTransactionsLiveProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [live, setLive] = useState(false);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || cancelled) return;

      channel = supabase
        .channel("admin-wallet-transactions-live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "wallet_transactions" },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const userId = String(row.user_id ?? "");

            void (async () => {
              let user: AdminTransactionRow["user"] = null;
              if (userId) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("id, full_name, email")
                  .eq("id", userId)
                  .maybeSingle();
                user = profile ?? null;
              }

              const entry: AdminTransactionRow = {
                id: String(row.id),
                amount: Number(row.amount),
                wallet_type: String(row.wallet_type),
                transaction_type: String(row.transaction_type),
                source: String(row.source),
                description: (row.description as string | null) ?? null,
                created_at: String(row.created_at),
                user,
              };

              setTransactions((prev) => {
                if (prev.some((t) => t.id === entry.id)) return prev;
                return [entry, ...prev];
              });
            })();
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive(true);
        });
    });

    return () => {
      cancelled = true;
      setLive(false);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AdminTransactionsList
      transactions={transactions}
      live={live}
      totalStored={transactions.length}
    />
  );
}
