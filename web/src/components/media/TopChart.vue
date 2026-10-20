<script setup>
// Bảng xếp hạng: biểu đồ đường lượt nghe theo ngày (7 ngày) của top 3 + danh sách top 10 bài nghe nhiều nhất (kèm tăng/giảm hạng so với hôm qua).
import { computed, ref } from 'vue';
import Cover from '../ui/Cover.vue';
import Icon from '../ui/Icon.vue';
import EqBars from './EqBars.vue';
import { useLibrary } from '../../stores/library.js';
import { usePlayer } from '../../stores/player.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';
import { dayKey } from '../../utils.js';

const lib = useLibrary(), player = usePlayer(), trackMenu = useTrackMenu();
const COLORS = ['#f5b841', '#34c98e', '#4a9dff']; // top 1 vàng, top 2 xanh lá, top 3 xanh dương
const POINTS = 7;
const W = 640, H = 220, PAD = { l: 14, r: 14, t: 56, b: 12 };

const now = ref(new Date());
const buckets = computed(() => Array.from({ length: POINTS }, (_, i) => {
  const d = new Date(now.value); d.setDate(d.getDate() - (POINTS - 1 - i));
  return { key: dayKey(d), label: i === POINTS - 1 ? 'Hôm nay' : `${d.getDate()}/${d.getMonth() + 1}` };
}));
// Lượt nghe trong 1 ngày (khóa theo giờ 'YYYY-MM-DD HH' hoặc theo ngày 'YYYY-MM-DD').
// Lượt nghe cũ (trước khi có thống kê theo ngày) được tính vào ngày trước lượt có thống kê đầu tiên
// (hoặc ngày nghe gần nhất nếu chưa có thống kê) để biểu đồ có dữ liệu ngay.
function oldDay(t, ps) {
  if (!ps.length) return t.lastPlayedAt ? dayKey(new Date(t.lastPlayedAt)) : '';
  const first = ps.map(([k]) => k).sort()[0].slice(0, 10).split('-').map(Number);
  return dayKey(new Date(first[0], first[1] - 1, first[2] - 1));
}
const count = (t, b) => {
  const ps = Object.entries(t.plays || {});
  let n = ps.reduce((s, [k, v]) => s + (k.startsWith(b.key) ? v : 0), 0);
  const old = (t.playCount || 0) - ps.reduce((s, [, v]) => s + v, 0);
  if (old > 0 && oldDay(t, ps) === b.key) n += old;
  return n;
};
const today = (t) => count(t, buckets.value[POINTS - 1]);

// Top 10 theo tổng lượt nghe; hạng cũ = xếp theo lượt nghe trước hôm nay
const top = computed(() => {
  const list = lib.tracks.filter((t) => t.playCount);
  const oldRank = new Map([...list].sort((a, b) => (b.playCount - today(b)) - (a.playCount - today(a))).map((t, i) => [t.id, i]));
  return [...list].sort((a, b) => b.playCount - a.playCount).slice(0, 10)
    .map((t, i) => ({ t, delta: today(t) ? oldRank.get(t.id) - i : 0 }));
});
// 3 đường = đúng 3 bài đứng đầu bảng
const hot = computed(() => top.value.slice(0, 3));
const series = computed(() => hot.value.map((x) => buckets.value.map((b) => count(x.t, b))));
const maxY = computed(() => Math.max(4, ...series.value.flat()) * 1.1);
const px = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (POINTS - 1);
const py = (v) => H - PAD.b - (v / maxY.value) * (H - PAD.t - PAD.b);
const pts = (v) => v.map((y, i) => [px(i), py(y)]);
// Đường cong mềm (Catmull-Rom -> Bézier)
function path(p) {
  let s = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b, c, d] = [p[i - 1] || p[i], p[i], p[i + 1], p[i + 2] || p[i + 1]];
    const lo = Math.min(b[1], c[1]), hi = Math.max(b[1], c[1]), cl = (y) => Math.max(lo, Math.min(hi, y));
    s += ` C${b[0] + (c[0] - a[0]) / 6},${cl(b[1] + (c[1] - a[1]) / 6)} ${c[0] - (d[0] - b[0]) / 6},${cl(c[1] - (d[1] - b[1]) / 6)} ${c[0]},${c[1]}`;
  }
  return s;
}
// Ảnh bìa bài số 1 đặt ở đỉnh đường của nó
const peak = computed(() => {
  const v = series.value[0] || [];
  const i = v.reduce((m, y, k) => (y >= v[m] ? k : m), 0);
  return { left: `${(px(i) / W) * 100}%`, top: `${(py(v[i] || 0) / H) * 100}%` };
});

