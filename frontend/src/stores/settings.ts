import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { ViewMode } from "@/types";

export const useSettingsStore = defineStore("settings", () => {
  const viewMode = ref<ViewMode>(
    (localStorage.getItem("view_mode") as ViewMode) || "default",
  );

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode;
    localStorage.setItem("view_mode", mode);
  }

  function applyViewMode() {
    document.documentElement.setAttribute("data-view", viewMode.value);
  }

  watch(viewMode, applyViewMode, { immediate: true });

  return {
    viewMode,
    setViewMode,
  };
});
