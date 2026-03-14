<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import ArticleCard from "./ArticleCard.vue";
import SkeletonCard from "./SkeletonCard.vue";
import SpinControls from "./SpinControls.vue";
import RecentItem from "./RecentItem.vue";
import ShortcutsModal from "./ShortcutsModal.vue";
import {
  fetchRandomSummary,
  fetchSummaryByTitle,
} from "@/composables/useWikiApi";
import { useHistory } from "@/composables/useHistory";
import type { WikiSummary } from "@/types/wiki";

const emit = defineEmits<{
  (e: "read", summary: WikiSummary): void;
  (e: "pomodoro", summary: WikiSummary): void;
}>();

// History
const { current, canGoBack, push, goBack, totalCount, recent } = useHistory();

// Bookmarks (localStorage)
const bookmarks = ref<WikiSummary[]>([]);
const bookmarksLoaded = ref(false);

// UI state
const loading = ref(false);
const errorMsg = ref("");
const jumpTitle = ref("");
const jumpLoading = ref(false);

const slideDir = ref<"right" | "left">("right");
const transitionName = computed(() =>
  slideDir.value === "right" ? "slide-right" : "slide-left",
);

// Computed: hasSummary
const hasSummary = computed(() => current.value !== null);

// Facts for empty state
const facts = [
  "Wikipedia has over 6 million articles in English.",
  "The longest article on Wikipedia is about the COVID-19 pandemic.",
  "The first Wikipedia article was 'HomePage'.",
  "There are more than 300 language editions of Wikipedia.",
  "Over 1.5 billion edits have been made on Wikipedia.",
  "The most edited article is 'Deaths in 2024'.",
];
const currentFact = ref(facts[0]);
let factInterval: number | null = null;

// Keyboard shortcuts modal
const showShortcuts = ref(false);

// Initialize bookmarks from localStorage
function loadBookmarks() {
  try {
    const stored = localStorage.getItem("wikiroulette-bookmarks");
    if (stored) {
      bookmarks.value = JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load bookmarks", e);
  } finally {
    bookmarksLoaded.value = true;
  }
}

function saveBookmarks() {
  try {
    localStorage.setItem(
      "wikiroulette-bookmarks",
      JSON.stringify(bookmarks.value),
    );
  } catch (e) {
    console.warn("Failed to save bookmarks", e);
  }
}

function toggleBookmark(summary: WikiSummary) {
  const index = bookmarks.value.findIndex((b) => b.pageid === summary.pageid);
  if (index === -1) {
    bookmarks.value.push(summary);
  } else {
    bookmarks.value.splice(index, 1);
  }
  saveBookmarks();
}

function isBookmarked(summary: WikiSummary): boolean {
  return bookmarks.value.some((b) => b.pageid === summary.pageid);
}

// Rotate facts every 8 seconds
function startFactRotation() {
  if (factInterval) clearInterval(factInterval);
  factInterval = window.setInterval(() => {
    const nextIndex = (facts.indexOf(currentFact.value) + 1) % facts.length;
    currentFact.value = facts[nextIndex];
  }, 8000);
}

function stopFactRotation() {
  if (factInterval) {
    clearInterval(factInterval);
    factInterval = null;
  }
}

// Spin
async function spin() {
  if (loading.value || jumpLoading.value) return;
  loading.value = true;
  errorMsg.value = "";
  slideDir.value = "right";
  try {
    const data = await fetchRandomSummary();
    push(data);
    stopFactRotation(); // Stop facts once an article is loaded
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Failed to fetch";
  } finally {
    loading.value = false;
  }
}

// Jump to article
async function jumpToArticle() {
  const title = jumpTitle.value.trim();
  if (!title) return;
  if (loading.value || jumpLoading.value) return;
  jumpLoading.value = true;
  errorMsg.value = "";
  slideDir.value = "right";

  try {
    const data = await fetchSummaryByTitle(title);
    push(data);
    jumpTitle.value = "";
    stopFactRotation();
  } catch (e) {
    errorMsg.value =
      e instanceof Error ? `Article "${title}" not found.` : "Failed to fetch";
  } finally {
    jumpLoading.value = false;
  }
}

function prev() {
  if (!canGoBack.value) return;
  slideDir.value = "left";
  goBack();
}

// Keyboard shortcuts (global)
function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  if (e.key === "F1" || (e.key === "?" && e.shiftKey)) {
    e.preventDefault();
    showShortcuts.value = true;
    return;
  }

  if (showShortcuts.value && e.key === "Escape") {
    showShortcuts.value = false;
    return;
  }

  if (e.key === "ArrowLeft" && !loading.value && !jumpLoading.value) {
    prev();
  }
  if (e.key === "ArrowRight" || e.key === " ") {
    e.preventDefault();
    spin();
  }
  if (e.key.toLowerCase() === "r" && current.value) {
    emit("read", current.value.summary);
  }
  if (e.key.toLowerCase() === "l" && current.value) {
    emit("pomodoro", current.value.summary);
  }
}

