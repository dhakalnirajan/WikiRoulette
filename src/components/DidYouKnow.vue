<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useDidYouKnow } from "@/composables/useDidYouKnow";

const props = defineProps<{
  limit?: number;
}>();

const { items, loading, error, fetchDidYouKnow, refresh } = useDidYouKnow();
const activeIndex = ref(0);
let interval: number | null = null;

onMounted(() => {
  fetchDidYouKnow(props.limit || 10);
  startRotation();
});

function startRotation() {
  if (interval) clearInterval(interval);
  interval = window.setInterval(() => {
    if (items.value.length > 0) {
      activeIndex.value = (activeIndex.value + 1) % items.value.length;
    }
  }, 8000);
}

function stopRotation() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function next() {
  if (items.value.length > 0) {
    activeIndex.value = (activeIndex.value + 1) % items.value.length;
    stopRotation();
    startRotation();
  }
}

function previous() {
  if (items.value.length > 0) {
    activeIndex.value =
      (activeIndex.value - 1 + items.value.length) % items.value.length;
    stopRotation();
    startRotation();
  }
}

async function handleRefresh() {
  await refresh(props.limit || 3);
  activeIndex.value = 0;
  stopRotation();
  startRotation();
}

watch(
  () => items.value,
  () => {
    if (items.value.length > 0) {
      activeIndex.value = 0;
      stopRotation();
      startRotation();
    }
  },
);
</script>

<template>
  <div class="did-you-know-card glass">
    <div class="card-header">
      <div class="header-icon">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
      <h3 class="card-title">Did You Know?</h3>
      <button
        class="refresh-btn"
        @click="handleRefresh"
        :disabled="loading"
        aria-label="Refresh facts"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path
            d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
          />
        </svg>
      </button>
    </div>

    <div v-if="loading" class="fact-loading">
      <div class="spinner"></div>
      <span>Gathering fascinating facts...</span>
    </div>

    <div v-else-if="error" class="fact-error">
      <span>{{ error }}</span>
      <button class="retry-btn" @click="handleRefresh">Try again</button>
    </div>

    <div v-else-if="items.length === 0" class="fact-empty">
      <span>No facts available. Try again later.</span>
    </div>

    <div v-else class="fact-carousel">
      <div class="fact-content">
        <div class="fact-text" :key="activeIndex">
          {{ items[activeIndex].text }}
        </div>
        <a
          v-if="items[activeIndex].link"
          :href="items[activeIndex].link"
          target="_blank"
          rel="noopener noreferrer"
          class="fact-link"
        >
          Read more
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
            />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>

      <div class="carousel-controls" v-if="items.length > 1">
        <button
          class="nav-btn"
          @click="previous"
          :disabled="loading"
          aria-label="Previous fact"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div class="dots">
          <span
            v-for="(_, idx) in items"
            :key="idx"
            class="dot"
            :class="{ active: idx === activeIndex }"
            @click="activeIndex = idx"
          ></span>
        </div>
        <button
          class="nav-btn"
          @click="next"
          :disabled="loading"
          aria-label="Next fact"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.did-you-know-card {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all 0.2s;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.header-icon {
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  border-radius: 99px;
  padding: 0.3rem;
  line-height: 0;
}

.card-title {
  flex: 1;
  font-family: var(--font-serif);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  letter-spacing: 0.02em;
}

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 99px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.refresh-btn:hover:not(:disabled) {
  color: var(--accent);
  background: var(--surface2);
  transform: rotate(15deg);
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fact-loading,
.fact-error,
.fact-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 100px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.retry-btn {
  background: var(--accent-glow);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: var(--accent);
  font-size: 0.7rem;
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius);
  cursor: pointer;
  margin-top: 0.5rem;
}
.retry-btn:hover {
  background: var(--accent-dim);
  border-color: var(--accent);
}

.fact-carousel {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.fact-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fact-text {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-dim);
  transition: opacity 0.3s ease;
}

.fact-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--accent);
  transition: all 0.2s;
}
.fact-link:hover {
  border-bottom-style: solid;
  gap: 0.4rem;
}

.carousel-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.nav-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-btn:hover:not(:disabled) {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
}
.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dots {
  display: flex;
  gap: 0.5rem;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: var(--text-faint);
  cursor: pointer;
  transition: all 0.2s;
}
.dot.active {
  width: 18px;
  background: var(--accent);
}
.dot:hover {
  background: var(--accent);
}

@media (max-width: 1024px) {
  .did-you-know-card {
    margin-top: 1rem;
  }
}
</style>
