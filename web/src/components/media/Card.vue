<script setup>
// Thẻ trên "Kệ": bìa bo tròn; playlist/album có đĩa than trượt ra khi rê chuột (hoặc khi đang phát).
// dropIds: nhận thả bài vào (playlist / Đã thích).
import { ref } from 'vue';
import Cover from '../ui/Cover.vue';
import PlayButton from './PlayButton.vue';
import { DRAG_MIME } from '../../composables/useDragSort.js';

const props = defineProps({ to: String, title: String, sub: String, cover: String, mosaic: Array, round: Boolean, liked: Boolean, playing: Boolean, active: Boolean, icon: String, vinyl: Boolean, droppable: Boolean });
const emit = defineEmits(['play', 'drop-ids']);
const over = ref(false);
function onDragover(e) { if (props.droppable && e.dataTransfer.types.includes(DRAG_MIME)) { e.preventDefault(); over.value = true; } }
function onDrop(e) {
  over.value = false;
  const ids = JSON.parse(e.dataTransfer.getData(DRAG_MIME) || '[]');
  if (ids.length) emit('drop-ids', ids);
}
</script>

<template>
  <RouterLink :to="to" class="card" :class="{ round, vinyl, spin: active, over }" @dragover="onDragover" @dragleave="over = false" @drop="onDrop">
    <div class="art">
      <div v-if="vinyl" class="disc"><span class="label" /></div>
      <Cover :src="cover" :mosaic="mosaic" :round="round" :liked="liked" :icon="icon" :size="360" class="cv" />
      <PlayButton class="pb" :class="{ show: active }" :playing="playing" :size="44" glass @click.prevent.stop="emit('play')" />
    </div>
    <div class="title ellipsis">{{ title }}</div>
    <div class="sub">{{ sub }}</div>
  </RouterLink>
</template>

<style scoped>
.card { display: block; min-width: 0; padding: 8px; margin: -8px; border-radius: 22px; transition: background .3s; }
.card.over { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--accent); }
.art { position: relative; margin-bottom: 12px; }
.cv { position: relative; z-index: 1; width: 100%; --cover-r: 18px; box-shadow: 0 14px 30px -14px rgb(0 0 0 / .5); transition: transform .4s var(--spring); }
.round .cv { box-shadow: 0 14px 30px -16px rgb(0 0 0 / .5); }
.disc { position: absolute; z-index: 0; top: 4%; bottom: 4%; aspect-ratio: 1; right: 4%; border-radius: 50%; transition: transform .5s var(--spring);
  background: repeating-radial-gradient(circle, #1b1b1f 0 2px, #26262c 2px 3px), #1b1b1f; box-shadow: 0 6px 16px rgb(0 0 0 / .35); }
.label { position: absolute; inset: 34%; border-radius: 50%; background: radial-gradient(circle, #111 0 9%, var(--accent) 10% 100%); }
.card.vinyl:hover .disc, .card.vinyl.spin .disc { transform: translateX(26%); }
.card.vinyl.spin .disc { animation: rot 4s linear infinite; }
@keyframes rot { from { transform: translateX(26%) rotate(0); } to { transform: translateX(26%) rotate(360deg); } }
.card.vinyl:hover .cv, .card.vinyl.spin .cv { transform: translateX(-6%); }
.card:not(.vinyl):hover .cv { transform: translateY(-4px); }
.pb { position: absolute; z-index: 2; right: 10px; bottom: 10px; opacity: 0; transform: translateY(6px) scale(.9); transition: all .3s var(--spring); }
.card.vinyl .pb { right: 14%; }
.round .pb { right: 8%; bottom: 8%; }
.card:hover .pb, .pb.show { opacity: 1; transform: none; }
.title { font-weight: 600; padding: 0 2px; }
.round .title, .round .sub { text-align: center; }
.sub { font-size: 12.5px; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin-top: 2px; padding: 0 2px; }
@media (hover: none) { .pb:not(.show) { display: none; } }
</style>
