<script setup lang="ts">
import type { WikiSummary } from "@/types/wiki";

// Props are automatically available in the template
defineProps<{
  summary: WikiSummary;
  isCurrent?: boolean;
  bookmarked?: boolean;
}>();

const emit = defineEmits<{
  (e: "click"): void;
  (e: "bookmark"): void;
}>();
</script>

<template>
  <div
    class="recent-item"
    :class="{ current: isCurrent }"
    @click="emit('click')"
  >
    <div class="recent-thumb" v-if="summary.thumbnail">
      <img
        :src="summary.thumbnail.source"
        :alt="summary.title"
        loading="lazy"
      />
    </div>
    <div class="recent-thumb placeholder" v-else>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <rect x="2" y="2" width="20" height="20" rx="2.18" />
      </svg>
    </div>
    <div class="recent-info">
      <h4 class="recent-title" v-html="summary.displaytitle || summary.title" />
      <p v-if="summary.description" class="recent-desc">
        {{ summary.description }}
      </p>
    </div>
    <button
      class="bookmark-btn"
      :class="{ active: bookmarked }"
      @click.stop="emit('bookmark')"
      :title="bookmarked ? 'Remove bookmark' : 'Add bookmark'"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.recent-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}
.recent-item:hover {
  background: var(--surface2);
}
.recent-item.current {
  background: var(--accent-glow);
  border-left: 2px solid var(--accent);
}

.recent-thumb {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--surface2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.recent-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.recent-info {
  flex: 1;
  min-width: 0;
}
.recent-title {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-desc {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bookmark-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.bookmark-btn:hover {
  color: var(--accent);
  background: var(--surface2);
}
.bookmark-btn.active {
  color: var(--accent);
  fill: var(--accent);
}
</style>
