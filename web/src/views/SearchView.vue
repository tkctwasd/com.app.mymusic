<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import Card from '../components/media/Card.vue';
import CardRow from '../components/media/CardRow.vue';
import PlayButton from '../components/media/PlayButton.vue';
import TrackTable from '../components/media/TrackTable.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { load, save, hashColor } from '../utils.js';
import { usePage } from '../composables/usePage.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi(), router = useRouter();
usePage(() => ({ color: '#121212' }));

// Debounce 150ms
const q = ref(ui.searchQ);
let timer;
watch(() => ui.searchQ, (v) => { clearTimeout(timer); timer = setTimeout(() => { q.value = v; }, 150); });

const tab = ref('all');
const tabs = { all: 'Tất cả', tracks: 'Bài hát', artists: 'Nghệ sĩ', albums: 'Album', playlists: 'Playlist' };
const r = computed(() => lib.search(q.value));
const hasAny = computed(() => r.value.tracks.length || r.value.artists.length || r.value.albums.length || r.value.playlists.length);
const ctx = computed(() => ({ name: `Tìm "${q.value}"`, path: `/search?q=${q.value}` }));

// Kết quả hàng đầu: nghệ sĩ khớp tên chính xác > bài hát đầu tiên
const top = computed(() => {
  const a = r.value.artists[0];
  const t = r.value.tracks[0];
  if (a && (!t || a.name.toLowerCase().startsWith(q.value.toLowerCase()))) return { kind: 'artist', title: a.name, sub: 'Nghệ sĩ', cover: a.coverUrl, round: true, to: `/artist/${encodeURIComponent(a.name)}`, tracks: a.tracks };
  if (t) return { kind: 'track', title: t.title, sub: `Bài hát • ${t.artist}`, cover: t.coverUrl, to: `/artist/${encodeURIComponent(t.artist)}`, track: t };
  const p = r.value.playlists[0];
  if (p) return { kind: 'playlist', title: p.name, sub: 'Playlist', mosaic: lib.playlistTracks(p).map((x) => x.coverUrl).filter(Boolean), to: `/playlist/${p.id}`, tracks: lib.playlistTracks(p) };
  return null;
});
function playTop() {
  const t = top.value;
  if (t.track) player.isCurrent(t.track) ? player.toggle() : player.playTracks(r.value.tracks, 0, ctx.value);
  else player.toggleContext(t.tracks, { name: t.title, path: t.to });
}

// Lịch sử tìm kiếm
const history = ref(load('searchHistory', []));
function remember(item) {
  history.value = [item, ...history.value.filter((h) => h.to !== item.to)].slice(0, 10);
  save('searchHistory', history.value);
}
function removeHistory(i) { history.value.splice(i, 1); save('searchHistory', history.value); }
function go(item) { remember(item); router.push(item.to); }
watch(q, (v) => { if (v.trim().length > 1 && hasAny.value) remember({ kind: 'query', title: v.trim(), to: `/search?q=${encodeURIComponent(v.trim())}` }); });
function openHistory(h) {
  if (h.kind === 'query') { ui.searchQ = h.title; return; }
  router.push(h.to);
}
// Mở từ link /search?q=
const initQ = router.currentRoute.value.query.q;
if (initQ) { ui.searchQ = q.value = String(initQ); }

