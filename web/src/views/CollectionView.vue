<script setup>
// Chi tiết dùng chung cho: Tất cả bài hát, Bài hát đã thích, Playlist, Album.
// Header gọn (bìa + tên + nút ▶ ⇄ lớn), nền màu bìa nhạt dần; danh sách bài có khoảng thở; gợi ý thêm bài cho playlist.
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import PlayButton from '../components/media/PlayButton.vue';
import TrackList from '../components/media/TrackList.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { useMenus } from '../composables/useMenus.js';
import { useDominantColor } from '../composables/useDominantColor.js';
import { fmtTotal, fold } from '../utils.js';

const props = defineProps({ kind: String, id: String, artist: String });
const lib = useLibrary(), player = usePlayer(), ui = useUi(), router = useRouter();
const { addToPlaylistItems, playlistMenu } = useMenus();

const playlist = computed(() => (props.kind === 'playlist' ? lib.playlist(props.id) : null));
const album = computed(() => (props.kind === 'album' ? lib.albums.find((a) => a.name === props.id && a.artist === props.artist) : null));

const tracks = computed(() => ({
  all: () => lib.tracks,
  liked: () => lib.liked,
  playlist: () => lib.playlistTracks(playlist.value),
  album: () => album.value?.tracks || [],
}[props.kind]()));

const info = computed(() => ({
  all: { type: 'Danh sách', title: 'Tất cả bài hát', icon: 'music', mosaic: tracks.value.slice(0, 4).map((t) => t.coverUrl).filter(Boolean) },
  liked: { type: 'Playlist', title: 'Bài hát đã thích', liked: true },
  playlist: { type: 'Playlist', title: playlist.value?.name || '', mosaic: tracks.value.map((t) => t.coverUrl).filter(Boolean), desc: playlist.value?.description },
  album: { type: 'Album', title: props.id, cover: album.value?.coverUrl },
}[props.kind]));

const path = computed(() => router.currentRoute.value.path);
const context = computed(() => ({ name: info.value.title, path: path.value }));
const coverForColor = computed(() => info.value.cover || info.value.mosaic?.[0] || '');
const dom = useDominantColor(coverForColor, () => info.value.title);
const color = computed(() => (props.kind === 'liked' ? '#e0607e' : dom.value));
const total = computed(() => tracks.value.reduce((s, t) => s + (t.duration || 0), 0));
const ctxPlaying = computed(() => player.context?.path === path.value && player.playing);

// Lọc + sắp xếp trong trang
const filterQ = ref('');
const sortBy = ref(playlist.value ? 'custom' : 'added');
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
  if (shuffle && player.shuffle) return player.toggleShuffle(); // nút ⇄ đang bật -> tắt
  if (shuffle) player.toggleShuffle();
  if (player.context?.path === path.value && player.track && !shuffle) return player.toggle();
  if (shown.value.length) player.playTracks(shown.value, shuffle ? Math.floor(Math.random() * shown.value.length) : 0, context.value);
}
function sortMenu(e) {
  ui.openMenu(e, Object.entries(sorts).filter(([k]) => k !== 'custom' || playlist.value).map(([k, label]) => ({ label, icon: sortBy.value === k ? 'check' : undefined, fn: () => { sortBy.value = k; } })));
}
function moreMenu(e) {
  const ids = tracks.value.map((t) => t.id);
  const p = playlist.value;
  if (p) return playlistMenu(e, p);
  ui.openMenu(e, [
    { label: 'Thêm vào hàng đợi', icon: 'queue', fn: () => { player.addToQueue(ids); ui.toast('Đã thêm vào hàng đợi'); } },
    { label: 'Thêm vào playlist', icon: 'plus', children: addToPlaylistItems(ids) },
    { label: 'Lưu thành playlist mới', icon: 'plus', fn: async () => { const np = await lib.createPlaylist(info.value.title, ids); router.push(`/playlist/${np.id}`); } },
  ]);
}

// Gợi ý thêm bài vào playlist
const findQ = ref('');
const suggestions = computed(() => {
  if (!playlist.value) return [];
  const f = fold(findQ.value.trim());
  const pool = lib.tracks.filter((t) => !playlist.value.trackIds.includes(t.id));
  return (f ? pool.filter((t) => fold(`${t.title} ${t.artist} ${t.album}`).includes(f)) : pool).slice(0, f ? 20 : 8);
});
</script>

