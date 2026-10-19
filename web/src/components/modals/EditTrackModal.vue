<script setup>
import { reactive, ref } from 'vue';
import Modal from '../ui/Modal.vue';
import Cover from '../ui/Cover.vue';
import Icon from '../ui/Icon.vue';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';

const props = defineProps({ track: Object });
const lib = useLibrary(), ui = useUi();
const f = reactive({ title: props.track.title, artist: props.track.artist, album: props.track.album || '' });
const busy = ref(false);
const fileInput = ref(null);

async function onFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  busy.value = true;
  try { await lib.uploadCover(props.track, file); ui.toast('Đã đổi ảnh bìa'); } catch (err) { ui.toast(err.message); }
  busy.value = false;
}
async function save() {
  busy.value = true;
  try { await lib.updateTrack(props.track, f); ui.close(); } catch (e) { ui.toast(e.message); }
  busy.value = false;
}
</script>

<template>
  <Modal title="Sửa thông tin" @close="ui.close()">
    <form class="wrap" @submit.prevent="save">
      <button type="button" class="cv" :disabled="busy" @click="fileInput.click()">
        <Cover :src="track.coverUrl" :size="360" />
        <span class="over"><Icon name="edit" size="32" />Chọn ảnh</span>
      </button>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
      <div class="fields">
        <div><label class="lbl">Tên bài</label><input v-model="f.title" class="field" required /></div>
        <div><label class="lbl">Ca sĩ</label><input v-model="f.artist" class="field" /></div>
        <div><label class="lbl">Album</label><input v-model="f.album" class="field" /></div>
      </div>
    </form>
    <template #footer><button class="btn btn-light" :disabled="busy" @click="save">Lưu</button></template>
  </Modal>
</template>

<style scoped>
.wrap { display: flex; gap: 16px; }
.cv { position: relative; width: 180px; flex-shrink: 0; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 60px rgba(0,0,0,.5); }
.over { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(0,0,0,.7); opacity: 0; transition: opacity .15s; font-weight: 600; }
.cv:hover .over { opacity: 1; }
.fields { flex: 1; display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 500px) { .wrap { flex-direction: column; align-items: center; } .fields { width: 100%; } }
</style>