onMounted(() => {
  loadBookmarks();
  startFactRotation();
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  stopFactRotation();
  document.removeEventListener("keydown", handleKeydown);
});

defineExpose({ spin, totalCount });
</script>

<template>
  <div class="home">
    <!-- Keyboard Shortcuts Modal -->
    <ShortcutsModal :show="showShortcuts" @close="showShortcuts = false" />

    <div class="home-layout">
      <!-- Main Content (Center) -->
      <div class="home-main">
        <div class="home-inner">
          <!-- Jump / Search Bar (enhanced) -->
          <div class="command-bar">
            <div class="jump-container glass">
              <span class="search-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                v-model="jumpTitle"
                @keyup.enter="jumpToArticle"
                type="text"
                placeholder="Jump to any article..."
                class="jump-input"
                :disabled="jumpLoading"
              />
              <button
                @click="jumpToArticle"
                :disabled="!jumpTitle.trim() || jumpLoading"
                class="jump-btn"
              >
                {{ jumpLoading ? "..." : "Go" }}
              </button>
            </div>

            <!-- Stats / Exploration Counter -->
            <div class="stats glass">
              <div class="stat-item">
                <span class="stat-label">Explored</span>
                <span class="stat-value">{{ totalCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Bookmarked</span>
                <span class="stat-value">{{ bookmarks.length }}</span>
              </div>
            </div>
          </div>

          <!-- Card Area -->
          <div class="card-area">
            <!-- Loading skeleton with shimmer -->
            <SkeletonCard v-if="loading || jumpLoading" />

            <!-- Error Card -->
            <div v-else-if="errorMsg" class="error-card glass">
              <p class="error-icon">⚠️</p>
              <p class="error-message">{{ errorMsg }}</p>
              <button class="retry-btn" @click="spin">
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
                Try Again
              </button>
            </div>

            <!-- Article card with slide transition -->
            <Transition
              :name="transitionName"
              mode="out-in"
              v-else-if="hasSummary"
            >
              <ArticleCard
                :key="current!.summary.pageid"
                :summary="current!.summary"
                :bookmarked="isBookmarked(current!.summary)"
                @read="emit('read', current!.summary)"
                @pomodoro="emit('pomodoro', current!.summary)"
                @bookmark="toggleBookmark(current!.summary)"
              />
            </Transition>

            <!-- Empty State Hero -->
            <div v-else class="empty-hero glass">
              <div class="hero-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <h2 class="hero-title">Ready to discover?</h2>
              <p class="hero-subtitle">
                Hit <strong>Spin</strong> or press <kbd>Space</kbd> to explore
                random knowledge.
              </p>
              <div class="fact-rotator">
                <span class="fact-label">Did you know?</span>
                <p class="fact-text">{{ currentFact }}</p>
              </div>
            </div>
          </div>

          <!-- Spin Controls -->
          <div class="controls-wrapper">
            <SpinControls
              :can-go-back="canGoBack"
              :loading="loading || jumpLoading"
              @prev="prev"
              @spin="spin"
              @next="spin"
            />
          </div>

          <!-- Keyboard Hint -->
          <div class="kbd-hint-wrapper">
            <div class="kbd-hint">
              <span class="hint-item"> <kbd>←</kbd> <span>Prev</span> </span>
              <span class="sep">·</span>
              <span class="hint-item">
                <kbd>Space</kbd>/<kbd>→</kbd> <span>Spin</span>
              </span>
              <span class="sep">·</span>
              <span class="hint-item"> <kbd>R</kbd> <span>Read</span> </span>
              <span class="sep">·</span>
              <span class="hint-item"> <kbd>L</kbd> <span>Learn</span> </span>
              <button
                class="help-btn"
                @click="showShortcuts = true"
                title="More shortcuts (F1)"
              >
                <kbd>?</kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar (Recent Discoveries) -->
      <aside class="home-sidebar">
        <div class="sidebar-card glass">
          <h3 class="sidebar-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Recent Discoveries
          </h3>
          <div v-if="recent.length === 0" class="sidebar-empty">
            <p>No articles yet. Start spinning!</p>
          </div>
          <ul v-else class="recent-list">
            <li v-for="(entry, index) in recent" :key="index">
              <RecentItem
                :summary="entry.summary"
                :is-current="entry.summary.pageid === current?.summary.pageid"
                @click="push(entry.summary)"
                @bookmark="toggleBookmark(entry.summary)"
                :bookmarked="isBookmarked(entry.summary)"
              />
            </li>
          </ul>

          <!-- Bookmarks quick view (optional) -->
          <div v-if="bookmarks.length > 0" class="sidebar-divider"></div>
          <div v-if="bookmarks.length > 0" class="sidebar-bookmarks">
            <h4 class="sidebar-subtitle">
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
              Bookmarks
            </h4>
            <ul class="recent-list compact">
              <li v-for="(bookmark, idx) in bookmarks.slice(0, 3)" :key="idx">
                <RecentItem
                  :summary="bookmark"
                  :is-current="bookmark.pageid === current?.summary.pageid"
                  @click="push(bookmark)"
                  @bookmark="toggleBookmark(bookmark)"
                  :bookmarked="true"
                />
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  padding-top: var(--nav-h);
  background: var(--bg);
}

.home-layout {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  gap: 2rem;
}

.home-main {
  flex: 1;
  min-width: 0; /* Prevent overflow */
}

.home-sidebar {
  width: 280px;
  flex-shrink: 0;
}

.home-inner {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Glassmorphism utility */
.glass {
  background: var(--surface);
  border: 1px solid var(--border);
  backdrop-filter: blur(10px);
  border-radius: var(--radius);
}

/* Command bar (search + stats) */
.command-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.jump-container {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0.25rem 1rem;
}

.search-icon {
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.jump-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 0.95rem;
  padding: 0.6rem 0;
  outline: none;
}

.jump-input::placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.jump-btn {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid rgba(201, 168, 76, 0.28);
  border-radius: var(--radius);
  padding: 0.45rem 1.2rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.jump-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #0e0e0e;
  border-color: var(--accent);
}

.jump-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats {
  display: flex;
  gap: 1.5rem;
  padding: 0.6rem 1.2rem;
  background: var(--surface);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.stat-value {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.2;
}

/* Card area */
.card-area {
  min-height: 450px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
}

/* Error card */
.error-card {
  width: 100%;
  max-width: 800px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.error-message {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.retry-btn {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid rgba(201, 168, 76, 0.3);
  cursor: pointer;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
}

.retry-btn:hover {
  background: var(--accent-dim);
  border-color: var(--accent);
}

/* Empty hero */
.empty-hero {
  width: 100%;
  max-width: 800px;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.2rem;
  background: var(--surface);
}

.hero-icon {
  background: var(--accent-glow);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.hero-title {
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.hero-subtitle {
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--text-muted);
}

.hero-subtitle kbd {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--accent);
}

.fact-rotator {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--surface2);
  border-radius: var(--radius);
  max-width: 400px;
}

.fact-label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  color: var(--accent);
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 0.4rem;
}

.fact-text {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 0;
}

/* Keyboard hint */
.kbd-hint {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 1rem;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sep {
  color: var(--text-faint);
}

.help-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.help-btn kbd {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 0.12rem 0.4rem;
  font-size: 0.65rem;
  color: var(--accent);
}

/* Sidebar */
.home-sidebar {
  display: block;
}

.sidebar-card {
  padding: 1.2rem;
  background: var(--surface);
}

.sidebar-title {
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.sidebar-title svg {
  opacity: 0.7;
}

.sidebar-empty {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--text-muted);
  padding: 0.5rem 0;
  text-align: center;
  font-style: italic;
}

.recent-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recent-list li + li {
  margin-top: 0.5rem;
}

.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 1rem 0;
}

.sidebar-subtitle {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 0.8rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  letter-spacing: 0.05em;
}

.compact .recent-item {
  padding: 0.4rem;
}

.controls-wrapper,
.kbd-hint-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Ensure the controls component itself doesn't stretch unnecessarily */
.controls-wrapper :deep(.controls) {
  margin: 0 auto;
}

/* Keep the hint inline */
.kbd-hint {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 1rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .home-sidebar {
    display: none;
  }
}

@media (max-width: 640px) {
  .command-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .stats {
    justify-content: space-around;
  }
  .empty-hero {
    padding: 2rem 1rem;
  }
  .hero-title {
    font-size: 1.6rem;
  }
}
</style>
