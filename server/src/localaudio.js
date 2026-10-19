// Chuyển file nhạc người dùng tải lên -> mp3 320k chuẩn hóa âm lượng + tách ảnh bìa nhúng + đọc tag.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { cleanTitle } from './youtube.js';

const run = (cmd, args) => new Promise((resolve, reject) =>
  execFile(cmd, args, { maxBuffer: 1 << 24 }, (err, out, errOut) => (err ? reject(new Error(String(errOut).trim().split('\n').pop() || err.message)) : resolve(out))));

// file: đường dẫn file gốc (đã nằm trong dir riêng), name: tên file gốc để làm tiêu đề dự phòng
export async function convertLocal(file, name, onProgress = () => {}) {
  const dir = path.dirname(file);
  const key = crypto.randomUUID();
  const info = JSON.parse(await run('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file]));
  const tags = Object.fromEntries(Object.entries(info.format?.tags || {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (!info.streams?.some((s) => s.codec_type === 'audio')) throw new Error('File không có âm thanh');
  onProgress(20);
  const audioFile = path.join(dir, `${key}.mp3`);
  await run('ffmpeg', ['-y', '-i', file, '-map', '0:a:0', '-vn', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '320k', audioFile]);
  onProgress(85);
  // Ảnh bìa nhúng (mp3 APIC / m4a covr) hoặc khung hình đầu nếu là video
  const coverFile = path.join(dir, `${key}.jpg`);
  await run('ffmpeg', ['-y', '-i', file, '-map', '0:v:0', '-frames:v', '1', '-vf', 'scale=720:-2', coverFile]).catch(() => {});
  const base = name.replace(/\.[^.]+$/, '');
  const [, a, t] = base.match(/^(.+?)\s+-\s+(.+)$/) || [];
  return {
    dir, key, audioFile,
    coverFile: fs.existsSync(coverFile) ? coverFile : null,
    title: tags.title || cleanTitle(t || base),
    artist: tags.artist || tags.album_artist || a || 'Unknown',
    album: tags.album || '',
    duration: Math.round(parseFloat(info.format?.duration) || 0),
  };
}
