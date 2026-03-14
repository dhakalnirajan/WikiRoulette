<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { usePomodoroLearning } from "@/composables/usePomodoroLearning";
import type { WikiSummary } from "@/types/wiki";

const props = defineProps<{
  initialArticle: WikiSummary;
}>();

const emit = defineEmits<{
  (e: "complete"): void;
  (e: "back"): void;
}>();

const {
  session,
  currentPhase,
  isBuffering,
  isReading,
  isReflecting,
  isPostStudy,
  isPaused,
  formattedTime,
  startSession,
  endSession,
  updateNotes,
  exportNotes,
  copyNotesToClipboard,
  togglePause,
  skipPhase,
  addTime,
} = usePomodoroLearning();

const notesRef = ref<HTMLTextAreaElement | null>(null);
const showExportModal = ref(false);
const exportedContent = ref("");
const showControls = ref(false);

// Start session when component mounts
onMounted(() => {
  startSession(props.initialArticle);
});

onUnmounted(() => {
  endSession();
});

// Handle keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  // Ignore if typing in textarea
  if (document.activeElement?.tagName === "TEXTAREA") return;

  // Global shortcuts
  if (e.key === "Escape") {
    e.preventDefault();
    if (showExportModal.value) {
      showExportModal.value = false;
    } else {
      endSession();
      emit("back");
    }
    return;
  }

  // Pomodoro-specific shortcuts
  if (isReading.value || isReflecting.value || isPaused.value) {
    switch (e.key.toLowerCase()) {
      case " ":
        e.preventDefault();
        togglePause();
        break;
      case "s":
        e.preventDefault();
        skipPhase();
        break;
      case "+":
      case "=":
        e.preventDefault();
        addTime();
        break;
      case "h":
        e.preventDefault();
        showControls.value = !showControls.value;
        break;
    }
  }

  // Ctrl+S to save notes manually
  if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    return;
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});

// Export notes
function handleExport() {
  exportedContent.value = exportNotes();
  showExportModal.value = true;
}

async function downloadNotes() {
  try {
    await copyNotesToClipboard();
    // Show success feedback
    const btn = document.querySelector(".action-btn.primary");
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = "Copied to clipboard!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  } catch (err) {
    console.error("Failed to copy notes:", err);
  }
}

// Get random prompt for reflection phase
const currentPrompt = computed(() => {
  if (!currentPhase.value) return "";
  const prompts = currentPhase.value.prompts;
  const round = session.value.currentRound;
  return prompts[(round === 1 ? 0 : 1) % prompts.length];
});

