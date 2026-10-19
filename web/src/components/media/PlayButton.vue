<script setup>
import Icon from '../ui/Icon.vue';
defineProps({ playing: Boolean, size: { type: Number, default: 48 }, glass: Boolean });
</script>

<template>
  <button class="pbtn" :class="{ glass }" :style="{ width: size + 'px', height: size + 'px' }" :aria-label="playing ? 'Tạm dừng' : 'Phát'">
    <Icon :name="playing ? 'pause' : 'play'" :size="size * 0.4" />
  </button>
</template>

<style scoped>
.pbtn { display: grid; place-items: center; border-radius: 50%; background: var(--accent); color: var(--accent-ink); transition: transform .2s var(--spring), box-shadow .2s; flex-shrink: 0; }
.pbtn:hover { transform: scale(1.06); box-shadow: 0 8px 24px -8px var(--accent); }
.pbtn:active { transform: scale(.95); }
.pbtn.glass { background: rgb(255 255 255 / .82); color: #111; backdrop-filter: blur(8px); box-shadow: 0 6px 18px rgb(0 0 0 / .25); }
</style>
