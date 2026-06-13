import type { Frame, Locator, Page } from "playwright";
import { isLoginPage, log, parseMoney, screenshot, waitForManualLogin } from "./panel-utils.js";

/**
 * Gameroom runs a layui-based admin panel (agentserver1.gameroom777.com/admin).
 * The player list loads standalone at /admin/player/index; create/recharge/
 * withdraw each open a layui iframe layer (/player/insert|recharge|withdraw).
 */
const ADMIN_URL =
  process.env.GAMEROOM_ADMIN_URL?.trim() || "https://agentserver1.gameroom777.com/admin/login";
const BASE_URL = ADMIN_URL.replace(/\/login.*$/i, ""); // .../admin
const PLAYER_URL = `${BASE_URL}/player/index`;

/* ------------------------------------------------------------------ login */

export async function loginToPanel(page: Page): Promise<void> {
  await page.goto(PLAYER_URL, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);

  if (!(await isLoginPage(page)) && (await page.locator('input[name="account"]').count()) > 0) {
    log("login", "already authenticated");
    return;
  }
  if (!(await isLoginPage(page))) {
    // Authenticated but landed on dashboard — go to the player list.
    await gotoPlayerList(page);
    log("login", "already authenticated");
    return;
  }

  const username = process.env.GAMEROOM_AGENT_USERNAME?.trim();
  const password = process.env.GAMEROOM_AGENT_PASSWORD?.trim();
  if (username) {
    await page
      .locator('input:not([type="password"]):not([type="hidden"])')
      .first()
      .fill(username)
      .catch(() => {});
  }
  if (password) {
    await page.locator('input[type="password"]').first().fill(password).catch(() => {});
  }

  const interactive =
    process.env.GAMEROOM_HEADLESS === "false" || Boolean(process.env.GAMEROOM_CDP_URL);
  if (interactive) {
    await waitForManualLogin(page);
    await gotoPlayerList(page);
    log("login", "success (manual captcha)");
    return;
  }

  await screenshot(page, "login-captcha");
  throw new Error(
    "Gameroom login needs an image CAPTCHA. Run start-chrome-for-bot.bat, log in by hand, " +
      "then set GAMEROOM_CDP_URL=http://127.0.0.1:9225 and start the bot."
  );
}

/* ----------------------------------------------------------- list helpers */

async function gotoPlayerList(page: Page): Promise<void> {
  if (!/player\/index/i.test(page.url())) {
    await page.goto(PLAYER_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  }
  await page
    .locator('input[name="account"]')
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(800);
}

async function searchAccount(page: Page, account: string): Promise<void> {
  await gotoPlayerList(page);
  const search = page.locator('input[name="account"]').first();
  await search.click();
  await search.fill("");
  await search.fill(account);
  const btn = page.locator(".layui-btn, button").filter({ hasText: /^\s*Search\s*$/i }).first();
  if (await btn.isVisible().catch(() => false)) await btn.click();
  else await search.press("Enter");
  await page.waitForTimeout(1800);
}

/** Main data rows (the table holding the Account/score cells). */
function mainRows(page: Page): Locator {
  const fixed = page.locator(".layui-table-main tbody tr");
  return fixed;
}

function rowsWithAccount(page: Page): Locator {
  return page.locator("table tbody tr").filter({ has: page.locator('td[data-field="Account"]') });
}

/** Index (0-based) of the row whose Account cell exactly equals `account`, or -1. */
async function findRowIndex(page: Page, account: string): Promise<number> {
  const rows = (await mainRows(page).count()) > 0 ? mainRows(page) : rowsWithAccount(page);
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const cell = (await rows
      .nth(i)
      .locator('td[data-field="Account"] .layui-table-cell, td[data-field="Account"]')
      .first()
      .innerText()
      .catch(() => ""))
      .trim();
    if (cell.toLowerCase() === account.toLowerCase()) return i;
  }
  return -1;
}

async function accountExists(page: Page, account: string): Promise<boolean> {
  await searchAccount(page, account);
  return (await findRowIndex(page, account)) >= 0;
}

