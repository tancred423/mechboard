<script setup lang="ts">
import { ref } from "vue";
import type { Encounter } from "@/types";

const props = defineProps<{
  encounter: Encounter;
  isLive?: boolean;
}>();

const emit = defineEmits<{
  delete: [];
}>();

const copied = ref(false);

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function exportEncounter() {
  const json = JSON.stringify({
    name: props.encounter.name,
    description: props.encounter.description,
    config: props.encounter.config,
  });
  navigator.clipboard.writeText(json);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <article class="encounter-card">
    <router-link :to="`/encounter/${encounter.id}`" class="card-link">
      <div class="card-header">
        <h3 class="card-title">
          {{ encounter.name }}
          <span v-if="isLive" class="live-badge">
            <span class="live-dot"></span>
            Live
          </span>
        </h3>
        <span class="card-count"
          >{{ encounter.config.cards.length }} mechanic{{
            encounter.config.cards.length !== 1 ? "s" : ""
          }}</span
        >
      </div>

      <p v-if="encounter.description" class="card-description">
        {{ encounter.description }}
      </p>

      <div class="card-meta">
        <span class="meta-date"
          >Updated {{ formatDate(encounter.updatedAt) }}</span
        >
      </div>
    </router-link>

    <div class="card-actions">
      <button @click.stop="exportEncounter" class="btn-export">
        {{ copied ? "✓ Copied" : "📤 Export" }}
      </button>
      <router-link :to="`/encounter/${encounter.id}/edit`" class="btn-edit">
        ✏️ Edit
      </router-link>
      <button @click.stop="emit('delete')" class="btn-delete">🗑️ Delete</button>
    </div>
  </article>
</template>

<style scoped>
.encounter-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.encounter-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.card-link {
  display: block;
  padding: 1.25rem;
  color: inherit;
  text-decoration: none;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: var(--accent-success);
  background: rgba(92, 184, 114, 0.15);
  border-radius: var(--radius-sm);
}

.live-dot {
  width: 6px;
  height: 6px;
  background: var(--accent-success);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
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

.card-count {
  flex-shrink: 0;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.card-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.card-actions {
  display: flex;
  border-top: 1px solid var(--border-subtle);
}

.btn-export,
.btn-edit,
.btn-delete {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-export,
.btn-edit {
  border-right: 1px solid var(--border-subtle);
}

.btn-export:hover,
.btn-edit:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

[data-theme="dark"] .btn-delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}
</style>
