<script setup>
import { ref, computed } from 'vue';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import PlayButton from '../components/media/PlayButton.vue';
import TrackList from '../components/media/TrackList.vue';
import Card from '../components/media/Card.vue';
import Shelf from '../components/media/Shelf.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useDominantColor } from '../composables/useDominantColor.js';
import { img, fmtTotal } from '../utils.js';

const props = defineProps({ name: String });
const lib = useLibrary(), player = usePlayer();
const artist = computed(() => lib.artists.find((a) => a.name === props.name));
const popular = computed(() => [...(artist.value?.tracks || [])].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)));
const albums = computed(() => lib.albums.filter((a) => a.artist === props.name));
const total = computed(() => popular.value.reduce((s, t) => s + (t.duration || 0), 0));
const showAll = ref(false);
const path = computed(() => `/artist/${encodeURIComponent(props.name)}`);
const ctx = computed(() => ({ name: props.name, path: path.value }));
const color = useDominantColor(() => artist.value?.coverUrl, () => props.name);
const playing = computed(() => player.context?.path === path.value && player.playing);
const play = () => player.toggleContext(popular.value, ctx.value);
function shufflePlay() {
  if (player.shuffle) return player.toggleShuffle();
  player.toggleShuffle();
  player.playTracks(popular.value, Math.floor(Math.random() * popular.value.length), ctx.value);
}
const albumPath = (a) => `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`;
</script>

<template>
  <div v-if="!artist" class="page"><p class="muted" style="padding-top: 40px">Không có bài nào của nghệ sĩ này.</p></div>
  <div v-else class="artist" :style="{ '--c': color }">
    <div class="banner"><div class="bg" :style="{ backgroundImage: artist.coverUrl ? `url(${img(artist.coverUrl, 600)})` : '' }" /></div>
    <div class="page">
      <header class="hd">
        <Cover :src="artist.coverUrl" :size="400" round icon="artist" class="av" />
        <div class="info">
          <span class="type"><Icon name="artist" size="14" /> Nghệ sĩ trong thư viện</span>
          <h1 class="display">{{ name }}</h1>
          <p class="muted">{{ artist.tracks.length }} bài · {{ fmtTotal(total) }} · {{ artist.plays }} lượt nghe</p>
          <div class="acts">
            <PlayButton :size="60" :playing="playing" @click="play" />
            <button class="round-btn" :class="{ on: player.shuffle }" title="Phát ngẫu nhiên" @click="shufflePlay"><Icon name="shuffle" size="20" /></button>
          </div>
        </div>
      </header>

      <div class="section-title"><h2>Phổ biến</h2><button v-if="popular.length > 5" @click="showAll = !showAll">{{ showAll ? 'Thu gọn' : `Xem cả ${popular.length} bài` }}</button></div>
      <TrackList :tracks="showAll ? popular : popular.slice(0, 5)" :context="ctx" />

      <Shelf v-if="albums.length" title="Album">
        <Card v-for="a in albums" :key="a.name" :to="albumPath(a)" :title="a.name" :sub="`${a.tracks.length} bài`" :cover="a.coverUrl" vinyl
          :playing="player.context?.path === albumPath(a) && player.playing" :active="player.context?.path === albumPath(a)"
          @play="player.toggleContext(a.tracks, { name: a.name, path: albumPath(a) })" />
      </Shelf>
    </div>
  </div>
</template>

<style scoped>
.artist { position: relative; min-height: 100%; }
.banner { position: absolute; top: calc(-1 * var(--nav-h)); left: 0; right: 0; height: 420px; overflow: hidden; pointer-events: none; }
.bg { position: absolute; inset: -60px; background-color: var(--c); background-size: cover; background-position: center; filter: blur(60px) saturate(1.4); opacity: .55; }
.banner::after { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent, var(--bg)); }
.page { position: relative; }
.hd { display: flex; align-items: flex-end; gap: 32px; padding: 32px 0 8px; }
.av { width: clamp(150px, 17vw, 210px); box-shadow: 0 24px 60px -20px rgb(0 0 0 / .55); }
.info { min-width: 0; }
.type { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; background: var(--hover); border: 1px solid var(--line); font-size: 12px; color: var(--text-2); }
h1 { font-size: clamp(32px, 5vw, 56px); font-weight: 600; line-height: 1.1; margin: 10px 0 6px; overflow-wrap: anywhere; }
.info p { margin: 0; }
.acts { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
.round-btn { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--hover); border: 1px solid var(--line); color: var(--text-2); }
.round-btn:hover { background: var(--press); color: var(--text); }
.round-btn.on { color: var(--accent); background: var(--accent-soft); }
@media (max-width: 767px) { .hd { flex-direction: column; align-items: center; text-align: center; gap: 16px; } .acts { justify-content: center; } }
</style>