// Rê chuột / chạm: chọn mốc gần nhất
const hover = ref(-1);
const svgEl = ref(null);
function onMove(e) {
  const r = svgEl.value.getBoundingClientRect();
  const x = (((e.touches?.[0] || e).clientX - r.left) / r.width) * W;
  hover.value = Math.max(0, Math.min(POINTS - 1, Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * (POINTS - 1))));
}
const tipLeft = computed(() => `${Math.min(80, Math.max(20, (px(hover.value) / W) * 100))}%`);
const stamp = computed(() => now.value.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' -'));

const list = computed(() => top.value.map((x) => x.t));
const ctx = { name: 'Bảng xếp hạng', path: '/chart' };
const play = (t) => (player.isCurrent(t) ? player.toggle() : player.playTracks(list.value, list.value.indexOf(t), ctx));
</script>

<template>
  <section v-if="top.length" class="zc" :style="{ '--c1': COLORS[0], '--c2': COLORS[1], '--c3': COLORS[2] }" @mouseenter="now = new Date()">
    <div class="ch-head">
      <h2 class="ttl">#bảng xếp hạng</h2>
      <span class="stamp">{{ stamp }}</span>
      <button class="play-all" aria-label="Phát bảng xếp hạng" @click="play(list[0])"><Icon name="play" size="16" /></button>
    </div>

    <div class="plot" @mouseleave="hover = -1">
      <div class="area">
        <svg ref="svgEl" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" role="img" aria-label="Lượt nghe theo ngày của top 3"
          @mousemove="onMove" @touchstart.passive="onMove" @touchmove.passive="onMove" @touchend="hover = -1">
          <line v-for="g in 3" :key="g" class="grid" :x1="PAD.l" :x2="W - PAD.r" :y1="py((maxY / 3) * g)" :y2="py((maxY / 3) * g)" />
          <line class="base" :x1="PAD.l" :x2="W - PAD.r" :y1="py(0)" :y2="py(0)" />
          <line v-if="hover >= 0" class="cross" :x1="px(hover)" :x2="px(hover)" :y1="PAD.t - 20" :y2="py(0)" />
          <!-- Vẽ hạng 3 trước để đường hạng 1 nằm trên cùng -->
          <path v-for="k in [2, 1, 0].filter((k) => series[k])" :key="hot[k].t.id" :d="path(pts(series[k]))" fill="none"
            :stroke-width="k ? 2 : 3" class="ln" :style="{ '--c': COLORS[k], stroke: COLORS[k] }" />
        </svg>
        <!-- Chấm (HTML để không bị méo khi SVG co giãn): điểm cuối của mỗi đường, hoặc mốc đang rê chuột -->
        <span v-for="k in [2, 1, 0].filter((k) => series[k])" :key="'d' + k" class="dot" :class="{ on: hover >= 0 }"
          :style="{ left: `${(px(hover >= 0 ? hover : POINTS - 1) / W) * 100}%`, top: `${(py(series[k][hover >= 0 ? hover : POINTS - 1]) / H) * 100}%`, '--c': COLORS[k] }" />
        <div v-if="series[0]?.some(Boolean) && hover < 0" class="bubble" :style="peak"><Cover :src="hot[0].t.coverUrl" :size="96" class="bcv" /></div>
        <div v-if="hover >= 0" class="tip" :style="{ left: tipLeft }">
          <b>{{ buckets[hover].label }}</b>
          <div v-for="(x, k) in hot" :key="x.t.id" class="tr"><i :style="{ background: COLORS[k] }" /><span class="ellipsis">{{ x.t.title }}</span><b>{{ series[k][hover] }} lượt</b></div>
        </div>
      </div>
      <div class="xlab"><span v-for="(b, i) in buckets" :key="b.key" :style="{ left: `${(px(i) / W) * 100}%` }">{{ b.label }}</span></div>
    </div>

    <ol class="rank">
      <li v-for="(x, i) in top" :key="x.t.id" :class="{ cur: player.isCurrent(x.t) }" @click="play(x.t)" @contextmenu="trackMenu($event, x.t)">
        <span class="cvw">
          <Cover :src="x.t.coverUrl" :size="96" class="cv" />
          <EqBars v-if="player.isCurrent(x.t) && player.playing" class="eq" />
        </span>
        <span class="pos">
          <span class="no" :class="'n' + (i + 1)">{{ i + 1 }}</span>
          <small v-if="x.delta > 0" class="up">▲ {{ x.delta }}</small>
          <small v-else-if="x.delta < 0" class="down">▼ {{ -x.delta }}</small>
          <small v-else class="same">•</small>
        </span>
        <span class="tx"><span class="ellipsis nm">{{ x.t.title }}</span><small class="ellipsis">{{ x.t.artist }} · {{ x.t.playCount }} lượt</small></span>
        <button class="icon-btn more" aria-label="Tùy chọn" @click.stop="trackMenu($event, x.t)"><Icon name="more" size="17" /></button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
