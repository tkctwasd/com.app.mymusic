<script setup>
import { ref, computed } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import Slider from '../ui/Slider.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { fmtTime } from '../../utils.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi();
const trackMenu = useTrackMenu();
const seeking = ref(null);
const t = computed(() => player.track);
const volIcon = computed(() => (player.muted || !player.volume ? 'volumeX' : player.volume < 0.5 ? 'volumeLow' : 'volume'));
const repeatTitle = { off: 'Bật lặp lại', all: 'Bật lặp lại một bài', one: 'Tắt lặp lại' };

function sleepMenu(e) {
  const on = player.sleep;
  ui.openMenu(e, [
    ...[5, 15, 30, 45, 60, 90].map((m) => ({ label: `${m} phút`, fn: () => { player.setSleep(m); ui.toast(`Sẽ dừng phát sau ${m} phút`); } })),
    { label: 'Hết bài này', fn: () => { player.setSleep('end'); ui.toast('Sẽ dừng khi hết bài này'); } },
    on && { sep: true },
    on && { label: 'Tắt hẹn giờ', icon: 'x', fn: () => { player.setSleep(null); ui.toast('Đã tắt hẹn giờ'); } },
  ].filter(Boolean));
}
</script>

<template>
  <footer class="bar">
    <div class="left">
      <template v-if="t">
        <button class="cv-btn" aria-label="Mở Now Playing" @click="ui.togglePanel('now')"><Cover :src="t.coverUrl" :size="112" class="cv" /></button>
        <div class="meta">
          <RouterLink :to="player.context?.path || '/songs'" class="title ellipsis link">{{ t.title }}</RouterLink>
          <RouterLink :to="`/artist/${encodeURIComponent(t.artist)}`" class="artist ellipsis link">{{ t.artist }}</RouterLink>
        </div>
        <button class="icon-btn" :class="{ liked: t.liked }" :aria-label="t.liked ? 'Bỏ thích' : 'Thích'" @click="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="18" /></button>
        <button class="icon-btn" aria-label="Tùy chọn" @click="trackMenu($event, t)"><Icon name="more" size="18" /></button>
      </template>
    </div>

    <div class="center">
      <div class="controls">
        <button class="icon-btn" :class="{ on: player.shuffle }" :title="player.shuffle ? 'Tắt trộn bài' : 'Trộn bài'" @click="player.toggleShuffle()"><Icon name="shuffle" size="18" /></button>
        <button class="icon-btn" title="Bài trước" @click="player.prev()"><Icon name="prev" size="18" /></button>
        <button class="play" :title="player.playing ? 'Tạm dừng' : 'Phát'" @click="player.toggle()">
          <span v-if="player.buffering && player.playing" class="spin" />
          <Icon v-else :name="player.playing ? 'pause' : 'play'" size="18" />
        </button>
        <button class="icon-btn" title="Bài tiếp" @click="player.next()"><Icon name="next" size="18" /></button>
        <button class="icon-btn" :class="{ on: player.repeat !== 'off' }" :title="repeatTitle[player.repeat]" @click="player.cycleRepeat()"><Icon :name="player.repeat === 'one' ? 'repeatOne' : 'repeat'" size="18" /></button>
      </div>
      <div class="progress">
        <span>{{ fmtTime(seeking ?? player.time) }}</span>
        <Slider :value="player.time" :max="player.duration || 1" :wheel-step="5" label="Thanh tua" @input="seeking = $event" @change="player.seek($event); seeking = null" />
        <span>{{ fmtTime(player.duration) }}</span>
      </div>
    </div>

    <div class="right">
      <button class="icon-btn" :class="{ on: ui.rightPanel === 'now' }" title="Đang phát" @click="ui.togglePanel('now')"><Icon name="nowPlaying" size="18" /></button>
      <button class="icon-btn" :class="{ on: ui.rightPanel === 'lyrics' }" title="Lời bài hát" @click="ui.togglePanel('lyrics')"><Icon name="lyrics" size="18" /></button>
      <button class="icon-btn" :class="{ on: ui.rightPanel === 'queue' }" title="Hàng đợi" @click="ui.togglePanel('queue')"><Icon name="queue" size="18" /></button>
      <button class="icon-btn sleep" :class="{ on: player.sleep }" title="Hẹn giờ tắt" @click="sleepMenu">
        <Icon name="moon" size="18" />
        <small v-if="player.sleep">{{ player.sleep.mode === 'end' ? 'hết bài' : fmtTime(player.sleepLeft) }}</small>
      </button>
      <button class="icon-btn" :title="player.muted ? 'Bật tiếng' : 'Tắt tiếng'" @click="player.toggleMute()"><Icon :name="volIcon" size="18" /></button>
      <Slider class="vol" :value="player.muted ? 0 : player.volume" :max="1" :wheel-step="0.05" label="Âm lượng" @input="player.setVolume($event)" @change="player.setVolume($event)" />
      <button class="icon-btn" title="Toàn màn hình" @click="ui.fullscreen = true"><Icon name="maximize" size="18" /></button>
    </div>
  </footer>
</template>

<style scoped>
.bar { grid-area: player; display: grid; grid-template-columns: minmax(180px, 30%) 1fr minmax(180px, 30%); align-items: center; gap: 8px; height: var(--player-h); padding: 0 8px; }
.left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cv-btn { flex-shrink: 0; }
.cv { width: 56px; }
.meta { display: flex; flex-direction: column; min-width: 0; }
.title { font-size: 14px; }
.artist { font-size: 12px; color: var(--text-2); }
.artist:hover { color: #fff; }
.liked { color: var(--accent); }
.center { display: flex; flex-direction: column; align-items: center; gap: 4px; max-width: 722px; width: 100%; justify-self: center; }
.controls { display: flex; align-items: center; gap: 16px; }
.play { width: 32px; height: 32px; border-radius: 50%; background: #fff; color: #000; display: grid; place-items: center; transition: transform .1s; }
.play:hover { transform: scale(1.06); }
.progress { display: flex; align-items: center; gap: 8px; width: 100%; font-size: 12px; color: var(--text-2); }
.progress span { min-width: 40px; text-align: center; font-variant-numeric: tabular-nums; }
.right { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.vol { max-width: 93px; }
.sleep { width: auto; min-width: 32px; padding: 0 4px; gap: 4px; display: inline-flex; border-radius: 16px; }
.sleep small { font-size: 11px; font-variant-numeric: tabular-nums; }
.sleep.on::after { display: none; }
.spin { width: 16px; height: 16px; border: 2px solid #bbb; border-top-color: #000; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 1100px) { .right .icon-btn:first-child, .vol { display: none; } }
</style>
