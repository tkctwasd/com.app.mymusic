// Theme động: lấy màu bìa bài đang phát -> sinh bảng màu (nền, bề mặt, chữ, màu nhấn) cho cả app.
// Hỗ trợ Sáng / Tối / Theo hệ thống và tùy chọn "Màu cố định". Màu nhấn luôn đạt tương phản >= 4.5:1.
import { ref, watch, watchEffect } from 'vue';
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';
import { extractRgb } from './useDominantColor.js';

const DEFAULT = { h: 232, s: 42 }; // xanh chàm dịu

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const css = (h, s, l) => `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;

// Chỉnh độ sáng màu nhấn tới khi đủ tương phản với nền
function fitAccent(h, s, l, bgRgb, dir) {
  for (let i = 0; i < 40 && contrast(hslToRgb(h, s, l), bgRgb) < 4.5; i++) l += dir * 1.5;
  return Math.max(5, Math.min(95, l));
}

export function makePalette(base, mode) {
  const h = base.h;
  const s = Math.min(base.s, 70);
  const ss = s * 0.4; // bão hòa thấp cho nền để dịu mắt
  const as = Math.max(48, Math.min(78, s + 10));
  if (mode === 'light') {
    const bg = [h, ss * 0.9, 96.5];
    const al = fitAccent(h, as, 42, hslToRgb(...bg), -1);
    return {
      '--bg': css(...bg), '--bg-2': css(h, ss, 93.5), '--surface': css(h, ss * 0.6, 99), '--surface-2': css(h, ss, 91.5), '--surface-3': css(h, ss, 87),
      '--text': css(h, 25, 12), '--text-2': css(h, 12, 34), '--text-3': css(h, 8, 50),
      '--accent': css(h, as, al), '--accent-ink': '#fff', '--tint': css(h, as, 70),
    };
  }
  const bg = [h, ss, 7.5];
  const al = fitAccent(h, as, 72, hslToRgb(...bg), 1);
  return {
    '--bg': css(...bg), '--bg-2': css(h, ss, 10), '--surface': css(h, ss, 12.5), '--surface-2': css(h, ss, 17), '--surface-3': css(h, ss, 22),
    '--text': css(h, 20, 95), '--text-2': css(h, 12, 73), '--text-3': css(h, 9, 54),
    '--accent': css(h, as, al), '--accent-ink': css(h, 45, 10), '--tint': css(h, as, 45),
  };
}

export function useTheme() {
  const player = usePlayer(), ui = useUi();
  const base = ref(DEFAULT);
  const sys = window.matchMedia('(prefers-color-scheme: light)');
  const sysLight = ref(sys.matches);
  sys.addEventListener('change', () => { sysLight.value = sys.matches; });

  watch(() => [player.track?.coverUrl, ui.fixedColor], async ([url, fixed]) => {
    if (fixed || !url) { base.value = DEFAULT; return; }
    const rgb = await extractRgb(url);
    if (player.track?.coverUrl !== url) return;
    const hsl = rgb && rgbToHsl(rgb);
    base.value = hsl && hsl.s >= 12 ? { h: hsl.h, s: hsl.s } : DEFAULT; // ảnh gần xám -> dùng màu mặc định
  }, { immediate: true });

  watchEffect(() => {
    const mode = ui.theme === 'system' ? (sysLight.value ? 'light' : 'dark') : ui.theme;
    const root = document.documentElement;
    root.dataset.mode = mode;
    const p = makePalette(base.value, mode);
    for (const [k, v] of Object.entries(p)) root.style.setProperty(k, v);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p['--bg']);
  });
}
