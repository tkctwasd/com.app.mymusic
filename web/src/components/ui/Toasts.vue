<script setup>
import { useUi } from '../../stores/ui.js';
const ui = useUi();
const act = (t) => { ui.dismiss(t.id); t.action.fn(); };
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toasts" aria-live="polite">
    <div v-for="t in ui.toasts" :key="t.id" class="toast">
      <span>{{ t.text }}</span>
      <button v-if="t.action" class="act" @click="act(t)">{{ t.action.label }}</button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toasts { position: fixed; left: 50%; bottom: calc(var(--dock-h) + 40px); transform: translateX(-50%); z-index: 900; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
.toast { pointer-events: auto; display: flex; align-items: center; gap: 16px; padding: 10px 10px 10px 18px; min-height: 44px; border-radius: 999px; background: var(--text); color: var(--bg); font-weight: 500; box-shadow: var(--shadow-lg); max-width: min(90vw, 480px); }
.toast:not(:has(.act)) { padding-right: 18px; }
.act { font-weight: 700; flex-shrink: 0; padding: 6px 14px; border-radius: 999px; background: color-mix(in oklab, var(--bg) 14%, transparent); }
.act:hover { background: color-mix(in oklab, var(--bg) 24%, transparent); }
.toast-enter-active, .toast-leave-active { transition: all .35s var(--spring); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(16px) scale(.95); }
@media (max-width: 767px) { .toasts { bottom: calc(var(--mnav-h) + var(--dock-h) + 28px); } }
</style>
