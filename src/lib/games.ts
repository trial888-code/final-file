export interface Game {
  id: string;
  name: string;
  slug: string;
  image: string;
  provider: string;
  popular?: boolean;
}

export const GAMES: Game[] = [
  { id: "1", name: "Fire Kirin", slug: "fire-kirin", image: "/games/Fire.webp", provider: "Fire Kirin", popular: true },
  { id: "2", name: "Game Room", slug: "game-room", image: "/games/Gameroom.webp", provider: "Game Room", popular: true },
  { id: "3", name: "Juwa", slug: "juwa", image: "/games/juwa.jpg", provider: "Juwa", popular: true },
  { id: "4", name: "Panda Master", slug: "panda-master", image: "/games/pandamaster.jpg", provider: "Panda Master", popular: true },
  { id: "5", name: "Ultra Panda", slug: "ultra-panda", image: "/games/Ultrapanda.jpg", provider: "Ultra Panda", popular: true },
  { id: "6", name: "Vegas Sweeps", slug: "vegas-sweeps", image: "/games/vegasweeps.jpg", provider: "Vegas Sweeps", popular: true },
  { id: "7", name: "Game Vault", slug: "game-vault", image: "/games/gamevault.jpg", provider: "Game Vault" },
  { id: "8", name: "Orion Stars", slug: "orion-stars", image: "/games/Orion.jpg", provider: "Orion Stars" },
  { id: "9", name: "Milky Way", slug: "milky-way", image: "/games/Milky ways.jpg", provider: "Milky Way" },
  { id: "10", name: "Cash Frenzy", slug: "cash-frenzy", image: "/games/Cashfenzy.jpg", provider: "Cash Frenzy" },
  { id: "11", name: "Cash Machine", slug: "cash-machine", image: "/games/Cashmachine.png", provider: "Cash Machine" },
  { id: "12", name: "Mafia", slug: "mafia", image: "/games/mafia.avif", provider: "Mafia" },
  { id: "13", name: "Vblink", slug: "vblink", image: "/games/Vblik.jpg", provider: "Vblink" },
];
