import { GAMES, filterHomeGames, type HomeGameTab } from "@/lib/games";
import type { LobbyMenuId } from "@/components/home/lobby/lobby-sidebar";

export function filterLobbyGames(menu: LobbyMenuId, search: string) {
  let list = filterHomeGames("all" as HomeGameTab, search);

  if (menu === "slots") {
    list = list.filter((g) => g.category === "Slots");
  } else if (menu === "fish") {
    list = list.filter((g) => g.category === "Fish Game");
  } else if (menu === "table") {
    list = list.filter((g) => g.category === "Table Games");
  } else if (menu === "live") {
    list = list.filter((g) => g.slug === "juwa" || g.slug === "vegas-sweeps" || g.slug === "game-vault");
  }

  return list;
}

export { GAMES };

