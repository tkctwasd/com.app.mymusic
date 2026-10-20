// Bỏ dấu tiếng Việt để tìm kiếm không dấu
export const fold = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

export const fmtTotal = (s) => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  if (s < 60) return `${Math.round(s)} giây`;
  return h ? `${h} giờ ${m} phút` : `${m} phút`;
};

export const fmtDate = (ts) => {
  const d = (Date.now() - ts) / 86400000;
  if (d < 1) return 'Hôm nay';
  if (d < 2) return 'Hôm qua';
  if (d < 30) return `${Math.floor(d)} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
};

// Ảnh Cloudinary: chèn transform resize để nhẹ băng thông
export const img = (url, size = 300) =>
  url?.includes('res.cloudinary.com') ? url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_auto,q_auto/`) : url || '';

export const shuffleArr = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Màu gradient dự phòng ổn định theo chuỗi
export const hashColor = (s = '') => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 35%)`;
};

export const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
export const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
// Khóa ngày theo giờ địa phương: 'YYYY-MM-DD'
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hourKey = (d = new Date()) => `${dayKey(d)} ${String(d.getHours()).padStart(2, '0')}`;
