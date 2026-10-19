// Phím tắt toàn cục (bỏ qua khi đang gõ trong input)
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayer } from '../stores/player.js';
import { useLibrary } from '../stores/library.js';
import { useUi } from '../stores/ui.js';

export function useShortcuts() {
  const player = usePlayer(), lib = useLibrary(), ui = useUi(), router = useRouter();

  const onKey = (e) => {
    const tag = e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return focusSearch(); }
    if (e.key === 'Escape') {
      if (ui.menu) ui.menu = null; else if (ui.modal) ui.close(); else if (ui.fullscreen) ui.fullscreen = false; else if (ui.fullPlayer) ui.fullPlayer = false;
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const act = {
      ' ': () => player.toggle(),
      ArrowRight: () => (e.shiftKey ? player.next() : player.skip(5)),
      ArrowLeft: () => (e.shiftKey ? player.prev() : player.skip(-5)),
      ArrowUp: () => player.setVolume(player.volume + 0.05),
      ArrowDown: () => player.setVolume(player.volume - 0.05),
      m: () => player.toggleMute(),
      l: () => player.track && lib.toggleLike(player.track),
      s: () => player.toggleShuffle(),
      r: () => player.cycleRepeat(),
      f: () => { ui.fullscreen = !ui.fullscreen; },
      q: () => ui.togglePanel('queue'),
      '/': () => focusSearch(),
    }[k.length === 1 ? k.toLowerCase() : k];
    if (act) { e.preventDefault(); act(); }
  };

  const focusSearch = async () => {
    if (router.currentRoute.value.name !== 'search') await router.push('/search');
    setTimeout(() => document.querySelector('#search-input')?.focus(), 30);
  };

  onMounted(() => window.addEventListener('keydown', onKey));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
}
