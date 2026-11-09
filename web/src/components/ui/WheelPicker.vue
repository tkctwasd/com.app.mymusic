<script setup>
// Bánh xe cuộn kiểu đồng hồ iPhone: cuộn/vuốt, dừng đúng ô nhờ scroll-snap
import { ref, onMounted, watch, nextTick } from 'vue';
const props = defineProps({ modelValue: Number, max: Number, step: { type: Number, default: 1 }, unit: String });
const emit = defineEmits(['update:modelValue']);
const ITEM = 40;
const items = Array.from({ length: Math.floor(props.max / props.step) + 1 }, (_, i) => i * props.step);
const el = ref(null);
let timer = 0;
const idxOf = (v) => Math.max(0, items.indexOf(v));
function onScroll() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.value.scrollTop / ITEM)));
    // Một số trình duyệt dừng lệch nửa ô: căn lại cho đúng giữa dải chọn
    if (Math.abs(el.value.scrollTop - i * ITEM) > 1) go(i);
    if (items[i] !== props.modelValue) emit('update:modelValue', items[i]);
  }, 120);
}
const go = (i) => el.value.scrollTo({ top: i * ITEM, behavior: 'smooth' });
onMounted(() => nextTick(() => { el.value.scrollTop = idxOf(props.modelValue) * ITEM; }));
watch(() => props.modelValue, (v) => { if (Math.round(el.value.scrollTop / ITEM) !== idxOf(v)) go(idxOf(v)); });
</script>

<template>
  <div class="wheel">
    <div ref="el" class="list" @scroll.passive="onScroll">
      <div class="pad" />
      <button v-for="(v, i) in items" :key="v" type="button" class="it" :class="{ on: v === modelValue }" @click="go(i)">{{ v }}</button>
      <div class="pad" />
    </div>
    <span v-if="unit" class="unit">{{ unit }}</span>
  </div>
</template>

<style scoped>
.wheel { position: relative; flex: 1; min-width: 0; height: 200px; overflow: hidden; touch-action: pan-y; }
.list { height: 100%; overflow-y: auto; overflow-x: hidden; touch-action: pan-y; scroll-snap-type: y mandatory; scrollbar-width: none; overscroll-behavior: contain;
  -webkit-mask-image: linear-gradient(transparent, #000 35%, #000 65%, transparent); mask-image: linear-gradient(transparent, #000 35%, #000 65%, transparent); }
.list::-webkit-scrollbar { display: none; }
.pad { height: 80px; }
.it { display: block; width: 100%; height: 40px; scroll-snap-align: center; font-size: 22px; font-variant-numeric: tabular-nums; color: var(--text-3); transition: color .15s, transform .15s; padding-right: calc(50% + 2px); text-align: right; transform-origin: right center; }
.it.on { color: var(--text); font-weight: 600; transform: scale(1.08); }
.unit { position: absolute; top: 50%; left: calc(50% + 8px); transform: translateY(-50%); font-size: 15px; font-weight: 500; color: var(--text-2); pointer-events: none; }
</style>
