/** Proactive panel login on bot startup + periodic session checks (not only when jobs run). */

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function isSessionKeeperEnabled(): boolean {
  const raw = (env("SESSION_KEEPER") ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

export function sessionCheckIntervalMs(): number {
  const n = Number(env("SESSION_CHECK_MS") ?? 300_000);
  return Number.isFinite(n) && n >= 30_000 ? Math.floor(n) : 300_000;
}

export async function startPanelSessionKeeper(
  botLabel: string,
  ensureLoggedIn: () => Promise<void>
): Promise<void> {
  if (!isSessionKeeperEnabled()) {
    console.log(`[${botLabel}] session keeper off (SESSION_KEEPER=false)`);
    return;
  }

  const intervalMs = sessionCheckIntervalMs();

  const check = async (reason: "startup" | "interval") => {
    try {
      console.log(`[${botLabel}] panel session check (${reason})...`);
      await ensureLoggedIn();
      console.log(`[${botLabel}] panel session ready`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[${botLabel}] panel session check failed: ${msg}`);
    }
  };

  await check("startup");
  setInterval(() => {
    void check("interval");
  }, intervalMs);

  console.log(
    `[${botLabel}] session keeper on — re-check every ${Math.round(intervalMs / 60_000)} min`
  );
}
