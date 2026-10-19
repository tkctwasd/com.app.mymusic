<script setup>
// Khám phá: phiên bản toàn trang của Command bar, dành cho việc duyệt lâu.
// Trống: tìm gần đây + thẻ màu "Duyệt". Đang gõ: chip lọc, kết quả hàng đầu, bài hát, nghệ sĩ, album, playlist.
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import Card from '../components/media/Card.vue';
import Shelf from '../components/media/Shelf.vue';
import PlayButton from '../components/media/PlayButton.vue';
import TrackList from '../components/media/TrackList.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { load, save, hashColor } from '../utils.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi(), router = useRouter();
const YT = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//;
const inputEl = ref(null);

// Mở từ link /explore?q=
const initQ = router.currentRoute.value.query.q;
if (initQ) ui.searchQ = String(initQ);
const q = ref(ui.searchQ);
let timer;
watch(() => ui.searchQ, (v) => {
  if (YT.test(v.trim())) { ui.openCmd(v.trim()); ui.searchQ = ''; return; } // dán link -> Command bar xem trước
  clearTimeout(timer); timer = setTimeout(() => { q.value = v; }, 150);
});
onMounted(() => { if (!ui.isMobile) inputEl.value?.focus(); });

const tab = ref('all');
const tabs = { all: 'Tất cả', tracks: 'Bài hát', artists: 'Nghệ sĩ', albums: 'Album', playlists: 'Playlist' };
const r = computed(() => lib.search(q.value));
const hasAny = computed(() => r.value.tracks.length || r.value.artists.length || r.value.albums.length || r.value.playlists.length);
const ctx = computed(() => ({ name: `Tìm "${q.value}"`, path: `/explore?q=${encodeURIComponent(q.value)}` }));
const artPath = (n) => `/artist/${encodeURIComponent(n)}`;
const albPath = (a) => `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`;

// Kết quả hàng đầu: nghệ sĩ khớp đầu tên > bài hát đầu tiên > playlist
const top = computed(() => {
  const a = r.value.artists[0], t = r.value.tracks[0];
  if (a && (!t || a.name.toLowerCase().startsWith(q.value.toLowerCase()))) return { kind: 'artist', title: a.name, sub: `Nghệ sĩ · ${a.tracks.length} bài`, cover: a.coverUrl, round: true, to: artPath(a.name), tracks: a.tracks };
  if (t) return { kind: 'track', title: t.title, sub: `Bài hát · ${t.artist}`, cover: t.coverUrl, to: artPath(t.artist), track: t };
  const p = r.value.playlists[0];
  if (p) return { kind: 'playlist', title: p.name, sub: 'Playlist', mosaic: lib.playlistTracks(p).map((x) => x.coverUrl).filter(Boolean), to: `/playlist/${p.id}`, tracks: lib.playlistTracks(p) };
  return null;
});
const topPlaying = computed(() => (top.value?.track ? player.isCurrent(top.value.track) && player.playing : player.context?.path === top.value?.to && player.playing));
function playTop() {
  const t = top.value;
  if (t.track) player.isCurrent(t.track) ? player.toggle() : player.playTracks(r.value.tracks, 0, ctx.value);
  else player.toggleContext(t.tracks, { name: t.title, path: t.to });
}

// Lịch sử tìm kiếm (dùng chung với Command bar)
const history = ref(load('searchHistory', []));
function remember(item) {
  history.value = [item, ...history.value.filter((h) => h.to !== item.to)].slice(0, 10);
  save('searchHistory', history.value);
}
function removeHistory(i) { history.value.splice(i, 1); save('searchHistory', history.value); }
watch(q, (v) => { if (v.trim().length > 1 && hasAny.value) remember({ kind: 'query', title: v.trim(), to: `/explore?q=${encodeURIComponent(v.trim())}` }); });
function openHistory(h) { if (h.kind === 'query') { ui.searchQ = h.title; return; } router.push(h.to); }

// Thẻ "Duyệt"
const browse = computed(() => [
  ...lib.artists.slice(0, 8).map((a) => ({ title: a.name, sub: 'Nghệ sĩ', cover: a.coverUrl, to: artPath(a.name) })),
  ...lib.albums.slice(0, 6).map((a) => ({ title: a.name, sub: 'Album', cover: a.coverUrl, to: albPath(a) })),
  ...lib.playlists.slice(0, 6).map((p) => ({ title: p.name, sub: 'Playlist', cover: lib.playlistTracks(p)[0]?.coverUrl, to: `/playlist/${p.id}` })),
]);
</script>

