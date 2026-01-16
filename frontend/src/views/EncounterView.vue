<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEncountersStore } from "@/stores/encounters";
import { useSettingsStore } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import {
  startSyncSession,
  stopSyncSession,
  getSyncWebSocketUrl,
  getActiveSyncSession,
} from "@/api";
import MechCard from "@/components/MechCard.vue";

const route = useRoute();
const router = useRouter();
const encountersStore = useEncountersStore();
const settingsStore = useSettingsStore();
const authStore = useAuthStore();

const loading = ref(true);
const copied = ref(false);

const syncActive = ref(false);
const syncSessionId = ref<string | null>(null);
const syncShareUrl = ref<string | null>(null);
const syncViewers = ref(0);
const syncCopied = ref(false);
const showSyncModal = ref(false);

let syncSocket: WebSocket | null = null;

const encounterId = computed(() => route.params.id as string);

onMounted(async () => {
  await encountersStore.fetchEncounters();
  const encounter = encountersStore.encounters.find(
    (e) => e.id === encounterId.value,
  );
  if (encounter) {
    encountersStore.setCurrentEncounter(encounter);
    await checkExistingSession();
  } else {
    router.replace("/");
  }
  loading.value = false;
});

async function checkExistingSession() {
  if (!authStore.isAuthenticated) return;

  try {
    const existingSession = await getActiveSyncSession(encounterId.value);
    if (existingSession) {
      syncSessionId.value = existingSession.sessionId;
      syncShareUrl.value = `${window.location.origin}${existingSession.shareUrl}`;
      syncActive.value = true;

      if (encountersStore.currentEncounter && existingSession.state) {
        encountersStore.currentEncounter.config = existingSession.state;
      }

      connectSyncSocket();
    }
  } catch {
    // No active session, that's fine
  }
}

watch(
  () => route.params.id,
  (newId) => {
    const encounter = encountersStore.encounters.find((e) => e.id === newId);
    if (encounter) {
      encountersStore.setCurrentEncounter(encounter);
    }
  },
);

function handleToggle(cardId: string, optionId: string) {
  encountersStore.toggleOption(cardId, optionId);
  if (syncActive.value) {
    sendSyncUpdate();
  }
}

function handleReset() {
  encountersStore.resetAllSelections();
  if (syncActive.value) {
    sendSyncUpdate();
  }
}

function handleExport() {
  const json = encountersStore.exportToJson();
  if (json) {
    navigator.clipboard.writeText(json);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
}

async function handleSync() {
  if (!authStore.isAuthenticated) {
    showSyncModal.value = true;
    return;
  }

  if (syncActive.value) {
    showSyncModal.value = true;
  } else {
    await handleStartSync();
  }
}

async function handleStartSync() {
  if (!encountersStore.currentEncounter) return;

  try {
    const result = await startSyncSession(
      encounterId.value,
      encountersStore.currentEncounter.config,
    );
    syncSessionId.value = result.sessionId;
    syncShareUrl.value = `${window.location.origin}${result.shareUrl}`;
    syncActive.value = true;

    connectSyncSocket();
    showSyncModal.value = true;
  } catch (err) {
    console.error("Failed to start sync:", err);
  }
}

async function handleStopSync() {
  if (!syncSessionId.value) return;

  try {
    await stopSyncSession(syncSessionId.value);
  } catch (err) {
    console.error("Failed to stop sync:", err);
  } finally {
    cleanupSync();
    closeSyncModal();
  }
}

function connectSyncSocket() {
  if (!syncSessionId.value) return;

  syncSocket = new WebSocket(getSyncWebSocketUrl(syncSessionId.value, true));

  syncSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "viewers") {
        syncViewers.value = data.count;
      }
    } catch (err) {
      console.error("WebSocket message error:", err);
    }
  };

  syncSocket.onclose = () => {
    if (syncActive.value) {
      setTimeout(connectSyncSocket, 3000);
    }
  };
}

function sendSyncUpdate() {
  if (
    syncSocket &&
    syncSocket.readyState === WebSocket.OPEN &&
    encountersStore.currentEncounter
  ) {
    syncSocket.send(
      JSON.stringify({
        type: "update",
        state: encountersStore.currentEncounter.config,
      }),
    );
  }
}

function cleanupSync() {
  syncActive.value = false;
  syncSessionId.value = null;
  syncShareUrl.value = null;
  syncViewers.value = 0;

  if (syncSocket) {
    syncSocket.close();
    syncSocket = null;
  }
}

function copySyncUrl() {
  if (syncShareUrl.value) {
    navigator.clipboard.writeText(syncShareUrl.value);
    syncCopied.value = true;
    setTimeout(() => (syncCopied.value = false), 2000);
  }
}

function closeSyncModal() {
  showSyncModal.value = false;
}

onUnmounted(() => {
  cleanupSync();
});
</script>

