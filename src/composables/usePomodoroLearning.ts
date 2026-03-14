import { ref, computed, onUnmounted } from "vue";
import type { WikiSummary } from "@/types/wiki";
import { fetchArticleHTML } from "./useWikiApi";
import { processArticleHTML } from "./useArticleProcessor";

// Use Vite's asset URL handling
const bellSoundUrl = new URL("../assets/sounds/bell.mp3", import.meta.url).href;

// Preload audio
const bellSound = new Audio(bellSoundUrl);
bellSound.load();

const playBell = () => {
  try {
    // Clone to allow overlapping sounds if needed
    const audio = bellSound.cloneNode() as HTMLAudioElement;
    audio.volume = 0.5;
    audio.play().catch((e) => console.log("Audio playback failed:", e));
  } catch (e) {
    console.log("Audio not supported");
  }
};

export type LearningState =
  | "idle"
  | "buffer"
  | "reading"
  | "reflecting"
  | "post-study"
  | "paused";

export interface LearningPhase {
  round: 1 | 2 | "final";
  readDuration: number; // seconds
  reflectDuration: number; // seconds
  description: string;
  prompts: string[];
}

const LEARNING_CONFIG: Record<number, LearningPhase> = {
  1: {
    round: 1,
    readDuration: 60,
    reflectDuration: 120,
    description: "Initial Read & Reflection",
    prompts: [
      "What was the most surprising fact you learned?",
      "What questions do you have after this read?",
      "How does this connect to what you already know?",
    ],
  },
  2: {
    round: 2,
    readDuration: 300,
    reflectDuration: 120,
    description: "Deep Read & Synthesis",
    prompts: [
      "What new connections did you make on this read?",
      "What will you remember from this article?",
      "How might you apply or share this knowledge?",
    ],
  },
};

export interface ProcessedContent {
  html: string;
  toc: Array<{ id: string; title: string; level: number }>;
}

