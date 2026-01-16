<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useEncountersStore } from "@/stores/encounters";
import { useAuthStore } from "@/stores/auth";
import EncounterCard from "@/components/EncounterCard.vue";
import draggable from "vuedraggable";
import { getPresets, getActiveSyncEncounterIds } from "@/api";
import type { Encounter, Folder, Preset } from "@/types";

const encountersStore = useEncountersStore();
const authStore = useAuthStore();

const showCreateModal = ref(false);
const showImportModal = ref(false);
const showFolderModal = ref(false);
const newEncounterName = ref("");
const newEncounterDescription = ref("");
const newFolderName = ref("");
const importJson = ref("");
const importError = ref("");
const isCreating = ref(false);
const confirmDelete = ref<string | null>(null);
const confirmDeleteFolder = ref<string | null>(null);
const editingFolderId = ref<string | null>(null);
const editingFolderName = ref("");

const presets = ref<Preset[]>([]);
const selectedPresetId = ref<string>("");
const activeSyncEncounterIds = ref<string[]>([]);

const isDragging = ref(false);

const localRootEncounters = ref<Encounter[]>([]);
const localFolders = ref<Folder[]>([]);
const localFolderEncounters = ref<Record<string, Encounter[]>>({});

onMounted(async () => {
  encountersStore.fetchEncounters();
  try {
    presets.value = await getPresets();
  } catch {}
  if (authStore.isAuthenticated) {
    try {
      activeSyncEncounterIds.value = await getActiveSyncEncounterIds();
    } catch {}
  }
});

watch(
  () => encountersStore.rootEncounters,
  (newVal) => {
    localRootEncounters.value = [...newVal];
  },
  { immediate: true, deep: true },
);

watch(
  () => encountersStore.sortedFolders,
  (newVal) => {
    localFolders.value = [...newVal];
    const folderEncounters: Record<string, Encounter[]> = {};
    newVal.forEach((folder) => {
      folderEncounters[folder.id] = [
        ...encountersStore.getEncountersInFolder(folder.id),
      ];
    });
    localFolderEncounters.value = folderEncounters;
  },
  { immediate: true, deep: true },
);

watch(
  () => encountersStore.encounters,
  () => {
    const folderEncounters: Record<string, Encounter[]> = {};
    encountersStore.sortedFolders.forEach((folder) => {
      folderEncounters[folder.id] = [
        ...encountersStore.getEncountersInFolder(folder.id),
      ];
    });
    localFolderEncounters.value = folderEncounters;
    localRootEncounters.value = [...encountersStore.rootEncounters];
  },
  { deep: true },
);

function onRootEncountersChange(newList: Encounter[]) {
  encountersStore.reorderEncounters(newList, undefined);
}

function onFolderEncountersChange(folderId: string, newList: Encounter[]) {
  encountersStore.reorderEncounters(newList, folderId);
}

function onFoldersChange(newList: Folder[]) {
  encountersStore.reorderFolders(newList);
}

async function createEncounter() {
  if (!newEncounterName.value.trim()) return;

  isCreating.value = true;
  try {
    const preset = selectedPresetId.value
      ? presets.value.find((p) => p.id === selectedPresetId.value)
      : null;

    await encountersStore.createEncounter(
      newEncounterName.value.trim(),
      newEncounterDescription.value.trim() || undefined,
      preset?.config,
    );
    showCreateModal.value = false;
    newEncounterName.value = "";
    newEncounterDescription.value = "";
    selectedPresetId.value = "";
  } finally {
    isCreating.value = false;
  }
}

function selectPreset(presetId: string) {
  selectedPresetId.value = presetId;
  const preset = presets.value.find((p) => p.id === presetId);
  if (preset) {
    if (!newEncounterName.value.trim()) {
      newEncounterName.value = preset.name;
    }
    if (!newEncounterDescription.value.trim() && preset.description) {
      newEncounterDescription.value = preset.description;
    }
  }
}

function createFolder() {
  if (!newFolderName.value.trim()) return;
  encountersStore.createFolder(newFolderName.value.trim());
  showFolderModal.value = false;
  newFolderName.value = "";
}

