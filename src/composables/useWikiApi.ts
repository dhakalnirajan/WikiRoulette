import type { WikiSummary } from "@/types/wiki";

// Wikipedia REST API Base URLs (NO trailing spaces)
const BASE_REST = "https://en.wikipedia.org/api/rest_v1";
const BASE_ACTION = "https://en.wikipedia.org/w/api.php";

// ============================================================================
// SUMMARY & ARTICLE FETCHING (REST API - Primary)
// ============================================================================

export async function fetchRandomSummary(): Promise<WikiSummary> {
  const res = await fetch(`${BASE_REST}/page/random/summary`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Random summary failed: ${res.status}`);
  return res.json() as Promise<WikiSummary>;
}

export async function fetchSummaryByTitle(title: string): Promise<WikiSummary> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${BASE_REST}/page/summary/${slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`);
  return res.json() as Promise<WikiSummary>;
}

export async function fetchArticleHTML(title: string): Promise<string> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${BASE_REST}/page/html/${slug}`, {
    headers: {
      Accept:
        'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.8.0"',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch full article: ${res.status}`);
  return res.text();
}

export async function fetchMobileArticleHTML(title: string): Promise<string> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${BASE_REST}/page/mobile-html/${slug}`, {
    headers: {
      Accept:
        'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/Mobile-HTML/1.0.0"',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch mobile article: ${res.status}`);
  return res.text();
}

// ============================================================================
// MEDIA & REFERENCES (Action API - Supplemental)
// ============================================================================

/**
 * Fetch list of all media files used in an article
 * NOTE: This endpoint returns 404 for many articles - handle gracefully
 */
export async function fetchArticleMedia(title: string): Promise<
  Array<{
    title: string;
    section_id: number;
    srcset?: string;
    thumbnail?: {
      source: string;
      width: number;
      height: number;
    };
  }>
> {
  // Clean title: remove section anchors (#Section) or fragment identifiers (:1)
  const cleanTitle = title.split("#")[0].split(":")[0].trim();
  const slug = encodeURIComponent(cleanTitle.replace(/ /g, "_"));

  try {
    const res = await fetch(`${BASE_REST}/page/media-list/${slug}`);

    // Handle 404 gracefully - not all articles have media lists
    if (res.status === 404) {
      return [];
    }

    if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);

    const data = await res.json();
    return data.items ?? [];
  } catch (error) {
    // Silently fail - media is optional enrichment
    console.warn(`Media fetch failed for "${title}":`, error);
    return [];
  }
}

export async function fetchArticleReferences(title: string): Promise<
  Array<{
    id: string;
    content: string;
    backlinks: string[];
  }>
> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "references",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${BASE_ACTION}?${params}`);
  if (!res.ok) throw new Error(`References fetch failed: ${res.status}`);
  const data = await res.json();
  return (
    data?.parse?.references?.map((ref: any, i: number) => ({
      id: `ref-${i}`,
      content: ref.content?.["*"] || "",
      backlinks: ref.backlinks || [],
    })) ?? []
  );
}

export async function fetchArticleSections(
  title: string,
): Promise<
  Array<{ line: string; number: string; anchor: string; level: string }>
> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "sections",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${BASE_ACTION}?${params}`);
  if (!res.ok) throw new Error(`Sections fetch failed: ${res.status}`);
  const data = await res.json();
  return data?.parse?.sections ?? [];
}

// ============================================================================
// UTILITIES - FIXED
// ============================================================================

export function hrefToTitle(href: string): string | null {
  if (href.startsWith("./"))
    return decodeURIComponent(href.slice(2).split("#")[0]).replace(/_/g, " ");
  if (href.startsWith("/wiki/"))
    return decodeURIComponent(href.slice(6).split("#")[0]).replace(/_/g, " ");
  return null;
}

/**
 * Fix relative image URLs to absolute Wikipedia URLs
 * FIXED: Prevent double https:// by checking if URL already has protocol
 */
/**
 * Fix relative/malformed image URLs to absolute Wikipedia URLs
 * Handles: protocol-relative, root-relative, AND malformed protocols
 */
export function fixImageSrc(src: string): string {
  if (!src) return src;

  // Already absolute with proper protocol - return as-is
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Fix MALFORMED protocol (e.g., "https//example.com" → "https://example.com")
  if (src.startsWith("https//")) {
    return "https://" + src.slice(7);
  }
  if (src.startsWith("http//")) {
    return "http://" + src.slice(6);
  }

  // Protocol-relative URL (//example.com) - add https:
  if (src.startsWith("//")) {
    return "https:" + src;
  }

  // Root-relative URL (/path/to/image) - prepend Wikipedia domain
  if (src.startsWith("/")) {
    return "https://en.wikipedia.org" + src;
  }

  // Already absolute or unknown format - return as-is
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
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match, content) => {
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

`;

  return frontmatter + md;
}
