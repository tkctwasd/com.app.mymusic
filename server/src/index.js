import express from 'express';
import compression from 'compression';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { Tracks, Playlists } from './db.js';
import { storage } from './storage.js';
import { preview, YT_RE, cleanTitle, singleVideoUrl } from './youtube.js';
import { addJob, listJobs, retryJob, clearFinished, subscribe, restoreJobs } from './jobs.js';
import { authEnabled, login, requireAuth, setSession, verify, bearer } from './auth.js';

const app = express();
app.set('trust proxy', 1); // sau proxy của Render: để biết kết nối là HTTPS (cookie Secure)
// Nén gzip/br cho JSON, HTML, JS, CSS. Không nén luồng SSE (sẽ bị giữ lại không gửi ngay).
app.use(compression({ filter: (req, res) => !String(res.getHeader('Content-Type') || '').includes('text/event-stream') && compression.filter(req, res) }));
// Body JSON 1MB; riêng khôi phục thư viện (/api/restore) cho phép lớn hơn (route tự parse)
app.use((req, res, next) => (req.path === '/api/restore' ? next() : express.json({ limit: '1mb' })(req, res, next)));
app.use('/media', express.static(storage.root)); // express.static hỗ trợ Range -> tua nhạc được

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(500).json({ error: e.message }));
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

// ---- Auth ----
app.get('/api/auth', (req, res) => res.json({ required: authEnabled }));
// Phiên bản giao diện = thời điểm build web/dist/index.html; client so sánh để tự tải lại khi có bản deploy mới
app.get('/api/version', (req, res) => {
  let v = 'dev';
  try { v = String(fs.statSync(path.resolve('../web/dist/index.html')).mtimeMs); } catch {}
  res.set('Cache-Control', 'no-store').json({ v });
});
// Giới hạn đăng nhập sai: 10 lần / 15 phút cho mỗi IP (chống dò mật khẩu)
const failures = new Map(); // ip -> [thời điểm sai]
const WINDOW = 15 * 60000, MAX_FAILS = 10;
app.post('/api/login', (req, res) => {
  const now = Date.now();
  const recent = (failures.get(req.ip) || []).filter((t) => now - t < WINDOW);
  if (recent.length >= MAX_FAILS) return res.status(429).json({ error: 'Nhập sai quá nhiều lần, thử lại sau 15 phút' });
  const token = login(req.body.password);
  if (!token) { failures.set(req.ip, [...recent, now]); return res.status(401).json({ error: 'Sai mật khẩu' }); }
  failures.delete(req.ip);
  setSession(req, res, token);
  res.json({ token });
});
// Gắn cookie phiên (httpOnly) từ token Bearer hiện có, dùng cho SSE vì EventSource không gửi được header
app.post('/api/session', (req, res) => {
  const token = bearer(req);
  if (!verify(token)) return res.status(401).json({ error: 'Chưa đăng nhập' });
  setSession(req, res, token);
  res.sendStatus(204);
});
app.use('/api', requireAuth);

// ---- Sao lưu / khôi phục thư viện (metadata; file nhạc nằm trên Cloudinary/local nên vẫn còn) ----
app.get('/api/backup', wrap(async (req, res) => {
  const data = { app: 'my-music', version: 1, exportedAt: Date.now(), tracks: await Tracks.all(), playlists: await Playlists.all() };
  res.set('Content-Disposition', `attachment; filename="my-music-backup-${new Date().toISOString().slice(0, 10)}.json"`).json(data);
}));
// Khôi phục: ghi đè/thêm theo id (không xóa bài hiện có)
app.post('/api/restore', express.json({ limit: '50mb' }), wrap(async (req, res) => {
  const { tracks = [], playlists = [] } = req.body || {};
  if (!Array.isArray(tracks) || !Array.isArray(playlists)) return res.status(400).json({ error: 'File sao lưu không hợp lệ' });
  let t = 0, p = 0;
  for (const x of tracks) if (x?.id && x.fileUrl) { await Tracks.upsert(x); t++; }
  for (const x of playlists) if (x?.id) { await Playlists.upsert(x); p++; }
  res.json({ tracks: t, playlists: p });
}));

