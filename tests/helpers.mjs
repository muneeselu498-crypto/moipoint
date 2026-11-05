import { createSign, generateKeyPairSync, randomUUID } from 'node:crypto';
import http from 'node:http';
export const BASE = process.env.BASE || 'http://localhost:4610';

/** One device: keeps its own login cookie, like a phone or laptop would. */
export class Device {
  cookie = '';
  async req(method, path, body, headers = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'content-type': 'application/json', 'x-moipoint': '1', ...(this.cookie ? { cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const pair = c.split(';')[0];
      this.cookie = pair.endsWith('=') ? '' : pair;
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  }
  get = (p) => this.req('GET', p);
  post = (p, b = {}) => this.req('POST', p, b);
  async login(email, password) {
    const r = await this.post('/api/auth/login', { email, password, remember: true });
    if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.text}`);
    this.state = r.json;
    return r.json;
  }
  /** Sends changes the way the app does. */
  push(upserts = [], deletes = [], extra = {}) {
    return this.post('/api/sync', { upserts, deletes, ...extra });
  }
  /** The server's verdict on a single change. */
  async pushOne(col, id, data) {
    const r = await this.push([{ col, id, data }]);
    return r.json?.results?.find((x) => x.col === col && x.id === id) ?? r.json;
  }
}

export const owner = async () => { const d = new Device(); await d.login('ramesh.kumar@gmail.com', 'admin123'); return d; };
export const manager = async () => { const d = new Device(); await d.login('divya.sankar@gmail.com', 'divya123'); return d; };
export const collector = async () => { const d = new Device(); await d.login('raj.moi@gmail.com', 'raj123'); return d; };
export const staff = async () => { const d = new Device(); await d.login('master@moipoint.in', 'master123'); return d; };

/** A date that is always ahead, so these tests keep working next year. */
export const FUTURE = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);

let n = 0;
export const uniq = (p = 'x') => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;
export const mobile = () => `9${String(Date.now() + n++).slice(-9)}`;

/** Creates a brand new customer through the real sign-up steps. */
export async function newCustomer(name = 'Test Family') {
  const d = new Device();
  const m = mobile();
  const otp = await d.post('/api/auth/signup/otp', { mobile: m });
  const v = await d.post('/api/auth/signup/verify', { mobile: m, code: otp.json.devCode });
  const email = `${uniq('cust')}@example.com`;
  const r = await d.post('/api/auth/signup', { mobile: m, ticket: v.json.ticket, name, email, password: 'Testpass123', kind: 'Family', state: 'Tamil Nadu', district: 'Madurai', city: 'Madurai', source: 'Friend referral', lang: 'ta' });
  if (r.status !== 200) throw new Error(`signup failed: ${r.text}`);
  d.state = r.json;
  d.email = email;
  d.mobile = m;
  d.accountId = r.json.state.users.find((u) => u.id === r.json.me).acc;
  return d;
}

export const moiRecord = (eventId, over = {}) => {
  const id = uniq('m');
  return { id, code: `EV000/${String(Math.floor(Math.random() * 900) + 100)}`, event_id: eventId, c: { name: 'Test Guest', mobile: '', place: 'Madurai', relationship: 'Friend' }, amount: 1001, mode: 'cash', status: 'received', date: '2026-11-04', time: '10:00', created_at: Date.now(), kind: 'cash', gift: null, est: 0, ...over };
};

/* ---------- a stand-in for Google, so Google sign-in can be tested without a real Google account ---------- */
// The server is pointed at FIREBASE_CERTS_URL, which this serves with a key made fresh for each test run.
// Tokens signed with it pass the same checks a real Firebase token does: signature, project, issuer, time and email.
export const FIREBASE_PROJECT = 'moipoint-test';
export const MASTER_EMAIL = 'muneeselu498@gmail.com';
const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = `test-${randomUUID()}`;
let keyServer = null;

/** Starts publishing this run's signing key. Safe to call more than once. */
export async function googleKeys() {
  if (keyServer) return;
  keyServer = http.createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'public, max-age=60');
    res.end(JSON.stringify({ keys: [{ ...google.publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }] }));
  });
  await new Promise((ok) => keyServer.listen(Number(process.env.FIREBASE_CERTS_PORT || 4614), '127.0.0.1', ok));
  keyServer.unref();
}

/** A Firebase ID token for this email, as Google would issue it. `over` changes any claim, to make a bad one. */
export function googleToken(email, over = {}, signWith = google.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const claims = {
    iss: `https://securetoken.google.com/${FIREBASE_PROJECT}`, aud: FIREBASE_PROJECT, auth_time: now, iat: now, exp: now + 3600,
    sub: `uid-${email}`, user_id: `uid-${email}`, email, email_verified: true, name: 'Google Person',
    firebase: { sign_in_provider: 'google.com', identities: { email: [email] } }, ...over,
  };
  const data = `${b64({ alg: 'RS256', kid: KID, typ: 'JWT' })}.${b64(claims)}`;
  return `${data}.${createSign('RSA-SHA256').update(data).sign(signWith).toString('base64url')}`;
}
export const otherKey = () => generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