/* -------------------------------------------------------- balance reading */

export async function readBalance(page: Page, account: string): Promise<number> {
  await searchAccount(page, account);
  const idx = await findRowIndex(page, account);
  if (idx < 0) {
    await screenshot(page, "user-not-found");
    throw new Error(`Account "${account}" not found in panel`);
  }
  const rows = (await mainRows(page).count()) > 0 ? mainRows(page) : rowsWithAccount(page);
  const text = (await rows
    .nth(idx)
    .locator('td[data-field="score"] .layui-table-cell, td[data-field="score"]')
    .first()
    .innerText()
    .catch(() => ""))
    .trim();
  const value = parseMoney(text);
  if (value === null) {
    await screenshot(page, "balance-parse-failed");
    throw new Error(`Could not read balance for "${account}" (raw: "${text}")`);
  }
  log("balance", `${account} = ${value}`);
  return value;
}

/* ---------------------------------------------------------- dialog helpers */

/** Find the layui iframe-layer frame for a given action (insert/recharge/withdraw). */
async function waitForDialogFrame(page: Page, kind: string, timeout = 12000): Promise<Frame> {
  const deadline = Date.now() + timeout;
  const re = new RegExp(`/player/${kind}`, "i");
  while (Date.now() < deadline) {
    const frame = page.frames().find((f) => re.test(f.url()));
    if (frame) {
      await frame.locator("input, .layui-btn").first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
      return frame;
    }
    await page.waitForTimeout(300);
  }
  throw new Error(`${kind} dialog did not open`);
}

async function closeLayer(page: Page): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const x = page.locator(".layui-layer-close").last();
    if (!(await x.isVisible().catch(() => false))) break;
    await x.click().catch(() => {});
    await page.waitForTimeout(600);
  }
}

/** Poll (closing popups between tries) until the account shows up, or give up. */
async function confirmCreated(page: Page, username: string): Promise<boolean> {
  for (let i = 0; i < 5; i++) {
    await closeLayer(page);
    await page.waitForTimeout(700);
    if (await accountExists(page, username)) return true;
    await page.waitForTimeout(900);
  }
  return false;
}

async function typeInto(input: Locator, value: string): Promise<void> {
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.click();
  await input.fill("");
  await input.pressSequentially(value, { delay: 25 });
}

async function clickRowAction(page: Page, account: string, label: RegExp): Promise<void> {
  await searchAccount(page, account);
  const idx = await findRowIndex(page, account);
  if (idx < 0) {
    await screenshot(page, "user-not-found");
    throw new Error(`Account "${account}" not found in panel`);
  }
  const fixedR = page.locator(".layui-table-fixed-r tbody tr");
  const scope =
    (await fixedR.count()) > idx
      ? fixedR.nth(idx)
      : (await mainRows(page).count()) > 0
        ? mainRows(page).nth(idx)
        : rowsWithAccount(page).nth(idx);
  const btn = scope.locator("a, .layui-btn, button").filter({ hasText: label }).first();
  await btn.waitFor({ state: "visible", timeout: 8000 });
  await btn.click({ force: true });
  await page.waitForTimeout(800);
}

async function submitDialog(frame: Frame): Promise<void> {
  const submit = frame.locator("button, .layui-btn, *[lay-submit]").filter({ hasText: /^\s*Submit\s*$/i }).first();
  await submit.waitFor({ state: "visible", timeout: 8000 });
  await submit.click();
}

/* --------------------------------------------------------------- recharge */

export async function rechargeAccount(page: Page, account: string, amount: number): Promise<void> {
  await clickRowAction(page, account, /^\s*Recharge\s*$/i);
  const frame = await waitForDialogFrame(page, "recharge");
  await typeInto(frame.locator('input[name="balance"]').first(), String(amount));
  await page.waitForTimeout(300);
  await submitDialog(frame);
  await page.waitForTimeout(2000);
  log("recharge", `recharged $${amount} to ${account}`);
  await closeLayer(page);
}

