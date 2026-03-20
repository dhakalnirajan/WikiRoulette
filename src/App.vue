<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import AppNav from "@/components/AppNav.vue";
import HomeView from "@/components/HomeView.vue";
import ArticleReader from "@/components/ArticleReader.vue";
import PomodoroLearningView from "@/components/PomodoroLearningView.vue";
import FirstTimeGuide from "@/components/FirstTimeGuide.vue";
import { fetchSummaryByTitle } from "@/composables/useWikiApi";
import { useHistory } from "@/composables/useHistory";
import type { WikiSummary } from "@/types/wiki";

type View = "home" | "reader" | "pomodoro";

const view = ref<View>("home");
const readerSummary = ref<WikiSummary | null>(null);
const pomodoroArticle = ref<WikiSummary | null>(null);
const homeRef = ref<InstanceType<typeof HomeView> | null>(null);
const guideRef = ref<InstanceType<typeof FirstTimeGuide> | null>(null);
const { current, totalCount } = useHistory();
const isAppReady = ref(false);

const goHome = (): void => {
  view.value = "home";
};

const openReader = (s: WikiSummary): void => {
  readerSummary.value = s;
  view.value = "reader";
};

const openPomodoro = (s: WikiSummary): void => {
  pomodoroArticle.value = { ...s };
  view.value = "pomodoro";
};

const navigateToArticle = async (title: string): Promise<void> => {
  try {
    const summary = await fetchSummaryByTitle(title);
    if (view.value === "pomodoro") {
      pomodoroArticle.value = summary;
    } else {
      openReader(summary);
    }
  } catch {
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
    if (view.value === "pomodoro") {
      pomodoroArticle.value = fallback;
    } else {
      openReader(fallback);
    }
  }
};

const handleKeydown = (e: KeyboardEvent): void => {
  const target = e.target as HTMLElement;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  ) {
    return;
  }

  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key.toLowerCase() === "r" || e.key === "F5")
  ) {
    return;
  }

  if (guideRef.value && guideRef.value.isInitialized) {
    const guideActive = guideRef.value.isActive;
    if (guideActive && guideRef.value.handleKeydown) {
      guideRef.value.handleKeydown(e);
      if (e.defaultPrevented) return;
    }
  }

  if (!isAppReady.value) return;

  if (view.value === "home") {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      homeRef.value?.spin();
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      homeRef.value?.prev?.();
      return;
    }

    if (
      e.key.toLowerCase() === "r" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      current.value?.summary
    ) {
      e.preventDefault();
      openReader(current.value.summary);
      return;
    }

    if (
      e.key.toLowerCase() === "l" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      current.value?.summary
    ) {
      e.preventDefault();
      openPomodoro({ ...current.value.summary });
      return;
    }
  }

  if (e.key === "F1" || (e.key === "?" && e.shiftKey)) {
    e.preventDefault();
    if (homeRef.value && homeRef.value.showShortcuts !== undefined) {
      homeRef.value.showShortcuts = true;
    }
  }
};

onMounted(async () => {
  await nextTick();
  document.addEventListener("keydown", handleKeydown);
  isAppReady.value = true;
  homeRef.value?.spin?.();
  setTimeout(() => {
    if (guideRef.value && guideRef.value.isInitialized) {
      const shouldShow = guideRef.value.checkGuideStatus();
      if (shouldShow) {
        guideRef.value.startGuide();
      }
    }
  }, 500);
});

onUnmounted(() => {
  isAppReady.value = false;
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div id="wikiroulette">
    <FirstTimeGuide ref="guideRef" />

    <AppNav
      :in-reader="view === 'reader' || view === 'pomodoro'"
      :total-visited="totalCount"
      @go-home="goHome"
      @show-guide="guideRef?.startGuide()"
    />

    <Transition name="fade" mode="out-in">
      <HomeView
        v-if="view === 'home'"
        ref="homeRef"
        @read="openReader"
        @pomodoro="openPomodoro"
      />

      <ArticleReader
        v-else-if="view === 'reader' && readerSummary"
        :summary="readerSummary"
        @back="goHome"
        @navigate="navigateToArticle"
      />

      <PomodoroLearningView
        v-else-if="view === 'pomodoro' && pomodoroArticle"
        :key="pomodoroArticle.pageid"
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
