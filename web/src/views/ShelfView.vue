<script setup>
// Trang "Kệ" (thư viện, thay cho sidebar): Tất cả · Playlist · Album · Nghệ sĩ · Bài hát; lưới hoặc danh sách;
// ghim lên đầu; thả bài vào thẻ playlist; tab Bài hát cho phép chọn nhiều.
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import Card from '../components/media/Card.vue';
import TrackList from '../components/media/TrackList.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { useMenus } from '../composables/useMenus.js';
import { fold, load, save } from '../utils.js';
import { DRAG_MIME } from '../composables/useDragSort.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi(), router = useRouter();
const { playlistMenu } = useMenus();
const tabs = { all: 'Tất cả', playlist: 'Playlist', album: 'Album', artist: 'Nghệ sĩ', songs: 'Bài hát' };
const tab = ref(load('ui.shelfTab', 'all'));
const setTab = (k) => { tab.value = k; save('ui.shelfTab', k); };
const q = ref('');
const sort = ref(load('ui.sort', 'recent'));
const sorts = { recent: 'Gần đây', name: 'Tên A–Z', added: 'Mới thêm' };

const items = computed(() => {
  const list = [];
  const f = tab.value;
  if (f === 'all' || f === 'playlist') {
    for (const p of lib.playlists) {
      const ts = lib.playlistTracks(p);
      list.push({ key: p.id, kind: 'playlist', path: `/playlist/${p.id}`, name: p.name, sub: `Playlist · ${ts.length} bài`, mosaic: ts.map((t) => t.coverUrl).filter(Boolean), tracks: ts, pinned: p.pinned, at: Math.max(p.createdAt, ...ts.map((t) => t.lastPlayedAt || 0)), added: p.createdAt, playlist: p });
    }
  }
  if (f === 'all' || f === 'album') {
    for (const a of lib.albums) list.push({ key: `al:${a.artist}:${a.name}`, kind: 'album', path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`, name: a.name, sub: `Album · ${a.artist}`, cover: a.coverUrl, tracks: a.tracks, at: Math.max(...a.tracks.map((t) => t.lastPlayedAt || t.createdAt)), added: a.createdAt });
  }
  if (f === 'all' || f === 'artist') {
    for (const a of lib.artists) list.push({ key: `ar:${a.name}`, kind: 'artist', path: `/artist/${encodeURIComponent(a.name)}`, name: a.name, sub: `Nghệ sĩ · ${a.tracks.length} bài`, cover: a.coverUrl, round: true, tracks: a.tracks, at: Math.max(...a.tracks.map((t) => t.lastPlayedAt || t.createdAt)), added: Math.max(...a.tracks.map((t) => t.createdAt)) });
  }
  const fq = fold(q.value.trim());
  const out = fq ? list.filter((x) => fold(x.name).includes(fq)) : list;
  const by = { recent: (a, b) => b.at - a.at, name: (a, b) => a.name.localeCompare(b.name, 'vi'), added: (a, b) => b.added - a.added }[sort.value];
  return out.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || by(a, b));
});
const songs = computed(() => {
  const fq = fold(q.value.trim());
  return fq ? lib.tracks.filter((t) => fold(`${t.title} ${t.artist} ${t.album}`).includes(fq)) : lib.tracks;
});
const showPinned = computed(() => (tab.value === 'all' || tab.value === 'playlist') && !q.value);

function sortMenu(e) {
  ui.openMenu(e, Object.entries(sorts).map(([k, label]) => ({ label, icon: sort.value === k ? 'check' : undefined, fn: () => { sort.value = k; save('ui.sort', k); } })));
}
async function newPlaylist() { const p = await lib.createPlaylist(); router.push(`/playlist/${p.id}`); }
const ctxPlaying = (path) => player.context?.path === path && player.playing;
const ctxActive = (path) => player.context?.path === path && !!player.track;
const play = (it) => player.toggleContext(it.tracks, { name: it.name, path: it.path });
const likeIds = (ids) => ids.forEach((id) => { const t = lib.byId[id]; if (t && !t.liked) lib.toggleLike(t); });
const onDrop = (it, ids) => (it.kind === 'playlist' ? lib.addToPlaylist(it.playlist, ids) : null);
const menu = (e, it) => it.kind === 'playlist' && playlistMenu(e, it.playlist);

// Kiểu danh sách: thả bài vào dòng playlist
const dropKey = ref(null);
function rowDrop(e, it) {
  dropKey.value = null;
  const ids = JSON.parse(e.dataTransfer.getData(DRAG_MIME) || '[]');
  if (!ids.length) return;
  if (it === 'liked') likeIds(ids); else onDrop(it, ids);
}
const canDrop = (e, it) => (it === 'liked' || it.kind === 'playlist') && e.dataTransfer.types.includes(DRAG_MIME);
</script>

<template>
  <div class="page shelf">
    <header class="head">
      <h1 class="display">Kệ nhạc</h1>
      <div class="actions">
        <button class="btn btn-soft" @click="newPlaylist"><Icon name="plus" size="16" /> Playlist mới</button>
        <button class="btn btn-soft up" title="Tải file nhạc lên" @click="lib.pickUpload()"><Icon name="upload" size="16" /><span>Tải file</span></button>
        <button class="btn btn-primary" @click="ui.openCmd('')"><Icon name="youtube" size="16" /> Thêm nhạc</button>
      </div>
    </header>

    <div class="bar">
      <div class="seg tabs">
        <button v-for="(l, k) in tabs" :key="k" :class="{ on: tab === k }" @click="setTab(k)">{{ l }}</button>
      </div>
      <div class="tools">
        <label class="filter"><Icon name="search" size="16" /><input v-model="q" placeholder="Lọc trong Kệ" /></label>
        <template v-if="tab !== 'songs'">
          <button class="btn btn-outline sm" @click="sortMenu"><Icon name="sort" size="15" /><span class="sort-l">{{ sorts[sort] }}</span></button>
          <div class="seg view">
            <button :class="{ on: ui.shelfView === 'grid' }" title="Dạng lưới" @click="ui.set('shelfView', 'grid')"><Icon name="grid" size="16" /></button>
            <button :class="{ on: ui.shelfView === 'list' }" title="Dạng danh sách" @click="ui.set('shelfView', 'list')"><Icon name="list" size="16" /></button>
          </div>
        </template>
      </div>
    </div>

    <!-- Bài hát -->
    <template v-if="tab === 'songs'">
      <p v-if="ui.isMobile" class="hint muted"><Icon name="select" size="15" /> Mẹo: nhấn giữ một bài để chọn nhiều bài.</p>
      <p v-else class="hint muted"><Icon name="select" size="15" /> Mẹo: <kbd>Ctrl</kbd> + bấm hoặc <kbd>Shift</kbd> + bấm để chọn nhiều bài.</p>
      <TrackList v-if="songs.length" :tracks="songs" :context="{ name: 'Tất cả bài hát', path: '/songs' }" />
      <p v-else class="muted empty">Không có bài nào khớp.</p>
    </template>

    <!-- Lưới -->
    <div v-else-if="ui.shelfView === 'grid'" class="grid">
      <template v-if="showPinned">
        <Card to="/liked" title="Bài hát đã thích" :sub="`${lib.liked.length} bài · thả bài vào đây để thích`" liked droppable
          :playing="ctxPlaying('/liked')" :active="ctxActive('/liked')" @play="player.toggleContext(lib.liked, { name: 'Bài hát đã thích', path: '/liked' })" @drop-ids="likeIds" />
        <Card to="/songs" title="Tất cả bài hát" :sub="`${lib.tracks.length} bài`" icon="music" :mosaic="lib.tracks.slice(0, 4).map((t) => t.coverUrl).filter(Boolean)"
          :playing="ctxPlaying('/songs')" :active="ctxActive('/songs')" @play="player.toggleContext(lib.tracks, { name: 'Tất cả bài hát', path: '/songs' })" />
      </template>
      <div v-for="it in items" :key="it.key" class="cell" :class="{ pinned: it.pinned }" @contextmenu="menu($event, it)">
        <Card :to="it.path" :title="it.name" :sub="it.sub" :cover="it.cover" :mosaic="it.mosaic" :round="it.round" :icon="it.kind === 'artist' ? 'artist' : 'music'"
          :vinyl="it.kind !== 'artist'" :droppable="it.kind === 'playlist'" :playing="ctxPlaying(it.path)" :active="ctxActive(it.path)" @play="play(it)" @drop-ids="onDrop(it, $event)" />
        <Icon v-if="it.pinned" name="pin" size="14" class="pin" />
      </div>
    </div>

    <!-- Danh sách -->
    <div v-else class="list">
      <template v-if="showPinned">
        <RouterLink to="/liked" class="li" :class="{ drop: dropKey === 'liked' }" @dragover="canDrop($event, 'liked') && ($event.preventDefault(), dropKey = 'liked')" @dragleave="dropKey = null" @drop="rowDrop($event, 'liked')">
          <Cover liked class="lcv" /><div class="lm"><b class="ellipsis">Bài hát đã thích</b><small><Icon name="pin" size="12" class="pin-i" /> {{ lib.liked.length }} bài</small></div>
        </RouterLink>
        <RouterLink to="/songs" class="li"><Cover icon="music" class="lcv" /><div class="lm"><b class="ellipsis">Tất cả bài hát</b><small><Icon name="pin" size="12" class="pin-i" /> {{ lib.tracks.length }} bài</small></div></RouterLink>
      </template>
      <RouterLink v-for="it in items" :key="it.key" :to="it.path" class="li" :class="{ drop: dropKey === it.key, on: ctxActive(it.path) }"
        @contextmenu="menu($event, it)" @dragover="canDrop($event, it) && ($event.preventDefault(), dropKey = it.key)" @dragleave="dropKey = null" @drop="rowDrop($event, it)">
        <Cover :src="it.cover" :mosaic="it.mosaic" :round="it.round" :size="96" :icon="it.kind === 'artist' ? 'artist' : 'music'" class="lcv" />
        <div class="lm"><b class="ellipsis">{{ it.name }}</b><small class="ellipsis"><Icon v-if="it.pinned" name="pin" size="12" class="pin-i" /> {{ it.sub }}</small></div>
        <button class="icon-btn lplay" :aria-label="ctxPlaying(it.path) ? 'Tạm dừng' : 'Phát'" @click.prevent.stop="play(it)"><Icon :name="ctxPlaying(it.path) ? 'pause' : 'play'" size="16" /></button>
        <button v-if="it.kind === 'playlist'" class="icon-btn" aria-label="Tùy chọn" @click.prevent.stop="menu($event, it)"><Icon name="more" size="16" /></button>
      </RouterLink>
    </div>

    <div v-if="tab !== 'songs' && !items.length && !showPinned" class="empty muted">Không có mục nào.</div>
    <div v-if="tab === 'playlist' && !lib.playlists.length" class="empty-card">
      <b>Tạo playlist đầu tiên</b>
      <p class="muted">Gom những bài hợp tâm trạng vào một chỗ. Kéo bài từ bất kỳ đâu và thả vào thẻ playlist.</p>
      <button class="btn btn-primary" @click="newPlaylist"><Icon name="plus" size="16" /> Tạo playlist</button>
    </div>
  </div>
</template>

<style scoped>
.shelf { padding-top: 16px; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.head h1 { font-size: clamp(28px, 3.4vw, 40px); font-weight: 600; }
.actions { display: flex; gap: 8px; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 20px 0 24px; }
.tools { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; margin-left: auto; }
.tools > * { flex-shrink: 0; }
.tools > .filter { flex: 1 1 160px; max-width: 240px; }
.tabs { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tabs button { flex-shrink: 0; }
.filter { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 999px; background: var(--hover); border: 1px solid var(--line); color: var(--text-3); width: 200px; }
.filter:focus-within { border-color: var(--accent); }
.filter input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font-size: 13.5px; }
.btn.sm { height: 38px; padding: 0 14px; font-size: 13px; font-weight: 500; }
.view button { width: 36px; padding: 0; display: grid; place-items: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 32px 26px; }
.cell { position: relative; min-width: 0; }
.pin { position: absolute; top: 6px; left: 6px; z-index: 3; color: var(--accent); background: var(--glass-strong); border-radius: 50%; padding: 5px; width: 24px; height: 24px; }
.list { display: flex; flex-direction: column; gap: 2px; }
.li { display: flex; align-items: center; gap: 14px; padding: 8px 10px; border-radius: 16px; transition: background .2s; }
.li:hover { background: var(--hover); }
.li.on b { color: var(--accent); }
.li.drop { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--accent); }
.lcv { width: 52px; --cover-r: 12px; }
.lm { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.lm b { font-weight: 500; }
.lm small { color: var(--text-2); display: flex; align-items: center; gap: 4px; }
.pin-i { color: var(--accent); }
.lplay { opacity: 0; background: var(--accent); color: var(--accent-ink); }
.lplay:hover { background: var(--accent); color: var(--accent-ink); }
.li:hover .lplay { opacity: 1; }
.hint { display: flex; align-items: center; gap: 6px; font-size: 12.5px; margin: -4px 0 12px; }
.empty { padding: 40px 0; text-align: center; }
.empty-card { margin-top: 24px; padding: 28px; border-radius: var(--r-xl); background: var(--hover); border: 1px dashed var(--line-2); text-align: center; }
.empty-card p { margin: 6px 0 16px; }
@media (max-width: 767px) {
  .actions .btn-soft:not(.up) { display: none; }
  .up span { display: none; }
  .up { width: 38px; padding: 0; }
  .tabs { width: 100%; }
  .tabs button { flex: 1 0 auto; padding: 0 12px; }
  .tools { width: 100%; flex-wrap: nowrap; margin-left: 0; }
  .tools > .filter { flex: 1 1 auto; width: auto; min-width: 0; max-width: none; }
  .tools .sm { width: 38px; padding: 0; flex-shrink: 0; }
  .sort-l { display: none; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 16px; }
  .lplay { opacity: 1; }
}
</style>
