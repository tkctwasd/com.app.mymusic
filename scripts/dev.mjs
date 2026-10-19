// npm run dev: chạy cùng lúc server (node --watch, tự khởi động lại khi sửa code) và web (Vite, hot reload).
// Mở http://localhost:5173. Ctrl+C dừng cả hai.
import { spawn } from 'node:child_process';

const procs = [
  ['server', '\x1b[36m', 'server'],
  ['web', '\x1b[35m', 'web'],
].map(([name, color, cwd]) => {
  const p = spawn('npm run dev', { cwd, shell: true });
  const out = (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach((l) => console.log(`${color}[${name}]\x1b[0m ${l}`));
  p.stdout.on('data', out);
  p.stderr.on('data', out);
  p.on('exit', (code) => { console.log(`[${name}] đã dừng (${code})`); stopAll(); });
  return p;
});

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (p.exitCode === null) p.kill();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', stopAll);
