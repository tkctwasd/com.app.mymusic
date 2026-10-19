<script setup>
// Toàn màn hình (desktop): nền mờ từ ảnh bìa, bìa lớn, điều khiển tối giản; có thể hiện lời.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import Slider from '../ui/Slider.vue';
import Lyrics from '../media/Lyrics.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { fmtTime, img } from '../../utils.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi();
const t = computed(() => player.track);
const showLyrics = ref(false);
const seeking = ref(null);

onMounted(() => document.documentElement.requestFullscreen?.().catch(() => {}));
onBeforeUnmount(() => document.fullscreenElement && document.exitFullscreen?.().catch(() => {}));
const onFsChange = () => { if (!document.fullscreenElement) ui.fullscreen = false; };
onMounted(() => document.addEventListener('fullscreenchange', onFsChange));
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFsChange));
</script>

<template>
  <div class="fs">
    <div class="bg" :style="{ backgroundImage: t?.coverUrl ? `url(${img(t.coverUrl, 400)})` : '' }" />
    <header>
      <span class="ctx"><Icon name="music" size="18" /> {{ player.context?.name || 'My Music' }}</span>
      <button class="icon-btn round" title="Thoát (Esc)" @click="ui.fullscreen = false"><Icon name="minimize" /></button>
    </header>
    <main :class="{ split: showLyrics }">
      <div class="art">
        <Cover v-if="t" :src="t.coverUrl" :size="800" class="cv" />
        <div v-if="t" class="info">
          <h1>{{ t.title }}</h1>
          <p>{{ t.artist }}</p>
        </div>
      </div>
      <Lyrics v-if="showLyrics && t" big class="ly" />
    </main>
    <footer>
      <div class="progress">
        <span>{{ fmtTime(seeking ?? player.time) }}</span>
        <Slider :value="player.time" :max="player.duration || 1" label="Thanh tua" @input="seeking = $event" @change="player.seek($event); seeking = null" />
        <span>{{ fmtTime(player.duration) }}</span>
      </div>
      <div class="controls">
        <div class="side">
          <button v-if="t" class="icon-btn" :class="{ liked: t.liked }" @click="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="24" /></button>
        </div>
        <div class="mid">
          <button class="icon-btn" :class="{ on: player.shuffle }" @click="player.toggleShuffle()"><Icon name="shuffle" size="24" /></button>
          <button class="icon-btn" @click="player.prev()"><Icon name="prev" size="28" /></button>
          <button class="play" @click="player.toggle()"><Icon :name="player.playing ? 'pause' : 'play'" size="28" /></button>
          <button class="icon-btn" @click="player.next()"><Icon name="next" size="28" /></button>
          <button class="icon-btn" :class="{ on: player.repeat !== 'off' }" @click="player.cycleRepeat()"><Icon :name="player.repeat === 'one' ? 'repeatOne' : 'repeat'" size="24" /></button>
        </div>
        <div class="side right">
          <button class="icon-btn" :class="{ on: showLyrics }" title="Lời bài hát" @click="showLyrics = !showLyrics"><Icon name="lyrics" size="24" /></button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.fs { position: fixed; inset: 0; z-index: 750; display: flex; flex-direction: column; background: #000; overflow: hidden; }
.bg { position: absolute; inset: -60px; background-size: cover; background-position: center; filter: blur(60px) brightness(.45) saturate(1.3); transform: scale(1.1); }
header, main, footer { position: relative; }
header { display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; }
.ctx { display: flex; align-items: center; gap: 8px; font-weight: 700; }
main { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; gap: 48px; padding: 0 48px; }
.art { display: flex; align-items: flex-end; gap: 32px; max-width: 100%; }
.cv { width: min(42vh, 420px); border-radius: 8px; box-shadow: 0 16px 60px rgba(0,0,0,.6); }
.info h1 { font-size: clamp(28px, 4vw, 56px); font-weight: 900; line-height: 1.1; }
.info p { font-size: 20px; color: rgba(255,255,255,.75); margin: 8px 0 0; }
.split .art { flex-direction: column; align-items: flex-start; width: 40%; }
.split .cv { width: min(36vh, 360px); }
.ly { flex: 1; height: 100%; max-width: 640px; padding-top: 10vh; }
footer { padding: 16px 48px 40px; }
.progress { display: flex; align-items: center; gap: 12px; font-size: 13px; color: rgba(255,255,255,.75); }
.controls { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin-top: 12px; }
.mid { display: flex; align-items: center; gap: 24px; }
.side.right { display: flex; justify-content: flex-end; }
.icon-btn { width: 44px; height: 44px; color: rgba(255,255,255,.75); }
.play { width: 64px; height: 64px; border-radius: 50%; background: #fff; color: #000; display: grid; place-items: center; }
.play:hover { transform: scale(1.05); }
.liked { color: var(--accent); }
</style>
