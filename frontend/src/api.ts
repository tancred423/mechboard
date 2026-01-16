import type {
  Encounter,
  EncounterConfig,
  Folder,
  Preset,
  SyncSession,
  User,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Unknown error",
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export async function getMe(): Promise<User> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: getAuthHeader(),
  });
  return handleResponse<User>(response);
}

export function getDiscordLoginUrl(): string {
  return `${API_URL}/auth/discord`;
}

export async function getFolders(): Promise<Folder[]> {
  const response = await fetch(`${API_URL}/folders`, {
    headers: getAuthHeader(),
  });
  return handleResponse<Folder[]>(response);
}

export async function createFolder(
  name: string,
  sortOrder?: number,
): Promise<Folder> {
  const response = await fetch(`${API_URL}/folders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ name, sortOrder }),
  });
  return handleResponse<Folder>(response);
}

export async function updateFolder(
  id: string,
  data: { name?: string; sortOrder?: number; collapsed?: boolean },
): Promise<Folder> {
  const response = await fetch(`${API_URL}/folders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Folder>(response);
}

export async function deleteFolder(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/folders/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  return handleResponse<void>(response);
}

export async function reorderFolders(
  folders: { id: string; sortOrder: number }[],
): Promise<void> {
  const response = await fetch(`${API_URL}/folders/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ folders }),
  });
  return handleResponse<void>(response);
}

export async function getEncounters(): Promise<Encounter[]> {
  const response = await fetch(`${API_URL}/encounters`, {
    headers: getAuthHeader(),
  });
  return handleResponse<Encounter[]>(response);
}

export async function getEncounter(id: string): Promise<Encounter> {
  const response = await fetch(`${API_URL}/encounters/${id}`, {
    headers: getAuthHeader(),
  });
  return handleResponse<Encounter>(response);
}

export async function createEncounter(
  name: string,
  description: string | undefined,
  config: EncounterConfig,
): Promise<Encounter> {
  const response = await fetch(`${API_URL}/encounters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ name, description, config }),
  });
  return handleResponse<Encounter>(response);
}

export async function updateEncounter(
  id: string,
  data: { name?: string; description?: string; config?: EncounterConfig },
): Promise<Encounter> {
  const response = await fetch(`${API_URL}/encounters/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Encounter>(response);
}

export async function deleteEncounter(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/encounters/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  return handleResponse<void>(response);
}

export async function reorderEncounters(
  encounters: { id: string; sortOrder?: number; folderId?: string | null }[],
): Promise<void> {
  const response = await fetch(`${API_URL}/encounters/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ encounters }),
  });
  return handleResponse<void>(response);
}

export async function getPresets(): Promise<Preset[]> {
  const response = await fetch(`${API_URL}/presets`);
  return handleResponse<Preset[]>(response);
}

export async function getPreset(id: string): Promise<Preset> {
  const response = await fetch(`${API_URL}/presets/${id}`);
  return handleResponse<Preset>(response);
}

export async function startSyncSession(
  encounterId: string,
  initialState: EncounterConfig,
): Promise<{ sessionId: string; shareUrl: string }> {
  const response = await fetch(`${API_URL}/sync/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ encounterId, initialState }),
  });
  return handleResponse<{ sessionId: string; shareUrl: string }>(response);
}

export async function stopSyncSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/sync/${sessionId}/stop`, {
    method: "POST",
    headers: getAuthHeader(),
  });
  return handleResponse<void>(response);
}

export async function getSyncSession(sessionId: string): Promise<SyncSession> {
  const response = await fetch(`${API_URL}/sync/${sessionId}`);
  return handleResponse<SyncSession>(response);
}

export function getSyncWebSocketUrl(
  sessionId: string,
  isOwner: boolean,
): string {
  const wsBase = API_URL.replace(/^http/, "ws").replace(/\/api$/, "/api");
  const token = localStorage.getItem("auth_token") || "";
  return `${wsBase}/sync/${sessionId}/ws?owner=${isOwner}&token=${token}`;
}

export async function getActiveSyncEncounterIds(): Promise<string[]> {
  const response = await fetch(`${API_URL}/sync/active`, {
    headers: getAuthHeader(),
  });
  if (!response.ok) {
    return [];
  }
  return handleResponse<string[]>(response);
}

export async function getActiveSyncSession(encounterId: string): Promise<{
  sessionId: string;
  shareUrl: string;
  state: EncounterConfig;
} | null> {
  const response = await fetch(`${API_URL}/sync/active/${encounterId}`, {
    headers: getAuthHeader(),
  });
  if (response.status === 404) {
    return null;
  }
  return handleResponse<{
    sessionId: string;
    shareUrl: string;
    state: EncounterConfig;
  }>(response);
}
