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
</style>
