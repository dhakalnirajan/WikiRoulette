// API Endpoints
export const API_BASE_REST = "https://en.wikipedia.org/api/rest_v1";
export const API_BASE_ACTION = "https://en.wikipedia.org/w/api.php";

// Request Settings
export const REQUEST_TIMEOUT = 10000; // 10 seconds
export const MAX_RETRIES = 2;
export const RANDOM_RETRY_DELAY = 800; // ms between random fetch retries

// Cache
export const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// History
export const MAX_HISTORY_ENTRIES = 100;

// Pomodoro Timings (seconds)
export interface LearningPhase {
  round: number;
  readDuration: number;
  reflectDuration: number;
  description: string;
  prompts: string[];
}

export const POMODORO_CONFIG: Record<1 | 2, LearningPhase> = {
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

// Guide
export const GUIDE_VERSION = 1;
export const GUIDE_SEEN_KEY = "wikiroulette:guideSeen";

// Storage keys
export const STORAGE_KEYS = {
  BOOKMARKS: "wikiroulette:bookmarks",
  GUIDE_SEEN: "wikiroulette:guideSeen",
  GUIDE_VERSION: "wikiroulette:guideVersion",
  POMODORO_SESSION: "wikiroulette:pomodoroSession",
} as const;

// Recommendations
export const RECOMMENDATIONS_CACHE_KEY = "wikiroulette:recommendations";
export const RECOMMENDATIONS_CACHE_TTL = 1000 * 60 * 60; // 1 hour
export const RECOMMENDATIONS_DEFAULT_LIMIT = 3;
