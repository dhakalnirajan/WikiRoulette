import { ref, shallowRef } from "vue";

export interface ArticleFact {
  text: string;
  source: string;
}

export function useArticleFacts() {
  const facts = shallowRef<ArticleFact[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function extractFacts(html: string): ArticleFact[] {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const paragraphs = doc.querySelectorAll("p");

    const facts: ArticleFact[] = [];

    for (const p of paragraphs) {
      const text = p.textContent?.trim() || "";
      if (text.length < 50) continue;

      const sentences = text.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (sentence.length > 30 && sentence.length < 180) {
          facts.push({ text: sentence, source: p.innerHTML });
          if (facts.length >= 10) break;
        }
      }
      if (facts.length >= 10) break;
    }

    return facts;
  }

  function refresh(html: string) {
    loading.value = true;
    error.value = null;
    try {
      facts.value = extractFacts(html);
    } catch (err) {
      console.error("Fact extraction error:", err);
      error.value = "Could not extract facts from this article.";
    } finally {
      loading.value = false;
    }
  }

  return {
    facts,
    loading,
    error,
    refresh,
  };
}
