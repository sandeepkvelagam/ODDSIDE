import { api } from "./client";

export async function listGroups() {
  const res = await api.get("/groups");
  return Array.isArray(res.data) ? res.data : [];
}

export async function getGroup(groupId: string) {
  const res = await api.get(`/groups/${groupId}`);
  return res.data;
}
