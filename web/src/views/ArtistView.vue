<script setup>
import { ref, computed } from 'vue';
import Icon from '../components/ui/Icon.vue';
import PlayButton from '../components/media/PlayButton.vue';
import TrackTable from '../components/media/TrackTable.vue';
import Card from '../components/media/Card.vue';
import CardRow from '../components/media/CardRow.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { usePage } from '../composables/usePage.js';
import { useDominantColor } from '../composables/useDominantColor.js';
import { img } from '../utils.js';

const props = defineProps({ name: String });
const lib = useLibrary(), player = usePlayer();
const artist = computed(() => lib.artists.find((a) => a.name === props.name));
const popular = computed(() => [...(artist.value?.tracks || [])].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)));
const albums = computed(() => lib.albums.filter((a) => a.artist === props.name));
const showAll = ref(false);
const path = computed(() => `/artist/${encodeURIComponent(props.name)}`);
const ctx = computed(() => ({ name: props.name, path: path.value }));
const color = useDominantColor(() => artist.value?.coverUrl, () => props.name);
const playing = computed(() => player.context?.path === path.value && player.playing);
const play = () => player.toggleContext(popular.value, ctx.value);
usePage(() => ({ color: color.value, title: props.name, play, playing: playing.value }));
</script>

<template>
  <div v-if="!artist" class="page"><p class="muted" style="padding-top: 80px">Không có bài nào của nghệ sĩ này.</p></div>
  <div v-else class="artist" :style="{ '--c': color }">
    <header class="banner">
      <div class="bg" :style="{ backgroundImage: artist.coverUrl ? `url(${img(artist.coverUrl, 800)})` : '' }" />
      <div class="txt">
        <span class="verified"><Icon name="checkCircle" size="22" class="v" /> Nghệ sĩ trong thư viện</span>
        <h1>{{ name }}</h1>
        <p>{{ artist.tracks.length }} bài hát · {{ artist.plays }} lượt nghe</p>
      </div>
    </header>
    <div class="body">
      <div class="actions">
        <PlayButton :size="56" :playing="playing" @click="play" />
        <button class="icon-btn big" :class="{ on: player.shuffle }" title="Phát ngẫu nhiên" @click="player.shuffle || player.toggleShuffle(); player.playTracks(popular, Math.floor(Math.random() * popular.length), ctx)"><Icon name="shuffle" size="28" /></button>
      </div>
      <h2 class="h">Phổ biến</h2>
      <TrackTable :tracks="showAll ? popular : popular.slice(0, 5)" :context="ctx" :show-header="false" :show-added="false" />
      <button v-if="popular.length > 5" class="more" @click="showAll = !showAll">{{ showAll ? 'Ẩn bớt' : 'Xem thêm' }}</button>
      <div v-if="albums.length" class="page">
        <CardRow title="Album">
          <Card v-for="a in albums" :key="a.name" :to="`/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`" :title="a.name" :sub="`Album · ${a.tracks.length} bài`" :cover="a.coverUrl"
            :playing="player.context?.path === `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}` && player.playing"
            @play="player.toggleContext(a.tracks, { name: a.name, path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}` })" />
        </CardRow>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banner { position: relative; height: clamp(280px, 40vh, 400px); display: flex; align-items: flex-end; overflow: hidden; background: var(--c); }
.bg { position: absolute; inset: 0; background-size: cover; background-position: center 30%; }
.bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 30%, rgba(0,0,0,.6)); }
.txt { position: relative; padding: 24px; }
.verified { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.v { color: #4cb3ff; }
h1 { font-size: clamp(40px, 7vw, 96px); font-weight: 900; letter-spacing: -.04em; line-height: 1.05; margin: 8px 0; }
.txt p { margin: 0; }
.body { background: linear-gradient(color-mix(in srgb, var(--c) 40%, #121212), var(--surface) 240px); padding-bottom: 32px; }
.actions { display: flex; align-items: center; gap: 24px; padding: 24px; }
.icon-btn.big { width: 40px; height: 40px; }
.h { font-size: 24px; font-weight: 800; padding: 0 24px 16px; }
.more { margin: 16px 40px 0; font-weight: 700; color: var(--text-2); font-size: 14px; }
.more:hover { color: #fff; }
@media (max-width: 767px) { .h { padding: 0 16px 8px; } .actions { padding: 16px; } }
</style>
