<script setup>
// Dùng chung cho: Tất cả bài hát, Bài hát đã thích, Playlist, Album
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import PageHeader from '../components/media/PageHeader.vue';
import PlayButton from '../components/media/PlayButton.vue';
import TrackTable from '../components/media/TrackTable.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { usePage } from '../composables/usePage.js';
import { useDominantColor } from '../composables/useDominantColor.js';
import { fmtTotal, fold } from '../utils.js';

const props = defineProps({ kind: String, id: String, artist: String });
const lib = useLibrary(), player = usePlayer(), ui = useUi(), router = useRouter();

const playlist = computed(() => (props.kind === 'playlist' ? lib.playlist(props.id) : null));
const album = computed(() => (props.kind === 'album' ? lib.albums.find((a) => a.name === props.id && a.artist === props.artist) : null));

const tracks = computed(() => ({
  all: () => lib.tracks,
  liked: () => lib.liked,
  playlist: () => lib.playlistTracks(playlist.value),
  album: () => album.value?.tracks || [],
}[props.kind]()));

const info = computed(() => ({
  all: { type: 'Danh sách', title: 'Tất cả bài hát', icon: 'music' },
  liked: { type: 'Playlist', title: 'Bài hát đã thích', liked: true },
  playlist: { type: 'Playlist', title: playlist.value?.name || '', mosaic: tracks.value.map((t) => t.coverUrl).filter(Boolean), desc: playlist.value?.description },
  album: { type: 'Album', title: props.id, cover: album.value?.coverUrl },
}[props.kind]));

const path = computed(() => router.currentRoute.value.path);
const context = computed(() => ({ name: info.value.title, path: path.value }));
const coverForColor = computed(() => info.value.cover || info.value.mosaic?.[0] || '');
const dom = useDominantColor(coverForColor, () => info.value.title);
const color = computed(() => (props.kind === 'liked' ? '#5038a0' : props.kind === 'all' ? '#1e5c3c' : dom.value));
const total = computed(() => tracks.value.reduce((s, t) => s + (t.duration || 0), 0));
const ctxPlaying = computed(() => player.context?.path === path.value && player.playing);

// Lọc + sắp xếp trong trang
const filterQ = ref('');
const showFilter = ref(false);
const sortBy = ref('custom');
const sorts = { custom: 'Thứ tự tùy chỉnh', title: 'Tiêu đề', artist: 'Nghệ sĩ', album: 'Album', added: 'Ngày thêm', plays: 'Lượt nghe', duration: 'Thời lượng' };
const shown = computed(() => {
  const f = fold(filterQ.value.trim());
  let list = f ? tracks.value.filter((t) => fold(`${t.title} ${t.artist} ${t.album}`).includes(f)) : tracks.value;
  const by = {
    title: (a, b) => a.title.localeCompare(b.title, 'vi'), artist: (a, b) => a.artist.localeCompare(b.artist, 'vi'),
    album: (a, b) => (a.album || '').localeCompare(b.album || '', 'vi'), added: (a, b) => b.createdAt - a.createdAt,
    plays: (a, b) => (b.playCount || 0) - (a.playCount || 0), duration: (a, b) => a.duration - b.duration,
  }[sortBy.value];
  return by ? [...list].sort(by) : list;
});
const sortable = computed(() => !!playlist.value && sortBy.value === 'custom' && !filterQ.value);

function play(shuffle) {
  if (shuffle && !player.shuffle) player.toggleShuffle();
  if (ctxPlaying.value && !shuffle) return player.toggle();
  if (player.context?.path === path.value && player.track && !shuffle) return player.toggle();
  if (shown.value.length) player.playTracks(shown.value, shuffle ? Math.floor(Math.random() * shown.value.length) : 0, context.value);
}
usePage(() => ({ color: color.value, title: info.value.title, play: () => play(false), playing: ctxPlaying.value }));

function sortMenu(e) {
  ui.openMenu(e, Object.entries(sorts).filter(([k]) => k !== 'custom' || playlist.value).map(([k, label]) => ({ label, icon: sortBy.value === k ? 'check' : undefined, fn: () => { sortBy.value = k; } })));
}
function moreMenu(e) {
  const ids = tracks.value.map((t) => t.id);
  const p = playlist.value;
  ui.openMenu(e, [
    { label: 'Thêm vào hàng đợi', icon: 'queue', fn: () => { player.addToQueue(ids); ui.toast('Đã thêm vào hàng đợi'); } },
    { label: 'Thêm vào playlist khác', icon: 'plus', children: lib.playlists.filter((x) => x !== p).map((x) => ({ label: x.name, fn: () => lib.addToPlaylist(x, ids) })) },
    !p && { label: 'Lưu thành playlist mới', icon: 'plus', fn: async () => { const np = await lib.createPlaylist(info.value.title, ids); router.push(`/playlist/${np.id}`); } },
    p && { sep: true },
    p && { label: p.pinned ? 'Bỏ ghim' : 'Ghim playlist', icon: 'pin', fn: () => lib.updatePlaylist(p, { pinned: !p.pinned }) },
    p && { label: 'Sửa thông tin chi tiết', icon: 'edit', fn: () => ui.open('editPlaylist', { playlist: p }) },
    p && { label: 'Xóa playlist', icon: 'trash', danger: true, fn: async () => { if (confirm(`Xóa "${p.name}"?`)) { await lib.deletePlaylist(p); router.push('/'); } } },
  ].filter(Boolean));
}

// Gợi ý thêm bài vào playlist
const findQ = ref('');
const suggestions = computed(() => {
  if (!playlist.value) return [];
  const f = fold(findQ.value.trim());
  const pool = lib.tracks.filter((t) => !playlist.value.trackIds.includes(t.id));
  return (f ? pool.filter((t) => fold(`${t.title} ${t.artist} ${t.album}`).includes(f)) : pool).slice(0, f ? 20 : 10);
});
</script>

