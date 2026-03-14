import { ref, computed } from "vue";
import type { WikiSummary } from "@/types/wiki";

export interface HistoryEntry {
  summary: WikiSummary;
}

const stack = ref<HistoryEntry[]>([]);
const index = ref(-1);

export function useHistory() {
  const canGoBack = computed(() => index.value > 0);
  const canGoForward = computed(() => index.value < stack.value.length - 1);
  const current = computed<HistoryEntry | null>(() =>
    index.value >= 0 ? stack.value[index.value] : null,
  );
  const totalCount = computed(() => stack.value.length);
  const recent = computed(() => stack.value.slice(-5).reverse()); // for sidebar

  function push(summary: WikiSummary) {
    // Trim forward history if user went back then pushed new
    if (index.value < stack.value.length - 1) {
      stack.value.splice(index.value + 1);
    }
    stack.value.push({ summary });
    index.value = stack.value.length - 1;
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

  return {
    stack,
    index,
    current,
    canGoBack,
    canGoForward,
    totalCount,
    recent,
    push,
    goBack,
    goForward,
  };
}
