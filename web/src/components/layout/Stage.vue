<script setup>
// Stage: màn hình đang phát trượt từ dưới lên. Trái: bìa lớn, waveform, điều khiển. Phải: tab Lời / Hàng đợi / Thông tin.
// Chế độ trình chiếu (F): chỉ còn bìa + lời, toàn màn hình. Vuốt/kéo thanh nắm xuống để đóng.
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import Slider from '../ui/Slider.vue';
import Waveform from '../media/Waveform.vue';
import Lyrics from '../media/Lyrics.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { fmtTime, fmtDate, img } from '../../utils.js';
import { useDragSort } from '../../composables/useDragSort.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';
import { useMenus } from '../../composables/useMenus.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi();
const trackMenu = useTrackMenu();
const { sleepItems, addToPlaylistItems } = useMenus();
const t = computed(() => player.track);
const artist = computed(() => lib.artists.find((a) => a.name === t.value?.artist));
const manualDnD = useDragSort((a, b) => player.moveManual(a, b));
const ctxDnD = useDragSort((a, b) => player.moveContext(a, b));
const volIcon = computed(() => (player.muted || !player.volume ? 'volumeX' : player.volume < 0.5 ? 'volumeLow' : 'volume'));
const repeatTitle = { off: 'Bật lặp lại (R)', all: 'Lặp một bài (R)', one: 'Tắt lặp lại (R)' };
const tabs = { lyrics: ['Lời', 'lyrics'], queue: ['Hàng đợi', 'queue'], info: ['Thông tin', 'info'] };

// Băng chuyền: 2 bài trước, bài đang phát, các bài tiếp theo
const carousel = computed(() => {
  const prev = player.order.slice(Math.max(0, player.pos - 2), player.pos).map((id) => lib.byId[id]).filter(Boolean);
  const next = [...player.upcoming.manual, ...player.upcoming.context].slice(0, 8);
  return { prev, next };
});

// Kéo xuống để đóng
const dy = ref(0);
let start = null;
function pDown(e) { start = { y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }
function pMove(e) { if (start) dy.value = Math.max(0, e.clientY - start.y); }
function pUp() { if (dy.value > 120) ui.closeStage(); dy.value = 0; start = null; }
// Mobile: vuốt ngang trên bìa để đổi bài
const dx = ref(0);
let ts = null;
function cStart(e) { ts = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }; }
function cMove(e) {
  if (!ts) return;
  const x = e.touches[0].clientX - ts.x, y = e.touches[0].clientY - ts.y;
  if (!ts.axis && Math.hypot(x, y) > 10) ts.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y';
  if (ts.axis === 'x') dx.value = x;
}
function cEnd() { if (dx.value < -80) player.next(); if (dx.value > 80) player.prev(); dx.value = 0; ts = null; }

// Trình chiếu -> toàn màn hình trình duyệt
watch(() => ui.present, (on) => {
  if (on) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
});
const onFs = () => { if (!document.fullscreenElement && ui.present) ui.present = false; };
document.addEventListener('fullscreenchange', onFs);
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFs));
</script>

