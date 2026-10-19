<script setup>
import { ref, computed } from 'vue';
import Cover from '../components/ui/Cover.vue';
import Icon from '../components/ui/Icon.vue';
import Card from '../components/media/Card.vue';
import CardRow from '../components/media/CardRow.vue';
import PlayButton from '../components/media/PlayButton.vue';
import EqBars from '../components/media/EqBars.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { usePage } from '../composables/usePage.js';
import { useDominantColor } from '../composables/useDominantColor.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi();
const h = new Date().getHours();
const greeting = h < 5 ? 'Chúc ngủ ngon' : h < 11 ? 'Chào buổi sáng' : h < 13 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

// Lưới truy cập nhanh: Bài hát đã thích + playlist/album nghe gần đây
const quick = computed(() => {
  const list = [{ key: 'liked', name: 'Bài hát đã thích', path: '/liked', liked: true, tracks: lib.liked, at: Infinity }];
  for (const p of lib.playlists) {
    const ts = lib.playlistTracks(p);
    list.push({ key: p.id, name: p.name, path: `/playlist/${p.id}`, mosaic: ts.map((t) => t.coverUrl).filter(Boolean), tracks: ts, at: Math.max(p.createdAt, ...ts.map((t) => t.lastPlayedAt || 0)) });
  }
  for (const a of lib.albums) list.push({ key: a.name + a.artist, name: a.name, path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`, cover: a.coverUrl, tracks: a.tracks, at: Math.max(...a.tracks.map((t) => t.lastPlayedAt || 0)) });
  return list.sort((a, b) => b.at - a.at).slice(0, 8);
});

const hover = ref(null);
const hoverCover = computed(() => hover.value?.cover || hover.value?.mosaic?.[0] || '');
const color = useDominantColor(hoverCover, () => (hover.value?.liked ? '' : hover.value?.name || 'home'));
const bg = computed(() => (hover.value?.liked ? '#4d38a0' : hover.value ? color.value : '#3a3a5a'));
usePage(() => ({ color: bg.value }));

const ctxPlaying = (path) => player.context?.path === path && player.playing;
const playCtx = (it) => player.toggleContext(it.tracks, { name: it.name, path: it.path });
const playTrack = (t, list, ctx) => (player.isCurrent(t) ? player.toggle() : player.playTracks(list, list.indexOf(t), ctx));

const recent = computed(() => lib.recent.slice(0, 10));
const newest = computed(() => lib.tracks.slice(0, 10));
const topTracks = computed(() => [...lib.tracks].filter((t) => t.playCount).sort((a, b) => b.playCount - a.playCount).slice(0, 10));
</script>

<template>
  <div class="home">
    <div class="glow" :style="{ background: `linear-gradient(${bg}, transparent)` }" />
    <div class="page inner">
      <h1>{{ greeting }}</h1>

      <div v-if="!lib.tracks.length" class="empty">
        <Icon name="music" size="56" />
        <h2>Thư viện của bạn đang trống</h2>
        <p class="muted">Dán một link YouTube để bắt đầu nghe nhạc.</p>
        <button class="btn btn-light big" @click="ui.open('import')"><Icon name="plus" size="18" /> Thêm nhạc từ YouTube</button>
      </div>

      <template v-else>
        <div class="quick">
          <RouterLink v-for="it in quick" :key="it.key" :to="it.path" class="q" @mouseenter="hover = it" @mouseleave="hover = null">
            <Cover :src="it.cover" :mosaic="it.mosaic" :liked="it.liked" :size="160" class="qcv" />
            <span class="qname">{{ it.name }}</span>
            <EqBars v-if="ctxPlaying(it.path)" class="qeq" />
            <PlayButton class="qpb" :size="36" :playing="ctxPlaying(it.path)" @click.prevent.stop="playCtx(it)" />
          </RouterLink>
        </div>

        <CardRow v-if="recent.length" title="Nghe gần đây">
          <Card v-for="t in recent" :key="t.id" :to="`/artist/${encodeURIComponent(t.artist)}`" :title="t.title" :sub="t.artist" :cover="t.coverUrl"
            :playing="player.isCurrent(t) && player.playing" @play="playTrack(t, recent, { name: 'Nghe gần đây', path: '/' })" />
        </CardRow>

        <CardRow title="Mới thêm vào" to="/songs">
          <Card v-for="t in newest" :key="t.id" :to="`/artist/${encodeURIComponent(t.artist)}`" :title="t.title" :sub="t.artist" :cover="t.coverUrl"
            :playing="player.isCurrent(t) && player.playing" @play="playTrack(t, lib.tracks, { name: 'Bài hát', path: '/songs' })" />
        </CardRow>

        <CardRow v-if="lib.playlists.length" title="Playlist của bạn" :to="ui.isMobile ? '/library' : undefined">
          <Card v-for="p in lib.playlists.slice(0, 10)" :key="p.id" :to="`/playlist/${p.id}`" :title="p.name" :sub="p.description || `${p.trackIds.length} bài`"
            :mosaic="lib.playlistTracks(p).map((t) => t.coverUrl).filter(Boolean)" :playing="ctxPlaying(`/playlist/${p.id}`)"
            @play="player.toggleContext(lib.playlistTracks(p), { name: p.name, path: `/playlist/${p.id}` })" />
        </CardRow>

        <CardRow v-if="lib.artists.length" title="Nghệ sĩ của bạn">
          <Card v-for="a in lib.artists.slice(0, 10)" :key="a.name" :to="`/artist/${encodeURIComponent(a.name)}`" :title="a.name" sub="Nghệ sĩ" :cover="a.coverUrl" round icon="artist"
            :playing="ctxPlaying(`/artist/${encodeURIComponent(a.name)}`)" @play="player.toggleContext(a.tracks, { name: a.name, path: `/artist/${encodeURIComponent(a.name)}` })" />
        </CardRow>

        <CardRow v-if="lib.albums.length" title="Album của bạn">
          <Card v-for="a in lib.albums.slice(0, 10)" :key="a.artist + a.name" :to="`/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`" :title="a.name" :sub="a.artist" :cover="a.coverUrl"
            :playing="ctxPlaying(`/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`)"
            @play="player.toggleContext(a.tracks, { name: a.name, path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}` })" />
        </CardRow>

        <CardRow v-if="topTracks.length" title="Nghe nhiều nhất">
          <Card v-for="t in topTracks" :key="t.id" :to="`/artist/${encodeURIComponent(t.artist)}`" :title="t.title" :sub="`${t.artist} · ${t.playCount} lượt`" :cover="t.coverUrl"
            :playing="player.isCurrent(t) && player.playing" @play="playTrack(t, topTracks, { name: 'Nghe nhiều nhất', path: '/' })" />
        </CardRow>
      </template>
    </div>
  </div>
</template>

<style scoped>
.home { position: relative; min-height: 100%; }
.glow { position: absolute; inset: 0 0 auto; height: 332px; opacity: .6; transition: background .6s; pointer-events: none; }
.inner { position: relative; padding-top: 72px; }
h1 { font-size: 32px; font-weight: 800; margin: 8px 0 20px; }
.quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.q { position: relative; display: flex; align-items: center; gap: 12px; height: 64px; padding-right: 12px; border-radius: 4px; overflow: hidden; background: rgba(255,255,255,.07); transition: background .3s; }
.q:hover { background: rgba(255,255,255,.2); }
.qcv { height: 64px; width: 64px; border-radius: 0; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
.qname { flex: 1; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.qeq { flex-shrink: 0; }
.qpb { opacity: 0; transition: opacity .3s; }
.q:hover .qpb { opacity: 1; }
.q:hover .qeq { display: none; }
.empty { text-align: center; padding: 80px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-2); }
.empty h2 { color: #fff; font-size: 24px; }
.btn.big { height: 48px; padding: 0 32px; font-size: 16px; margin-top: 16px; }
@container main (max-width: 1000px) { .quick { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 767px) {
  h1 { font-size: 24px; }
  .quick { grid-template-columns: repeat(2, 1fr); }
  .q { height: 56px; gap: 8px; }
  .qcv { width: 56px; height: 56px; }
  .qname { font-size: 13px; }
  .qpb { display: none; }
}
</style>
