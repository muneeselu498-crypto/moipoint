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