export interface LearningSession {
  isActive: boolean;
  state: LearningState;
  currentRound: 1 | 2 | "final";
  timeRemaining: number;
  bufferCountdown: number;
  article: WikiSummary | null;
  notes: Record<string, string>;
  processedContent: ProcessedContent | null;
  isLoading: boolean;
  error: string | null;
  completedRounds: number;
  pausedTimeRemaining: number;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function usePomodoroLearning() {
  const timer = ref<number | null>(null);
  const bufferTimer = ref<number | null>(null);

  const session = ref<LearningSession>({
    isActive: false,
    state: "idle",
    currentRound: 1,
    timeRemaining: 0,
    bufferCountdown: 3,
    article: null,
    notes: {},
    processedContent: null,
    isLoading: false,
    error: null,
    completedRounds: 0,
    pausedTimeRemaining: 0,
  });

  const currentPhase = computed(() =>
    session.value.currentRound !== "final"
      ? LEARNING_CONFIG[session.value.currentRound]
      : null,
  );

  const isBuffering = computed(() => session.value.state === "buffer");
  const isReading = computed(() => session.value.state === "reading");
  const isReflecting = computed(() => session.value.state === "reflecting");
  const isPostStudy = computed(() => session.value.state === "post-study");
  const isPaused = computed(() => session.value.state === "paused");
  const formattedTime = computed(() => formatTime(session.value.timeRemaining));

  async function fetchAndProcessArticle(
    title: string,
  ): Promise<ProcessedContent> {
    const html = await fetchArticleHTML(title);
    return processArticleHTML(html, title, () => {});
  }

  async function startBuffer() {
    session.value.state = "buffer";
    session.value.bufferCountdown = 3;
    session.value.isLoading = true;
    session.value.error = null;

    // Fetch and process article DURING the 3-second buffer
    if (session.value.article) {
      try {
        const content = await fetchAndProcessArticle(
          session.value.article.title,
        );
        session.value.processedContent = content;
        session.value.isLoading = false;
      } catch (err) {
        session.value.error =
          err instanceof Error ? err.message : "Failed to load article";
        session.value.isLoading = false;
      }
    }

    // Start buffer countdown
    bufferTimer.value = window.setInterval(() => {
      if (session.value.bufferCountdown > 1) {
        session.value.bufferCountdown--;
      } else {
        if (bufferTimer.value) clearInterval(bufferTimer.value);
        // Start reading only if content loaded successfully
        if (!session.value.error) {
          startReading();
        }
      }
    }, 1000);
  }

  function startReading() {
    if (!session.value.article || !session.value.processedContent) return;

    const phase = currentPhase.value;
    if (!phase) return;

    session.value.state = "reading";
    session.value.timeRemaining = phase.readDuration;

    // Bell at start of reading phase
    playBell();

    // Start reading timer
    timer.value = window.setInterval(() => {
      if (session.value.timeRemaining > 0) {
        session.value.timeRemaining--;
      } else {
        // Reading time complete
        if (timer.value) clearInterval(timer.value);
        startReflecting();
      }
    }, 1000);
  }

  function startReflecting() {
    const phase = currentPhase.value;
    if (!phase) return;

    session.value.state = "reflecting";
    session.value.timeRemaining = phase.reflectDuration;

    // Bell at start of reflection phase
    playBell();

    // Start reflection timer
    timer.value = window.setInterval(() => {
      if (session.value.timeRemaining > 0) {
        session.value.timeRemaining--;
      } else {
        // Reflection complete
        if (timer.value) clearInterval(timer.value);
        session.value.completedRounds++;
        nextRound();
      }
    }, 1000);
  }

  function togglePause() {
    if (session.value.state === "paused") {
      // Resume
      session.value.state = isReading.value ? "reading" : "reflecting";
      session.value.timeRemaining = session.value.pausedTimeRemaining;

      // Resume timer
      timer.value = window.setInterval(() => {
        if (session.value.timeRemaining > 0) {
          session.value.timeRemaining--;
        } else {
          if (timer.value) clearInterval(timer.value);
          if (isReading.value) {
            startReflecting();
          } else {
            session.value.completedRounds++;
            nextRound();
          }
        }
      }, 1000);

      // Single bell on resume
      playBell();
    } else if (
      session.value.state === "reading" ||
      session.value.state === "reflecting"
    ) {
      // Pause
      session.value.pausedTimeRemaining = session.value.timeRemaining;
      session.value.state = "paused";
      if (timer.value) {
        clearInterval(timer.value);
        timer.value = null;
      }
      // Single bell on pause
      playBell();
    }
  }

  function skipPhase() {
    if (session.value.state === "reading") {
      if (timer.value) clearInterval(timer.value);
      startReflecting();
    } else if (session.value.state === "reflecting") {
      if (timer.value) clearInterval(timer.value);
      session.value.completedRounds++;
      nextRound();
    }
    // No bell for skip – silent
  }

  function addTime() {
    if (
      session.value.state === "reading" ||
      session.value.state === "reflecting"
    ) {
      session.value.timeRemaining += 60; // Add 1 minute
      // Optional: silent, or keep a subtle bell? Removing for now.
    }
  }

  function nextRound() {
    if (session.value.currentRound === 1) {
      // Move to Round 2 with same article - re-fetch content
      session.value.currentRound = 2;
      session.value.isLoading = true;
      startBuffer(); // 3s buffer before Round 2 read
    } else {
      // Round 2 complete - unlock for free reading
      completeSession();
    }
  }

  function completeSession() {
    session.value.state = "post-study";
    session.value.isActive = true; // Still active but unlocked
    // Single bell to indicate session complete
    playBell();
  }

  function startSession(article: WikiSummary) {
    // Reset session
    session.value = {
      isActive: true,
      state: "idle",
      currentRound: 1,
      timeRemaining: 0,
      bufferCountdown: 3,
      article,
      notes: {},
      processedContent: null,
      isLoading: true,
      error: null,
      completedRounds: 0,
      pausedTimeRemaining: 0,
    };

    // Start the 3-second buffer (which fetches content)
    startBuffer();
  }

  function endSession() {
    // Clear all timers
    if (timer.value) clearInterval(timer.value);
    if (bufferTimer.value) clearInterval(bufferTimer.value);

    session.value.isActive = false;
    session.value.state = "idle";
  }

  function updateNotes(text: string) {
    const round = session.value.currentRound;
    if (round === "final") return;

    session.value.notes = {
      ...session.value.notes,
      [`round-${round}`]: text,
    };
  }

  function getNotesForRound(round: 1 | 2): string {
    return session.value.notes[`round-${round}`] || "";
  }

  function exportNotes(): string {
    if (!session.value.article) return "";

    const { title, content_urls } = session.value.article;
    const url = content_urls?.desktop?.page || "";
    const date = new Date().toISOString().split("T")[0];

    const round1Notes = getNotesForRound(1);
    const round2Notes = getNotesForRound(2);

    return `# ${title} - Learning Notes

## Session Overview
- **Source**: [${title}](${url})
- **Date**: ${date}
- **Method**: Active Recall Pomodoro (2 rounds + free review)
- **Rounds Completed**: ${session.value.completedRounds}

---

## Round 1: Initial Read (1 min)
> ${LEARNING_CONFIG[1].prompts.join("\n> ")}

${round1Notes || "_No notes taken._"}

---

## Round 2: Deep Read (5 min)
> ${LEARNING_CONFIG[2].prompts.join("\n> ")}

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

  function copyNotesToClipboard(): Promise<void> {
    const text = exportNotes();
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error("Clipboard API not available"));
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (timer.value) clearInterval(timer.value);
    if (bufferTimer.value) clearInterval(bufferTimer.value);
  });

  return {
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
    getNotesForRound,
    exportNotes,
    copyNotesToClipboard,
    formatTime,
    togglePause,
    skipPhase,
    addTime,
  };
}
