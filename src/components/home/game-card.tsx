"use client";

import type { Game } from "@/lib/games";
import { CompactGameCard } from "@/components/home/compact-game-card";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: Game;
  className?: string;
  eager?: boolean;
}

export function GameCard({ game, className, eager }: GameCardProps) {
  return (
    <div className={cn("w-full", className)}>
      <CompactGameCard game={game} variant="grid" eager={eager} />
    </div>
  );
}
