import type { WikiSummary } from "@/types/wiki";
import {
  API_BASE_REST,
  API_BASE_ACTION,
  REQUEST_TIMEOUT,
  MAX_RETRIES,
  RANDOM_RETRY_DELAY,
  CACHE_TTL,
} from "@/config";

// ============================================================================
// Types & Errors
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
// Request Cancellation Manager
// ============================================================================
class RequestCancellationManager {
  private controllers = new Map<string, AbortController>();

  getOrCreate(key: string): AbortController {
    this.cancel(key);
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }

  cancel(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  cancelAll(): void {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }

  isActive(key: string): boolean {
    return this.controllers.has(key);
  }
}

const requestManager = new RequestCancellationManager();

export function cancelRequest(key: string): void {
  requestManager.cancel(key);
}

export function cancelAllRequests(): void {
  requestManager.cancelAll();
}

// ============================================================================
// Cache
// ============================================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCacheKey(
  endpoint: string,
  params?: Record<string, unknown>,
): string {
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

// ============================================================================
// Fetch Helpers with Retry and Timeout
// ============================================================================
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
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
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error; // Do not retry cancellations
      }
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
// Throttling for Random Requests (prevents rapid-fire API calls)
// ============================================================================
let lastRandomRequest = 0;
const RANDOM_THROTTLE_MS = 500; // minimum 500ms between random spins

async function throttleRandom(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRandomRequest;
  if (timeSinceLast < RANDOM_THROTTLE_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RANDOM_THROTTLE_MS - timeSinceLast),
    );
  }
  lastRandomRequest = Date.now();
}

// ============================================================================
// Public API Functions
// ============================================================================
export async function fetchRandomSummary(): Promise<WikiSummary> {
  await throttleRandom();

  const url = `${API_BASE_REST}/page/random/summary`;
  // Do NOT cache random endpoint

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

    const data = (await res.json()) as WikiSummary;
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
  const url = `${API_BASE_REST}/page/summary/${slug}`;
  const requestKey = `summary-${title}`;

  try {
    const controller = requestManager.getOrCreate(requestKey);

    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (res.status === 404) {
      throw new WikiApiError(`Article "${title}" not found`, 404);
    }

    if (!res.ok) {
      throw new WikiApiError(`Summary fetch failed: ${res.status}`, res.status);
    }

    const data = (await res.json()) as WikiSummary;
    setCached(cacheKey, data);
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new WikiApiError(`Request cancelled for "${title}"`);
    }
    if (error instanceof WikiApiError) throw error;
    throw new WikiApiError(`Network error: ${error}`);
  }
}

export async function fetchArticleHTML(title: string): Promise<string> {
  const cacheKey = getCacheKey("html", { title });
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const slug = encodeTitle(title);
  const url = `${API_BASE_REST}/page/html/${slug}`;
  const requestKey = `html-${title}`;

  try {
    const controller = requestManager.getOrCreate(requestKey);

    const res = await fetchWithRetry(url, {
      headers: {
        Accept:
          'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.8.0"',
      },
      signal: controller.signal,
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
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new WikiApiError(`Request cancelled for "${title}"`);
    }
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

export function fixImageSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("https//")) return "https://" + src.slice(7);
  if (src.startsWith("http//")) return "http://" + src.slice(6);
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) return "https://en.wikipedia.org" + src;
  return src;
}

export function htmlToObsidianMarkdown(
  html: string,
  title: string,
  url: string,
): string {
  const date = new Date().toISOString().split("T")[0];

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

  md = md.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
source: ${url}
tags: [wikipedia, exported]
---
\n`;

  return frontmatter + md;
}
