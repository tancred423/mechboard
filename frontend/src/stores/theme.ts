import { defineStore } from "pinia";
import { ref, watch, computed } from "vue";
import type { ThemeMode } from "@/types";

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(
    (localStorage.getItem("theme_mode") as ThemeMode) || "system",
  );

  const systemPrefersDark = ref(
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  const effectiveTheme = computed(() => {
    if (mode.value === "system") {
      return systemPrefersDark.value ? "dark" : "light";
    }
    return mode.value;
  });

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    localStorage.setItem("theme_mode", newMode);
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", effectiveTheme.value);
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e) => {
    systemPrefersDark.value = e.matches;
  });

  watch(effectiveTheme, applyTheme, { immediate: true });

  return {
    mode,
    effectiveTheme,
    setMode,
  };
});
