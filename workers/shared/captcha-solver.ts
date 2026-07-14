/**
 * Read login CAPTCHA images locally (Tesseract OCR) on the bot machine.
 * Optional paid fallback via 2Captcha / CapSolver when CAPTCHA_API_KEY is set.
 */

export type CaptchaSolverProvider = "2captcha" | "capsolver";

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** Local OCR + optional paid API. Off only when CAPTCHA_AUTO=false. */
export function isAutoCaptchaEnabled(): boolean {
  const raw = (env("CAPTCHA_AUTO") ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

/** @deprecated Use isAutoCaptchaEnabled — kept for existing panel imports. */
export function isCaptchaSolverConfigured(): boolean {
  return isAutoCaptchaEnabled();
}

export function captchaSolverProvider(): CaptchaSolverProvider {
  const raw = (env("CAPTCHA_SOLVER") ?? "2captcha").toLowerCase();
  if (raw === "capsolver") return "capsolver";
  return "2captcha";
}

function maxRetries(): number {
  const n = Number(env("CAPTCHA_MAX_RETRIES") ?? 3);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

function pollMs(): number {
  const n = Number(env("CAPTCHA_POLL_MS") ?? 3000);
  return Number.isFinite(n) && n >= 1000 ? n : 3000;
}

function timeoutMs(): number {
  const n = Number(env("CAPTCHA_TIMEOUT_MS") ?? 120_000);
  return Number.isFinite(n) && n >= 10_000 ? n : 120_000;
}

function ocrMinConfidence(): number {
  const n = Number(env("CAPTCHA_OCR_MIN_CONFIDENCE") ?? 35);
  return Number.isFinite(n) ? n : 35;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function normalizeCaptchaText(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, "").trim();
}

function looksLikeCaptcha(text: string): boolean {
  return text.length >= 3 && text.length <= 8;
}

type OcrWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string; confidence: number } }>;
};

let ocrWorkerPromise: Promise<OcrWorker> | null = null;

async function getOcrWorker(): Promise<OcrWorker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
        tessedit_pageseg_mode: "7" as unknown as string, // single text line
      });
      return worker;
    })();
  }
  return ocrWorkerPromise;
}

async function solveWithLocalOcr(image: Buffer): Promise<string | null> {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(image);
  const text = normalizeCaptchaText(data.text);
  const confidence = data.confidence ?? 0;

  if (!looksLikeCaptcha(text)) return null;
  if (confidence < ocrMinConfidence()) return null;
  return text;
}

async function solveWith2Captcha(apiKey: string, imageBase64: string): Promise<string> {
  const submitBody = new URLSearchParams({
    key: apiKey,
    method: "base64",
    body: imageBase64,
    json: "1",
  });

  const submitRes = await fetch("https://2captcha.com/in.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: submitBody,
  });
  const submitJson = (await submitRes.json()) as { status?: number; request?: string };
  if (submitJson.status !== 1 || !submitJson.request) {
    throw new Error(`2Captcha submit failed: ${JSON.stringify(submitJson)}`);
  }

  const taskId = submitJson.request;
  const deadline = Date.now() + timeoutMs();

  while (Date.now() < deadline) {
    await sleep(pollMs());
    const resultUrl = new URL("https://2captcha.com/res.php");
    resultUrl.searchParams.set("key", apiKey);
    resultUrl.searchParams.set("action", "get");
    resultUrl.searchParams.set("id", taskId);
    resultUrl.searchParams.set("json", "1");

    const resultRes = await fetch(resultUrl);
    const resultJson = (await resultRes.json()) as { status?: number; request?: string };
    if (resultJson.status === 1 && resultJson.request) {
      return normalizeCaptchaText(resultJson.request);
    }
    if (resultJson.request && !/NOT_READY|PROCESSING/i.test(resultJson.request)) {
      throw new Error(`2Captcha error: ${resultJson.request}`);
    }
  }

  throw new Error("2Captcha timed out waiting for solution");
}

async function solveWithCapSolver(apiKey: string, imageBase64: string): Promise<string> {
  const createRes = await fetch("https://api.capsolver.com/createTask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientKey: apiKey,
      task: { type: "ImageToTextTask", body: imageBase64 },
    }),
  });
  const createJson = (await createRes.json()) as {
    errorId?: number;
    errorDescription?: string;
    taskId?: string;
  };
  if (createJson.errorId !== 0 || !createJson.taskId) {
    throw new Error(`CapSolver createTask failed: ${createJson.errorDescription ?? "unknown"}`);
  }

  const taskId = createJson.taskId;
  const deadline = Date.now() + timeoutMs();

  while (Date.now() < deadline) {
    await sleep(pollMs());
    const resultRes = await fetch("https://api.capsolver.com/getTaskResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientKey: apiKey, taskId }),
    });
    const resultJson = (await resultRes.json()) as {
      errorId?: number;
      errorDescription?: string;
      status?: string;
      solution?: { text?: string };
    };
    if (resultJson.errorId !== 0) {
      throw new Error(`CapSolver error: ${resultJson.errorDescription ?? "unknown"}`);
    }
    if (resultJson.status === "ready" && resultJson.solution?.text) {
      return normalizeCaptchaText(resultJson.solution.text);
    }
    if (resultJson.status === "failed") {
      throw new Error("CapSolver could not solve CAPTCHA");
    }
  }

  throw new Error("CapSolver timed out waiting for solution");
}

async function solveWithPaidApi(image: Buffer): Promise<string> {
  const apiKey = env("CAPTCHA_API_KEY");
  if (!apiKey) {
    throw new Error("CAPTCHA_API_KEY is not set");
  }

  const base64 = image.toString("base64");
  const provider = captchaSolverProvider();
  const text =
    provider === "capsolver"
      ? await solveWithCapSolver(apiKey, base64)
      : await solveWith2Captcha(apiKey, base64);

  if (!text) throw new Error("Paid CAPTCHA solver returned empty text");
  return text;
}

/** Read CAPTCHA from image: local OCR first, optional paid API second. */
export async function solveCaptchaImage(image: Buffer): Promise<{ text: string; method: "ocr" | "api" }> {
  if (isAutoCaptchaEnabled()) {
    const local = await solveWithLocalOcr(image);
    if (local) return { text: local, method: "ocr" };
  }

  if (env("CAPTCHA_API_KEY")) {
    const text = await solveWithPaidApi(image);
    return { text, method: "api" };
  }

  throw new Error("Could not read CAPTCHA — local OCR was unsure and no CAPTCHA_API_KEY fallback");
}

export function captchaMaxRetries(): number {
  return maxRetries();
}
