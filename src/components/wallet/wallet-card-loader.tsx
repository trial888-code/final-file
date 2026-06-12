"use client";

import { useCallback, useEffect, useState } from "react";
import { WalletCard } from "@/components/wallet/wallet-card";
import { getMyWallet, type WalletBalance } from "@/lib/actions/wallet";
import { cn } from "@/lib/utils";

interface WalletCardLoaderProps {
  className?: string;
  refreshKey?: number;
}

export function WalletCardLoader({ className, refreshKey = 0 }: WalletCardLoaderProps) {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const result = await getMyWallet();
    if ("error" in result) {
      setHidden(true);
      return;
    }
    setWallet(result);
    setHidden(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    let lastFetch = 0;
    function onFocus() {
      const now = Date.now();
      if (now - lastFetch < 60_000) return;
      lastFetch = now;
      load();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (hidden) return null;

  if (!wallet) {
    return (
      <div
        className={cn(
          "wallet-card animate-pulse h-[100px] rounded-b-2xl bg-purple-950/40 border border-purple-500/20",
          className
        )}
      />
    );
  }

  return (
    <WalletCard
      walletBalance={wallet.walletBalance}
      bonusWallet={wallet.bonusWallet}
      cashoutWallet={wallet.cashoutWallet}
      bonusRedeemWallet={wallet.bonusRedeemWallet}
      className={className}
    />
  );
}
