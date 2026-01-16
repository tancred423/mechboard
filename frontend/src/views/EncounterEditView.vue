<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEncountersStore } from "@/stores/encounters";
import { useSettingsStore } from "@/stores/settings";
import MechCard from "@/components/MechCard.vue";

const route = useRoute();
const router = useRouter();
const encountersStore = useEncountersStore();
const settingsStore = useSettingsStore();

const loading = ref(true);
const saving = ref(false);
const copied = ref(false);

const encounterId = computed(() => route.params.id as string);

onMounted(async () => {
  await encountersStore.fetchEncounters();
  const encounter = encountersStore.encounters.find(
    (e) => e.id === encounterId.value,
  );
  if (encounter) {
    encountersStore.setCurrentEncounter(encounter);
  } else {
    router.replace("/");
  }
  loading.value = false;
});

watch(
  () => route.params.id,
  (newId) => {
    const encounter = encountersStore.encounters.find((e) => e.id === newId);
    if (encounter) {
      encountersStore.setCurrentEncounter(encounter);
    }
  },
);

async function handleSave() {
  saving.value = true;
  try {
    await encountersStore.saveCurrentEncounter();
    router.push(`/encounter/${encounterId.value}`);
  } finally {
    saving.value = false;
  }
}

function addCard() {
  encountersStore.addCard("New Mechanic", "single");
}

function addOption(cardId: string) {
  encountersStore.addOption(cardId, "Edit Me!");
}

function copyJson() {
  const json = encountersStore.exportToJson();
  if (json) {
    navigator.clipboard.writeText(json);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
}
</script>

<template>
  <div class="edit-view container">
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
          <router-link :to="`/encounter/${encounterId}`" class="back-link"
            >← Back to view</router-link
          >
          <div class="header-text">
            <input
              v-model="encountersStore.currentEncounter.name"
              type="text"
              class="title-input"
              placeholder="Encounter name"
              maxlength="128"
            />
            <textarea
              v-model="encountersStore.currentEncounter.description"
              class="description-input"
              placeholder="Description (optional)"
              rows="1"
            ></textarea>
          </div>
        </div>

        <div class="header-actions">
          <button @click="copyJson" class="btn-export">
            {{ copied ? "✓ Copied" : "📤 Export" }}
          </button>
          <button @click="handleSave" :disabled="saving" class="btn-save">
            {{ saving ? "Saving..." : "💾 Save" }}
          </button>
        </div>
      </div>

      <div class="cards-list">
        <MechCard
          v-for="card in encountersStore.currentEncounter.config.cards"
          :key="card.id"
          :card="card"
          :edit-mode="true"
          @toggle-option="() => {}"
          @delete-card="encountersStore.deleteCard(card.id)"
          @update-card="(data) => encountersStore.updateCard(card.id, data)"
          @add-option="addOption(card.id)"
          @delete-option="
            (optionId) => encountersStore.deleteOption(card.id, optionId)
          "
          @update-option="
            (optionId, name) =>
              encountersStore.updateOption(card.id, optionId, { name })
          "
        />

        <button @click="addCard" class="btn-add-card">
          <span class="add-icon">+</span>
          <span>Add Mechanic</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.edit-view {
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
  flex: 1;
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
  transition: all var(--transition-fast);
}

.view-header.compact .back-link {
  font-size: 0.75rem;
}

.back-link:hover {
  color: var(--text-primary);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: gap var(--transition-fast);
}

.view-header.compact .header-text {
  gap: 0.25rem;
}

.title-input {
  font-size: 1.75rem;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.view-header.compact .title-input {
  font-size: 1.125rem;
  padding: 0.375rem 0.5rem;
}

.description-input {
  font-size: 0.9375rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  resize: vertical;
  min-height: 2.5rem;
  transition: all var(--transition-fast);
}

.view-header.compact .description-input {
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
  min-height: 1.75rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.btn-export,
.btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 44px;
  padding: 0 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  box-sizing: border-box;
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

.btn-save {
  width: 100px;
  background: var(--accent-success);
  color: white;
  border: 1px solid var(--accent-success);
}

.btn-save:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap, 1.5rem);
}

.btn-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-default);
  border-radius: var(--radius-lg);
  color: var(--text-tertiary);
  font-size: 1rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.btn-add-card:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.add-icon {
  font-size: 2rem;
  line-height: 1;
}

@media (max-width: 640px) {
  .view-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-left {
    width: 100%;
  }

  .header-text {
    width: 100%;
  }

  .title-input,
  .description-input {
    width: 100%;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions > * {
    flex: 1;
    justify-content: center;
  }

  .title-input {
    font-size: 1.5rem;
  }
}
</style>
