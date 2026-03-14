import type { WikiSummary } from "@/types/wiki";

// ============================================================================
// Configuration & Constants
// ============================================================================

const BASE_REST = "https://en.wikipedia.org/api/rest_v1";
const BASE_ACTION = "https://en.wikipedia.org/w/api.php";
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const cache = new Map<string, CacheEntry<any>>();

// ============================================================================
// Custom Error Types
// ============================================================================

export class WikiApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "WikiApiError";
    this.status = status;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCacheKey(endpoint: string, params?: any): string {
  return `${endpoint}-${JSON.stringify(params || {})}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new WikiApiError(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error as Error;
      if (i === retries) break;
      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, i)),
      );
    }
  }
  throw lastError;
}

function encodeTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

// ============================================================================
// Public API Functions
// ============================================================================

export async function fetchRandomSummary(): Promise<WikiSummary> {
  const url = `${BASE_REST}/page/random/summary`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new WikiApiError(
        `Random summary failed: ${res.status}`,
        res.status,
      );
    }
    const data = await res.json();
    return data;
  } catch (error) {
    if (error instanceof WikiApiError) throw error;
    throw new WikiApiError(`Network error: ${error}`);
  }
}

export async function fetchSummaryByTitle(title: string): Promise<WikiSummary> {
  const cacheKey = getCacheKey("summary", { title });
  const cached = getCached<WikiSummary>(cacheKey);
  if (cached) return cached;

  const slug = encodeTitle(title);
  const url = `${BASE_REST}/page/summary/${slug}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      throw new WikiApiError(`Article "${title}" not found`, 404);
    }
    if (!res.ok) {
      throw new WikiApiError(`Summary fetch failed: ${res.status}`, res.status);
    }
    const data = await res.json();
    setCached(cacheKey, data);
    return data;
  } catch (error) {
    if (error instanceof WikiApiError) throw error;
    throw new WikiApiError(`Network error: ${error}`);
  }
}

export async function fetchArticleHTML(title: string): Promise<string> {
  const cacheKey = getCacheKey("html", { title });
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const slug = encodeTitle(title);
  const url = `${BASE_REST}/page/html/${slug}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: {
        Accept:
          'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.8.0"',
      },
    });
    if (res.status === 404) {
      throw new WikiApiError(`Article "${title}" not found`, 404);
    }
    if (!res.ok) {
      throw new WikiApiError(
        `Failed to fetch article: ${res.status}`,
        res.status,
      );
    }
    const html = await res.text();
    setCached(cacheKey, html);
    return html;
  } catch (error) {
    if (error instanceof WikiApiError) throw error;
    throw new WikiApiError(`Network error: ${error}`);
  }
}

export async function fetchMobileArticleHTML(title: string): Promise<string> {
  const cacheKey = getCacheKey("mobile-html", { title });
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const slug = encodeTitle(title);
  const url = `${BASE_REST}/page/mobile-html/${slug}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: {
        Accept:
          'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/Mobile-HTML/1.0.0"',
      },
    });
    if (res.status === 404) {
      throw new WikiApiError(`Article "${title}" not found`, 404);
    }
    if (!res.ok) {
      throw new WikiApiError(
        `Failed to fetch mobile article: ${res.status}`,
        res.status,
      );
    }
    const html = await res.text();
    setCached(cacheKey, html);
    return html;
  } catch (error) {
    if (error instanceof WikiApiError) throw error;
    throw new WikiApiError(`Network error: ${error}`);
  }
}

// ============================================================================
// Supplemental API Functions (Action API)
// ============================================================================

export async function fetchArticleMedia(title: string): Promise<
  Array<{
    title: string;
    section_id: number;
    srcset?: string;
    thumbnail?: { source: string; width: number; height: number };
  }>
