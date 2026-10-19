// Favicon động: khi đang phát, các cột sóng trong icon.svg nhảy theo nhịp (~8 khung/giây); dừng thì về icon tĩnh.
// Trình duyệt không chạy animation bên trong favicon SVG nên phải thay href theo từng khung.
import { watch } from 'vue';
import { usePlayer } from '../stores/player.js';

const STATIC = '/icon.svg?v=2';

export function useFavicon() {
  const player = usePlayer();
  const link = document.querySelector('link[rel="icon"]');
  if (!link || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let src = null, bars = null, timer = null, t = 0;

  async function prepare() {
    if (src) return;
    src = await (await fetch(STATIC)).text();
    bars = [...src.matchAll(/<line x1="(\d+)" x2="\d+" y1="(\d+)" y2="(\d+)"\/>/g)].map((m) => ({ s: m[0], x: +m[1], y1: +m[2], y2: +m[3] }));
  }
  function frame() {
    t += 1;
    let svg = src;
    bars.forEach((b, i) => {
      const k = 0.25 + 0.9 * Math.abs(Math.sin(t * 0.45 + i * 1.7) * Math.cos(t * 0.21 + i));
      const c = (b.y1 + b.y2) / 2, h = ((b.y2 - b.y1) * Math.min(1.15, k)) / 2;
      svg = svg.replace(b.s, `<line x1="${b.x}" x2="${b.x}" y1="${(c - h).toFixed(0)}" y2="${(c + h).toFixed(0)}"/>`);
    });
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  watch(() => player.playing, async (on) => {
    clearInterval(timer);
    if (!on) { link.href = STATIC; return; }
    try { await prepare(); } catch { return; }
    if (player.playing) timer = setInterval(frame, 125);
  }, { immediate: true });
}
