// Menu chuột phải / nút ⋯ của một bài hát
import { useRouter } from 'vue-router';
import { usePlayer } from '../stores/player.js';
import { useLibrary } from '../stores/library.js';
import { useUi } from '../stores/ui.js';

export function useTrackMenu() {
  const player = usePlayer(), lib = useLibrary(), ui = useUi(), router = useRouter();

  return (e, t, { playlist } = {}) => ui.openMenu(e, [
    { label: 'Phát tiếp theo', icon: 'playNext', fn: () => { player.playNext(t.id); ui.toast('Sẽ phát tiếp theo'); } },
    { label: 'Thêm vào hàng đợi', icon: 'queue', fn: () => { player.addToQueue(t.id); ui.toast('Đã thêm vào hàng đợi'); } },
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
    { sep: true },
    { label: 'Đi tới nghệ sĩ', icon: 'artist', fn: () => router.push(`/artist/${encodeURIComponent(t.artist)}`) },
    t.album && { label: 'Đi tới album', icon: 'album', fn: () => router.push(`/album/${encodeURIComponent(t.artist)}/${encodeURIComponent(t.album)}`) },
    { label: 'Sửa thông tin', icon: 'edit', fn: () => ui.open('editTrack', { track: t }) },
    t.sourceUrl && { label: 'Mở trên YouTube', icon: 'external', fn: () => window.open(t.sourceUrl, '_blank', 'noopener') },
    { sep: true },
    { label: 'Xóa khỏi thư viện', icon: 'trash', danger: true, fn: () => lib.deleteTrack(t) },
  ].filter(Boolean));
}
