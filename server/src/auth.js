// Đăng nhập đơn giản: 1 mật khẩu (APP_PASSWORD). Không đặt -> không khóa (dùng local).
// Token = base64url(exp).hmac, ký bằng APP_SECRET (hoặc chính mật khẩu).
import crypto from 'node:crypto';

const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.APP_SECRET || PASSWORD;
const TTL = 30 * 24 * 3600 * 1000; // 30 ngày

const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const authEnabled = !!PASSWORD;

export function login(password) {
  if (!authEnabled) return 'open';
  if (!safeEq(sign(String(password || '')), sign(PASSWORD))) return null;
  const exp = String(Date.now() + TTL);
  return `${Buffer.from(exp).toString('base64url')}.${sign(exp)}`;
}

export function verify(token = '') {
  if (!authEnabled) return true;
  const [e, sig] = token.split('.');
  if (!e || !sig) return false;
  const exp = Buffer.from(e, 'base64url').toString();
  return safeEq(sig, sign(exp)) && +exp > Date.now();
}

export function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer /, '') || req.query.token;
  verify(token) ? next() : res.status(401).json({ error: 'Chưa đăng nhập' });
}