<template>
  <div class="encounter-view container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading encounter...</p>
    </div>

    <template v-else-if="encountersStore.currentEncounter">
      <div
        class="view-header"
        :class="{ compact: settingsStore.viewMode === 'compact' }"
      >
        <div class="header-left">
          <router-link to="/" class="back-link">← Back</router-link>
          <div class="header-text">
            <h1 class="view-title">
              {{ encountersStore.currentEncounter.name }}
            </h1>
            <p
              v-if="encountersStore.currentEncounter.description"
              class="view-description"
            >
              {{ encountersStore.currentEncounter.description }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button @click="handleReset" class="btn-reset">🔄 Reset All</button>
          <button
            @click="handleSync"
            class="btn-sync"
            :class="{ active: syncActive }"
          >
            <span v-if="syncActive">🟢 Live ({{ syncViewers }})</span>
            <span v-else>📡 Sync</span>
          </button>
          <button @click="handleExport" class="btn-export">
            {{ copied ? "✓ Copied" : "📤 Export" }}
          </button>
          <router-link :to="`/encounter/${encounterId}/edit`" class="btn-edit">
            ✏️ Edit
          </router-link>
        </div>
      </div>

      <div
        v-if="encountersStore.currentEncounter.config.cards.length === 0"
        class="empty-state"
      >
        <div class="empty-icon">🎯</div>
        <h2>No mechanics yet</h2>
        <p>Edit this encounter to add mechanics</p>
        <router-link :to="`/encounter/${encounterId}/edit`" class="btn-primary">
          Add Mechanics
        </router-link>
      </div>

      <div v-else class="cards-list">
        <MechCard
          v-for="card in encountersStore.currentEncounter.config.cards"
          :key="card.id"
          :card="card"
          @toggle-option="(optionId) => handleToggle(card.id, optionId)"
        />
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="showSyncModal"
        class="modal-overlay"
        @click.self="closeSyncModal"
      >
        <div class="modal">
          <button @click="closeSyncModal" class="modal-close">×</button>

          <template v-if="!authStore.isAuthenticated">
            <div class="modal-header">
              <h2>📡 Live Sync</h2>
            </div>
            <div class="modal-content">
              <p class="sync-info">
                Live Sync lets you share your board in real-time with others.
                Only you can control it — they watch your selections live. The
                people you share it with do <span class="bold">not</span> have
                to login.
              </p>
              <p class="login-hint">
                You need to be logged in to use this feature.
              </p>
              <a :href="authStore.loginUrl" class="btn-discord">
                <svg
                  class="discord-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                  />
                </svg>
                Login with Discord
              </a>
            </div>
          </template>

          <template v-else-if="syncActive">
            <div class="modal-header">
              <h2>🟢 Live Sync Active</h2>
            </div>
            <div class="modal-content">
              <p class="sync-info">
                Share this link with others. They'll see your selections in
                real-time and only you can manage the board. The people you
                share this with do <span class="bold">not</span> have to login.
              </p>

              <div class="url-box">
                <input
                  type="text"
                  :value="syncShareUrl"
                  readonly
                  class="url-input"
                />
                <button @click="copySyncUrl" class="btn-copy">
                  {{ syncCopied ? "✓" : "📋" }}
                </button>
              </div>

              <div class="viewers-count">
                <span class="viewers-dot"></span>
                {{ syncViewers }} viewer{{
                  syncViewers !== 1 ? "s" : ""
                }}
                connected
              </div>

              <button @click="handleStopSync" class="btn-stop">
                Stop Sync
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.encounter-view {
  padding-bottom: 4rem;
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

.view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
  transition: all var(--transition-fast);
}

.view-header.compact {
  gap: 1rem;
  margin-bottom: 1rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: gap var(--transition-fast);
}

.view-header.compact .header-left {
  gap: 0.25rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.view-header.compact .back-link {
  font-size: 0.75rem;
}

.back-link:hover {
  color: var(--text-primary);
}

.view-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  transition: font-size var(--transition-fast);
}

.view-header.compact .view-title {
  font-size: 1.25rem;
}

.view-description {
  color: var(--text-secondary);
  font-size: 0.9375rem;
  transition: font-size var(--transition-fast);
}

.view-header.compact .view-description {
  font-size: 0.8125rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.btn-reset,
.btn-edit,
.btn-export,
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 44px;
  padding: 0 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all var(--transition-fast);
  box-sizing: border-box;
}

.btn-reset {
  background: var(--accent-secondary);
  color: var(--text-inverse);
  border: 1px solid var(--accent-secondary);
}

.btn-reset:hover {
  filter: brightness(1.1);
}

.btn-export {
  width: 110px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-export:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.btn-edit {
  width: 100px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-edit:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
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

.cards-list {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap, 1.5rem);
}

.btn-sync {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 44px;
  padding: 0 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn-sync:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.btn-sync.active {
  background: var(--accent-success);
  border-color: var(--accent-success);
  color: white;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 420px;
  position: relative;
  animation: modalIn 0.2s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  font-size: 1.25rem;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.modal-header {
  padding: 1.5rem 1.5rem 0;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-content {
  padding: 1rem 1.5rem 1.5rem;
}

.sync-info {
  color: var(--text-secondary);
  font-size: 0.9375rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.login-hint {
  color: var(--text-tertiary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.url-box {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.url-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-primary);
}

.btn-copy {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all var(--transition-fast);
}

.btn-copy:hover {
  background: var(--bg-elevated);
}

.viewers-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.viewers-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-success);
  animation: pulse 2s ease-in-out infinite;
}

.btn-stop {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: #ef4444;
  font-size: 0.9375rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.btn-stop:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.btn-discord {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  height: 44px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: white;
  background: #5865f2;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background var(--transition-fast);
}

.btn-discord:hover {
  background: #4752c4;
  color: white;
}

.discord-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.bold {
  font-weight: bold;
}

@media (max-width: 640px) {
  .view-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-left {
    width: 100%;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .header-actions > * {
    flex: 1;
    min-width: calc(50% - 0.375rem);
    justify-content: center;
  }

  .view-title {
    font-size: 1.5rem;
  }
}
</style>
