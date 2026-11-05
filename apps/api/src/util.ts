import { createHash, randomBytes, randomInt } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { HttpException } from '@nestjs/common';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const uid = (prefix: string) => prefix + randomBytes(8).toString('hex');
export const otpCode = () => String(randomInt(100000, 1000000));

export const hashPassword = (pw: string) => argonHash(pw);
export const checkPassword = (stored: string | null | undefined, pw: string) =>
  stored ? argonVerify(stored, pw).catch(() => false) : Promise.resolve(false);

/** Fails a request with a message the app can show the person as it is. */
export const fail = (message: string, status = 400, extra: Record<string, unknown> = {}): never => {
  throw new HttpException({ error: message, ...extra }, status);
};

const pad = (n: number) => String(n).padStart(2, '0');
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const nowT = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const fmt = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(Math.round(+n || 0)).toLocaleString('en-IN')}`;
export const dfmt = (d?: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const tfmt = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const H = +h;
  return `${H % 12 || 12}:${m} ${H < 12 ? 'AM' : 'PM'}`;
};

export const normMob = (v: unknown) => {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
};
export const mobOk = (m: unknown) => /^[6-9]\d{9}$/.test(String(m ?? ''));
export const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e);
export const pwOk = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
export const PW_RULE = 'Use 8 or more characters with letters and numbers';
export const maskMob = (m?: string) => {
  const d = String(m ?? '').replace(/\D/g, '').slice(-10);
  return d.length < 10 ? d : `${d.slice(0, 3)}** **${d.slice(-3)}`;
};

/** The first and last two characters, which the agreed "password hint" shows. */
export const pwHintFields = (pw: string) => ({
  pwHint: `${pw.slice(0, 2)}\u0001${pw.slice(-2)}`,
  pwLen: pw.length,
  pwAt: Date.now(),
});
