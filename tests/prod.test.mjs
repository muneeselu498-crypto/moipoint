// The same app with testing tools off, as it would run on a real server, connected to a stand-in provider.
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import http from 'node:http';
import { after, before, describe, test } from 'node:test';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';

const BASE = process.env.PROD_BASE;
const post = (path, body, cookie = '') =>
  fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-moipoint': '1', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

const run = promisify(execFile);
const SECRET = 'test-secret';
const db = new PrismaClient({ datasourceUrl: process.env.PROD_DATABASE_URL });

/** What the automation team's system receives. */
const received = [];
/** Numbers the stand-in provider refuses for a while: mobile -> how many more times. */
const outage = new Map();
const provider = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const m = JSON.parse(body);
    received.push({ secret: req.headers['x-moipoint-secret'], m });
    const left = outage.get(m.to) ?? 0;
    if (left > 0) {
      outage.set(m.to, left - 1);
      res.statusCode = 500;
      return res.end('{}');
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ref: `ref-${m.id}` }));
  });
});
before(() => new Promise((ok) => { provider.listen(Number(process.env.PROVIDER_PORT), '127.0.0.1', ok); }));
after(async () => { await db.$disconnect(); await new Promise((ok) => { provider.close(ok); }); });

const until = async (what, fn, ms = 8000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 200));
  }
};
const report = (body, secret = SECRET) =>
  fetch(`${BASE}/api/webhooks/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-moipoint-secret': secret }, body: JSON.stringify(body) });
const number = () => `9${String(Date.now() + Math.floor(Math.random() * 1000)).slice(-9)}`;

describe('connecting a provider, exactly as the automation report describes', () => {
  test('each message arrives as signed JSON with the fields in the report', async () => {
    const mobile = number();
    await post('/api/auth/signup/otp', { mobile });
    const { secret, m } = await until('the message', () => received.find((r) => r.m.to === mobile));
    assert.equal(secret, SECRET);
    assert.equal(m.trigger, 'M1');
    assert.equal(m.channel, 'SMS');
    assert.match(m.vars.otp, /^\d{6}$/);
    assert.ok(m.id && m.text.includes(m.vars.otp));
    const row = await until('the send to be recorded', async () => {
      const r = await db.message.findUnique({ where: { id: m.id } });
      return r?.status === 'sent' ? r : null;
    });
    assert.equal(row.providerRef, `ref-${m.id}`);
    assert.equal(row.provider, 'webhook');
  });

  test('delivery reports update the message, and only with the secret', async () => {
    const mobile = number();
    await post('/api/auth/signup/otp', { mobile });
    const { m } = await until('the message', () => received.find((r) => r.m.to === mobile));
    const ref = `ref-${m.id}`;
    await until('the send to be recorded', async () => (await db.message.findUnique({ where: { id: m.id } }))?.providerRef === ref);
    assert.equal((await report({ ref, status: 'delivered' }, 'wrong')).status, 401);
    assert.equal((await db.message.findUnique({ where: { id: m.id } })).status, 'sent');
    assert.equal((await report({ ref, status: 'delivered' })).status, 200);
    assert.equal((await db.message.findUnique({ where: { id: m.id } })).status, 'delivered');
    assert.equal((await report({ ref, status: 'read' })).status, 200);
    const row = await db.message.findUnique({ where: { id: m.id } });
    assert.equal(row.status, 'read');
    assert.ok(row.readAt && row.deliveredAt);
    assert.equal((await report({ ref: 'nobody', status: 'read' })).status, 404);
  });

  test('a STOP reply opts the number out of offers', async () => {
    const mobile = number();
    assert.equal((await report({ from: `+91 ${mobile}`, text: ' stop ' })).status, 200);
    const person = await db.person.findUnique({ where: { mobile } });
    assert.equal(person.data.optOut, true);
    assert.equal(person.data.consent, false);
    const login = await post('/api/auth/login', { email: 'master@moipoint.in', password: 'master123' });
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    const r = await post('/api/admin/campaign', { aud: 'guests', ch: 'wa', text: 'Offer', mobiles: [mobile] }, cookie);
    assert.deepEqual(await r.json(), { sent: 0, skipped: 1 });
  });

  test('a provider outage loses nothing, and a dead number gives up after ten minutes', { timeout: 90000 }, async () => {
    const flaky = number();
    const dead = String(Number(flaky) + 1);
    outage.set(flaky, 1);
    outage.set(dead, 1000);
    await post('/api/auth/signup/otp', { mobile: flaky });
    await post('/api/auth/signup/otp', { mobile: dead });
    const first = await until('the first try', () => received.find((r) => r.m.to === flaky));
    const stuck = await until('the first try', () => received.find((r) => r.m.to === dead));
    await until('the error to be noted', async () => (await db.message.findUnique({ where: { id: first.m.id } }))?.error);
    assert.equal((await db.message.findUnique({ where: { id: first.m.id } })).status, 'queued');
    await db.message.update({ where: { id: stuck.m.id }, data: { createdAt: new Date(Date.now() - 11 * 60000) } });

    await until('the retry', async () => (await db.message.findUnique({ where: { id: first.m.id } })).status === 'sent', 70000);
    const sent = received.filter((r) => r.m.to === flaky);
    assert.equal(sent.length, 2, 'one failure and one success');
    assert.equal(sent[1].m.id, sent[0].m.id, 'a retry keeps the same id, so the provider can ignore repeats');
    assert.equal((await db.message.findUnique({ where: { id: first.m.id } })).error, null);
    await until('giving up', async () => (await db.message.findUnique({ where: { id: stuck.m.id } })).status === 'failed', 5000);
  });
});

describe('with testing tools off', () => {
  let browser;
  before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
  after(async () => { await browser.close(); });

  test('the Dev Outbox and its data are gone', async () => {
    assert.equal((await fetch(`${BASE}/dev/outbox`)).status, 404);
    assert.equal((await fetch(`${BASE}/api/dev/messages`)).status, 404);
    assert.equal((await post('/api/dev/run-jobs', {})).status, 404);
  });

  test('no OTP code is ever sent back to the browser', async () => {
    const mobile = `9${String(Date.now()).slice(-9)}`;
    const r = await post('/api/auth/signup/otp', { mobile });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).devCode, undefined);
    const g = await post('/api/public/otp/send', { eventId: 'e2', mobile });
    assert.equal((await g.json()).devCode, undefined);
    const l = await post('/api/public/lead/otp', { mobile });
    assert.equal((await l.json()).devCode, undefined);
  });

  test('credits cannot be simulated, even if the setting was left on', async () => {
    const login = await post('/api/auth/login', { email: 'ramesh.kumar@gmail.com', password: 'admin123' });
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    const before = (await login.json()).state.accounts[0].wallet.credits;
    const r = await post('/api/credits/purchase', { accountId: 'A1001', qty: 100 }, cookie);
    assert.equal(r.status, 503);
    const plan = await post('/api/plan/pay', { plan: 'free' }, cookie);
    assert.equal(plan.status, 503);
    const state = await (await fetch(`${BASE}/api/state`, { headers: { cookie } })).json();
    assert.equal(state.state.accounts[0].wallet.credits, before);
  });

  test('online Moi is refused without a real gateway', async () => {
    const r = await post('/api/public/moi', { eventId: 'e2', mobile: '9876512345', ticket: 'x', mode: 'online', amount: 100, c: { name: 'X' } });
    assert.notEqual(r.status, 200);
  });

  test('the login page shows no demo accounts, and online payment is not offered', async () => {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { localStorage.setItem('moipoint-state', 'Tamil Nadu'); } catch { /* blocked */ } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#l_user');
    const text = await p.evaluate(() => document.body.innerText);
    assert.ok(!text.includes('Demo accounts'));
    assert.ok(!text.includes('master@moipoint.in'));
    assert.equal(await p.locator('#mpDev').count(), 0);
    await p.goto(`${BASE}/#EV003`, { waitUntil: 'domcontentloaded' });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForSelector('form[data-form=pub]');
    const modes = await p.locator('[data-act=mode]').allTextContents();
    assert.ok(!modes.join(' ').includes('Online'), `offered: ${modes}`);
    await ctx.close();
  });

  test('a real install gets its first Master Admin from one command', async () => {
    const email = `first${Date.now()}@example.com`;
    const args = ['run', '--silent', 'admin:create', '--', 'FirstAdmin', email, number()];
    const opts = { env: { ...process.env, DATABASE_URL: process.env.PROD_DATABASE_URL }, shell: process.platform === 'win32' };
    const { stdout } = await run('npm', args, opts);
    const password = stdout.match(/Password: (\S+)/)[1];
    const r = await post('/api/auth/login', { email, password });
    assert.equal(r.status, 200);
    const { state, me } = await r.json();
    const u = state.users.find((x) => x.id === me);
    assert.equal(u.role, 'platform');
    assert.equal(u.prole, 'owner');
    await assert.rejects(run('npm', args, opts), 'the same email twice must be refused');
  });

  test('the website still opens for a visitor', async () => {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
});
