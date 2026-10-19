<script setup>
import { reactive } from 'vue';
import Modal from '../ui/Modal.vue';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';

const props = defineProps({ playlist: Object });
const lib = useLibrary(), ui = useUi();
const f = reactive({ name: props.playlist.name, description: props.playlist.description || '' });

async function save() {
  if (!f.name.trim()) return;
  await lib.updatePlaylist(props.playlist, { name: f.name.trim(), description: f.description.trim() });
  ui.close();
}
</script>

<template>
  <Modal title="Sửa thông tin chi tiết" @close="ui.close()">
    <form class="fields" @submit.prevent="save">
      <div><label class="lbl">Tên</label><input v-model="f.name" class="field" maxlength="100" autofocus required /></div>
      <div><label class="lbl">Mô tả</label><textarea v-model="f.description" class="field" rows="4" maxlength="300" placeholder="Thêm phần mô tả (không bắt buộc)" /></div>
    </form>
    <template #footer><button class="btn btn-light" @click="save">Lưu</button></template>
  </Modal>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
</style>
