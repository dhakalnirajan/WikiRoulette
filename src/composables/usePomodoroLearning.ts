import { ref, computed, onUnmounted, shallowRef } from "vue";
import type { WikiSummary, ProcessedContent } from "@/types/wiki";
import { fetchArticleHTML, cancelRequest } from "./useWikiApi";
import { processArticleHTML } from "./useArticleProcessor";
import { POMODORO_CONFIG } from "@/config";

// ============================================================================
// Types - Discriminated Union for State Machine
// ============================================================================
export type LearningState =
  | { status: "idle" }
  | { status: "buffer"; countdown: number }
  | { status: "reading"; timeRemaining: number }
  | { status: "reflecting"; timeRemaining: number }
  | { status: "post-study" }
  | {
      status: "paused";
      previousState: "reading" | "reflecting";
      timeRemaining: number;
    };

export type LearningRound = 1 | 2 | "final";

export interface LearningPhase {
  round: number;
  readDuration: number;
  reflectDuration: number;
  description: string;
  prompts: string[];
}

export interface LearningSession {
  articleTitle: string;
  round: number;
  notes: Record<string, string>;
  timestamp: number;
}

// ============================================================================
// Audio Management
// ============================================================================
const bellSoundUrl = new URL("../assets/sounds/bell.mp3", import.meta.url).href;
const bellSound = new Audio(bellSoundUrl);
bellSound.load();

function playBell(): void {
  try {
    const audio = bellSound.cloneNode() as HTMLAudioElement;
    audio.volume = 0.5;
    audio.play().catch((e) => console.log("Audio playback failed:", e));
  } catch {
    // Silent fail
  }
}

// ============================================================================
// Timer Manager
// ============================================================================
class TimerManager {
  private timer: number | null = null;
  private bufferTimer: number | null = null;

  setTimer(callback: () => void, interval: number): void {
    this.clearTimer();
    this.timer = window.setInterval(callback, interval);
  }

  setBufferTimer(callback: () => void, interval: number): void {
    this.clearBufferTimer();
    this.bufferTimer = window.setInterval(callback, interval);
  }

  clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  clearBufferTimer(): void {
    if (this.bufferTimer !== null) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = null;
    }
  }

  clearAll(): void {
    this.clearTimer();
    this.clearBufferTimer();
  }

  isTimerActive(): boolean {
    return this.timer !== null;
  }
}

