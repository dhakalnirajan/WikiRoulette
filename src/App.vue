<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import AppNav from "@/components/AppNav.vue";
import HomeView from "@/components/HomeView.vue";
import ArticleReader from "@/components/ArticleReader.vue";
import { fetchSummaryByTitle } from "@/composables/useWikiApi";
import { useHistory } from "@/composables/useHistory";
import type { WikiSummary } from "@/types/wiki";

const view = ref<"home" | "reader">("home");
const readerSummary = ref<WikiSummary | null>(null);
const homeRef = ref<InstanceType<typeof HomeView> | null>(null);

const { current, totalCount } = useHistory();

const goHome = () => {
  view.value = "home";
};

const openReader = (s: WikiSummary) => {
  readerSummary.value = s;
  view.value = "reader";
};

const navigateToArticle = async (title: string) => {
  try {
    openReader(await fetchSummaryByTitle(title));
  } catch {
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
};

const handleKeydown = (e: KeyboardEvent) => {
  if (
    ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)
  )
    return;

  if (e.key === "F1" || (e.key === "?" && e.shiftKey)) {
    if (view.value === "reader") return;
  }

  if (view.value === "home") {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      homeRef.value?.spin();
    }
    if ((e.key === "r" || e.key === "R") && current.value) {
      openReader(current.value.summary);
    }
  }
};

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
        v-else-if="readerSummary"
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
