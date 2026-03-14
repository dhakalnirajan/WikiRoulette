<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const GUIDE_SEEN_KEY = "wikiroulette:guideSeen";
const GUIDE_VERSION = 1;

interface GuideStep {
  id: string;
  title: string;
  description: string;
  highlight?: {
    selector: string;
    position?: "top" | "bottom" | "left" | "right";
  };
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "welcome",
    title: "Welcome to WikiRoulette",
    description:
      "Discover random Wikipedia articles and learn deeply with our Pomodoro mode. Let us show you around.",
  },
  {
    id: "spin",
    title: "Spin for Random Articles",
    description:
      "Click the <strong>Spin</strong> button or press <kbd>Space</kbd>/<kbd>→</kbd> to discover a new random Wikipedia article.",
    highlight: { selector: ".spin-btn", position: "top" },
  },
  {
    id: "read",
    title: "Read Full Articles",
    description:
      "Click <strong>Read Full Article</strong> or press <kbd>R</kbd> to dive into the complete article with our clean reader.",
    highlight: { selector: ".read-btn", position: "top" },
  },
  {
    id: "pomodoro",
    title: "Learn with Pomodoro Mode",
    description:
      "Click <strong>Learn Mode</strong> or press <kbd>L</kbd> to start a structured learning session: read, reflect, and deepen your understanding.",
    highlight: { selector: ".pomodoro-btn", position: "top" },
  },
  {
    id: "shortcuts",
    title: "Keyboard Shortcuts",
    description:
      "Press <kbd>F1</kbd> or <kbd>Shift+?</kbd> anytime to see all available keyboard shortcuts.",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description:
      "Start exploring. You can always revisit this guide from the menu.",
  },
];

const isActive = ref(false);
const currentStepIndex = ref(0);
const hasSeenGuide = ref(false);

// Check if user has seen the guide
function checkGuideStatus() {
  const seen = localStorage.getItem(GUIDE_SEEN_KEY);
  const version = localStorage.getItem(`${GUIDE_SEEN_KEY}:version`);

  if (seen === "true" && version === String(GUIDE_VERSION)) {
    hasSeenGuide.value = true;
    return false;
  }
  return true;
}

function startGuide() {
  if (!checkGuideStatus()) return;

  isActive.value = true;
  currentStepIndex.value = 0;
  document.body.style.overflow = "hidden";
  highlightElement();
}

function nextStep() {
  if (currentStepIndex.value < GUIDE_STEPS.length - 1) {
    currentStepIndex.value++;
    highlightElement();
  } else {
    completeGuide();
  }
}

function prevStep() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--;
    highlightElement();
  }
}

function skipStep() {
  completeGuide();
}

function completeGuide() {
  isActive.value = false;
  document.body.style.overflow = "";
  localStorage.setItem(GUIDE_SEEN_KEY, "true");
  localStorage.setItem(`${GUIDE_SEEN_KEY}:version`, String(GUIDE_VERSION));
  hasSeenGuide.value = true;
  cleanupHighlight();
}

// resetGuide is not used – removed

const currentStep = computed(() => GUIDE_STEPS[currentStepIndex.value]);
const progress = computed(
  () => ((currentStepIndex.value + 1) / GUIDE_STEPS.length) * 100,
);

// Highlight element if specified
function highlightElement() {
  cleanupHighlight();

  if (!currentStep.value?.highlight) return;

  const { selector } = currentStep.value.highlight; // position not used, omit
  const el = document.querySelector(selector) as HTMLElement;

  if (el) {
    el.classList.add("guide-highlight");
    el.style.position = "relative";
    el.style.zIndex = "1001";

    // Scroll into view if needed
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Cleanup highlight
function cleanupHighlight() {
  document.querySelectorAll(".guide-highlight").forEach((e) => {
    e.classList.remove("guide-highlight");
    (e as HTMLElement).style.position = "";
    (e as HTMLElement).style.zIndex = "";
  });
}

// Handle keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  if (!isActive.value) return;

  if (e.key === "ArrowRight" || e.key === " ") {
    e.preventDefault();
    nextStep();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    prevStep();
  } else if (e.key === "Escape") {
    e.preventDefault();
    skipStep();
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  cleanupHighlight();
});

// Expose for parent component
defineExpose({
  startGuide,
  checkGuideStatus,
  handleKeydown,
});
</script>

<template>
  <Transition name="fade">
    <div v-if="isActive" class="guide-overlay">
      <!-- Dimmed background -->
      <div class="guide-backdrop" @click="skipStep"></div>

      <!-- Guide card -->
      <div class="guide-card">
        <!-- Progress bar -->
        <div class="guide-progress">
          <div
            class="guide-progress-fill"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>

        <!-- Content -->
        <div class="guide-content">
          <h2 class="guide-title">{{ currentStep.title }}</h2>
          <p class="guide-description" v-html="currentStep.description"></p>
        </div>

        <!-- Navigation -->
        <div class="guide-nav">
          <button
            class="guide-btn guide-btn-secondary"
            @click="prevStep"
            :disabled="currentStepIndex === 0"
          >
            ← Back
          </button>

          <div class="guide-step-indicator">
            {{ currentStepIndex + 1 }} / {{ GUIDE_STEPS.length }}
          </div>

          <button class="guide-btn guide-btn-primary" @click="nextStep">
            {{
              currentStepIndex === GUIDE_STEPS.length - 1
                ? "Get Started"
                : "Next"
            }}
            →
          </button>
        </div>

        <!-- Skip link -->
        <button class="guide-skip" @click="skipStep">Skip tour</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.guide-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}

.guide-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  z-index: 10001;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.guide-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--border);
  border-radius: var(--radius) var(--radius) 0 0;
  overflow: hidden;
}

.guide-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

.guide-content {
  margin-bottom: 1.5rem;
}

.guide-title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--text);
  margin-bottom: 0.8rem;
}

.guide-description {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  color: var(--text-dim);
  line-height: 1.6;
}

.guide-description :deep(strong) {
  color: var(--accent);
}

.guide-description :deep(kbd) {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 0.1rem 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--accent);
}

.guide-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.guide-btn {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.5rem 1.2rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s;
  min-height: 44px;
}

.guide-btn:not(:disabled):hover {
  background: var(--surface2);
  color: var(--text);
  border-color: var(--border2);
}

.guide-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.guide-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #0e0e0e;
  font-weight: 500;
}

.guide-btn-primary:not(:disabled):hover {
  background: #e8c97a;
  border-color: #e8c97a;
  color: #0a0a0a;
}

.guide-step-indicator {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
}

.guide-skip {
  position: absolute;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--text-faint);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.15s;
}

.guide-skip:hover {
  color: var(--text-muted);
}

/* Highlight effect for elements */
.guide-highlight {
  box-shadow:
    0 0 0 3px var(--accent),
    0 0 20px rgba(201, 168, 76, 0.3) !important;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 3px var(--accent),
      0 0 20px rgba(201, 168, 76, 0.3);
  }
  50% {
    box-shadow:
      0 0 0 4px var(--accent),
      0 0 30px rgba(201, 168, 76, 0.5);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .guide-card {
    padding: 1.5rem;
    margin: 1rem;
  }

  .guide-title {
    font-size: 1.2rem;
  }

  .guide-nav {
    flex-direction: column;
    gap: 0.8rem;
  }

  .guide-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
