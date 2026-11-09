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
    const v = items[Math.min(items.length - 1, Math.max(0, Math.round(el.value.scrollTop / ITEM)))];
    if (v !== props.modelValue) emit('update:modelValue', v);
  }, 80);
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
.wheel { position: relative; flex: 1; height: 200px; }
.list { height: 100%; overflow-y: auto; scroll-snap-type: y mandatory; scrollbar-width: none; overscroll-behavior: contain;
  -webkit-mask-image: linear-gradient(transparent, #000 35%, #000 65%, transparent); mask-image: linear-gradient(transparent, #000 35%, #000 65%, transparent); }
.list::-webkit-scrollbar { display: none; }
.pad { height: 80px; }
.it { display: block; width: 100%; height: 40px; scroll-snap-align: center; font-size: 22px; font-variant-numeric: tabular-nums; color: var(--text-3); transition: color .15s, transform .15s; padding-right: 44px; text-align: right; }
.it.on { color: var(--text); font-weight: 600; transform: scale(1.08); }
.unit { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); font-size: 15px; font-weight: 500; color: var(--text-2); pointer-events: none; }
</style>