<template>
  <div v-if="kind === 'playlist' && !playlist" class="page"><p class="muted" style="padding-top: 80px">Không tìm thấy playlist.</p></div>
  <div v-else class="coll" :style="{ '--c': color }">
    <PageHeader :type="info.type" :title="info.title" :color="color" :cover="info.cover" :mosaic="info.mosaic" :liked="info.liked" :icon="info.icon"
      :editable="!!playlist" @edit="ui.open('editPlaylist', { playlist })">
      <p v-if="info.desc" class="desc-text">{{ info.desc }}</p>
      <template v-if="album"><RouterLink :to="`/artist/${encodeURIComponent(album.artist)}`" class="link"><b>{{ album.artist }}</b></RouterLink> •</template>
      <span>{{ tracks.length }} bài<template v-if="total">, {{ fmtTotal(total) }}</template></span>
    </PageHeader>

    <div class="body">
      <div class="actions">
        <PlayButton :size="56" :playing="ctxPlaying" :disabled="!tracks.length" @click="play(false)" />
        <button class="icon-btn big" :class="{ on: player.shuffle }" title="Phát ngẫu nhiên" @click="play(true)"><Icon name="shuffle" size="28" /></button>
        <button class="icon-btn big" title="Tùy chọn khác" @click="moreMenu"><Icon name="more" size="28" /></button>
        <div class="right">
          <div class="filter" :class="{ open: showFilter || filterQ }">
            <button class="icon-btn" title="Tìm trong danh sách" @click="showFilter = true; $nextTick(() => $refs.fi.focus())"><Icon name="search" size="18" /></button>
            <input ref="fi" v-model="filterQ" placeholder="Tìm trong danh sách" @blur="showFilter = false" />
          </div>
          <button class="sort" @click="sortMenu">{{ sorts[sortBy] }} <Icon name="sort" size="16" /></button>
        </div>
      </div>

      <TrackTable v-if="shown.length" :tracks="shown" :context="context" :playlist="playlist" :sortable="sortable" :show-album="kind !== 'album'" :numbered="true" />
      <p v-else-if="tracks.length" class="muted pad">Không có bài nào khớp "{{ filterQ }}".</p>
      <div v-else-if="kind === 'liked'" class="empty">
        <Icon name="heart" size="56" />
        <h2>Những bài hát bạn thích sẽ xuất hiện ở đây</h2>
        <p class="muted">Lưu bài hát bằng cách nhấn vào biểu tượng trái tim.</p>
      </div>

      <section v-if="playlist" class="find">
        <h2>{{ tracks.length ? 'Gợi ý thêm' : 'Hãy cùng tìm nội dung cho playlist của bạn' }}</h2>
        <div class="find-in">
          <Icon name="search" size="18" class="si" />
          <input v-model="findQ" class="field" placeholder="Tìm bài hát trong thư viện" />
        </div>
        <div v-for="t in suggestions" :key="t.id" class="sug">
          <Cover :src="t.coverUrl" :size="80" class="scv" />
          <div class="meta"><div class="ellipsis">{{ t.title }}</div><small class="muted ellipsis">{{ t.artist }}</small></div>
          <span class="muted ellipsis alb">{{ t.album }}</span>
          <button class="btn btn-outline" @click="lib.addToPlaylist(playlist, t.id)">Thêm</button>
        </div>
        <p v-if="!suggestions.length" class="muted">
          {{ lib.tracks.length ? 'Không còn bài nào phù hợp.' : 'Thư viện đang trống.' }}
          <button class="link" style="text-decoration: underline" @click="ui.open('import', { playlistId: playlist.id })">Thêm nhạc từ YouTube vào playlist này</button>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.body { position: relative; background: linear-gradient(color-mix(in srgb, var(--c) 30%, #121212), var(--surface) 232px); padding-bottom: 32px; }
.actions { display: flex; align-items: center; gap: 24px; padding: 24px; }
.icon-btn.big { width: 40px; height: 40px; }
.right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.filter { display: flex; align-items: center; border-radius: 4px; width: 32px; overflow: hidden; transition: width .2s, background .2s; }
.filter.open { width: 220px; background: var(--surface-3); }
.filter input { border: 0; background: none; outline: none; font-size: 13px; width: 0; padding: 0; opacity: 0; }
.filter.open input { width: 180px; opacity: 1; }
.sort { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-2); }
.sort:hover { color: #fff; }
.desc-text { width: 100%; margin: 0 0 8px; color: rgba(255,255,255,.7); }
.pad { padding: 0 32px; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 16px; text-align: center; }
.empty h2 { font-size: 28px; font-weight: 800; }
.find { padding: 40px 40px 0; }
.find h2 { font-size: 22px; font-weight: 800; margin-bottom: 16px; }
.find-in { position: relative; width: min(360px, 100%); margin-bottom: 16px; }
.find-in .field { padding-left: 40px; }
.si { position: absolute; left: 12px; top: 11px; color: var(--text-2); }
.sug { display: grid; grid-template-columns: 40px 4fr 3fr auto; align-items: center; gap: 12px; padding: 8px; border-radius: 4px; }
.sug:hover { background: rgba(255,255,255,.1); }
.scv { width: 40px; }
.meta { min-width: 0; display: flex; flex-direction: column; }
.alb { font-size: 13px; }
@media (max-width: 767px) {
  .actions { padding: 16px; gap: 16px; }
  .filter.open { width: 160px; }
  .find { padding: 32px 16px 0; }
  .sug { grid-template-columns: 40px 1fr auto; }
  .alb { display: none; }
}
</style>
