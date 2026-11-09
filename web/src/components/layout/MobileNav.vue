<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../ui/Icon.vue';
const route = useRoute();
const cur = computed(() => (route.name === 'listen' ? 0 : route.name === 'explore' ? 2 : 1));
</script>

<template>
  <nav class="mnav">
    <RouterLink to="/" class="it" :class="{ on: cur === 0 }"><Icon name="listen" size="22" /><span>Nghe</span></RouterLink>
    <RouterLink to="/shelf" class="it" :class="{ on: cur === 1 }"><Icon name="shelf" size="22" /><span>Kệ</span></RouterLink>
    <RouterLink to="/explore" class="it" :class="{ on: cur === 2 }"><Icon name="compass" size="22" /><span>Tìm</span></RouterLink>
  </nav>
</template>

<style scoped>
:global(:root) { --mnav-pad: max(4px, calc(env(safe-area-inset-bottom) - 18px)); --mnav-bg: color-mix(in srgb, var(--surface) 92%, var(--bg)); }
.mnav { position: fixed; z-index: 200; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-around; height: calc(var(--mnav-h) + var(--mnav-pad)); padding-bottom: var(--mnav-pad); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);
  background: var(--mnav-bg); border-top: 1px solid var(--line);
  box-shadow: 0 120px 0 0 var(--mnav-bg); } /* bóng đổ kéo màu nền xuống dưới: lấp khoảng hở nếu iOS báo viewport hụt (::after cũ nằm ngoài màn hình nên không tác dụng) */
.it { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; flex: 1; font-size: 11px; font-weight: 500; color: var(--text-3); transition: color .2s; }
.it.on { color: var(--text); }
.it.on :deep(svg) { color: var(--accent); }
</style>
