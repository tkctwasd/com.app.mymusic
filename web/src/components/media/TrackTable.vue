<script setup>
// Bảng bài hát: hover số -> ▶, bài đang phát xanh + sóng nhạc, click đúp phát, chuột phải menu,
// kéo-thả sắp xếp (khi sortable) và kéo bài sang playlist ở sidebar.
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import EqBars from './EqBars.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { fmtTime, fmtDate } from '../../utils.js';
import { useDragSort } from '../../composables/useDragSort.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';

const props = defineProps({
  tracks: Array,
  context: Object, // { name, path }
  playlist: Object, // có -> cho phép sắp xếp/xóa khỏi playlist
  showAlbum: { type: Boolean, default: true },
  showAdded: { type: Boolean, default: true },
  showHeader: { type: Boolean, default: true },
  numbered: { type: Boolean, default: true },
  sortable: Boolean,
});
const player = usePlayer(), lib = useLibrary(), ui = useUi();
const trackMenu = useTrackMenu();
const dnd = useDragSort((a, b) => lib.moveInPlaylist(props.playlist, a, b), { enabled: () => props.sortable });

const cols = computed(() => ['16px', 'minmax(0, 4fr)', props.showAlbum && 'minmax(0, 2fr)', props.showAdded && 'minmax(0, 1.2fr)', '112px'].filter(Boolean).join(' '));
const isCur = (t) => player.isCurrent(t, props.context?.path);
const play = (i) => {
  const t = props.tracks[i];
  if (isCur(t)) return player.toggle();
  player.playTracks(props.tracks, i, props.context);
};
const addedAt = (t) => fmtDate(t.createdAt);
</script>

<template>
  <div class="tt" :style="{ '--cols': cols }" role="grid">
    <div v-if="showHeader && !ui.isMobile" class="head row" role="row">
      <span class="n">#</span><span>Tiêu đề</span><span v-if="showAlbum">Album</span><span v-if="showAdded">Ngày thêm</span>
      <span class="dur"><Icon name="clock" size="16" /></span>
    </div>
    <div v-for="(t, i) in tracks" :key="t.id + i" class="row" role="row"
      :class="{ cur: isCur(t), over: dnd.overIndex.value === i && dnd.dragFrom.value !== i }"
      v-bind="dnd.bind(i, [t.id])"
      @dblclick="play(i)" @click="ui.isMobile && play(i)" @contextmenu="trackMenu($event, t, { playlist })">
      <span class="n">
        <template v-if="numbered">
          <EqBars v-if="isCur(t) && player.playing" class="eq" />
          <span v-else class="num">{{ i + 1 }}</span>
        </template>
        <button class="hplay" :aria-label="isCur(t) && player.playing ? 'Tạm dừng' : 'Phát'" @click.stop="play(i)"><Icon :name="isCur(t) && player.playing ? 'pause' : 'play'" size="14" /></button>
      </span>
      <span class="title">
        <Cover :src="t.coverUrl" :size="80" class="cv" />
        <span class="tx">
          <span class="name ellipsis">{{ t.title }}</span>
          <RouterLink :to="`/artist/${encodeURIComponent(t.artist)}`" class="artist ellipsis link" @click.stop>{{ t.artist }}</RouterLink>
        </span>
      </span>
      <RouterLink v-if="showAlbum && !ui.isMobile" :to="t.album ? `/album/${encodeURIComponent(t.artist)}/${encodeURIComponent(t.album)}` : ''" class="album ellipsis link" :class="{ none: !t.album }" @click.stop>{{ t.album }}</RouterLink>
      <span v-if="showAdded && !ui.isMobile" class="added ellipsis">{{ addedAt(t) }}</span>
      <span class="dur">
        <button class="icon-btn like" :class="{ on: t.liked }" :aria-label="t.liked ? 'Bỏ thích' : 'Thích'" @click.stop="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="16" /></button>
        <span v-if="!ui.isMobile" class="time">{{ fmtTime(t.duration) }}</span>
        <button class="icon-btn more" aria-label="Tùy chọn" @click.stop="trackMenu($event, t, { playlist })"><Icon name="more" size="16" /></button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.tt { padding: 0 24px; }
.row { display: grid; grid-template-columns: var(--cols); gap: 16px; align-items: center; height: 56px; padding: 0 16px; border-radius: 4px; color: var(--text-2); font-size: 14px; }
.row:not(.head):hover { background: rgba(255,255,255,.1); }
.row:not(.head):hover .num, .row:not(.head):hover .eq { display: none; }
.row:not(.head):hover .hplay { display: grid; }
.row.over { box-shadow: inset 0 2px 0 var(--accent); }
.head { height: 36px; position: sticky; top: 64px; z-index: 2; background: var(--surface); border-bottom: 1px solid rgba(255,255,255,.1); margin-bottom: 16px; border-radius: 0; font-size: 13px; }
.n { text-align: right; display: flex; justify-content: flex-end; font-variant-numeric: tabular-nums; position: relative; font-size: 16px; }
.hplay { display: none; place-items: center; color: #fff; }
.title { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cv { width: 40px; }
.tx { display: flex; flex-direction: column; min-width: 0; }
.name { color: #fff; font-size: 16px; }
.cur .name { color: var(--accent); }
.artist:hover, .album:hover { color: #fff; }
.album.none { pointer-events: none; }
.dur { display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-variant-numeric: tabular-nums; }
.time { width: 40px; text-align: right; }
.like, .more { width: 28px; height: 28px; opacity: 0; }
.like.on { opacity: 1; color: var(--accent); }
.like.on::after { display: none; }
.row:hover .like, .row:hover .more { opacity: 1; }
@media (max-width: 767px) {
  .tt { padding: 0 8px; }
  .row { grid-template-columns: 1fr auto; height: 64px; padding: 0 8px; }
  .n { display: none; }
  .cv { width: 48px; }
  .name { font-size: 15px; }
  .more, .like.on { opacity: 1; }
  .like:not(.on) { display: none; }
}
</style>