<template>
  <div class="page explore">
    <h1 class="display">Khám phá</h1>
    <label class="big-search">
      <Icon name="search" size="22" />
      <input ref="inputEl" v-model="ui.searchQ" placeholder="Bài hát, nghệ sĩ, album… (không cần gõ dấu)" autocomplete="off" />
      <button v-if="ui.searchQ" class="icon-btn" aria-label="Xóa" @click="ui.searchQ = ''"><Icon name="x" size="18" /></button>
      <button v-else class="paste" @click="ui.openCmd('')"><Icon name="youtube" size="16" /> Dán link</button>
    </label>

    <template v-if="!q.trim()">
      <template v-if="history.length">
        <div class="section-title"><h2>Tìm gần đây</h2></div>
        <div class="hist">
          <div v-for="(h, i) in history" :key="h.to" class="h-item" @click="openHistory(h)">
            <Cover v-if="h.kind !== 'query'" :src="h.cover" :round="h.kind === 'artist'" :size="96" class="hcv" />
            <span v-else class="hq"><Icon name="clock" size="18" /></span>
            <div class="m"><div class="ellipsis">{{ h.title }}</div><small class="muted">{{ h.kind === 'query' ? 'Tìm kiếm' : h.sub }}</small></div>
            <button class="icon-btn x" aria-label="Xóa" @click.stop="removeHistory(i)"><Icon name="x" size="15" /></button>
          </div>
        </div>
      </template>
      <div class="section-title"><h2>Duyệt</h2></div>
      <div class="browse">
        <RouterLink v-for="b in browse" :key="b.to" :to="b.to" class="tile" :style="{ '--tc': hashColor(b.title) }">
          <small>{{ b.sub }}</small>
          <span>{{ b.title }}</span>
          <Cover :src="b.cover" :size="200" class="tcv" />
        </RouterLink>
      </div>
      <p v-if="!browse.length" class="muted">Thư viện còn trống, hãy thêm nhạc trước nhé.</p>
    </template>

    <template v-else>
      <div class="seg chips">
        <button v-for="(l, k) in tabs" :key="k" :class="{ on: tab === k }" @click="tab = k">{{ l }}</button>
      </div>

      <div v-if="!hasAny" class="none">
        <h2 class="display">Không thấy "{{ q }}"</h2>
        <p class="muted">Thử từ khác, hoặc tải bài mới từ YouTube.</p>
        <button class="btn btn-primary" @click="ui.openCmd('')"><Icon name="youtube" size="16" /> Thêm nhạc</button>
      </div>

      <template v-else-if="tab === 'all'">
        <div class="top-row">
          <section v-if="top">
            <div class="section-title first"><h2>Khớp nhất</h2></div>
            <RouterLink :to="top.to" class="top" @click="remember({ kind: top.kind, title: top.title, sub: top.sub, cover: top.cover, to: top.to })">
              <Cover :src="top.cover" :mosaic="top.mosaic" :round="top.round" :size="240" class="tcv2" />
              <h3 class="display ellipsis">{{ top.title }}</h3>
              <span class="muted">{{ top.sub }}</span>
              <PlayButton class="tpb" :playing="topPlaying" @click.prevent.stop="playTop" />
            </RouterLink>
          </section>
          <section v-if="r.tracks.length" class="songs">
            <div class="section-title first"><h2>Bài hát</h2></div>
            <TrackList :tracks="r.tracks.slice(0, 4)" :context="ctx" :numbered="false" :selectable="false" />
          </section>
        </div>
        <Shelf v-if="r.artists.length" title="Nghệ sĩ">
          <Card v-for="a in r.artists" :key="a.name" :to="artPath(a.name)" :title="a.name" sub="Nghệ sĩ" :cover="a.coverUrl" round icon="artist"
            @click="remember({ kind: 'artist', title: a.name, sub: 'Nghệ sĩ', cover: a.coverUrl, to: artPath(a.name) })"
            @play="player.toggleContext(a.tracks, { name: a.name, path: artPath(a.name) })" />
        </Shelf>
        <Shelf v-if="r.albums.length" title="Album">
          <Card v-for="a in r.albums" :key="a.artist + a.name" :to="albPath(a)" :title="a.name" :sub="a.artist" :cover="a.coverUrl" vinyl @play="player.toggleContext(a.tracks, { name: a.name, path: albPath(a) })" />
        </Shelf>
        <Shelf v-if="r.playlists.length" title="Playlist">
          <Card v-for="p in r.playlists" :key="p.id" :to="`/playlist/${p.id}`" :title="p.name" :sub="`${p.trackIds.length} bài`" vinyl :mosaic="lib.playlistTracks(p).map((t) => t.coverUrl).filter(Boolean)"
            @play="player.toggleContext(lib.playlistTracks(p), { name: p.name, path: `/playlist/${p.id}` })" />
        </Shelf>
      </template>

      <TrackList v-else-if="tab === 'tracks'" :tracks="r.tracks" :context="ctx" />
      <div v-else class="grid">
        <template v-if="tab === 'artists'">
          <Card v-for="a in r.artists" :key="a.name" :to="artPath(a.name)" :title="a.name" sub="Nghệ sĩ" :cover="a.coverUrl" round icon="artist" @play="player.toggleContext(a.tracks, { name: a.name, path: artPath(a.name) })" />
        </template>
        <template v-if="tab === 'albums'">
          <Card v-for="a in r.albums" :key="a.artist + a.name" :to="albPath(a)" :title="a.name" :sub="a.artist" :cover="a.coverUrl" vinyl @play="player.toggleContext(a.tracks, { name: a.name, path: albPath(a) })" />
        </template>
        <template v-if="tab === 'playlists'">
          <Card v-for="p in r.playlists" :key="p.id" :to="`/playlist/${p.id}`" :title="p.name" :sub="`${p.trackIds.length} bài`" vinyl :mosaic="lib.playlistTracks(p).map((t) => t.coverUrl).filter(Boolean)" @play="player.toggleContext(lib.playlistTracks(p), { name: p.name, path: `/playlist/${p.id}` })" />
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.explore { padding-top: 16px; }
h1 { font-size: clamp(28px, 3.4vw, 40px); font-weight: 600; }
.big-search { display: flex; align-items: center; gap: 12px; height: 60px; padding: 0 10px 0 20px; margin: 20px 0 8px; border-radius: 22px; background: var(--surface); border: 1px solid var(--line); color: var(--text-3); transition: border-color .2s, box-shadow .2s; }
.big-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.big-search input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; outline: none; font-size: 17px; }
.paste { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 14px; background: var(--hover); color: var(--text-2); font-size: 13px; font-weight: 500; }
.paste:hover { background: var(--press); color: var(--text); }
.hist { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 4px; }
.h-item { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 14px; cursor: pointer; }
.h-item:hover { background: var(--hover); }
.hcv { width: 44px; --cover-r: 10px; }
.hq { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 10px; background: var(--hover); color: var(--text-2); }
.m { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.x { opacity: 0; }
.h-item:hover .x { opacity: 1; }
.browse { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.tile { position: relative; aspect-ratio: 1.7; border-radius: 22px; overflow: hidden; padding: 16px 18px; display: flex; flex-direction: column; isolation: isolate;
  background: linear-gradient(135deg, color-mix(in oklab, var(--tc) 70%, var(--surface)), color-mix(in oklab, var(--tc) 30%, var(--surface))); transition: transform .3s var(--spring); color: #fff; }
.tile:hover { transform: translateY(-3px); }
.tile small { font-size: 11px; opacity: .8; text-transform: uppercase; letter-spacing: .06em; }
.tile span { font: 600 17px/1.25 var(--font-display); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 70%; }
.tcv { position: absolute; z-index: -1; width: 46%; right: -6%; bottom: -10%; transform: rotate(18deg); --cover-r: 14px; box-shadow: 0 8px 20px rgb(0 0 0 / .3); transition: transform .4s var(--spring); }
.tile:hover .tcv { transform: rotate(10deg) scale(1.05); }
.chips { margin: 8px 0 8px; overflow-x: auto; scrollbar-width: none; max-width: 100%; }
.none { text-align: center; padding: 64px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.none h2 { font-size: 22px; font-weight: 600; }
.top-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 28px; }
.top-row > section { min-width: 0; display: flex; flex-direction: column; }
.section-title.first { margin-top: 24px; }
.top { position: relative; flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 22px; border-radius: var(--r-xl); background: var(--surface); border: 1px solid var(--line); transition: background .3s; }
.top:hover { background: var(--surface-2); }
.tcv2 { width: 100px; margin-bottom: 18px; --cover-r: 18px; box-shadow: 0 14px 30px -14px rgb(0 0 0 / .5); }
.top h3 { font-size: 26px; font-weight: 600; }
.tpb { position: absolute; right: 22px; bottom: 22px; opacity: 0; transform: translateY(8px); transition: all .3s var(--spring); }
.top:hover .tpb { opacity: 1; transform: none; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 32px 26px; margin-top: 20px; }
@media (max-width: 900px) { .top-row { grid-template-columns: 1fr; } }
@media (max-width: 767px) {
  .big-search { height: 52px; border-radius: 18px; }
  .browse { grid-template-columns: 1fr 1fr; gap: 12px; }
  .tile { padding: 12px 14px; border-radius: 18px; }
  .tile span { font-size: 14px; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 16px; }
  .tpb { opacity: 1; transform: none; }
}
</style>
