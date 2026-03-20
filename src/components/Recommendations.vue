<script setup lang="ts">
import { watch } from "vue";
import { useRecommendations } from "@/composables/useRecommendations";

const props = defineProps<{
  articleTitle: string;
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
  <div class="recommendations">
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
      <span>You might also like</span>
    </div>

    <div v-if="loading" class="recommendations-loading">
      <div class="spinner"></div>
      <span>Finding related articles...</span>
    </div>
    <div v-else-if="error" class="recommendations-error">
      <span>{{ error }}</span>
    </div>
    <div v-else-if="recommendations.length === 0" class="recommendations-empty">
      <span>No recommendations available.</span>
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
.recommendations {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--surface2);
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

.recommendations-loading,
.recommendations-error,
.recommendations-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 0.5rem 0;
}

.spinner {
  width: 16px;
  height: 16px;
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}
.rec-link:hover {
  background: var(--surface2);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
