<script setup>
import Modal from '../ui/Modal.vue';
import Slider from '../ui/Slider.vue';
import Icon from '../ui/Icon.vue';
import { usePlayer } from '../../stores/player.js';
import { useUi } from '../../stores/ui.js';
import { auth } from '../../api.js';

const player = usePlayer(), ui = useUi();
const logout = () => { auth.token = ''; location.reload(); };
const themes = [['light', 'Sáng', 'sun'], ['dark', 'Tối', 'moon'], ['system', 'Theo hệ thống', 'monitor']];
const shortcuts = [
  ['Ctrl + K  hoặc  /', 'Mở Command bar'], ['>', 'Gõ lệnh'], ['Ctrl + V', 'Dán link YouTube để tải'],
  ['Space', 'Phát / Tạm dừng'], ['← / →', 'Tua 5 giây'], ['Shift + ← / →', 'Bài trước / sau'],
  ['↑ / ↓', 'Âm lượng'], ['M', 'Tắt tiếng'], ['L', 'Thích bài đang phát'], ['S', 'Trộn bài'], ['R', 'Lặp lại'],
  ['Q', 'Hàng đợi'], ['Y', 'Lời bài hát'], ['F', 'Trình chiếu'], ['Ctrl / Shift + bấm', 'Chọn nhiều bài'], ['Esc', 'Đóng'],
];
</script>

<template>
  <Modal title="Cài đặt" @close="ui.close()">
    <section>
      <h3>Giao diện</h3>
      <div class="seg themes">
        <button v-for="[k, l, i] in themes" :key="k" :class="{ on: ui.theme === k }" @click="ui.set('theme', k)"><Icon :name="i" size="16" /> {{ l }}</button>
      </div>
      <button class="row" @click="ui.set('fixedColor', !ui.fixedColor)">
        <div><b>Đổi màu theo ảnh bìa</b><small class="muted">Cả ứng dụng chuyển màu nhẹ nhàng theo bài đang nghe</small></div>
        <span class="toggle" :class="{ on: !ui.fixedColor }" />
      </button>
      <button class="row" @click="ui.set('colAlbum', !ui.colAlbum)">
        <div><b>Hiện cột Album</b><small class="muted">Trong danh sách bài hát (mặc định chỉ hiện khi rê chuột)</small></div>
        <span class="toggle" :class="{ on: ui.colAlbum }" />
      </button>
      <button class="row" @click="ui.set('colAdded', !ui.colAdded)">
        <div><b>Hiện cột Ngày thêm</b></div>
        <span class="toggle" :class="{ on: ui.colAdded }" />
      </button>
    </section>
    <section>
      <h3>Phát lại</h3>
      <div class="row static">
        <div><b>Chuyển bài mượt (Crossfade)</b><small class="muted">Các bài hòa vào nhau khi chuyển</small></div>
      </div>
      <div class="slider">
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
      <button class="btn btn-outline" @click="logout"><Icon name="logout" size="16" /> Đăng xuất</button>
    </section>
  </Modal>
</template>

<style scoped>
section { margin-bottom: 28px; }
h3 { font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); margin-bottom: 12px; }
.themes { display: flex; margin-bottom: 8px; }
.themes button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; padding: 10px 0; text-align: left; }
.row small { display: block; font-size: 12.5px; }
.row b { font-weight: 500; }
.slider { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.slider span { width: 56px; font-size: 12px; }
.note { font-size: 12px; margin: 12px 0 0; }
dl { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; margin: 0; font-size: 13.5px; }
dt { color: var(--text-2); }
dd { margin: 0; }
</style>
