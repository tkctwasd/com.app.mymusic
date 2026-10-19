// Tự tải lại khi có bản deploy mới (chỉ ở bản build; lúc dev đã có hot reload của Vite).
// Kiểm tra mỗi 2 phút và mỗi khi quay lại tab. Đang nghe nhạc thì không tự reload mà hiện toast "Tải lại".
import { usePlayer } from '../stores/player.js';
import { useUi } from '../stores/ui.js';

export function useAutoUpdate() {
  if (!import.meta.env.PROD) return;
  const player = usePlayer(), ui = useUi();
  let base = null, notified = false;

  async function check() {
    let v;
    try { v = (await (await fetch('/api/version', { cache: 'no-store' })).json()).v; } catch { return; }
    if (base === null) { base = v; return; }
    if (v === base || notified) return;
    if (!player.playing) { player.persist(); location.reload(); return; }
    notified = true;
    ui.toast('Đã có phiên bản mới của app', { label: 'Tải lại', fn: () => { player.persist(); location.reload(); } });
  }

  check();
  setInterval(check, 120000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