<template>
  <div v-if="kind === 'playlist' && !playlist" class="page"><p class="muted" style="padding-top: 40px">Không tìm thấy playlist.</p></div>
  <div v-else class="coll" :style="{ '--c': color }">
    <div class="wash" />
    <div class="page">
      <header class="hd">
        <button class="cv-btn" :class="{ editable: !!playlist }" :disabled="!playlist" title="Sửa thông tin" @click="ui.open('editPlaylist', { playlist })">
          <Cover :src="info.cover" :mosaic="info.mosaic" :liked="info.liked" :icon="info.icon" :size="480" class="cv" />
        </button>
        <div class="info">
          <span class="type">{{ info.type }}</span>
          <h1 class="display" :class="{ long: info.title.length > 28 }" @click="playlist && ui.open('editPlaylist', { playlist })">{{ info.title }}</h1>
          <p v-if="info.desc" class="desc">{{ info.desc }}</p>
          <p class="meta">
            <template v-if="album"><RouterLink :to="`/artist/${encodeURIComponent(album.artist)}`" class="link"><b>{{ album.artist }}</b></RouterLink> · </template>
            {{ tracks.length }} bài<template v-if="total"> · {{ fmtTotal(total) }}</template>
          </p>
          <div class="acts">
            <PlayButton :size="60" :playing="ctxPlaying" :disabled="!tracks.length" @click="play(false)" />
            <button class="round-btn" :class="{ on: player.shuffle }" title="Phát ngẫu nhiên" @click="play(true)"><Icon name="shuffle" size="20" /></button>
            <button class="round-btn" title="Tùy chọn khác" @click="moreMenu"><Icon name="more" size="20" /></button>
          </div>
        </div>
      </header>

      <div class="bar">
        <label class="filter"><Icon name="search" size="16" /><input v-model="filterQ" placeholder="Lọc trong danh sách" /></label>
        <button class="btn btn-outline sm" @click="sortMenu"><Icon name="sort" size="15" /> {{ sorts[sortBy] }}</button>
      </div>

      <TrackList v-if="shown.length" :tracks="shown" :context="context" :playlist="playlist" :sortable="sortable" :show-album="kind !== 'album'" />
      <p v-else-if="tracks.length" class="muted pad">Không có bài nào khớp "{{ filterQ }}".</p>
      <div v-else-if="kind === 'liked'" class="empty">
        <Icon name="heart" size="44" />
        <h2 class="display">Những bài bạn thích sẽ nằm ở đây</h2>
        <p class="muted">Nhấn ♡ ở bất kỳ bài nào, hoặc phím <kbd>L</kbd> khi đang nghe.</p>
      </div>

      <section v-if="playlist" class="find">
        <div class="section-title"><h2>{{ tracks.length ? 'Thêm bài khác' : 'Hãy chọn vài bài cho playlist này' }}</h2></div>
        <label class="filter wide"><Icon name="search" size="16" /><input v-model="findQ" placeholder="Tìm bài trong thư viện" /></label>
        <div v-for="t in suggestions" :key="t.id" class="sug">
          <Cover :src="t.coverUrl" :size="80" class="scv" />
          <div class="m"><div class="ellipsis">{{ t.title }}</div><small class="muted ellipsis">{{ t.artist }}</small></div>
          <span class="muted ellipsis alb">{{ t.album }}</span>
          <button class="btn btn-soft sm" @click="lib.addToPlaylist(playlist, t.id)"><Icon name="plus" size="15" /> Thêm</button>
        </div>
        <p class="muted more">
          {{ suggestions.length ? '' : lib.tracks.length ? 'Không còn bài nào phù hợp.' : 'Thư viện đang trống.' }}
          <button class="link" @click="ui.open('import', { playlistId: playlist.id })"><Icon name="youtube" size="15" /> Thêm nhạc từ YouTube thẳng vào playlist này</button>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.coll { position: relative; min-height: 100%; }
.wash { position: absolute; z-index: 0; top: calc(-1 * var(--nav-h)); left: 0; right: 0; height: 520px; pointer-events: none;
  background: radial-gradient(120% 90% at 20% 0%, color-mix(in oklab, var(--c) 45%, transparent), transparent 70%); opacity: .8; transition: background .6s; }
.page { position: relative; z-index: 1; }
.hd { display: flex; align-items: flex-end; gap: 32px; padding: 20px 0 8px; }
.cv-btn { flex-shrink: 0; cursor: default; border-radius: 24px; transition: transform .3s var(--spring); }
.cv-btn.editable { cursor: pointer; }
.cv-btn.editable:hover { transform: scale(1.02) rotate(-1deg); }
.cv { width: clamp(160px, 18vw, 220px); --cover-r: 24px; box-shadow: 0 24px 60px -20px rgb(0 0 0 / .55); }
.info { flex: 1; min-width: 0; }
.type { display: inline-block; padding: 3px 10px; border-radius: 999px; background: var(--hover); border: 1px solid var(--line); font-size: 12px; font-weight: 500; color: var(--text-2); }
h1 { font-size: clamp(30px, 4.2vw, 52px); font-weight: 600; line-height: 1.1; margin: 10px 0 8px; overflow-wrap: anywhere; }
h1.long { font-size: clamp(24px, 3vw, 38px); }
.desc { margin: 0 0 6px; color: var(--text-2); max-width: 60ch; }
.meta { margin: 0; color: var(--text-2); font-size: 14px; }
.meta b { color: var(--text); font-weight: 600; }
.acts { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
.round-btn { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--hover); border: 1px solid var(--line); color: var(--text-2); transition: all .2s; }
.round-btn:hover { background: var(--press); color: var(--text); }
.round-btn.on { color: var(--accent); background: var(--accent-soft); }
.bar { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin: 20px 0 10px; }
.filter { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 999px; background: var(--hover); border: 1px solid var(--line); color: var(--text-3); width: 220px; }
.filter:focus-within { border-color: var(--accent); }
.filter input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font-size: 13.5px; }
.filter.wide { width: min(380px, 100%); margin-bottom: 12px; }
.btn.sm { height: 38px; padding: 0 14px; font-size: 13px; font-weight: 500; }
.pad { padding: 16px 8px; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 56px 16px; text-align: center; color: var(--text-2); }
.empty h2 { font-size: 22px; font-weight: 600; color: var(--text); }
.find { margin-top: 24px; }
.sug { display: flex; align-items: center; gap: 14px; padding: 8px 10px; border-radius: 16px; }
.sug:hover { background: var(--hover); }
.scv { width: 44px; --cover-r: 10px; }
.m { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.alb { width: 28%; font-size: 13px; }
.more { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 12px; }
.more .link { display: inline-flex; align-items: center; gap: 6px; color: var(--accent); font-weight: 500; }
@media (max-width: 767px) {
  .hd { flex-direction: column; align-items: center; text-align: center; gap: 18px; padding-top: 12px; }
  .cv { width: min(62vw, 240px); }
  .acts { justify-content: center; }
  .bar { justify-content: stretch; }
  .filter { flex: 1; width: auto; }
  .alb { display: none; }
}
</style>
