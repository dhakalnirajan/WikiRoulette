<script setup lang="ts">
defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="shortcuts-modal" @click.self="emit('close')">
        <div class="shortcuts-card">
          <div class="shortcuts-header">
            <div class="header-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 6v12m3-6H6M12 3v18M3 12h18"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </div>
            <h2>Keyboard Shortcuts</h2>
            <button
              class="close-btn"
              @click="emit('close')"
              aria-label="Close shortcuts"
            >
              &times;
            </button>
          </div>

          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <kbd>←</kbd>
              <span>Previous article</span>
            </div>
            <div class="shortcut-item">
              <kbd>→</kbd> / <kbd>Space</kbd>
              <span>Spin new article</span>
            </div>
            <div class="shortcut-item">
              <kbd>R</kbd>
              <span>Read full article</span>
            </div>
            <div class="shortcut-item">
              <kbd>L</kbd>
              <span>Start Learning Mode</span>
            </div>
            <div class="shortcut-item">
              <kbd>F1</kbd> / <kbd>Shift+?</kbd>
              <span>Show shortcuts</span>
            </div>
            <div class="shortcut-item">
              <kbd>Esc</kbd>
              <span>Close modal / Back</span>
            </div>
          </div>

          <div class="shortcuts-footer">
            <span class="footer-icon">⌨️</span>
            <span>Press <kbd>Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal overlay animation */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .shortcuts-card,
.modal-leave-active .shortcuts-card {
  transition: transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.modal-enter-from .shortcuts-card,
.modal-leave-to .shortcuts-card {
  transform: scale(0.95);
}

.shortcuts-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.shortcuts-card {
  background: var(--surface);
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 1.5rem;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(201, 168, 76, 0.1) inset;
  transition: transform 0.3s ease;
}

.shortcuts-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.header-icon {
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  border-radius: 99px;
  padding: 0.5rem;
  line-height: 0;
}

.shortcuts-header h2 {
  flex: 1;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.01em;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 99px;
  transition: all 0.2s ease;
}
.close-btn:hover {
  color: var(--accent);
  background: var(--surface2);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  color: var(--text-dim);
  background: var(--surface2);
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  transition: background 0.2s ease;
}
.shortcut-item:hover {
  background: var(--surface);
  border: 1px solid var(--border2);
  margin: -1px;
}

kbd {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.shortcuts-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.footer-icon {
  font-size: 1.1rem;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .shortcuts-card {
    padding: 1.5rem;
    border-radius: 1.25rem;
  }
  .shortcuts-header h2 {
    font-size: 1.3rem;
  }
  .shortcuts-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .shortcut-item {
    padding: 0.6rem 0.8rem;
  }
  kbd {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
  }
}
</style>
