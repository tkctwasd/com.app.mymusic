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
.backdrop { position: fixed; inset: 0; z-index: 800; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.7); animation: fadeIn .15s; }
.modal { width: min(524px, 100%); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: #282828; border-radius: 8px; box-shadow: 0 4px 60px rgba(0,0,0,.5); animation: pop .2s var(--ease); }
.modal.wide { width: min(720px, 100%); }
header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 8px; }
header h2 { font-size: 22px; font-weight: 800; }
.body { padding: 8px 24px 16px; }
footer { display: flex; justify-content: flex-end; gap: 12px; padding: 8px 24px 24px; }
@keyframes fadeIn { from { opacity: 0; } }
@keyframes pop { from { opacity: 0; transform: scale(.96); } }
</style>
