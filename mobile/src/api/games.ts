import { api } from "./client";
import type { Game } from "../types";

export async function listGroupGames(groupId: string): Promise<Game[]> {
  const res = await api.get(`/groups/${groupId}/games`);
  return res.data?.games ?? res.data ?? [];
}

export async function getGame(gameId: string) {
  const res = await api.get(`/games/${gameId}`);
  return res.data;
}
