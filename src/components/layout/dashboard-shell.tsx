"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { DeferredWalletCardLoader } from "@/components/wallet/deferred-wallet-card-loader";
import { AppShell } from "@/components/layout/app-shell";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      toast.success("Welcome to Spinora! Your email is verified.");
    }
  }, [searchParams]);

  return (
    <AppShell
      showTicker={false}
      showFooter={false}
      assumeLoggedIn
      sidebar={
        <AccountSidebar walletSlot={<DeferredWalletCardLoader />} />
      }
    >
      {children}
    </AppShell>
  );
}
