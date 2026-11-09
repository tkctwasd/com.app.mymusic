<script setup>
// Hẹn giờ tắt tùy chỉnh: hai bánh xe cuộn giờ + phút
import { ref, computed } from 'vue';
import Modal from '../ui/Modal.vue';
import WheelPicker from '../ui/WheelPicker.vue';
import { usePlayer } from '../../stores/player.js';
import { useUi } from '../../stores/ui.js';

const player = usePlayer(), ui = useUi();
const h = ref(0), m = ref(20);
const total = computed(() => h.value * 60 + m.value);
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
    <div class="picker">
      <div class="band" />
      <WheelPicker v-model="h" :max="23" unit="giờ" />
      <WheelPicker v-model="m" :max="59" unit="phút" />
    </div>
    <template #footer><button class="btn btn-primary" :disabled="!total" @click="save">Hẹn giờ{{ total ? ` ${label(total)}` : '' }}</button></template>
  </Modal>
</template>

<style scoped>
.picker { position: relative; display: flex; gap: 8px; overflow: hidden; touch-action: pan-y; overscroll-behavior: contain; }
.band { position: absolute; left: 0; right: 0; top: 50%; height: 40px; transform: translateY(-50%); border-radius: 12px; background: var(--hover); pointer-events: none; }
</style>
