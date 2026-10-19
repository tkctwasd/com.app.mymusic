<script setup>
import Icon from '../ui/Icon.vue';
defineProps({ playing: Boolean, size: { type: Number, default: 48 } });
</script>

<template>
  <button class="pbtn" :style="{ width: size + 'px', height: size + 'px' }" :aria-label="playing ? 'Tạm dừng' : 'Phát'">
    <Icon :name="playing ? 'pause' : 'play'" :size="size * 0.42" />
  </button>
</template>

<style scoped>
.pbtn { display: grid; place-items: center; border-radius: 50%; background: var(--accent); color: #000; box-shadow: 0 8px 8px rgba(0,0,0,.3); transition: transform .1s, background .15s; flex-shrink: 0; }
.pbtn:hover { transform: scale(1.04); background: var(--accent-hover); }
</style>
