// Gọi API backend, tự gắn token đăng nhập. 401 -> phát sự kiện để App hiện màn hình đăng nhập.
export const auth = {
  get token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } },
  set token(v) { try { v ? localStorage.setItem('token', v) : localStorage.removeItem('token'); } catch {} },
};

export async function api(url, { method = 'GET', body, raw } = {}) {
  const headers = { Authorization: `Bearer ${auth.token}` };
  if (body && !raw) headers['Content-Type'] = 'application/json';
  if (raw) headers['Content-Type'] = body.type || 'application/octet-stream';
  const r = await fetch(url, { method, headers, body: raw ? body : body && JSON.stringify(body) });
  if (r.status === 401 && !url.endsWith('/login')) window.dispatchEvent(new Event('unauthorized'));
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.status === 204 ? null : r.json();
}
