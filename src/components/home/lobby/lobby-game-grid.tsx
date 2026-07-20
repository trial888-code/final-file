"use client";

import type { Game } from "@/lib/games";
import { GameCard } from "@/components/home/game-card";

interface LobbyGameGridProps {
  games: Game[];
}

/** Exact 6-column dense grid matching reference casino UI */
export function LobbyGameGrid({ games }: LobbyGameGridProps) {
  return (
    <div className="lobby-games-grid">
      {games.map((game, index) => (
        <GameCard key={game.id} game={game} eager={index < 18} variant="lobby" />
      ))}
    </div>
  );
}
