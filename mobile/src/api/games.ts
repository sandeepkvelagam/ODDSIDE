import { api } from "./client";

export async function listGroupGames(groupId: string) {
  const res = await api.get(`/games?group_id=${groupId}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getGame(gameId: string) {
  const res = await api.get(`/games/${gameId}`);
  return res.data;
}
