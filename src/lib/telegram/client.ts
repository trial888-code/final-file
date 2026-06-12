const TELEGRAM_API = "https://api.telegram.org";

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

/** Comma-separated — private user id, group id (-100...), or both. */
function getAdminChatIds(): string[] {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isTelegramConfigured(): boolean {
  return Boolean(getBotToken() && getAdminChatIds().length > 0);
}

/** Escape dynamic text for Telegram HTML parse mode. */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendPhotoToChat(
  token: string,
  chatId: string,
  photoUrl: string,
  caption: string,
  disableNotification: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: "HTML",
        disable_notification: disableNotification,
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as { ok?: boolean; description?: string };

    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.description ?? `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Telegram photo request failed",
    };
  }
}

export async function sendTelegramPhoto(
  photoUrl: string,
  caption: string,
  options?: { disableNotification?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  const chatIds = getAdminChatIds();

  if (!token || chatIds.length === 0) {
    return { ok: false, error: "Telegram is not configured" };
  }

  const disableNotification = options?.disableNotification ?? false;
  const results = await Promise.all(
    chatIds.map((chatId) => sendPhotoToChat(token, chatId, photoUrl, caption, disableNotification))
  );

  const ok = results.some((r) => r.ok);
  if (ok) return { ok: true };

  const errors = results.map((r) => r.error).filter(Boolean);
  return { ok: false, error: errors.join("; ") || "All Telegram photo sends failed" };
}

async function sendToChat(
  token: string,
  chatId: string,
  text: string,
  disableNotification: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        disable_notification: disableNotification,
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as { ok?: boolean; description?: string };

    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.description ?? `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Telegram request failed",
    };
  }
}

export async function sendTelegramMessage(
  text: string,
  options?: { disableNotification?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  const chatIds = getAdminChatIds();

  if (!token || chatIds.length === 0) {
    return { ok: false, error: "Telegram is not configured" };
  }

  const disableNotification = options?.disableNotification ?? false;
  const results = await Promise.all(
    chatIds.map((chatId) => sendToChat(token, chatId, text, disableNotification))
  );

  const ok = results.some((r) => r.ok);
  if (ok) return { ok: true };

  const errors = results.map((r) => r.error).filter(Boolean);
  return { ok: false, error: errors.join("; ") || "All Telegram sends failed" };
}
