<script setup>
import Icon from './Icon.vue';
defineProps({ title: String, wide: Boolean });
const emit = defineEmits(['close']);
</script>

<template>
  <div class="backdrop" @pointerdown.self="emit('close')">
    <div class="modal" :class="{ wide }" role="dialog" aria-modal="true" :aria-label="title">
      <header>
        <h2>{{ title }}</h2>
        <button class="icon-btn" aria-label="Đóng" @click="emit('close')"><Icon name="x" /></button>
      </header>
      <div class="body scroll"><slot /></div>
      <footer v-if="$slots.footer"><slot name="footer" /></footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 800; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / .45); backdrop-filter: blur(6px); animation: fadeIn .2s; }
.modal { width: min(524px, 100%); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow-lg); animation: pop .3s var(--spring); }
.modal.wide { width: min(720px, 100%); }
header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 8px; }
header h2 { font: 600 19px var(--font-display); }
.body { padding: 8px 24px 16px; }
footer { display: flex; justify-content: flex-end; gap: 12px; padding: 8px 24px 24px; }
@keyframes fadeIn { from { opacity: 0; } }
@keyframes pop { from { opacity: 0; transform: translateY(12px) scale(.97); } }
</style>
