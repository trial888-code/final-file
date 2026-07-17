/** Rotating Spinora blog topics for scheduled AI generation. */
export const BLOG_CRON_TOPICS = [
  "How to claim the 50% first deposit bonus at Spinora",
  "Fire Kirin beginner tips for new players",
  "Juwa fish table strategy — ammo and target selection",
  "How to deposit with CashApp at Spinora step by step",
  "Best fish table games for beginners in 2026",
  "How VIP levels and daily rewards work at Spinora",
  "Game Vault vs Juwa — which should you play first",
  "How to redeem winnings safely at Spinora",
  "Orion Stars complete guide for new Spinora players",
  "Fish table games in Texas — getting started online",
  "Zelle deposits at Spinora — step-by-step guide",
  "Daily tasks and wheel spins — how Spinora rewards work",
] as const;

/** Pick a topic from the pool (changes every few days). */
export function pickBlogCronTopic(now = new Date()): string {
  const bucket = Math.floor(now.getTime() / (86400000 * 3));
  return BLOG_CRON_TOPICS[bucket % BLOG_CRON_TOPICS.length]!;
}
