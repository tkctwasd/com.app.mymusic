// Hàng đợi import chạy tuần tự, theo dõi tiến độ, phát sự kiện qua SSE.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Tracks, Playlists } from './db.js';
import { storage } from './storage.js';
import { downloadAudio } from './youtube.js';
import { convertLocal } from './localaudio.js';

const jobs = new Map(); // id -> job
const clients = new Set(); // res của SSE
let running = false;

const publicJob = ({ id, url, title, status, progress, error, trackId, createdAt }) => ({ id, url, title, status, progress, error, trackId, createdAt });
const emit = (job) => { const msg = `data: ${JSON.stringify(publicJob(job))}\n\n`; for (const c of clients) c.write(msg); };

export function listJobs() { return [...jobs.values()].map(publicJob); }

export function addJob({ url, title = '', meta = {}, playlistId = null, file = null }) {
  const job = { id: crypto.randomUUID(), url, title: title || url, meta, playlistId, file, status: 'queued', progress: 0, createdAt: Date.now() };
  jobs.set(job.id, job);
  emit(job);
  pump();
  return publicJob(job);
}

export function retryJob(id) {
  const job = jobs.get(id);
  if (!job || job.status !== 'error') return null;
  Object.assign(job, { status: 'queued', progress: 0, error: undefined });
  emit(job); pump();
  return publicJob(job);
}

export function clearFinished() { for (const [id, j] of jobs) if (j.status === 'done' || j.status === 'error') jobs.delete(id); }

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
    Object.assign(job, { status: 'downloading' }); emit(job);
    let last = 0;
    const onProgress = (p) => { if (p - last >= 2) { last = p; job.progress = p; emit(job); } };
    // job.file: file người dùng tải lên (không qua YouTube) -> chỉ cần chuyển đổi
    const r = job.file ? await convertLocal(job.file, job.title, onProgress) : await downloadAudio(job.url, onProgress);
    try {
      Object.assign(job, { status: 'uploading', progress: 99 }); emit(job);
      const fileUrl = await storage.put(r.audioFile, `audio/${r.key}.mp3`);
      const coverUrl = r.coverFile ? await storage.put(r.coverFile, `cover/${r.key}.jpg`) : '';
      const m = job.meta || {};
      const track = await Tracks.create({
        title: m.title || r.title, artist: m.artist || r.artist, album: m.album ?? r.album, duration: r.duration,
        fileUrl, coverUrl, liked: false, playCount: 0, lastPlayedAt: 0, sourceUrl: job.file ? '' : job.url,
      });
      if (job.playlistId) {
        const p = await Playlists.get(job.playlistId);
        if (p) await Playlists.update(p.id, { trackIds: [...p.trackIds, track.id] });
      }
      Object.assign(job, { status: 'done', progress: 100, trackId: track.id, title: track.title }); emit(job);
    } finally {
      fs.rmSync(r.dir, { recursive: true, force: true });
    }
  } catch (e) {
    Object.assign(job, { status: 'error', error: e.message }); emit(job);
  }
  // File tải lên: xong (hoặc lỗi) thì xóa bản gốc; job lỗi không thử lại được nữa
  if (job.file && job.status === 'done') { fs.rmSync(path.dirname(job.file), { recursive: true, force: true }); job.file = null; }
  running = false;
  pump();
}