<template>
  <Transition name="stage">
    <section v-if="ui.stage" class="stage" :class="{ present: ui.present, mobile: ui.isMobile }" role="dialog" aria-label="Đang phát"
      :style="{ transform: dy ? `translateY(${dy}px)` : '', transition: dy ? 'none' : '' }">
      <div class="backdrop" :style="{ backgroundImage: t?.coverUrl ? `url(${img(t.coverUrl, 300)})` : '' }" />

      <header class="head" @pointerdown="pDown" @pointermove="pMove" @pointerup="pUp" @pointercancel="pUp">
        <button class="icon-btn" title="Thu nhỏ (Esc)" @pointerdown.stop @click="ui.closeStage()"><Icon name="chevronDown" size="24" /></button>
        <div class="grab" />
        <div class="from ellipsis"><small>Đang phát từ</small><RouterLink v-if="player.context?.path" :to="player.context.path" class="link" @pointerdown.stop @click="ui.closeStage()">{{ player.context.name }}</RouterLink><span v-else>Thư viện</span></div>
        <button class="icon-btn" :class="{ on: ui.present }" title="Trình chiếu (F)" @pointerdown.stop @click="ui.togglePresent()"><Icon :name="ui.present ? 'minimize' : 'present'" size="20" /></button>
      </header>

      <div v-if="!t" class="none"><Icon name="music" size="48" /><p>Chưa phát bài nào.</p></div>

      <div v-else class="body">
        <!-- Cột trái: bài đang phát -->
        <div class="now">
          <div class="art" :style="{ transform: dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : '', transition: dx ? 'none' : '' }"
            @touchstart.passive="cStart" @touchmove.passive="cMove" @touchend="cEnd">
            <Cover :key="t.id" :src="t.coverUrl" :size="800" class="cv" :class="{ playing: player.playing }" />
          </div>
          <div class="meta">
            <div class="txt">
              <h1 class="display">{{ t.title }}</h1>
              <p>
                <RouterLink :to="`/artist/${encodeURIComponent(t.artist)}`" class="link" @click="ui.closeStage()">{{ t.artist }}</RouterLink>
                <template v-if="t.album"> · <RouterLink :to="`/album/${encodeURIComponent(t.artist)}/${encodeURIComponent(t.album)}`" class="link" @click="ui.closeStage()">{{ t.album }}</RouterLink></template>
              </p>
            </div>
            <div class="meta-act">
              <button class="icon-btn" :class="{ liked: t.liked }" :title="t.liked ? 'Bỏ thích (L)' : 'Thích (L)'" @click="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" size="22" /></button>
              <button class="icon-btn" title="Thêm vào playlist" @click="ui.openMenu($event, addToPlaylistItems([t.id]))"><Icon name="plus" size="22" /></button>
              <button class="icon-btn" title="Tùy chọn" @click="trackMenu($event, t)"><Icon name="more" size="22" /></button>
            </div>
          </div>

          <div class="seek">
            <Waveform :track="t" :value="player.time" :max="player.duration || 1" :bars="ui.isMobile ? 64 : 110" :height="ui.isMobile ? 44 : 56" @seek="player.seek($event)" />
            <div class="times"><span>{{ fmtTime(player.time) }}</span><span>{{ fmtTime(player.duration) }}</span></div>
          </div>

          <div class="controls">
            <button class="icon-btn" :class="{ on: player.shuffle }" :title="player.shuffle ? 'Tắt trộn bài (S)' : 'Trộn bài (S)'" @click="player.toggleShuffle()"><Icon name="shuffle" size="20" /></button>
            <button class="icon-btn lg" title="Bài trước" @click="player.prev()"><Icon name="prev" size="26" /></button>
            <button class="play" :title="player.playing ? 'Tạm dừng' : 'Phát'" @click="player.toggle()"><Icon :name="player.playing ? 'pause' : 'play'" size="30" /></button>
            <button class="icon-btn lg" title="Bài tiếp" @click="player.next()"><Icon name="next" size="26" /></button>
            <button class="icon-btn" :class="{ on: player.repeat !== 'off' }" :title="repeatTitle[player.repeat]" @click="player.cycleRepeat()"><Icon :name="player.repeat === 'one' ? 'repeatOne' : 'repeat'" size="20" /></button>
          </div>

          <div class="extras">
            <button class="pill" :class="{ on: player.sleep }" title="Hẹn giờ tắt" @click="ui.openMenu($event, sleepItems())">
              <Icon name="moon" size="16" />{{ player.sleep ? (player.sleep.mode === 'end' ? 'Hết bài' : fmtTime(player.sleepLeft)) : 'Hẹn giờ' }}
            </button>
            <div class="volume">
              <button class="icon-btn" @click="player.toggleMute()"><Icon :name="volIcon" size="18" /></button>
              <Slider :value="player.muted ? 0 : player.volume" :max="1" :wheel-step="0.05" label="Âm lượng" @input="player.setVolume($event)" @change="player.setVolume($event)" /><span class="vol-pct">{{ player.muted ? 0 : Math.round(player.volume * 100) }}%</span>
            </div>
          </div>
        </div>

        <!-- Trình chiếu: lời lớn -->
        <div v-if="ui.present" class="present-lyrics"><Lyrics big /></div>

        <!-- Cột phải: tab -->
        <div v-else class="side">
          <div class="seg tabs">
            <button v-for="(v, k) in tabs" :key="k" :class="{ on: ui.stageTab === k }" @click="ui.set('stageTab', k)"><Icon :name="v[1]" size="16" /> {{ v[0] }}</button>
          </div>

          <div v-if="ui.stageTab === 'lyrics'" class="panel lyr"><Lyrics /></div>

          <div v-else-if="ui.stageTab === 'queue'" class="panel scroll q">
            <div class="carousel">
              <button v-for="p in carousel.prev" :key="'p' + p.id" class="c-item past" :title="p.title" @click="player.prev()"><Cover :src="p.coverUrl" :size="120" /></button>
              <div class="c-item cur"><Cover :src="t.coverUrl" :size="160" /><span class="eqdot" /></div>
              <button v-for="(n, i) in carousel.next" :key="'n' + i + n.id" class="c-item" :title="n.title"
                @click="i < player.upcoming.manual.length ? player.jumpManual(i) : player.jumpContext(i - player.upcoming.manual.length)"><Cover :src="n.coverUrl" :size="120" /></button>
            </div>

            <template v-if="player.upcoming.manual.length">
              <div class="q-head"><h3>Tiếp theo (bạn thêm)</h3><button class="link" @click="player.upNext = []">Xóa</button></div>
              <div v-for="(q, i) in player.upcoming.manual" :key="'m' + i + q.id" class="q-item" :class="{ over: manualDnD.overIndex.value === i }"
                v-bind="manualDnD.bind(i, [q.id])" @click="player.jumpManual(i)" @contextmenu="trackMenu($event, q)">
                <span class="grip" v-bind="manualDnD.handle(i)" @click.stop><Icon name="grip" size="16" /></span>
                <Cover :src="q.coverUrl" :size="96" class="sm-cv" />
                <div class="m"><div class="ellipsis">{{ q.title }}</div><small class="ellipsis">{{ q.artist }}</small></div>
                <button class="icon-btn rm" title="Bỏ khỏi hàng đợi" @click.stop="player.removeManual(i)"><Icon name="x" size="16" /></button>
              </div>
            </template>
            <template v-if="player.upcoming.context.length">
              <div class="q-head"><h3 class="ellipsis">Từ: {{ player.context?.name || 'Danh sách' }}</h3><button class="link" @click="player.clearQueue()">Xóa</button></div>
              <div v-for="(q, i) in player.upcoming.context.slice(0, 100)" :key="'c' + i + q.id" class="q-item" :class="{ over: ctxDnD.overIndex.value === i }"
                v-bind="ctxDnD.bind(i, [q.id])" @click="player.jumpContext(i)" @contextmenu="trackMenu($event, q)">
                <span class="grip" v-bind="ctxDnD.handle(i)" @click.stop><Icon name="grip" size="16" /></span>
                <Cover :src="q.coverUrl" :size="96" class="sm-cv" />
                <div class="m"><div class="ellipsis">{{ q.title }}</div><small class="ellipsis">{{ q.artist }}</small></div>
                <span class="dur">{{ fmtTime(q.duration) }}</span>
                <button class="icon-btn rm" title="Bỏ khỏi hàng đợi" @click.stop="player.removeContext(i)"><Icon name="x" size="16" /></button>
              </div>
            </template>
            <p v-if="!player.upcoming.manual.length && !player.upcoming.context.length" class="empty">Không còn bài nào tiếp theo{{ player.repeat === 'all' ? ' — danh sách sẽ lặp lại' : '' }}.</p>
          </div>

          <div v-else class="panel scroll info">
            <RouterLink :to="`/artist/${encodeURIComponent(t.artist)}`" class="artist-card" @click="ui.closeStage()">
              <Cover :src="artist?.coverUrl" :size="200" round icon="artist" class="ac-cv" />
              <div class="ac-tx"><small>Nghệ sĩ</small><b>{{ t.artist }}</b><span>{{ artist?.tracks.length || 1 }} bài trong thư viện · {{ artist?.plays || 0 }} lượt nghe</span></div>
              <Icon name="chevronRight" size="18" />
            </RouterLink>
            <dl>
              <dt>Album</dt><dd>{{ t.album || '—' }}</dd>
              <dt>Thời lượng</dt><dd>{{ fmtTime(t.duration) }}</dd>
              <dt>Lượt nghe</dt><dd>{{ t.playCount || 0 }}</dd>
              <dt>Nghe lần cuối</dt><dd>{{ t.lastPlayedAt ? fmtDate(t.lastPlayedAt) : '—' }}</dd>
              <dt>Ngày thêm</dt><dd>{{ fmtDate(t.createdAt) }}</dd>
              <dt>Tiếp theo</dt><dd class="ellipsis">{{ player.nextTrack ? `${player.nextTrack.title} · ${player.nextTrack.artist}` : '—' }}</dd>
            </dl>
            <div class="info-act">
              <button class="btn btn-soft" @click="ui.open('editTrack', { track: t })"><Icon name="edit" size="16" /> Sửa thông tin</button>
              <a v-if="t.sourceUrl" :href="t.sourceUrl" target="_blank" rel="noopener" class="btn btn-soft"><Icon name="youtube" size="16" /> Nguồn YouTube</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.stage { position: fixed; z-index: 400; left: 0; right: 0; bottom: 0; height: 92vh; display: flex; flex-direction: column; overflow: hidden;
  border-radius: var(--r-xl) var(--r-xl) 0 0; background: var(--bg); border-top: 1px solid var(--line); box-shadow: 0 -20px 80px rgb(0 0 0 / .35); transition: transform .45s var(--spring); }
