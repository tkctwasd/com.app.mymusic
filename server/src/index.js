import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { Tracks, Playlists } from './db.js';
import { storage } from './storage.js';
import { preview, YT_RE, cleanTitle } from './youtube.js';
import { addJob, listJobs, retryJob, clearFinished, subscribe } from './jobs.js';
import { authEnabled, login, requireAuth } from './auth.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/media', express.static(storage.root)); // express.static hỗ trợ Range -> tua nhạc được

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(500).json({ error: e.message }));
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

// ---- Auth ----
app.get('/api/auth', (req, res) => res.json({ required: authEnabled }));
app.post('/api/login', (req, res) => {
  const token = login(req.body.password);
  token ? res.json({ token }) : res.status(401).json({ error: 'Sai mật khẩu' });
});
app.use('/api', requireAuth);

// ---- Tracks ----
app.get('/api/tracks', wrap(async (req, res) => res.json(await Tracks.all())));

app.patch('/api/tracks/:id', wrap(async (req, res) => {
  const t = await Tracks.update(req.params.id, pick(req.body, ['title', 'artist', 'album', 'coverUrl', 'liked', 'color']));
  t ? res.json(t) : res.sendStatus(404);
}));

app.post('/api/tracks/:id/play', wrap(async (req, res) => {
  const t = await Tracks.get(req.params.id);
  if (!t) return res.sendStatus(404);
  res.json(await Tracks.update(t.id, { playCount: (t.playCount || 0) + 1, lastPlayedAt: Date.now() }));
}));

// Upload ảnh bìa: body là file ảnh thô (Content-Type: image/*)
app.post('/api/tracks/:id/cover', express.raw({ type: 'image/*', limit: '8mb' }), wrap(async (req, res) => {
  const t = await Tracks.get(req.params.id);
  if (!t) return res.sendStatus(404);
  if (!req.body?.length) return res.status(400).json({ error: 'Thiếu ảnh' });
  const tmp = path.join(os.tmpdir(), `cover-${crypto.randomUUID()}`);
  fs.writeFileSync(tmp, req.body);
  try {
    const coverUrl = await storage.put(tmp, `cover/${crypto.randomUUID()}.jpg`);
    await storage.remove(t.coverUrl);
    res.json(await Tracks.update(t.id, { coverUrl, color: '' }));
  } finally { fs.rmSync(tmp, { force: true }); }
}));

app.delete('/api/tracks/:id', wrap(async (req, res) => {
  const t = await Tracks.remove(req.params.id);
  if (!t) return res.sendStatus(404);
  await storage.remove(t.fileUrl);
  await storage.remove(t.coverUrl);
  await Playlists.pullFromAll('trackIds', t.id);
  res.sendStatus(204);
}));

// Lời bài hát từ LRCLIB (miễn phí), cache vào track
app.get('/api/tracks/:id/lyrics', wrap(async (req, res) => {
  const t = await Tracks.get(req.params.id);
  if (!t) return res.sendStatus(404);
  if (t.lyrics && !req.query.refresh) return res.json(t.lyrics); // chỉ cache khi đã tìm thấy
  const search = async (params) => {
    const r = await fetch(`https://lrclib.net/api/search?${new URLSearchParams(params)}`, { headers: { 'User-Agent': 'my-music/1.0' } }).catch(() => null);
    return r?.ok ? r.json() : [];
  };
  // Thử: tên + ca sĩ -> từng vế của "A - B" / "A | B" -> tìm tự do
  const title = cleanTitle(t.title);
  const pieces = title.split(/\s[-–|]\s/).map((s) => s.trim()).filter(Boolean);
  let list = await search({ track_name: title, artist_name: t.artist });
  for (const p of pieces) { if (list.length) break; list = await search({ track_name: p }); }
  if (!list.length) list = await search({ q: title });
  const best = list.sort((a, b) => !!b.syncedLyrics - !!a.syncedLyrics || Math.abs(a.duration - t.duration) - Math.abs(b.duration - t.duration))[0];
  const lyrics = best ? { synced: best.syncedLyrics || '', plain: best.plainLyrics || '' } : null;
  await Tracks.update(t.id, { lyrics });
  res.json(lyrics);
}));

// ---- Import YouTube ----
app.get('/api/youtube/preview', wrap(async (req, res) => {
  if (!YT_RE.test(req.query.url || '')) return res.status(400).json({ error: 'URL YouTube không hợp lệ' });
  res.json(await preview(req.query.url));
}));

// body: { items: [{ url, title?, artist?, album? }], playlistId? }  (hoặc { url })
app.post('/api/import', (req, res) => {
  const items = req.body.items || [{ url: req.body.url }];
  if (!items.length || items.some((i) => !YT_RE.test(i.url || ''))) return res.status(400).json({ error: 'URL YouTube không hợp lệ' });
  res.json(items.map((i) => addJob({ url: i.url, title: i.title, meta: pick(i, ['title', 'artist', 'album']), playlistId: req.body.playlistId })));
});
app.get('/api/import/jobs', (req, res) => res.json(listJobs()));
app.get('/api/import/events', (req, res) => subscribe(res));
app.post('/api/import/jobs/:id/retry', (req, res) => { const j = retryJob(req.params.id); j ? res.json(j) : res.sendStatus(404); });
app.delete('/api/import/jobs', (req, res) => { clearFinished(); res.sendStatus(204); });

// ---- Playlists ----
app.get('/api/playlists', wrap(async (req, res) => res.json(await Playlists.all())));
app.post('/api/playlists', wrap(async (req, res) => res.json(await Playlists.create({
  name: req.body.name || 'Playlist mới', description: '', coverUrl: '', pinned: false, trackIds: req.body.trackIds || [],
}))));
app.patch('/api/playlists/:id', wrap(async (req, res) => {
  const p = await Playlists.update(req.params.id, pick(req.body, ['name', 'description', 'coverUrl', 'pinned', 'trackIds']));
  p ? res.json(p) : res.sendStatus(404);
}));
app.delete('/api/playlists/:id', wrap(async (req, res) => ((await Playlists.remove(req.params.id)) ? res.sendStatus(204) : res.sendStatus(404))));

// ---- Frontend (bản build Vite) + SPA fallback ----
const dist = path.resolve('../web/dist');
app.use(express.static(dist));
app.get(/^(?!\/(api|media)\/).*/, (req, res) => (fs.existsSync(dist) ? res.sendFile(path.join(dist, 'index.html')) : res.status(404).send('Chưa build frontend: cd web && npm run build')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Music app: http://localhost:${port}`));
