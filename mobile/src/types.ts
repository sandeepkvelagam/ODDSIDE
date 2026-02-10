export type Group = {
  _id: string;
  group_id?: string;
  name: string;
  member_count?: number;
  members?: Member[];
};

export type Member = {
  user_id: string;
  name?: string;
  email?: string;
  role: "admin" | "member";
};

export type Game = {
  _id: string;
  game_id?: string;
  title?: string;
  status: "active" | "ended" | string;
  buy_in_amount?: number;
  chips_per_buy_in?: number;
  started_at?: string;
  players?: Player[];
};

export type Player = {
  player_id: string;
  user_id: string;
  name?: string;
  email?: string;
  role: "host" | "player";
  chips: number;
  total_buy_in: number;
  cash_out: number;
};
