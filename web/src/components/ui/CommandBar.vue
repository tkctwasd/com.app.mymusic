<script setup>
// Command bar (Ctrl+K): một ô làm mọi việc.
// - Gõ chữ: tìm bài / nghệ sĩ / album / playlist (không dấu), ↑↓ + Enter để phát hoặc mở.
// - Dán link YouTube: xem trước ngay, Enter để tải về (chọn playlist đích), hoặc "Tùy chỉnh…" để sửa/chọn bài.
// - Gõ ">" để dùng lệnh: >hẹn giờ 30, >trộn bài, >playlist mới Chill, >crossfade 5, >giao diện sáng…
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Icon from './Icon.vue';
import Cover from './Cover.vue';
import Select from './Select.vue';
import { api } from '../../api.js';
import { fold, fmtTime, load, save, shuffleArr } from '../../utils.js';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi(), router = useRouter();
const q = ref(ui.cmd?.q || '');
const input = ref(null);
const list = ref(null);
const sel = ref(0);
const cmdError = ref('');
const YT = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//;

onMounted(() => input.value?.focus());
const close = () => { ui.cmd = null; };

// ---- Lịch sử (dùng chung với trang Khám phá) ----
const history = ref(load('searchHistory', []));
function remember(item) {
  history.value = [item, ...history.value.filter((h) => h.to !== item.to)].slice(0, 10);
  save('searchHistory', history.value);
}

// ---- Link YouTube ----
const isLink = computed(() => YT.test(q.value.trim()));
const pv = ref(null); // { type, title?, items }
const pvLoading = ref(false);
const pvError = ref('');
const dest = ref('');
let pvTimer;
watch(q, (v) => {
  sel.value = 0;
  cmdError.value = '';
  clearTimeout(pvTimer);
  pv.value = null; pvError.value = '';
  if (!YT.test(v.trim())) return;
  pvLoading.value = true;
  pvTimer = setTimeout(async () => {
    const url = v.trim();
    try {
      const r = await api(`/api/youtube/preview?url=${encodeURIComponent(url)}`);
      if (q.value.trim() === url) pv.value = r;
    } catch (e) { if (q.value.trim() === url) pvError.value = e.message; }
    pvLoading.value = false;
  }, 250);
}, { immediate: true });

async function download() {
  if (!pv.value) return;
  const items = pv.value.type === 'playlist' ? pv.value.items : [pv.value.item];
  let pid = dest.value || undefined;
  if (pv.value.type === 'playlist' && dest.value === '__new') pid = (await lib.createPlaylist(pv.value.title)).id;
  await lib.startImport(items.map(({ url, title, artist }) => ({ url, title, artist })), pid);
  ui.toast(`Đang tải ${items.length} bài…`);
  close();
}
const destOptions = computed(() => [
  { value: '', label: 'Chỉ thư viện', sub: 'Thêm vào Tất cả bài hát', icon: 'shelf' },
  ...(pv.value?.type === 'playlist' ? [{ value: '__new', label: `Playlist mới "${pv.value.title}"`, sub: 'Tạo playlist từ danh sách YouTube', icon: 'plus' }] : []),
  ...lib.playlists.map((p) => ({ value: p.id, label: p.name, sub: `Playlist · ${p.trackIds.length} bài`, icon: 'list' })),
]);
function customize() { const url = q.value.trim(); close(); ui.open('import', { url, playlistId: dest.value && dest.value !== '__new' ? dest.value : undefined }); }