.backdrop { position: absolute; inset: -80px; background-size: cover; background-position: center; filter: blur(80px) saturate(1.4); opacity: .4; transform: scale(1.2); pointer-events: none; }
.stage::before { content: ''; position: absolute; inset: 0; background: linear-gradient(color-mix(in oklab, var(--bg) 30%, transparent), var(--bg) 85%); pointer-events: none; z-index: 0; }
.head, .body, .none { position: relative; z-index: 1; }
.head { display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; padding: 10px 16px 0; cursor: grab; touch-action: none; }
.grab { position: absolute; top: 8px; left: 50%; width: 40px; height: 4px; border-radius: 2px; background: var(--line-2); transform: translateX(-50%); }
.from { text-align: center; display: flex; flex-direction: column; font-size: 13px; font-weight: 600; padding-top: 6px; }
.from small { font-size: 10.5px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); }
.none { flex: 1; display: grid; place-items: center; align-content: center; gap: 8px; color: var(--text-2); }
.body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; width: 100%; max-width: 1240px; margin: 0 auto; padding: 8px 40px 32px; }

.now { display: flex; flex-direction: column; justify-content: center; min-height: 0; }
.art { align-self: center; transition: transform .3s var(--ease); }
.cv { width: min(40vh, 400px); --cover-r: 24px; box-shadow: 0 30px 80px -24px rgb(0 0 0 / .6); transition: transform .6s var(--spring); transform: scale(.94); }
.cv.playing { transform: none; }
.meta { display: flex; align-items: flex-end; gap: 12px; margin-top: 28px; }
.txt { flex: 1; min-width: 0; }
h1 { font-size: clamp(20px, 2.2vw, 30px); font-weight: 600; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.txt p { margin: 6px 0 0; color: var(--text-2); font-size: 15px; }
.meta-act { display: flex; }
.seek { margin-top: 22px; }
.times { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.controls { display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 10px; }
.icon-btn.lg { width: 48px; height: 48px; color: var(--text); }
.play { width: 72px; height: 72px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; box-shadow: 0 12px 32px -10px var(--accent); transition: transform .25s var(--spring); }
.play:hover { transform: scale(1.06); }
.play:active { transform: scale(.94); }
.extras { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; }
.pill { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 17px; background: var(--hover); color: var(--text-2); font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; }
.pill:hover { background: var(--press); color: var(--text); }
.pill.on { background: var(--accent-soft); color: var(--accent); }
.volume { display: flex; align-items: center; gap: 4px; width: 220px; }

.side { display: flex; flex-direction: column; min-height: 0; }
.tabs { align-self: flex-start; margin-bottom: 12px; }
.tabs button { display: inline-flex; align-items: center; gap: 6px; }
.panel { flex: 1; min-height: 0; border-radius: var(--r-lg); background: color-mix(in oklab, var(--surface) 60%, transparent); border: 1px solid var(--line); padding: 8px 20px; }
.lyr { padding: 4px 28px; overflow: hidden; }

.carousel { display: flex; align-items: center; gap: 10px; padding: 14px 6px 16px; margin: 0 -6px; overflow-x: auto; scrollbar-width: none; }
.c-item { flex-shrink: 0; width: 56px; position: relative; --cover-r: 12px; transition: transform .2s var(--spring), opacity .2s; }
.c-item:hover { transform: translateY(-3px); }
.c-item.past { opacity: .45; }
.c-item.cur { width: 84px; }
.c-item.cur .cover { box-shadow: 0 0 0 2px var(--accent); }
.eqdot { position: absolute; bottom: -8px; left: 50%; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); transform: translateX(-50%); }
.q-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 16px 0 6px; }
.q-head h3 { font-size: 13px; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: .06em; }
.q-head .link { font-size: 12.5px; color: var(--text-3); }
.q-item { display: flex; align-items: center; gap: 10px; padding: 6px 8px; margin: 0 -8px; border-radius: 12px; cursor: pointer; }
.q-item:hover { background: var(--hover); }
.q-item.over { box-shadow: inset 0 2px 0 var(--accent); }
.grip { color: var(--text-3); opacity: 0; cursor: grab; display: grid; place-items: center; touch-action: none; }
.mobile .grip { width: 36px; height: 44px; margin: 0 -8px 0 -10px; }
.q-item:hover .grip { opacity: 1; }
.sm-cv { width: 42px; --cover-r: 10px; }
.m { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.m small { color: var(--text-2); }
.dur { font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.rm { width: 30px; height: 30px; opacity: 0; }
.q-item:hover .rm { opacity: 1; }
.empty { color: var(--text-2); padding: 24px 0; text-align: center; }

.info { padding: 16px 20px; }
.artist-card { display: flex; align-items: center; gap: 14px; padding: 12px; margin: 0 -8px 12px; border-radius: 16px; transition: background .2s; }
.artist-card:hover { background: var(--hover); }
.ac-cv { width: 64px; }
.ac-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.artist-card small { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: .06em; }
.artist-card b { font-size: 17px; }
.artist-card span { font-size: 13px; color: var(--text-2); }
dl { display: grid; grid-template-columns: auto 1fr; gap: 10px 20px; margin: 8px 0 20px; font-size: 14px; }
dt { color: var(--text-3); }
dd { margin: 0; min-width: 0; }
.info-act { display: flex; flex-wrap: wrap; gap: 8px; }

/* Trình chiếu */
.present { height: 100vh; border-radius: 0; }
.present .backdrop { opacity: .7; }
.present .body { grid-template-columns: auto minmax(0, 1fr); align-items: center; max-width: 1500px; }
.present .meta-act, .present .extras, .present .seek, .present .controls { display: none; }
.present .cv { width: min(55vh, 520px); }
.present-lyrics { height: 80vh; min-height: 0; }

/* Mobile: một cột cuộn dọc */
.mobile { height: 100%; border-radius: 0; }
.mobile .body { display: flex; flex-direction: column; overflow-y: auto; gap: 24px; padding: 8px 20px calc(24px + env(safe-area-inset-bottom)); }
.mobile .head { padding-top: calc(10px + env(safe-area-inset-top)); }
.mobile .cv { width: min(82vw, 46vh); }
.mobile .now { justify-content: flex-start; flex-shrink: 0; }
.mobile .meta { margin-top: 24px; }
.mobile .controls { gap: 10px; justify-content: space-between; }
.mobile .side { height: 72vh; flex-shrink: 0; }
.mobile .tabs { align-self: stretch; justify-content: space-between; }
.mobile .tabs button { flex: 1; justify-content: center; }
.mobile .volume { display: none; }
.mobile .rm, .mobile .grip { opacity: 1; }
@media (max-width: 1000px) and (min-width: 768px) { .body { gap: 24px; padding: 8px 24px 24px; } }

.stage-enter-active, .stage-leave-active { transition: transform .5s var(--spring), opacity .3s; }
.stage-enter-from, .stage-leave-to { transform: translateY(100%); opacity: .6; }
.vol-pop > :first-child, .volume > :nth-child(2) { flex: 1; min-width: 0; }
.vol-pct { min-width: 38px; text-align: right; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-2); flex-shrink: 0; }
</style>