> {
  const cacheKey = getCacheKey("media", { title });
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const cleanTitle = title.split("#")[0].split(":")[0].trim();
  const slug = encodeTitle(cleanTitle);
  const url = `${BASE_REST}/page/media-list/${slug}`;

  try {
    const res = await fetchWithRetry(url);
    if (res.status === 404) {
      // Not all articles have media lists; return empty array
      setCached(cacheKey, []);
      return [];
    }
    if (!res.ok) {
      throw new WikiApiError(`Media fetch failed: ${res.status}`, res.status);
    }
    const data = await res.json();
    const items = data.items ?? [];
    setCached(cacheKey, items);
    return items;
  } catch (error) {
    if (error instanceof WikiApiError) throw error;
    console.warn(`Media fetch failed for "${title}":`, error);
    return [];
  }
}

export async function fetchArticleReferences(
  title: string,
): Promise<Array<{ id: string; content: string; backlinks: string[] }>> {
  const cacheKey = getCacheKey("references", { title });
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "references",
    format: "json",
    origin: "*",
  });
  const url = `${BASE_ACTION}?${params}`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new WikiApiError(
        `References fetch failed: ${res.status}`,
        res.status,
      );
    }
    const data = await res.json();
    const refs =
      data?.parse?.references?.map((ref: any, i: number) => ({
        id: `ref-${i}`,
        content: ref.content?.["*"] || "",
        backlinks: ref.backlinks || [],
      })) ?? [];
    setCached(cacheKey, refs);
    return refs;
  } catch (error) {
    if (error instanceof WikiApiError) throw error;
    throw new WikiApiError(`Network error: ${error}`);
  }
}

export async function fetchArticleSections(
  title: string,
): Promise<
  Array<{ line: string; number: string; anchor: string; level: string }>
> {
  const cacheKey = getCacheKey("sections", { title });
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "sections",
    format: "json",
    origin: "*",
  });
  const url = `${BASE_ACTION}?${params}`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new WikiApiError(
        `Sections fetch failed: ${res.status}`,
        res.status,
      );
    }
    const data = await res.json();
    const sections = data?.parse?.sections ?? [];
    setCached(cacheKey, sections);
    return sections;
  } catch (error) {
    if (error instanceof WikiApiError) throw error;
    throw new WikiApiError(`Network error: ${error}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function hrefToTitle(href: string): string | null {
  if (href.startsWith("./"))
    return decodeURIComponent(href.slice(2).split("#")[0]).replace(/_/g, " ");
  if (href.startsWith("/wiki/"))
    return decodeURIComponent(href.slice(6).split("#")[0]).replace(/_/g, " ");
  return null;
}

/**
 * Fix relative/malformed image URLs to absolute Wikipedia URLs
 */
export function fixImageSrc(src: string): string {
  if (!src) return src;

  // Already absolute with proper protocol
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Fix malformed protocol (e.g., "https//example.com")
  if (src.startsWith("https//")) {
    return "https://" + src.slice(7);
  }
  if (src.startsWith("http//")) {
    return "http://" + src.slice(6);
  }

  // Protocol-relative URL (//example.com)
  if (src.startsWith("//")) {
    return "https:" + src;
  }

  // Root-relative URL (/path/to/image)
  if (src.startsWith("/")) {
    return "https://en.wikipedia.org" + src;
  }

  return src;
}

/**
 * Convert HTML to Obsidian-friendly Markdown (basic version)
 * Note: This is a simplified conversion; for production consider using a library like turndown.
 */
export function htmlToObsidianMarkdown(
  html: string,
  title: string,
  url: string,
): string {
  const date = new Date().toISOString().split("T")[0];

  // Basic replacements (this can be extended)
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, content) =>
      content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n"),
    )
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, content) => {
      let count = 1;
      return content.replace(
        /<li[^>]*>(.*?)<\/li>/gi,
        () => `${count++}. $1\n`,
      );
    })
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, "```\n$1\n```")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, "![$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)")
    .replace(/<[^>]+>/g, "");

  // Clean up excessive newlines
  md = md.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
source: ${url}
tags: [wikipedia, exported]
---

`;

  return frontmatter + md;
}
