<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import AppNav from "@/components/AppNav.vue";
import HomeView from "@/components/HomeView.vue";
import ArticleReader from "@/components/ArticleReader.vue";
import PomodoroLearningView from "@/components/PomodoroLearningView.vue";
import FirstTimeGuide from "@/components/FirstTimeGuide.vue";
import { fetchSummaryByTitle } from "@/composables/useWikiApi";
import { useHistory } from "@/composables/useHistory";
import type { WikiSummary } from "@/types/wiki";

// Added 'pomodoro' to View type
type View = "home" | "reader" | "pomodoro";

const view = ref<View>("home");
const readerSummary = ref<WikiSummary | null>(null);
// Added pomodoroArticle ref for Learning Mode
const pomodoroArticle = ref<WikiSummary | null>(null);
const homeRef = ref<InstanceType<typeof HomeView> | null>(null);

// First-time guide composable
const guideRef = ref<InstanceType<typeof FirstTimeGuide> | null>(null);

const { current, totalCount } = useHistory();

const goHome = () => {
  view.value = "home";
};

const openReader = (s: WikiSummary) => {
  readerSummary.value = s;
  view.value = "reader";
};

// Added openPomodoro function for Learning Mode
const openPomodoro = (s: WikiSummary) => {
  pomodoroArticle.value = s;
  view.value = "pomodoro";
};

const navigateToArticle = async (title: string) => {
  try {
    const summary = await fetchSummaryByTitle(title);
    // Route to current view mode (reader or pomodoro)
    if (view.value === "pomodoro") {
      pomodoroArticle.value = summary;
    } else {
      openReader(summary);
    }
  } catch {
    // Removed trailing spaces in fallback URL
    const fallback: WikiSummary = {
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
    };
    // Route fallback to current view mode
    if (view.value === "pomodoro") {
      pomodoroArticle.value = fallback;
    } else {
      openReader(fallback);
    }
  }
};

// Unified keyboard handler with guide support
const handleKeydown = (e: KeyboardEvent) => {
  // Let guide handle its own keys first
  if (guideRef.value?.handleKeydown) {
    guideRef.value.handleKeydown(e);
    if (e.defaultPrevented) return;
  }

  if (
    ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)
  )
    return;

  // Global shortcuts only work in home view
  if (view.value === "home") {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      homeRef.value?.spin();
    }
    if ((e.key === "r" || e.key === "R") && current.value) {
      openReader(current.value.summary);
    }
    // L key opens Pomodoro Learning Mode (not reader)
    if (e.key.toLowerCase() === "l" && current.value) {
      e.preventDefault();
      openPomodoro(current.value.summary);
    }
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  homeRef.value?.spin();

  // Check if we should show the first-time guide
  if (guideRef.value?.checkGuideStatus()) {
    setTimeout(() => {
      guideRef.value?.startGuide();
    }, 1000);
  }
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div id="wikiroulette">
    <!-- First-time guide overlay -->
    <FirstTimeGuide ref="guideRef" />

    <AppNav
      :in-reader="view === 'reader' || view === 'pomodoro'"
      :total-visited="totalCount"
      @go-home="goHome"
      @show-guide="guideRef?.startGuide()"
    />

    <Transition name="fade" mode="out-in">
      <!-- Home View -->
      <HomeView
        v-if="view === 'home'"
        ref="homeRef"
        @read="openReader"
        @pomodoro="openPomodoro"
      />

      <!-- Article Reader View (Free Reading Mode) -->
      <ArticleReader
        v-else-if="view === 'reader' && readerSummary"
        :summary="readerSummary"
        @back="goHome"
        @navigate="navigateToArticle"
      />

      <!-- Pomodoro Learning View (only shown when needed) -->
      <PomodoroLearningView
        v-else-if="view === 'pomodoro' && pomodoroArticle"
        :initial-article="pomodoroArticle"
        @complete="goHome"
        @back="goHome"
      />
    </Transition>
  </div>
</template>

<style>
#wikiroulette {
  min-height: 100vh;
}
</style>
