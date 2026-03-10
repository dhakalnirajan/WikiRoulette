<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import type { TocItem } from "@/types/wiki";

const props = defineProps<{
  items: TocItem[];
}>();

const activeId = ref<string>("");
let observer: IntersectionObserver | null = null;

function setupObserver() {
  if (observer) observer.disconnect();
  if (!props.items.length) return;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id;
          break;
        }
      }
    },
    { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
  );

  props.items.forEach((item) => {
    const el = document.getElementById(item.id);
    if (el) observer!.observe(el);
  });
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    activeId.value = id;
  }
}

watch(
  () => props.items,
  () => {
    setTimeout(setupObserver, 100);
  },
  { immediate: true },
);

onMounted(() => {
  setTimeout(setupObserver, 200);
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<template>
  <aside class="toc" v-if="items.length >= 2">
    <div class="toc-label">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
      Contents
    </div>

    <nav aria-label="Table of contents">
      <ul class="toc-list">
        <li
          v-for="item in items"
          :key="item.id"
          :class="`toc-item toc-level-${item.level}`"
        >
          <button
            class="toc-link"
            :class="{ active: activeId === item.id }"
            @click="scrollTo(item.id)"
            :title="item.title"
          >
            {{ item.title }}
          </button>
        </li>
      </ul>
    </nav>

    <div class="toc-footer" v-if="items.length > 5">
      <span class="toc-count">{{ items.length }} sections</span>
    </div>
  </aside>
</template>

<style scoped>
.toc {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: calc(var(--nav-h) + var(--reader-bar-h) + 2rem);
  max-height: calc(100vh - var(--nav-h) - var(--reader-bar-h) - 4rem);
  overflow-y: auto;
  padding-right: 0.5rem;
  border-right: 1px solid var(--border);
  padding-bottom: 1rem;
}

.toc::-webkit-scrollbar {
  width: 3px;
}
.toc::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 99px;
}
.toc::-webkit-scrollbar-track {
  background: transparent;
}

.toc-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 1rem;
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toc-label svg {
  opacity: 0.7;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.toc-item {
  margin: 0;
}

.toc-link {
  display: block;
  width: 100%;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--text-muted);
  background: none;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  padding: 0.35rem 0.6rem;
  line-height: 1.5;
  transition: all 0.16s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-link:hover {
  color: var(--text);
  border-left-color: var(--border2);
  background: var(--surface2);
}

.toc-link.active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--accent-glow);
  font-weight: 500;
}

.toc-level-2 .toc-link {
  padding-left: 0.6rem;
  font-size: 0.78rem;
}
.toc-level-3 .toc-link {
  padding-left: 1.4rem;
  font-size: 0.74rem;
}
.toc-level-4 .toc-link {
  padding-left: 2.2rem;
  font-size: 0.71rem;
}

.toc-footer {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
  text-align: right;
}

.toc-count {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-faint);
  letter-spacing: 0.08em;
}

@media (max-width: 1024px) {
  .toc {
    display: none;
  }
}
</style>