// ---- Lệnh ----
const setTheme = (m, label) => () => { ui.set('theme', m); ui.toast(`Giao diện ${label}`); };
const commands = [
  { label: 'hẹn giờ', hint: 'hẹn giờ 30  ·  hẹn giờ hết bài', icon: 'moon', arg: true, run: (a) => {
    if (/het|end/.test(fold(a))) { player.setSleep('end'); return ui.toast('Sẽ dừng khi hết bài này'); }
    const m = parseInt(a, 10);
    if (!(m > 0)) return 'Nhập số phút, ví dụ: >hẹn giờ 30';
    player.setSleep(m); ui.toast(`Sẽ dừng phát sau ${m} phút`);
  } },
  { label: 'tắt hẹn giờ', icon: 'x', run: () => { player.setSleep(null); ui.toast('Đã tắt hẹn giờ'); } },
  { label: 'trộn bài', hint: 'bật / tắt', icon: 'shuffle', run: () => { player.toggleShuffle(); ui.toast(player.shuffle ? 'Đã bật trộn bài' : 'Đã tắt trộn bài'); } },
  { label: 'lặp lại', hint: 'tắt → tất cả → một bài', icon: 'repeat', run: () => { player.cycleRepeat(); ui.toast({ off: 'Đã tắt lặp lại', all: 'Lặp lại danh sách', one: 'Lặp lại một bài' }[player.repeat]); } },
  { label: 'playlist mới', hint: 'playlist mới Chill tối', icon: 'plus', arg: true, run: async (a) => { const p = await lib.createPlaylist(a); router.push(`/playlist/${p.id}`); } },
  { label: 'crossfade', hint: 'crossfade 5  (0–12 giây)', icon: 'sparkle', arg: true, run: (a) => {
    const n = parseInt(a, 10);
    if (Number.isNaN(n)) return 'Nhập số giây 0–12';
    player.crossfade = Math.max(0, Math.min(12, n)); ui.toast(player.crossfade ? `Crossfade ${player.crossfade} giây` : 'Đã tắt crossfade');
  } },
  { label: 'âm lượng', hint: 'âm lượng 60', icon: 'volume', arg: true, run: (a) => { const n = parseInt(a, 10); if (Number.isNaN(n)) return 'Nhập 0–100'; player.setVolume(n / 100); } },
  { label: 'giao diện sáng', icon: 'sun', run: setTheme('light', 'sáng') },
  { label: 'giao diện tối', icon: 'moon', run: setTheme('dark', 'tối') },
  { label: 'giao diện theo hệ thống', icon: 'monitor', run: setTheme('system', 'theo hệ thống') },
  { label: 'màu cố định', hint: 'bật / tắt đổi màu theo ảnh bìa', icon: 'sparkle', run: () => { ui.set('fixedColor', !ui.fixedColor); ui.toast(ui.fixedColor ? 'Dùng màu cố định' : 'Màu đổi theo ảnh bìa'); } },
  { label: 'trình chiếu', hint: 'F', icon: 'present', run: () => ui.togglePresent() },
  { label: 'hàng đợi', hint: 'Q', icon: 'queue', run: () => ui.openStage('queue') },
  { label: 'lời bài hát', hint: 'Y', icon: 'lyrics', run: () => ui.openStage('lyrics') },
  { label: 'xóa hàng đợi', icon: 'trash', run: () => { player.clearQueue(); ui.toast('Đã xóa hàng đợi'); } },
  { label: 'phát ngẫu nhiên thư viện', icon: 'shuffle', run: () => lib.tracks.length && player.playTracks(shuffleArr(lib.tracks), 0, { name: 'Tất cả bài hát', path: '/songs' }) },
  { label: 'phát bài đã thích', icon: 'heart', run: () => lib.liked.length && player.playTracks(lib.liked, 0, { name: 'Bài hát đã thích', path: '/liked' }) },
  { label: 'cài đặt', icon: 'settings', run: () => ui.open('settings') },
];
function cmdMatches(text) {
  const raw = text.trim(), f = fold(raw);
  const out = [];
  for (const c of commands) {
    const lf = fold(c.label);
    if (c.arg && (f === lf || f.startsWith(lf + ' '))) out.unshift({ c, arg: raw.split(/\s+/).slice(c.label.split(' ').length).join(' ') });
    else if (!f || lf.includes(f) || (f.startsWith(lf) && !c.arg)) out.push({ c, arg: '' });
  }
  return out;
}

