<script setup>
// Danh sách bài hát kiểu "dòng có khoảng thở".
// Bấm một dòng = phát. Ctrl/⌘ + bấm = chọn, Shift + bấm = chọn một dải; nhấn giữ (mobile) = vào chế độ chọn.
// Kéo-thả để sắp xếp (khi sortable) hoặc thả vào thẻ playlist; vuốt trái (mobile) để lộ nút Hàng đợi / Xóa.
import { ref, computed } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import EqBars from './EqBars.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { fmtTime, fmtDate } from '../../utils.js';
import { useDragSort, DRAG_MIME } from '../../composables/useDragSort.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';

const props = defineProps({
  tracks: Array,
  context: Object, // { name, path }
  playlist: Object, // có -> cho phép sắp xếp / xóa khỏi playlist
  showAlbum: { type: Boolean, default: true },
  numbered: { type: Boolean, default: true },
  sortable: Boolean,
  selectable: { type: Boolean, default: true },
});
const player = usePlayer(), lib = useLibrary(), ui = useUi();
const trackMenu = useTrackMenu();
const dnd = useDragSort((a, b) => lib.moveInPlaylist(props.playlist, a, b), { enabled: () => props.sortable });

const colAlbum = computed(() => props.showAlbum && ui.colAlbum && !ui.isMobile);
const colAdded = computed(() => ui.colAdded && !ui.isMobile);
const isCur = (t) => player.isCurrent(t, props.context?.path);
const selected = computed(() => new Set(ui.selection));
let anchor = -1;

function play(i) {
  const t = props.tracks[i];
  if (isCur(t)) return player.toggle();
  player.playTracks(props.tracks, i, props.context);
}
function toggleSel(i) {
  const id = props.tracks[i].id;
  ui.selPlaylist = props.playlist || null;
  ui.selection = selected.value.has(id) ? ui.selection.filter((x) => x !== id) : [...ui.selection, id];
  anchor = i;
}
function onClick(e, i) {
  if (swipeOpen.value !== null) { swipeOpen.value = null; return; }
  if (!props.selectable) return play(i);
  if (e.shiftKey && anchor >= 0) {
    const [a, b] = [Math.min(anchor, i), Math.max(anchor, i)];
    ui.selPlaylist = props.playlist || null;
    ui.selection = [...new Set([...ui.selection, ...props.tracks.slice(a, b + 1).map((t) => t.id)])];
    return;
  }
  if (e.ctrlKey || e.metaKey || ui.selection.length) return toggleSel(i);
  play(i);
}
// Kéo: nếu dòng đang được chọn thì mang theo cả nhóm
function dragBind(i, t) {
  const b = dnd.bind(i, [t.id]);
  return { ...b, onDragstart(e) { b.onDragstart(e); if (selected.value.has(t.id)) e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ui.selection)); } };
}

