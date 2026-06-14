import { createClient } from "@/lib/supabase/server";
import { getAdminAllTransactions } from "@/lib/actions/wallet";
import { AdminTransactionsLive } from "@/components/admin/admin-transactions-live";

export default async function AdminTransactionsPage() {
  const supabase = await createClient();

  const [result, { data: users }] = await Promise.all([
    getAdminAllTransactions(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true, nullsFirst: false })
      .limit(2000),
  ]);

  const transactions = "error" in result ? [] : result.transactions;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Transaction Management</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Pick one user — see their <strong className="text-foreground font-medium">Total Deposit</strong>{" "}
          and <strong className="text-foreground font-medium">Bonus Wallet</strong> history in one view.
          Only money loads & redeems (not account creation). Updates live.
        </p>
        {"error" in result && (
          <p className="text-sm text-destructive mt-2">{result.error}</p>
        )}
      </div>

      <AdminTransactionsLive
        users={users ?? []}
        initialTransactions={transactions}
      />
    </div>
  );
}
