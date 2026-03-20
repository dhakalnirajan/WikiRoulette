import { ref, computed, readonly } from "vue";
import type { WikiSummary, HistoryEntry } from "@/types/wiki";
import { MAX_HISTORY_ENTRIES } from "@/config";

// Module-scope state (singleton)
const stack = ref<HistoryEntry[]>([]);
const index = ref(-1);

export function useHistory() {
  const canGoBack = computed(() => index.value > 0);
  const canGoForward = computed(() => index.value < stack.value.length - 1);

  const current = computed<HistoryEntry | null>(() =>
    index.value >= 0 ? stack.value[index.value] : null,
  );

  const totalCount = computed(() => stack.value.length);
  const recent = computed(() => stack.value.slice(-5).reverse());

  function push(summary: WikiSummary): void {
    // Trim forward history if needed
    if (index.value < stack.value.length - 1) {
      stack.value.splice(index.value + 1);
    }

    stack.value.push({ summary });
    index.value = stack.value.length - 1;

    // Enforce history size limit
    if (stack.value.length > MAX_HISTORY_ENTRIES) {
      const excess = stack.value.length - MAX_HISTORY_ENTRIES;
      stack.value.splice(0, excess);
      index.value = stack.value.length - 1;
    }
  }

  function goBack(): HistoryEntry | null {
    if (!canGoBack.value) return null;
    index.value--;
    return stack.value[index.value];
  }

  function goForward(): HistoryEntry | null {
    if (!canGoForward.value) return null;
    index.value++;
    return stack.value[index.value];
  }

  function clear(): void {
    stack.value = [];
    index.value = -1;
  }

  return {
    current: readonly(current),
    canGoBack: readonly(canGoBack),
    canGoForward: readonly(canGoForward),
    totalCount: readonly(totalCount),
    recent: readonly(recent),
    push,
    goBack,
    goForward,
    clear,
  };
}
