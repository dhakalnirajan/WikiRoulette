<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { TocItem } from '@/types/wiki'

const props = defineProps<{
  items: TocItem[]
}>()

const activeId = ref<string>('')

let observer: IntersectionObserver | null = null

function setupObserver() {
  if (observer) observer.disconnect()
  if (!props.items.length) return

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '-64px 0px -60% 0px', threshold: 0 }
  )

  props.items.forEach((item) => {
    const el = document.getElementById(item.id)
    if (el) observer!.observe(el)
  })
}

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeId.value = id
}

onMounted(() => {
  setTimeout(setupObserver, 200)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <aside class="toc" v-if="items.length >= 3">
    <div class="toc-label">Contents</div>
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
          >
            {{ item.title }}
          </button>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.toc {
  width: 210px;
  flex-shrink: 0;
  position: sticky;
  top: calc(var(--nav-h) + var(--reader-bar-h) + 1.5rem);
  max-height: calc(100vh - var(--nav-h) - var(--reader-bar-h) - 3rem);
  overflow-y: auto;
  padding-right: 0.3rem;
}
.toc::-webkit-scrollbar { width: 2px; }
.toc::-webkit-scrollbar-thumb { background: var(--border); }

.toc-label {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.8rem;
  padding-left: 0.5rem;
}

.toc-list { list-style: none; }
.toc-item { margin: 0; }

.toc-link {
  display: block;
  width: 100%;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 0.76rem;
  font-weight: 400;
  color: var(--text-muted);
  background: none;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  padding: 0.22rem 0.5rem;
  line-height: 1.45;
  transition: all 0.14s;
}
.toc-link:hover { color: var(--text-dim); border-left-color: var(--border2); }
.toc-link.active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--accent-glow);
}

.toc-level-3 .toc-link { padding-left: 1.1rem; font-size: 0.71rem; }
.toc-level-4 .toc-link { padding-left: 1.7rem; font-size: 0.68rem; }

@media (max-width: 900px) {
  .toc { display: none; }
}
</style>
