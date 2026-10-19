<script setup>
// Full player (mobile): trượt lên; vuốt xuống để đóng, vuốt trái/phải trên ảnh bìa để đổi bài.
import { ref, computed } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import Slider from '../ui/Slider.vue';
import Lyrics from '../media/Lyrics.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { fmtTime } from '../../utils.js';
import { useDominantColor } from '../../composables/useDominantColor.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi();
const trackMenu = useTrackMenu();
const t = computed(() => player.track);
const color = useDominantColor(() => t.value?.coverUrl, () => t.value?.title);
const seeking = ref(null);
const dy = ref(0), dx = ref(0);
let start = null;

function down(e) { start = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }; }
function move(e) {
  if (!start) return;
  const x = e.touches[0].clientX - start.x, y = e.touches[0].clientY - start.y;
  if (!start.axis && Math.hypot(x, y) > 10) start.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y';
  if (start.axis === 'y') dy.value = Math.max(0, y);
  if (start.axis === 'x' && e.target.closest('.cv-wrap')) dx.value = x;
}
function up() {
  if (dy.value > 120) ui.fullPlayer = false;
  if (dx.value < -80) player.next();
  if (dx.value > 80) player.prev();
  dy.value = dx.value = 0; start = null;
}
</script>

<template>
  <Transition name="slide-up">
    <div v-if="ui.fullPlayer && t" class="fp" :style="{ '--c': color, transform: dy ? `translateY(${dy}px)` : '' , transition: dy ? 'none' : '' }"
      @touchstart.passive="down" @touchmove.passive="move" @touchend="up">
      <header>
        <button class="icon-btn" aria-label="Thu nhỏ" @click="ui.fullPlayer = false"><Icon name="chevronDown" size="26" /></button>
        <div class="ctx"><small>ĐANG PHÁT TỪ</small><b class="ellipsis">{{ player.context?.name || 'Thư viện' }}</b></div>
        <button class="icon-btn" aria-label="Tùy chọn" @click="trackMenu($event, t)"><Icon name="more" size="22" /></button>
      </header>
      <div class="cv-wrap" :style="{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : 'transform .2s' }">
        <Cover :src="t.coverUrl" :size="800" class="cv" />
      </div>
      <div class="meta">
        <div class="txt"><h2 class="ellipsis">{{ t.title }}</h2><p class="ellipsis">{{ t.artist }}</p></div>
        <button class="icon-btn" :class="{ liked: t.liked }" @click="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="26" /></button>
      </div>
      <Slider :value="player.time" :max="player.duration || 1" label="Thanh tua" class="seek" @input="seeking = $event" @change="player.seek($event); seeking = null" />
      <div class="times"><span>{{ fmtTime(seeking ?? player.time) }}</span><span>-{{ fmtTime(player.duration - (seeking ?? player.time)) }}</span></div>
      <div class="controls">
        <button class="icon-btn" :class="{ on: player.shuffle }" @click="player.toggleShuffle()"><Icon name="shuffle" size="24" /></button>
        <button class="icon-btn" @click="player.prev()"><Icon name="prev" size="32" /></button>
        <button class="play" @click="player.toggle()"><Icon :name="player.playing ? 'pause' : 'play'" size="30" /></button>
        <button class="icon-btn" @click="player.next()"><Icon name="next" size="32" /></button>
        <button class="icon-btn" :class="{ on: player.repeat !== 'off' }" @click="player.cycleRepeat()"><Icon :name="player.repeat === 'one' ? 'repeatOne' : 'repeat'" size="24" /></button>
      </div>
      <div class="lyr-card">
        <b>Lời bài hát</b>
        <div class="lyr"><Lyrics /></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fp { position: fixed; inset: 0; z-index: 500; overflow-y: auto; padding: calc(8px + env(safe-area-inset-top)) 24px 32px; background: linear-gradient(var(--c), color-mix(in srgb, var(--c) 30%, #121212) 70%); transition: transform .3s var(--ease); }
header { display: flex; align-items: center; justify-content: space-between; height: 56px; }
.ctx { text-align: center; min-width: 0; display: flex; flex-direction: column; }
.ctx small { font-size: 10px; letter-spacing: .1em; color: rgba(255,255,255,.7); }
.ctx b { font-size: 13px; }
.icon-btn { color: #fff; width: 44px; height: 44px; }
.cv-wrap { margin: 24px 0 32px; }
.cv { width: 100%; border-radius: 8px; box-shadow: 0 8px 40px rgba(0,0,0,.5); }
.meta { display: flex; align-items: center; gap: 12px; }
.txt { flex: 1; min-width: 0; }
h2 { font-size: 22px; font-weight: 800; }
.meta p { margin: 2px 0 0; color: rgba(255,255,255,.7); }
.liked { color: var(--accent); }
.seek { margin-top: 16px; }
.times { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,.7); }
.controls { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.play { width: 64px; height: 64px; border-radius: 50%; background: #fff; color: #000; display: grid; place-items: center; }
.lyr-card { margin-top: 32px; padding: 16px; border-radius: 12px; background: color-mix(in srgb, var(--c) 80%, #000); }
.lyr { height: 320px; margin-top: 8px; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform .3s var(--ease); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
