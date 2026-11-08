// Hàng đợi import chạy tuần tự, theo dõi tiến độ, phát sự kiện qua SSE.
// Trạng thái job được lưu vào DB (collection jobs) ở các lần đổi trạng thái, không lưu từng % tiến độ.
// Khi server khởi động lại: job URL đang dở được xếp lại hàng đợi; job file tải lên mà file tạm đã mất thì báo lỗi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Tracks, Playlists, Jobs } from './db.js';
import { storage } from './storage.js';
import { downloadAudio } from './youtube.js';
import { convertLocal } from './localaudio.js';

const jobs = new Map(); // id -> job
const clients = new Set(); // res của SSE
let running = false;

const publicJob = ({ id, url, title, status, progress, error, trackId, createdAt }) => ({ id, url, title, status, progress, error, trackId, createdAt });
const emit = (job) => { const msg = `data: ${JSON.stringify(publicJob(job))}\n\n`; for (const c of clients) c.write(msg); };

// Ghi trạng thái job xuống DB (lỗi ghi chỉ log, không làm hỏng hàng đợi)
function persist(job) {
  const doc = JSON.parse(JSON.stringify({
    id: job.id, url: job.url, title: job.title, meta: job.meta, playlistId: job.playlistId, file: job.file,
    status: job.status, progress: job.progress, error: job.error, trackId: job.trackId, createdAt: job.createdAt,
  }));
  Jobs.upsert(doc).catch((e) => console.error('Không lưu được job:', e.message));
}
// Đổi trạng thái + phát sự kiện + lưu DB
function setStatus(job, patch) { Object.assign(job, patch); emit(job); persist(job); }

// Đọc lại các job từ DB khi khởi động (gọi trước khi mở cổng)
export async function restoreJobs() {
  for (const saved of await Jobs.all()) {
    const job = { ...saved, meta: saved.meta || {}, file: saved.file || null };
    if (['queued', 'downloading', 'uploading'].includes(job.status)) {
      if (job.file && !fs.existsSync(job.file)) {
        Object.assign(job, { status: 'error', error: 'Server đã khởi động lại và file tải lên đã mất. Hãy tải lại file.' });
      } else {
        Object.assign(job, { status: 'queued', progress: 0 });
      }
      persist(job);
    }
    jobs.set(job.id, job);
  }
  pump();
}

export function listJobs() { return [...jobs.values()].map(publicJob); }

export function addJob({ url, title = '', meta = {}, playlistId = null, file = null }) {
  const job = { id: crypto.randomUUID(), url, title: title || url, meta, playlistId, file, status: 'queued', progress: 0, createdAt: Date.now() };
  jobs.set(job.id, job);
  emit(job); persist(job);
  pump();
  return publicJob(job);
}

export function retryJob(id) {
  const job = jobs.get(id);
  if (!job || job.status !== 'error') return null;
  if (job.file && !fs.existsSync(job.file)) return null; // file tải lên đã mất thì không thử lại được
  Object.assign(job, { status: 'queued', progress: 0, error: undefined });
  emit(job); persist(job); pump();
  return publicJob(job);
}

export function clearFinished() {
  for (const [id, j] of jobs) {
    if (j.status === 'done' || j.status === 'error') { jobs.delete(id); Jobs.remove(id).catch(() => {}); }
  }
}

export function subscribe(res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(': ok\n\n');
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  res.on('close', () => { clearInterval(ping); clients.delete(res); });
}

async function pump() {
  if (running) return;
  const job = [...jobs.values()].find((j) => j.status === 'queued');
  if (!job) return;
  running = true;
  try {
    setStatus(job, { status: 'downloading' });
    let last = 0;
    const onProgress = (p) => { if (p - last >= 2) { last = p; job.progress = p; emit(job); } };
    // job.file: file người dùng tải lên (không qua YouTube) -> chỉ cần chuyển đổi
    const r = job.file ? await convertLocal(job.file, job.title, onProgress) : await downloadAudio(job.url, onProgress);
    try {
      setStatus(job, { status: 'uploading', progress: 99 });
      const fileUrl = await storage.put(r.audioFile, `audio/${r.key}.mp3`);
      const coverUrl = r.coverFile ? await storage.put(r.coverFile, `cover/${r.key}.jpg`) : '';
      const m = job.meta || {};
      const track = await Tracks.create({
        title: m.title || r.title, artist: m.artist || r.artist, album: m.album ?? r.album, duration: r.duration,
        fileUrl, coverUrl, liked: false, playCount: 0, lastPlayedAt: 0, sourceUrl: job.file ? '' : job.url,
      });
      if (job.playlistId) {
        const p = await Playlists.get(job.playlistId);
        if (p && !p.trackIds.includes(track.id)) await Playlists.update(p.id, { trackIds: [...p.trackIds, track.id] });
      }
      setStatus(job, { status: 'done', progress: 100, trackId: track.id, title: track.title });
    } finally {
      fs.rmSync(r.dir, { recursive: true, force: true });
    }
  } catch (e) {
    setStatus(job, { status: 'error', error: e.message });
  }
  // File tải lên: xong (hoặc lỗi) thì xóa bản gốc; job lỗi không thử lại được nữa
  if (job.file && job.status === 'done') { fs.rmSync(path.dirname(job.file), { recursive: true, force: true }); job.file = null; persist(job); }
  running = false;
  pump();
}
