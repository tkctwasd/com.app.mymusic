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
.toasts { position: fixed; left: 50%; bottom: calc(var(--player-h) + 24px); transform: translateX(-50%); z-index: 900; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
.toast { pointer-events: auto; display: flex; align-items: center; gap: 16px; padding: 10px 16px; border-radius: 8px; background: #fff; color: #000; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,.5); max-width: min(90vw, 480px); }
.act { font-weight: 700; text-decoration: underline; flex-shrink: 0; }
.toast-enter-active, .toast-leave-active { transition: all .25s var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px); }
@media (max-width: 767px) { .toasts { bottom: 140px; } }
</style>
