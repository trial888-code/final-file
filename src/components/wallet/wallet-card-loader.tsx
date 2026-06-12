"use client";

import { useCallback, useEffect, useState } from "react";
import { WalletCard } from "@/components/wallet/wallet-card";
import { getMyWallet, type WalletBalance } from "@/lib/actions/wallet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Other components can trigger an immediate wallet refresh: window.dispatchEvent(new Event(WALLET_REFRESH_EVENT)) */
export const WALLET_REFRESH_EVENT = "wallet:refresh";

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

  // Poll while the tab is visible + refresh on focus/visibility/custom event.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    const interval = setInterval(refreshIfVisible, 8_000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener(WALLET_REFRESH_EVENT, load);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener(WALLET_REFRESH_EVENT, load);
    };
  }, [load]);

  // Instant update via Supabase realtime when the profile row changes.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`wallet-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
          () => load()
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
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
