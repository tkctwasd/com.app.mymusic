<script setup>
// Mini player (mobile): nổi trên bottom nav, chạm để mở full player
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { useDominantColor } from '../../composables/useDominantColor.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi();
const t = computed(() => player.track);
const color = useDominantColor(() => t.value?.coverUrl, () => t.value?.title);
const pct = computed(() => (player.duration ? (player.time / player.duration) * 100 : 0));
</script>

<template>
  <div v-if="t" class="mini" :style="{ background: color }" @click="ui.fullPlayer = true">
    <Cover :src="t.coverUrl" :size="96" class="cv" />
    <div class="meta"><div class="ellipsis title">{{ t.title }}</div><div class="ellipsis artist">{{ t.artist }}</div></div>
    <button class="icon-btn" :class="{ liked: t.liked }" @click.stop="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="22" /></button>
    <button class="icon-btn pp" @click.stop="player.toggle()"><Icon :name="player.playing ? 'pause' : 'play'" size="22" /></button>
    <div class="bar"><div :style="{ width: pct + '%' }" /></div>
  </div>
</template>

<style scoped>
.mini { position: relative; display: flex; align-items: center; gap: 8px; margin: 0 8px; padding: 8px; border-radius: 6px; overflow: hidden; transition: background .4s; }
.cv { width: 40px; }
.meta { flex: 1; min-width: 0; font-size: 13px; }
.title { font-weight: 700; }
.artist { color: rgba(255,255,255,.7); }
.icon-btn { color: #fff; width: 40px; height: 40px; }
.liked { color: var(--accent); }
.bar { position: absolute; left: 8px; right: 8px; bottom: 0; height: 2px; background: rgba(255,255,255,.3); border-radius: 1px; }
.bar div { height: 100%; background: #fff; }
</style>
