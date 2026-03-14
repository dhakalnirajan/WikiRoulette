<script setup lang="ts">
defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="shortcuts-modal" @click.self="emit('close')">
        <div class="shortcuts-card">
          <div class="shortcuts-header">
            <h2>Keyboard Shortcuts</h2>
            <button class="close-btn" @click="emit('close')">&times;</button>
          </div>
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <kbd>←</kbd><span>Previous article</span>
            </div>
            <div class="shortcut-item">
              <kbd>→</kbd>/<kbd>Space</kbd><span>Spin new article</span>
            </div>
            <div class="shortcut-item">
              <kbd>R</kbd><span>Read full article</span>
            </div>
            <div class="shortcut-item">
              <kbd>L</kbd><span>Start Learning Mode</span>
            </div>
            <div class="shortcut-item">
              <kbd>F1</kbd>/<kbd>Shift+?</kbd><span>Show shortcuts</span>
            </div>
            <div class="shortcut-item">
              <kbd>Esc</kbd><span>Close modal / Back</span>
            </div>
          </div>
          <p class="shortcuts-footer">Press <kbd>Esc</kbd> to close</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.shortcuts-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.shortcuts-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
}
.shortcuts-header h2 {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
}
.close-btn:hover {
  color: var(--accent);
}
.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.shortcut-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--text-dim);
}
kbd {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 0.2rem 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--accent);
}
.shortcuts-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-faint);
}
@media (max-width: 640px) {
  .shortcuts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