function startEditFolder(folder: Folder) {
  editingFolderId.value = folder.id;
  editingFolderName.value = folder.name;
}

function saveEditFolder() {
  if (editingFolderId.value && editingFolderName.value.trim()) {
    encountersStore.updateFolder(editingFolderId.value, {
      name: editingFolderName.value.trim(),
    });
  }
  editingFolderId.value = null;
  editingFolderName.value = "";
}

function cancelEditFolder() {
  editingFolderId.value = null;
  editingFolderName.value = "";
}

async function handleImport() {
  importError.value = "";

  if (importJson.value.trim()) {
    const result = encountersStore.importFromJson(importJson.value.trim());
    if (result) {
      showImportModal.value = false;
      importJson.value = "";
    } else {
      importError.value = "Invalid JSON format";
    }
  } else {
    importError.value = "Please paste the JSON data";
  }
}

async function deleteEncounter(id: string) {
  await encountersStore.deleteEncounter(id);
  confirmDelete.value = null;
}

function deleteFolder(id: string) {
  encountersStore.deleteFolder(id);
  confirmDeleteFolder.value = null;
}

function onDragStart() {
  isDragging.value = true;
}

function onDragEnd() {
  isDragging.value = false;
}
</script>

<template>
  <div class="home container">
    <div class="page-header">
      <div class="header-text">
        <h1 class="page-title">Your Encounters</h1>
        <p class="page-subtitle">
          {{
            authStore.isAuthenticated
              ? "Your encounters are synced to your account"
              : "Stored locally in your browser. Login to sync across devices."
          }}
        </p>
      </div>

      <div class="header-actions">
        <button @click="showFolderModal = true" class="btn-secondary">
          📁 New Folder
        </button>
        <button @click="showImportModal = true" class="btn-secondary">
          📥 Import
        </button>
        <button @click="showCreateModal = true" class="btn-primary">
          ➕ New Encounter
        </button>
      </div>
    </div>

    <div v-if="encountersStore.loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading encounters...</p>
    </div>

    <div
      v-else-if="
        encountersStore.encounters.length === 0 &&
        encountersStore.folders.length === 0
      "
      class="empty-state"
    >
      <div class="empty-icon">📋</div>
      <h2>No encounters yet</h2>
      <p>Create your first mechanic board to track raid mechanics</p>
      <button @click="showCreateModal = true" class="btn-primary">
        Create Encounter
      </button>
    </div>

    <div v-else class="encounters-container">
      <div class="root-encounters">
        <draggable
          :list="localRootEncounters"
          item-key="id"
          group="encounters"
          :animation="0"
          class="encounters-grid"
          :class="{
            'is-empty':
              localRootEncounters.length === 0 && localFolders.length > 0,
          }"
          @change="onRootEncountersChange(localRootEncounters)"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <template #item="{ element: encounter }">
            <EncounterCard
              :encounter="encounter"
              :is-live="activeSyncEncounterIds.includes(encounter.id)"
              @delete="confirmDelete = encounter.id"
            />
          </template>
          <template #footer>
            <div
              v-if="
                localRootEncounters.length === 0 &&
                localFolders.length > 0 &&
                !isDragging
              "
              class="drop-placeholder"
            >
              Drag encounters here or create a new one
            </div>
            <div v-else-if="isDragging" class="drop-placeholder">Drop here</div>
          </template>
        </draggable>
      </div>

      <div v-if="localFolders.length > 0" class="folders-section">
        <h3 class="section-title">Folders</h3>
        <draggable
          :list="localFolders"
          item-key="id"
          handle=".folder-drag-handle"
          :animation="200"
          class="folders-list"
          @change="onFoldersChange(localFolders)"
        >
          <template #item="{ element: folder }">
            <div class="folder" :class="{ collapsed: folder.collapsed }">
              <div class="folder-header">
                <button class="folder-drag-handle" title="Drag to reorder">
                  ⋮⋮
                </button>
                <button
                  @click="encountersStore.toggleFolderCollapsed(folder.id)"
                  class="folder-toggle"
                >
                  {{ folder.collapsed ? "▶" : "▼" }}
                </button>
                <div v-if="editingFolderId === folder.id" class="folder-edit">
                  <input
                    v-model="editingFolderName"
                    @keyup.enter="saveEditFolder"
                    @keyup.escape="cancelEditFolder"
                    @blur="saveEditFolder"
                    class="folder-name-input"
                    autofocus
                  />
                </div>
                <span
                  v-else
                  class="folder-name"
                  @dblclick="startEditFolder(folder)"
                >
                  📁 {{ folder.name }}
                </span>
                <span class="folder-count">{{
                  localFolderEncounters[folder.id]?.length || 0
                }}</span>
                <button
                  @click="confirmDeleteFolder = folder.id"
                  class="folder-delete"
                  title="Delete folder"
                >
                  🗑️
                </button>
              </div>
              <div
                v-show="!folder.collapsed"
                class="folder-content"
                :data-drop-zone="folder.id"
              >
                <draggable
                  :list="localFolderEncounters[folder.id] || []"
                  item-key="id"
                  group="encounters"
                  :animation="0"
                  class="encounters-grid folder-encounters-grid"
                  :class="{
                    'is-empty': !localFolderEncounters[folder.id]?.length,
                  }"
                  @change="
                    onFolderEncountersChange(
                      folder.id,
                      localFolderEncounters[folder.id] || [],
                    )
                  "
                  @start="onDragStart"
                  @end="onDragEnd"
                >
                  <template #item="{ element: encounter }">
                    <EncounterCard
                      :encounter="encounter"
                      :is-live="activeSyncEncounterIds.includes(encounter.id)"
                      @delete="confirmDelete = encounter.id"
                    />
                  </template>
                  <template #footer>
                    <div
                      v-if="
                        !localFolderEncounters[folder.id]?.length && !isDragging
                      "
                      class="drop-placeholder"
                    >
                      Drag encounters here
                    </div>
                    <div v-else-if="isDragging" class="drop-placeholder">
                      Drop here
                    </div>
                  </template>
                </draggable>
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCreateModal"
          class="modal-overlay"
          @click.self="showCreateModal = false"
        >
          <div class="modal">
            <h2 class="modal-title">Create New Encounter</h2>
            <form @submit.prevent="createEncounter">
              <div class="form-group">
                <label for="encounter-name">Name</label>
                <input
                  id="encounter-name"
                  v-model="newEncounterName"
                  type="text"
                  placeholder="e.g., M1S, FRU, DSR..."
                  maxlength="128"
                  required
                  autofocus
                />
              </div>
              <div class="form-group">
                <label for="encounter-description"
                  >Description (optional)</label
                >
                <textarea
                  id="encounter-description"
                  v-model="newEncounterDescription"
                  placeholder="Any notes about this encounter..."
                  rows="3"
                ></textarea>
              </div>

              <template v-if="presets.length > 0">
                <div class="preset-divider">
                  <span>OR</span>
                </div>
                <div class="form-group">
                  <label for="preset-select">Import from Preset</label>
                  <select
                    id="preset-select"
                    :value="selectedPresetId"
                    @change="
                      selectPreset(($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option value="">Select a preset...</option>
                    <option
                      v-for="preset in presets"
                      :key="preset.id"
                      :value="preset.id"
                    >
                      {{ preset.name }}
                    </option>
                  </select>
                  <p v-if="selectedPresetId" class="preset-hint">
                    Preset config will be applied to the new encounter
                  </p>
                </div>
              </template>

              <div class="modal-actions">
                <button
                  type="button"
                  @click="showCreateModal = false"
                  class="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isCreating || !newEncounterName.trim()"
                  class="btn-primary"
                >
                  {{ isCreating ? "Creating..." : "Create" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="modal">
        <div
          v-if="showFolderModal"
          class="modal-overlay"
          @click.self="showFolderModal = false"
        >
          <div class="modal">
            <h2 class="modal-title">Create New Folder</h2>
            <form @submit.prevent="createFolder">
              <div class="form-group">
                <label for="folder-name">Folder Name</label>
                <input
                  id="folder-name"
                  v-model="newFolderName"
                  type="text"
                  placeholder="e.g., Dawntrail Savage, Ultimates..."
                  maxlength="64"
                  required
                  autofocus
                />
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  @click="showFolderModal = false"
                  class="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="!newFolderName.trim()"
                  class="btn-primary"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="modal">
        <div
          v-if="showImportModal"
          class="modal-overlay"
          @click.self="showImportModal = false"
        >
          <div class="modal">
            <h2 class="modal-title">Import Encounter</h2>
            <form @submit.prevent="handleImport">
              <div class="form-group">
                <label for="import-json">Paste JSON</label>
                <textarea
                  id="import-json"
                  v-model="importJson"
                  placeholder='{"name": "...", "config": {...}}'
                  rows="6"
                  class="json-input"
                  autofocus
                ></textarea>
              </div>
              <p v-if="importError" class="error-message">{{ importError }}</p>
              <div class="modal-actions">
                <button
                  type="button"
                  @click="showImportModal = false"
                  class="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" class="btn-primary">Import</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="modal">
        <div
          v-if="confirmDelete"
          class="modal-overlay"
          @click.self="confirmDelete = null"
        >
          <div class="modal modal-confirm">
            <h2 class="modal-title">Delete Encounter?</h2>
            <p class="modal-text">This action cannot be undone.</p>
            <div class="modal-actions">
              <button @click="confirmDelete = null" class="btn-secondary">
                Cancel
              </button>
              <button
                @click="deleteEncounter(confirmDelete)"
                class="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="modal">
        <div
          v-if="confirmDeleteFolder"
          class="modal-overlay"
          @click.self="confirmDeleteFolder = null"
        >
          <div class="modal modal-confirm">
            <h2 class="modal-title">Delete Folder?</h2>
            <p class="modal-text">
              Encounters inside will be moved to Uncategorized.
            </p>
            <div class="modal-actions">
              <button @click="confirmDeleteFolder = null" class="btn-secondary">
                Cancel
              </button>
              <button
                @click="deleteFolder(confirmDeleteFolder)"
                class="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.home {
  padding-bottom: 4rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-default);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-default);
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.encounters-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.folder {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-subtle);
}

.folder.collapsed .folder-header {
  border-bottom: none;
}

.folder-drag-handle {
  cursor: grab;
  padding: 0.25rem;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  letter-spacing: -2px;
}

.folder-drag-handle:hover {
  color: var(--text-secondary);
}

.folder-drag-handle:active {
  cursor: grabbing;
}

.folder-toggle {
  padding: 0.25rem;
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.folder-toggle:hover {
  color: var(--text-primary);
}

.folder-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
}

.folder-name:hover {
  color: var(--accent-primary);
}

.folder-edit {
  flex: 1;
}

.folder-name-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  font-size: inherit;
  font-weight: 500;
}

