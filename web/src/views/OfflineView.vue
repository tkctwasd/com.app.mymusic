<script setup>
// Trang "Nghe offline": các bài đã tải về máy (Cache Storage), phát được cả khi mất mạng.
import { computed } from 'vue';
import Icon from '../components/ui/Icon.vue';
import TrackList from '../components/media/TrackList.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { offline } from '../offline.js';

const lib = useLibrary(), player = usePlayer();
const tracks = computed(() => lib.tracks.filter((t) => offline.ids.includes(t.id)));
const ctx = { name: 'Nghe offline', path: '/offline' };
const isPlaying = computed(() => player.context?.path === ctx.path && player.playing);
const playAll = () => player.toggleContext(tracks.value, ctx);
</script>

<template>
  <div class="page offline">
    <header class="head">
      <div>
        <h1 class="display">Nghe offline</h1>
        <p class="muted">{{ tracks.length }} bài đã tải về máy · nghe được cả khi không có mạng</p>
      </div>
      <button v-if="tracks.length" class="btn btn-primary" @click="playAll">
        <Icon :name="isPlaying ? 'pause' : 'play'" size="16" /> {{ isPlaying ? 'Tạm dừng' : 'Phát tất cả' }}
      </button>
    </header>

    <TrackList v-if="tracks.length" :tracks="tracks" :context="ctx" />
    <p v-else class="muted empty">Chưa có bài nào được tải offline. Mở menu ⋯ của một bài và chọn "Tải để nghe offline".</p>
  </div>
</template>

<style scoped>
.offline { padding-top: 16px; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.head h1 { font-size: clamp(28px, 3.4vw, 40px); font-weight: 600; }
.head p { margin: 4px 0 0; }
.empty { padding: 40px 0; text-align: center; }
</style>
