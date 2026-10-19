// Các menu dùng chung: hẹn giờ tắt, menu playlist, menu "thêm vào playlist" cho nhiều bài
import { useRouter, useRoute } from 'vue-router';
import { usePlayer } from '../stores/player.js';
import { useLibrary } from '../stores/library.js';
import { useUi } from '../stores/ui.js';

export function useMenus() {
  const player = usePlayer(), lib = useLibrary(), ui = useUi(), router = useRouter(), route = useRoute();

  const sleepItems = () => [
    ...[5, 15, 30, 45, 60, 90].map((m) => ({ label: `${m} phút`, fn: () => { player.setSleep(m); ui.toast(`Sẽ dừng phát sau ${m} phút`); } })),
    { label: 'Hết bài này', fn: () => { player.setSleep('end'); ui.toast('Sẽ dừng khi hết bài này'); } },
    player.sleep && { sep: true },
    player.sleep && { label: 'Tắt hẹn giờ', icon: 'x', fn: () => { player.setSleep(null); ui.toast('Đã tắt hẹn giờ'); } },
  ].filter(Boolean);

  const addToPlaylistItems = (ids, exclude) => [
    { label: 'Playlist mới', icon: 'plus', fn: async () => { const p = await lib.createPlaylist('', ids); router.push(`/playlist/${p.id}`); } },
    { sep: true },
    ...lib.playlists.filter((p) => p !== exclude).map((p) => ({ label: p.name, fn: () => lib.addToPlaylist(p, ids) })),
  ];

  const playlistMenu = (e, p) => {
    const path = `/playlist/${p.id}`;
    ui.openMenu(e, [
      { label: 'Phát', icon: 'play', fn: () => player.playTracks(lib.playlistTracks(p), 0, { name: p.name, path }) },
      { label: 'Thêm vào hàng đợi', icon: 'queue', fn: () => { player.addToQueue(p.trackIds); ui.toast('Đã thêm vào hàng đợi'); } },
      { label: p.pinned ? 'Bỏ ghim' : 'Ghim lên đầu Kệ', icon: 'pin', fn: () => lib.updatePlaylist(p, { pinned: !p.pinned }) },
      { label: 'Sửa thông tin chi tiết', icon: 'edit', fn: () => ui.open('editPlaylist', { playlist: p }) },
      { label: 'Thêm nhạc từ YouTube', icon: 'youtube', fn: () => ui.open('import', { playlistId: p.id }) },
      { sep: true },
      { label: 'Xóa playlist', icon: 'trash', danger: true, fn: async () => { if (confirm(`Xóa "${p.name}"?`)) { await lib.deletePlaylist(p); if (route.path === path) router.push('/shelf'); } } },
    ]);
  };

  return { sleepItems, addToPlaylistItems, playlistMenu };
}
