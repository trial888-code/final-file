/** Known-good Pexels covers when a post URL is missing or unsuitable. */
const RELIABLE_PEXELS = [
  "https://images.pexels.com/photos/8817671/pexels-photo-8817671.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/18425164/pexels-photo-18425164.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/36484265/pexels-photo-36484265.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/25798270/pexels-photo-25798270.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/4841182/pexels-photo-4841182.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/7267577/pexels-photo-7267577.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/29096083/pexels-photo-29096083.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/17370315/pexels-photo-17370315.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
];

/** Pexels IDs that often time out via Next.js image optimizer under load. */
const SLOW_PEXELS_IDS = new Set([
  "4690384",
  "6236114",
  "7584351",
  "163069",
  "3790639",
  "1006060",
]);

const GAME_ART_PATTERN =
  /\/games\/|fire-kirin|juwa|orion-stars|game-vault|panda-master|milky-way|vblink|cash-frenzy|vegas-sweeps|mafia|ultrapanda|gameroom|cash-machine|mr-all-in-one/i;

function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fallbackPexelsForSlug(slug: string): string {
  return RELIABLE_PEXELS[slugHash(slug) % RELIABLE_PEXELS.length]!;
}

function isSlowRemoteUrl(url: string): boolean {
  return [...SLOW_PEXELS_IDS].some((id) => url.includes(`/photos/${id}/`) || url.includes(`/photos/${id}.`));
}

export function isLocalGameCover(src: string): boolean {
  return src.startsWith("/games/");
}

/** Game logo / square art must not be used as blog card covers — they crop badly. */
function isUnsuitableCoverUrl(url: string | null): boolean {
  if (!url) return true;
  if (isLocalGameCover(url)) return true;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (/\.webp(\?|$)/i.test(url) && GAME_ART_PATTERN.test(url)) return true;
  if (url.startsWith("http") && GAME_ART_PATTERN.test(url) && !url.includes("pexels.com")) return true;
  if (url.startsWith("http") && isSlowRemoteUrl(url)) return true;
  return false;
}

/** Always use landscape photo covers suitable for card thumbnails. */
export function resolveBlogCoverUrl(slug: string, url: string | null): string | null {
  if (url && !isUnsuitableCoverUrl(url)) return url;
  return fallbackPexelsForSlug(slug);
}

export function isRemoteBlogCover(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function isPhotoCover(src: string): boolean {
  return isRemoteBlogCover(src) && src.includes("pexels.com");
}
