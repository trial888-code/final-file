import { GAMES, type Game } from "@/lib/games";
import type { MarketingGame } from "@/lib/data/marketing";

/** Map CMS / marketing catalog rows to home GameCard shape. */
export function marketingGamesToCards(catalog: MarketingGame[]): Game[] {
  if (!catalog.length) return GAMES;

  return catalog.map((g) => {
    const local = GAMES.find((x) => x.slug === g.slug);
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      image: g.image_url ?? local?.image ?? "/games/game-vault.webp",
      provider: local?.provider ?? g.name,
      category: local?.category ?? "Arcade",
      downloadUrl: g.download_url ?? local?.downloadUrl ?? "#",
      bio: g.description ?? local?.bio ?? "",
      players: local?.players ?? (g.popularity ?? 50) * 100,
      gradient: local?.gradient ?? "from-zinc-600 to-zinc-900",
      popular: g.is_featured ?? local?.popular,
      trending: (g.popularity ?? 0) > 90 || local?.trending,
      promotional: local?.promotional,
      upcoming: local?.upcoming,
    };
  });
}
