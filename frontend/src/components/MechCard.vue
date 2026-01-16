<script setup lang="ts">
import type { CardConfig } from "@/types";
import MechOption from "./MechOption.vue";

defineProps<{
  card: CardConfig;
  editMode?: boolean;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  toggleOption: [optionId: string];
  deleteCard: [];
  updateCard: [data: Partial<CardConfig>];
  addOption: [];
  deleteOption: [optionId: string];
  updateOption: [optionId: string, name: string];
}>();
</script>

<template>
  <div class="mech-card" :class="{ 'edit-mode': editMode, readonly: readonly }">
    <div class="card-header">
      <h3 v-if="!editMode" class="card-title">{{ card.name }}</h3>
      <input
        v-else
        type="text"
        :value="card.name"
        @input="
          emit('updateCard', {
            name: ($event.target as HTMLInputElement).value,
          })
        "
        class="card-title-input"
        placeholder="Mechanic name"
      />

      <div v-if="editMode" class="card-controls">
        <select
          :value="card.selectionMode"
          @change="
            emit('updateCard', {
              selectionMode: ($event.target as HTMLSelectElement).value as
                | 'single'
                | 'multi',
            })
          "
          class="mode-select"
        >
          <option value="single">Single Select</option>
          <option value="multi">Multi Select</option>
        </select>
        <button
          @click="emit('deleteCard')"
          class="btn-delete-card"
          title="Delete card"
        >
          🗑️
        </button>
      </div>
    </div>

    <div class="options-grid">
      <MechOption
        v-for="option in card.options"
        :key="option.id"
        :option="option"
        :edit-mode="editMode"
        :readonly="readonly"
        @toggle="emit('toggleOption', option.id)"
        @delete="emit('deleteOption', option.id)"
        @update="(name) => emit('updateOption', option.id, name)"
      />

      <button
        v-if="editMode && card.options.length < 20"
        @click="emit('addOption')"
        class="btn-add-option"
      >
        <span class="add-icon">+</span>
        <span>Add Option</span>
      </button>
    </div>

    <div v-if="editMode && card.options.length >= 20" class="limit-notice">
      Maximum 20 options reached
    </div>
  </div>
</template>

<style scoped>
.mech-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--card-padding, 1.25rem);
  transition: all var(--transition-normal);
}

.mech-card.edit-mode {
  border-style: dashed;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.card-title {
  font-size: var(--card-title-size, 1.125rem);
  font-weight: 600;
  color: var(--text-primary);
}

.card-title-input {
  flex: 1;
  font-size: var(--card-title-size, 1.125rem);
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
}

.card-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-select {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-delete-card {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  opacity: 0.7;
  transition: all var(--transition-fast);
}

.btn-delete-card:hover {
  opacity: 1;
  background: #fee2e2;
  border-color: #fecaca;
}

[data-theme="dark"] .btn-delete-card:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.btn-add-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: var(--option-min-height, 80px);
  padding: 0 0.75rem;
  background: var(--bg-tertiary);
  border: 2px dashed var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  font-size: var(--option-font-size, 0.875rem);
  white-space: nowrap;
  transition: all var(--transition-fast);
  box-sizing: border-box;
}

.btn-add-option:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--bg-secondary);
}

.add-icon {
  font-size: 1.25em;
  line-height: 1;
}

.limit-notice {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-align: center;
}

@media (max-width: 480px) {
  .options-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
