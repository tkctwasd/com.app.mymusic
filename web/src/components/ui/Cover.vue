<script setup>
// Ảnh bìa có skeleton khi tải và icon dự phòng khi không có ảnh. mosaic: ghép lưới 2x2 (cho playlist).
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import { img } from '../../utils.js';

const props = defineProps({ src: String, mosaic: Array, size: { type: Number, default: 300 }, round: Boolean, icon: { type: String, default: 'music' }, liked: Boolean });
const loaded = ref(false);
const tiles = computed(() => (props.mosaic?.length >= 4 ? props.mosaic.slice(0, 4) : null));
const single = computed(() => props.src || props.mosaic?.[0] || '');
</script>

<template>
  <div class="cover" :class="{ round, liked }">
    <div v-if="liked" class="liked-bg"><Icon name="heartFill" size="42%" /></div>
    <div v-else-if="tiles" class="grid">
      <img v-for="(u, i) in tiles" :key="i" :src="img(u, size / 2)" alt="" loading="lazy" />
    </div>
    <template v-else-if="single">
      <div v-if="!loaded" class="skeleton fill" />
      <img :src="img(single, size)" alt="" loading="lazy" :class="{ hidden: !loaded }" @load="loaded = true" />
    </template>
    <div v-else class="empty"><Icon :name="icon" size="38%" /></div>
  </div>
</template>

<style scoped>
.cover { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: var(--cover-r, 10px); background: var(--surface-2); flex-shrink: 0; }
.cover.round { border-radius: 50%; }
img, .fill { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; transition: opacity .3s; }
img.hidden { opacity: 0; }
.grid { display: grid; grid-template: 1fr 1fr / 1fr 1fr; width: 100%; height: 100%; }
.grid img { position: static; }
.empty { display: grid; place-items: center; width: 100%; height: 100%; color: var(--text-3); background: linear-gradient(135deg, var(--surface-2), var(--surface-3)); }
.liked-bg { display: grid; place-items: center; width: 100%; height: 100%; color: #fff; background: linear-gradient(140deg, #ff9a8b 0%, #ff6a88 45%, #a77bff 100%); }
</style>
