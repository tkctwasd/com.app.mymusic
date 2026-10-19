<script setup>
// Thanh trên kính mờ: logo, điều hướng Nghe · Kệ · Khám phá, ô Command bar (Ctrl+K), vòng tiến độ tải, cài đặt.
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../ui/Icon.vue';
import AppLogo from '../ui/AppLogo.vue';
import { usePlayer } from '../../stores/player.js';
import { useUi } from '../../stores/ui.js';
import { useLibrary } from '../../stores/library.js';

const player = usePlayer();
const ui = useUi(), lib = useLibrary(), route = useRoute(), router = useRouter();
const links = [
  { to: '/', name: 'Nghe', icon: 'listen', match: ['listen'] },
  { to: '/shelf', name: 'Kệ', icon: 'shelf', match: ['shelf', 'liked', 'songs', 'playlist', 'album', 'artist'] },
  { to: '/explore', name: 'Khám phá', icon: 'compass', match: ['explore'] },
];
const active = computed(() => links.findIndex((l) => l.match.includes(route.name)));
const isTop = computed(() => ['listen', 'shelf', 'explore'].includes(route.name));
const solid = computed(() => ui.scrollY > 8);

// Vòng tiến độ: trung bình % các job đang chạy
const progress = computed(() => {
  const a = lib.activeJobs;
  if (!a.length) return 1;
  return a.reduce((s, j) => s + (j.status === 'uploading' ? 100 : j.progress || 0), 0) / a.length / 100;
});
const C = 2 * Math.PI * 15;

// Nhấp nháy mục Kệ khi có bài mới tải xong
const pulsing = ref(false);
watch(() => ui.pulse, () => { pulsing.value = true; setTimeout(() => { pulsing.value = false; }, 1400); });
const brandHover = ref(false);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
</script>

<template>
  <header class="top" :class="{ solid }">
    <div class="left">
      <button v-if="!isTop" class="icon-btn back" title="Quay lại" @click="router.back()"><Icon name="chevronLeft" size="20" /></button>
      <RouterLink to="/" class="brand" @mouseenter="brandHover = true" @mouseleave="brandHover = false"><AppLogo :size="40" :animated="player.playing || brandHover" /><span class="display">My Music</span></RouterLink>
    </div>

    <nav v-if="!ui.isMobile" class="nav" :style="{ '--i': active }">
      <span v-if="active >= 0" class="ind" />
      <RouterLink v-for="(l, i) in links" :key="l.to" :to="l.to" class="nl" :class="{ on: active === i, pulse: pulsing && i === 1 }"><Icon :name="l.icon" size="17" />{{ l.name }}</RouterLink>
    </nav>

    <div class="right">
      <button v-if="!ui.isMobile" class="cmd" @click="ui.openCmd()">
        <Icon name="search" size="17" /><span class="ph">Tìm bài, nghệ sĩ hoặc dán link YouTube…</span><kbd>{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
      </button>
      <button v-else class="icon-btn" aria-label="Tìm / dán link" @click="ui.openCmd()"><Icon name="search" size="20" /></button>

      <button v-if="lib.jobs.length" class="icon-btn jobs" :class="{ busy: lib.activeJobs.length }" :title="lib.activeJobs.length ? `Đang tải ${lib.activeJobs.length} bài` : 'Danh sách tải'" @click="ui.jobsOpen = !ui.jobsOpen">
        <svg viewBox="0 0 36 36" class="ring"><circle cx="18" cy="18" r="15" class="bg" /><circle cx="18" cy="18" r="15" class="fg" :style="{ strokeDasharray: C, strokeDashoffset: C * (1 - progress) }" /></svg>
        <Icon name="download" size="16" />
        <span v-if="lib.activeJobs.length" class="badge">{{ lib.activeJobs.length }}</span>
      </button>
      <button class="icon-btn add" title="Thêm nhạc từ YouTube" @click="ui.openCmd('')"><Icon name="plus" size="20" /></button>
      <button class="icon-btn" title="Cài đặt" @click="ui.open('settings')"><Icon name="settings" size="19" /></button>
    </div>
  </header>
</template>

<style scoped>
.top { position: fixed; z-index: 300; top: 0; left: 0; right: 0; height: var(--nav-h); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; padding: 0 20px;
  transition: background .3s, border-color .3s, backdrop-filter .3s; border-bottom: 1px solid transparent; }
.top.solid { background: var(--glass); backdrop-filter: blur(20px) saturate(1.5); -webkit-backdrop-filter: blur(20px) saturate(1.5); border-bottom-color: var(--line); }
.left { display: flex; align-items: center; gap: 4px; min-width: 0; }
.brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 12px; }
.brand :deep(.logo) { border-radius: 10px; filter: drop-shadow(0 4px 10px rgb(0 0 0 / .3)); }
.brand span { font-size: 16px; font-weight: 600; white-space: nowrap; }

.nav { position: relative; display: flex; padding: 4px; border-radius: 999px; background: var(--hover); border: 1px solid var(--line); }
.ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / 3); border-radius: 999px; background: var(--surface-3); box-shadow: 0 2px 8px rgb(0 0 0 / .15);
  transform: translateX(calc(var(--i) * 100%)); transition: transform .45s var(--spring); }
.nl { position: relative; display: flex; align-items: center; justify-content: center; gap: 7px; width: 116px; height: 36px; border-radius: 999px; font-weight: 500; color: var(--text-2); transition: color .2s; }
.nl:hover, .nl.on { color: var(--text); }
.nl.pulse { animation: pulse 1.4s var(--ease); }
@keyframes pulse { 30% { color: var(--accent); transform: scale(1.08); } }

.right { display: flex; align-items: center; justify-content: flex-end; gap: 4px; min-width: 0; }
.cmd { display: flex; align-items: center; gap: 10px; height: 40px; width: min(340px, 100%); padding: 0 8px 0 14px; margin-right: 6px; border-radius: 999px; background: var(--hover); border: 1px solid var(--line); color: var(--text-3); transition: background .2s, border-color .2s; min-width: 0; }
.cmd:hover { background: var(--press); border-color: var(--line-2); color: var(--text-2); }
.ph { flex: 1; text-align: left; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jobs { position: relative; }
.ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.ring circle { fill: none; stroke-width: 2.5; }
.ring .bg { stroke: var(--line); }
.ring .fg { stroke: var(--accent); stroke-linecap: round; transition: stroke-dashoffset .4s var(--ease); }
.jobs:not(.busy) .fg { opacity: .5; }
.badge { position: absolute; top: -2px; right: -2px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font-size: 10px; font-weight: 700; display: grid; place-items: center; }
.add { background: var(--accent-soft); color: var(--accent); }
.add:hover { background: var(--accent); color: var(--accent-ink); }

@media (max-width: 1100px) { .ph { display: none; } .cmd { width: auto; } }
@media (max-width: 767px) {
  .top { grid-template-columns: 1fr auto; padding: 0 8px 0 12px; height: 56px; padding-top: env(safe-area-inset-top); height: calc(56px + env(safe-area-inset-top)); }
  .brand span { font-size: 15px; }
}
</style>
