<script setup>
// Thanh trượt kiểu Spotify: hover -> xanh + hiện núm; kéo bằng pointer (chuột/cảm ứng); cuộn chuột nếu wheelStep.
import { ref, computed } from 'vue';

const props = defineProps({ value: Number, max: { type: Number, default: 1 }, wheelStep: Number, label: String });
const emit = defineEmits(['input', 'change']);
const el = ref(null);
const dragging = ref(null); // giá trị tạm khi đang kéo

const shown = computed(() => (dragging.value ?? props.value) || 0);
const pct = computed(() => (props.max ? Math.min(100, (shown.value / props.max) * 100) : 0));

const at = (e) => {
  const r = el.value.getBoundingClientRect();
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * props.max;
};
function down(e) {
  el.value.setPointerCapture(e.pointerId);
  dragging.value = at(e);
  emit('input', dragging.value);
}
function move(e) { if (dragging.value !== null) { dragging.value = at(e); emit('input', dragging.value); } }
function up() { if (dragging.value !== null) { emit('change', dragging.value); dragging.value = null; } }
function wheel(e) {
  if (!props.wheelStep) return;
  e.preventDefault();
  emit('change', Math.max(0, Math.min(props.max, props.value + (e.deltaY < 0 ? 1 : -1) * props.wheelStep)));
}
function key(e) {
  const step = props.wheelStep || props.max / 20;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); emit('change', Math.min(props.max, props.value + step)); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); emit('change', Math.max(0, props.value - step)); }
}
defineExpose({ dragging });
</script>

<template>
  <div ref="el" class="slider" :class="{ active: dragging !== null }" role="slider" tabindex="0" :aria-label="label"
    :aria-valuemin="0" :aria-valuemax="max" :aria-valuenow="Math.round(shown)"
    @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @wheel="wheel" @keydown="key">
    <div class="track"><div class="fill" :style="{ width: pct + '%' }" /></div>
    <div class="knob" :style="{ left: pct + '%' }" />
  </div>
</template>

<style scoped>
.slider { position: relative; height: 16px; display: flex; align-items: center; cursor: pointer; touch-action: none; flex: 1; outline: none; }
.track { height: 4px; width: 100%; border-radius: 2px; background: rgba(255,255,255,.3); overflow: hidden; }
.fill { height: 100%; background: #fff; border-radius: 2px; }
.knob { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: #fff; transform: translateX(-50%); opacity: 0; box-shadow: 0 2px 4px rgba(0,0,0,.5); pointer-events: none; }
.slider:hover .fill, .slider.active .fill, .slider:focus-visible .fill { background: var(--accent); }
.slider:hover .knob, .slider.active .knob, .slider:focus-visible .knob { opacity: 1; }
</style>
