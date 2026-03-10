// Wikipedia REST API types

export interface WikiSummary {
  type: string
  title: string
  displaytitle: string
  namespace: { id: number; text: string }
  wikibase_item: string
  titles: {
    canonical: string
    normalized: string
    display: string
  }
  pageid: number
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  originalimage?: {
    source: string
    width: number
    height: number
  }
  lang: string
  dir: string
  revision: string
  tid: string
  timestamp: string
  description?: string
  description_source?: string
  content_urls: {
    desktop: { page: string; revisions: string; edit: string; talk: string }
    mobile: { page: string; revisions: string; edit: string; talk: string }
  }
  extract: string
  extract_html: string
}

export interface WikiSection {
  id: number
  title: string
  anchor: string
  level: number
}

export interface HistoryEntry {
  summary: WikiSummary
  scrollY?: number
}

export type ViewMode = 'home' | 'reader'

export interface TocItem {
  id: string
  title: string
  level: number
  element?: HTMLElement
}