/* Dùng token màu của app (theo theme sáng/tối và accent người dùng chọn) */
.zc { margin-top: 32px; padding: 20px 18px 10px; border-radius: var(--r-xl, 24px); overflow: hidden; border: 1px solid var(--line);
  background: linear-gradient(170deg, color-mix(in oklab, var(--accent) 14%, var(--bg)), var(--bg) 75%); }
.ch-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ttl { font-size: clamp(24px, 3.6vw, 32px); font-weight: 800; letter-spacing: -.5px; color: var(--accent); }
.stamp { margin-left: auto; font-size: 13px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.play-all { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); }
.plot { position: relative; margin: 6px -4px 0; }
.area { position: relative; height: 220px; }
.area svg { width: 100%; height: 100%; display: block; touch-action: pan-y; overflow: visible; }
.grid { stroke: var(--line); stroke-dasharray: 2 5; vector-effect: non-scaling-stroke; opacity: .6; }
.ln { stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 5px color-mix(in oklab, var(--c) 60%, transparent)); }
.base { stroke: var(--line); vector-effect: non-scaling-stroke; }
.cross { stroke: var(--text-3); stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; }
.dot { --c: var(--accent); position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--bg); box-shadow: 0 0 0 2.5px var(--c); pointer-events: none; transition: transform .15s; }
.dot.on { transform: scale(1.35); }
.bubble { position: absolute; transform: translate(-50%, calc(-100% - 14px)); display: flex; align-items: flex-end; gap: 4px; pointer-events: none; }
.bcv { width: 44px; --cover-r: 8px; border: 2px solid var(--c1); border-radius: 10px; box-shadow: 0 6px 18px rgb(0 0 0 / .25); }
.tip { position: absolute; top: 0; transform: translateX(-50%); width: 210px; padding: 8px 10px; border-radius: 12px; background: var(--surface-3); border: 1px solid var(--line); box-shadow: 0 6px 20px rgb(0 0 0 / .2); font-size: 12px; pointer-events: none; z-index: 3; }
.tip .tr { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: var(--text-2); }
.tip .tr span { flex: 1; min-width: 0; }
.tip .tr b { color: var(--text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.xlab { position: relative; height: 18px; margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--text-2); font-variant-numeric: tabular-nums; }
.xlab span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.xlab span:first-child { transform: none; }
.xlab span:last-child { transform: translateX(-100%); }
i { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.rank { list-style: none; margin: 8px -10px 0; padding: 0; display: flex; flex-direction: column; }
.rank li { display: flex; align-items: center; gap: 14px; padding: 9px 10px; border-radius: 14px; cursor: pointer; transition: background .2s; }
.rank li:hover { background: var(--hover); }
.rank li.cur .nm { color: var(--accent); }
.cvw { position: relative; width: 52px; flex-shrink: 0; }
.cv { width: 52px; --cover-r: 8px; }
.eq { position: absolute; inset: 0; margin: auto; color: #fff; }
.pos { width: 30px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; font-variant-numeric: tabular-nums; }
.no { font-size: 20px; font-weight: 800; line-height: 1.1; color: var(--text-2); }
.no.n1, .no.n2, .no.n3 { font-size: 24px; }
.no.n1 { color: var(--c1); }
.no.n2 { color: var(--c2); }
.no.n3 { color: var(--c3); }
.pos small { font-size: 11px; font-weight: 700; }
.up { color: var(--accent); }
.down { color: var(--danger); }
.same { color: var(--text-3); }
.tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nm { font-weight: 600; font-size: 15px; color: var(--text); }
.tx small { color: var(--text-2); font-size: 13px; }
.more { color: var(--text-2); width: 32px; height: 32px; }
@media (max-width: 767px) {
  .zc { margin: 24px -4px 0; padding: 16px 12px 6px; border-radius: 20px; }
  .area { height: 180px; }
  .xlab { font-size: 11px; }
  }
</style>
