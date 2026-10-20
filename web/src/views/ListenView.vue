<script setup>
// Trang "Nghe": hero Tiếp tục nghe + lời chào, dải Lối tắt, các kệ cuộn ngang.
import { computed } from 'vue';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import Card from '../components/media/Card.vue';
import Shelf from '../components/media/Shelf.vue';
import EqBars from '../components/media/EqBars.vue';
import TopChart from '../components/media/TopChart.vue';
import { useLibrary } from '../stores/library.js';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { fmtTime, shuffleArr, img } from '../utils.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi();
const now = new Date();
const h = now.getHours();
const greeting = h < 5 ? 'Đêm khuya rồi' : h < 11 ? 'Chào buổi sáng' : h < 13 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
const mood = h < 5 ? 'Vài giai điệu nhẹ cho giấc ngủ?' : h < 11 ? 'Bắt đầu ngày mới thật nhẹ nhàng.' : h < 13 ? 'Nghỉ trưa với vài bài quen thuộc.' : h < 18 ? 'Giữ nhịp cho buổi chiều.' : 'Thả lỏng sau một ngày dài.';
const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

const t = computed(() => player.track);
const pct = computed(() => (player.duration ? (player.time / player.duration) * 100 : 0));

// Lối tắt: Đã thích + 6 playlist/album hay nghe nhất
const shortcuts = computed(() => {
  const list = [];
  for (const p of lib.playlists) {
    const ts = lib.playlistTracks(p);
    list.push({ key: p.id, name: p.name, path: `/playlist/${p.id}`, mosaic: ts.map((x) => x.coverUrl).filter(Boolean), tracks: ts, score: ts.reduce((s, x) => s + (x.playCount || 0), 0) + (p.pinned ? 1e6 : 0) });
  }
  for (const a of lib.albums) list.push({ key: a.artist + a.name, name: a.name, path: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`, cover: a.coverUrl, tracks: a.tracks, score: a.tracks.reduce((s, x) => s + (x.playCount || 0), 0) });
  return [{ key: 'liked', name: 'Đã thích', path: '/liked', liked: true, tracks: lib.liked }, ...list.sort((a, b) => b.score - a.score).slice(0, 6)];
});

const ctxPlaying = (path) => player.context?.path === path && player.playing;
const ctxActive = (path) => player.context?.path === path && !!player.track;
const playCtx = (it) => player.toggleContext(it.tracks, { name: it.name, path: it.path });
const playTrack = (tr, list, ctx) => (player.isCurrent(tr) ? player.toggle() : player.playTracks(list, list.indexOf(tr), ctx));
const shuffleAll = () => player.playTracks(shuffleArr(lib.tracks), 0, { name: 'Tất cả bài hát', path: '/songs' });

const recent = computed(() => lib.recent.slice(0, 14));
const newest = computed(() => lib.tracks.slice(0, 14));
const topTracks = computed(() => [...lib.tracks].filter((x) => x.playCount).sort((a, b) => b.playCount - a.playCount).slice(0, 14));
const albumPath = (a) => `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`;
const artistPath = (a) => `/artist/${encodeURIComponent(a.name)}`;
</script>

<template>
  <div class="page listen">
    <!-- Thư viện trống -->
    <div v-if="!lib.tracks.length" class="welcome">
      <div class="orb"><Icon name="listen" size="40" /></div>
      <h1 class="display">{{ greeting }}</h1>
      <p class="muted">Kệ nhạc của bạn còn trống. Dán một link YouTube để bắt đầu.</p>
      <button class="btn btn-primary big" @click="ui.openCmd('')"><Icon name="youtube" size="18" /> Thêm nhạc từ YouTube</button>
      <small class="muted">Mẹo: nhấn <kbd>Ctrl</kbd> + <kbd>V</kbd> ở bất kỳ đâu để dán link</small>
    </div>

    <template v-else>
      <div class="top">
        <!-- Hero: tiếp tục nghe -->
        <div v-if="t" class="hero" @click="player.toggle()">
          <div class="hero-bg" :style="{ backgroundImage: t.coverUrl ? `url(${img(t.coverUrl, 300)})` : '' }" />
          <Cover :src="t.coverUrl" :size="400" class="hero-cv" />
          <div class="hero-txt">
            <small>{{ player.playing ? 'Đang phát' : 'Tiếp tục nghe' }}</small>
            <h2 class="display ellipsis">{{ t.title }}</h2>
            <p class="ellipsis">{{ t.artist }}<template v-if="player.context?.name"> · từ {{ player.context.name }}</template></p>
            <div class="hero-prog"><div class="bar"><div :style="{ width: pct + '%' }" /></div><span>{{ fmtTime(player.time) }} / {{ fmtTime(player.duration) }}</span></div>
          </div>
          <button class="hero-play" :aria-label="player.playing ? 'Tạm dừng' : 'Tiếp tục'" @click.stop="player.toggle()">
            <EqBars v-if="player.playing" class="eq" /><Icon v-else name="play" size="26" />
          </button>
        </div>
        <div v-else class="hero start" @click="shuffleAll">
          <div class="hero-txt">
            <small>Bắt đầu</small>
            <h2 class="display">Phát ngẫu nhiên cả thư viện</h2>
            <p>{{ lib.tracks.length }} bài đang chờ bạn</p>
          </div>
          <button class="hero-play" aria-label="Phát ngẫu nhiên"><Icon name="shuffle" size="24" /></button>
        </div>

        <!-- Lời chào -->
        <div class="greet">
          <small class="date">{{ dateStr }}</small>
          <h1 class="display">{{ greeting }}</h1>
          <p class="muted">{{ mood }}</p>
          <div class="stats">
            <RouterLink to="/songs"><b>{{ lib.tracks.length }}</b><span>bài hát</span></RouterLink>
            <RouterLink to="/liked"><b>{{ lib.liked.length }}</b><span>đã thích</span></RouterLink>
            <RouterLink to="/shelf"><b>{{ lib.playlists.length }}</b><span>playlist</span></RouterLink>
          </div>
        </div>
      </div>

      <!-- Lối tắt -->
      <div class="shortcuts">
        <RouterLink v-for="s in shortcuts" :key="s.key" :to="s.path" class="sc" :class="{ on: ctxActive(s.path) }" :title="s.name">
          <span class="sc-art">
            <Cover :src="s.cover" :mosaic="s.mosaic" :liked="s.liked" :size="160" round class="sc-cv" />
            <button class="sc-play" :aria-label="ctxPlaying(s.path) ? 'Tạm dừng' : 'Phát'" @click.prevent.stop="playCtx(s)"><Icon :name="ctxPlaying(s.path) ? 'pause' : 'play'" size="18" /></button>
          </span>
          <span class="sc-name ellipsis">{{ s.name }}</span>
        </RouterLink>
      </div>

      <Shelf v-if="recent.length" title="Nghe gần đây">
        <Card v-for="x in recent" :key="x.id" :to="`/artist/${encodeURIComponent(x.artist)}`" :title="x.title" :sub="x.artist" :cover="x.coverUrl"
          :playing="player.isCurrent(x) && player.playing" :active="player.isCurrent(x)" @play="playTrack(x, recent, { name: 'Nghe gần đây', path: '/' })" />
      </Shelf>
      <Shelf title="Mới thêm vào" to="/songs">
        <Card v-for="x in newest" :key="x.id" :to="`/artist/${encodeURIComponent(x.artist)}`" :title="x.title" :sub="x.artist" :cover="x.coverUrl"
          :playing="player.isCurrent(x) && player.playing" :active="player.isCurrent(x)" @play="playTrack(x, lib.tracks, { name: 'Tất cả bài hát', path: '/songs' })" />
      </Shelf>
      <Shelf v-if="lib.playlists.length" title="Playlist của bạn" to="/shelf">
        <Card v-for="p in lib.playlists.slice(0, 14)" :key="p.id" :to="`/playlist/${p.id}`" :title="p.name" :sub="p.description || `${p.trackIds.length} bài`" vinyl droppable
          :mosaic="lib.playlistTracks(p).map((x) => x.coverUrl).filter(Boolean)" :playing="ctxPlaying(`/playlist/${p.id}`)" :active="ctxActive(`/playlist/${p.id}`)"
          @play="player.toggleContext(lib.playlistTracks(p), { name: p.name, path: `/playlist/${p.id}` })" @drop-ids="lib.addToPlaylist(p, $event)" />
      </Shelf>
      <Shelf v-if="topTracks.length" title="Nghe nhiều nhất">
        <Card v-for="x in topTracks" :key="x.id" :to="`/artist/${encodeURIComponent(x.artist)}`" :title="x.title" :sub="`${x.artist} · ${x.playCount} lượt`" :cover="x.coverUrl"
          :playing="player.isCurrent(x) && player.playing" :active="player.isCurrent(x)" @play="playTrack(x, topTracks, { name: 'Nghe nhiều nhất', path: '/' })" />
      </Shelf>
      <Shelf v-if="lib.artists.length" title="Nghệ sĩ của bạn">
        <Card v-for="a in lib.artists.slice(0, 14)" :key="a.name" :to="artistPath(a)" :title="a.name" :sub="`${a.tracks.length} bài`" :cover="a.coverUrl" round icon="artist"
          :playing="ctxPlaying(artistPath(a))" :active="ctxActive(artistPath(a))" @play="player.toggleContext(a.tracks, { name: a.name, path: artistPath(a) })" />
      </Shelf>
      <Shelf v-if="lib.albums.length" title="Album">
        <Card v-for="a in lib.albums.slice(0, 14)" :key="a.artist + a.name" :to="albumPath(a)" :title="a.name" :sub="a.artist" :cover="a.coverUrl" vinyl
          :playing="ctxPlaying(albumPath(a))" :active="ctxActive(albumPath(a))" @play="player.toggleContext(a.tracks, { name: a.name, path: albumPath(a) })" />
      </Shelf>
      <TopChart />
    </template>
  </div>
</template>

<style scoped>
.listen { padding-top: 12px; }
.welcome { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; }
.orb { width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); box-shadow: 0 0 0 12px color-mix(in oklab, var(--accent) 6%, transparent); margin-bottom: 8px; }
.welcome h1 { font-size: 34px; font-weight: 600; }
.btn.big { height: 50px; padding: 0 28px; font-size: 15px; margin-top: 8px; }

.top { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: 20px; }
.hero { position: relative; display: flex; align-items: center; gap: 22px; min-height: 196px; padding: 22px; border-radius: var(--r-xl); overflow: hidden; cursor: pointer; isolation: isolate;
  background: color-mix(in oklab, var(--tint) 35%, var(--surface)); border: 1px solid var(--line); transition: transform .3s var(--spring); }
.hero:hover { transform: translateY(-2px); }
.hero-bg { position: absolute; inset: -40px; z-index: -1; background-size: cover; background-position: center; filter: blur(50px) saturate(1.5); opacity: .55; }
.hero::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, color-mix(in oklab, var(--bg) 20%, transparent), color-mix(in oklab, var(--bg) 55%, transparent)); }
.hero-cv { width: 150px; --cover-r: 20px; box-shadow: 0 20px 40px -16px rgb(0 0 0 / .55); }
.hero-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.hero-txt small { font-size: 11.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.hero-txt h2 { font-size: clamp(20px, 2.4vw, 30px); font-weight: 600; line-height: 1.2; }
.hero-txt p { margin: 0; color: var(--text-2); }
.hero-prog { display: flex; align-items: center; gap: 12px; margin-top: 14px; font-size: 12px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.hero-prog .bar { flex: 1; height: 4px; border-radius: 2px; background: var(--line-2); overflow: hidden; }
.hero-prog .bar div { height: 100%; background: var(--accent); border-radius: 2px; }
.hero-play { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); flex-shrink: 0; align-self: flex-end; box-shadow: 0 10px 28px -10px var(--accent); transition: transform .25s var(--spring); }
.hero-play:hover { transform: scale(1.08); }
.hero-play .eq { --eq-c: var(--accent-ink); width: 20px; height: 20px; }
.hero-play .eq :deep(i) { background: var(--accent-ink); }
.hero.start { padding: 28px; }
.hero.start h2 { white-space: normal; }

.greet { display: flex; flex-direction: column; justify-content: center; padding: 8px 4px; }
.date { color: var(--text-3); text-transform: capitalize; font-size: 13px; }
.greet h1 { font-size: clamp(24px, 2.8vw, 34px); font-weight: 600; margin: 4px 0 6px; }
.greet p { margin: 0; }
.stats { display: flex; gap: 8px; margin-top: 18px; }
.stats a { flex: 1; display: flex; flex-direction: column; padding: 12px 14px; border-radius: 16px; background: var(--hover); border: 1px solid var(--line); transition: background .2s; }
.stats a:hover { background: var(--press); }
.stats b { font: 600 20px var(--font-display); }
.stats span { font-size: 12px; color: var(--text-2); }

.shortcuts { display: flex; gap: 18px; margin-top: 28px; overflow-x: auto; scrollbar-width: none; padding: 4px; margin-left: -4px; margin-right: -4px; }
.sc { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 84px; flex-shrink: 0; }
.sc-art { position: relative; width: 72px; height: 72px; border-radius: 50%; padding: 3px; box-shadow: inset 0 0 0 1px var(--line); transition: box-shadow .3s, transform .3s var(--spring); }
.sc:hover .sc-art { transform: scale(1.06); }
.sc.on .sc-art { box-shadow: inset 0 0 0 2px var(--accent); }
/* clip-path: cắt tròn chắc chắn, tránh lỗi ảnh vuông lòi ra khi đang transform */
.sc-cv { width: 100%; clip-path: circle(50%); }
.sc-play { position: absolute; inset: 3px; border-radius: 50%; clip-path: circle(50%); display: grid; place-items: center; background: rgb(0 0 0 / .35); color: #fff; opacity: 0; transition: opacity .2s; }
.sc:hover .sc-play { opacity: 1; }
.sc-name { max-width: 100%; font-size: 12.5px; color: var(--text-2); }
.sc.on .sc-name { color: var(--accent); }

@media (max-width: 1000px) { .top { grid-template-columns: 1fr; } .greet { order: -1; padding: 0; } .stats { display: none; } }
@media (max-width: 767px) {
  .hero { min-height: 0; padding: 14px; gap: 14px; border-radius: 22px; }
  .hero-cv { width: 84px; --cover-r: 14px; }
  .hero-play { width: 48px; height: 48px; align-self: center; }
  .hero-prog { margin-top: 8px; }
  .hero-prog span { display: none; }
  .greet h1 { font-size: 24px; }
  .shortcuts { gap: 12px; }
  .sc { width: 70px; }
  .sc-art { width: 60px; height: 60px; }
}
</style>
