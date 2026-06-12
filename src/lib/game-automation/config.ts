import { isAutomatedGameSlug } from "@/lib/game-automation/types";

/** Server-only Juwa agent panel URL (never NEXT_PUBLIC) */
export function getJuwaAdminPanelUrl(): string | null {
  return process.env.JUWA_ADMIN_URL?.trim() || null;
}

/** Server-only Vegas Sweeps agent panel URL (never NEXT_PUBLIC) */
export function getVegasAdminPanelUrl(): string | null {
  return process.env.VEGAS_ADMIN_URL?.trim() || null;
}

export function getAutomationSecret(): string | null {
  return process.env.GAME_AUTOMATION_SECRET?.trim() || null;
}

export function isWalletLoadEnabledForGame(slug: string): boolean {
  if (!isAutomatedGameSlug(slug)) return false;
  if (slug === "juwa") return Boolean(getJuwaAdminPanelUrl());
  if (slug === "vegas-sweeps") return Boolean(getVegasAdminPanelUrl());
  return false;
}

/** Wallet → game load limits (can load any balance ≥ $1 up to available) */
export const WALLET_LOAD_LIMITS = { min: 1, max: 500 } as const;
