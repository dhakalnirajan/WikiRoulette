<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import type { WikiSummary } from "@/types/wiki";

const props = defineProps<{
  summary: WikiSummary | null;
}>();

const facts = ref<string[]>([]);
const activeIndex = ref(0);
const isPaused = ref(false);
let interval: number | null = null;

function extractFactsFromExtract(text: string): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences
    .filter((s) => {
      const trimmed = s.trim();
      return (
        trimmed.length > 30 &&
        trimmed.length < 180 &&
        !trimmed.startsWith("For ") &&
        !trimmed.startsWith("The ") &&
        !trimmed.startsWith("It ") &&
        !trimmed.startsWith("This ")
      );
    })
    .slice(0, 5);
}

function refresh() {
  if (!props.summary?.extract) {
    facts.value = [];
    return;
  }
  facts.value = extractFactsFromExtract(props.summary.extract);
  activeIndex.value = 0;
  stopRotation();
  startRotation();
}

function startRotation() {
  if (interval) clearInterval(interval);
  if (!isPaused.value && facts.value.length > 0) {
    interval = window.setInterval(() => {
      activeIndex.value = (activeIndex.value + 1) % facts.value.length;
    }, 6000);
  }
}

function stopRotation() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function pause() {
  isPaused.value = true;
  stopRotation();
}

function resume() {
  isPaused.value = false;
  startRotation();
}

function next() {
  if (facts.value.length > 0) {
    activeIndex.value = (activeIndex.value + 1) % facts.value.length;
  }
}

function previous() {
  if (facts.value.length > 0) {
    activeIndex.value =
      (activeIndex.value - 1 + facts.value.length) % facts.value.length;
  }
}

watch(
  () => props.summary,
  () => {
    refresh();
  },
  { immediate: true },
);

onMounted(() => {
  startRotation();
});

onUnmounted(() => {
  stopRotation();
});

defineExpose({ pause, resume, next, previous });
</script>

<template>
  <div class="article-facts-card" @mouseenter="pause" @mouseleave="resume">
    <div class="facts-header">
      <div class="header-icon">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
      <span class="facts-label">Did you know about this article?</span>
    </div>

    <div v-if="facts.length === 0" class="facts-empty">
      <span>No interesting facts found for this article.</span>
    </div>
    <div v-else class="facts-carousel">
      <button class="nav-btn prev" @click="previous" aria-label="Previous fact">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div class="fact-content">
        <p class="fact-text">{{ facts[activeIndex] }}</p>
      </div>

      <button class="nav-btn next" @click="next" aria-label="Next fact">
        <svg
          width="12"
          height="12"
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
</template>

<style scoped>
.article-facts-card {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.facts-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  border-radius: 99px;
  padding: 0.2rem;
  line-height: 0;
}

.facts-label {
  font-weight: 500;
}

.facts-carousel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-btn {
  background: none;
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
  flex-shrink: 0;
}
.nav-btn:hover {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
}

.fact-content {
  flex: 1;
  min-height: 70px;
  display: flex;
  align-items: center;
}

.fact-text {
  font-family: var(--font-serif);
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0;
  transition: opacity 0.3s ease;
  text-align: center;
}

.facts-empty {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  padding: 0.75rem 0;
}
</style>
