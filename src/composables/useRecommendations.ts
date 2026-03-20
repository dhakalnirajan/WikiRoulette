import { ref, shallowRef } from "vue";
import type { WikiSummary } from "@/types/wiki";
import { fetchSummaryByTitle } from "./useWikiApi";
import {
  RECOMMENDATIONS_CACHE_KEY,
  RECOMMENDATIONS_CACHE_TTL,
  RECOMMENDATIONS_DEFAULT_LIMIT,
} from "@/config";

export interface Recommendation {
  title: string;
  summary?: WikiSummary;
  url: string;
}

export function useRecommendations() {
  const recommendations = shallowRef<Recommendation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchRecommendations(
    articleTitle: string,
    limit: number = RECOMMENDATIONS_DEFAULT_LIMIT,
  ) {
    // Check cache first
    const cached = getCached(articleTitle);
    if (cached) {
      recommendations.value = cached.slice(0, limit);
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // 1. Get categories
      const categories = await fetchCategories(articleTitle);
      // 2. Get outgoing links
      const outgoing = await fetchLinks(articleTitle);
      // 3. Get incoming links
      const incoming = await fetchLinksHere(articleTitle);

      // Build candidate map with weights
      const candidates = new Map<string, number>();

      for (const title of outgoing) {
        candidates.set(title, (candidates.get(title) || 0) + 1);
      }
      for (const title of incoming) {
        candidates.set(title, (candidates.get(title) || 0) + 1);
      }
      for (const cat of categories) {
        const articles = await fetchRandomFromCategory(cat, 1);
        for (const title of articles) {
          candidates.set(title, (candidates.get(title) || 0) + 0.5);
        }
      }

      // Remove the current article
      candidates.delete(articleTitle);

      // Convert to array, sort by weight descending, take top limit * 2, then randomize
      const sorted = Array.from(candidates.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit * 2)
        .map(([title]) => title);

      // Shuffle
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }

      const recs: Recommendation[] = sorted.slice(0, limit).map((title) => ({
        title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      }));

      setCache(articleTitle, recs);
      recommendations.value = recs;
    } catch (err) {
      console.error("Recommendations error:", err);
      error.value = "Could not load recommendations.";
    } finally {
      loading.value = false;
    }
  }

  async function fetchCategories(title: string): Promise<string[]> {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=categories&titles=${encodeURIComponent(title)}&format=json&origin=*&cllimit=20`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    const page = Object.values(pages)[0] as any;
    const cats = page?.categories?.map((c: any) => c.title) || [];
    return cats.filter(
      (cat) =>
        !cat.includes("Hidden categories") &&
        !cat.includes("Articles with") &&
        !cat.includes("CS1 "),
    );
  }

  async function fetchLinks(title: string): Promise<string[]> {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=links&titles=${encodeURIComponent(title)}&format=json&origin=*&pllimit=50`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    const page = Object.values(pages)[0] as any;
    const links = page?.links?.map((l: any) => l.title) || [];
    return links.filter(
      (l: string) => !l.includes(":") && !l.startsWith("Talk:"),
    );
  }

  async function fetchLinksHere(title: string): Promise<string[]> {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=linkshere&titles=${encodeURIComponent(title)}&format=json&origin=*&lhlimit=50`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    const page = Object.values(pages)[0] as any;
    const linksHere = page?.linkshere?.map((l: any) => l.title) || [];
    return linksHere.filter(
      (l: string) => !l.includes(":") && !l.startsWith("Talk:"),
    );
  }

  async function fetchRandomFromCategory(
    category: string,
    limit: number = 1,
  ): Promise<string[]> {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=${limit}&rncategory=${encodeURIComponent(category)}&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const titles = data.query?.random?.map((item: any) => item.title) || [];
    return titles;
  }

  function getCached(articleTitle: string): Recommendation[] | null {
    try {
      const stored = localStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (
          Date.now() - timestamp < RECOMMENDATIONS_CACHE_TTL &&
          data[articleTitle]
        ) {
          return data[articleTitle];
        }
      }
    } catch (e) {
      console.warn("Cache read failed", e);
    }
    return null;
  }

  function setCache(articleTitle: string, recs: Recommendation[]): void {
    try {
      let cache: any = {};
      const stored = localStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
      if (stored) {
        cache = JSON.parse(stored).data || {};
      }
      cache[articleTitle] = recs;
      localStorage.setItem(
        RECOMMENDATIONS_CACHE_KEY,
        JSON.stringify({
          data: cache,
          timestamp: Date.now(),
        }),
      );
    } catch (e) {
      console.warn("Cache write failed", e);
    }
  }

  function refresh(
    articleTitle: string,
    limit: number = RECOMMENDATIONS_DEFAULT_LIMIT,
  ) {
    localStorage.removeItem(RECOMMENDATIONS_CACHE_KEY);
    fetchRecommendations(articleTitle, limit);
  }

  return {
    recommendations,
    loading,
    error,
    fetchRecommendations,
    refresh,
  };
}
