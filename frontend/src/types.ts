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

export interface EncounterConfig {
  cards: CardConfig[];
}

export interface Encounter {
  id: string;
  name: string;
  description?: string;
  config: EncounterConfig;
  folderId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  sortOrder: number;
  collapsed: boolean;
  createdAt: string;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  config: EncounterConfig;
}

export interface User {
  id: string;
  discordId: string;
  username: string;
  avatar?: string;
  createdAt: string;
}

export interface SyncSession {
  sessionId: string;
  name: string;
  description?: string;
  state: EncounterConfig;
  owner: string;
}

export type ThemeMode = "light" | "dark" | "system";

export type ViewMode = "default" | "compact";
