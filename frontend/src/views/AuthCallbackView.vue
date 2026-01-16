<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const error = ref<string | null>(null);

onMounted(async () => {
  const token = route.query.token as string;
  const errorParam = route.query.error as string;

  if (errorParam) {
    error.value = "Authentication failed. Please try again.";
    setTimeout(() => router.replace("/"), 3000);
    return;
  }

  if (token) {
    authStore.setToken(token);
    await authStore.init();
    router.replace("/");
  } else {
    error.value = "No authentication token received.";
    setTimeout(() => router.replace("/"), 3000);
  }
});
</script>

<template>
  <div class="auth-callback container">
    <div v-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <h2>Authentication Failed</h2>
      <p>{{ error }}</p>
      <p class="redirect-notice">Redirecting to home...</p>
    </div>
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <h2>Signing you in...</h2>
      <p>Please wait while we complete the authentication.</p>
    </div>
  </div>
</template>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border-default);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

p {
  color: var(--text-secondary);
}

.redirect-notice {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-tertiary);
}
</style>
