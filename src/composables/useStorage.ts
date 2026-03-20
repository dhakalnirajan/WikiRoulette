import { ref, watch, onMounted, onUnmounted, type Ref } from "vue";
import { STORAGE_KEYS } from "@/config";
import type { LearningSession } from "./usePomodoroLearning";

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

interface StorageOptions<T> {
  key: StorageKey;
  defaultValue: T;
  parse?: (value: string) => T;
  stringify?: (value: T) => string;
  sync?: boolean;
}

export function useStorage<T>(options: StorageOptions<T>) {
  const {
    key,
    defaultValue,
    parse = JSON.parse,
    stringify = JSON.stringify,
    sync = false,
  } = options;

  const state = ref<T>(defaultValue) as Ref<T>;
  const isInitialized = ref(false);
  let storageEventHandler: ((e: StorageEvent) => void) | null = null;

  function load(): T {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return parse(item);
      }
    } catch (error) {
      console.warn(`Failed to load ${key}:`, error);
    }
    return defaultValue;
  }

  function save(value: T): void {
    try {
      const serialized = stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        console.error(`Storage quota exceeded for ${key}`);
      } else {
        console.warn(`Failed to save ${key}:`, error);
      }
    }
  }

  function handleStorageEvent(e: StorageEvent): void {
    if (e.key === key && e.newValue !== null) {
      try {
        state.value = parse(e.newValue);
      } catch (error) {
        console.warn(`Failed to parse storage event for ${key}:`, error);
      }
    }
  }

  onMounted(() => {
    state.value = load();
    isInitialized.value = true;

    if (sync) {
      storageEventHandler = handleStorageEvent;
      window.addEventListener("storage", storageEventHandler);
    }
  });

  onUnmounted(() => {
    if (storageEventHandler) {
      window.removeEventListener("storage", storageEventHandler);
    }
  });

  watch(
    state,
    (newValue) => {
      if (isInitialized.value) {
        save(newValue);
      }
    },
    { deep: true },
  );

  return {
    state,
    reload: () => {
      state.value = load();
    },
    flush: () => {
      save(state.value);
    },
    clear: () => {
      localStorage.removeItem(key);
      state.value = defaultValue;
    },
    isInitialized,
  };
}

// Specialized helpers
export const useBookmarksStorage = () =>
  useStorage<import("@/types/wiki").WikiSummary[]>({
    key: STORAGE_KEYS.BOOKMARKS,
    defaultValue: [],
    sync: true,
  });

export const useGuideStorage = () => {
  const seen = useStorage<boolean>({
    key: STORAGE_KEYS.GUIDE_SEEN,
    defaultValue: false,
  });
  const version = useStorage<number>({
    key: STORAGE_KEYS.GUIDE_VERSION,
    defaultValue: 1,
  });
  return { seen, version };
};

export const usePomodoroSessionStorage = () =>
  useStorage<Partial<LearningSession> | null>({
    key: STORAGE_KEYS.POMODORO_SESSION,
    defaultValue: null,
    sync: false,
  });
