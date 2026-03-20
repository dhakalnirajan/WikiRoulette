<script setup lang="ts">
import { watch } from "vue";
import { useRecommendations } from "@/composables/useRecommendations";

const props = defineProps<{
  articleTitle: string | null;
  limit?: number;
}>();

const emit = defineEmits<{
  (e: "navigate", title: string): void;
}>();

const { recommendations, loading, error, fetchRecommendations } =
  useRecommendations();

watch(
  () => props.articleTitle,
  (newTitle) => {
    if (newTitle) {
      fetchRecommendations(newTitle, props.limit || 3);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="recommendations-card" v-if="articleTitle">
    <div class="recommendations-header">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      <span>Related Articles</span>
    </div>

    <div v-if="loading" class="recommendations-loading">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>
    <div v-else-if="error" class="recommendations-error">
      <span>{{ error }}</span>
    </div>
    <div v-else-if="recommendations.length === 0" class="recommendations-empty">
      <span>No related articles found.</span>
    </div>
    <ul v-else class="recommendations-list">
      <li v-for="rec in recommendations" :key="rec.title">
        <button class="rec-link" @click="emit('navigate', rec.title)">
          {{ rec.title }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.recommendations-card {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.recommendations-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 1rem;
}

.recommendations-loading {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-line {
  height: 2rem;
  background: var(--surface2);
  border-radius: var(--radius);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.recommendations-error,
.recommendations-empty {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  padding: 0.5rem 0;
}

.recommendations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendations-list li {
  margin-bottom: 0.5rem;
}

.rec-link {
  display: block;
  width: 100%;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--text-dim);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}
.rec-link:hover {
  background: var(--surface);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
