<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import AppNav from "@/components/AppNav.vue";
import HomeView from "@/components/HomeView.vue";
import ArticleReader from "@/components/ArticleReader.vue";
import { fetchSummaryByTitle } from "@/composables/useWikiApi";
import { useHistory } from "@/composables/useHistory";
import type { WikiSummary } from "@/types/wiki";

type View = "home" | "reader";

const view = ref<View>("home");
const readerSummary = ref<WikiSummary | null>(null);
const homeRef = ref<InstanceType<typeof HomeView> | null>(null);

const { current, totalCount } = useHistory();

function goHome() {
  view.value = "home";
}

function openReader(summary: WikiSummary) {
  readerSummary.value = summary;
  view.value = "reader";
}

async function navigateToArticle(title: string) {
  try {
    const summary = await fetchSummaryByTitle(title);
    openReader(summary);
  } catch {
    // Fallback
    openReader({
      title,
      displaytitle: title,
      content_urls: {
        desktop: {
          page: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
          revisions: "",
          edit: "",
          talk: "",
        },
        mobile: { page: "", revisions: "", edit: "", talk: "" },
      },
      extract: "",
      extract_html: "",
      type: "standard",
      namespace: { id: 0, text: "" },
      wikibase_item: "",
      titles: { canonical: title, normalized: title, display: title },
      pageid: 0,
      lang: "en",
      dir: "ltr",
      revision: "",
      tid: "",
      timestamp: "",
    } as WikiSummary);
  }
}

function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  // Global Shortcuts (F1 / Shift+?)
  if (e.key === "F1" || (e.key === "?" && e.shiftKey)) {
    // If in reader, let the reader handle it, otherwise ignore or show global help if you had one
    // Currently Reader handles its own modal, so we let it bubble if view is reader
    if (view.value === "reader") return;
  }

  if (view.value === "home") {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      homeRef.value?.spin();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      // Handled inside HomeView mostly, but could trigger prev here if needed
    }
    if ((e.key === "r" || e.key === "R") && current.value) {
      openReader(current.value.summary);
    }
  }

  if (view.value === "reader") {
    // Let ArticleReader handle most keys, but we can intercept global 'Esc' if needed
    // However, ArticleReader now handles Esc for fullscreen/back internally.
    // We just ensure we don't double-trigger.
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  homeRef.value?.spin();
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div id="wikiroulette">
    <AppNav
      :in-reader="view === 'reader'"
      :total-visited="totalCount"
      @go-home="goHome"
    />

    <Transition name="fade" mode="out-in">
      <HomeView v-if="view === 'home'" ref="homeRef" @read="openReader" />
      <ArticleReader
        v-else-if="view === 'reader' && readerSummary"
        :summary="readerSummary"
        @back="goHome"
        @navigate="navigateToArticle"
      />
    </Transition>
  </div>
</template>

<style>
#wikiroulette {
  min-height: 100vh;
}
</style>
