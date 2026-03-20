import { fixImageSrc, hrefToTitle } from "@/composables/useWikiApi";
import type { TocItem, ProcessedContent } from "@/types/wiki";

const REMOVE_SELECTORS = [
  "script",
  "style",
  "link",
  "meta",
  ".mw-editsection",
  ".mw-jump-link",
  "#toc",
  ".toc",
  ".navbox",
  ".navbox-styles",
  "table.ambox",
  "table.tmbox",
  "table.ombox",
  "table.fmbox",
  "table.cmbox",
  "table.metadata",
  ".portalbox",
  ".sistersitebox",
  ".catlinks",
  ".noprint",
  ".mbox",
  ".mbox-small",
  ".mw-references-wrap",
  '[typeof="mw:Extension/references"]',
  '[typeof="mw:Extension/ref"]',
  ".reflist",
  ".references",
  '[id^="coordinates"]',
  ".magnify",
  ".navbar",
  ".plainlinks.hlist",
];

export function processArticleHTML(
  rawHtml: string,
  _title: string,
  _onWikiLinkClick: (articleTitle: string) => void,
): ProcessedContent {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const body = doc.body || doc.documentElement;

  // Remove clutter
  REMOVE_SELECTORS.forEach((sel) => {
    try {
      body.querySelectorAll(sel).forEach((el) => el.remove());
    } catch (_) {}
  });

  // Fix images
  body.querySelectorAll("img").forEach((img) => {
    let src = img.getAttribute("src") || "";
    src = fixImageSrc(src);
    img.setAttribute("src", src);
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");

    const srcset = img.getAttribute("srcset");
    if (srcset) {
      const fixedSrcset = srcset
        .split(",")
        .map((part) => {
          const [url, descriptor] = part.trim().split(" ");
          return `${fixImageSrc(url)} ${descriptor || ""}`.trim();
        })
        .join(", ");
      img.setAttribute("srcset", fixedSrcset);
    }

    const w = parseInt(img.getAttribute("width") || "999");
    if (w < 22) {
      img.closest("figure, .thumb, span")?.remove() ?? img.remove();
    }
  });

  // Fix links
  body.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return;

    const wikiTitle = hrefToTitle(href);
    if (wikiTitle) {
      if (
        /^(Special:|File:|Category:|Help:|Wikipedia:|Template:|Portal:|Talk:)/i.test(
          wikiTitle,
        )
      ) {
        a.removeAttribute("href");
        a.setAttribute("style", "cursor:default;color:inherit;border:none;");
        return;
      }
      a.removeAttribute("href");
      a.setAttribute("data-wiki", wikiTitle);
      a.setAttribute("role", "button");
      a.setAttribute("tabindex", "0");
    } else if (/^https?:/.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } else {
      a.removeAttribute("href");
    }
  });

  // Extract content – fallback to body if .mw-parser-output missing
  let mainContent = body.querySelector(".mw-parser-output");
  if (!mainContent) {
    console.debug("Missing .mw-parser-output; falling back to body.");
    mainContent = body;
  }

  mainContent.querySelectorAll("h1").forEach((h) => h.remove());

  // Build TOC
  const toc: TocItem[] = [];
  const headings = mainContent.querySelectorAll<HTMLElement>("h2, h3, h4");
  headings.forEach((h, i) => {
    const id = `wiki-heading-${i}`;
    h.id = id;
    const rawText =
      h.textContent
        ?.trim()
        .replace(/\[edit\]/gi, "")
        .replace(/\s+/g, " ") || "";
    if (!rawText || rawText.length < 2) return;
    toc.push({ id, title: rawText, level: parseInt(h.tagName[1]) });
  });

  return { html: mainContent.innerHTML, toc };
}