// Cử chỉ chạm: nhấn giữ = chọn, vuốt trái = lộ nút
const swipeOpen = ref(null); // index đang mở
const swipeDx = ref(0), swipeIdx = ref(-1);
let touch = null, holdTimer = null;
function tStart(e, i) {
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null, i };
  holdTimer = setTimeout(() => { if (touch && !touch.axis) { navigator.vibrate?.(15); toggleSel(i); touch.held = true; } }, 450);
}
function tMove(e) {
  if (!touch) return;
  const x = e.touches[0].clientX - touch.x, y = e.touches[0].clientY - touch.y;
  if (!touch.axis && Math.hypot(x, y) > 8) { touch.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y'; clearTimeout(holdTimer); }
  if (touch.axis === 'x') { swipeIdx.value = touch.i; swipeDx.value = Math.min(0, x + (swipeOpen.value === touch.i ? -132 : 0)); }
}
function tEnd(e) {
  clearTimeout(holdTimer);
  if (touch?.held) e.preventDefault();
  if (touch?.axis === 'x') swipeOpen.value = swipeDx.value < -60 ? touch.i : null;
  swipeDx.value = 0; swipeIdx.value = -1; touch = null;
}
const rowShift = (i) => (swipeIdx.value === i ? swipeDx.value : swipeOpen.value === i ? -132 : 0);
function swipeRemove(t) {
  swipeOpen.value = null;
  if (props.playlist) lib.removeFromPlaylist(props.playlist, t.id); else lib.deleteTrack(t);
}
function swipeQueue(t) { swipeOpen.value = null; player.addToQueue(t.id); ui.toast('Đã thêm vào hàng đợi'); }
</script>

<template>
  <div class="tl" :class="{ selecting: ui.selection.length }" role="list">
    <div v-for="(t, i) in tracks" :key="t.id + i" class="wrap" role="listitem" :style="dnd.styleOf(i)">
      <div v-if="ui.isMobile && rowShift(i)" class="swipe-acts">
        <button class="sa q" @click="swipeQueue(t)"><Icon name="queue" size="18" />Hàng đợi</button>
        <button class="sa del" @click="swipeRemove(t)"><Icon :name="playlist ? 'minus' : 'trash'" size="18" />{{ playlist ? 'Bỏ ra' : 'Xóa' }}</button>
      </div>
      <div class="row"
        :class="{ cur: isCur(t), sel: selected.has(t.id) }"
        :style="{ transform: rowShift(i) ? `translateX(${rowShift(i)}px)` : '', transition: swipeIdx === i ? 'none' : '' }"
        v-bind="ui.isMobile ? { 'data-sort-g': dnd.gid, 'data-sort-i': i } : dragBind(i, t)"
        @click="onClick($event, i)" @contextmenu="trackMenu($event, t, { playlist })"
        @touchstart.passive="tStart($event, i)" @touchmove.passive="tMove" @touchend="tEnd">
        <span v-if="sortable" class="grip" title="Kéo để sắp xếp" v-bind="ui.isMobile ? dnd.handle(i) : {}" @click.stop><Icon name="grip" size="16" /></span>
        <span class="n">
          <span v-if="selected.has(t.id) || (ui.selection.length && !ui.isMobile)" class="check" :class="{ on: selected.has(t.id) }" @click.stop="toggleSel(i)"><Icon v-if="selected.has(t.id)" name="check" size="14" /></span>
          <template v-else>
            <EqBars v-if="isCur(t) && player.playing" class="eq" />
            <span v-else-if="numbered" class="num">{{ i + 1 }}</span>
            <button class="hplay" :aria-label="isCur(t) && player.playing ? 'Tạm dừng' : 'Phát'" @click.stop="play(i)"><Icon :name="isCur(t) && player.playing ? 'pause' : 'play'" size="14" /></button>
          </template>
        </span>
        <Cover :src="t.coverUrl" :size="96" class="cv" />
        <span class="tx">
          <span class="name ellipsis">{{ t.title }}</span>
          <span class="sub ellipsis">
            <RouterLink :to="`/artist/${encodeURIComponent(t.artist)}`" class="link" @click.stop>{{ t.artist }}</RouterLink>
            <template v-if="t.album && showAlbum && !colAlbum"><span class="hover-album"> · <RouterLink :to="`/album/${encodeURIComponent(t.artist)}/${encodeURIComponent(t.album)}`" class="link" @click.stop>{{ t.album }}</RouterLink></span></template>
          </span>
        </span>
        <RouterLink v-if="colAlbum" :to="t.album ? `/album/${encodeURIComponent(t.artist)}/${encodeURIComponent(t.album)}` : ''" class="col album ellipsis link" :class="{ none: !t.album }" @click.stop>{{ t.album }}</RouterLink>
        <span v-if="colAdded" class="col added ellipsis">{{ fmtDate(t.createdAt) }}</span>
        <button class="icon-btn like" :class="{ liked: t.liked }" :aria-label="t.liked ? 'Bỏ thích' : 'Thích'" @click.stop="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="17" /></button>
        <span v-if="!ui.isMobile" class="time">{{ fmtTime(t.duration) }}</span>
        <button class="icon-btn more" aria-label="Tùy chọn" @click.stop="trackMenu($event, t, { playlist })"><Icon name="more" size="17" /></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tl { display: flex; flex-direction: column; gap: 2px; }
/* Bo góc + clip chỉ ở .wrap; lớp nút vuốt chỉ render khi đang vuốt để không lộ viền ở góc bo */
.wrap { position: relative; border-radius: 16px; overflow: hidden; isolation: isolate; }
.row { position: relative; display: flex; align-items: center; gap: 14px; height: 64px; padding: 0 10px 0 8px; color: var(--text-2); background: var(--bg); transition: background .2s, transform .3s var(--ease); cursor: default; user-select: none; }
.row:hover { background: color-mix(in oklab, var(--text) 5%, var(--bg)); }
.row.cur { background: color-mix(in oklab, var(--accent) 9%, var(--bg)); }
.row.sel { background: color-mix(in oklab, var(--accent) 16%, var(--bg)); }
.row.over { box-shadow: inset 0 2px 0 var(--accent); }
.grip { color: var(--text-3); opacity: 0; cursor: grab; margin-right: -8px; touch-action: none; display: grid; place-items: center; }
.row:hover .grip { opacity: 1; }
.n { width: 28px; flex-shrink: 0; display: flex; justify-content: center; font-variant-numeric: tabular-nums; font-size: 14px; color: var(--text-3); }
.hplay { display: none; place-items: center; color: var(--text); }
.row:hover .num, .row:hover .eq { display: none; }
.row:hover .hplay { display: grid; }
.check { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--text-3); display: grid; place-items: center; cursor: pointer; }
.check.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.cv { width: 46px; --cover-r: 12px; }
.tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.name { color: var(--text); font-size: 15px; font-weight: 500; }
.cur .name { color: var(--accent); }
.sub { font-size: 13px; }
.sub a:hover { color: var(--text); }
.hover-album { opacity: 0; transition: opacity .2s; }
.row:hover .hover-album { opacity: 1; }
.col { width: 22%; flex-shrink: 0; font-size: 13.5px; }
.col.added { width: 120px; }
.album.none { pointer-events: none; }
.album:hover { color: var(--text); }
.time { width: 44px; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; color: var(--text-3); }
.like, .more { width: 32px; height: 32px; }
.like:not(.liked), .more { opacity: 0; }
.row:hover .like, .row:hover .more { opacity: 1; }
.swipe-acts { position: absolute; inset: 0 0 0 auto; display: flex; }
.sa { width: 66px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 11px; font-weight: 600; }
.sa.q { background: var(--surface-3); }
.sa.del { background: var(--danger); color: #fff; }
@media (max-width: 767px) {
  .row { height: 62px; padding: 0 4px 0 6px; gap: 12px; }
  .n { display: none; }
  .selecting .n { display: flex; }
  .cv { width: 48px; }
  .more, .like.liked { opacity: 1; }
  .like:not(.liked) { display: none; }
  .grip { opacity: 1; width: 36px; height: 100%; margin: 0 -10px 0 -6px; }
  .hover-album { display: none; }
}
</style>
