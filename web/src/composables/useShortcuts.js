// Phím tắt toàn cục (bỏ qua khi đang gõ trong input)
import { onMounted, onBeforeUnmount } from 'vue';
import { usePlayer } from '../stores/player.js';
import { useLibrary } from '../stores/library.js';
import { useUi } from '../stores/ui.js';

export function useShortcuts() {
  const player = usePlayer(), lib = useLibrary(), ui = useUi();

  const onKey = (e) => {
    const tag = e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return ui.cmd ? (ui.cmd = null) : ui.openCmd(); }
    if (e.key === 'Escape') {
      if (ui.menu) ui.menu = null;
      else if (ui.modal) ui.close();
      else if (ui.cmd) ui.cmd = null;
      else if (ui.present) ui.present = false;
      else if (ui.stage) ui.closeStage();
      else if (ui.selection.length) ui.clearSelection();
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey || ui.cmd || ui.modal) return;
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
      f: () => ui.togglePresent(),
      q: () => (ui.stage && ui.stageTab === 'queue' ? ui.closeStage() : ui.openStage('queue')),
      y: () => (ui.stage && ui.stageTab === 'lyrics' ? ui.closeStage() : ui.openStage('lyrics')),
      '/': () => ui.openCmd(),
      '>': () => ui.openCmd('>'),
    }[k.length === 1 ? k.toLowerCase() : k];
    if (act) { e.preventDefault(); act(); }
  };

  onMounted(() => window.addEventListener('keydown', onKey));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
}
