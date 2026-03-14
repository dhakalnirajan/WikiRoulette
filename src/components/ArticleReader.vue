<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import TocSidebar from "./TocSidebar.vue";
import PomodoroLearningView from "./PomodoroLearningView.vue";
import {
  fetchArticleHTML,
  htmlToObsidianMarkdown,
} from "@/composables/useWikiApi";
import { processArticleHTML } from "@/composables/useArticleProcessor";
import type { WikiSummary, TocItem } from "@/types/wiki";

const props = defineProps<{ summary: WikiSummary }>();
const emit = defineEmits<{
  (e: "back"): void;
  (e: "navigate", title: string): void;
}>();

const state = ref<"loading" | "ready" | "error">("loading");
const processedHtml = ref("");
const toc = ref<TocItem[]>([]);
const errorMsg = ref("");
const articleRef = ref<HTMLElement | null>(null);
const showPomodoro = ref(false);
const scrollProgress = ref(0);
const showBackToTop = ref(false);

// Feature states
const isFullscreen = ref(false);
const viewMode = ref<"html" | "markdown">("html");
const showShortcuts = ref(false);
const markdownContent = ref("");

const wikiUrl = computed(
  () =>
    props.summary.content_urls?.desktop?.page ??
    `https://en.wikipedia.org/wiki/${encodeURIComponent(props.summary.title.replace(/ /g, "_"))}`,
);

async function load(summary: WikiSummary) {
  state.value = "loading";
  processedHtml.value = "";
  markdownContent.value = "";
  toc.value = [];
  errorMsg.value = "";
  window.scrollTo({ top: 0, behavior: "instant" });

  try {
    const html = await fetchArticleHTML(summary.title);
    const result = processArticleHTML(html, summary.title, handleWikiLink);
    processedHtml.value = result.html;
    toc.value = result.toc;
    markdownContent.value = htmlToObsidianMarkdown(
      result.html,
      summary.title,
      wikiUrl.value,
    );
    state.value = "ready";
    await nextTick();
    attachWikiLinkHandlers();
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : "Unknown error";
    state.value = "error";
  }
}

function handleWikiLink(title: string) {
  emit("navigate", title);
}

function attachWikiLinkHandlers() {
  if (!articleRef.value) return;
  articleRef.value
    .querySelectorAll<HTMLElement>("[data-wiki]")
    .forEach((el) => {
      el.removeAttribute("href");
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const title = el.getAttribute("data-wiki");
        if (title) emit("navigate", title);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const title = el.getAttribute("data-wiki");
          if (title) emit("navigate", title);
        }
      });
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("title", `Read article: ${el.getAttribute("data-wiki")}`);
    });
}

function attachFallbackLinkHandlers() {
  if (!articleRef.value) return;
  articleRef.value
    .querySelectorAll<HTMLAnchorElement>("a[href]")
    .forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("/wiki/") || href.startsWith("./")) {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const title =
            a.getAttribute("data-wiki") ||
            decodeURIComponent(
              href.replace(/^\.?\/wiki\//, "").split("#")[0],
            ).replace(/_/g, " ");
          if (title && !title.includes(":")) {
            emit("navigate", title);
          }
        });
      }
    });
}

watch(
  () => props.summary,
  (newSummary) => {
    load(newSummary);
  },
  { immediate: true },
);

// --- Reading progress ---
function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  scrollProgress.value = Math.min(100, Math.max(0, progress));
  showBackToTop.value = scrollTop > 300;
}

// --- Feature Actions ---
function startPomodoro() {
  if (props.summary) {
    showPomodoro.value = true;
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    isFullscreen.value = true;
  } else {
    document.exitFullscreen?.();
    isFullscreen.value = false;
  }
}

function toggleViewMode() {
  viewMode.value = viewMode.value === "html" ? "markdown" : "html";
}

