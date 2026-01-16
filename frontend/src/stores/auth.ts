import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { User } from "@/types";
import { getDiscordLoginUrl, getMe } from "@/api";
import { useEncountersStore } from "./encounters";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("auth_token"));
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const loginUrl = computed(() => getDiscordLoginUrl());

  async function init() {
    if (token.value) {
      loading.value = true;
      try {
        user.value = await getMe();
        const encountersStore = useEncountersStore();
        const migratedCount =
          await encountersStore.migrateLocalEncountersToAccount();
        if (migratedCount > 0) {
          console.log(
            `Migrated ${migratedCount} local encounter(s) to account`,
          );
        }
        await encountersStore.fetchEncounters();
      } catch {
        logout();
      } finally {
        loading.value = false;
      }
    }
  }

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem("auth_token", newToken);
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem("auth_token");

    const encountersStore = useEncountersStore();
    encountersStore.clearAndReload();
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    loginUrl,
    init,
    setToken,
    logout,
  };
});
