<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import type { TocItem } from "@/types/wiki";

const props = defineProps<{
  items: TocItem[];
}>();

const activeId = ref<string>("");
const showMobileToc = ref(false);
const tocListRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;

// Offset for fixed headers (nav + reader bar)
const headerOffset = ref(0);

// Update header offset dynamically (in case of resize)
function updateHeaderOffset() {
  const nav = document.querySelector(".nav");
  const readerBar = document.querySelector(".reader-bar");
  const navHeight = nav?.getBoundingClientRect().height || 0;
  const readerBarHeight = readerBar?.getBoundingClientRect().height || 0;
  headerOffset.value = navHeight + readerBarHeight + 16; // + 1rem extra padding
}

// Smooth scroll to section with offset for fixed header
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  // Update offset just before scrolling
  updateHeaderOffset();

  const elementPosition = el.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - headerOffset.value;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });

  activeId.value = id;
  if (showMobileToc.value) showMobileToc.value = false;

  // Move focus to the heading for accessibility
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

/**
 * Setup IntersectionObserver to highlight active section in TOC
 */
function setupObserver() {
  if (observer) observer.disconnect();
  if (!props.items.length) return;

  // Use a better threshold and rootMargin for smooth activation
  observer = new IntersectionObserver(
    (entries) => {
      // Find the first intersecting entry (closest to top)
      const intersecting = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (intersecting.length > 0) {
        activeId.value = intersecting[0].target.id;
      } else {
        // If none intersecting, check if we're above the first heading
        const firstHeading = document.getElementById(props.items[0]?.id);
        if (
          firstHeading &&
          firstHeading.getBoundingClientRect().top > headerOffset.value
        ) {
          // We're above first heading – no active item
          activeId.value = "";
        }
      }
    },
    {
      rootMargin: `-${headerOffset.value}px 0px -50% 0px`,
      threshold: [0, 0.5, 1],
    },
  );

  props.items.forEach((item) => {
    const el = document.getElementById(item.id);
    if (el) observer!.observe(el);
  });
}

// Re-setup observer when items or offset change
watch(
  [() => props.items, headerOffset],
  () => {
    nextTick(() => {
      setupObserver();
    });
  },
  { immediate: true },
);

// Keyboard navigation within TOC
function handleKeydown(e: KeyboardEvent) {
  if (!tocListRef.value) return;

  const items = Array.from(
    tocListRef.value.querySelectorAll<HTMLButtonElement>(".toc-link"),
  );
  const currentIndex = items.findIndex(
    (item) => item === document.activeElement,
  );

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const next = items[currentIndex + 1] || items[0];
    next?.focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    const prev = items[currentIndex - 1] || items[items.length - 1];
    prev?.focus();
  } else if (e.key === "Home") {
    e.preventDefault();
    items[0]?.focus();
  } else if (e.key === "End") {
    e.preventDefault();
    items[items.length - 1]?.focus();
  } else if (e.key === "Escape" && showMobileToc.value) {
    showMobileToc.value = false;
  }
}

// Toggle mobile TOC
function toggleMobileToc() {
  showMobileToc.value = !showMobileToc.value;
  if (showMobileToc.value) {
    // When opening, focus the first item for keyboard users
    nextTick(() => {
      tocListRef.value?.querySelector<HTMLButtonElement>(".toc-link")?.focus();
    });
  }
}

// Set up resize observer to update offset when layout changes
onMounted(() => {
  updateHeaderOffset();
  resizeObserver = new ResizeObserver(() => {
    updateHeaderOffset();
    // Re-run observer setup after offset update (debounced)
    setTimeout(setupObserver, 100);
  });
  // Observe nav and reader bar if they exist
  const nav = document.querySelector(".nav");
  const readerBar = document.querySelector(".reader-bar");
  if (nav) resizeObserver.observe(nav);
  if (readerBar) resizeObserver.observe(readerBar);

  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  observer?.disconnect();
  resizeObserver?.disconnect();
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <!-- Desktop TOC -->
  <aside
    class="toc desktop-only"
    v-if="items.length >= 2"
    :class="{ 'has-many': items.length > 5 }"
  >
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
      <span>Contents</span>
      <span class="toc-count-badge" v-if="items.length > 5">{{
        items.length
      }}</span>
    </div>

    <nav aria-label="Table of contents">
      <ul class="toc-list" ref="tocListRef" role="list">
        <li
          v-for="item in items"
          :key="item.id"
          :class="`toc-item toc-level-${item.level}`"
          role="listitem"
        >
          <button
            class="toc-link"
            :class="{ active: activeId === item.id }"
            @click="scrollTo(item.id)"
            :title="item.title"
            :aria-current="activeId === item.id ? 'location' : undefined"
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

  <!-- Mobile TOC toggle button (shown only when there are items) -->
  <button
    v-if="items.length >= 2"
    class="mobile-toc-toggle"
    @click="toggleMobileToc"
    aria-label="Open table of contents"
    :aria-expanded="showMobileToc"
    :aria-controls="'mobile-toc-panel'"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
    <span>Contents</span>
    <span class="mobile-badge" v-if="items.length">{{ items.length }}</span>
  </button>

  <!-- Mobile TOC overlay (slide-up panel) -->
  <Transition name="slide-up">
    <div
      v-if="showMobileToc"
      class="mobile-toc-overlay"
      @click.self="showMobileToc = false"
    >
      <div class="mobile-toc-panel" id="mobile-toc-panel">
        <div class="mobile-toc-header">
          <h3>Table of Contents</h3>
          <button
            class="close-btn"
            @click="showMobileToc = false"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <nav aria-label="Table of contents">
          <ul class="toc-list mobile">
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
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Desktop TOC */
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

.toc.has-many {
  /* Slight visual hint when many sections */
  mask-image: linear-gradient(to bottom, black 90%, transparent);
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

.toc-count-badge {
  background: var(--accent-glow);
  color: var(--accent);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.55rem;
  margin-left: auto;
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
  border-radius: 0 var(--radius) var(--radius) 0;
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

.toc-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

/* Indentation for different heading levels */
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

/* Mobile toggle button */
.mobile-toc-toggle {
  display: none;
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 400;
  background: var(--accent);
  color: #0e0e0e;
  border: none;
  border-radius: 99px;
  padding: 0.8rem 1.2rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition:
    transform 0.15s,
    background 0.15s;
}

.mobile-toc-toggle:hover {
  background: #e8c97a;
  transform: scale(1.02);
}

.mobile-toc-toggle:active {
  transform: scale(0.98);
}

.mobile-badge {
  background: rgba(0, 0, 0, 0.2);
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  font-size: 0.7rem;
  margin-left: 0.2rem;
}

/* Mobile overlay */
.mobile-toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mobile-toc-panel {
  background: var(--surface);
  border-top-left-radius: var(--radius);
  border-top-right-radius: var(--radius);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
}

.mobile-toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.mobile-toc-header h3 {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  color: var(--text);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--accent);
}

.toc-list.mobile {
  max-height: none;
  overflow-y: visible;
}

.toc-list.mobile .toc-link {
  white-space: normal;
  word-break: break-word;
  padding: 0.5rem 0.6rem;
}

/* Slide-up animation for mobile panel */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Hide desktop TOC on smaller screens, show mobile toggle */
@media (max-width: 1024px) {
  .desktop-only {
    display: none;
  }
  .mobile-toc-toggle {
    display: flex;
  }
}

@media (min-width: 1025px) {
  .mobile-toc-toggle {
    display: none;
  }
}
</style>
