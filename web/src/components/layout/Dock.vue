<script setup>
// Dock nổi giữa đáy màn hình: bìa + tên, điều khiển chính, waveform, thích, âm lượng; nhấn ⌃ / bìa / vuốt lên để mở Stage.
// Mobile: dạng gọn nằm trên thanh điều hướng, vuốt trái/phải đổi bài, chạm để mở Stage.
import { ref, computed } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import Slider from '../ui/Slider.vue';
import Waveform from '../media/Waveform.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { fmtTime } from '../../utils.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi();
const trackMenu = useTrackMenu();
const t = computed(() => player.track);
const pct = computed(() => (player.duration ? (player.time / player.duration) * 100 : 0));
const volIcon = computed(() => (player.muted || !player.volume ? 'volumeX' : player.volume < 0.5 ? 'volumeLow' : 'volume'));

// Cử chỉ: vuốt ngang đổi bài, vuốt lên mở Stage
const dx = ref(0);
let start = null;
function tStart(e) { start = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }; }
function tMove(e) {
  if (!start) return;
  const x = e.touches[0].clientX - start.x, y = e.touches[0].clientY - start.y;
  if (!start.axis && Math.hypot(x, y) > 10) start.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y';
  if (start.axis === 'x') dx.value = x;
  if (start.axis === 'y' && y < -40) { ui.openStage(); start = null; }
}
function tEnd() {
  if (dx.value < -70) player.next();
  if (dx.value > 70) player.prev();
  dx.value = 0; start = null;
}
function wheelVol(e) { e.preventDefault(); player.setVolume(player.volume + (e.deltaY < 0 ? 0.05 : -0.05)); }
</script>

<template>
  <Transition name="dock">
    <div v-if="!ui.stage" class="dock" :class="{ mobile: ui.isMobile, empty: !t }" @contextmenu="t && trackMenu($event, t)">
      <!-- Chưa có bài -->
      <template v-if="!t">
        <span class="hint"><Icon name="sparkle" size="18" /> Chọn một bài để bắt đầu, hoặc</span>
        <button class="btn btn-primary" :disabled="!lib.tracks.length" @click="player.toggle()"><Icon name="shuffle" size="16" /> Phát cả thư viện</button>
      </template>

      <!-- Mobile -->
      <template v-else-if="ui.isMobile">
        <div class="m-main" :style="{ transform: dx ? `translateX(${dx * 0.4}px)` : '', transition: dx ? 'none' : '' }"
          @click="ui.openStage()" @touchstart.passive="tStart" @touchmove.passive="tMove" @touchend="tEnd">
          <Cover :src="t.coverUrl" :size="192" class="cv disc" :class="{ rolling: player.playing }" />
          <div class="meta"><div class="title ellipsis">{{ t.title }}</div><div class="artist ellipsis">{{ t.artist }}</div></div>
        </div>
        <button class="icon-btn" :class="{ liked: t.liked }" :aria-label="t.liked ? 'Bỏ thích' : 'Thích'" @click="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="22" /></button>
        <button class="play sm" :aria-label="player.playing ? 'Tạm dừng' : 'Phát'" @click="player.toggle()"><Icon :name="player.playing ? 'pause' : 'play'" size="20" /></button>
        <div class="line"><div :style="{ width: pct + '%' }" /></div>
      </template>

      <!-- Desktop -->
      <template v-else>
        <button class="cv-btn" title="Mở màn hình đang phát" @click="ui.openStage()"><Cover :src="t.coverUrl" :size="192" class="cv disc" :class="{ rolling: player.playing }" /></button>
        <div class="meta">
          <button class="title ellipsis" @click="ui.openStage()">{{ t.title }}</button>
          <RouterLink :to="`/artist/${encodeURIComponent(t.artist)}`" class="artist ellipsis link">{{ t.artist }}</RouterLink>
        </div>
        <div class="ctrls">
          <button class="icon-btn" title="Bài trước (Shift+←)" @click="player.prev()"><Icon name="prev" size="18" /></button>
          <button class="play" :title="player.playing ? 'Tạm dừng (Space)' : 'Phát (Space)'" @click="player.toggle()">
            <span v-if="player.buffering && player.playing" class="spin" />
            <Icon v-else :name="player.playing ? 'pause' : 'play'" size="20" />
          </button>
          <button class="icon-btn" title="Bài tiếp (Shift+→)" @click="player.next()"><Icon name="next" size="18" /></button>
        </div>
        <div class="wave-wrap">
          <span class="time">{{ fmtTime(player.time) }}</span>
          <Waveform :track="t" :value="player.time" :max="player.duration || 1" :bars="64" :height="30" @seek="player.seek($event)" />
          <span class="time">{{ fmtTime(player.duration) }}</span>
        </div>
        <button class="icon-btn" :class="{ liked: t.liked }" :title="t.liked ? 'Bỏ thích (L)' : 'Thích (L)'" @click="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="18" /></button>
        <div class="vol" @wheel="wheelVol">
          <button class="icon-btn" :title="player.muted ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'" @click="player.toggleMute()"><Icon :name="volIcon" size="18" /></button>
          <div class="vol-pop"><Slider :value="player.muted ? 0 : player.volume" :max="1" :wheel-step="0.05" label="Âm lượng" @input="player.setVolume($event)" @change="player.setVolume($event)" /></div>
        </div>
        <span v-if="player.sleep" class="sleep" title="Hẹn giờ tắt" @click="ui.openStage()"><Icon name="moon" size="14" />{{ player.sleep.mode === 'end' ? 'hết bài' : fmtTime(player.sleepLeft) }}</span>
        <button class="icon-btn up" title="Mở màn hình đang phát" @click="ui.openStage()"><Icon name="chevronUp" size="20" /></button>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.dock { position: fixed; z-index: 200; left: 50%; bottom: 20px; transform: translateX(-50%); width: min(820px, calc(100% - 32px)); height: var(--dock-h);
  display: flex; align-items: center; gap: 10px; padding: 0 12px 0 10px; border-radius: var(--r-xl);
  background: var(--glass); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid var(--line); box-shadow: var(--shadow-lg); }
