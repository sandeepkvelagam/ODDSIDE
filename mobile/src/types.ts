export type Group = {
  _id: string;
  name: string;
  member_count?: number;
};

export type Game = {
  _id: string;
  status: "active" | "ended" | string;
  started_at?: string;
};
