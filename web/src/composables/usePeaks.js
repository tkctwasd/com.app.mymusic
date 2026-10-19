// Dạng sóng âm (waveform) của bài hát: dùng track.peaks nếu có; nếu chưa thì giải mã file trong trình duyệt
// (OfflineAudioContext), tính 200 giá trị 0–1 rồi lưu lên server để lần sau khỏi tính lại.
// Trong lúc chờ: trả sóng giả lập ổn định theo id (vẽ mờ).
import { ref, watch, toValue } from 'vue';
import { api } from '../api.js';

const N = 200;
const mem = new Map(); // id -> peaks
const pending = new Map(); // id -> Promise
let queue = Promise.resolve(); // giải mã lần lượt từng bài để đỡ tốn RAM

export function fakePeaks(id = '') {
  let seed = 0;
  for (const c of id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  return Array.from({ length: N }, (_, i) => 0.25 + 0.55 * Math.abs(Math.sin(i / 9 + rnd())) * (0.6 + 0.4 * rnd()));
}

async function compute(t) {
  const buf = await (await fetch(t.fileUrl)).arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const step = Math.floor(data.length / N) || 1;
  const out = [];
  for (let i = 0; i < N; i++) {
    let sum = 0;
    const from = i * step, to = Math.min(data.length, from + step);
    for (let j = from; j < to; j += 16) sum += data[j] * data[j];
    out.push(Math.sqrt(sum / Math.max(1, (to - from) / 16)));
  }
  const max = Math.max(...out) || 1;
  return out.map((v) => Math.round((v / max) * 100) / 100);
}

function load(t) {
  if (pending.has(t.id)) return pending.get(t.id);
  const p = (queue = queue.then(() => compute(t)).then((peaks) => {
    mem.set(t.id, peaks);
    t.peaks = peaks;
    api(`/api/tracks/${t.id}`, { method: 'PATCH', body: { peaks } }).catch(() => {});
    return peaks;
  }).catch(() => null));
  pending.set(t.id, p);
  return p;
}

export function usePeaks(trackSrc) {
  const peaks = ref([]);
  const real = ref(false);
  watch(() => toValue(trackSrc)?.id, async () => {
    const t = toValue(trackSrc);
    if (!t) { peaks.value = []; return; }
    const known = t.peaks?.length ? t.peaks : mem.get(t.id);
    if (known) { peaks.value = known; real.value = true; return; }
    peaks.value = fakePeaks(t.id); real.value = false;
    const p = await load(t);
    if (p && toValue(trackSrc)?.id === t.id) { peaks.value = p; real.value = true; }
  }, { immediate: true });
  return { peaks, real };
}
