import { api } from "./client";

// ============== GROUP MESSAGES ==============

export async function getGroupMessages(
  groupId: string,
  limit?: number,
  before?: string
) {
  const params = new URLSearchParams();
  if (limit) params.append("limit", String(limit));
  if (before) params.append("before", before);
  const query = params.toString();
  const res = await api.get(`/groups/${groupId}/messages${query ? `?${query}` : ""}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function postGroupMessage(
  groupId: string,
  content: string,
  replyTo?: string
) {
  const res = await api.post(`/groups/${groupId}/messages`, {
    content,
    reply_to: replyTo,
  });
  return res.data;
}

export async function editGroupMessage(
  groupId: string,
  messageId: string,
  content: string
) {
  const res = await api.put(`/groups/${groupId}/messages/${messageId}`, {
    content,
  });
  return res.data;
}

export async function deleteGroupMessage(
  groupId: string,
  messageId: string
) {
  const res = await api.delete(`/groups/${groupId}/messages/${messageId}`);
  return res.data;
}

// ============== POLLS ==============

export async function getGroupPolls(groupId: string, status?: string) {
  const query = status ? `?status=${status}` : "";
  const res = await api.get(`/groups/${groupId}/polls${query}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getPoll(groupId: string, pollId: string) {
  const res = await api.get(`/groups/${groupId}/polls/${pollId}`);
  return res.data;
}

export async function createPoll(
  groupId: string,
  question: string,
  options: string[],
  type: string = "availability",
  expiresInHours: number = 48
) {
  const res = await api.post(`/groups/${groupId}/polls`, {
    question,
    options,
    type,
    expires_in_hours: expiresInHours,
  });
  return res.data;
}

export async function voteOnPoll(
  groupId: string,
  pollId: string,
  optionId: string
) {
  const res = await api.post(`/groups/${groupId}/polls/${pollId}/vote`, {
    option_id: optionId,
  });
  return res.data;
}

export async function closePoll(groupId: string, pollId: string) {
  const res = await api.post(`/groups/${groupId}/polls/${pollId}/close`);
  return res.data;
}

// ============== AI SETTINGS ==============

export async function getGroupAISettings(groupId: string) {
  const res = await api.get(`/groups/${groupId}/ai-settings`);
  return res.data;
}

export async function updateGroupAISettings(
  groupId: string,
  settings: Record<string, any>
) {
  const res = await api.put(`/groups/${groupId}/ai-settings`, settings);
  return res.data;
}