// Lưới "Duyệt": nghệ sĩ + album + playlist dạng thẻ màu
const browse = computed(() => [
  ...lib.artists.slice(0, 8).map((a) => ({ title: a.name, cover: a.coverUrl, to: `/artist/${encodeURIComponent(a.name)}` })),
  ...lib.albums.slice(0, 6).map((a) => ({ title: a.name, cover: a.coverUrl, to: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}` })),
  ...lib.playlists.slice(0, 6).map((p) => ({ title: p.name, cover: lib.playlistTracks(p)[0]?.coverUrl, to: `/playlist/${p.id}` })),
]);
</script>

<template>
  <div class="page search">
    <!-- Ô tìm cho mobile (desktop nằm trên topbar) -->
    <div v-if="ui.isMobile" class="m-search"><Icon name="search" class="si" /><input v-model="ui.searchQ" placeholder="Bạn muốn nghe gì?" /></div>

    <template v-if="!q.trim()">
      <template v-if="history.length">
        <div class="section-title"><h2>Tìm kiếm gần đây</h2></div>
        <div class="hist">
          <div v-for="(h, i) in history" :key="h.to" class="h-item" @click="openHistory(h)">
            <Cover v-if="h.kind !== 'query'" :src="h.cover" :round="h.kind === 'artist'" :size="96" class="hcv" />
            <span v-else class="hq"><Icon name="search" size="20" /></span>
            <div class="meta"><div class="ellipsis">{{ h.title }}</div><small class="muted">{{ h.kind === 'query' ? 'Tìm kiếm' : h.sub }}</small></div>
            <button class="icon-btn" aria-label="Xóa" @click.stop="removeHistory(i)"><Icon name="x" size="16" /></button>
          </div>
        </div>
      </template>
      <div class="section-title"><h2>Duyệt tìm tất cả</h2></div>
      <div class="browse">
        <RouterLink v-for="b in browse" :key="b.to" :to="b.to" class="tile" :style="{ background: hashColor(b.title) }">
          <span>{{ b.title }}</span>
          <Cover :src="b.cover" :size="160" class="tcv" />
        </RouterLink>
      </div>
      <p v-if="!browse.length" class="muted">Thư viện còn trống, hãy thêm nhạc trước nhé.</p>
    </template>

    <template v-else>
      <div class="chips">
        <button v-for="(l, k) in tabs" :key="k" class="chip" :class="{ on: tab === k }" @click="tab = k">{{ l }}</button>
      </div>

      <div v-if="!hasAny" class="none">
        <h2>Không tìm thấy kết quả cho "{{ q }}"</h2>
        <p class="muted">Hãy kiểm tra lại chính tả hoặc dùng từ khóa khác. Hoặc thêm bài mới từ YouTube.</p>
        <button class="btn btn-light" @click="ui.open('import')">Thêm nhạc</button>
      </div>

      <template v-else-if="tab === 'all'">
        <div class="top-row">
          <section v-if="top" class="top-sec">
            <h2 class="h">Kết quả hàng đầu</h2>
            <RouterLink :to="top.to" class="top" @click="remember({ kind: top.kind, title: top.title, sub: top.sub, cover: top.cover, to: top.to })">
              <Cover :src="top.cover" :mosaic="top.mosaic" :round="top.round" :size="200" class="tcv2" />
              <h3 class="ellipsis">{{ top.title }}</h3>
              <span class="muted">{{ top.sub }}</span>
              <PlayButton class="tpb" :playing="top.track ? player.isCurrent(top.track) && player.playing : player.context?.path === top.to && player.playing" @click.prevent.stop="playTop" />
            </RouterLink>
          </section>
          <section v-if="r.tracks.length" class="songs">
            <h2 class="h">Bài hát</h2>
            <TrackTable :tracks="r.tracks.slice(0, 4)" :context="ctx" :show-header="false" :show-album="false" :show-added="false" :numbered="false" class="tt" />
          </section>
        </div>
        <CardRow v-if="r.artists.length" title="Nghệ sĩ">
          <Card v-for="a in r.artists" :key="a.name" :to="`/artist/${encodeURIComponent(a.name)}`" :title="a.name" sub="Nghệ sĩ" :cover="a.coverUrl" round icon="artist"
            @click="remember({ kind: 'artist', title: a.name, sub: 'Nghệ sĩ', cover: a.coverUrl, to: `/artist/${encodeURIComponent(a.name)}` })"
            @play="player.toggleContext(a.tracks, { name: a.name, path: `/artist/${encodeURIComponent(a.name)}` })" />
        </CardRow>
        <CardRow v-if="r.albums.length" title="Album">
          <Card v-for="a in r.albums" :key="a.artist + a.name" :to="`/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`" :title="a.name" :sub="a.artist" :cover="a.coverUrl"
            @play="player.toggleContext(a.tracks, { name: a.name, path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}` })" />
        </CardRow>
        <CardRow v-if="r.playlists.length" title="Playlist">
          <Card v-for="p in r.playlists" :key="p.id" :to="`/playlist/${p.id}`" :title="p.name" :sub="`${p.trackIds.length} bài`" :mosaic="lib.playlistTracks(p).map((t) => t.coverUrl).filter(Boolean)"
            @play="player.toggleContext(lib.playlistTracks(p), { name: p.name, path: `/playlist/${p.id}` })" />
        </CardRow>
      </template>

      <TrackTable v-else-if="tab === 'tracks'" :tracks="r.tracks" :context="ctx" :show-added="false" class="full" />
      <div v-else class="grid">
        <template v-if="tab === 'artists'">
          <Card v-for="a in r.artists" :key="a.name" :to="`/artist/${encodeURIComponent(a.name)}`" :title="a.name" sub="Nghệ sĩ" :cover="a.coverUrl" round icon="artist" @play="player.toggleContext(a.tracks, { name: a.name, path: `/artist/${encodeURIComponent(a.name)}` })" />
        </template>
        <template v-if="tab === 'albums'">
          <Card v-for="a in r.albums" :key="a.artist + a.name" :to="`/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`" :title="a.name" :sub="a.artist" :cover="a.coverUrl" @play="player.toggleContext(a.tracks, { name: a.name, path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}` })" />
        </template>
        <template v-if="tab === 'playlists'">
          <Card v-for="p in r.playlists" :key="p.id" :to="`/playlist/${p.id}`" :title="p.name" :sub="`${p.trackIds.length} bài`" :mosaic="lib.playlistTracks(p).map((t) => t.coverUrl).filter(Boolean)" @play="player.toggleContext(lib.playlistTracks(p), { name: p.name, path: `/playlist/${p.id}` })" />
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.search { padding-top: 80px; }
.m-search { position: relative; margin-bottom: 16px; }
.m-search input { width: 100%; height: 44px; border-radius: 6px; border: 0; padding: 0 12px 0 44px; background: #fff; color: #000; font-size: 15px; font-weight: 600; outline: none; }
.m-search .si { position: absolute; left: 12px; top: 12px; color: #000; }
.hist { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 4px; }
.h-item { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 6px; cursor: pointer; }
.h-item:hover { background: var(--surface-2); }
.hcv { width: 48px; }
.hq { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 4px; background: var(--surface-3); color: var(--text-2); }
.meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.browse { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.tile { position: relative; aspect-ratio: 1.6; border-radius: 8px; overflow: hidden; padding: 16px; font-size: 20px; font-weight: 800; }
.tile span { position: relative; z-index: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tcv { position: absolute; width: 45%; right: -6%; bottom: -4%; transform: rotate(25deg); box-shadow: 0 2px 4px rgba(0,0,0,.3); }
.chips { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; scrollbar-width: none; }
.none { text-align: center; padding: 64px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.none h2 { font-size: 24px; }
.top-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 24px; }
.top-row > section { min-width: 0; }
.h { font-size: 24px; font-weight: 800; margin-bottom: 16px; }
.top { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 20px; border-radius: 8px; background: var(--surface-2); transition: background .3s; height: calc(100% - 50px); }
.top:hover { background: var(--surface-3); }
.tcv2 { width: 92px; margin-bottom: 16px; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
.top h3 { font-size: 32px; font-weight: 800; }
.tpb { position: absolute; right: 20px; bottom: 20px; opacity: 0; transform: translateY(8px); transition: all .3s; }
.top:hover .tpb { opacity: 1; transform: none; }
.songs :deep(.tt), .tt { padding: 0; }
.full { padding: 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); margin: 0 -12px; }
@container main (max-width: 900px) { .top-row { grid-template-columns: 1fr; } }
@media (max-width: 767px) {
  .search { padding-top: 64px; }
  .top-row { grid-template-columns: 1fr; }
  .browse { grid-template-columns: 1fr 1fr; gap: 12px; }
  .tile { font-size: 16px; padding: 12px; }
  .grid { grid-template-columns: 1fr 1fr; }
}
</style>
