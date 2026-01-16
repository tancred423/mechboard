<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { getDiscordLoginUrl } from "@/api";
import ThemeToggle from "./ThemeToggle.vue";
import CompactToggle from "./CompactToggle.vue";

const authStore = useAuthStore();
const showUserMenu = ref(false);

function handleLogin() {
  window.location.href = getDiscordLoginUrl();
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

function handleLogout() {
  showUserMenu.value = false;
  authStore.logout();
}

function closeUserMenu() {
  showUserMenu.value = false;
}
</script>

<template>
  <header class="header">
    <div class="header-content container">
      <router-link to="/" class="logo">
        <svg class="logo-icon" viewBox="0 0 512 512" fill="none">
          <!-- Outer board -->
          <rect
            x="64"
            y="96"
            width="384"
            height="320"
            rx="72"
            fill="#141414"
            stroke="#ddd"
            stroke-width="16"
          />
          <!-- Left pill (inactive) -->
          <rect
            x="112"
            y="208"
            width="136"
            height="96"
            rx="32"
            fill="#555"
            stroke="#999"
            stroke-width="10"
          />
          <!-- Right pill (active) -->
          <rect
            x="264"
            y="208"
            width="136"
            height="96"
            rx="32"
            fill="#4db87a"
            stroke="#6bcb8f"
            stroke-width="10"
          />
          <!-- Subtle top divider / UI hint -->
          <path
            d="M132 156H380"
            stroke="#2A2A2A"
            stroke-width="12"
            stroke-linecap="round"
            opacity="0.6"
          />
        </svg>
        <div class="logo-titles">
          <span class="logo-text">MechBoard</span>
          <span class="logo-subtitle">Remember raid mechanics!</span>
        </div>
      </router-link>

      <div class="header-actions">
        <CompactToggle />
        <ThemeToggle />

        <div v-if="authStore.loading" class="user-loading">
          <span class="loading-spinner"></span>
        </div>
        <div v-else-if="authStore.isAuthenticated" class="user-menu-wrapper">
          <button @click="toggleUserMenu" class="user-button">
            <img
              v-if="authStore.user?.avatar"
              :src="`https://cdn.discordapp.com/avatars/${authStore.user.discordId}/${authStore.user.avatar}.png`"
              :alt="authStore.user.username"
              class="user-avatar"
            />
            <span class="user-name">{{ authStore.user?.username }}</span>
            <svg
              class="chevron-icon"
              :class="{ open: showUserMenu }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <Transition name="dropdown">
            <div v-if="showUserMenu" class="user-dropdown">
              <button @click="handleLogout" class="dropdown-item">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </Transition>
          <div
            v-if="showUserMenu"
            class="dropdown-backdrop"
            @click="closeUserMenu"
          ></div>
        </div>
        <button v-else @click="handleLogin" class="btn-discord">
          <svg class="discord-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
            />
          </svg>
          Login with Discord
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.25rem;
  text-decoration: none;
}

.logo-icon {
  width: 36px;
  height: 36px;
}

.logo-titles {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.logo-text {
  background: linear-gradient(
    135deg,
    var(--accent-primary),
    var(--accent-secondary)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--text-tertiary);
  line-height: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu-wrapper {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.user-button:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.chevron-icon.open {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 160px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 200;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
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

.dropdown-item svg {
  width: 16px;
  height: 16px;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 150;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.btn-discord {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background: #5865f2;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.btn-discord:hover {
  background: #4752c4;
}

.discord-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-default);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .user-name {
    display: none;
  }

  .chevron-icon {
    display: none;
  }

  .user-button {
    padding: 0.375rem;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
  }

  .btn-discord span {
    display: none;
  }
}
</style>
