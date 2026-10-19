<script setup>
// Header lớn của Playlist/Album/Nghệ sĩ: nền gradient theo màu ảnh bìa
import Cover from '../ui/Cover.vue';
defineProps({ type: String, title: String, color: String, cover: String, mosaic: Array, liked: Boolean, round: Boolean, icon: String, editable: Boolean });
const emit = defineEmits(['edit']);
</script>

<template>
  <header class="ph" :style="{ '--c': color }">
    <button class="cv-btn" :class="{ editable }" :disabled="!editable" @click="emit('edit')">
      <Cover :src="cover" :mosaic="mosaic" :liked="liked" :round="round" :icon="icon" :size="480" class="cv" />
    </button>
    <div class="info">
      <span class="type">{{ type }}</span>
      <h1 :class="{ long: title.length > 22, xlong: title.length > 40 }" @click="editable && emit('edit')">{{ title }}</h1>
      <div class="desc"><slot /></div>
    </div>
  </header>
</template>

<style scoped>
.ph { display: flex; align-items: flex-end; gap: 24px; padding: 88px 24px 24px; background: linear-gradient(var(--c), color-mix(in srgb, var(--c) 55%, #121212)); transition: background .5s; }
.cv-btn { flex-shrink: 0; cursor: default; }
.cv-btn.editable { cursor: pointer; }
.cv { width: clamp(128px, 18vw, 232px); box-shadow: 0 4px 60px rgba(0,0,0,.5); }
.info { min-width: 0; }
.type { font-size: 14px; font-weight: 600; }
h1 { font-size: clamp(32px, 6vw, 96px); font-weight: 900; letter-spacing: -.04em; line-height: 1.05; margin: 8px 0 12px; overflow-wrap: anywhere; }
h1.long { font-size: clamp(28px, 4.2vw, 72px); }
h1.xlong { font-size: clamp(24px, 3vw, 48px); }
.editable ~ .info h1 { cursor: pointer; }
.desc { font-size: 14px; color: rgba(255,255,255,.75); display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.desc :deep(b) { color: #fff; }
@media (max-width: 767px) {
  .ph { flex-direction: column; align-items: flex-start; padding: 64px 16px 16px; }
  .cv-btn { align-self: center; }
  .cv { width: 60vw; max-width: 260px; }
  h1 { margin-top: 4px; }
}
</style>
