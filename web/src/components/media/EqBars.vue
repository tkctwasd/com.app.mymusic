<script setup>
defineProps({ paused: Boolean });
</script>

<template>
  <span class="eq" :class="{ paused }" aria-label="Đang phát"><i /><i /><i /><i /></span>
</template>

<style scoped>
.eq { display: inline-flex; align-items: flex-end; gap: 2px; width: 14px; height: 14px; }
i { flex: 1; background: var(--accent); border-radius: 2px; animation: eq 1s ease-in-out infinite; }
i:nth-child(2) { animation-delay: -.3s; }
i:nth-child(3) { animation-delay: -.6s; }
i:nth-child(4) { animation-delay: -.15s; }
.paused i { animation-play-state: paused; height: 30%; }
@keyframes eq { 0%, 100% { height: 25%; } 50% { height: 100%; } }
</style>
