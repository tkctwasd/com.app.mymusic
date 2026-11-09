<script setup>
// Hẹn giờ tắt tùy chỉnh: nhập số giờ + phút
import { ref, computed } from 'vue';
import Modal from '../ui/Modal.vue';
import { usePlayer } from '../../stores/player.js';
import { useUi } from '../../stores/ui.js';

const player = usePlayer(), ui = useUi();
const h = ref(0), m = ref(20);
const total = computed(() => Math.max(0, Math.floor(+h.value || 0)) * 60 + Math.max(0, Math.floor(+m.value || 0)));
const label = (t) => [Math.floor(t / 60) && `${Math.floor(t / 60)} giờ`, t % 60 && `${t % 60} phút`].filter(Boolean).join(' ');

function save() {
  if (!total.value) return;
  player.setSleep(total.value);
  ui.toast(`Sẽ dừng phát sau ${label(total.value)}`);
  ui.close();
}
</script>

<template>
  <Modal title="Hẹn giờ tắt" @close="ui.close()">
    <form class="row" @submit.prevent="save">
      <div><label class="lbl">Giờ</label><input v-model="h" class="field" type="number" inputmode="numeric" min="0" max="23" /></div>
      <div><label class="lbl">Phút</label><input v-model="m" class="field" type="number" inputmode="numeric" min="0" max="59" autofocus /></div>
    </form>
    <template #footer><button class="btn btn-primary" :disabled="!total" @click="save">Hẹn giờ{{ total ? ` ${label(total)}` : '' }}</button></template>
  </Modal>
</template>

<style scoped>
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
