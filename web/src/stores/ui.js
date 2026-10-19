import { defineStore } from 'pinia';
import { load, save } from '../utils.js';

let toastId = 0;
const PREFS = ['theme', 'fixedColor', 'stageTab', 'shelfView', 'colAlbum', 'colAdded'];

export const useUi = defineStore('ui', {
  state: () => ({
    // Tùy chọn được ghi nhớ
    theme: 'dark', // 'dark' | 'light' | 'system'
    fixedColor: false, // true: không đổi màu theo ảnh bìa
    stageTab: 'lyrics', // 'lyrics' | 'queue' | 'info'
    shelfView: 'grid', // 'grid' | 'list'
    colAlbum: false, colAdded: false, // cột phụ trong danh sách bài
    ...load('ui.prefs', {}),

    stage: false, // Stage (màn hình đang phát) mở/đóng
    present: false, // chế độ trình chiếu
    cmd: null, // Command bar: { q } khi mở
    selection: [], // id bài đang chọn nhiều
    selPlaylist: null, // playlist chứa các bài đang chọn (để "Xóa khỏi playlist")
    toasts: [],
    menu: null, // { x, y, items: [{ label, icon, fn, children, danger }] }
    modal: null, // { name, props }
    jobsOpen: false,
    pulse: 0, // thời điểm nhấp nháy mục Kệ khi tải xong bài
    isMobile: window.matchMedia('(max-width: 767px)').matches,
    scrollY: 0,
    searchQ: '',
  }),
  actions: {
    savePrefs() { save('ui.prefs', Object.fromEntries(PREFS.map((k) => [k, this[k]]))); },
    set(k, v) { this[k] = v; this.savePrefs(); },
    toast(text, action) {
      const t = { id: ++toastId, text, action };
      this.toasts.push(t);
      setTimeout(() => this.dismiss(t.id), action ? 5000 : 3000);
    },
    dismiss(id) { this.toasts = this.toasts.filter((t) => t.id !== id); },
    openMenu(e, items) {
      e.preventDefault(); e.stopPropagation();
      const r = e.currentTarget?.getBoundingClientRect?.();
      const x = e.type === 'contextmenu' || !r ? e.clientX : r.right;
      const y = e.type === 'contextmenu' || !r ? e.clientY : r.bottom;
      this.menu = { x, y, items };
    },
    open(name, props = {}) { this.modal = { name, props }; },
    close() { this.modal = null; },
    openStage(tab) { if (tab) this.set('stageTab', tab); this.stage = true; },
    closeStage() { this.stage = false; this.present = false; },
    togglePresent() { this.present = !this.present; if (this.present) this.stage = true; },
    openCmd(q = '') { this.cmd = { q }; },
    clearSelection() { this.selection = []; this.selPlaylist = null; },
  },
});