// ---- Danh sách mục hiển thị (phẳng để điều hướng bằng phím) ----
const sections = computed(() => {
  const v = q.value;
  if (isLink.value) return [];
  if (v.startsWith('>')) {
    return [{ title: 'Lệnh', items: cmdMatches(v.slice(1)).map(({ c, arg }) => ({
      icon: c.icon, title: '>' + c.label + (arg ? ' ' + arg : ''), sub: c.hint, kbd: c.arg && !arg ? 'Tab' : '',
      run: async () => { if (c.arg && !arg) { q.value = '>' + c.label + ' '; return 'keep'; } const err = await c.run(arg); if (err) { cmdError.value = err; return 'keep'; } },
    })) }];
  }
  if (!v.trim()) {
    return [
      history.value.length && { title: 'Gần đây', items: history.value.slice(0, 5).map((h) => ({
        icon: h.kind === 'query' ? 'clock' : null, cover: h.cover, round: h.kind === 'artist', title: h.title, sub: h.kind === 'query' ? 'Tìm kiếm' : h.sub,
        run: () => { if (h.kind === 'query') { q.value = h.title; return 'keep'; } router.push(h.to); },
      })) },
      { title: 'Gợi ý', items: [
        { icon: 'youtube', title: 'Thêm nhạc từ YouTube', sub: 'Dán link video hoặc playlist vào ô trên', run: async () => { try { q.value = (await navigator.clipboard.readText()).trim(); } catch {} return 'keep'; } },
        { icon: 'upload', title: 'Tải file nhạc lên', sub: 'mp3, m4a, flac, wav… từ máy hoặc điện thoại', run: () => lib.pickUpload() },
        { icon: 'shuffle', title: 'Phát ngẫu nhiên cả thư viện', run: commands.find((c) => c.label === 'phát ngẫu nhiên thư viện').run },
        { icon: 'moon', title: 'Hẹn giờ ngủ 30 phút', run: () => commands[0].run('30') },
        { icon: 'terminal', title: 'Xem tất cả lệnh', sub: 'Gõ > để bắt đầu', run: () => { q.value = '>'; return 'keep'; } },
      ] },
    ].filter(Boolean);
  }
  const r = lib.search(v);
  const ctx = { name: `Tìm "${v.trim()}"`, path: `/explore?q=${encodeURIComponent(v.trim())}` };
  const art = (a) => `/artist/${encodeURIComponent(a)}`;
  const alb = (a) => `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`;
  const go = (item) => () => { remember(item); router.push(item.to); };
  return [
    r.tracks.length && { title: 'Bài hát', items: r.tracks.slice(0, 6).map((t, i) => ({
      cover: t.coverUrl, title: t.title, sub: `${t.artist}${t.album ? ' · ' + t.album : ''}`, meta: fmtTime(t.duration), playing: player.isCurrent(t),
      run: () => { remember({ kind: 'query', title: v.trim(), to: ctx.path }); player.playTracks(r.tracks, i, ctx); },
    })) },
    r.artists.length && { title: 'Nghệ sĩ', items: r.artists.slice(0, 3).map((a) => ({ cover: a.coverUrl, round: true, icon: a.coverUrl ? null : 'artist', title: a.name, sub: `Nghệ sĩ · ${a.tracks.length} bài`, run: go({ kind: 'artist', title: a.name, sub: 'Nghệ sĩ', cover: a.coverUrl, to: art(a.name) }) })) },
    r.albums.length && { title: 'Album', items: r.albums.slice(0, 3).map((a) => ({ cover: a.coverUrl, title: a.name, sub: `Album · ${a.artist}`, run: go({ kind: 'album', title: a.name, sub: `Album · ${a.artist}`, cover: a.coverUrl, to: alb(a) }) })) },
    r.playlists.length && { title: 'Playlist', items: r.playlists.slice(0, 3).map((p) => ({ cover: lib.playlistTracks(p)[0]?.coverUrl, icon: 'music', title: p.name, sub: `Playlist · ${p.trackIds.length} bài`, run: go({ kind: 'playlist', title: p.name, sub: 'Playlist', cover: lib.playlistTracks(p)[0]?.coverUrl, to: `/playlist/${p.id}` }) })) },
    { title: '', items: [{ icon: 'compass', title: `Xem tất cả kết quả cho "${v.trim()}"`, sub: 'Mở trang Khám phá', run: () => { ui.searchQ = v.trim(); router.push({ path: '/explore', query: { q: v.trim() } }); } }] },
  ].filter(Boolean);
});
const flat = computed(() => sections.value.flatMap((s) => s.items));
const idxOf = (it) => flat.value.indexOf(it);

