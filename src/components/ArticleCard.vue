<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WikiSummary } from '@/types/wiki'

const props = defineProps<{
  summary: WikiSummary
}>()

const emit = defineEmits<{
  (e: 'read'): void
}>()

const copied = ref(false)

const wikiUrl = computed(
  () =>
    props.summary.content_urls?.desktop?.page ??
    `https://en.wikipedia.org/wiki/${encodeURIComponent(props.summary.title.replace(/ /g, '_'))}`
)

const paragraphs = computed(() =>
  (props.summary.extract ?? '')
    .split('\n')
    .filter(Boolean)
    .slice(0, 4)
)

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(wikiUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch (_) {}
}
</script>

<template>
  <article class="card">
    <!-- Header -->
    <header class="card-header">
      <div class="card-eyebrow">
        <span class="eyebrow-line" aria-hidden="true"></span>
        Random Article · Wikipedia
      </div>
      <h1 class="card-title" v-html="summary.displaytitle || summary.title" />
      <p v-if="summary.description" class="card-description">
        {{ summary.description }}
      </p>
    </header>

    <!-- Body -->
    <div class="card-body">
      <img
        v-if="summary.thumbnail"
        :src="summary.thumbnail.source"
        :alt="summary.title"
        class="card-thumb"
        loading="lazy"
      />
      <div class="card-extract">
        <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
      </div>
    </div>

    <!-- Footer -->
    <footer class="card-footer">
      <div class="footer-left">
        <a :href="wikiUrl" target="_blank" rel="noopener noreferrer" class="footer-link">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Wikipedia ↗
        </a>

        <button class="footer-link" :class="{ copied }" @click="copyUrl">
          <svg v-if="!copied" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 12 4 12"/><polyline points="20 6 9 18 4 12"/>
          </svg>
          {{ copied ? 'Copied!' : 'Copy URL' }}
        </button>
      </div>

      <button class="read-btn" @click="emit('read')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        Read Full Article
      </button>
    </footer>
  </article>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 800px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  animation: cardIn 0.3s cubic-bezier(0.4,0,0.2,1) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.card-header {
  padding: 2.2rem 2.8rem 1.8rem;
  border-bottom: 1px solid var(--border);
}

.card-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.eyebrow-line {
  display: inline-block;
  width: 18px;
  height: 1px;
  background: var(--accent);
  opacity: 0.55;
  flex-shrink: 0;
}

.card-title {
  font-family: var(--font-serif);
  font-size: clamp(1.7rem, 3.5vw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
  color: var(--text);
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

/* Wikipedia displaytitle can have HTML (italics etc) */
.card-title :deep(i), .card-title :deep(em) { font-style: italic; }
.card-title :deep(sup) { font-size: 0.6em; }

.card-description {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  margin-top: 0.3rem;
}

.card-body {
  padding: 1.8rem 2.8rem 2.2rem;
  min-height: 120px;
}

.card-thumb {
  float: right;
  margin: 0 0 1.2rem 1.8rem;
  max-width: 200px;
  max-height: 220px;
  object-fit: cover;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  opacity: 0.92;
}

.card-extract {
  font-family: var(--font-serif);
  font-size: 0.97rem;
  line-height: 1.82;
  color: var(--text-dim);
}
.card-extract p + p { margin-top: 0.9em; }

.card-footer {
  padding: 1rem 2.8rem;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0,0,0,0.18);
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-left { display: flex; align-items: center; gap: 1.2rem; }

.footer-link {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  text-decoration: none;
  transition: color 0.16s;
}
.footer-link:hover { color: var(--text); }
.footer-link.copied { color: var(--accent); }

.read-btn {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid rgba(201,168,76,0.28);
  cursor: pointer;
  padding: 0.45rem 1rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.45rem;
  transition: all 0.16s;
}
.read-btn:hover {
  background: var(--accent-dim);
  border-color: rgba(201,168,76,0.55);
  color: #e8c97a;
}

@media (max-width: 640px) {
  .card-header, .card-body, .card-footer { padding-left: 1.4rem; padding-right: 1.4rem; }
  .card-thumb { max-width: 120px; }
}
</style>
