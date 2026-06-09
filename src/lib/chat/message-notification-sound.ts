let audioContext: AudioContext | null = null;
let unlockPromise: Promise<void> | null = null;
let lastPlayedAt = 0;

const MIN_INTERVAL_MS = 600;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Ctx) return null;

  if (!audioContext) {
    audioContext = new Ctx();
  }

  return audioContext;
}

/** Call after a user gesture so mobile/desktop browsers allow notification sounds */
export function unlockMessageNotificationSound(): Promise<void> {
  if (unlockPromise) return unlockPromise;

  unlockPromise = (async () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Silent blip — required on iOS/Safari to fully unlock audio
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    } catch {
      unlockPromise = null;
    }
  })();

  return unlockPromise;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Short two-tone pop — similar feel to Messenger message alerts */
export async function playMessageNotificationSound() {
  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const t = ctx.currentTime + 0.02;
    playTone(ctx, 587.33, t, 0.09, 0.28);
    playTone(ctx, 880, t + 0.07, 0.11, 0.22);
    lastPlayedAt = now;
  } catch {
    // autoplay blocked — user must tap the page first
  }
}
