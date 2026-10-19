// Mỗi trang khai báo màu / tiêu đề / nút Play để Topbar dùng khi cuộn
import { watchEffect, onBeforeUnmount } from 'vue';
import { useUi } from '../stores/ui.js';

export function usePage(fn) {
  const ui = useUi();
  watchEffect(() => { ui.page = { color: '', title: '', play: null, playing: false, ...fn() }; });
  onBeforeUnmount(() => { ui.page = { color: '', title: '', play: null, playing: false }; });
}
