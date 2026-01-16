<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useThemeStore } from "@/stores/theme";
import type { ThemeMode } from "@/types";

const themeStore = useThemeStore();
const showMenu = ref(false);
const toggleRef = ref<HTMLElement | null>(null);

const options: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "💻" },
];

function selectMode(mode: ThemeMode) {
  themeStore.setMode(mode);
  showMenu.value = false;
}

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (toggleRef.value && !toggleRef.value.contains(target)) {
    showMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div ref="toggleRef" class="theme-toggle" @click.stop>
    <button
      @click="toggleMenu"
      class="toggle-btn"
      :title="`Theme: ${themeStore.mode}`"
    >
      <span v-if="themeStore.effectiveTheme === 'dark'">🌙</span>
      <span v-else>☀️</span>
    </button>

    <Transition name="dropdown">
      <div v-if="showMenu" class="dropdown">
        <button
          v-for="option in options"
          :key="option.value"
          @click="selectMode(option.value)"
          class="dropdown-item"
          :class="{ active: themeStore.mode === option.value }"
        >
          <span class="dropdown-icon">{{ option.icon }}</span>
          <span>{{ option.label }}</span>
          <span v-if="themeStore.mode === option.value" class="check">✓</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.theme-toggle {
  position: relative;
}

.toggle-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  transition: all var(--transition-fast);
}

.toggle-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 50;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-align: left;
  transition: all var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.dropdown-item.active {
  color: var(--accent-primary);
}

.dropdown-icon {
  font-size: 1rem;
}

.check {
  margin-left: auto;
  color: var(--accent-primary);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
