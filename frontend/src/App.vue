<script setup lang="ts">
import { onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { useSettingsStore } from "@/stores/settings";
import AppHeader from "@/components/AppHeader.vue";

const authStore = useAuthStore();
useThemeStore();
useSettingsStore();

onMounted(() => {
  authStore.init();
});
</script>

<template>
  <div class="app-wrapper">
    <AppHeader />
    <main class="main-content">
      <router-view />
    </main>
    <footer class="app-footer">
      <span class="copyright"
        >&copy; {{ new Date().getFullYear() }} Tancred</span
      >
      <span class="separator">·</span>
      <a
        href="https://github.com/tancred423/mechboard"
        target="_blank"
        rel="noopener"
        >GitHub</a
      >
      <span class="separator">·</span>
      <a
        href="https://github.com/tancred423/mechboard/blob/main/TERMS_OF_SERVICE.md"
        target="_blank"
        rel="noopener"
        >Terms</a
      >
      <span class="separator">·</span>
      <a
        href="https://github.com/tancred423/mechboard/blob/main/PRIVACY_POLICY.md"
        target="_blank"
        rel="noopener"
        >Privacy</a
      >
    </footer>
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 2rem 0;
}

.app-footer {
  padding: 1rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
}

.app-footer a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
}

.app-footer a:hover {
  color: var(--accent-primary);
}

.app-footer .separator {
  margin: 0 0.5rem;
  opacity: 0.5;
}
</style>