function downloadMarkdown() {
  const blob = new Blob([markdownContent.value], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = props.summary.title.replace(/[/\\?%*:|"<>]/g, "-");
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toggleShortcuts() {
  showShortcuts.value = !showShortcuts.value;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Keyboard Shortcuts ---
function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  if (e.key === "F1" || (e.key === "?" && e.shiftKey)) {
    e.preventDefault();
    toggleShortcuts();
    return;
  }
  if (showShortcuts.value && e.key === "Escape") {
    showShortcuts.value = false;
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    emit("back");
    return;
  }
  if (e.key === "Escape" && isFullscreen.value) {
    toggleFullscreen();
    return;
  }
  if (e.key === "Escape" && !isFullscreen.value && !showShortcuts.value) {
    emit("back");
    return;
  }
  if (e.key.toLowerCase() === "m") {
    toggleViewMode();
  }
  if (e.key.toLowerCase() === "f") {
    toggleFullscreen();
  }
  if (e.key.toLowerCase() === "d" && !e.ctrlKey && !e.metaKey) {
    downloadMarkdown();
  }
  if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    startPomodoro();
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("fullscreenchange", () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  window.addEventListener("scroll", updateScrollProgress);
  updateScrollProgress();
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("scroll", updateScrollProgress);
});

const copied = ref(false);
async function copyUrl() {
  try {
    await navigator.clipboard.writeText(wikiUrl.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch (_) {}
}
</script>

<template>
  <div class="reader" :class="{ 'fullscreen-active': isFullscreen }">
    <!-- Pomodoro Learning View Overlay -->
    <Transition name="fade">
      <PomodoroLearningView
        v-if="showPomodoro"
        :initial-article="summary"
        @complete="
          showPomodoro = false;
          $emit('back');
        "
        @back="showPomodoro = false"
      />
    </Transition>

    <template v-if="!showPomodoro">
      <!-- Reading progress bar -->
      <div class="progress-bar-container">
        <div
          class="progress-bar-fill"
          :style="{ width: scrollProgress + '%' }"
        ></div>
      </div>

      <!-- Reader top bar -->
      <div class="reader-bar">
        <button
          class="back-btn"
          @click="$emit('back')"
          aria-label="Back to explore"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span class="hide-mobile">Back</span>
        </button>

        <div class="reader-bar-title" :title="summary.title">
          {{ summary.title }}
        </div>

        <div class="reader-bar-actions">
          <!-- Pomodoro button -->
          <button
            class="bar-btn"
            @click="startPomodoro"
            title="Start Learning Mode (L)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="hide-mobile">Learn</span>
          </button>

          <!-- View Mode Toggle -->
          <button
            class="bar-btn"
            @click="toggleViewMode"
            :class="{ active: viewMode === 'markdown' }"
            title="Toggle Markdown/HTML (M)"
          >
            <span class="hide-mobile">{{
              viewMode === "html" ? "MD" : "HTML"
            }}</span>
            <span class="show-mobile">MD</span>
          </button>

          <!-- Download Markdown -->
          <button
            class="bar-btn"
            @click="downloadMarkdown"
            title="Export to Obsidian MD (D)"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span class="hide-mobile">Export</span>
          </button>

          <!-- Fullscreen Toggle -->
          <button
            class="bar-btn"
            @click="toggleFullscreen"
            :class="{ active: isFullscreen }"
            title="Toggle Fullscreen (F)"
          >
            <svg
              v-if="!isFullscreen"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
              />
            </svg>
            <svg
              v-else
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
              />
            </svg>
          </button>

          <!-- Copy URL -->
          <button
            class="bar-btn"
            :class="{ copied }"
            @click="copyUrl"
            title="Copy URL"
          >
            <svg
              v-if="!copied"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              />
            </svg>
            <svg
              v-else
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 12 4 12" />
              <polyline points="20 6 9 18 4 12" />
            </svg>
          </button>

          <!-- Help/Shortcuts -->
          <button
            class="bar-btn help-btn"
            @click="toggleShortcuts"
            title="Shortcuts (F1 / Shift+?)"
          >
            <span>?</span>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="reader-body">
        <div v-if="state === 'loading'" class="reader-loading">
          <div class="spinner"></div>
          <p>Loading "{{ summary.title }}"…</p>
        </div>

        <div v-else-if="state === 'error'" class="reader-error">
          <p class="error-headline">Could not load this article.</p>
          <p class="error-detail">{{ errorMsg }}</p>
          <a
            :href="wikiUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="error-link"
          >
            Open on Wikipedia ↗
          </a>
        </div>

        <div v-else class="reader-layout">
          <TocSidebar :items="toc" />

          <article
            class="reader-article"
            ref="articleRef"
            @click="attachFallbackLinkHandlers"
          >
            <div v-if="viewMode === 'html'" class="article-hero">
              <div class="article-hero-label">
                <span class="hero-line" aria-hidden="true"></span>
                Wikipedia · {{ summary.lang?.toUpperCase() ?? "EN" }}
              </div>
              <h1
                class="article-hero-title"
                v-html="summary.displaytitle || summary.title"
              />
              <p v-if="summary.description" class="article-hero-desc-text">
                {{ summary.description }}
              </p>
            </div>

            <div
              v-if="viewMode === 'html'"
              class="wiki-content"
              v-html="processedHtml"
            />
            <div v-else class="markdown-content">
              <pre>{{ markdownContent }}</pre>
            </div>
          </article>
        </div>
      </div>

      <!-- Back to top button -->
      <Transition name="fade">
        <button
          v-if="showBackToTop"
          class="back-to-top"
          @click="scrollToTop"
          aria-label="Back to top"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </Transition>

      <!-- Keyboard Shortcuts Modal -->
      <Transition name="fade">
        <div
          v-if="showShortcuts"
          class="shortcuts-modal"
          @click.self="showShortcuts = false"
        >
          <div class="shortcuts-card">
            <div class="shortcuts-header">
              <h2>Keyboard Shortcuts</h2>
              <button class="close-btn" @click="showShortcuts = false">
                &times;
              </button>
            </div>
            <div class="shortcuts-grid">
              <div class="shortcut-item">
                <kbd>←</kbd>/<kbd>Backspace</kbd><span>Go Back</span>
              </div>
              <div class="shortcut-item">
                <kbd>Esc</kbd><span>Exit Fullscreen / Back</span>
              </div>
              <div class="shortcut-item">
                <kbd>F</kbd><span>Toggle Fullscreen</span>
              </div>
              <div class="shortcut-item">
                <kbd>M</kbd><span>Toggle Markdown/HTML</span>
              </div>
              <div class="shortcut-item">
                <kbd>L</kbd><span>Start Learning Mode</span>
              </div>
              <div class="shortcut-item">
                <kbd>D</kbd><span>Download Markdown</span>
              </div>
              <div class="shortcut-item">
                <kbd>F1</kbd><span>Show Shortcuts</span>
              </div>
              <div class="shortcut-item">
                <kbd>Shift</kbd> + <kbd>?</kbd><span>Show Shortcuts</span>
              </div>
            </div>
            <p class="shortcuts-footer">Press <kbd>Esc</kbd> to close</p>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.reader {
  min-height: 100vh;
  padding-top: var(--nav-h);
}
.fullscreen-active .reader-bar {
  top: 0;
  position: fixed;
  width: 100%;
  z-index: 1000;
}
.fullscreen-active {
  padding-top: var(--reader-bar-h);
}

/* Progress bar */
.progress-bar-container {
  position: fixed;
  top: var(--nav-h);
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
  z-index: 350;
}
.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.1s ease;
}

.reader-bar {
  position: sticky;
  top: var(--nav-h);
  z-index: 300;
  height: var(--reader-bar-h);
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 2.5rem;
  background: rgba(12, 12, 12, 0.9);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}
.back-btn {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid rgba(201, 168, 76, 0.28);
  cursor: pointer;
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  transition: all 0.15s;
}
.back-btn:hover {
  border-color: rgba(201, 168, 76, 0.55);
  background: var(--accent-dim);
}
.reader-bar-title {
  flex: 1;
  font-family: var(--font-serif);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.reader-bar-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}
.bar-btn {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: none;
  border: 1px solid var(--border);
  cursor: pointer;
  padding: 0.28rem 0.7rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s;
}
.bar-btn:hover {
  color: var(--text);
  border-color: var(--border2);
}
.bar-btn.active {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
}
.help-btn {
  font-weight: bold;
  color: var(--accent);
  border-color: var(--accent);
}

.hide-mobile {
  display: inline;
}
.show-mobile {
  display: none;
}
@media (max-width: 600px) {
  .hide-mobile {
    display: none;
  }
  .show-mobile {
    display: inline;
  }
  .bar-btn {
    padding: 0.28rem 0.4rem;
  }
}

.reader-body {
  max-width: 1140px;
  margin: 0 auto;
  padding: 3rem 2.5rem 8rem;
}
.reader-layout {
  display: flex;
  gap: 3rem;
  align-items: flex-start;
}
.reader-article {
  flex: 1;
  min-width: 0;
}

.markdown-content {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-dim);
  background: var(--surface2);
  padding: 2rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow-x: auto;
}
.markdown-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.article-hero {
  margin-bottom: 2.5rem;
}
.article-hero-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.hero-line {
  display: inline-block;
  width: 18px;
  height: 1px;
  background: var(--accent);
  opacity: 0.5;
}
.article-hero-title {
  font-family: var(--font-serif);
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
}
.article-hero-desc-text {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  margin-top: 0.3rem;
}

.reader-loading,
.reader-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1.2rem;
  text-align: center;
}
.reader-loading p,
.error-detail {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
}
.error-headline {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  color: var(--text-dim);
}
.error-link {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid rgba(201, 168, 76, 0.3);
  transition: border-color 0.15s;
  margin-top: 0.5rem;
}
.error-link:hover {
  border-color: var(--accent);
}

/* Back to top button */
.back-to-top {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: #0e0e0e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.15s,
    background 0.15s;
  z-index: 400;
}
.back-to-top:hover {
  background: #e8c97a;
  transform: scale(1.05);
}
.back-to-top:active {
  transform: scale(0.95);
}

.shortcuts-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.shortcuts-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
}
.shortcuts-header h2 {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
}
.close-btn:hover {
  color: var(--accent);
}
.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.shortcut-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--text-dim);
}
kbd {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 0.2rem 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--accent);
}
.shortcuts-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-faint);
}

@media (max-width: 640px) {
  .reader-bar {
    padding: 0 1.2rem;
  }
  .reader-body {
    padding: 2rem 1.2rem 5rem;
  }
  .shortcuts-grid {
    grid-template-columns: 1fr;
  }
  .back-to-top {
    bottom: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
  }
}
</style>