.dock.empty { justify-content: center; gap: 14px; width: auto; padding: 0 12px 0 22px; }
.hint { display: flex; align-items: center; gap: 8px; color: var(--text-2); }
.cv-btn { flex-shrink: 0; border-radius: 50%; }
.cv-btn:hover .disc { box-shadow: 0 0 0 2px var(--accent), 0 6px 16px -6px rgb(0 0 0 / .5); }
.cv { width: 52px; --cover-r: 14px; }
.meta { display: flex; flex-direction: column; min-width: 0; width: 170px; flex-shrink: 1; }
.title { font-weight: 600; text-align: left; }
.artist { font-size: 12.5px; color: var(--text-2); }
.ctrls { display: flex; align-items: center; gap: 2px; }
.play { width: 44px; height: 44px; border-radius: 50%; background: var(--text); color: var(--bg); display: grid; place-items: center; transition: transform .2s var(--spring); flex-shrink: 0; }
.play:hover { transform: scale(1.08); }
.play:active { transform: scale(.94); }
.play.sm { width: 40px; height: 40px; }
.wave-wrap { flex: 1; min-width: 120px; display: flex; align-items: center; gap: 8px; }
.time { font-size: 11px; color: var(--text-3); font-variant-numeric: tabular-nums; min-width: 32px; text-align: center; }
.vol { position: relative; }
.vol-pop { position: absolute; bottom: calc(100% + 14px); left: 50%; transform: translateX(-50%) translateY(6px); width: 140px; padding: 10px 14px; border-radius: 14px;
  background: var(--glass-strong); backdrop-filter: blur(20px); border: 1px solid var(--line); box-shadow: var(--shadow); opacity: 0; pointer-events: none; transition: all .2s var(--ease); }
.vol:hover .vol-pop, .vol:focus-within .vol-pop { opacity: 1; pointer-events: auto; transform: translateX(-50%); }
.vol-pop::after { content: ''; position: absolute; top: 100%; left: 0; right: 0; height: 16px; }
.sleep { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border-radius: 13px; background: var(--accent-soft); color: var(--accent); font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; cursor: pointer; flex-shrink: 0; }
.disc { border-radius: 50% !important; --cover-r: 50%; animation: disc 9s linear infinite paused;
  /* Giữ nét khi xoay: lớp GPU riêng, ảnh gốc 2x độ phân giải hiển thị */
  will-change: transform; backface-visibility: hidden; transform: translateZ(0);
  box-shadow: 0 0 0 2px var(--line-2), 0 6px 16px -6px rgb(0 0 0 / .5); }
.disc.rolling { animation-play-state: running; }
/* Lỗ giữa đĩa than */
.disc::after { content: ''; position: absolute; inset: 40%; border-radius: 50%; background: var(--surface); box-shadow: 0 0 0 3px rgb(0 0 0 / .35); }
@keyframes disc { from { transform: translateZ(0) rotate(0); } to { transform: translateZ(0) rotate(360deg); } }
.cv-btn:hover .disc.rolling { animation-play-state: paused; }
.spin { width: 18px; height: 18px; border: 2px solid color-mix(in oklab, var(--bg) 40%, transparent); border-top-color: var(--bg); border-radius: 50%; animation: spin .8s linear infinite; }
@media (max-width: 1000px) { .meta { width: 120px; } .time { display: none; } }

/* Mobile */
.dock.mobile { bottom: calc(var(--mnav-h) + env(safe-area-inset-bottom) + 8px); width: calc(100% - 16px); height: 64px; padding: 0 8px 0 8px; gap: 4px; border-radius: 22px; overflow: hidden; }
.dock.mobile.empty { display: none; }
.m-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; transition: transform .25s var(--ease); }
.mobile .cv { width: 46px; --cover-r: 12px; }
.mobile .meta { width: auto; flex: 1; }
.line { position: absolute; left: 18px; right: 18px; bottom: 0; height: 2px; border-radius: 1px; background: var(--line); }
.line div { height: 100%; background: var(--accent); border-radius: 1px; }

.dock-enter-active, .dock-leave-active { transition: transform .4s var(--spring), opacity .25s; }
.dock-enter-from, .dock-leave-to { opacity: 0; transform: translateX(-50%) translateY(40px) scale(.96); }
</style>
