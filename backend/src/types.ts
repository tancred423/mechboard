export interface OptionConfig {
  id: string;
  name: string;
  selected: boolean;
}

export interface CardConfig {
  id: string;
  name: string;
  selectionMode: "single" | "multi";
  options: OptionConfig[];
}

export interface SetupConfig {
  id: string;
  name: string;
  description?: string;
  cards: CardConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  discordId: string;
  username: string;
  avatar?: string;
  createdAt: string;
}

export interface StoredSetup {
  id: string;
  userId: string;
  name: string;
  description?: string;
  config: string;
  shareCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JWTPayload {
  userId: string;
  discordId: string;
  username: string;
  exp: number;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name?: string;
}
