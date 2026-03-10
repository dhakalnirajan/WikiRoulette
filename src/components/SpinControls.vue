<script setup lang="ts">
defineProps<{
  canGoBack: boolean
  loading: boolean
}>()

defineEmits<{
  (e: 'prev'): void
  (e: 'spin'): void
  (e: 'next'): void
}>()
</script>

<template>
  <div class="controls">
    <button
      class="ctrl-btn"
      :disabled="!canGoBack"
      @click="$emit('prev')"
      title="Previous article (←)"
      aria-label="Previous article"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Prev
    </button>

    <button
      class="ctrl-btn spin-btn"
      :disabled="loading"
      @click="$emit('spin')"
      title="Random article (Space)"
      aria-label="Load random article"
    >
      <span class="spin-die" :class="{ spinning: loading }" aria-hidden="true">
        <svg v-if="!loading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="2" y="2" width="20" height="20" rx="4"/>
          <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/>
          <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
          <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/>
          <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>
        </svg>
        <span v-else class="spinner" style="width:18px;height:18px;border-width:1.5px;"></span>
      </span>
      <span>{{ loading ? 'Loading…' : 'Spin' }}</span>
    </button>

    <button
      class="ctrl-btn"
      :disabled="loading"
      @click="$emit('next')"
      title="Next article (→)"
      aria-label="Next article"
    >
      Next
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.ctrl-btn {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.8rem 1.6rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  transition: all 0.16s ease;
  white-space: nowrap;
}
.ctrl-btn:not(:disabled):hover {
  background: var(--surface2);
  color: var(--text);
  border-color: var(--border2);
}
.ctrl-btn:not(:disabled):active { transform: scale(0.97); }
.ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.spin-btn {
  background: var(--accent);
  border-color: var(--accent);
  color: #0e0e0e;
  font-weight: 500;
  padding: 0.8rem 2.2rem;
  gap: 0.6rem;
}
.spin-btn:not(:disabled):hover {
  background: #e8c97a;
  border-color: #e8c97a;
  color: #0a0a0a;
}

.spin-die {
  display: flex;
  align-items: center;
  justify-content: center;
}
.spin-die.spinning {
  animation: none;
}

@media (max-width: 480px) {
  .controls { gap: 0.6rem; }
  .ctrl-btn { padding: 0.75rem 1.1rem; font-size: 0.7rem; }
  .spin-btn { padding: 0.75rem 1.5rem; }
}
</style>