async function run(it) {
  if (!it) return;
  cmdError.value = '';
  const r = await it.run();
  if (r === 'keep') { await nextTick(); input.value?.focus(); return; }
  close();
}
function onKey(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = flat.value.length;
    if (!n) return;
    sel.value = (sel.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    nextTick(() => list.value?.querySelector('.it.sel')?.scrollIntoView({ block: 'nearest' }));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (isLink.value) return download();
    run(flat.value[sel.value]);
  } else if (e.key === 'Tab' && q.value.startsWith('>')) {
    e.preventDefault();
    const it = flat.value[sel.value];
    if (it) q.value = it.kbd ? it.title + ' ' : it.title;
  }
}
</script>

<template>
  <div class="cmd-back" @pointerdown.self="close">
    <div class="cmd" role="dialog" aria-label="Command bar">
      <div class="inp">
        <Icon :name="isLink ? 'youtube' : q.startsWith('>') ? 'terminal' : 'search'" size="20" class="lead" :class="{ yt: isLink }" />
        <input ref="input" v-model="q" placeholder="Tìm bài hát, nghệ sĩ… dán link YouTube… hoặc gõ > để dùng lệnh" autocomplete="off" spellcheck="false" @keydown="onKey" />
        <kbd @click="close">Esc</kbd>
      </div>
      <p v-if="cmdError" class="err"><Icon name="alert" size="15" /> {{ cmdError }}</p>

      <!-- Link YouTube -->
      <div v-if="isLink" class="link-mode">
        <div v-if="pvLoading" class="pv"><div class="skeleton thumb" /><div class="grow"><div class="skeleton line" /><div class="skeleton line short" /></div></div>
        <p v-else-if="pvError" class="err"><Icon name="alert" size="15" /> {{ pvError }}</p>
        <template v-else-if="pv">
          <div class="pv">
            <img :src="pv.type === 'playlist' ? pv.items[0]?.thumbnail : pv.item.thumbnail" class="thumb" alt="" />
            <div class="grow">
              <b class="two-line">{{ pv.type === 'playlist' ? pv.title : pv.item.title }}</b>
              <small class="muted">{{ pv.type === 'playlist' ? `Playlist · ${pv.items.length} video` : `${pv.item.artist} · ${fmtTime(pv.item.duration)}` }}</small>
            </div>
          </div>
          <div class="dest">
            <label class="lbl" for="cmd-dest">Lưu vào</label>
            <Select id="cmd-dest" v-model="dest" :options="destOptions" />
          </div>
          <div class="acts">
            <button class="btn btn-soft" @click="customize"><Icon name="edit" size="16" /> Tùy chỉnh…</button>
            <button class="btn btn-primary" @click="download"><Icon name="download" size="16" /> Tải về <kbd class="k">Enter</kbd></button>
          </div>
        </template>
      </div>

      <!-- Kết quả / lệnh / gợi ý -->
      <div v-else ref="list" class="list scroll">
        <template v-for="(s, si) in sections" :key="si">
          <div v-if="s.title" class="sec">{{ s.title }}</div>
          <button v-for="it in s.items" :key="idxOf(it)" class="it" :class="{ sel: idxOf(it) === sel }" @mousemove="sel = idxOf(it)" @click="run(it)">
            <Cover v-if="it.cover !== undefined && (it.cover || !it.icon)" :src="it.cover" :round="it.round" :size="80" class="cv" />
            <span v-else class="ic"><Icon :name="it.icon || 'music'" size="18" /></span>
            <span class="tx"><span class="ellipsis t" :class="{ playing: it.playing }">{{ it.title }}</span><small v-if="it.sub" class="ellipsis">{{ it.sub }}</small></span>
            <small v-if="it.meta" class="meta">{{ it.meta }}</small>
            <kbd v-if="it.kbd">{{ it.kbd }}</kbd>
            <Icon v-else-if="idxOf(it) === sel" name="enter" size="16" class="enter" />
          </button>
        </template>
        <p v-if="!flat.length" class="nores">Không có kết quả. Thử từ khác, hoặc dán link YouTube để thêm bài mới.</p>
      </div>

      <footer>
        <span><kbd>↑</kbd><kbd>↓</kbd> chọn</span><span><kbd>Enter</kbd> mở</span><span><kbd>&gt;</kbd> lệnh</span><span><kbd>Ctrl</kbd><kbd>V</kbd> dán link</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.cmd-back { position: fixed; inset: 0; z-index: 850; display: flex; justify-content: center; align-items: flex-start; padding: 12vh 16px 16px; background: rgb(0 0 0 / .35); backdrop-filter: blur(6px); animation: fade .2s; }
