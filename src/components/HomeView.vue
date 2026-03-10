<script setup lang="ts">
import { ref, computed } from "vue";
import ArticleCard from "./ArticleCard.vue";
import SkeletonCard from "./SkeletonCard.vue";
import SpinControls from "./SpinControls.vue";
// Now we use both functions
import {
  fetchRandomSummary,
  fetchSummaryByTitle,
} from "@/composables/useWikiApi";
import { useHistory } from "@/composables/useHistory";
import type { WikiSummary } from "@/types/wiki";

const emit = defineEmits<{
  (e: "read", summary: WikiSummary): void;
}>();

const { current, canGoBack, push, goBack, totalCount } = useHistory();

const loading = ref(false);
const errorMsg = ref("");
const jumpTitle = ref(""); // State for manual title input
const jumpLoading = ref(false);

const hasSummary = computed(() => current.value !== null);

// Direction for slide animation
const slideDir = ref<"right" | "left">("right");
const transitionName = computed(() =>
  slideDir.value === "right" ? "slide-right" : "slide-left",
);

async function spin() {
  if (loading.value || jumpLoading.value) return;
  loading.value = true;
  errorMsg.value = "";
  slideDir.value = "right";
  try {
    const data = await fetchRandomSummary();
    push(data);
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Failed to fetch";
  } finally {
    loading.value = false;
  }
}

// NEW: Function to fetch a specific article by title using fetchSummaryByTitle
async function jumpToArticle() {
  const title = jumpTitle.value.trim();
  if (!title) return;

  if (loading.value || jumpLoading.value) return;
  jumpLoading.value = true;
  errorMsg.value = "";
  slideDir.value = "right";

  try {
    // Using the previously unused import here
    const data = await fetchSummaryByTitle(title);
    push(data);
    jumpTitle.value = ""; // Clear input on success
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

// Expose so App.vue can call spin on mount
defineExpose({ spin, totalCount });
</script>

<template>
  <div class="home">
    <div class="home-inner">
      <!-- Search / Jump Input -->
      <div class="jump-container">
        <input
          v-model="jumpTitle"
          @keyup.enter="jumpToArticle"
          type="text"
          placeholder="Or jump to a specific article..."
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

      <!-- Card area -->
      <div class="card-area">
        <!-- Loading skeleton -->
        <SkeletonCard v-if="loading || jumpLoading" />

        <!-- Error -->
        <div v-else-if="errorMsg" class="error-card">
          <p>{{ errorMsg }}</p>
          <button class="retry-btn" @click="spin">Try Random Instead</button>
        </div>

        <!-- Article card with slide transition -->
        <Transition :name="transitionName" mode="out-in" v-else-if="hasSummary">
          <ArticleCard
            :key="current!.summary.pageid"
            :summary="current!.summary"
            @read="emit('read', current!.summary)"
          />
        </Transition>

        <!-- Empty state (first load before spin) -->
        <div v-else class="empty-state">
          <p>
            Hit <strong>Spin</strong> to discover a random Wikipedia article.
          </p>
        </div>
      </div>

      <!-- Controls -->
      <SpinControls
        :can-go-back="canGoBack"
        :loading="loading || jumpLoading"
        @prev="prev"
        @spin="spin"
        @next="spin"
      />

      <!-- Keyboard hint -->
      <div class="kbd-hint" aria-label="Keyboard shortcuts">
        <kbd>←</kbd>
        <span>Previous</span>
        <span class="sep">·</span>
        <kbd>Space</kbd> / <kbd>→</kbd>
        <span>Next</span>
        <span class="sep">·</span>
        <kbd>R</kbd>
        <span>Read</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  padding-top: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.home-inner {
  width: 100%;
  max-width: 840px;
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem; /* Increased gap for the new input */
}

/* New Jump Input Styles */
.jump-container {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 500px;
}

.jump-input {
  flex: 1;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  padding: 0.6rem 1rem;
  border-radius: var(--radius);
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.jump-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.jump-input::placeholder {
  color: var(--text-muted);
}

.jump-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 1.2rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.jump-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
}

.jump-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-area {
  width: 100%;
  min-height: 420px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.error-card {
  width: 100%;
  max-width: 800px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 3rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.retry-btn {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid rgba(201, 168, 76, 0.3);
  cursor: pointer;
  padding: 0.4rem 1rem;
  border-radius: var(--radius);
  transition: all 0.15s;
}

.retry-btn:hover {
  background: var(--accent-dim);
}

.empty-state {
  width: 100%;
  max-width: 800px;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 2rem;
}

.empty-state strong {
  color: var(--accent);
  font-style: normal;
}

.kbd-hint {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  flex-wrap: wrap;
  justify-content: center;
}

kbd {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 0.12rem 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-dim);
}

.sep {
  color: var(--text-faint);
  margin: 0 0.1rem;
}

@media (max-width: 640px) {
  .jump-container {
    flex-direction: column;
  }
  .jump-btn {
    width: 100%;
    padding: 0.6rem;
  }
}
</style>
