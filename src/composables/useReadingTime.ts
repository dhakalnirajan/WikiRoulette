import { computed, type ComputedRef } from "vue";

/**
 * Estimates reading time based on average reading speed (200 words per minute).
 */
export function useReadingTime(text: ComputedRef<string> | string) {
  const getText = () => (typeof text === "string" ? text : text.value);

  const wordCount = computed(() => {
    const txt = getText();
    if (!txt) return 0;
    // Strip HTML tags if present
    const stripped = txt.replace(/<[^>]*>/g, "");
    // Count words (any sequence of letters/numbers/apostrophes)
    const matches = stripped.match(/[\w\u00C0-\u024F\u0400-\u04FF]+/g);
    return matches ? matches.length : 0;
  });

  const readingTimeMinutes = computed(() => {
    const words = wordCount.value;
    if (words === 0) return 0;
    return Math.ceil(words / 200);
  });

  const readingTimeDisplay = computed(() => {
    const minutes = readingTimeMinutes.value;
    if (minutes === 0) return "0 min read";
    return `${minutes} min read`;
  });

  return {
    wordCount,
    readingTimeMinutes,
    readingTimeDisplay,
  };
}
