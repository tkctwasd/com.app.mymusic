<script setup>
// Thanh tua dạng sóng âm: phần đã phát tô màu nhấn; rê chuột hiện vị trí + thời gian; kéo/click để tua; cuộn chuột tua 5s.
import { ref, computed } from 'vue';
import { usePeaks } from '../../composables/usePeaks.js';
import { fmtTime } from '../../utils.js';

const props = defineProps({
  track: Object, value: Number, max: Number,
  bars: { type: Number, default: 100 }, // số cột hiển thị (lấy mẫu lại từ peaks)
  height: { type: Number, default: 48 },
});
const emit = defineEmits(['seek']);
const { peaks, real } = usePeaks(() => props.track);
const el = ref(null);
const drag = ref(null);
const hover = ref(null); // 0..1

const shown = computed(() => {
  const p = peaks.value;
  if (!p.length) return [];
  const n = props.bars, out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i / n) * p.length), b = Math.max(a + 1, Math.floor(((i + 1) / n) * p.length));
    let m = 0;
    for (let j = a; j < b; j++) m = Math.max(m, p[j]);
    out.push(Math.max(0.08, m));
  }
  return out;
});
// Vẽ mỗi cột là 1 hình chữ nhật bo tròn trong viewBox (bars*3 x 100)
const path = computed(() => shown.value.map((v, i) => {
  const h = v * 100, y = (100 - h) / 2;
  return `M${i * 3 + 0.5} ${y + 0.6}v${Math.max(0.1, h - 1.2)}`;
}).join(''));

const pct = computed(() => {
  const v = drag.value ?? props.value ?? 0;
  return props.max ? Math.min(100, (v / props.max) * 100) : 0;
});
const at = (e) => { const r = el.value.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
function down(e) { el.value.setPointerCapture(e.pointerId); drag.value = at(e) * props.max; }
function move(e) { hover.value = at(e); if (drag.value !== null) drag.value = hover.value * props.max; }
function up() { if (drag.value !== null) { emit('seek', drag.value); drag.value = null; } }
function wheel(e) { e.preventDefault(); emit('seek', Math.max(0, Math.min(props.max, (props.value || 0) + (e.deltaY < 0 ? 5 : -5)))); }
function key(e) {
  const d = { ArrowRight: 5, ArrowLeft: -5 }[e.key];
  if (d) { e.preventDefault(); e.stopPropagation(); emit('seek', Math.max(0, Math.min(props.max, (props.value || 0) + d))); }
}
</script>

<template>
  <div ref="el" class="wave" :class="{ dragging: drag !== null, fake: !real }" :style="{ height: height + 'px' }"
    role="slider" tabindex="0" aria-label="Thanh tua" :aria-valuemin="0" :aria-valuemax="Math.round(max || 0)" :aria-valuenow="Math.round(value || 0)"
    @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @pointerleave="hover = null" @wheel="wheel" @keydown="key">
    <svg :viewBox="`0 0 ${bars * 3} 100`" preserveAspectRatio="none" class="base"><path :d="path" /></svg>
    <svg :viewBox="`0 0 ${bars * 3} 100`" preserveAspectRatio="none" class="done" :style="{ clipPath: `inset(0 ${100 - pct}% 0 0)` }"><path :d="path" /></svg>
    <template v-if="hover !== null && max">
      <div class="hline" :style="{ left: hover * 100 + '%' }" />
      <span class="tip" :style="{ left: hover * 100 + '%' }">{{ fmtTime(hover * max) }}</span>
    </template>
  </div>
</template>

<style scoped>
.wave { position: relative; width: 100%; cursor: pointer; touch-action: none; outline: none; }
svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
path { fill: none; stroke-width: 1.9; stroke-linecap: round; vector-effect: none; transition: d .4s var(--ease); }
.base path { stroke: color-mix(in oklab, var(--text) 22%, transparent); }
.done path { stroke: var(--accent); }
.fake path { opacity: .55; }
.hline { position: absolute; top: -2px; bottom: -2px; width: 2px; border-radius: 1px; background: var(--text); transform: translateX(-1px); pointer-events: none; opacity: .7; }
.tip { position: absolute; bottom: calc(100% + 6px); transform: translateX(-50%); padding: 2px 8px; border-radius: 6px; background: var(--text); color: var(--bg); font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; white-space: nowrap; }
.wave:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 6px; }
</style>
