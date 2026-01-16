import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  CardConfig,
  Encounter,
  EncounterConfig,
  Folder,
  OptionConfig,
} from "@/types";
import * as api from "@/api";
import { useAuthStore } from "./auth";

const LOCAL_STORAGE_KEY = "mechboard_local_encounters";
const LOCAL_FOLDERS_KEY = "mechboard_local_folders";

function generateId(): string {
  return crypto.randomUUID();
}

function loadLocalEncounters(): Encounter[] {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      const encounters = JSON.parse(stored);
      return encounters.map((e: Encounter, i: number) => ({
        ...e,
        sortOrder: e.sortOrder ?? i,
      }));
    } catch {
      return [];
    }
  }
  return [];
}

function saveLocalEncounters(encounters: Encounter[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(encounters));
}

function loadLocalFolders(): Folder[] {
  const stored = localStorage.getItem(LOCAL_FOLDERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

function saveLocalFolders(folders: Folder[]) {
  localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
}

export const useEncountersStore = defineStore("encounters", () => {
  const authStore = useAuthStore();
  const encounters = ref<Encounter[]>([]);
  const folders = ref<Folder[]>([]);
  const currentEncounter = ref<Encounter | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isLocalMode = computed(() => !authStore.isAuthenticated);

  const sortedFolders = computed(() =>
    [...folders.value].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  const rootEncounters = computed(() =>
    encounters.value
      .filter((e) => !e.folderId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  function getEncountersInFolder(folderId: string): Encounter[] {
    return encounters.value
      .filter((e) => e.folderId === folderId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async function fetchEncounters() {
    loading.value = true;
    error.value = null;
    try {
      if (isLocalMode.value) {
        encounters.value = loadLocalEncounters();
        folders.value = loadLocalFolders();
      } else {
        const [serverEncounters, serverFolders] = await Promise.all([
          api.getEncounters(),
          api.getFolders(),
        ]);
        encounters.value = serverEncounters;
        folders.value = serverFolders;
      }
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to load encounters";
    } finally {
      loading.value = false;
    }
  }

  async function createEncounter(
    name: string,
    description?: string,
    presetConfig?: EncounterConfig,
    folderId?: string,
  ): Promise<Encounter> {
    const config: EncounterConfig = presetConfig
      ? JSON.parse(JSON.stringify(presetConfig))
      : { cards: [] };
    const maxSortOrder = encounters.value
      .filter((e) => e.folderId === folderId)
      .reduce((max, e) => Math.max(max, e.sortOrder), -1);

    if (isLocalMode.value) {
      const newEncounter: Encounter = {
        id: generateId(),
        name,
        description,
        config,
        folderId,
        sortOrder: maxSortOrder + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      encounters.value.push(newEncounter);
      saveLocalEncounters(encounters.value);
      return newEncounter;
    } else {
      const newEncounter = await api.createEncounter(name, description, config);
      newEncounter.folderId = folderId;
      newEncounter.sortOrder = maxSortOrder + 1;
      if (folderId || maxSortOrder >= 0) {
        await api.reorderEncounters([
          {
            id: newEncounter.id,
            folderId: folderId || null,
            sortOrder: maxSortOrder + 1,
          },
        ]);
      }
      encounters.value.push(newEncounter);
      return newEncounter;
    }
  }

  async function updateEncounter(
    id: string,
    data: Partial<Encounter>,
  ): Promise<void> {
    if (isLocalMode.value) {
      const index = encounters.value.findIndex((e) => e.id === id);
      if (index !== -1) {
        encounters.value[index] = {
          ...encounters.value[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        saveLocalEncounters(encounters.value);
        if (currentEncounter.value?.id === id) {
          currentEncounter.value = encounters.value[index];
        }
      }
    } else {
      const updated = await api.updateEncounter(id, data);
      const index = encounters.value.findIndex((e) => e.id === id);
      if (index !== -1) {
        encounters.value[index] = {
          ...encounters.value[index],
          ...updated,
        };
      }
      if (currentEncounter.value?.id === id) {
        currentEncounter.value = encounters.value[index];
      }
    }
  }

  async function deleteEncounter(id: string): Promise<void> {
    if (isLocalMode.value) {
      encounters.value = encounters.value.filter((e) => e.id !== id);
      saveLocalEncounters(encounters.value);
    } else {
      await api.deleteEncounter(id);
      encounters.value = encounters.value.filter((e) => e.id !== id);
    }
    if (currentEncounter.value?.id === id) {
      currentEncounter.value = null;
    }
  }

  async function createFolder(name: string): Promise<Folder> {
    const maxSortOrder = folders.value.reduce(
      (max, f) => Math.max(max, f.sortOrder),
      -1,
    );

    if (isLocalMode.value) {
      const newFolder: Folder = {
        id: generateId(),
        name,
        sortOrder: maxSortOrder + 1,
        collapsed: false,
        createdAt: new Date().toISOString(),
      };
      folders.value.push(newFolder);
      saveLocalFolders(folders.value);
      return newFolder;
    } else {
      const newFolder = await api.createFolder(name, maxSortOrder + 1);
      folders.value.push(newFolder);
      return newFolder;
    }
  }

  async function updateFolder(
    id: string,
    data: Partial<Folder>,
  ): Promise<void> {
    if (isLocalMode.value) {
      const folder = folders.value.find((f) => f.id === id);
      if (folder) {
        Object.assign(folder, data);
        saveLocalFolders(folders.value);
      }
    } else {
      const updated = await api.updateFolder(id, data);
      const index = folders.value.findIndex((f) => f.id === id);
      if (index !== -1) {
        folders.value[index] = updated;
      }
    }
  }

  async function deleteFolder(id: string): Promise<void> {
    if (isLocalMode.value) {
      encounters.value.forEach((e) => {
        if (e.folderId === id) {
          e.folderId = undefined;
        }
      });
      saveLocalEncounters(encounters.value);
      folders.value = folders.value.filter((f) => f.id !== id);
      saveLocalFolders(folders.value);
    } else {
      await api.deleteFolder(id);
      encounters.value.forEach((e) => {
        if (e.folderId === id) {
          e.folderId = undefined;
        }
      });
      folders.value = folders.value.filter((f) => f.id !== id);
    }
  }

  async function toggleFolderCollapsed(id: string): Promise<void> {
    const folder = folders.value.find((f) => f.id === id);
    if (folder) {
      const newCollapsed = !folder.collapsed;
      folder.collapsed = newCollapsed;
      if (isLocalMode.value) {
        saveLocalFolders(folders.value);
      } else {
        await api.updateFolder(id, { collapsed: newCollapsed });
      }
    }
  }

  async function moveEncounterToFolder(
    encounterId: string,
    folderId: string | undefined,
  ): Promise<void> {
    const encounter = encounters.value.find((e) => e.id === encounterId);
    if (encounter) {
      const targetEncounters = encounters.value.filter(
        (e) => e.folderId === folderId,
      );
      const maxSortOrder = targetEncounters.reduce(
        (max, e) => Math.max(max, e.sortOrder),
        -1,
      );
      encounter.folderId = folderId;
      encounter.sortOrder = maxSortOrder + 1;

      if (isLocalMode.value) {
        saveLocalEncounters(encounters.value);
      } else {
        await api.reorderEncounters([
          {
            id: encounterId,
            folderId: folderId || null,
            sortOrder: maxSortOrder + 1,
          },
        ]);
      }
    }
  }

  async function reorderEncounters(
    newOrder: Encounter[],
    folderId?: string,
  ): Promise<void> {
    const updates: {
      id: string;
      sortOrder: number;
      folderId: string | null;
    }[] = [];
    newOrder.forEach((encounter, index) => {
      const e = encounters.value.find((x) => x.id === encounter.id);
      if (e) {
        e.sortOrder = index;
        e.folderId = folderId;
        updates.push({
          id: e.id,
          sortOrder: index,
          folderId: folderId || null,
        });
      }
    });

    if (isLocalMode.value) {
      saveLocalEncounters(encounters.value);
    } else {
      await api.reorderEncounters(updates);
    }
  }

  async function reorderFolders(newOrder: Folder[]): Promise<void> {
    const updates: { id: string; sortOrder: number }[] = [];
    newOrder.forEach((folder, index) => {
      const f = folders.value.find((x) => x.id === folder.id);
      if (f) {
        f.sortOrder = index;
        updates.push({ id: f.id, sortOrder: index });
      }
    });

    if (isLocalMode.value) {
      saveLocalFolders(folders.value);
    } else {
      await api.reorderFolders(updates);
    }
  }

  function setCurrentEncounter(encounter: Encounter | null) {
    currentEncounter.value = encounter
      ? { ...encounter, config: JSON.parse(JSON.stringify(encounter.config)) }
      : null;
  }

  function applySyncState(state: EncounterConfig) {
    if (currentEncounter.value) {
      currentEncounter.value.config = JSON.parse(JSON.stringify(state));
    }
  }

  function addCard(name: string, selectionMode: "single" | "multi" = "single") {
    if (!currentEncounter.value) return;

    const newCard: CardConfig = {
      id: generateId(),
      name,
      selectionMode,
      options: [],
    };
    currentEncounter.value.config.cards.push(newCard);
  }

  function updateCard(cardId: string, data: Partial<CardConfig>) {
    if (!currentEncounter.value) return;

    const card = currentEncounter.value.config.cards.find(
      (c) => c.id === cardId,
    );
    if (card) {
      Object.assign(card, data);
    }
  }

  function deleteCard(cardId: string) {
    if (!currentEncounter.value) return;

    currentEncounter.value.config.cards =
      currentEncounter.value.config.cards.filter((c) => c.id !== cardId);
  }

  function addOption(cardId: string, name: string) {
    if (!currentEncounter.value) return;

    const card = currentEncounter.value.config.cards.find(
      (c) => c.id === cardId,
    );
    if (card && card.options.length < 20) {
      card.options.push({
        id: generateId(),
        name,
        selected: false,
      });
    }
  }

  function updateOption(
    cardId: string,
    optionId: string,
    data: Partial<OptionConfig>,
  ) {
    if (!currentEncounter.value) return;

    const card = currentEncounter.value.config.cards.find(
      (c) => c.id === cardId,
    );
    if (card) {
      const option = card.options.find((o) => o.id === optionId);
      if (option) {
        Object.assign(option, data);
      }
    }
  }

  function deleteOption(cardId: string, optionId: string) {
    if (!currentEncounter.value) return;

    const card = currentEncounter.value.config.cards.find(
      (c) => c.id === cardId,
    );
    if (card) {
      card.options = card.options.filter((o) => o.id !== optionId);
    }
  }

  function toggleOption(cardId: string, optionId: string) {
    if (!currentEncounter.value) return;

    const card = currentEncounter.value.config.cards.find(
      (c) => c.id === cardId,
    );
    if (!card) return;

    const option = card.options.find((o) => o.id === optionId);
    if (!option) return;

    if (card.selectionMode === "single") {
      card.options.forEach((o) => {
        o.selected = o.id === optionId ? !o.selected : false;
      });
    } else {
      option.selected = !option.selected;
    }
  }

  function resetAllSelections() {
    if (!currentEncounter.value) return;

    currentEncounter.value.config.cards.forEach((card) => {
      card.options.forEach((option) => {
        option.selected = false;
      });
    });
  }

  async function saveCurrentEncounter(): Promise<void> {
    if (!currentEncounter.value) return;
    await updateEncounter(currentEncounter.value.id, {
      name: currentEncounter.value.name,
      description: currentEncounter.value.description,
      config: currentEncounter.value.config,
    });
  }

  function exportToJson(): string {
    if (!currentEncounter.value) return "";
    return JSON.stringify({
      name: currentEncounter.value.name,
      description: currentEncounter.value.description,
      config: currentEncounter.value.config,
    });
  }

  async function importFromJson(json: string): Promise<Encounter | null> {
    try {
      const data = JSON.parse(json);
      if (data.name && data.config && Array.isArray(data.config.cards)) {
        const maxSortOrder = encounters.value
          .filter((e) => !e.folderId)
          .reduce((max, e) => Math.max(max, e.sortOrder), -1);

        if (isLocalMode.value) {
          const newEncounter: Encounter = {
            id: generateId(),
            name: data.name,
            description: data.description,
            config: data.config,
            sortOrder: maxSortOrder + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          encounters.value.push(newEncounter);
          saveLocalEncounters(encounters.value);
          return newEncounter;
        } else {
          const newEncounter = await api.createEncounter(
            data.name,
            data.description,
            data.config,
          );
          newEncounter.sortOrder = maxSortOrder + 1;
          encounters.value.push(newEncounter);
          return newEncounter;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  function clearAndReload() {
    encounters.value = [];
    folders.value = [];
    currentEncounter.value = null;
    fetchEncounters();
  }

  async function migrateLocalEncountersToAccount(): Promise<number> {
    const localEncounters = loadLocalEncounters();
    const localFolders = loadLocalFolders();

    if (localEncounters.length === 0 && localFolders.length === 0) return 0;

    const folderIdMap: Record<string, string> = {};
    let migratedCount = 0;

    for (const folder of localFolders) {
      try {
        const newFolder = await api.createFolder(folder.name, folder.sortOrder);
        folderIdMap[folder.id] = newFolder.id;
      } catch (e) {
        console.error("Failed to migrate folder:", folder.name, e);
      }
    }

    for (const encounter of localEncounters) {
      try {
        const newEncounter = await api.createEncounter(
          encounter.name,
          encounter.description,
          encounter.config,
        );
        const newFolderId = encounter.folderId
          ? folderIdMap[encounter.folderId]
          : null;
        if (newFolderId || encounter.sortOrder !== 0) {
          await api.reorderEncounters([
            {
              id: newEncounter.id,
              folderId: newFolderId,
              sortOrder: encounter.sortOrder,
            },
          ]);
        }
        migratedCount++;
      } catch (e) {
        console.error("Failed to migrate encounter:", encounter.name, e);
      }
    }

    if (migratedCount > 0 || Object.keys(folderIdMap).length > 0) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LOCAL_FOLDERS_KEY);
    }

    return migratedCount;
  }

  return {
    encounters,
    folders,
    currentEncounter,
    loading,
    error,
    isLocalMode,
    sortedFolders,
    rootEncounters,
    getEncountersInFolder,
    fetchEncounters,
    createEncounter,
    updateEncounter,
    deleteEncounter,
    createFolder,
    updateFolder,
    deleteFolder,
    toggleFolderCollapsed,
    moveEncounterToFolder,
    reorderEncounters,
    reorderFolders,
    setCurrentEncounter,
    applySyncState,
    addCard,
    updateCard,
    deleteCard,
    addOption,
    updateOption,
    deleteOption,
    toggleOption,
    resetAllSelections,
    saveCurrentEncounter,
    exportToJson,
    importFromJson,
    clearAndReload,
    migrateLocalEncountersToAccount,
  };
});
