/** Shared Spinora bot naming: name + number, always at least 7 characters (e.g. amy → amy0097). */
export const MIN_ACCOUNT_USERNAME_LEN = 7;
export const DEFAULT_MAX_LEN = 13;

export function cleanAccountStem(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function randomDigitSuffix(len: number): string {
  if (len <= 0) return "";
  let s = "";
  for (let i = 0; i < len; i++) s += String(Math.floor(Math.random() * 10));
  if (/^0+$/.test(s)) {
    s = `${Math.floor(Math.random() * 9) + 1}${s.slice(1)}`;
  }
  return s;
}

/** Pad short stems with random digits so panel min-length rules pass (amy → amy0097). */
export function ensureMinUsername(
  raw: string,
  minLen = MIN_ACCOUNT_USERNAME_LEN,
  maxLen = DEFAULT_MAX_LEN
): string {
  let u = cleanAccountStem(raw).slice(0, maxLen);
  if (!u) u = "player";
  if (u.length >= minLen) return u;
  const need = minLen - u.length;
  return `${u}${randomDigitSuffix(need)}`.slice(0, maxLen);
}

export function profileNameStem(
  profile: { full_name?: string | null; email?: string | null },
  maxLen = DEFAULT_MAX_LEN
): string {
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

  return cleanAccountStem(base).slice(0, maxLen);
}

export function parseNumberedUsername(username: string): { stem: string; num: number } {
  const clean = cleanAccountStem(username);
  const match = clean.match(/^(.+?)(\d+)$/);
  if (match) {
    return { stem: match[1], num: parseInt(match[2], 10) };
  }
  return { stem: clean || "player", num: 0 };
}

export function numberedUsername(
  stem: string,
  num: number,
  maxLen = DEFAULT_MAX_LEN,
  minLen = MIN_ACCOUNT_USERNAME_LEN
): string {
  const n = String(num);
  let base = cleanAccountStem(stem).slice(0, Math.max(1, maxLen - n.length)) || "player";
  let candidate = `${base}${n}`;

  if (candidate.length < minLen) {
    const pad = minLen - candidate.length;
    const baseRoom = Math.max(1, maxLen - n.length - pad);
    base = cleanAccountStem(stem).slice(0, baseRoom) || "player";
    candidate = `${base}${randomDigitSuffix(pad)}${n}`.slice(0, maxLen);
  }

  return ensureMinUsername(candidate, minLen, maxLen);
}

export function nextNumberAfterExisting(existingUsername: string | null | undefined): number {
  if (!existingUsername?.trim()) return 1;
  const { num } = parseNumberedUsername(existingUsername.trim());
  return num > 0 ? num + 1 : 2;
}

/** @param startNum 1 = name1 first; 2 = name2 first (replace); 0 = exact name then name1, name2… */
export function usernameVariant(
  base: string,
  attempt: number,
  startNum = 1,
  maxLen = DEFAULT_MAX_LEN,
  minLen = MIN_ACCOUNT_USERNAME_LEN
): string {
  const stem = cleanAccountStem(base).slice(0, maxLen) || "player";
  if (startNum === 0) {
    if (attempt === 0) return ensureMinUsername(stem, minLen, maxLen);
    return numberedUsername(stem, attempt, maxLen, minLen);
  }
  return numberedUsername(stem, startNum + attempt, maxLen, minLen);
}

export interface CreateAccountPlan {
  stem: string;
  startNum: number;
  preferredPassword?: string | null;
  /** When true, never reuse an existing panel login — always pick the next free number. */
  forceNewAccount: boolean;
}

export function planCreateAccount(job: {
  game_username?: string | null;
  game_password?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  prior_game_username?: string | null;
  admin_notes?: string | null;
}): CreateAccountPlan {
  const customUser = job.game_username?.trim();
  const forceNewAccount = Boolean(
    job.prior_game_username?.trim() || job.admin_notes === "account_replace"
  );

  if (customUser) {
    const clean = ensureMinUsername(customUser.slice(0, DEFAULT_MAX_LEN));
    const { stem, num } = parseNumberedUsername(clean);
    const password = job.game_password?.trim() || null;
    if (num > 0) {
      return {
        stem,
        startNum: forceNewAccount ? nextNumberAfterExisting(clean) : num,
        preferredPassword: password,
        forceNewAccount,
      };
    }
    return {
      stem: cleanAccountStem(clean) || "player",
      startNum: 0,
      preferredPassword: password,
      forceNewAccount,
    };
  }

  const stem = profileNameStem({
    full_name: job.requester_name,
    email: job.requester_email,
  });
  const startNum = nextNumberAfterExisting(job.prior_game_username);

  return { stem, startNum, preferredPassword: null, forceNewAccount };
}

export function variantFromPlan(plan: CreateAccountPlan, maxLen = DEFAULT_MAX_LEN) {
  return (base: string, attempt: number) =>
    usernameVariant(base, attempt, plan.startNum, maxLen, MIN_ACCOUNT_USERNAME_LEN);
}

export function buildCredentials(profile: {
  full_name?: string | null;
  email?: string | null;
}): { username: string; password: string } {
  const stem = profileNameStem(profile);
  const username = numberedUsername(stem, 1);
  return { username, password: username };
}
