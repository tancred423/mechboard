<script setup lang="ts">
import { ref } from "vue";
import type { OptionConfig } from "@/types";

const props = defineProps<{
  option: OptionConfig;
  editMode?: boolean;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  delete: [];
  update: [name: string];
}>();

const isEditing = ref(false);
const editName = ref(props.option.name);

function startEdit() {
  if (props.editMode) {
    isEditing.value = true;
    editName.value = props.option.name;
  }
}

function saveEdit() {
  if (editName.value.trim()) {
    emit("update", editName.value.trim());
  }
  isEditing.value = false;
}

function cancelEdit() {
  editName.value = props.option.name;
  isEditing.value = false;
}
</script>

<template>
  <div class="option-wrapper">
    <button
      v-if="!isEditing"
      @click="readonly ? null : editMode ? startEdit() : emit('toggle')"
      class="option-btn"
      :class="{
        selected: option.selected,
        'edit-mode': editMode,
        readonly: readonly,
      }"
      :disabled="readonly"
    >
      <span class="option-name">{{ option.name }}</span>
      <span v-if="option.selected" class="selected-indicator"></span>
    </button>

    <div v-else class="edit-container">
      <input
        v-model="editName"
        @keyup.enter="saveEdit"
        @keyup.escape="cancelEdit"
        @blur="saveEdit"
        class="edit-input"
        autofocus
        maxlength="50"
      />
    </div>

    <button
      v-if="editMode && !isEditing"
      @click.stop="emit('delete')"
      class="btn-delete-option"
      title="Delete option"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.option-wrapper {
  position: relative;
}

.option-btn {
  width: 100%;
  height: var(--option-min-height, 80px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--option-padding, 1rem 0.75rem);
  background: var(--option-unselected-bg);
  border: 2px solid var(--option-unselected-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--option-font-size, 1rem);
  font-weight: 500;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.option-btn:not(.edit-mode):hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.option-btn:not(.edit-mode):active {
  transform: translateY(0);
}

.option-btn.selected {
  background: var(--option-selected-bg);
  border-color: var(--option-selected-border);
  color: var(--option-selected-text);
  box-shadow: var(--shadow-glow);
}

.option-btn.selected .selected-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  background: var(--option-selected-text);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.85);
  }
}

.option-btn.edit-mode {
  cursor: text;
}

.option-btn.readonly {
  cursor: default;
}

.option-btn.readonly:not(.edit-mode):hover {
  transform: none;
  box-shadow: none;
}

.option-name {
  text-align: center;
  word-break: break-word;
  line-height: 1.3;
}

.edit-container {
  width: 100%;
}

.edit-input {
  width: 100%;
  height: var(--option-min-height, 80px);
  padding: var(--option-padding, 1rem 0.75rem);
  text-align: center;
  font-size: var(--option-font-size, 1rem);
  font-weight: 500;
  background: var(--bg-tertiary);
  border: 2px solid var(--accent-primary);
  box-sizing: border-box;
  border-radius: var(--radius-md);
}

.btn-delete-option {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 50%;
  font-size: 1.125rem;
  line-height: 1;
  color: var(--text-tertiary);
  opacity: 0;
  transition: all var(--transition-fast);
  z-index: 1;
}

.option-wrapper:hover .btn-delete-option {
  opacity: 1;
}

.btn-delete-option:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #dc2626;
}

[data-theme="dark"] .btn-delete-option:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}
</style>
