import { ref, shallowRef } from "vue";

export interface DidYouKnowItem {
  text: string;
  link: string;
  articleTitle: string;
}

const CACHE_KEY = "wikiroulette:didyouknow";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function useDidYouKnow() {
  const items = shallowRef<DidYouKnowItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchDidYouKnow(limit: number = 5): Promise<void> {
    const cached = getCached();
    if (cached) {
      items.value = cached.slice(0, limit);
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch the most recent DYK archive page (e.g., "Wikipedia:Recent additions/2026/March")
      // We'll use the current year and month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.toLocaleString("default", { month: "long" });
      const archivePage = `Wikipedia:Recent additions/${year}/${month}`;

      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(archivePage)}&format=json&origin=*&prop=text`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch Did You Know content");

      const data = await response.json();
      const html = data.parse?.text?.["*"] || "";

      const parsed = parseDidYouKnowItems(html);
      setCache(parsed);
      items.value = parsed.slice(0, limit);
    } catch (err) {
      console.error("DidYouKnow fetch error:", err);
      error.value = "Could not load facts. Please try again later.";
    } finally {
      loading.value = false;
    }
  }

  function parseDidYouKnowItems(html: string): DidYouKnowItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const container = doc.querySelector(".mw-parser-output");
    if (!container) return [];

    const items: DidYouKnowItem[] = [];

    // DYK hooks are usually in <dl> or <ul> inside the "Did you know" section
    // Look for list items that contain a link to an article and a description
    const lists = container.querySelectorAll("ul, dl");
    for (const list of lists) {
      const listItems = list.querySelectorAll("li, dd");
      for (const li of listItems) {
        const text = li.textContent?.trim() || "";
        if (!text) continue;

        // Extract the first internal link to an article
        const linkEl = li.querySelector('a[href^="/wiki/"]');
        let link = "";
        let articleTitle = "";
        if (linkEl) {
          link = linkEl.getAttribute("href") || "";
          articleTitle = decodeURIComponent(
            link.replace("/wiki/", "").replace(/_/g, " "),
          );
          link = `https://en.wikipedia.org${link}`;
        }

        // Skip very short or non-descriptive items
        if (text.length < 30) continue;

        // Clean the text: remove " ... that " prefix if present (common in DYK)
        let cleanText = text.replace(/^... that\s*/i, "");

        items.push({ text: cleanText, link, articleTitle });
        if (items.length >= 20) break;
      }
      if (items.length >= 20) break;
    }

    // Shuffle the items to get random facts each time
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }

  function getCached(): DidYouKnowItem[] | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          return data;
        }
      }
    } catch (e) {
      console.warn("Cache read failed", e);
    }
    return null;
  }

  function setCache(data: DidYouKnowItem[]): void {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (e) {
      console.warn("Cache write failed", e);
    }
  }

  async function refresh(limit: number = 5): Promise<void> {
    localStorage.removeItem(CACHE_KEY);
    await fetchDidYouKnow(limit);
  }

  return {
    items,
    loading,
    error,
    fetchDidYouKnow,
    refresh,
  };
}
