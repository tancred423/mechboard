<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useSettingsStore } from "@/stores/settings";
import { getSyncSession, getSyncWebSocketUrl } from "@/api";
import type { EncounterConfig, SyncSession } from "@/types";
import MechCard from "@/components/MechCard.vue";

const route = useRoute();
const settingsStore = useSettingsStore();

const loading = ref(true);
const error = ref<string | null>(null);
const session = ref<SyncSession | null>(null);
const currentState = ref<EncounterConfig | null>(null);
const connected = ref(false);
const ownerOnline = ref(true);

let socket: WebSocket | null = null;
let reconnectTimeout: number | null = null;

const sessionId = computed(() => route.params.sessionId as string);

async function connectWebSocket() {
  if (socket) {
    socket.close();
  }

  try {
    await getSyncSession(sessionId.value);
  } catch {
    error.value = "The sync session has ended";
    return;
  }

  const wsUrl = getSyncWebSocketUrl(sessionId.value, false);
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    connected.value = true;
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "state") {
        currentState.value = data.state;
      } else if (data.type === "owner_disconnected") {
        ownerOnline.value = false;
      } else if (data.type === "owner_connected") {
        ownerOnline.value = true;
      } else if (data.type === "owner_status") {
        ownerOnline.value = data.online;
      }
    } catch (err) {
      console.error("WebSocket message error:", err);
    }
  };

  socket.onclose = (event) => {
    connected.value = false;

    if (event.code !== 1000) {
      reconnectTimeout = window.setTimeout(() => {
        connectWebSocket();
      }, 3000);
    } else if (event.reason === "Session ended by owner") {
      error.value = "The sync session has ended";
    } else if (event.reason === "Session expired") {
      error.value = "The sync session has expired";
    }
  };

  socket.onerror = () => {
    connected.value = false;
  };
}

onMounted(async () => {
  try {
    const data = await getSyncSession(sessionId.value);
    session.value = data;
    currentState.value = data.state;
    connectWebSocket();
  } catch (err) {
    error.value = "Session not found or expired";
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  if (socket) {
    socket.close();
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
});
</script>

<template>
  <div class="sync-view container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Joining sync session...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">🔌</div>
      <h2>Session Unavailable</h2>
      <p>{{ error }}</p>
      <router-link to="/" class="btn-primary">Go Home</router-link>
    </div>

    <template v-else-if="session && currentState">
      <div
        class="view-header"
        :class="{ compact: settingsStore.viewMode === 'compact' }"
      >
        <div class="header-left">
          <router-link to="/" class="back-link">← Leave Session</router-link>
          <div class="header-text">
            <h1 class="view-title">{{ session.name }}</h1>
            <p v-if="session.description" class="view-description">
              {{ session.description }}
            </p>
          </div>
        </div>

        <div class="header-info">
          <div
            class="sync-badge"
            :class="{ connected, 'owner-offline': !ownerOnline }"
          >
            <span class="sync-dot"></span>
            <span v-if="!connected">Reconnecting...</span>
            <span v-else-if="!ownerOnline">Host offline</span>
            <span v-else>Synced with {{ session.owner }}</span>
          </div>
        </div>
      </div>

      <div class="view-only-banner">
        <span>📺</span> View-only mode — {{ session.owner }} is controlling this
        board
      </div>

      <div v-if="currentState.cards.length === 0" class="empty-state">
        <div class="empty-icon">🎯</div>
        <h2>No mechanics yet</h2>
        <p>Waiting for the host to add content</p>
      </div>

      <div v-else class="cards-list">
        <MechCard
          v-for="card in currentState.cards"
          :key="card.id"
          :card="card"
          :readonly="true"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.sync-view {
  padding-bottom: 4rem;
}

.loading-state,
.error-state {
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

.error-state {
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error-state h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.error-state p {
  margin-bottom: 1.5rem;
}

.view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1rem;
  transition: all var(--transition-fast);
}

.view-header.compact {
  gap: 1rem;
  margin-bottom: 0.75rem;
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

.header-info {
  flex-shrink: 0;
}

.sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.sync-badge.connected {
  border-color: var(--accent-success);
  color: var(--accent-success);
}

.sync-badge.owner-offline {
  border-color: var(--accent-warning);
  color: var(--accent-warning);
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.sync-badge.connected .sync-dot {
  background: var(--accent-success);
  animation: pulse 2s ease-in-out infinite;
}

.sync-badge.owner-offline .sync-dot {
  background: var(--accent-warning);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.view-only-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-secondary);
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
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap, 1.5rem);
}

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
  background: var(--accent-primary);
  color: white;
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
}

@media (max-width: 640px) {
  .view-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-left {
    width: 100%;
  }

  .header-info {
    width: 100%;
  }

  .sync-badge {
    width: 100%;
    justify-content: center;
  }

  .view-title {
    font-size: 1.5rem;
  }
}
</style>
