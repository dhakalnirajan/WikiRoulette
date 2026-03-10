<template>
  <div class="skeleton-card">
    <div class="sk-header">
      <div class="skeleton sk-label"></div>
      <div class="skeleton sk-title"></div>
      <div class="skeleton sk-title sk-title-short"></div>
      <div class="skeleton sk-desc"></div>
    </div>
    <div class="sk-body">
      <div class="skeleton sk-thumb"></div>
      <div class="sk-lines">
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line sk-line-short"></div>
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line sk-line-medium"></div>
      </div>
    </div>
    <div class="sk-footer">
      <div class="skeleton sk-tag"></div>
      <div class="skeleton sk-tag sk-tag-sm"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  width: 100%;
  max-width: 800px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.sk-header {
  padding: 2.2rem 2.8rem 1.8rem;
  border-bottom: 1px solid var(--border);
}
.sk-body {
  padding: 1.8rem 2.8rem 2.2rem;
  display: flex;
  gap: 1.5rem;
}
.sk-lines { flex: 1; }
.sk-footer {
  padding: 1rem 2.8rem;
  border-top: 1px solid var(--border);
  background: rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sk-label { height: 0.65rem; width: 160px; margin-bottom: 1.1rem; }
.sk-title { height: 2.2rem; width: 72%; margin-bottom: 0.5rem; }
.sk-title-short { width: 48%; }
.sk-desc { height: 0.7rem; width: 220px; margin-top: 0.5rem; }
.sk-thumb { width: 180px; height: 180px; flex-shrink: 0; border-radius: var(--radius); }
.sk-line { height: 0.82rem; margin-bottom: 0.55rem; }
.sk-line-short { width: 55%; }
.sk-line-medium { width: 78%; }
.sk-tag { height: 0.75rem; width: 80px; }
.sk-tag-sm { width: 110px; }

@media (max-width: 640px) {
  .sk-header, .sk-body, .sk-footer { padding-left: 1.4rem; padding-right: 1.4rem; }
  .sk-thumb { display: none; }
}
</style>
