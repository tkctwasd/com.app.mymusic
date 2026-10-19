import { defineStore } from 'pinia';
import { api } from '../api.js';
import { fold } from '../utils.js';
import { useUi } from './ui.js';

export const useLibrary = defineStore('library', {
  state: () => ({ tracks: [], playlists: [], loaded: false, jobs: [] }),
  getters: {
    byId: (s) => Object.fromEntries(s.tracks.map((t) => [t.id, t])),
    liked: (s) => s.tracks.filter((t) => t.liked),
    // Gom theo nghệ sĩ / album (tính ở client)
    artists(s) {
      const m = new Map();
      for (const t of s.tracks) {
        const k = t.artist || 'Unknown';
        if (!m.has(k)) m.set(k, { name: k, tracks: [], coverUrl: '', plays: 0 });
        const a = m.get(k);
        a.tracks.push(t); a.plays += t.playCount || 0;
        if (!a.coverUrl && t.coverUrl) a.coverUrl = t.coverUrl;
      }
      return [...m.values()].sort((a, b) => b.plays - a.plays || b.tracks.length - a.tracks.length);
    },
    albums(s) {
      const m = new Map();
      for (const t of s.tracks) {
        if (!t.album) continue;
        const k = `${t.artist}\u0000${t.album}`;
        if (!m.has(k)) m.set(k, { name: t.album, artist: t.artist, tracks: [], coverUrl: t.coverUrl, createdAt: t.createdAt });
        m.get(k).tracks.push(t);
      }
      return [...m.values()].sort((a, b) => b.createdAt - a.createdAt);
    },
    recent: (s) => s.tracks.filter((t) => t.lastPlayedAt).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt),
    playlistTracks() { return (p) => (p?.trackIds || []).map((id) => this.byId[id]).filter(Boolean); },
    activeJobs: (s) => s.jobs.filter((j) => j.status !== 'done' && j.status !== 'error'),
  },
  actions: {
    async load() {
      [this.tracks, this.playlists] = await Promise.all([api('/api/tracks'), api('/api/playlists')]);
      this.loaded = true;
    },
    playlist(id) { return this.playlists.find((p) => p.id === id); },

    search(q) {
      q = fold(q.trim());
      if (!q) return { tracks: [], artists: [], albums: [], playlists: [] };
      const has = (...xs) => xs.some((x) => fold(x || '').includes(q));
      const score = (s) => { s = fold(s || ''); return s === q ? 3 : s.startsWith(q) ? 2 : s.includes(q) ? 1 : 0; };
      return {
        tracks: this.tracks.filter((t) => has(t.title, t.artist, t.album)).sort((a, b) => score(b.title) - score(a.title) || (b.playCount || 0) - (a.playCount || 0)),
        artists: this.artists.filter((a) => has(a.name)).sort((a, b) => score(b.name) - score(a.name)),
        albums: this.albums.filter((a) => has(a.name, a.artist)),
        playlists: this.playlists.filter((p) => has(p.name, p.description)),
      };
    },

    // ---- Tracks ----
    async updateTrack(t, patch) { Object.assign(t, await api(`/api/tracks/${t.id}`, { method: 'PATCH', body: patch })); },
    async toggleLike(t) {
      const liked = !t.liked;
      t.liked = liked; // optimistic
      useUi().toast(liked ? 'Đã thêm vào Bài hát đã thích' : 'Đã xóa khỏi Bài hát đã thích');
      try { await api(`/api/tracks/${t.id}`, { method: 'PATCH', body: { liked } }); } catch (e) { t.liked = !liked; useUi().toast(e.message); }
    },
    async uploadCover(t, file) { Object.assign(t, await api(`/api/tracks/${t.id}/cover`, { method: 'POST', body: file, raw: true })); },
    markPlayed(t) {
      t.playCount = (t.playCount || 0) + 1; t.lastPlayedAt = Date.now();
      api(`/api/tracks/${t.id}/play`, { method: 'POST' }).catch(() => {});
    },
    // Xóa có Hoàn tác: chờ 5s mới gọi API thật
    deleteTrack(t) {
      const idx = this.tracks.indexOf(t);
      this.tracks.splice(idx, 1);
      const timer = setTimeout(async () => {
        await api(`/api/tracks/${t.id}`, { method: 'DELETE' }).catch((e) => useUi().toast(e.message));
        for (const p of this.playlists) p.trackIds = p.trackIds.filter((x) => x !== t.id);
      }, 5000);
      useUi().toast(`Đã xóa "${t.title}"`, { label: 'Hoàn tác', fn: () => { clearTimeout(timer); this.tracks.splice(idx, 0, t); } });
    },

    // Xóa nhiều bài (chọn nhiều), một nút Hoàn tác chung
    deleteTracks(ts) {
      const before = [...this.tracks];
      const ids = new Set(ts.map((t) => t.id));
      this.tracks = this.tracks.filter((t) => !ids.has(t.id));
      const timer = setTimeout(async () => {
        for (const id of ids) await api(`/api/tracks/${id}`, { method: 'DELETE' }).catch((e) => useUi().toast(e.message));
        for (const p of this.playlists) p.trackIds = p.trackIds.filter((x) => !ids.has(x));
      }, 5000);
      useUi().toast(`Đã xóa ${ids.size} bài`, { label: 'Hoàn tác', fn: () => { clearTimeout(timer); this.tracks = before; } });
    },

    // ---- Playlists ----
    async createPlaylist(name, trackIds = []) {
      const p = await api('/api/playlists', { method: 'POST', body: { name: name || `Playlist của tôi #${this.playlists.length + 1}`, trackIds } });
      this.playlists.unshift(p);
      return p;
    },
    async updatePlaylist(p, patch) { Object.assign(p, await api(`/api/playlists/${p.id}`, { method: 'PATCH', body: patch })); },
    async addToPlaylist(p, ids) {
      ids = [].concat(ids);
      const add = ids.filter((id) => !p.trackIds.includes(id));
      if (!add.length) return useUi().toast(`Đã có trong ${p.name}`);
      await this.updatePlaylist(p, { trackIds: [...p.trackIds, ...add] });
      useUi().toast(`Đã thêm vào ${p.name}`);
    },
    async removeFromPlaylist(p, ids) { ids = [].concat(ids); await this.updatePlaylist(p, { trackIds: p.trackIds.filter((x) => !ids.includes(x)) }); },
    async moveInPlaylist(p, from, to) {
      const ids = [...p.trackIds];
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      p.trackIds = ids;
      await this.updatePlaylist(p, { trackIds: ids });
    },
    async deletePlaylist(p) {
      await api(`/api/playlists/${p.id}`, { method: 'DELETE' });
      this.playlists = this.playlists.filter((x) => x.id !== p.id);
      useUi().toast(`Đã xóa ${p.name}`);
    },

    // ---- Import ----
    async startImport(items, playlistId) {
      const jobs = await api('/api/import', { method: 'POST', body: { items, playlistId } });
      for (const j of jobs) this.onJob(j);
      useUi().jobsOpen = true;
    },
    onJob(j) {
      const i = this.jobs.findIndex((x) => x.id === j.id);
      const prev = this.jobs[i];
      i < 0 ? this.jobs.unshift(j) : (this.jobs[i] = j);
      if (j.status === 'done' && prev?.status !== 'done') this.onImported(j);
    },
    async onImported(j) {
      const ui = useUi();
      await this.load();
      const t = this.byId[j.trackId];
      ui.pulse = Date.now();
      if (t) ui.toast(`Đã thêm "${t.title}" vào thư viện`, { label: 'Phát', fn: () => import('./player.js').then(({ usePlayer }) => usePlayer().playTracks([t], 0)) });
    },
    listenJobs(token) {
      api('/api/import/jobs').then((js) => { this.jobs = js.reverse(); }).catch(() => {});
      const es = new EventSource(`/api/import/events?token=${encodeURIComponent(token)}`);
      es.onmessage = (e) => this.onJob(JSON.parse(e.data));
      return es;
    },
    async retryJob(j) { this.onJob(await api(`/api/import/jobs/${j.id}/retry`, { method: 'POST' })); },
    async clearJobs() { await api('/api/import/jobs', { method: 'DELETE' }); this.jobs = this.activeJobs; },
  },
});
