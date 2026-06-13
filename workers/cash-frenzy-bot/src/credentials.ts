/**
 * Cash Frenzy account names: letters/numbers, 20 chars or fewer (panel rule).
 * Password defaults to the username unless the user picked one.
 */
const MAX_LEN = 20;

function cleanAccount(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, MAX_LEN);
}

/** Panel accepts letters and numbers only in passwords. */
export function cleanPassword(raw: string, fallback: string): string {
  const p = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, MAX_LEN);
  if (p.length >= 6) return p;
  return cleanAccount(fallback) || "player1";
}

export function normalizeUsername(raw: string): string {
  return cleanAccount(raw);
}
export function buildCredentials(profile: {
  full_name?: string | null;
  email?: string | null;
}): { username: string; password: string } {
  let base = "";

  if (profile.full_name?.trim()) {
    const parts = profile.full_name.trim().split(/\s+/);
    base = parts[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (base.length < 3 && parts.length > 1) {
      base = parts
        .join("_")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_");
    }
  }

  if (!base && profile.email) {
    const local = profile.email.split("@")[0] ?? "";
    if (!local.endsWith("@phone.spinora.local")) {
      base = local.toLowerCase().replace(/[^a-z0-9_]/g, "");
    }
  }

  if (!base) base = "player";

  const username = cleanAccount(base || "player");
  return { username, password: cleanPassword(username, username) };
}

function randomSuffix(len: number): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function usernameVariant(base: string, attempt: number): string {
  const clean = cleanAccount(base) || "player";
  if (attempt <= 0) return clean;

  let suffix: string;
  if (attempt <= 2) suffix = String(attempt);
  else suffix = randomSuffix(attempt <= 5 ? 2 : 3);

  const room = MAX_LEN - suffix.length;
  return `${clean.slice(0, Math.max(1, room))}${suffix}`;
}
