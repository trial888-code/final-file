import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  formatTransactionAmount,
  gameLoadSummary,
  transactionSourceLabel,
  transactionSummary,
  type WalletTransactionRow,
} from "@/lib/wallet/transaction-display";

const loadStatusVariant: Record<string, "default" | "warning" | "success" | "destructive"> = {
  pending: "warning",
  processing: "default",
  completed: "success",
  failed: "destructive",
  cancelled: "destructive",
};

export default async function AdminBonusTransactionsPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: gameLoads }] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select(
        "id, amount, wallet_type, transaction_type, source, description, created_at, user:profiles!wallet_transactions_user_id_fkey(id, full_name, email)"
      )
      .in("wallet_type", ["bonus", "bonus_redeem"])
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("game_load_requests")
      .select(
        "id, game_name, game_slug, amount, load_type, status, game_username, redeem_all, created_at, error_message, user:profiles!game_load_requests_user_id_fkey(id, full_name, email)"
      )
      .eq("wallet_type", "bonus")
      .in("status", ["pending", "processing", "failed"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Bonus Wallet Transactions</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Every bonus-wallet load, redeem, refund, and credit across all users. Per-user history is
          also under{" "}
          <Link href="/admin/users" className="text-primary hover:underline">
            Admin → Users
          </Link>
          .
        </p>
      </div>

      {gameLoads && gameLoads.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">In progress / failed (bonus wallet)</h2>
          <div className="space-y-3">
            {gameLoads.map((load) => {
              const user = load.user as { id?: string; full_name?: string; email?: string } | null;
              return (
                <Card key={load.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={loadStatusVariant[load.status] ?? "secondary"}>{load.status}</Badge>
                        <span className="text-sm font-medium">{gameLoadSummary(load)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user?.full_name || "Unnamed"} ({user?.email})
                      </p>
                      {load.game_username && (
                        <p className="text-xs text-muted-foreground">Game user: {load.game_username}</p>
                      )}
                      {load.error_message && (
                        <p className="text-xs text-destructive mt-1">{load.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(load.created_at)} · {formatRelativeTime(load.created_at)}
                      </p>
                    </div>
                    {load.load_type === "load" && Number(load.amount) > 0 && (
                      <span className="font-bold text-amber-400 shrink-0">
                        −${Number(load.amount).toFixed(2)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">All bonus wallet ledger entries</h2>
        <div className="space-y-3">
          {transactions?.length ? (
            transactions.map((row) => {
              const user = row.user as { id?: string; full_name?: string; email?: string } | null;
              const tx = row as WalletTransactionRow;
              const isDebit = tx.transaction_type === "debit";
              return (
                <Card key={row.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline">{transactionSourceLabel(tx.source)}</Badge>
                        <Badge variant="secondary">{tx.wallet_type === "bonus" ? "Bonus Wallet" : "Bonus Redeem"}</Badge>
                      </div>
                      <p className="font-medium">{transactionSummary(tx)}</p>
                      <p className="text-sm text-muted-foreground">
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(user?.email ?? "")}`}
                          className="hover:text-primary hover:underline"
                        >
                          {user?.full_name || "Unnamed"} ({user?.email})
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(tx.created_at)} · {formatRelativeTime(tx.created_at)}
                      </p>
                    </div>
                    <span
                      className={`font-bold tabular-nums shrink-0 ${
                        isDebit ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {formatTransactionAmount(Number(tx.amount), tx.transaction_type)}
                    </span>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No bonus wallet transactions yet.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