/* ----------------------------------------------------------------- redeem */

export async function redeemAccount(
  page: Page,
  account: string,
  amount: number,
  redeemAll: boolean
): Promise<number> {
  let target = amount;
  if (redeemAll) {
    target = await readBalance(page, account);
    if (target <= 0) {
      log("redeem", `${account} has no balance to redeem`);
      return 0;
    }
  }

  await clickRowAction(page, account, /^\s*Withdraw\s*$/i);
  const frame = await waitForDialogFrame(page, "withdraw");
  await typeInto(frame.locator('input[name="balance"]').first(), String(target));
  await page.waitForTimeout(300);
  await submitDialog(frame);
  await page.waitForTimeout(2000);
  log("redeem", `withdrew $${target} from ${account}`);
  await closeLayer(page);
  return target;
}

/* ------------------------------------------------------- account creation */

/** Panel rejects taken names with messages like "login name have used". */
const DUPLICATE_RE = /exist|already|taken|duplicate|repeat|in ?use|have used|used|登录名|重复|已存在/i;

type CreateOutcome =
  | { status: "created" }
  | { status: "duplicate" }
  | { status: "error"; message: string };

/** Form-validation problems we should NOT silently treat as duplicates. */
const VALIDATION_RE = /required|cannot be blank|format|length|invalid|incorrect|至少|不能为空|格式/i;

async function tryCreateOnce(page: Page, username: string, password: string): Promise<CreateOutcome> {
  await gotoPlayerList(page);
  await closeLayer(page); // clear any leftover popup that would block the button
  await page
    .locator(".layui-btn, button")
    .filter({ hasText: /^\s*Add user\s*$/i })
    .first()
    .click();

  const frame = await waitForDialogFrame(page, "insert");
  await typeInto(frame.locator('input[name="username"]').first(), username);
  await typeInto(frame.locator('input[name="nickname"]').first(), username).catch(() => {});
  // "Recharge Balance" (money) is a required field — create with 0 balance.
  await typeInto(frame.locator('input[name="money"]').first(), "0").catch(() => {});
  await typeInto(frame.locator('input[name="password"]').first(), password);
  await typeInto(frame.locator('input[name="password_confirmation"]').first(), password);

  await submitDialog(frame);
  await page.waitForTimeout(1600);

  // A blank/format validation error stays inside the iframe — that's a real bug,
  // not a duplicate, so stop instead of churning through variants.
  const iframeMsgs = await frame
    .locator(".layui-layer-content, .layui-form-danger")
    .allInnerTexts()
    .catch(() => [] as string[]);
  const msg = iframeMsgs.join(" ").replace(/\s+/g, " ").trim();
  if (msg && VALIDATION_RE.test(msg) && !DUPLICATE_RE.test(msg)) {
    await closeLayer(page);
    return { status: "error", message: msg };
  }

  // Ground truth: the name did NOT exist before this call (pre-checked), so if it
  // shows up now we created it; if not (after retries), the panel rejected it.
  if (await confirmCreated(page, username)) return { status: "created" };
  log("create", `username ${username} rejected (likely taken) — trying next`);
  return { status: "duplicate" };
}

export async function createAccount(
  page: Page,
  baseUsername: string,
  password: string,
  variant: (base: string, attempt: number) => string
): Promise<{ username: string; password: string }> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const username = variant(baseUsername, attempt);

    if (await accountExists(page, username)) {
      log("create", `"${username}" already exists — trying next variant`);
      continue;
    }

    const outcome = await tryCreateOnce(page, username, password);
    if (outcome.status === "created") {
      log("create", `created ${username}`);
      return { username, password };
    }
    if (outcome.status === "duplicate") continue;

    await screenshot(page, "create-error");
    throw new Error(`Account creation failed: ${outcome.message}`);
  }

  await screenshot(page, "create-exhausted");
  throw new Error(`Could not create a unique account from base "${baseUsername}"`);
}
