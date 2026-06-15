const TECHNICAL_ERROR_PATTERNS = [
  /^locator\./i,
  /playwright/i,
  /timeout \d+ms exceeded/i,
  /call log:/i,
  /waiting for locator/i,
  /element is not (visible|enabled|stable)/i,
  /attempting click action/i,
  /locator resolved to/i,
];

function isTechnicalError(message: string): boolean {
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/** Map bot/Playwright errors to short messages for players — keep intentional support copy as-is. */
export function userFacingGameLoadError(
  errorMessage: string | null | undefined,
  loadType?: string | null
): string | null {
  if (!errorMessage?.trim()) return null;

  const msg = errorMessage.trim();
  if (!isTechnicalError(msg)) return msg;

  if (loadType === "create_account" || loadType === "new_account") {
    return "Account creation failed. Please try again or contact support if this continues.";
  }
  if (loadType === "load" || loadType === "reload") {
    return "Load failed. Please try again or contact support.";
  }
  if (loadType === "redeem") {
    return "Redeem failed. Please try again or contact support.";
  }
  if (loadType === "check_balance") {
    return "Balance check failed. Please try again.";
  }
  return "Request failed. Please try again or contact support.";
}

/** Recent activity: status line only — no technical error body for players. */
export function showGameLoadErrorDetail(
  errorMessage: string | null | undefined,
  loadType?: string | null
): boolean {
  if (!errorMessage?.trim()) return false;
  return !isTechnicalError(errorMessage.trim()) && Boolean(userFacingGameLoadError(errorMessage, loadType));
}
