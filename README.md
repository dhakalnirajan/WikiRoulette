# WikiRoulette

A beautiful Wikipedia random article explorer built with Vue 3 + TypeScript + Vite.

## Features

- **Spin** through random Wikipedia articles
- **Full in-page reader** — complete article rendered beautifully, never leaving the app
- **Clickable wiki links** — navigate between articles inside the reader
- **Table of contents** — sticky sidebar with active section highlighting
- **History navigation** — go back and forward through visited articles
- **Keyboard shortcuts** — `←` prev, `→`/`Space` next, `R` read, `Esc` back
- **Dark editorial design** — Libre Baskerville serif, grain texture, amber accent

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

## ⌨️ Keyboard Shortcuts

Navigate faster with these global shortcuts:

| Key | Action | Context |
| :--- | :--- | :--- |
| `Space` / `→` | **Spin** (Next Random Article) | Home |
| `←` | **Previous** Article | Home |
| `R` | **Read** Current Article | Home |
| `L` | **Learn Mode** (Pomodoro) | Home & Reader |
| `Backspace` | **Go Back** | Reader |
| `Esc` | **Exit Fullscreen** or **Go Back** | Reader / Guide |
| `F` | Toggle **Fullscreen** Mode | Reader |
| `M` | Toggle **Markdown/HTML** View | Reader |
| `D` | **Download** Markdown (Obsidian) | Reader |
| `F1` or `Shift` + `?` | Show **Shortcuts Menu** | Global |
| `Ctrl` + `S` | **Save Notes** (Pomodoro) | Learning Mode |

## 🎓 First-Time User Guide

When you first visit WikiRoulette, an interactive guide will walk you through:

- How to spin for random articles
- Reading full articles in our clean reader
- Using Pomodoro Learning Mode for deeper study with active recall
- Keyboard shortcuts and navigation tips

You can always reopen the guide by clicking the **Guide** button in the top navigation bar.

## 🧠 Pomodoro Learning Mode

Start a structured learning session by clicking **Learn Mode** or pressing `L`:

1. **Initial Read (60s)**: Read the article carefully. Timer starts only after content fully loads.
2. **First Reflection (2min)**: Article is hidden. Write your thoughts, questions, and surprises.
3. **Deep Read (5min)**: Re-read the same article with your questions in mind.
4. **Final Synthesis (2min)**: Synthesize your learning. What will you remember? How does this connect?

**Features:**

- ⏱️ Timer starts only after article fully loads (no wasted time)
- 🔒 Article hidden during reflection phases (anti-peeking)
- 📝 Notes saved per phase and exportable as Markdown
- 🔄 Same article reused for Round 2 (Deep Read)
- ⌨️ Full keyboard shortcut support

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
