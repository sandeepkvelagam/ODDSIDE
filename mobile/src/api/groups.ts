import { api } from "./client";
import type { Group } from "../types";

export async function listGroups(): Promise<Group[]> {
  const res = await api.get("/groups");
  // Backend returns array directly or { groups: [...] }
  return res.data?.groups ?? res.data ?? [];
}

export async function getGroup(groupId: string) {
  const res = await api.get(`/groups/${groupId}`);
  return res.data;
}
