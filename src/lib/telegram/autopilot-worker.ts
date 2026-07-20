import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramPhoto } from "@/lib/telegram/client";
import { SITE_URL } from "@/lib/constants";
import { getTelegramSettings, updateTelegramSettings } from "@/lib/ai/settings";

export interface AutopilotStatus {
  enabled: boolean;
  frequencyHours: number;
  lastRunTime: string | null;
  totalAutopilotPosts: number;
}

const POSTERS = [
  "/images/promos/spinora_dealer_ten.jpg",
  "/images/promos/spinora_model_five.jpg",
  "/images/promos/spinora_slot_fifteen.jpg",
  "/images/promos/spinora_gift_three.jpg",
];

export async function getAutopilotStatus(): Promise<AutopilotStatus> {
  const settings = await getTelegramSettings();
  const db = createAdminClient();

  let totalPosts = 0;
  if (db) {
    try {
      const { count } = await db
        .from("system_health_logs")
        .select("*", { count: "exact", head: true })
        .contains("cron_metrics", { type: "telegram_autopilot" });
      totalPosts = count ?? 0;
    } catch {
      totalPosts = 0;
    }
  }

  return {
    enabled: settings.autopilot_enabled,
    frequencyHours: 24,
    lastRunTime: settings.last_autopilot_at,
    totalAutopilotPosts: totalPosts,
  };
}

export async function toggleAutopilot(enable?: boolean): Promise<AutopilotStatus> {
  const settings = await getTelegramSettings();
  const next = typeof enable === "boolean" ? enable : !settings.autopilot_enabled;
  await updateTelegramSettings({ autopilot_enabled: next });
  return getAutopilotStatus();
}

export async function runAutopilotDailyPostNow(): Promise<{ ok: boolean; message: string }> {
  const settings = await getTelegramSettings();
  if (!settings.autopilot_enabled) {
    return { ok: false, message: "Autopilot is disabled in Telegram settings." };
  }

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const randomPoster = POSTERS[Math.floor(Math.random() * POSTERS.length)];
  const photoUrl = `${SITE_URL}${randomPoster}`;

  const autoCaption = `${settings.template_header}

👑 <b>SPINORA ROYALE VIP — DAILY OFFER</b>
🗓️ <b>${todayStr}</b>

Daily bonus drop is active on all 8 game platforms!

✨ <b>Today's perks:</b>
• 100% Instant Deposit Match
• 24/7 Automated Game Wallet Loads
• 15-Minute Verified Cashouts

👉 <a href="${SITE_URL}/dashboard">Claim Today's Bonus</a>

${settings.template_footer}`;

  const result = await sendTelegramPhoto(photoUrl, autoCaption, { channel: "promo" });

  await updateTelegramSettings({ last_autopilot_at: new Date().toISOString() });

  const db = createAdminClient();
  if (db) {
    try {
      await db.from("system_health_logs").insert({
        health_score: 100,
        seo_metrics: {},
        cron_metrics: { type: "telegram_autopilot", at: new Date().toISOString() },
        database_metrics: {},
        recommendations: [],
      });
    } catch {
      /* ignore */
    }
  }

  if (!result.ok) {
    return { ok: false, message: result.error || "Telegram send failed" };
  }

  return {
    ok: true,
    message: `Autopilot posted daily offer for ${todayStr}.`,
  };
}
