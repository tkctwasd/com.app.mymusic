<script setup>
// Card kiểu Spotify: ảnh bìa, tiêu đề, phụ đề; hover -> nền sáng + nút Play trượt lên.
import Cover from '../ui/Cover.vue';
import PlayButton from './PlayButton.vue';
defineProps({ to: String, title: String, sub: String, cover: String, mosaic: Array, round: Boolean, liked: Boolean, playing: Boolean, icon: String });
const emit = defineEmits(['play']);
</script>

<template>
  <RouterLink :to="to" class="card">
    <div class="art">
      <Cover :src="cover" :mosaic="mosaic" :round="round" :liked="liked" :icon="icon" :size="360" class="cv" />
      <PlayButton class="pb" :class="{ show: playing }" :playing="playing" @click.prevent.stop="emit('play')" />
    </div>
    <div class="title ellipsis">{{ title }}</div>
    <div class="sub">{{ sub }}</div>
  </RouterLink>
</template>

<style scoped>
.card { display: block; padding: 12px; border-radius: 8px; transition: background .3s; min-width: 0; }
.card:hover { background: var(--surface-2); }
.art { position: relative; margin-bottom: 8px; }
.cv { width: 100%; box-shadow: 0 8px 24px rgba(0,0,0,.5); border-radius: 6px; }
.cv.round { border-radius: 50%; }
.pb { position: absolute; right: 8px; bottom: 8px; opacity: 0; transform: translateY(8px); transition: all .3s; }
.card:hover .pb, .pb.show { opacity: 1; transform: none; }
.title { font-weight: 700; }
.sub { font-size: 13px; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 2px; }
@media (hover: none) { .pb { display: none; } }
</style>