// ---- Tracks ----
// Danh sách gọn: bỏ peaks (300 số) và lyrics (văn bản dài). Thay bằng cờ hasPeaks/hasLyrics,
// client tải chi tiết qua GET /api/tracks/:id khi thật sự cần (waveform, lời bài hát).
const slim = (t) => {
  const { peaks, lyrics, ...rest } = t;
  return { ...rest, hasPeaks: !!peaks?.length, hasLyrics: !!lyrics };
};
app.get('/api/tracks', wrap(async (req, res) => res.json((await Tracks.all()).map(slim))));
// Tìm trong lời bài hát (plain + synced): trả về bài và một đoạn lời có chứa từ khóa
app.get('/api/search/lyrics', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json([]);
  const hits = [];
  for (const t of await Tracks.all()) {
    const text = `${t.lyrics?.plain || ''}\n${(t.lyrics?.synced || '').replace(/\[[^\]]*\]/g, '')}`;
    const line = text.split('\n').find((l) => l.toLowerCase().includes(q));
    if (line) hits.push({ id: t.id, title: t.title, artist: t.artist, coverUrl: t.coverUrl, snippet: line.trim().slice(0, 160) });
    if (hits.length >= 30) break;
  }
  res.json(hits);
}));
app.get('/api/tracks/:id', wrap(async (req, res) => {
  const t = await Tracks.get(req.params.id);
  t ? res.json(t) : res.sendStatus(404);
}));

app.patch('/api/tracks/:id', wrap(async (req, res) => {
  const patch = pick(req.body, ['title', 'artist', 'album', 'coverUrl', 'liked', 'color', 'peaks']);
  // peaks: dạng sóng âm (tối đa 300 giá trị 0–1) do trình duyệt tính rồi gửi lên
  if ('peaks' in patch) {
    if (!Array.isArray(patch.peaks) || patch.peaks.length > 300) return res.status(400).json({ error: 'peaks không hợp lệ' });
    patch.peaks = patch.peaks.map((v) => Math.max(0, Math.min(1, Math.round((+v || 0) * 100) / 100)));
  }
  const t = await Tracks.update(req.params.id, patch);
  t ? res.json(t) : res.sendStatus(404);
}));

app.post('/api/tracks/:id/play', wrap(async (req, res) => {
  const t = await Tracks.get(req.params.id);
  if (!t) return res.sendStatus(404);
  // Lượt nghe theo giờ 'YYYY-MM-DD HH' (giờ máy người nghe), giữ 7 ngày gần nhất cho bảng xếp hạng
  const day = /^\d{4}-\d{2}-\d{2}( \d{2})?$/.test(req.body?.day) ? req.body.day : new Date().toISOString().slice(0, 13).replace('T', ' ');
  const plays = { ...(t.plays || {}), [day]: ((t.plays || {})[day] || 0) + 1 };
  const keep = Object.keys(plays).sort().slice(-168);
  res.json(await Tracks.update(t.id, { playCount: (t.playCount || 0) + 1, lastPlayedAt: Date.now(), plays: Object.fromEntries(keep.map((k) => [k, plays[k]])) }));
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
  res.json(items.map((i) => addJob({ url: singleVideoUrl(i.url), title: i.title, meta: pick(i, ['title', 'artist', 'album']), playlistId: req.body.playlistId })));
});
// Tải file nhạc lên trực tiếp (không cần YouTube): body = file thô, ?name=tên-file&playlistId=
app.post('/api/upload', express.raw({ type: () => true, limit: '200mb' }), (req, res) => {
  if (!req.body?.length) return res.status(400).json({ error: 'Thiếu file' });
  const name = path.basename(String(req.query.name || 'audio')).slice(0, 200);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'up-'));
  const file = path.join(dir, `src${path.extname(name).slice(0, 8)}`);
  fs.writeFileSync(file, req.body);
  res.json(addJob({ url: `file:${name}`, title: name, file, playlistId: req.query.playlistId || null }));
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
await restoreJobs(); // đưa lại các job dở dang trước khi nhận yêu cầu mới
app.listen(port, () => console.log(`Music app: http://localhost:${port}`));
