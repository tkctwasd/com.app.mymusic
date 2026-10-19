<script setup>
// Thêm nhạc từ YouTube: dán link -> xem trước -> sửa thông tin / chọn bài (playlist YT) -> chọn playlist đích -> tải.
import { ref, computed } from 'vue';
import Modal from '../ui/Modal.vue';
import Icon from '../ui/Icon.vue';
import Select from '../ui/Select.vue';
import { api } from '../../api.js';
import { fmtTime } from '../../utils.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';

const props = defineProps({ playlistId: String, url: String });
const lib = useLibrary(), ui = useUi();
const url = ref(props.url || '');
const loading = ref(false);
const error = ref('');
const data = ref(null); // kết quả preview
const items = ref([]); // [{ url, title, artist, album, thumbnail, duration, on }]
const playlistId = ref(props.playlistId || '');
const createNew = ref(false);

const YT = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//;
const selected = computed(() => items.value.filter((i) => i.on));
const allOn = computed({ get: () => items.value.every((i) => i.on), set: (v) => items.value.forEach((i) => { i.on = v; }) });

async function doPreview() {
  error.value = ''; data.value = null;
  if (!YT.test(url.value.trim())) { error.value = 'Hãy dán link YouTube (video hoặc playlist)'; return; }
  loading.value = true;
  try {
    const r = await api(`/api/youtube/preview?url=${encodeURIComponent(url.value.trim())}`);
    data.value = r;
    items.value = (r.type === 'playlist' ? r.items : [r.item]).map((i) => ({ ...i, album: '', on: true }));
    if (r.type === 'playlist') createNew.value = true;
  } catch (e) { error.value = e.message; }
  loading.value = false;
}

if (props.url) doPreview(); // mở từ Command bar với link sẵn

async function paste() {
  try { url.value = (await navigator.clipboard.readText()).trim(); doPreview(); } catch {}
}

async function submit() {
  let pid = playlistId.value || undefined;
  if (createNew.value && data.value?.type === 'playlist') pid = (await lib.createPlaylist(data.value.title)).id;
  await lib.startImport(selected.value.map(({ url, title, artist, album }) => ({ url, title, artist, album })), pid);
  ui.toast(`Đang tải ${selected.value.length} bài…`);
  ui.close();
}
</script>

<template>
  <Modal title="Thêm nhạc từ YouTube" wide @close="ui.close()">
    <form class="row" @submit.prevent="doPreview">
      <div class="inp">
        <Icon name="youtube" class="yt" />
        <input v-model="url" class="field" placeholder="Dán link video hoặc playlist YouTube…" autofocus />
      </div>
      <button v-if="!url" type="button" class="btn btn-outline" @click="paste">Dán</button>
      <button v-else class="btn btn-light" :disabled="loading">{{ loading ? 'Đang đọc…' : 'Xem trước' }}</button>
    </form>
    <p v-if="error" class="err"><Icon name="alert" size="16" /> {{ error }}</p>

    <div v-if="loading" class="pv"><div class="skeleton thumb" /><div class="grow"><div class="skeleton line" /><div class="skeleton line short" /></div></div>

    <template v-if="data">
      <!-- Một video: sửa thông tin trước khi lưu -->
      <div v-if="data.type === 'video'" class="pv">
        <img :src="items[0].thumbnail" class="thumb" alt="" />
        <div class="grow form">
          <div><label class="lbl">Tên bài</label><input v-model="items[0].title" class="field" /></div>
          <div class="two">
            <div><label class="lbl">Ca sĩ</label><input v-model="items[0].artist" class="field" /></div>
            <div><label class="lbl">Album</label><input v-model="items[0].album" class="field" placeholder="(không bắt buộc)" /></div>
          </div>
          <small class="muted">Thời lượng {{ fmtTime(items[0].duration) }}</small>
        </div>
      </div>

      <!-- Playlist: chọn bài -->
      <div v-else>
        <div class="pl-head">
          <b>{{ data.title }}</b><span class="muted"> · {{ items.length }} video</span>
          <label class="chk"><input v-model="allOn" type="checkbox" /> Chọn tất cả</label>
        </div>
        <ul class="list scroll">
          <li v-for="(it, i) in items" :key="i" :class="{ off: !it.on }" @click="it.on = !it.on">
            <input v-model="it.on" type="checkbox" @click.stop />
            <img :src="it.thumbnail" alt="" loading="lazy" />
            <div class="grow ellipsis"><div class="ellipsis">{{ it.title }}</div><small class="muted">{{ it.artist }}</small></div>
            <small class="muted">{{ fmtTime(it.duration) }}</small>
          </li>
        </ul>
      </div>

      <div class="dest">
        <label v-if="data.type === 'playlist'" class="chk"><input v-model="createNew" type="checkbox" /> Tạo playlist mới "{{ data.title }}"</label>
        <div v-if="!createNew || data.type === 'video'">
          <label class="lbl">Thêm vào playlist</label>
          <Select v-model="playlistId" :options="[{ value: '', label: 'Chỉ thêm vào thư viện', icon: 'shelf' }, ...lib.playlists.map((p) => ({ value: p.id, label: p.name, sub: `${p.trackIds.length} bài`, icon: 'list' }))]" />
        </div>
      </div>
    </template>

    <template #footer>
      <button class="btn btn-outline" @click="ui.close()">Hủy</button>
      <button class="btn btn-primary" :disabled="!data || !selected.length" @click="submit">
        <Icon name="download" size="16" /> Lưu {{ selected.length > 1 ? selected.length + ' bài' : '' }} vào thư viện
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.row { display: flex; gap: 8px; }
.inp { position: relative; flex: 1; }
.inp .field { padding-left: 40px; height: 44px; }
.yt { position: absolute; left: 12px; top: 12px; color: #ff4e45; }
.row .btn { height: 44px; }
.err { display: flex; align-items: center; gap: 6px; color: var(--danger); margin: 12px 0 0; }
.pv { display: flex; gap: 16px; margin-top: 20px; }
.thumb { width: 200px; aspect-ratio: 16/9; object-fit: cover; border-radius: 14px; flex-shrink: 0; }
.grow { flex: 1; min-width: 0; }
.form { display: flex; flex-direction: column; gap: 12px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.line { height: 16px; border-radius: 4px; margin: 8px 0; }
.line.short { width: 50%; }
.pl-head { display: flex; align-items: center; gap: 4px; margin: 20px 0 8px; }
.pl-head .chk { margin-left: auto; }
.chk { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-2); }
.chk input, li input { accent-color: var(--accent); width: 16px; height: 16px; }
.list { list-style: none; margin: 0; padding: 0; max-height: 320px; }
.list li { display: flex; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 12px; cursor: pointer; }
.list li:hover { background: var(--hover); }
.list li.off { opacity: .5; }
.list img { width: 64px; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
.dest { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 600px) { .pv { flex-direction: column; } .thumb { width: 100%; } .two { grid-template-columns: 1fr; } }
</style>
