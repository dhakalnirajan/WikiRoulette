import type { WikiSummary } from "@/types/wiki";

// FIXED: Removed trailing spaces from all URL constants
const BASE = "https://en.wikipedia.org/api/rest_v1";
const API = "https://en.wikipedia.org/w/api.php";

/**
 * Fetch a random article summary from the Wikipedia REST API
 */
export async function fetchRandomSummary(): Promise<WikiSummary> {
  const res = await fetch(`${BASE}/page/random/summary`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Random summary failed: ${res.status}`);
  return res.json() as Promise<WikiSummary>;
}

/**
 * Fetch summary for a specific article title
 */
export async function fetchSummaryByTitle(title: string): Promise<WikiSummary> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${BASE}/page/summary/${slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`);
  return res.json() as Promise<WikiSummary>;
}

/**
 * Fetch full parsed article HTML via the Wikipedia Parsoid REST API
 */
export async function fetchArticleHTML(title: string): Promise<string> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${BASE}/page/html/${slug}`, {
    headers: {
      Accept:
        'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.8.0"',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch full article: ${res.status}`);
  return res.text();
}

/**
 * Fetch article sections/outline using the MediaWiki Action API
 */
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
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`Sections fetch failed: ${res.status}`);
  const data = await res.json();
  return data?.parse?.sections ?? [];
}

/**
 * Resolve a relative Wikipedia URL to an article title
 */
export function hrefToTitle(href: string): string | null {
  if (href.startsWith("./"))
    return decodeURIComponent(href.slice(2).split("#")[0]).replace(/_/g, " ");
  if (href.startsWith("/wiki/"))
    return decodeURIComponent(href.slice(6).split("#")[0]).replace(/_/g, " ");
  return null;
}

/**
 * Fix relative image URLs to absolute Wikipedia URLs
 */
export function fixImageSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) return "https://en.wikipedia.org" + src;
  return src;
}

/**
 * Convert processed article HTML to Markdown format suitable for Obsidian
 */
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
