import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';

/**
 * One-password admin. The password lives only in the ADMIN_PASSWORD env var; the session is a signed,
 * expiring cookie (no database, no accounts). Changing the password signs everyone out.
 */
export const COOKIE = 'nourish_admin';
const SESSION_HOURS = 8;

const env = (k: string) => (import.meta.env[k] as string | undefined) ?? process.env[k];

export const adminConfigured = () => Boolean(env('ADMIN_PASSWORD'));

function key() {
  const secret = env('SESSION_SECRET') || createHmac('sha256', 'nourish-admin-session').update(env('ADMIN_PASSWORD') ?? '').digest('hex');
  return secret;
}

const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

function safeEqual(a: string, b: string) {
  // Hash first so different lengths don't leak through timingSafeEqual.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string) {
  const expected = env('ADMIN_PASSWORD');
  return Boolean(expected) && safeEqual(input, expected!);
}

export function issueSession(cookies: AstroCookies, secure: boolean) {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  const value = `${exp}.${sign(String(exp))}`;
  cookies.set(COOKIE, value, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: SESSION_HOURS * 3600 });
}

export function clearSession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: '/' });
}

export function hasSession(cookies: AstroCookies) {
  const raw = cookies.get(COOKIE)?.value;
  if (!raw || !adminConfigured()) return false;
  const [exp, sig] = raw.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

/** Best-effort brute-force brake (per serverless instance): lock an IP out after repeated failures. */
const attempts = new Map<string, { fails: number; lockedUntil: number }>();

export function loginLocked(ip: string) {
  const a = attempts.get(ip);
  return a && a.lockedUntil > Date.now() ? Math.ceil((a.lockedUntil - Date.now()) / 1000) : 0;
}

export function recordFailure(ip: string) {
  const a = attempts.get(ip) ?? { fails: 0, lockedUntil: 0 };
  a.fails++;
  if (a.fails >= 5) a.lockedUntil = Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (a.fails - 5));
  attempts.set(ip, a);
}

export const recordSuccess = (ip: string) => attempts.delete(ip);

/** Blocks cross-site POSTs (on top of SameSite=Strict). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return request.method === 'GET';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  return new URL(origin).host === host;
}
