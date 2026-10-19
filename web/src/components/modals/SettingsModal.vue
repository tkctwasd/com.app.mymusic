<script setup>
import Modal from '../ui/Modal.vue';
import Slider from '../ui/Slider.vue';
import { usePlayer } from '../../stores/player.js';
import { useUi } from '../../stores/ui.js';
import { auth } from '../../api.js';

const player = usePlayer(), ui = useUi();
const logout = () => { auth.token = ''; location.reload(); };
const shortcuts = [
  ['Space', 'Phát / Tạm dừng'], ['← / →', 'Tua 5 giây'], ['Shift + ← / →', 'Bài trước / sau'],
  ['↑ / ↓', 'Âm lượng'], ['M', 'Tắt tiếng'], ['L', 'Thích bài đang phát'], ['S', 'Trộn bài'], ['R', 'Lặp lại'],
  ['Q', 'Hàng đợi'], ['F', 'Toàn màn hình'], ['Ctrl + K  hoặc  /', 'Tìm kiếm'], ['Esc', 'Đóng'],
];
</script>

<template>
  <Modal title="Cài đặt" @close="ui.close()">
    <section>
      <h3>Phát lại</h3>
      <div class="row">
        <div><b>Chuyển bài mượt (Crossfade)</b><small class="muted">Các bài hòa vào nhau khi chuyển</small></div>
      </div>
      <div class="row slider">
        <span class="muted">{{ player.crossfade ? player.crossfade + ' giây' : 'Tắt' }}</span>
        <Slider :value="player.crossfade" :max="12" :wheel-step="1" label="Crossfade" @input="player.crossfade = Math.round($event)" @change="player.crossfade = Math.round($event)" />
        <span class="muted">12 giây</span>
      </div>
      <p class="muted note">Âm lượng các bài đã được chuẩn hóa (loudnorm) lúc import nên nghe đều nhau.</p>
    </section>
    <section>
      <h3>Phím tắt</h3>
      <dl><template v-for="[k, v] in shortcuts" :key="k"><dt>{{ v }}</dt><dd><kbd>{{ k }}</kbd></dd></template></dl>
    </section>
    <section v-if="auth.token && auth.token !== 'open'">
      <button class="btn btn-outline" @click="logout">Đăng xuất</button>
    </section>
  </Modal>
</template>

<style scoped>
section { margin-bottom: 24px; }
h3 { font-size: 16px; margin-bottom: 12px; }
.row { display: flex; align-items: center; gap: 12px; }
.row small { display: block; }
.row.slider { margin-top: 12px; }
.row.slider span { width: 56px; font-size: 12px; }
.note { font-size: 12px; margin: 12px 0 0; }
dl { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; margin: 0; }
dt { color: var(--text-2); }
dd { margin: 0; }
kbd { font: 600 12px var(--font); padding: 2px 8px; border-radius: 4px; background: var(--surface-4); }
</style>
