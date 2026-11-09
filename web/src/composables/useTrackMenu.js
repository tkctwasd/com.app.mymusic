// Menu chuột phải / nút ⋯ của một bài hát
import { useRouter } from 'vue-router';
import { usePlayer } from '../stores/player.js';
import { useLibrary } from '../stores/library.js';
import { useUi } from '../stores/ui.js';
import { isOffline, downloadTrack, removeTrack } from '../offline.js';

// Tải (hoặc xóa) bản nghe offline cho một hoặc nhiều bài; báo lỗi/kết quả bằng toast
export async function toggleOffline(tracks) {
  const ui = useUi();
  // Tất cả đã tải -> xóa; còn thiếu -> tải những bài còn thiếu
  if (tracks.every((t) => isOffline(t.id))) { for (const t of tracks) await removeTrack(t); ui.toast(`Đã xóa ${tracks.length} bản nghe offline`); return; }
  const todo = tracks.filter((t) => !isOffline(t.id));
  let ok = 0, fail = 0;
  for (const t of todo) { try { await downloadTrack(t); ok++; } catch { fail++; } }
  ui.toast(fail ? `Tải được ${ok} bài, lỗi ${fail} bài (có thể do CORS hoặc mạng)` : `Đã tải ${ok} bài để nghe offline`);
}

// Radio: bắt đầu bằng bài đã chọn, tiếp theo là các bài cùng nghệ sĩ / album, rồi bài đã thích và hay nghe
// (mỗi nhóm xáo trộn), tối đa 50 bài. Không cần server: dựa hoàn toàn vào thư viện ở client.
export function playRadio(t) {
  const lib = useLibrary(), player = usePlayer();
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const seen = new Set([t.id]);
  const pick = (list) => shuffle(list.filter((x) => !seen.has(x.id))).map((x) => (seen.add(x.id), x));
  const same = pick(lib.tracks.filter((x) => x.artist === t.artist || (t.album && x.album === t.album)));
  const fav = pick(lib.tracks.filter((x) => x.liked || (x.playCount || 0) >= 3));
  const rest = pick([...lib.tracks]);
  // Xen kẽ: 2 bài cùng nghệ sĩ, 1 bài yêu thích... để không bị lặp một ca sĩ quá lâu
  const out = [t];
  while (out.length < 50 && (same.length || fav.length || rest.length)) {
    for (let k = 0; k < 2 && same.length; k++) out.push(same.shift());
    if (fav.length) out.push(fav.shift()); else if (rest.length) out.push(rest.shift());
    if (!same.length && !fav.length && rest.length) out.push(rest.shift());
  }
  player.playTracks(out.slice(0, 50), 0, { name: `Radio: ${t.title}`, path: '' });
  useUi().toast(`Đang phát radio từ "${t.title}"`);
}

export function useTrackMenu() {
  const player = usePlayer(), lib = useLibrary(), ui = useUi(), router = useRouter();

  return (e, t, { playlist } = {}) => ui.openMenu(e, [
    { label: 'Phát tiếp theo', icon: 'playNext', fn: () => { player.playNext(t.id); ui.toast('Sẽ phát tiếp theo'); } },
    { label: 'Thêm vào hàng đợi', icon: 'queue', fn: () => { player.addToQueue(t.id); ui.toast('Đã thêm vào hàng đợi'); } },
    { label: 'Phát radio từ bài này', icon: 'shuffle', fn: () => playRadio(t) },
    { sep: true },
    {
      label: 'Thêm vào playlist', icon: 'plus',
      children: [
        { label: 'Playlist mới', icon: 'plus', fn: async () => { const p = await lib.createPlaylist('', [t.id]); router.push(`/playlist/${p.id}`); } },
        { sep: true },
        ...lib.playlists.map((p) => ({ label: p.name, fn: () => lib.addToPlaylist(p, t.id) })),
      ],
    },
    playlist && { label: `Xóa khỏi ${playlist.name}`, icon: 'minus', fn: () => lib.removeFromPlaylist(playlist, t.id) },
    { label: t.liked ? 'Xóa khỏi Bài hát đã thích' : 'Lưu vào Bài hát đã thích', icon: t.liked ? 'heartFill' : 'heart', fn: () => lib.toggleLike(t) },
    { label: isOffline(t.id) ? 'Xóa bản nghe offline' : 'Tải để nghe offline', icon: 'download', fn: () => toggleOffline([t]) },
    { sep: true },
    { label: 'Đi tới nghệ sĩ', icon: 'artist', fn: () => router.push(`/artist/${encodeURIComponent(t.artist)}`) },
    t.album && { label: 'Đi tới album', icon: 'album', fn: () => router.push(`/album/${encodeURIComponent(t.artist)}/${encodeURIComponent(t.album)}`) },
    { label: 'Sửa thông tin', icon: 'edit', fn: () => ui.open('editTrack', { track: t }) },
    t.sourceUrl && { label: 'Mở trên YouTube', icon: 'external', fn: () => window.open(t.sourceUrl, '_blank', 'noopener') },
    { sep: true },
    { label: 'Xóa khỏi thư viện', icon: 'trash', danger: true, fn: () => lib.deleteTrack(t) },
  ].filter(Boolean));
}
