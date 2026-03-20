<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  errorTitle?: string;
  errorMessage?: string;
  showRetry?: boolean;
}>();

const emit = defineEmits<{
  (e: "retry"): void;
  (e: "back"): void;
}>();

// Trivia game state
const triviaQuestions = [
  {
    question: "What was the first Wikipedia article?",
    options: ["HomePage", "Wikipedia", "Main Page", "Index"],
    correct: 0,
  },
  {
    question: "In which year was Wikipedia launched?",
    options: ["1999", "2001", "2003", "2005"],
    correct: 1,
  },
  {
    question: "Which Wikipedia language edition has the most articles?",
    options: ["Spanish", "German", "French", "English"],
    correct: 3,
  },
  {
    question: "What is the name of Wikipedia's mascot?",
    options: ["Wikipede", "Wikipedian", "WikiGnome", "Wikibot"],
    correct: 0,
  },
  {
    question: "Who is the co‑founder of Wikipedia?",
    options: ["Larry Page", "Jimmy Wales", "Tim Berners‑Lee", "Sergey Brin"],
    correct: 1,
  },
];

const currentQuestionIndex = ref(0);
const selectedAnswer = ref<number | null>(null);
const showResult = ref(false);
const score = ref(0);
const gameCompleted = ref(false);

const currentQuestion = computed(
  () => triviaQuestions[currentQuestionIndex.value],
);
const isLastQuestion = computed(
  () => currentQuestionIndex.value === triviaQuestions.length - 1,
);

function selectAnswer(index: number) {
  if (selectedAnswer.value !== null || showResult.value) return;
  selectedAnswer.value = index;
  const isCorrect = index === currentQuestion.value.correct;
  if (isCorrect) score.value++;
  showResult.value = true;
}

function nextQuestion() {
  if (isLastQuestion.value) {
    gameCompleted.value = true;
  } else {
    currentQuestionIndex.value++;
    selectedAnswer.value = null;
    showResult.value = false;
  }
}

function resetGame() {
  currentQuestionIndex.value = 0;
  selectedAnswer.value = null;
  showResult.value = false;
  score.value = 0;
  gameCompleted.value = false;
}

// Keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  if (!gameCompleted.value && !showResult.value) {
    if (e.key >= "1" && e.key <= "4") {
      selectAnswer(parseInt(e.key) - 1);
    }
  }
  if (showResult.value && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    nextQuestion();
  }
  if (gameCompleted.value && e.key === "R") {
    resetGame();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="error-page">
    <div class="error-container">
      <div class="error-header">
        <div class="error-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="0.5" fill="currentColor" />
          </svg>
        </div>
        <h1 class="error-title">{{ errorTitle || "Something went wrong" }}</h1>
        <p class="error-message">
          {{ errorMessage || "We couldn't load the page you requested." }}
        </p>
        <div class="error-actions">
          <button v-if="showRetry" class="retry-btn" @click="$emit('retry')">
            Try Again
          </button>
          <button class="back-btn" @click="$emit('back')">Go Back</button>
        </div>
      </div>

      <div class="game-section">
        <h2 class="game-title">WIKIPEDIA TRIVIA</h2>

        <div v-if="!gameCompleted" class="trivia-game">
          <div class="question-card">
            <div class="question-counter">
              Question {{ currentQuestionIndex + 1 }} /
              {{ triviaQuestions.length }}
            </div>
            <div class="question-text">{{ currentQuestion.question }}</div>
            <div class="options-grid">
              <button
                v-for="(opt, idx) in currentQuestion.options"
                :key="idx"
                class="option-btn"
                :class="{
                  selected: selectedAnswer === idx,
                  correct: showResult && idx === currentQuestion.correct,
                  incorrect:
                    showResult &&
                    selectedAnswer === idx &&
                    idx !== currentQuestion.correct,
                }"
                :disabled="selectedAnswer !== null"
                @click="selectAnswer(idx)"
              >
                <span class="option-letter"
                  >{{ String.fromCharCode(65 + idx) }}.</span
                >
                {{ opt }}
              </button>
            </div>
            <div v-if="showResult" class="result-feedback">
              <p
                :class="{ correct: selectedAnswer === currentQuestion.correct }"
              >
                {{
                  selectedAnswer === currentQuestion.correct
                    ? "Correct!"
                    : "Incorrect!"
                }}
              </p>
              <button class="next-btn" @click="nextQuestion">
                {{ isLastQuestion ? "See Score" : "Next Question" }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="game-completed">
          <h3>Game Over</h3>
          <p class="final-score">
            You scored {{ score }} out of {{ triviaQuestions.length }}
          </p>
          <div class="score-feedback">
            <p v-if="score === triviaQuestions.length">
              Perfect! You're a true Wikipedian.
            </p>
            <p v-else-if="score >= triviaQuestions.length - 1">
              Great job! Almost perfect.
            </p>
            <p v-else>Nice try! Want to learn more about Wikipedia?</p>
          </div>
          <button class="restart-btn" @click="resetGame">Play Again</button>
        </div>

        <div class="game-hint">
          <span>Tip:</span> Use number keys (1-4) to answer quickly.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--bg);
}

