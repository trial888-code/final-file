import { getAdminAllTransactions } from "@/lib/actions/wallet";
import { AdminTransactionsLive } from "@/components/admin/admin-transactions-live";

export default async function AdminTransactionsPage() {
  const result = await getAdminAllTransactions();
  const transactions = "error" in result ? [] : result.transactions;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Transaction Management</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Full permanent ledger — every wallet transaction is stored and updates{" "}
          <strong className="text-foreground font-medium">live</strong> (no refresh needed).
          Filter <strong className="text-foreground font-medium">Bonus Wallet</strong> for game
          loads paid from bonus balance.
        </p>
        {"error" in result && (
          <p className="text-sm text-destructive mt-2">{result.error}</p>
        )}
      </div>

      <AdminTransactionsLive initialTransactions={transactions} />
    </div>
  );
}
