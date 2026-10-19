<script setup>
// Hàng card: 1 dòng theo độ rộng màn hình (desktop) / cuộn ngang (mobile)
defineProps({ title: String, to: String });
</script>

<template>
  <section>
    <div class="section-title">
      <h2>{{ title }}</h2>
      <RouterLink v-if="to" :to="to">Hiện tất cả</RouterLink>
    </div>
    <div class="row"><slot /></div>
  </section>
</template>

<style scoped>
.row { display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 0px) / var(--cols, 5)); grid-template-rows: 1fr; overflow: hidden; margin: 0 -12px; }
section { --cols: 5; }
@container main (max-width: 1100px) { section { --cols: 4; } }
@container main (max-width: 860px) { section { --cols: 3; } }
@media (max-width: 767px) {
  .row { grid-auto-columns: 148px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 0 4px; }
}
</style>
