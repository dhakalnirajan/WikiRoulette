<script setup lang="ts">
defineProps<{
  inReader: boolean
  totalVisited: number
}>()

defineEmits<{
  (e: 'go-home'): void
}>()
</script>

<template>
  <nav class="nav">
    <button class="logo" @click="$emit('go-home')" aria-label="Go to home">
      <span class="logo-wiki">WIKI</span><span class="logo-roulette">ROULETTE</span>
    </button>

    <div class="nav-right">
      <span v-if="totalVisited > 0" class="visit-count">
        <span class="visit-num">{{ totalVisited }}</span>
        <span class="visit-label">explored</span>
      </span>

      <button
        class="nav-pill"
        :class="{ active: !inReader }"
        @click="$emit('go-home')"
        :aria-current="!inReader ? 'page' : undefined"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Explore
      </button>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 500;
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2.5rem;
  background: rgba(12, 12, 12, 0.9);
  backdrop-filter: blur(16px) saturate(1.4);
  border-bottom: 1px solid var(--border);
}

.logo {
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0;
  transition: opacity 0.15s;
}
.logo:hover { opacity: 0.8; }

.logo-wiki { color: var(--accent); }
.logo-roulette { color: var(--text); }

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.visit-count {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
}
.visit-num {
  font-size: 0.8rem;
  color: var(--accent);
}

.nav-pill {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  transition: all 0.16s;
}
.nav-pill:hover {
  color: var(--text);
  border-color: var(--border2);
}
.nav-pill.active {
  color: var(--accent);
  border-color: rgba(201,168,76,0.35);
  background: var(--accent-glow);
}

@media (max-width: 640px) {
  .nav { padding: 0 1.2rem; }
  .visit-count { display: none; }
}
</style>