// ============================================================================
// Main Composable
// ============================================================================
export function usePomodoroLearning() {
  const timerManager = new TimerManager();

  const processedContent = shallowRef<ProcessedContent | null>(null);

  const isActive = ref(false);
  const state = ref<LearningState>({ status: "idle" });
  const currentRound = ref<LearningRound>(1);
  const article = ref<WikiSummary | null>(null);
  const notes = ref<Record<string, string>>({});
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const completedRounds = ref(0);

  // ==========================================================================
  // Computed Properties
  // ==========================================================================
  const currentPhase = computed<LearningPhase | null>(() => {
    if (currentRound.value === "final") return null;
    const round = currentRound.value;
    if (round !== 1 && round !== 2) return null;
    return POMODORO_CONFIG[round] ?? null;
  });

  const isBuffering = computed(() => state.value.status === "buffer");
  const isReading = computed(() => state.value.status === "reading");
  const isReflecting = computed(() => state.value.status === "reflecting");
  const isPostStudy = computed(() => state.value.status === "post-study");
  const isPaused = computed(() => state.value.status === "paused");

  const timeRemaining = computed(() => {
    switch (state.value.status) {
      case "reading":
      case "reflecting":
      case "paused":
        return state.value.timeRemaining;
      default:
        return 0;
    }
  });

  const bufferCountdown = computed(() => {
    return state.value.status === "buffer" ? state.value.countdown : 0;
  });

  const formattedTime = computed(() => formatTime(timeRemaining.value));

  // ==========================================================================
  // Helper Functions
  // ==========================================================================
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  async function fetchAndProcessArticle(
    title: string,
  ): Promise<ProcessedContent> {
    const html = await fetchArticleHTML(title);
    return processArticleHTML(html, title, () => {});
  }

  // ==========================================================================
  // State Transitions
  // ==========================================================================
  async function startBuffer(): Promise<void> {
    state.value = { status: "buffer", countdown: 3 };
    isLoading.value = true;
    error.value = null;

    if (article.value) {
      try {
        const content = await fetchAndProcessArticle(article.value.title);
        processedContent.value = content;
        isLoading.value = false;
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to load article";
        isLoading.value = false;
      }
    }

    timerManager.setBufferTimer(() => {
      if (state.value.status === "buffer" && state.value.countdown > 1) {
        const newCountdown = state.value.countdown - 1;
        state.value = { status: "buffer", countdown: newCountdown };
        if (newCountdown === 1) {
          playBell();
        }
      } else {
        timerManager.clearBufferTimer();
        if (!error.value && article.value) {
          startReading();
        }
      }
    }, 1000);
  }

  function startReading(): void {
    if (!article.value || !processedContent.value || !currentPhase.value)
      return;

    const phase = currentPhase.value;
    state.value = { status: "reading", timeRemaining: phase.readDuration };

    timerManager.setTimer(() => {
      if (state.value.status === "reading" && state.value.timeRemaining > 0) {
        state.value = {
          status: "reading",
          timeRemaining: state.value.timeRemaining - 1,
        };
      } else if (state.value.status === "reading") {
        timerManager.clearTimer();
        startReflecting();
      }
    }, 1000);
  }

  function startReflecting(): void {
    if (!currentPhase.value) return;

    const phase = currentPhase.value;
    state.value = {
      status: "reflecting",
      timeRemaining: phase.reflectDuration,
    };
    playBell();

    timerManager.setTimer(() => {
      if (
        state.value.status === "reflecting" &&
        state.value.timeRemaining > 0
      ) {
        state.value = {
          status: "reflecting",
          timeRemaining: state.value.timeRemaining - 1,
        };
      } else if (state.value.status === "reflecting") {
        timerManager.clearTimer();
        completedRounds.value++;
        nextRound();
      }
    }, 1000);
  }

  function togglePause(): void {
    if (state.value.status === "paused") {
      // Resume
      const prev = state.value.previousState;
      const time = state.value.timeRemaining;
      state.value = { status: prev, timeRemaining: time };
      playBell();

      timerManager.setTimer(() => {
        if (
          (state.value.status === "reading" ||
            state.value.status === "reflecting") &&
          state.value.timeRemaining > 0
        ) {
          state.value = {
            status: state.value.status,
            timeRemaining: state.value.timeRemaining - 1,
          };
        } else if (state.value.status === "reading") {
          timerManager.clearTimer();
          startReflecting();
        } else if (state.value.status === "reflecting") {
          timerManager.clearTimer();
          completedRounds.value++;
          nextRound();
        }
      }, 1000);
    } else if (
      state.value.status === "reading" ||
      state.value.status === "reflecting"
    ) {
      // Pause
      const prev = state.value.status;
      const time = state.value.timeRemaining;
      state.value = {
        status: "paused",
        previousState: prev,
        timeRemaining: time,
      };
      timerManager.clearTimer();
      playBell();
    }
  }

  function skipPhase(): void {
    if (state.value.status === "reading") {
      timerManager.clearTimer();
      startReflecting();
    } else if (state.value.status === "reflecting") {
      timerManager.clearTimer();
      completedRounds.value++;
      nextRound();
    }
  }

  function addTime(): void {
    if (
      state.value.status === "reading" ||
      state.value.status === "reflecting"
    ) {
      state.value = {
        status: state.value.status,
        timeRemaining: state.value.timeRemaining + 60,
      };
    }
  }

  function nextRound(): void {
    if (currentRound.value === 1) {
      currentRound.value = 2;
      isLoading.value = true;
      startBuffer();
    } else {
      completeSession();
    }
  }

  function completeSession(): void {
    state.value = { status: "post-study" };
    isActive.value = true;
    playBell();
  }

  function startSession(newArticle: WikiSummary): void {
    if (article.value) {
      cancelRequest(`html-${article.value.title}`);
    }

    isActive.value = true;
    state.value = { status: "idle" };
    currentRound.value = 1;
    article.value = newArticle;
    notes.value = {};
    processedContent.value = null;
    isLoading.value = true;
    error.value = null;
    completedRounds.value = 0;

    startBuffer();
  }

  function endSession(): void {
    if (article.value) {
      cancelRequest(`html-${article.value.title}`);
    }
    timerManager.clearAll();
    isActive.value = false;
    state.value = { status: "idle" };
    article.value = null;
  }

  function updateNotes(text: string): void {
    const round = currentRound.value;
    if (round === "final") return;
    notes.value = {
      ...notes.value,
      [`round-${round}`]: text,
    };
  }

  function exportNotes(): string {
    if (!article.value) return "";

    const { title, content_urls } = article.value;
    const url = content_urls?.desktop?.page || "";
    const date = new Date().toISOString().split("T")[0];
    const round1Notes = notes.value["round-1"] || "";
    const round2Notes = notes.value["round-2"] || "";

    return `# ${title} - Learning Notes
## Session Overview
- **Source**: [${title}](${url})
- **Date**: ${date}
- **Method**: Active Recall Pomodoro (2 rounds + free review)
- **Rounds Completed**: ${completedRounds.value}
---
## Round 1: Initial Read (1 min)
> ${POMODORO_CONFIG[1].prompts.join("\n> ")}
${round1Notes || "_No notes taken._"}
---
## Round 2: Deep Read (5 min)
> ${POMODORO_CONFIG[2].prompts.join("\n> ")}
${round2Notes || "_No notes taken._"}
---
## Key Takeaways
- [ ]
## Questions for Further Research
- [ ]
## Connections to Prior Knowledge
- [ ]
`;
  }

  async function copyNotesToClipboard(): Promise<void> {
    const text = exportNotes();
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    throw new Error("Clipboard API not available");
  }

  onUnmounted(() => {
    timerManager.clearAll();
    if (article.value) {
      cancelRequest(`html-${article.value.title}`);
    }
  });

  // ==========================================================================
  // Public API with explicit return type
  // ==========================================================================
  return {
    // State
    isActive,
    state,
    currentRound,
    article,
    notes,
    processedContent,
    isLoading,
    error,
    completedRounds,

    // Computed
    currentPhase,
    isBuffering,
    isReading,
    isReflecting,
    isPostStudy,
    isPaused,
    timeRemaining,
    bufferCountdown,
    formattedTime,

    // Actions
    startSession,
    endSession,
    togglePause,
    skipPhase,
    addTime,
    updateNotes,
    exportNotes,
    copyNotesToClipboard,
    formatTime,
  } as const;
}