.cmd { width: min(660px, 100%); max-height: 72vh; display: flex; flex-direction: column; border-radius: 24px; background: var(--glass-strong); backdrop-filter: blur(30px) saturate(1.5); border: 1px solid var(--line-2); box-shadow: var(--shadow-lg); overflow: hidden; animation: pop .3s var(--spring); }
@keyframes fade { from { opacity: 0; } }
@keyframes pop { from { opacity: 0; transform: translateY(-10px) scale(.98); } }
.inp { display: flex; align-items: center; gap: 12px; padding: 0 16px 0 20px; height: 62px; border-bottom: 1px solid var(--line); }
.lead { color: var(--text-3); }
.lead.yt { color: #ff4e45; }
.inp input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; outline: none; font-size: 16px; }
.inp input::placeholder { color: var(--text-3); }
.inp kbd { cursor: pointer; }
.err { display: flex; align-items: center; gap: 6px; color: var(--danger); margin: 10px 20px 0; font-size: 13px; }
.list { padding: 6px 8px 8px; min-height: 0; }
.sec { padding: 12px 12px 4px; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); }
.it { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 12px; border-radius: 14px; text-align: left; }
.it.sel { background: var(--hover); }
.cv { width: 40px; --cover-r: 10px; }
.ic { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; background: var(--hover); color: var(--text-2); flex-shrink: 0; }
.it.sel .ic { background: var(--accent-soft); color: var(--accent); }
.tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.t { font-weight: 500; }
.t.playing { color: var(--accent); }
.tx small, .meta { color: var(--text-3); font-size: 12.5px; }
.meta { font-variant-numeric: tabular-nums; }
.enter { color: var(--text-3); }
.nores { color: var(--text-2); padding: 24px 12px; text-align: center; }
.link-mode { padding: 16px 20px 20px; }
.pv { display: flex; gap: 14px; align-items: center; }
.thumb { width: 160px; aspect-ratio: 16/9; object-fit: cover; border-radius: 12px; flex-shrink: 0; }
.grow { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.two-line { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 600; }
.line { height: 14px; border-radius: 6px; }
.line.short { width: 50%; }
.dest { margin-top: 16px; }
.acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.k { background: color-mix(in oklab, var(--accent-ink) 15%, transparent); border-color: transparent; color: inherit; }
footer { display: flex; gap: 16px; padding: 10px 20px; border-top: 1px solid var(--line); font-size: 12px; color: var(--text-3); }
footer span { display: inline-flex; align-items: center; gap: 4px; }
@media (max-width: 767px) {
  .cmd-back { padding: calc(8px + env(safe-area-inset-top)) 8px 8px; }
  .cmd { max-height: 86vh; }
  footer { display: none; }
  .thumb { width: 112px; }
}
</style>
