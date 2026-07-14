import type { Metadata } from "next";
import Link from "next/link";

import { GameAccountsSection } from "@/components/dashboard/game-accounts";
import {
  getActiveJobsByGame,
  getCreatableGames,
  getGameAccounts,
  getWalletData,
} from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "My Games | Spinora" };

export default async function DashboardGamesPage() {
  const [accounts, wallet, creatableGames, activeJobs] = await Promise.all([
    getGameAccounts(),
    getWalletData(),
    getCreatableGames(),
    getActiveJobsByGame(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My Games</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create accounts, load credits and cash out from your linked games.
          </p>
        </div>
        <Link
          href="/games"
          className="text-sm font-medium text-ws-green-deep dark:text-ws-green underline-offset-4 hover:underline"
        >
          Browse all games →
        </Link>
      </div>

      <GameAccountsSection
        accounts={accounts}
        walletBalance={wallet.balance}
        creatableGames={creatableGames}
        activeJobs={activeJobs}
      />
    </div>
  );
}
