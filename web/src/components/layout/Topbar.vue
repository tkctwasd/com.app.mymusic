<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Icon from '../ui/Icon.vue';
import { useUi } from '../../stores/ui.js';
import { useLibrary } from '../../stores/library.js';

const ui = useUi(), lib = useLibrary(), router = useRouter(), route = useRoute();

// Hiện nền + tên trang khi đã cuộn qua header
const solid = computed(() => ui.scrollY > 60);
const showTitle = computed(() => ui.scrollY > 280 && ui.page.title);
</script>

<template>
  <div class="topbar" :style="{ '--c': ui.page.color || '#222' }" :class="{ solid }">
    <div class="nav">
      <button class="icon-btn round" aria-label="Quay lại" @click="router.back()"><Icon name="chevronLeft" /></button>
      <button class="icon-btn round" aria-label="Tiến tới" @click="router.forward()"><Icon name="chevronRight" /></button>
    </div>

    <div v-if="route.name === 'search'" class="search">
      <Icon name="search" class="si" />
      <input id="search-input" v-model="ui.searchQ" placeholder="Bạn muốn nghe gì?" autocomplete="off" />
      <button v-if="ui.searchQ" class="icon-btn clear" aria-label="Xóa" @click="ui.searchQ = ''"><Icon name="x" size="18" /></button>
    </div>
    <Transition name="fade">
      <div v-if="showTitle && route.name !== 'search'" class="mini">
        <button v-if="ui.page.play" class="play" :aria-label="ui.page.playing ? 'Tạm dừng' : 'Phát'" @click="ui.page.play()"><Icon :name="ui.page.playing ? 'pause' : 'play'" size="18" /></button>
        <span class="ellipsis">{{ ui.page.title }}</span>
      </div>
    </Transition>

    <div class="right">
      <button class="btn btn-light add" @click="ui.open('import')">
        <Icon name="plus" size="18" /><span>Thêm nhạc</span>
        <span v-if="lib.activeJobs.length" class="badge">{{ lib.activeJobs.length }}</span>
      </button>
      <button class="icon-btn round" aria-label="Cài đặt" title="Cài đặt" @click="ui.open('settings')"><Icon name="settings" size="18" /></button>
    </div>
  </div>
</template>

<style scoped>
.topbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16px; height: 64px; padding: 0 24px; transition: background .3s; margin-bottom: -64px; }
.topbar.solid { background: color-mix(in srgb, var(--c) 55%, #121212); }
.nav { display: flex; gap: 8px; }
.icon-btn.round { width: 32px; height: 32px; }
.search { position: relative; width: min(364px, 100%); }
.search input { width: 100%; height: 48px; border-radius: 999px; border: 0; padding: 0 44px 0 48px; background: var(--surface-3); outline: none; font-size: 15px; transition: box-shadow .2s; }
.search input:hover { background: var(--surface-4); }
.search input:focus { box-shadow: 0 0 0 2px #fff; }
.si { position: absolute; left: 14px; top: 14px; color: var(--text-2); }
.clear { position: absolute; right: 8px; top: 8px; }
.mini { display: flex; align-items: center; gap: 12px; min-width: 0; font-size: 22px; font-weight: 800; }
.play { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: var(--accent); color: #000; }
.play:hover { transform: scale(1.04); background: var(--accent-hover); }
.right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.add { position: relative; }
.badge { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--accent); color: #000; font-size: 11px; display: grid; place-items: center; }
@media (max-width: 767px) {
  .topbar { padding: 0 16px; height: 56px; margin-bottom: -56px; }
  .nav, .add span:not(.badge) { display: none; }
  .add { width: 36px; height: 36px; padding: 0; }
  .search { width: 100%; }
}
</style>
