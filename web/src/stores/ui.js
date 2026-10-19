import { defineStore } from 'pinia';
import { load, save } from '../utils.js';

let toastId = 0;

export const useUi = defineStore('ui', {
  state: () => ({
    rightPanel: load('ui.rightPanel', 'now'), // 'now' | 'queue' | 'lyrics' | null
    sidebarWidth: load('ui.sidebarWidth', 300),
    toasts: [],
    menu: null, // { x, y, items: [{ label, icon, fn, children, danger }] }
    modal: null, // { name, props }
    jobsOpen: false,
    fullscreen: false,
    fullPlayer: false, // mobile
    isMobile: window.matchMedia('(max-width: 767px)').matches,
    // Topbar đổi màu theo trang khi cuộn; header thu nhỏ tên + nút Play vào topbar
    page: { color: '', title: '', play: null, playing: false },
    scrollY: 0,
    searchQ: '',
  }),
  getters: { collapsed: (s) => s.sidebarWidth < 160 },
  actions: {
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
    togglePanel(p) { this.rightPanel = this.rightPanel === p ? null : p; save('ui.rightPanel', this.rightPanel); },
    setSidebarWidth(w) { this.sidebarWidth = Math.max(72, Math.min(420, w)); if (this.sidebarWidth < 160) this.sidebarWidth = 72; save('ui.sidebarWidth', this.sidebarWidth); },
  },
});