.folder-count {
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
}

.folder-delete {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  opacity: 0.5;
  transition: opacity var(--transition-fast);
}

.folder-delete:hover {
  opacity: 1;
}

.folder-content {
  padding: 1rem;
  min-height: 80px;
}

.folder-encounters-grid {
  min-height: 80px;
}

.encounters-grid.is-empty {
  min-height: 80px;
}

.drop-placeholder {
  padding: 2rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  border: 2px dashed var(--border-subtle);
  border-radius: var(--radius-md);
  transition: none !important;
  transform: none !important;
}

.encounters-grid:has(.sortable-ghost) .drop-placeholder {
  display: none;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.root-encounters {
  min-height: 100px;
}

.encounters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  min-height: 50px;
}

.encounters-grid:empty {
  min-height: 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}

.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-lg);
}

.modal-confirm {
  max-width: 360px;
  text-align: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.modal-text {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
}

.json-input {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.preset-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: var(--text-tertiary);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preset-divider::before,
.preset-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border-default);
}

.form-group select {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.9375rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.form-group select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(77, 184, 122, 0.15);
}

.preset-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--accent-primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95);
}

:deep(.sortable-ghost) {
  opacity: 0.4;
}

:deep(.sortable-drag) {
  opacity: 1;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .header-actions button {
    flex: 1;
    min-width: 140px;
  }

  .encounters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
