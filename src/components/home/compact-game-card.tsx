"use client";

import Link from "next/link";
import Image from "next/image";
import type { Game } from "@/lib/games";
import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/shared/tilt-card";

interface CompactGameCardProps {
  game: Game;
  variant?: "slider" | "grid" | "lobby";
  className?: string;
  eager?: boolean;
}

export function CompactGameCard({
  game,
  variant = "grid",
  className,
  eager = false,
}: CompactGameCardProps) {
  const { ref, inView } = useInView("800px", eager);
  const showImage = eager || inView;
  const href = `/games/${game.slug}`;

  const inner = (
    <>
      {showImage ? (
        <Image
          src={game.image}
          alt={game.name}
          fill
          priority={eager}
          loading={eager ? "eager" : "lazy"}
          className={cn(
            "transition-transform duration-300 group-hover:scale-[1.03]",
            variant === "lobby" ? "object-cover object-center" : "object-cover object-center"
          )}
          sizes={
            variant === "lobby"
              ? "(max-width: 1024px) 16vw, 140px"
              : variant === "slider"
                ? "148px"
                : "(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
          }
        />
      ) : (
        <div className="absolute inset-0 bg-purple-900/30 animate-pulse" aria-hidden />
      )}

      {variant !== "lobby" && (
        <div className="absolute inset-x-0 bottom-0 z-10 px-2 pb-2.5 pt-10 text-center bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <p className="text-[11px] sm:text-xs font-bold text-white leading-tight line-clamp-2">
            {game.name}
          </p>
          <p className="text-[9px] sm:text-[10px] text-amber-400 font-bold mt-0.5 group-hover:text-amber-300 transition-colors">
            {game.upcoming ? "Coming Soon" : "⚡ 1-Click Load"}
          </p>
        </div>
      )}

      {game.upcoming && variant !== "lobby" && (
        <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md bg-blue-500/90 text-[9px] font-bold text-white">
          SOON
        </span>
      )}

      {game.upcoming && variant === "lobby" && (
        <span className="absolute top-1 right-1 z-20 px-1 py-0.5 rounded bg-blue-600/90 text-[7px] font-bold text-white">
          SOON
        </span>
      )}
    </>
  );

  const classNames = cn(
    "group relative block overflow-hidden text-left transition-all",
    variant === "lobby"
      ? "lobby-game-card w-full"
      : variant === "slider"
        ? "game-slider-card w-[128px] sm:w-[148px] aspect-[3/4] shrink-0 rounded-2xl border border-amber-500/30 hover:border-amber-400 shadow-lg"
        : "game-card w-full aspect-[3/4] rounded-2xl border border-amber-500/30 hover:border-amber-400 shadow-lg",
    className
  );

  const card = (
    <div className={classNames}>
      <Link
        href={href}
        className="absolute inset-0 z-20"
        aria-label={game.upcoming ? `${game.name} — coming soon` : `View ${game.name}`}
        onPointerDown={variant === "slider" ? (e) => e.stopPropagation() : undefined}
        draggable={false}
      >
        <span className="sr-only">{game.name}</span>
      </Link>
      {inner}
    </div>
  );

  return (
    <div ref={ref} className={variant === "lobby" ? "lobby-game-cell" : "w-full"}>
      {variant === "lobby" ? card : <TiltCard>{card}</TiltCard>}
    </div>
  );
}
