# WikiRoulette

A beautiful Wikipedia random article explorer built with Vue 3 + TypeScript + Vite.

## Features

- 🎲 **Spin** through random Wikipedia articles
- 📖 **Full in-page reader** — complete article rendered beautifully, never leaving the app
- 🔗 **Clickable wiki links** — navigate between articles inside the reader
- 📋 **Table of contents** — sticky sidebar with active section highlighting
- ⬅️ **History navigation** — go back and forward through visited articles
- ⌨️ **Keyboard shortcuts** — `←` prev, `→`/`Space` next, `R` read, `Esc` back
- 🎨 **Dark editorial design** — Libre Baskerville serif, grain texture, amber accent

## Tech stack

- **Vue 3** with Composition API + `<script setup>`
- **TypeScript** throughout
- **Vite 5** dev server & bundler
- **Wikipedia REST API** — `/api/rest_v1/page/random/summary` for cards
- **Wikipedia Parsoid HTML API** — `/api/rest_v1/page/html/{title}` for full articles
- **MediaWiki Action API** — for article metadata

## Setup

```bash
# Install dependencies (Node 18+ or Bun)
npm install
# or: bun install

# Start dev server
npm run dev
# or: bun run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173)

## Project structure

```
src/
├── assets/
│   └── global.css          # Design tokens, wiki content styles
├── components/
│   ├── AppNav.vue           # Top navigation bar
│   ├── ArticleCard.vue      # Summary card on home view
│   ├── ArticleReader.vue    # Full article reader view
│   ├── HomeView.vue         # Explore/spin home view
│   ├── SkeletonCard.vue     # Loading state skeleton
│   ├── SpinControls.vue     # Prev / Spin / Next buttons
│   └── TocSidebar.vue       # Sticky table of contents
├── composables/
│   ├── useArticleProcessor.ts  # Clean & process Wikipedia HTML
│   ├── useHistory.ts           # Navigation history stack
│   └── useWikiApi.ts           # Wikipedia API fetch helpers
├── types/
│   └── wiki.ts              # TypeScript types for Wikipedia API
├── App.vue                  # Root component, view routing
└── main.ts                  # App entry point
```
