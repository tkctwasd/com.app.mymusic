<script setup>
// Một "kệ" cuộn ngang, có nút ‹ › khi rê chuột (desktop)
import { ref } from 'vue';
import Icon from '../ui/Icon.vue';
defineProps({ title: String, to: String });
const row = ref(null);
const scroll = (d) => row.value.scrollBy({ left: d * row.value.clientWidth * 0.8, behavior: 'smooth' });
</script>

<template>
  <section class="shelf">
    <div class="section-title">
      <h2>{{ title }}</h2>
      <div class="tools">
        <RouterLink v-if="to" :to="to">Xem tất cả</RouterLink>
        <button class="icon-btn nav" aria-label="Trước" @click="scroll(-1)"><Icon name="chevronLeft" size="18" /></button>
        <button class="icon-btn nav" aria-label="Sau" @click="scroll(1)"><Icon name="chevronRight" size="18" /></button>
      </div>
    </div>
    <div ref="row" class="row"><slot /></div>
  </section>
</template>

<style scoped>
.tools { display: flex; align-items: center; gap: 4px; }
.tools a { margin-right: 8px; }
.nav { width: 32px; height: 32px; background: var(--hover); }
.row { display: grid; grid-auto-flow: column; grid-auto-columns: 176px; gap: 22px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 8px; margin: -8px; overscroll-behavior-x: contain; }
.row::-webkit-scrollbar { display: none; }
.row > :deep(*) { scroll-snap-align: start; }
@media (max-width: 767px) { .row { grid-auto-columns: 142px; gap: 16px; } .nav { display: none; } }
</style>
