// Lấy màu chủ đạo của ảnh bìa (canvas thu nhỏ 24x24). Có cache.
// extractRgb trả [r,g,b] gốc (dùng cho theme); useDominantColor trả chuỗi màu đã làm tối (dùng cho nền header).
import { ref, watch, toValue } from 'vue';
import { img, hashColor } from '../utils.js';

const cache = new Map();

export function extractRgb(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 24;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(im, 0, 0, 24, 24);
        const d = ctx.getImageData(0, 0, 24, 24).data;
        // Ưu tiên pixel có độ bão hòa cao, bỏ qua pixel quá tối/quá sáng
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          const sat = max ? (max - min) / max : 0, lum = (max + min) / 2;
          if (lum < 25 || lum > 235) continue;
          const wt = 0.15 + sat * sat;
          r += R * wt; g += G * wt; b += B * wt; w += wt;
        }
        resolve(w ? [r / w, g / w, b / w] : null);
      } catch { resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = img(url, 64);
  });
  cache.set(url, p);
  return p;
}

export function useDominantColor(urlSrc, fallbackKey) {
  const color = ref(hashColor(toValue(fallbackKey) || ''));
  watch(() => [toValue(urlSrc), toValue(fallbackKey)], async ([url, key]) => {
    color.value = hashColor(key || '');
    if (!url) return;
    const rgb = await extractRgb(url);
    if (!rgb || toValue(urlSrc) !== url) return;
    const [R, G, B] = rgb;
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    const k = L > 110 ? 110 / L : 1; // giới hạn độ sáng
    color.value = `rgb(${Math.round(R * k)} ${Math.round(G * k)} ${Math.round(B * k)})`;
  }, { immediate: true });
  return color;
}