.error-container {
  max-width: 800px;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  box-shadow: var(--shadow-card);
}

.error-header {
  text-align: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}

.error-icon {
  margin-bottom: 0.5rem;
  color: var(--accent);
  display: flex;
  justify-content: center;
}

.error-title {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.error-message {
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.retry-btn,
.back-btn {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn {
  background: var(--accent);
  border: none;
  color: #0e0e0e;
}

.retry-btn:hover {
  background: #e8c97a;
}

.back-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.back-btn:hover {
  background: var(--surface);
  color: var(--text);
}

.game-section {
  margin-top: 1rem;
}

.game-title {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  text-align: center;
  margin-bottom: 1rem;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.trivia-game {
  margin-top: 1rem;
}

.question-card {
  background: var(--surface2);
  border-radius: var(--radius);
  padding: 1.5rem;
}

.question-counter {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.question-text {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: var(--text);
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.option-btn {
  text-align: left;
  padding: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--text-dim);
}

.option-btn:hover:not(:disabled) {
  background: var(--surface);
  border-color: var(--accent);
}

.option-btn.selected {
  border-color: var(--accent);
  background: var(--accent-glow);
}

.option-btn.correct {
  background: rgba(0, 200, 0, 0.2);
  border-color: green;
  color: green;
}

.option-btn.incorrect {
  background: rgba(200, 0, 0, 0.2);
  border-color: red;
  color: red;
}

.option-letter {
  font-weight: bold;
  margin-right: 0.5rem;
  color: var(--accent);
}

.result-feedback {
  text-align: center;
  margin-top: 1rem;
}

.result-feedback p {
  font-family: var(--font-sans);
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.result-feedback p.correct {
  color: green;
}

.result-feedback p:not(.correct) {
  color: red;
}

.next-btn {
  background: var(--accent);
  border: none;
  color: #0e0e0e;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.next-btn:hover {
  background: #e8c97a;
}

.game-completed {
  text-align: center;
  padding: 1.5rem;
}

.final-score {
  font-size: 1.2rem;
  font-weight: bold;
  margin: 0.5rem 0;
  color: var(--accent);
}

.score-feedback p {
  margin: 0.5rem 0;
  color: var(--text-dim);
}

.restart-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  cursor: pointer;
  margin-top: 1rem;
  font-family: var(--font-mono);
}

.restart-btn:hover {
  background: var(--surface);
  border-color: var(--accent);
  color: var(--accent);
}

.game-hint {
  margin-top: 1rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
}

.game-hint span {
  font-weight: bold;
  color: var(--accent);
}
</style>
