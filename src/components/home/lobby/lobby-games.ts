import { GAMES, filterHomeGames, type HomeGameTab } from "@/lib/games";
import type { LobbyMenuId } from "@/components/home/lobby/lobby-sidebar";

const LOBBY_CATEGORY_MAP: Partial<Record<LobbyMenuId, string[]>> = {
  slots: ["Slots"],
  fish: ["Fish Game"],
  table: ["Casino", "Arcade", "Vault", "All-In-One"],
};

export function filterLobbyGames(menu: LobbyMenuId, search: string) {
  let list = filterHomeGames("trending" as HomeGameTab, search);

  const categories = LOBBY_CATEGORY_MAP[menu];
  if (categories) {
    list = list.filter((g) => categories.includes(g.category));
  }

  return list;
}

export { GAMES };
