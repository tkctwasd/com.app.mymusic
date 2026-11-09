// Nghe offline: bài đã tải được lưu trong Cache Storage của trình duyệt (cache tên my-music-audio).
// Khi phát, bài đã tải dùng blob URL từ cache, nên chạy được cả khi mất mạng.
// Không cache toàn bộ thư viện: chỉ những bài người dùng chủ động tải về.
import { reactive, computed } from 'vue';

const CACHE = 'my-music-audio';
export const offline = reactive({ ids: [], blobs: {} }); // ids: bài đã tải; blobs: id -> blob URL (tạo khi cần)
const abs = (u) => new URL(u, location.href).href;
const hasCache = () => typeof caches !== 'undefined';

// Set để tra cứu O(1) (danh sách dài gọi isOffline cho từng dòng)
const idSet = computed(() => new Set(offline.ids));
export const isOffline = (id) => idSet.value.has(id);

// Nguồn phát: blob (bản đã tải) nếu có, không thì tải từ mạng
export const srcFor = (t) => offline.blobs[t.id] || t.fileUrl;

// Tạo blob URL từ bản đã tải (chỉ làm khi thật sự cần: lúc mất mạng hoặc khi lỗi tải)
export async function ensureBlob(t) {
  if (offline.blobs[t.id]) return offline.blobs[t.id];
  if (!hasCache()) return null;
  try {
    const r = await (await caches.open(CACHE)).match(abs(t.fileUrl));
    if (!r) return null;
    return (offline.blobs[t.id] = URL.createObjectURL(await r.blob()));
  } catch { return null; }
}

// Đồng bộ danh sách bài đã tải với cache (không tạo blob)
export async function refreshOffline(tracks) {
  if (!hasCache()) return;
  try {
    const keys = new Set((await (await caches.open(CACHE)).keys()).map((r) => r.url));
    offline.ids = tracks.filter((t) => keys.has(abs(t.fileUrl))).map((t) => t.id);
  } catch { /* không có quyền cache: bỏ qua */ }
}

export async function downloadTrack(t) {
  if (!hasCache()) throw new Error('Trình duyệt này không hỗ trợ nghe offline');
  const res = await fetch(abs(t.fileUrl));
  if (!res.ok) throw new Error(`Không tải được (${res.status})`);
  await (await caches.open(CACHE)).put(abs(t.fileUrl), res);
  if (!isOffline(t.id)) offline.ids.push(t.id);
}

export async function removeTrack(t) {
  if (hasCache()) await (await caches.open(CACHE)).delete(abs(t.fileUrl));
  if (offline.blobs[t.id]) { URL.revokeObjectURL(offline.blobs[t.id]); delete offline.blobs[t.id]; }
  offline.ids = offline.ids.filter((id) => id !== t.id);
}

// Dung lượng đã dùng của toàn app (ước tính, byte)
export async function usageBytes() {
  try { return (await navigator.storage?.estimate())?.usage || 0; } catch { return 0; }
}
