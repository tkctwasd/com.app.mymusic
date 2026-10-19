<script setup>
// Logo app (vẽ lại từ icon-app.png): nền bo góc gradient, nốt nhạc đôi, cột sóng âm, vòng loa, vòng sóng.
// animated: các cột sóng nhảy lệch nhịp, vòng loa lan nhẹ. Cột bị nốt nhạc che được khoét viền bằng mask như bản gốc.
defineProps({ size: { type: [Number, String], default: 32 }, animated: Boolean });
const uid = Math.random().toString(36).slice(2, 8);
// [x, y1, y2] của từng cột sóng (khung 512)
const bars = [
  [37, 247, 275], [62, 231, 293], [88, 185, 340], [116, 219, 318], [143, 189, 313],
  [223, 192, 344], [251, 235, 311], [279, 210, 296], [307, 189, 274], [335, 226, 268],
  [418, 164, 333], [446, 208, 307], [475, 240, 280],
];
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 512 512" class="logo" :class="{ animated }" role="img" aria-label="My Music">
    <defs>
      <linearGradient :id="`bg${uid}`" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#121a55" />
        <stop offset=".55" stop-color="#1f8a9a" />
        <stop offset="1" stop-color="#7fe85c" />
      </linearGradient>
      <linearGradient :id="`fg${uid}`" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#3f57bd" />
        <stop offset=".5" stop-color="#2fb8c6" />
        <stop offset="1" stop-color="#86ec52" />
      </linearGradient>
      <linearGradient :id="`bar${uid}`" gradientUnits="userSpaceOnUse" x1="0" y1="165" x2="0" y2="345">
        <stop offset="0" stop-color="#86ec66" />
        <stop offset=".55" stop-color="#2fb8c6" />
        <stop offset="1" stop-color="#3f74c4" />
      </linearGradient>
      <!-- Hình nốt nhạc: dùng để vẽ và để khoét khe quanh nốt -->
      <g :id="`note${uid}`">
        <path d="M164 150 Q164 122 196 113 L378 66 Q395 62 395 80 V339 A60 60 0 1 1 356 283 V160 Q356 146 342 149 L216 181 Q203 185 203 199 V385 A62 62 0 1 1 164 330 Z" />
      </g>
      <mask :id="`cut${uid}`" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
        <rect width="512" height="512" fill="#fff" />
        <use :href="`#note${uid}`" fill="#000" stroke="#000" stroke-width="20" stroke-linejoin="round" />
      </mask>
    </defs>

    <rect width="512" height="512" rx="120" :fill="`url(#bg${uid})`" />

    <!-- Vòng loa -->
    <g class="rings" fill="none" :stroke="`url(#bar${uid})`" stroke-width="9" stroke-linecap="round">
      <circle cx="118" cy="113" r="11" class="r1" />
      <path d="M118 83 A30 30 0 1 1 88 113 A30 30 0 0 1 118 83" class="r2" />
      <path d="M135 165 A51 51 0 1 1 168 108" class="r3" />
    </g>

    <!-- Sóng âm -->
    <g :mask="`url(#cut${uid})`" :stroke="`url(#bar${uid})`" stroke-width="14" stroke-linecap="round">
      <line v-for="(b, i) in bars" :key="i" :x1="b[0]" :x2="b[0]" :y1="b[1]" :y2="b[2]" class="bar" :style="{ animationDelay: `${-((i * 0.37) % 1.3).toFixed(2)}s`, animationDuration: `${0.9 + (i % 4) * 0.18}s` }" />
    </g>

    <!-- Vòng sóng dưới nốt phải -->
    <g fill="none" :stroke="`url(#fg${uid})`" stroke-width="10" stroke-linecap="round" class="arcs">
      <path d="M256 268 A72 72 0 0 0 400 360" class="a1" />
      <path d="M230 378 A102 102 0 0 0 428 345" class="a2" />
    </g>

    <use :href="`#note${uid}`" :fill="`url(#fg${uid})`" />
  </svg>
</template>

<style scoped>
.logo { display: block; flex-shrink: 0; }
.bar, .rings > *, .arcs > * { transform-box: fill-box; transform-origin: center; }
.animated .bar { animation: eq 1s ease-in-out infinite alternate; }
.animated .r2 { animation: ring 2.4s ease-out infinite; }
.animated .r3 { animation: ring 2.4s ease-out infinite .5s; }
.animated .a1 { animation: glow 2.4s ease-in-out infinite; }
.animated .a2 { animation: glow 2.4s ease-in-out infinite .6s; }
@keyframes eq { 0% { transform: scaleY(.2); } 55% { transform: scaleY(1.15); } 100% { transform: scaleY(.55); } }
@keyframes ring { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(1.06); } }
@keyframes glow { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .animated * { animation: none !important; } }
</style>
