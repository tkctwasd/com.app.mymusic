<script setup>
// Thanh thao tác nổi khi chọn nhiều bài: Phát · Hàng đợi · Thêm vào playlist · Thích · Bỏ khỏi playlist · Xóa
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { useMenus } from '../../composables/useMenus.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi();
const { addToPlaylistItems } = useMenus();
const tracks = computed(() => ui.selection.map((id) => lib.byId[id]).filter(Boolean));
const allLiked = computed(() => tracks.value.every((t) => t.liked));

const done = (msg) => { if (msg) ui.toast(msg); ui.clearSelection(); };
function play() { player.playTracks(tracks.value, 0, { name: `${tracks.value.length} bài đã chọn`, path: '' }); done(); }
function queue() { player.addToQueue(ui.selection); done(`Đã thêm ${tracks.value.length} bài vào hàng đợi`); }
async function like() {
  const v = !allLiked.value;
  for (const t of tracks.value) if (t.liked !== v) { t.liked = v; lib.updateTrack(t, { liked: v }).catch(() => {}); }
  done(v ? `Đã thích ${tracks.value.length} bài` : `Đã bỏ thích ${tracks.value.length} bài`);
}
async function removeFromPl() { const p = ui.selPlaylist; await lib.removeFromPlaylist(p, ui.selection); done(`Đã bỏ ${tracks.value.length} bài khỏi ${p.name}`); }
function del() { if (confirm(`Xóa ${tracks.value.length} bài khỏi thư viện?`)) { lib.deleteTracks(tracks.value); done(); } }
function addTo(e) {
  const ids = [...ui.selection];
  ui.openMenu(e, addToPlaylistItems(ids, ui.selPlaylist).map((it) => (it.fn ? { ...it, fn: () => { it.fn(); ui.clearSelection(); } } : it)));
}
</script>

<template>
  <Transition name="sb">
    <div v-if="tracks.length" class="sb">
      <button class="icon-btn" title="Bỏ chọn (Esc)" @click="ui.clearSelection()"><Icon name="x" size="18" /></button>
      <b>{{ tracks.length }} đã chọn</b>
      <span class="sep" />
      <button class="act" @click="play"><Icon name="play" size="16" /><span>Phát</span></button>
      <button class="act" @click="queue"><Icon name="queue" size="16" /><span>Hàng đợi</span></button>
      <button class="act" @click="addTo"><Icon name="plus" size="16" /><span>Playlist</span></button>
      <button class="act" @click="like"><Icon :name="allLiked ? 'heartFill' : 'heart'" size="16" /><span>{{ allLiked ? 'Bỏ thích' : 'Thích' }}</span></button>
      <button v-if="ui.selPlaylist" class="act" @click="removeFromPl"><Icon name="minus" size="16" /><span>Bỏ khỏi playlist</span></button>
      <button class="act danger" @click="del"><Icon name="trash" size="16" /><span>Xóa</span></button>
    </div>
  </Transition>
</template>

<style scoped>
.sb { position: fixed; z-index: 250; left: 50%; bottom: calc(var(--dock-h) + 32px); transform: translateX(-50%); display: flex; align-items: center; gap: 4px; padding: 6px 8px 6px 6px; max-width: calc(100% - 16px); overflow-x: auto; scrollbar-width: none;
  border-radius: 999px; background: var(--text); color: var(--bg); box-shadow: var(--shadow-lg); }
.sb .icon-btn { color: var(--bg); }
.sb .icon-btn:hover { background: color-mix(in oklab, var(--bg) 12%, transparent); }
b { white-space: nowrap; padding: 0 6px 0 2px; font-weight: 600; }
.sep { width: 1px; height: 22px; background: color-mix(in oklab, var(--bg) 20%, transparent); margin: 0 4px; }
.act { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: 18px; font-weight: 500; white-space: nowrap; }
.act:hover { background: color-mix(in oklab, var(--bg) 12%, transparent); }
.act.danger:hover { background: var(--danger); color: #fff; }
.sb-enter-active, .sb-leave-active { transition: all .35s var(--spring); }
.sb-enter-from, .sb-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px) scale(.95); }
@media (max-width: 767px) { .sb { bottom: calc(var(--mnav-h) + 80px + env(safe-area-inset-bottom)); } .act span { display: none; } .act { padding: 0 10px; } }
</style>
