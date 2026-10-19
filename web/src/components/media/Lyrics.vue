<script setup>
// Lời bài hát (LRCLIB qua backend): tô sáng dòng đang hát, tự cuộn, click dòng để tua.
import { ref, computed, watch, nextTick } from 'vue';
import { api } from '../../api.js';
import { usePlayer } from '../../stores/player.js';

const props = defineProps({ big: Boolean });
const player = usePlayer();
const data = ref(null);
const loading = ref(false);
const box = ref(null);
const userScrolled = ref(0);

watch(() => player.currentId, async (id) => {
  data.value = null;
  if (!id) return;
  loading.value = true;
  try { const r = await api(`/api/tracks/${id}/lyrics`); if (player.currentId === id) data.value = r; } catch {}
  loading.value = false;
}, { immediate: true });

const lines = computed(() => {
  const s = data.value?.synced;
  if (!s) return null;
  return s.split('\n').map((l) => {
    const m = l.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    return m ? { t: +m[1] * 60 + +m[2], text: m[3].trim() || '♪' } : null;
  }).filter(Boolean);
});
const activeIdx = computed(() => {
  if (!lines.value) return -1;
  let i = -1;
  for (let k = 0; k < lines.value.length; k++) if (lines.value[k].t <= player.time + 0.3) i = k; else break;
  return i;
});

watch(activeIdx, async (i) => {
  if (i < 0 || Date.now() - userScrolled.value < 3000) return;
  await nextTick();
  const el = box.value?.querySelector(`[data-i="${i}"]`);
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
});
</script>

<template>
  <div ref="box" class="lyrics scroll" :class="{ big }" @wheel="userScrolled = Date.now()" @touchmove="userScrolled = Date.now()">
    <div v-if="loading" class="state">Đang tìm lời bài hát…</div>
    <template v-else-if="lines">
      <p v-for="(l, i) in lines" :key="i" :data-i="i" :class="{ active: i === activeIdx, past: i < activeIdx }" @click="player.seek(l.t)">{{ l.text }}</p>
      <small class="src">Lời từ LRCLIB</small>
    </template>
    <pre v-else-if="data?.plain" class="plain">{{ data.plain }}</pre>
    <div v-else class="state">Không tìm thấy lời cho bài hát này.</div>
  </div>
</template>

<style scoped>
.lyrics { height: 100%; padding: 16px 0 50%; }
p { margin: 0 0 14px; font-size: 22px; font-weight: 800; line-height: 1.3; color: rgba(255,255,255,.45); cursor: pointer; transition: color .2s; }
p:hover { color: rgba(255,255,255,.85); }
p.past { color: rgba(255,255,255,.7); }
p.active { color: #fff; }
.big p { font-size: clamp(24px, 3.2vw, 40px); margin-bottom: 20px; }
.plain { white-space: pre-wrap; font: 600 16px/1.7 var(--font); color: var(--text-2); margin: 0; }
.state { color: var(--text-2); padding: 24px 0; }
.src { color: var(--text-3); }
</style>
