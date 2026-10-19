// yt-dlp + ffmpeg: xem trước metadata, tải audio -> mp3 320kbps (chuẩn hóa âm lượng) + ảnh bìa jpg.
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const YT_RE = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//;

const run = (args) => new Promise((resolve, reject) =>
  execFile('yt-dlp', args, { maxBuffer: 1 << 28 }, (err, out, errOut) => (err ? reject(new Error(lastLine(errOut) || err.message)) : resolve(out))));
const lastLine = (s = '') => s.trim().split('\n').filter((l) => l.includes('ERROR')).pop() || s.trim().split('\n').pop();
// Bỏ phần rác trong tiêu đề YouTube: ♪, (Official MV), [Lyrics/Vietsub], | Lyrics ...
const JUNK = /official|lyrics?|vietsub|engsub|karaoke|\bm\/?v\b|\baudio\b|\bvideo\b|visuali[sz]er|\bhd\b|\b4k\b|1080p/i;
export function cleanTitle(s = '') {
  s = s.replace(/[♩-♯]|\u{1F3B5}|\u{1F3B6}/gu, '')
    .replace(/[([【「][^)\]】」]*[)\]】」]/g, (m) => (JUNK.test(m) ? '' : m));
  const parts = s.split(/[|｜]/).filter((p) => p.trim() && !JUNK.test(p));
  return (parts.join(' | ') || s).replace(/\s+/g, ' ').replace(/^[\s\-|]+|[\s\-|]+$/g, '').trim();
}

const bestThumb = (e) => e.thumbnail || e.thumbnails?.at(-1)?.url || '';

// Trả về { type: 'video', item } hoặc { type: 'playlist', title, items[] }
export async function preview(url) {
  const j = JSON.parse(await run([url, '-J', '--flat-playlist', '--no-warnings']));
  const map = (e) => ({
    url: e.webpage_url || e.url || `https://www.youtube.com/watch?v=${e.id}`,
    title: e.track || cleanTitle(e.title), artist: e.artist || e.uploader || e.channel || '',
    duration: Math.round(e.duration || 0), thumbnail: bestThumb(e),
  });
  if (j._type === 'playlist') return { type: 'playlist', title: j.title, items: (j.entries || []).filter((e) => e.duration !== null).map(map) };
  return { type: 'video', item: map(j) };
}

// onProgress(percent 0-100)
export function downloadAudio(url, onProgress = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
  const key = crypto.randomUUID();
  const args = [
    url, '--no-playlist', '--no-warnings', '--newline', '-x', '--audio-format', 'mp3', '--audio-quality', '320K',
    '--postprocessor-args', 'ExtractAudio:-af loudnorm=I=-14:TP=-1.5:LRA=11',
    '--write-thumbnail', '--convert-thumbnails', 'jpg',
    '--progress-template', 'download:PROG %(progress._percent_str)s',
    '-o', path.join(dir, `${key}.%(ext)s`),
    '--print', 'after_move:META %(.{title,uploader,artist,track,album,duration})j',
  ];
  return new Promise((resolve, reject) => {
    const p = spawn('yt-dlp', args);
    let meta, err = '';
    p.stdout.on('data', (buf) => {
      for (const line of buf.toString().split('\n')) {
        if (line.startsWith('PROG')) onProgress(Math.min(99, parseFloat(line.slice(5)) || 0));
        else if (line.startsWith('META ')) meta = JSON.parse(line.slice(5));
      }
    });
    p.stderr.on('data', (b) => { err += b; });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code || !meta) { fs.rmSync(dir, { recursive: true, force: true }); return reject(new Error(lastLine(err) || 'yt-dlp lỗi')); }
      const cover = path.join(dir, `${key}.jpg`);
      resolve({
        dir, key,
        audioFile: path.join(dir, `${key}.mp3`),
        coverFile: fs.existsSync(cover) ? cover : null,
        title: meta.track || cleanTitle(meta.title),
        artist: meta.artist || meta.uploader || 'Unknown',
        album: meta.album || '',
        duration: Math.round(meta.duration || 0),
      });
    });
  });
}