// Wiki URL for reference link
const wikiUrl = computed(
  () =>
    session.value.article?.content_urls?.desktop?.page ??
    (session.value.article
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(session.value.article.title.replace(/ /g, "_"))}`
      : ""),
);
</script>

<template>
  <div class="pomodoro-learning">
    <!-- Header Bar -->
    <header class="pomodoro-header">
      <button
        class="back-btn"
        @click="
          endSession();
          emit('back');
        "
        aria-label="Exit learning session"
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
        Exit
      </button>

      <div class="phase-info">
        <span class="phase-name">
          {{ isPostStudy ? "Free Review" : `Round ${session.currentRound}` }}
          <span v-if="isPaused" class="paused-badge">(Paused)</span>
        </span>
        <span class="phase-desc" v-if="currentPhase">
          {{ currentPhase.description }}
        </span>
      </div>

      <!-- Timer -->
      <div v-if="isReading || isReflecting || isPaused" class="timer-display">
        <span class="time-remaining">{{ formattedTime }}</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{
              width: `${(session.timeRemaining / (currentPhase?.readDuration || currentPhase?.reflectDuration || 1)) * 100}%`,
            }"
          ></div>
        </div>
      </div>

      <!-- Quick Help Button -->
      <button
        class="help-btn"
        @click="showControls = !showControls"
        title="Show controls (H)"
      >
        <span>⌨️</span>
      </button>
    </header>

    <!-- Controls Panel (toggle with H) -->
    <Transition name="slide-down">
      <div v-if="showControls" class="controls-panel">
        <div class="controls-grid">
          <button @click="togglePause" class="control-btn">
            <kbd>Space</kbd> {{ isPaused ? "Resume" : "Pause" }}
          </button>
          <button @click="skipPhase" class="control-btn">
            <kbd>S</kbd> Skip Phase
          </button>
          <button @click="addTime" class="control-btn">
            <kbd>+</kbd> Add 1 Min
          </button>
          <button @click="showControls = false" class="control-btn">
            <kbd>H</kbd> Hide
          </button>
        </div>
        <p class="controls-note">
          <span class="badge"
            >Bell sounds at phase start, 5s warning, and completion</span
          >
        </p>
      </div>
    </Transition>

    <!-- Main Content Area -->
    <main class="pomodoro-content">
      <!-- BUFFER STATE: 3-second countdown overlay -->
      <Transition name="fade">
        <div v-if="isBuffering" class="buffer-overlay">
          <div class="buffer-countdown">
            <div class="countdown-number">{{ session.bufferCountdown }}</div>
            <p>Get ready to read...</p>
            <p class="buffer-hint">Bell will sound when ready</p>
          </div>
        </div>
      </Transition>

      <!-- LOADING / ERROR STATE -->
      <div v-if="session.isLoading || session.error" class="reader-loading">
        <div v-if="session.isLoading" class="spinner"></div>
        <p>{{ session.error || `Loading "${session.article?.title}"…` }}</p>
      </div>

      <!-- READING STATE: Article content -->
      <Transition name="fade">
        <section
          v-if="
            (isReading || isPostStudy || isPaused) &&
            session.processedContent &&
            !session.error
          "
          class="read-section"
          :class="{ paused: isPaused }"
        >
          <article class="reader-article">
            <!-- Hero Section -->
            <div class="article-hero">
              <div class="article-hero-label">
                <span class="hero-line" aria-hidden="true"></span>
                Wikipedia · {{ session.article?.lang?.toUpperCase() ?? "EN" }}
              </div>
              <h1
                class="article-hero-title"
                v-html="session.article?.displaytitle || session.article?.title"
              />
              <p
                v-if="session.article?.description"
                class="article-hero-desc-text"
              >
                {{ session.article.description }}
              </p>
            </div>

            <!-- Processed Wikipedia content -->
            <div class="wiki-content" v-html="session.processedContent.html" />
          </article>

          <!-- Paused overlay -->
          <div v-if="isPaused" class="paused-overlay">
            <div class="paused-message">
              <span class="paused-icon">⏸️</span>
              <span class="paused-text">Session Paused</span>
              <button @click="togglePause" class="resume-btn">
                Resume (Space)
              </button>
            </div>
          </div>

          <!-- Post-study badge -->
          <div v-if="isPostStudy" class="post-study-badge">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Unlocked for free review</span>
          </div>
        </section>
      </Transition>

      <!-- REFLECTING STATE: Notepad with prompts -->
      <Transition name="fade">
        <section v-if="isReflecting" class="reflect-section">
          <div class="notepad-container">
            <div class="notepad-header">
              <h2>Reflection Time</h2>
              <p class="notepad-prompt">
                <strong>Prompt:</strong> {{ currentPrompt }}
              </p>
              <p class="notepad-instructions">
                Write freely about what you read. Consider: • What surprised
                you?<br />
                • What questions do you have?<br />
                • How does this connect to what you know?
              </p>
            </div>

            <textarea
              ref="notesRef"
              :value="session.notes[`round-${session.currentRound}`] || ''"
              @input="updateNotes(($event.target as HTMLTextAreaElement).value)"
              class="notepad-editor"
              placeholder="Start writing your thoughts..."
              aria-label="Reflection notes"
              autofocus
            ></textarea>

            <div class="notepad-footer">
              <div class="timer-mini">
                <span>Time remaining:</span>
                <strong>{{ formattedTime }}</strong>
              </div>
            </div>
          </div>
        </section>
      </Transition>
    </main>

    <!-- Session Complete Modal -->
    <Transition name="fade">
      <div v-if="isPostStudy" class="complete-overlay">
        <div class="complete-card">
          <h2>Session Complete!</h2>
          <p>You've completed your learning session for:</p>
          <h3 class="complete-title">{{ session.article?.title }}</h3>

          <div class="complete-actions">
            <button class="action-btn primary" @click="handleExport">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Notes
            </button>
            <a
              v-if="wikiUrl"
              :href="wikiUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="action-btn"
            >
              Open on Wikipedia ↗
            </a>
            <button class="action-btn" @click="emit('back')">
              Return to Explore
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Export Modal -->
    <Transition name="fade">
      <div
        v-if="showExportModal"
        class="export-modal"
        @click.self="showExportModal = false"
      >
        <div class="export-card">
          <div class="export-header">
            <h3>Export Learning Notes</h3>
            <button class="close-btn" @click="showExportModal = false">
              &times;
            </button>
          </div>

          <div class="export-preview">
            <pre>{{ exportedContent }}</pre>
          </div>

          <div class="export-actions">
            <button class="action-btn primary" @click="downloadNotes">
              Copy to Clipboard
            </button>
            <button class="action-btn" @click="showExportModal = false">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.paused-badge {
  font-size: 0.8rem;
  color: var(--accent);
  margin-left: 0.5rem;
  font-style: italic;
}

.help-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.help-btn:hover {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
}

.controls-panel {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 1rem 2.5rem;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.controls-grid {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.control-btn {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  background: var(--surface2);
  border: 1px solid var(--border2);
  color: var(--text-dim);
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s;
}

.control-btn:hover {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
}

.control-btn kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.65rem;
}

.controls-note {
  text-align: center;
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
}

.badge {
  background: var(--accent-glow);
  color: var(--accent);
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
}

.read-section.paused {
  opacity: 0.7;
  filter: blur(1px);
  transition: all 0.3s;
}

.paused-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.paused-message {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 1.5rem 2.5rem;
  border-radius: var(--radius);
  text-align: center;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.paused-icon {
  font-size: 2rem;
}

.paused-text {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text);
}

.resume-btn {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  background: var(--accent);
  border: none;
  color: #0e0e0e;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-weight: 500;
}

.resume-btn:hover {
  background: #e8c97a;
}

.buffer-hint {
  font-size: 0.8rem;
  color: var(--accent);
  margin-top: 0.5rem;
  opacity: 0.8;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.pomodoro-learning {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
}

/* Header Bar - matches ArticleReader styling */
.pomodoro-header {
  position: sticky;
  top: var(--nav-h);
  z-index: 300;
  height: var(--reader-bar-h);
  display: flex;
  align-items: center;
  gap: 1.5rem;
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
  min-height: 44px;
}

.back-btn:hover {
  border-color: rgba(201, 168, 76, 0.55);
  background: var(--accent-dim);
}

.phase-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.phase-name {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.phase-desc {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.timer-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  min-width: 80px;
}

.time-remaining {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.progress-bar {
  width: 100%;
  height: 3px;
  background: var(--border);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

/* Main Content */
.pomodoro-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 3rem 2.5rem 8rem;
  max-width: 1140px;
  margin: 0 auto;
  width: 100%;
  position: relative;
}

/* Buffer Overlay */
.buffer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(12, 12, 12, 0.95);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.buffer-countdown {
  text-align: center;
  color: var(--text);
}

.countdown-number {
  font-family: var(--font-mono);
  font-size: 8rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.buffer-countdown p {
  font-family: var(--font-sans);
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-top: 1rem;
}

/* Loading / Error - matches ArticleReader */
.reader-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1.2rem;
  text-align: center;
}

.reader-loading p {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Read Section - uses same .reader-article and .wiki-content as ArticleReader */
.read-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.reader-article {
  flex: 1;
  min-width: 0;
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
  flex-shrink: 0;
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

.article-hero-title :deep(i),
.article-hero-title :deep(em) {
  font-style: italic;
}

.article-hero-title :deep(sup) {
  font-size: 0.6em;
}

.article-hero-desc-text {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  margin-top: 0.3rem;
}

/* .wiki-content styles are inherited from global.css - same as ArticleReader */

.post-study-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--accent);
  color: #0e0e0e;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  z-index: 10;
}

/* Reflect Section */
.reflect-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.notepad-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.notepad-header {
  margin-bottom: 1.5rem;
}

.notepad-header h2 {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.notepad-prompt {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  color: var(--accent);
  margin-bottom: 0.8rem;
  padding: 0.5rem;
  background: var(--accent-glow);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius) var(--radius) 0;
}

.notepad-instructions {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.notepad-editor {
  flex: 1;
  width: 100%;
  min-height: 300px;
  padding: 1rem;
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 5px;
  color: var(--text);
  font-family: var(--font-serif);
  font-size: 1rem;
  line-height: 1.8;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.notepad-editor:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.notepad-editor::placeholder {
  color: var(--text-faint);
  font-style: italic;
}

.notepad-footer {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

.timer-mini {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.timer-mini strong {
  color: var(--accent);
  font-size: 0.9rem;
}

/* Session Complete Overlay */
.complete-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.complete-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.complete-card h2 {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  color: var(--text);
  margin-bottom: 1rem;
}

.complete-card p {
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.complete-title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--accent);
  margin-bottom: 2rem;
  font-weight: 600;
}

.complete-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Export Modal */
.export-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.export-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.export-header h3 {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--text);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.8rem;
  cursor: pointer;
  line-height: 1;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--accent);
}

.export-preview {
  flex: 1;
  overflow: auto;
  margin-bottom: 1.5rem;
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-dim);
  white-space: pre-wrap;
}

.export-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Action Buttons */
.action-btn {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.5rem 1.2rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s;
  min-height: 44px;
  text-decoration: none;
}

.action-btn:not(:disabled):hover {
  background: var(--surface2);
  color: var(--text);
  border-color: var(--border2);
}

.action-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #0e0e0e;
  font-weight: 500;
}

.action-btn.primary:not(:disabled):hover {
  background: #e8c97a;
  border-color: #e8c97a;
  color: #0a0a0a;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .pomodoro-header {
    padding: 0 1.2rem;
    gap: 1rem;
  }

  .phase-info {
    display: none;
  }

  .timer-display {
    min-width: auto;
  }

  .pomodoro-content {
    padding: 2rem 1.2rem 5rem;
  }

  .notepad-container {
    padding: 1.5rem;
  }

  .notepad-editor {
    min-height: 250px;
    font-size: 0.95rem;
  }

  .complete-card,
  .export-card {
    padding: 1.5rem;
    margin: 1rem;
  }

  .countdown-number {
    font-size: 5rem;
  }

  .article-hero-title {
    font-size: clamp(1.5rem, 5vw, 2rem);
  }
}

@media (max-width: 480px) {
  .pomodoro-header {
    padding: 0 0.8rem;
  }

  .time-remaining {
    font-size: 1.4rem;
  }

  .notepad-editor {
    font-size: 0.9rem;
    padding: 0.8rem;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }

  .export-actions {
    flex-direction: column;
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Spinner - matches ArticleReader */
.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Enhanced mobile responsiveness */
@media (max-width: 768px) {
  .pomodoro-header {
    padding: 0 1rem;
    gap: 0.75rem;
    height: auto;
    min-height: var(--reader-bar-h);
    flex-wrap: wrap;
  }

  .phase-info {
    order: 3;
    width: 100%;
    text-align: center;
    margin: 0.25rem 0;
  }

  .phase-name {
    font-size: 0.9rem;
  }

  .phase-desc {
    font-size: 0.65rem;
  }

  .timer-display {
    min-width: 70px;
  }

  .time-remaining {
    font-size: 1rem;
  }

  .controls-panel {
    padding: 0.75rem 1rem;
  }

  .controls-grid {
    gap: 0.5rem;
  }

  .control-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.65rem;
  }

  .pomodoro-content {
    padding: 1.5rem 1rem 4rem;
  }

  .countdown-number {
    font-size: 5rem;
  }

  .buffer-countdown p {
    font-size: 1rem;
  }

  .notepad-container {
    padding: 1.25rem;
  }

  .notepad-editor {
    min-height: 200px;
    font-size: 0.9rem;
  }

  .article-hero-title {
    font-size: clamp(1.4rem, 6vw, 2rem);
  }
}

@media (max-width: 480px) {
  .pomodoro-header {
    padding: 0 0.5rem;
  }

  .back-btn {
    padding: 0.3rem 0.5rem;
    font-size: 0.6rem;
  }

  .back-btn svg {
    width: 11px;
    height: 11px;
  }

  .timer-display {
    min-width: 60px;
  }

  .time-remaining {
    font-size: 0.9rem;
  }

  .progress-bar {
    height: 2px;
  }

  .controls-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .control-btn {
    width: 100%;
    justify-content: center;
  }

  .pomodoro-content {
    padding: 1rem 0.75rem 3rem;
  }

  .countdown-number {
    font-size: 4rem;
  }

  .buffer-hint {
    font-size: 0.7rem;
  }

  .article-hero-label {
    font-size: 0.55rem;
  }

  .article-hero-title {
    font-size: clamp(1.2rem, 7vw, 1.8rem);
  }

  .article-hero-desc-text {
    font-size: 0.7rem;
  }

  .wiki-content {
    font-size: 0.9rem;
  }

  .notepad-header h2 {
    font-size: 1.2rem;
  }

  .notepad-prompt {
    font-size: 0.85rem;
  }

  .notepad-instructions {
    font-size: 0.8rem;
  }

  .notepad-editor {
    min-height: 180px;
    font-size: 0.85rem;
    padding: 0.75rem;
  }

  .timer-mini {
    font-size: 0.7rem;
  }

  .complete-card {
    padding: 1.5rem 1rem;
  }

  .complete-card h2 {
    font-size: 1.5rem;
  }

  .complete-title {
    font-size: 1.1rem;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
    padding: 0.6rem;
  }

  .export-card {
    padding: 1rem;
  }

  .export-preview {
    font-size: 0.75rem;
  }
}

/* Improve touch targets on mobile */
@media (max-width: 768px) {
  .back-btn,
  .help-btn,
  .control-btn,
  .action-btn,
  .resume-btn {
    min-height: 48px;
  }

  .control-btn kbd {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
  }
}
</style>
