// The same app with testing tools off, as it would run on a real server.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { chromium } from 'playwright-core';

const BASE = process.env.PROD_BASE;
const post = (path, body, cookie = '') =>
  fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-moipoint': '1', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

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
    await p.goto(`${BASE}/#login`, { waitUntil: 'load' });
    await p.waitForSelector('#l_user');
    const text = await p.evaluate(() => document.body.innerText);
    assert.ok(!text.includes('Demo accounts'));
    assert.ok(!text.includes('master@moipoint.in'));
    assert.equal(await p.locator('#mpDev').count(), 0);
    await p.goto(`${BASE}/#EV003`, { waitUntil: 'load' });
    await p.reload({ waitUntil: 'load' });
    await p.waitForSelector('form[data-form=pub]');
    const modes = await p.locator('[data-act=mode]').allTextContents();
    assert.ok(!modes.join(' ').includes('Online'), `offered: ${modes}`);
    await ctx.close();
  });

  test('the website still opens for a visitor', async () => {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${BASE}/`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
});
