import { notFound } from "next/navigation";
import { GamePageShell } from "@/components/games/game-page-shell";
import { createMetadata } from "@/lib/seo/metadata";
import { GAMES, getGameBySlug } from "@/lib/games";
import { isWalletLoadEnabledForGame } from "@/lib/game-automation/config";

interface GamePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ create?: string }>;
}

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: GamePageProps) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return {};

  return createMetadata({
    title: `${game.name} — Download & Create Account`,
    description: game.bio,
    keywords: [game.name, game.category, "download", "game account", "Spinora", game.provider],
    path: `/games/${game.slug}`,
  });
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { slug } = await params;
  const { create } = await searchParams;
  const game = getGameBySlug(slug);

  if (!game) notFound();

  return (
    <GamePageShell
      game={game}
      autoCreate={create === "1"}
      walletLoadEnabled={isWalletLoadEnabledForGame(game.slug)}
    />
  );
}
