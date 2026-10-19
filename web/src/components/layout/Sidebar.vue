<script setup>
// Sidebar trái: điều hướng + "Thư viện của bạn" (lọc, tìm, sắp xếp), thu gọn/kéo rộng, thả bài vào playlist.
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import { useLibrary } from '../../stores/library.js';
import { usePlayer } from '../../stores/player.js';
import { useUi } from '../../stores/ui.js';
import { fold } from '../../utils.js';
import { DRAG_MIME } from '../../composables/useDragSort.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi(), router = useRouter(), route = useRoute();
const filter = ref(''); // '' | playlist | album | artist
const q = ref('');
const searching = ref(false);
const sort = ref(localStorage.getItem('ui.sort') || 'recent');
const dropOn = ref(null);

const items = computed(() => {
  const list = [];
  if (!filter.value || filter.value === 'playlist') {
    for (const p of lib.playlists) {
      const ts = lib.playlistTracks(p);
      list.push({ key: p.id, kind: 'playlist', path: `/playlist/${p.id}`, name: p.name, sub: `Playlist • ${ts.length} bài`, mosaic: ts.map((t) => t.coverUrl).filter(Boolean), pinned: p.pinned, at: Math.max(p.createdAt, ...ts.map((t) => t.lastPlayedAt || 0)), playlist: p });
    }
  }
  if (!filter.value || filter.value === 'album') {
    for (const a of lib.albums) list.push({ key: `al:${a.artist}:${a.name}`, kind: 'album', path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`, name: a.name, sub: `Album • ${a.artist}`, cover: a.coverUrl, at: Math.max(...a.tracks.map((t) => t.lastPlayedAt || t.createdAt)) });
  }
  if (!filter.value || filter.value === 'artist') {
    for (const a of lib.artists) list.push({ key: `ar:${a.name}`, kind: 'artist', path: `/artist/${encodeURIComponent(a.name)}`, name: a.name, sub: 'Nghệ sĩ', cover: a.coverUrl, round: true, at: Math.max(...a.tracks.map((t) => t.lastPlayedAt || t.createdAt)) });
  }
  const f = fold(q.value);
  const out = f ? list.filter((x) => fold(x.name).includes(f)) : list;
  const by = { recent: (a, b) => b.at - a.at, name: (a, b) => a.name.localeCompare(b.name, 'vi'), added: (a, b) => (b.playlist?.createdAt || 0) - (a.playlist?.createdAt || 0) }[sort.value];
  return out.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || by(a, b));
});

const sorts = { recent: 'Gần đây', name: 'Thứ tự chữ cái', added: 'Mới thêm gần đây' };
function sortMenu(e) {
  ui.openMenu(e, Object.entries(sorts).map(([k, label]) => ({ label, icon: sort.value === k ? 'check' : undefined, fn: () => { sort.value = k; localStorage.setItem('ui.sort', k); } })));
}

async function newPlaylist() {
  const p = await lib.createPlaylist();
  router.push(`/playlist/${p.id}`);
}
function itemMenu(e, it) {
  if (it.kind !== 'playlist') return;
  const p = it.playlist;
  ui.openMenu(e, [
    { label: 'Phát', icon: 'play', fn: () => player.playTracks(lib.playlistTracks(p), 0, { name: p.name, path: it.path }) },
    { label: 'Thêm vào hàng đợi', icon: 'queue', fn: () => { player.addToQueue(p.trackIds); ui.toast('Đã thêm vào hàng đợi'); } },
    { label: p.pinned ? 'Bỏ ghim' : 'Ghim playlist', icon: 'pin', fn: () => lib.updatePlaylist(p, { pinned: !p.pinned }) },
    { label: 'Sửa thông tin chi tiết', icon: 'edit', fn: () => ui.open('editPlaylist', { playlist: p }) },
    { sep: true },
    { label: 'Xóa', icon: 'trash', danger: true, fn: () => confirm(`Xóa "${p.name}"?`) && lib.deletePlaylist(p).then(() => route.path === it.path && router.push('/')) },
  ]);
}

// Thả bài vào playlist / Bài hát đã thích
function onDrop(e, it) {
  dropOn.value = null;
  const ids = JSON.parse(e.dataTransfer.getData(DRAG_MIME) || '[]');
  if (!ids.length) return;
  if (it === 'liked') ids.forEach((id) => { const t = lib.byId[id]; if (t && !t.liked) lib.toggleLike(t); });
  else lib.addToPlaylist(it.playlist, ids);
}
const canDrop = (e) => e.dataTransfer.types.includes(DRAG_MIME);

// Kéo cạnh phải để đổi độ rộng
function startResize(e) {
  const x0 = e.clientX, w0 = ui.sidebarWidth;
  const move = (ev) => ui.setSidebarWidth(w0 + ev.clientX - x0);
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); document.body.style.cursor = ''; };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
  document.body.style.cursor = 'col-resize';
}
const isPlayingCtx = (path) => player.context?.path === path && player.playing;
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: ui.collapsed }">
    <nav class="panel nav">
      <RouterLink to="/" class="nav-item" :title="ui.collapsed ? 'Trang chủ' : ''"><Icon :name="route.name === 'home' ? 'homeFill' : 'home'" size="24" /><span>Trang chủ</span></RouterLink>
      <RouterLink to="/search" class="nav-item" :title="ui.collapsed ? 'Tìm kiếm' : ''"><Icon name="search" size="24" /><span>Tìm kiếm</span></RouterLink>
    </nav>

    <section class="panel lib">
      <header>
        <button class="lib-title" :title="ui.collapsed ? 'Mở rộng thư viện' : 'Thu gọn thư viện'" @click="ui.setSidebarWidth(ui.collapsed ? 300 : 72)">
          <Icon name="library" size="24" /><span>Thư viện</span>
        </button>
        <button v-if="!ui.collapsed" class="icon-btn add" title="Tạo playlist" @click="newPlaylist"><Icon name="plus" /></button>
      </header>

      <div v-if="!ui.collapsed" class="chips">
        <button v-if="filter" class="chip x" aria-label="Bỏ lọc" @click="filter = ''"><Icon name="x" size="16" /></button>
        <template v-for="(l, k) in { playlist: 'Playlist', album: 'Album', artist: 'Nghệ sĩ' }" :key="k">
          <button v-if="!filter || filter === k" class="chip" :class="{ on: filter === k }" @click="filter = filter === k ? '' : k">{{ l }}</button>
        </template>
      </div>

      <div v-if="!ui.collapsed" class="tools">
        <div class="mini-search" :class="{ open: searching || q }">
          <button class="icon-btn" aria-label="Tìm trong thư viện" @click="searching = true; $nextTick(() => $refs.qi.focus())"><Icon name="search" size="16" /></button>
          <input ref="qi" v-model="q" placeholder="Tìm trong Thư viện" @blur="searching = false" />
        </div>
        <button class="sort" @click="sortMenu">{{ sorts[sort] }} <Icon name="sort" size="16" /></button>
      </div>

      <div class="list scroll">
        <RouterLink to="/liked" class="item" :class="{ drop: dropOn === 'liked' }" active-class="active"
          @dragover="canDrop($event) && ($event.preventDefault(), dropOn = 'liked')" @dragleave="dropOn = null" @drop="onDrop($event, 'liked')">
          <Cover liked class="cv" />
          <div class="meta"><div class="name ellipsis" :class="{ green: isPlayingCtx('/liked') }">Bài hát đã thích</div><div class="sub ellipsis"><Icon name="pin" size="12" class="pin" /> Playlist • {{ lib.liked.length }} bài</div></div>
        </RouterLink>
        <RouterLink to="/songs" class="item" active-class="active">
          <Cover icon="music" class="cv" />
          <div class="meta"><div class="name ellipsis" :class="{ green: isPlayingCtx('/songs') }">Tất cả bài hát</div><div class="sub ellipsis"><Icon name="pin" size="12" class="pin" /> {{ lib.tracks.length }} bài</div></div>
        </RouterLink>

        <RouterLink v-for="it in items" :key="it.key" :to="it.path" class="item" :class="{ drop: dropOn === it.key }" active-class="active" :title="ui.collapsed ? it.name : ''"
          @contextmenu="itemMenu($event, it)"
          @dragover="it.kind === 'playlist' && canDrop($event) && ($event.preventDefault(), dropOn = it.key)" @dragleave="dropOn = null" @drop="onDrop($event, it)">
          <Cover :src="it.cover" :mosaic="it.mosaic" :round="it.round" :size="96" :icon="it.kind === 'artist' ? 'artist' : 'music'" class="cv" />
          <div class="meta">
            <div class="name ellipsis" :class="{ green: player.context?.path === it.path }">{{ it.name }}</div>
            <div class="sub ellipsis"><Icon v-if="it.pinned" name="pin" size="12" class="pin" /> {{ it.sub }}</div>
          </div>
          <Icon v-if="isPlayingCtx(it.path)" name="volume" size="16" class="spk" />
        </RouterLink>

        <div v-if="!lib.playlists.length && !ui.collapsed && !q" class="empty-card">
          <b>Tạo playlist đầu tiên của bạn</b>
          <p>Rất dễ, chúng tôi sẽ giúp bạn</p>
          <button class="btn btn-light" @click="newPlaylist">Tạo playlist</button>
        </div>
      </div>
      <div class="resize" @pointerdown.prevent="startResize" />
    </section>
  </aside>
</template>

<style scoped>
.sidebar { display: flex; flex-direction: column; gap: var(--gap); min-height: 0; }
.panel { background: var(--surface); border-radius: var(--radius); }
.nav { padding: 8px 12px; }
.nav-item { display: flex; align-items: center; gap: 20px; height: 40px; padding: 0 12px; font-weight: 700; color: var(--text-2); transition: color .2s; }
.nav-item:hover, .nav-item.router-link-exact-active { color: #fff; }
.lib { flex: 1; min-height: 0; display: flex; flex-direction: column; position: relative; }
header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 8px; }
.lib-title { display: flex; align-items: center; gap: 12px; font-weight: 700; color: var(--text-2); height: 40px; padding: 0 8px; transition: color .2s; }
.lib-title:hover { color: #fff; }
.add { background: transparent; }
.add:hover { background: var(--surface-2); }
.chips { display: flex; gap: 8px; padding: 0 16px 8px; overflow-x: auto; scrollbar-width: none; }
.chip.x { width: 32px; padding: 0; display: grid; place-items: center; }
.tools { display: flex; align-items: center; justify-content: space-between; padding: 4px 12px 4px 8px; }
.mini-search { display: flex; align-items: center; border-radius: 4px; transition: background .2s, width .2s; width: 32px; overflow: hidden; }
.mini-search.open { background: var(--surface-3); width: 190px; }
.mini-search input { border: 0; background: none; outline: none; font-size: 13px; width: 0; padding: 0; opacity: 0; }
.mini-search.open input { width: 150px; opacity: 1; }
.sort { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-2); }
.sort:hover { color: #fff; transform: scale(1.03); }
.list { flex: 1; padding: 0 8px 8px; }
.item { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 6px; position: relative; }
.item:hover { background: var(--surface-2); }
.item.active { background: var(--surface-3); }
.item.drop { background: var(--surface-3); box-shadow: inset 0 0 0 2px var(--accent); }
.cv { width: 48px; }
.meta { flex: 1; min-width: 0; }
.name { font-size: 15px; }
.name.green { color: var(--accent); }
.sub { font-size: 13px; color: var(--text-2); display: flex; align-items: center; gap: 4px; }
.pin { color: var(--accent); }
.spk { color: var(--accent); }
.empty-card { margin: 8px; padding: 16px 20px; border-radius: 8px; background: var(--surface-2); }
.empty-card p { margin: 6px 0 16px; font-size: 13px; }
.resize { position: absolute; top: 0; right: -6px; width: 8px; height: 100%; cursor: col-resize; z-index: 2; }
.resize:hover { background: linear-gradient(to right, transparent 3px, var(--surface-4) 3px, var(--surface-4) 5px, transparent 5px); }

/* Thu gọn: chỉ còn icon + ảnh bìa */
.collapsed .nav-item span, .collapsed .lib-title span, .collapsed .meta, .collapsed .spk { display: none; }
.collapsed .nav-item { justify-content: center; padding: 0; }
.collapsed header { justify-content: center; padding: 12px 0 8px; }
.collapsed .item { justify-content: center; }
</style>
