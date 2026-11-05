// Real browser tests. Each one is something a person actually does, on separate devices.
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { chromium } from 'playwright-core';
import { BASE, Device, FUTURE, mobile, staff, uniq } from './helpers.mjs';

let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser.close(); });

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const LAPTOP = { viewport: { width: 1280, height: 800 } };
const OWNER = ['ramesh.kumar@gmail.com', 'admin123'];

/** One device with its own storage, and a list of anything that went wrong on it. */
async function device(opts = PHONE) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', ...opts });
  await ctx.addInitScript(() => { try { localStorage.setItem('mp-noob', '1'); localStorage.setItem('moipoint-state', 'Tamil Nadu'); } catch { /* blocked */ } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_INTERNET_DISCONNECTED|Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  const S = (expr) => p.evaluate((x) => (0, eval)(x), expr);
  return { ctx, p, errors, S, close: () => ctx.close() };
}
const go = (d, hash) => d.p.evaluate((h) => { location.hash = h; }, hash);
const settle = (d, ms = 400) => d.p.waitForTimeout(ms);

async function login(d, [email, pw]) {
  await d.p.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded' });
  await d.p.waitForSelector('#l_user');
  await d.p.fill('#l_user', email);
  await d.p.fill('#l_pw', pw);
  await d.p.click('form[data-form=login] button.btn-primary');
  await d.p.waitForFunction(() => /dashboard|admin/.test(location.hash));
  await settle(d, 500);
}

/** Types a Moi at the counter through the real three-step form. */
async function receiveMoi(d, eventId, name, amount, mob = '') {
  await go(d, `ev-${eventId}-receive`);
  await d.p.waitForSelector('#m_name');
  await settle(d, 250);
  if (mob) await d.p.fill('#m_mobile', mob);
  await d.p.fill('#m_name', name);
  await d.p.locator('form[data-form=moi] [data-act=wzNext]').first().click();
  await d.p.waitForSelector('#m_amount', { state: 'visible' });
  await d.p.fill('#m_amount', String(amount));
  await d.p.locator('form[data-form=moi] [data-act=wzNext]').first().click();
  await d.p.locator('form[data-form=moi] button:not([type=button])').last().click();
  await d.p.waitForSelector('[data-act=flowNew]');
}

async function signup(d, name) {
  const mob = mobile();
  const email = `${uniq('ui')}@example.com`;
  await d.p.goto(`${BASE}/#signup`, { waitUntil: 'domcontentloaded' });
  await d.p.waitForSelector('#o_mobile');
  await d.p.fill('#o_mobile', mob);
  await d.p.click('form[data-form=otpSend] button.btn-primary');
  await d.p.waitForSelector('#otp_code');
  const code = (await d.p.locator('form[data-form=otpVerify] .note.info b').textContent()).match(/\d{6}/)[0];
  await d.p.fill('#otp_code', code);
  await d.p.click('form[data-form=otpVerify] button.btn-primary');
  await d.p.waitForSelector('#su_name');
  await d.p.fill('#su_name', name);
  await d.p.fill('#su_email', email);
  await d.p.fill('#su_pw', 'Testpass123');
  await d.p.fill('#su_pw2', 'Testpass123');
  for (const [id, v] of [['su_dist', 'Madurai'], ['su_city', 'Madurai']]) {
    const tag = await d.p.$eval(`#${id}`, (e) => e.tagName);
    if (tag === 'SELECT') await d.p.selectOption(`#${id}`, v); else await d.p.fill(`#${id}`, v);
  }
  await d.p.check('#su_terms');
  await d.p.click('form[data-form=signup] button.btn-primary');
  await d.p.waitForFunction(() => location.hash === '#dashboard');
  await settle(d, 500);
  return { email, mob };
}

async function createEvent(d, name) {
  await go(d, 'dashboard');
  await settle(d);
  await d.p.locator('[data-act=evNew]').first().click();
  await d.p.waitForSelector('#n_name');
  await d.p.fill('#n_name', name);
  await d.p.evaluate((date) => { const el = document.getElementById('n_date'); el.value = date; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, FUTURE);
  await d.p.fill('#n_venue', 'Test Mahal');
  await d.p.fill('#n_org', 'Test Organiser');
  for (let i = 0; i < 8 && (await d.p.locator('form.ewz').count()); i++) {
    await d.p.locator('form.ewz [data-act=ewNext]').first().click();
    await settle(d, 300);
  }
  await synced(d, `S.events.some(e=>e.name===${JSON.stringify(name)})`);
  await settle(d, 900);
  await d.S('closeModal()');
  return d.S(`S.events.find(e=>e.name===${JSON.stringify(name)}).id`);
}

/** Waits until something is true in the app. It asks from out here, because the page's own rules forbid eval inside it. */
async function synced(d, expr, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      if (await d.S(`!!(${expr})`)) return;
    } catch { /* the page is still loading */ }
    if (Date.now() > end) assert.fail(`timed out waiting for: ${expr}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe('a family using the app', () => {
  test('a new customer signs up, creates a function and takes a Moi', async () => {
    const d = await device();
    await signup(d, 'Kumaran');
    assert.equal(await d.S('me.role'), 'admin');
    assert.equal(await d.S('S.wallet.credits'), 20);
    const id = await createEvent(d, 'Kumaran Wedding');
    await synced(d, 'S.wallet.credits===40');
    await receiveMoi(d, id, 'First Guest', 501, '9876512301');
    const code = await d.S(`S.moi.find(m=>m.c.name==='First Guest').code`);
    const no = await d.S(`S.events.find(e=>e.id==='${id}').no`);
    assert.match(code, new RegExp(`^${no}/\\d{3}$`), 'receipt must use the event number the server gave');
    assert.deepEqual(d.errors, []);
    await d.close();
  });

  test('a Moi typed on a phone appears on the laptop by itself', async () => {
    const laptop = await device(LAPTOP);
    const phone = await device();
    await login(laptop, OWNER);
    await login(phone, ['divya.sankar@gmail.com', 'divya123']);
    await go(laptop, 'ev-e2-list');
    await settle(laptop);
    const name = uniq('Live Guest ');
    await receiveMoi(phone, 'e2', name, 1001);
    await synced(laptop, `S.moi.some(m=>m.c.name===${JSON.stringify(name)})`);
    await laptop.p.waitForFunction((n) => document.body.innerText.includes(n), name);
    assert.deepEqual([...laptop.errors, ...phone.errors], []);
    await laptop.close();
    await phone.close();
  });

  test('a reload keeps you logged in with the same data', async () => {
    const d = await device();
    await login(d, OWNER);
    const before = await d.S('S.moi.length');
    await d.p.reload({ waitUntil: 'domcontentloaded' });
    await synced(d, 'MPS.ready&&me');
    assert.equal(await d.S('me.email'), OWNER[0]);
    assert.equal(await d.S('S.moi.length'), before);
    await d.close();
  });

  test('logging out wipes the account from a shared phone', async () => {
    const d = await device();
    await login(d, OWNER);
    await d.S('ACT.logout()');
    await synced(d, '!me&&MPS.ready');
    await settle(d, 500);
    const kept = await d.p.evaluate(() => localStorage.getItem('moipoint-v7') || '');
    assert.ok(!kept.includes('ramesh.kumar@gmail.com'), 'account data stayed on the phone');
    assert.equal(await d.S('S.moi.length'), 0);
    await d.close();
  });

  test('wrong password shows the message on the form', async () => {
    const d = await device();
    await d.p.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('#l_user');
    await d.p.fill('#l_user', OWNER[0]);
    await d.p.fill('#l_pw', 'wrong-password');
    await d.p.click('form[data-form=login] button.btn-primary');
    await d.p.waitForSelector('.ferr');
    assert.match(await d.p.locator('.ferr').first().textContent(), /wrong/);
    await d.close();
  });

  test('buying credits adds them on every device', async () => {
    const a = await device();
    const b = await device(LAPTOP);
    const { email } = await signup(a, 'Buyer');
    await login(b, [email, 'Testpass123']);
    await go(a, 'credits');
    await settle(a);
    await a.S('buyPay(100)');
    await settle(a, 300);
    const box = a.p.locator('#buy_ok');
    if (await box.count()) await box.check();
    await a.p.locator('[data-act=buySim]').click();
    await synced(a, 'S.wallet.credits===120');
    await synced(b, 'S.wallet.credits===120');
    await a.close();
    await b.close();
  });
});

describe('forgot password', () => {
  test('email, hint, registered mobile, code, new password, logged in', async () => {
    const a = await device();
    const { email, mob } = await signup(a, 'Forgetful');
    await a.close();
    const d = await device();
    await d.p.goto(`${BASE}/#forgot`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('#fp_email');
    await d.p.fill('#fp_email', email);
    await d.p.click('form[data-form=fpFind] button');
    await d.p.waitForSelector('#fp_mob');
    assert.equal(await d.p.locator('.pw-hint b').textContent(), `Te*******23`);
    await d.p.fill('#fp_mob', '9000000001');
    await d.p.click('form[data-form=fpMob] button');
    await d.p.waitForSelector('.ferr');
    await d.p.fill('#fp_mob', mob);
    await d.p.click('form[data-form=fpMob] button');
    await d.p.waitForSelector('#fp_code');
    const code = (await d.p.locator('form[data-form=fpOtp] .note.info b').textContent()).match(/\d{6}/)[0];
    await d.p.fill('#fp_code', code);
    await d.p.waitForFunction(() => location.hash.startsWith('#reset-'));
    await d.p.fill('#rp_pw', 'Changed1234');
    await d.p.fill('#rp_pw2', 'Changed1234');
    await d.p.click('form[data-form=resetPw] button.btn-primary');
    await d.p.waitForFunction(() => location.hash === '#dashboard');
    assert.equal(await d.S('me.email'), email);
    await new Device().login(email, 'Changed1234');
    assert.deepEqual(d.errors, []);
    await d.close();
  });
});

describe('guest QR page', () => {
  async function guestEntry(g, name, mob, amount = 501) {
    await g.p.goto(`${BASE}/#EV003`, { waitUntil: 'domcontentloaded' });
    await g.p.waitForSelector('form[data-form=pub]');
    await g.p.locator('[data-act=mode]', { hasText: 'Cash' }).click();
    await settle(g, 200);
    await g.p.fill('#p_mobile', mob);
    await g.p.fill('#p_name', name);
    await g.p.fill('#p_amount', String(amount));
    await g.p.locator('form[data-form=pub] button:not([type=button])').click();
    await g.p.waitForSelector('#qo_code');
    const code = (await g.p.locator('form[data-form=qrOtp] b.code').textContent()).trim();
    await g.p.fill('#qo_code', code); // six digits verify by themselves
    await synced(g, `flows.public&&flows.public.stage==='done'`);
  }

  test('a guest scans, confirms by OTP, and the counter collects the cash', async () => {
    const counter = await device();
    const guest = await device();
    await login(counter, OWNER);
    await go(counter, 'ev-e2-overview');
    const name = uniq('QR Guest ');
    await guestEntry(guest, name, mobile());
    assert.equal(await guest.S(`S.moi[0].status`), 'tocollect');
    await synced(counter, `S.moi.some(m=>m.c.name===${JSON.stringify(name)}&&m.status==='tocollect')`);
    const id = await counter.S(`S.moi.find(m=>m.c.name===${JSON.stringify(name)}).id`);
    await counter.S(`ACT.collected({dataset:{id:'${id}'}})`);
    await synced(guest, `S.moi[0].status==='received'`, 15000);
    assert.deepEqual([...counter.errors, ...guest.errors], []);
    await counter.close();
    await guest.close();
  });

  test('a stranger’s phone gets nothing but the event', async () => {
    const g = await device();
    await g.p.goto(`${BASE}/#EV003`, { waitUntil: 'domcontentloaded' });
    await g.p.waitForSelector('form[data-form=pub]');
    assert.equal(await g.S('S.users.length'), 0);
    assert.equal(await g.S('S.moi.length'), 0);
    assert.equal(await g.S('S.events.length'), 1);
    await g.close();
  });

  test('a receipt link opens the check page for anyone', async () => {
    const o = new Device();
    await o.login(...OWNER);
    const m = o.state.state.moi.find((x) => x.c.mobile);
    const d = await device();
    await d.p.goto(`${BASE}/r/${m.code}`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForFunction(() => /Genuine receipt|Pending|receipt/i.test(document.body.innerText), null, { timeout: 8000 });
    const text = await d.p.evaluate(() => document.body.innerText);
    assert.ok(text.includes(m.code));
    assert.ok(!text.includes(m.c.mobile), 'full mobile must not show');
    await d.close();
  });
});

describe('working with no internet', () => {
  test('an entry made offline is kept, then syncs once when the phone reconnects', async () => {
    const phone = await device();
    const laptop = await device(LAPTOP);
    await login(phone, ['divya.sankar@gmail.com', 'divya123']);
    await login(laptop, OWNER);
    const credits0 = await laptop.S('S.wallet.credits');
    await phone.ctx.setOffline(true);
    await phone.p.evaluate(() => window.dispatchEvent(new Event('offline')));
    const name = uniq('Offline Guest ');
    await receiveMoi(phone, 'e2', name, 2001, '9876512302');
    assert.equal(await phone.S(`S.moi.filter(m=>m.c.name===${JSON.stringify(name)}).length`), 1);
    await settle(laptop, 1500);
    assert.equal(await laptop.S(`S.moi.some(m=>m.c.name===${JSON.stringify(name)})`), false);
    await phone.ctx.setOffline(false);
    await synced(phone, 'navigator.onLine');
    await phone.p.evaluate(() => window.dispatchEvent(new Event('online')));
    await synced(laptop, `S.moi.some(m=>m.c.name===${JSON.stringify(name)})`, 15000);
    await settle(laptop, 2000);
    assert.equal(await laptop.S(`S.moi.filter(m=>m.c.name===${JSON.stringify(name)}).length`), 1, 'no duplicate');
    const code = await laptop.S(`S.moi.find(m=>m.c.name===${JSON.stringify(name)}).code`);
    assert.match(code, /^EV003\/\d+$/);
    const out = (await new Device().get('/api/dev/messages')).json.messages.filter((m) => m.text.includes(code));
    assert.ok(out.length >= 1, 'queued receipt must go out after reconnecting');
    assert.ok((await laptop.S('S.wallet.credits')) < credits0, 'credit is charged once it sends');
    await phone.close();
    await laptop.close();
  });

  test('an entry survives closing the app while offline', async () => {
    const phone = await device();
    await login(phone, ['divya.sankar@gmail.com', 'divya123']);
    await settle(phone, 1000);
    await phone.ctx.setOffline(true);
    await phone.p.evaluate(() => window.dispatchEvent(new Event('offline')));
    const name = uniq('Reloaded Guest ');
    await receiveMoi(phone, 'e2', name, 3001);
    await settle(phone, 300);
    await phone.ctx.setOffline(false);
    await phone.p.reload({ waitUntil: 'domcontentloaded' });
    await synced(phone, 'MPS.ready&&me', 10000);
    await settle(phone, 1500);
    const o = new Device();
    await o.login(...OWNER);
    assert.ok(o.state.state.moi.some((m) => m.c.name === name), 'the entry must reach the server');
    assert.equal(await phone.S(`S.moi.filter(m=>m.c.name===${JSON.stringify(name)}).length`), 1);
    await phone.close();
  });
});

describe('helpers', () => {
  test('an owner adds a Moi Collector, who logs in on their own phone', async () => {
    const o = await device(LAPTOP);
    await signup(o, 'Team Owner');
    const id = await createEvent(o, 'Team Function');
    const email = `${uniq('col')}@example.com`;
    const mob = mobile();
    await go(o, `ev-${id}-users`);
    await settle(o);
    await o.S(`userModal(S.events.find(e=>e.id==='${id}'),'collector')`);
    await o.p.waitForSelector('#u_user');
    await o.p.fill('#u_user', email);
    await settle(o, 500);
    await o.p.fill('#u_name', 'New Collector');
    await o.p.fill('#u_mobile', mob);
    await o.p.fill('#u_pw', 'Collect1234');
    const box = o.p.locator(`input[name=u_ev][value="${id}"]`);
    if (!(await box.isChecked())) await box.check({ force: true });
    await o.p.locator('form[data-form=user] .md-f button.btn-primary').click();
    await synced(o, `S.users.some(u=>u.email===${JSON.stringify(email)})`);
    await settle(o, 1500);

    const c = await device();
    await login(c, [email, 'Collect1234']);
    assert.equal(await c.S('me.role'), 'collector');
    assert.deepEqual(await c.S('S.events.map(e=>e.id)'), [id]);
    await receiveMoi(c, id, 'Helper Entry', 501);
    await synced(o, `S.moi.some(m=>m.c.name==='Helper Entry')`);
    assert.deepEqual([...o.errors, ...c.errors], []);
    await o.close();
    await c.close();
  });

  test('a refused change is undone on the device and explained', async () => {
    const c = await device();
    await login(c, ['raj.moi@gmail.com', 'raj123']);
    const id = await c.S(`S.moi.find(m=>m.event_id==='e1'&&m.status==='received').id`);
    const amount = await c.S(`S.moi.find(m=>m.id==='${id}').amount`);
    await c.S(`(()=>{const m=S.moi.find(x=>x.id==='${id}');m.amount=1;save()})()`);
    await synced(c, `S.moi.find(m=>m.id==='${id}').amount===${amount}`);
    await c.close();
  });
});

describe('messages', () => {
  test('a receipt reaches the outbox and credits drop on both devices', async () => {
    const a = await device();
    const b = await device(LAPTOP);
    const { email } = await signup(a, 'Receipts');
    await login(b, [email, 'Testpass123']);
    const id = await createEvent(a, 'Receipts Function');
    await synced(a, 'S.wallet.credits===40');
    await receiveMoi(a, id, 'Paid Guest', 1001, '9876512303');
    await synced(b, 'S.wallet.credits===38'); // WhatsApp and SMS are both on by default
    const code = await a.S(`S.moi.find(m=>m.c.name==='Paid Guest').code`);
    const msgs = (await new Device().get('/api/dev/messages')).json.messages.filter((m) => m.text.includes(code));
    assert.equal(msgs.length, 2);
    assert.deepEqual(msgs.map((m) => m.channel).sort(), ['SMS', 'WhatsApp']);
    assert.equal(msgs[0].trigger, 'C1');
    assert.equal(msgs[0].to, '9876512303');
    assert.equal(msgs[0].vars.receipt, code);
    await a.close();
    await b.close();
  });

  test('an invitation shows real delivery progress on Messages sent', async () => {
    const d = await device(LAPTOP);
    await login(d, OWNER);
    await d.S(`msgOpen({aud:'ev',ev:'e1',kind:'invite'})`);
    await d.p.waitForSelector('form[data-form=invite]');
    await settle(d, 300);
    await d.p.locator('form[data-form=invite] .md-f button.btn-primary').last().click();
    await synced(d, `S.msgLog[0]&&S.msgLog[0].recips.length>0`);
    await synced(d, `S.msgLog[0].recips.some(r=>r.ds&&r.ds.s==='read')`, 20000);
    const out = (await new Device().get('/api/dev/messages')).json.messages.filter((m) => m.trigger === 'C11');
    assert.ok(out.length > 0);
    await d.close();
  });
});

describe('Moi Point staff', () => {
  test('every Master Admin page opens and shows only real accounts', async () => {
    const d = await device(LAPTOP);
    await login(d, ['master@moipoint.in', 'master123']);
    const links = await d.p.evaluate(() => [...document.querySelectorAll('.xnav a[href]')].map((a) => a.getAttribute('href').slice(1)));
    assert.ok(links.length >= 15);
    for (const h of links) {
      await go(d, h);
      await settle(d, 150);
    }
    assert.deepEqual(d.errors, []);
    const real = await new Device().post('/api/auth/login', { email: 'master@moipoint.in', password: 'master123' });
    await go(d, 'admin-accounts');
    await settle(d);
    const shown = await d.S(`S.accounts.length`);
    assert.equal(shown, real.json.state.accounts.length);
    await d.close();
  });

  test('support view shows the customer’s account and returns to staff', async () => {
    const d = await device(LAPTOP);
    await login(d, ['master@moipoint.in', 'master123']);
    await d.S(`mpImpersonate(S.users.find(u=>u.id==='u1'))`);
    await synced(d, `me&&me.id==='u1'`);
    await settle(d, 500);
    assert.ok((await d.p.evaluate(() => document.body.innerText)).includes('Support view'));
    await d.S('ACT.impExit()');
    await synced(d, `me&&me.id==='p1'`);
    await d.close();
  });

  test('a website enquiry reaches Master Admin', async () => {
    const s = await device(LAPTOP);
    await login(s, ['master@moipoint.in', 'master123']);
    const v = await new Device();
    const m = mobile();
    const name = uniq('Lead ');
    const otp = await v.post('/api/public/lead/otp', { mobile: m });
    await v.post('/api/public/lead/verify', { mobile: m, code: otp.json.devCode, kind: 'enquiry', data: { name, msg: 'Hello' } });
    await synced(s, `P().leads.some(l=>l.name===${JSON.stringify(name)})`);
    await s.close();
  });
});

describe('every screen still opens', () => {
  const OWNER_ROUTES = ['dashboard', 'functions', 'guests', 'messages', 'reminders', 'credits', 'plan', 'profile', 'help', 'staff', 'audit', 'ev-e2-overview', 'ev-e2-receive', 'ev-e2-list', 'ev-e2-guests', 'ev-e2-expenses', 'ev-e2-payouts', 'ev-e2-payments', 'ev-e2-users', 'ev-e2-qr', 'ev-e2-reports', 'ev-e2-settings'];

  for (const [who, opts] of [['on a phone', PHONE], ['on a laptop', LAPTOP]]) {
    test(`owner pages ${who}: no errors, no sideways scrolling`, async () => {
      const d = await device(opts);
      await login(d, OWNER);
      const wide = [];
      for (const h of OWNER_ROUTES) {
        await go(d, h);
        await settle(d, 200);
        await d.S('closeModal()');
        const over = await d.p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (over > 1) wide.push(`${h}: ${over}px`);
      }
      assert.deepEqual(wide, []);
      assert.deepEqual(d.errors, []);
      await d.close();
    });
  }

  test('website pages open for a visitor', async () => {
    const d = await device();
    await d.p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await settle(d, 800);
    for (const h of ['how', 'contact', 'blog', 'login', 'signup', 'forgot']) {
      await go(d, h);
      await settle(d, 200);
    }
    assert.deepEqual(d.errors, []);
    await d.close();
  });

  test('Tamil screens still work after login', async () => {
    const d = await device();
    await login(d, OWNER);
    await d.p.evaluate(() => { localStorage.setItem('moipoint-uilang', 'ta'); });
    await d.p.reload({ waitUntil: 'domcontentloaded' });
    await synced(d, 'MPS.ready&&me&&document.body.innerText.length>200');
    await settle(d, 500);
    const text = await d.p.evaluate(() => document.body.innerText);
    assert.match(text, /[஀-௿]{3,}/);
    assert.deepEqual(d.errors, []);
    await d.close();
  });
});

describe('all 17 automation triggers, through the real screens', () => {
  const OWNER_MOBILE = '9840012345';
  let o;
  let since = 0;
  let fresh;
  let cashGuest;

  beforeEach(() => { since = Date.now() - 500; });
  before(async () => {
    o = await device(LAPTOP);
    await login(o, OWNER);
    // enough credits for everything below, whatever the earlier tests used
    const start = await o.S('S.wallet.credits');
    await go(o, 'credits');
    await settle(o);
    await o.S('buyPay(300)');
    await settle(o, 300);
    const box = o.p.locator('#buy_ok');
    if (await box.count()) await box.check();
    await o.p.locator('[data-act=buySim]').click();
    await synced(o, `S.wallet.credits>=${start + 300}`);
  });
  after(async () => { await o.close(); });

  /** Waits for a message sent during this test, and returns every copy of it, one per channel. */
  async function fired(trigger, match = () => true, ms = 12000) {
    const end = Date.now() + ms;
    for (;;) {
      const all = (await new Device().get('/api/dev/messages')).json.messages;
      const hits = all.filter((m) => m.trigger === trigger && Date.parse(m.createdAt) >= since && match(m));
      if (hits.length) return hits;
      if (Date.now() > end) assert.fail(`${trigger} never reached the outbox`);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  /** A guest on their own phone: scans the QR, picks how to pay, and confirms by OTP. */
  async function guest(mode, name, mob) {
    const g = await device();
    await g.p.goto(`${BASE}/#EV003`, { waitUntil: 'domcontentloaded' });
    await g.p.waitForSelector('form[data-form=pub]');
    await g.p.locator(`[data-act=mode][data-mode=${mode}]`).click();
    await settle(g, 200);
    await g.p.fill('#p_mobile', mob);
    await g.p.fill('#p_name', name);
    await g.p.fill('#p_amount', '501');
    if (mode === 'upi') await g.p.fill('#p_utr', '123456789012');
    await g.p.locator('form[data-form=pub] button:not([type=button])').click();
    await g.p.waitForSelector('#qo_code');
    const code = (await g.p.locator('form[data-form=qrOtp] b.code').textContent()).trim();
    await g.p.fill('#qo_code', code); // six digits verify by themselves
    if (mode === 'online') await g.p.locator('[data-act=paySim]').click();
    await synced(g, `flows.public&&flows.public.stage==='done'`);
    await g.close();
  }

  const entry = async (name) => {
    await synced(o, `S.moi.some(m=>m.c.name===${JSON.stringify(name)})`);
    return o.S(`(()=>{const m=S.moi.find(x=>x.c.name===${JSON.stringify(name)});return {id:m.id,code:m.code}})()`);
  };

  /** Presses a real button on the counter's waiting list. */
  async function tap(act, id) {
    await go(o, 'ev-e2-list');
    await settle(o);
    await o.S('render()');
    await o.p.locator(`[data-act=${act}][data-id="${id}"]`).first().click();
  }

  /** A reminder that falls due rings on screen until someone closes it. */
  async function closeAlarms() {
    for (let i = 0; i < 5 && (await o.p.locator('[data-act=ringClose]').count()); i++) {
      await o.p.locator('[data-act=ringClose]').first().click();
      await settle(o, 150);
    }
  }

  const customerPaid = (hits, quote) => {
    for (const h of hits) {
      assert.equal(h.paidBy, 'customer');
      if (quote) assert.ok(h.text.includes(quote), `${h.trigger} must quote ${quote}: ${h.text}`);
    }
  };

  test('C1: a Moi saved at the counter', async () => {
    const mob = mobile();
    const name = uniq('Counter ');
    await receiveMoi(o, 'e2', name, 1001, mob);
    const { code } = await entry(name);
    const hits = await fired('C1', (m) => m.to === mob);
    customerPaid(hits, code);
    assert.equal(hits[0].vars.receipt, code);
  });

  test('C8 and C5: a guest confirms by code and chooses cash', async () => {
    const mob = mobile();
    const name = uniq('Cash ');
    await guest('cash', name, mob);
    const otp = await fired('C8', (m) => m.to === mob);
    assert.equal(otp[0].channel, 'SMS');
    assert.match(otp[0].vars.otp, /^\d{6}$/);
    assert.equal(otp[0].paidBy, 'customer');
    const hits = await fired('C5', (m) => m.to === mob);
    assert.equal(hits[0].channel, 'WhatsApp');
    cashGuest = { name, mob, ...(await entry(name)) };
    customerPaid(hits, cashGuest.code);
  });

  test('C3: the counter marks that cash as collected', async () => {
    await tap('collected', cashGuest.id);
    customerPaid(await fired('C3', (m) => m.to === cashGuest.mob), cashGuest.code);
  });

  test('C6 and C2: a guest sends UPI details, and the family verifies them', async () => {
    const mob = mobile();
    const name = uniq('Upi ');
    await guest('upi', name, mob);
    const hits = await fired('C6', (m) => m.to === mob);
    assert.equal(hits[0].channel, 'WhatsApp');
    const { id, code } = await entry(name);
    customerPaid(hits, code);
    await tap('verify', id);
    customerPaid(await fired('C2', (m) => m.to === mob), code);
  });

  test('C4: a guest says they paid by UPI but hands over cash', async () => {
    const mob = mobile();
    const name = uniq('Unpaid ');
    await guest('upi', name, mob);
    const { id, code } = await entry(name);
    await tap('wpCash', id);
    customerPaid(await fired('C4', (m) => m.to === mob), code);
  });

  test('C7: a guest pays online on the QR page', async () => {
    const mob = mobile();
    const name = uniq('Online ');
    await guest('online', name, mob);
    const hits = await fired('C7', (m) => m.to === mob);
    assert.equal(hits[0].channel, 'WhatsApp');
    customerPaid(hits, (await entry(name)).code);
  });

  test('C9: a payout with the WhatsApp box ticked', async () => {
    const mob = mobile();
    await go(o, 'ev-e2-payouts');
    await settle(o);
    await o.p.locator('[data-act=poNew]').first().click();
    await o.p.waitForSelector('#po_amount');
    await o.p.fill('#po_amount', '100');
    await o.p.fill('#po_to', 'Trigger Receiver');
    await o.p.fill('#po_mobile', mob);
    await o.p.check('#po_wa');
    const send = o.p.locator('form[data-form=po] .md-f button.btn-primary');
    await send.click();
    await settle(o, 300);
    if (await send.count()) await send.click(); // it asks twice when the counter holds less cash
    const hits = await fired('C9', (m) => m.to === mob);
    assert.equal(hits[0].channel, 'WhatsApp');
    customerPaid(hits, 'Trigger Receiver');
  });

  test('M5 and C10: a reminder sends its calendar file, then fires on time', async () => {
    const title = uniq('Reminder ');
    await go(o, 'reminders');
    await settle(o);
    await o.p.locator('[data-act=remNew]').first().click();
    await o.p.waitForSelector('#rm_title');
    await o.p.fill('#rm_title', title);
    await o.p.fill('#rm_person', 'Trigger Person');
    await o.p.fill('#rm_date', new Date().toISOString().slice(0, 10));
    await o.p.selectOption('#rm_before', '0');
    await o.p.evaluate(() => { document.getElementById('rm_at').value = '00:00'; });
    await o.p.check('#rm_wa');
    await o.p.locator('form[data-form=rem] .md-f button.btn-primary').click();

    const [cal] = await fired('M5', (m) => m.text.includes(title));
    assert.equal(cal.to, OWNER[0]);
    assert.equal(cal.channel, 'Email');
    assert.equal(cal.paidBy, 'platform');
    assert.equal(cal.media.document.name, 'reminder.ics');
    assert.ok(cal.media.document.text.startsWith('BEGIN:VCALENDAR'), 'the invite must carry the calendar file itself');
    assert.ok(cal.media.document.text.includes(`SUMMARY:${title}`));

    await new Device().post('/api/dev/run-jobs');
    const hits = await fired('C10', (m) => m.text.includes(title));
    assert.equal(hits[0].to, OWNER_MOBILE);
    customerPaid(hits);
  });

  test('C11: an owner sends an invitation', async () => {
    await closeAlarms();
    await o.S(`msgOpen({aud:'ev',ev:'e1',kind:'invite'})`);
    await o.p.waitForSelector('form[data-form=invite]');
    await settle(o, 300);
    await o.S(`inv.img='data:image/png;base64,'+'iVBORw0KGgo'.repeat(200)`);
    await o.p.locator('form[data-form=invite] .md-f button.btn-primary').last().click();
    const hits = await fired('C11');
    customerPaid(hits);
    assert.ok(hits[0].logId, 'it must link back to the Messages sent screen');
    assert.equal((await fetch(hits[0].media.image)).status, 200, 'a provider must be able to fetch the photo');
    await o.S('closeModal()');
  });

  test('M4: the Moi Book PDF is sent, and the link opens a real PDF', async () => {
    await go(o, 'ev-e1-overview');
    await settle(o, 600);
    await closeAlarms();
    await o.p.locator('[data-act=bookAgain][data-id=e1]').first().click();
    const hits = await fired('M4', () => true, 40000);
    const wa = hits.find((m) => m.channel === 'WhatsApp');
    assert.equal(wa.paidBy, 'platform');
    const pdf = await fetch(wa.media.document.url);
    assert.equal(pdf.status, 200);
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  });

  test('M1: a new user asks for a sign-up code', async () => {
    const d = await device();
    fresh = await signup(d, 'Trigger Family');
    const [m] = await fired('M1', (x) => x.to === fresh.mob);
    assert.equal(m.channel, 'SMS');
    assert.equal(m.paidBy, 'platform');
    assert.match(m.vars.otp, /^\d{6}$/);
    await d.close();
  });

  test('M2: a user asks for a password reset code', async () => {
    const d = await device();
    await d.p.goto(`${BASE}/#forgot`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('#fp_email');
    await d.p.fill('#fp_email', fresh.email);
    await d.p.click('form[data-form=fpFind] button');
    await d.p.waitForSelector('#fp_mob');
    await d.p.fill('#fp_mob', fresh.mob);
    await d.p.click('form[data-form=fpMob] button');
    await d.p.waitForSelector('#fp_code');
    const [m] = await fired('M2', (x) => x.to === fresh.mob);
    assert.equal(m.channel, 'SMS');
    assert.equal(m.paidBy, 'platform');
    await d.close();
  });

  test('M3: a website visitor sends an enquiry', async () => {
    const mob = mobile();
    const name = uniq('Lead ');
    const d = await device();
    await d.p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await settle(d, 600);
    await d.S(`lLeadModal('enquiry')`);
    await d.p.waitForSelector('#ll_name');
    await d.p.fill('#ll_name', name);
    await d.p.fill('#ll_mobile', mob);
    await d.p.fill('#ll_msg', 'Trigger question');
    await d.p.locator('form[data-form=lLead] .md-f button.btn-primary').click();
    await d.p.waitForSelector('#lo_code');
    const [m] = await fired('M3', (x) => x.to === mob);
    assert.equal(m.paidBy, 'platform');
    await d.p.fill('#lo_code', m.vars.otp);
    await d.p.waitForSelector('#lo_code', { state: 'detached' });
    await settle(d, 500);
    assert.ok((await staff()).state.state.platform.leads.some((l) => l.name === name), 'the enquiry must reach Master Admin');
    await d.close();
  });

  test('M6: Master Admin sends a WhatsApp campaign to organisers', async () => {
    const s = await device(LAPTOP);
    await login(s, ['master@moipoint.in', 'master123']);
    await go(s, 'admin-campaigns');
    await settle(s);
    await s.p.selectOption('#cf_ch', 'wa');
    await settle(s, 300);
    const text = uniq('Campaign ');
    await s.p.fill('#cf_msg', text);
    await s.p.locator('#cmpForm button.btn-primary').click();
    const hits = await fired('M6', (m) => m.text === text);
    assert.equal(hits[0].channel, 'WhatsApp');
    assert.equal(hits[0].paidBy, 'platform');
    assert.ok(hits.some((m) => m.to === OWNER_MOBILE));
    await s.close();
  });
});

describe('the printed QR code', () => {
  test('scanning it opens the function’s Moi form, not the home page', async () => {
    for (const path of ['EV003', 'ev003', 'EV-003']) {
      const d = await device();
      await d.p.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded' });
      await d.p.waitForSelector('form[data-form=pub]');
      assert.deepEqual(d.errors, []);
      await d.close();
    }
  });

  test('the secret event link works the same way', async () => {
    const token = await (async () => {
      const o = new Device();
      await o.login(...OWNER);
      return o.state.state.events.find((e) => e.id === 'e2').token;
    })();
    const d = await device();
    await d.p.goto(`${BASE}/${token}`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('form[data-form=pub]');
    await d.close();
  });

  test('the QR on screen points at this server, so a phone can open it', async () => {
    const d = await device(LAPTOP);
    await login(d, OWNER);
    await go(d, 'ev-e2-qr');
    await d.p.waitForSelector('[data-qr]');
    const url = await d.p.locator('.qr-box.big').getAttribute('data-qr');
    assert.match(url, /^https?:\/\/.+\/EV003$/);
    assert.ok(!url.includes('moipoint.in'), url);
    await d.p.waitForFunction(() => document.querySelector('.qr-box.big canvas, .qr-box.big img'));
    await d.close();
  });

  test('Give Moi on the invitation page scrolls to the form, with the page’s script rules on', async () => {
    const d = await device();
    await d.p.goto(`${BASE}/EV003`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('form[data-form=pub]');
    const give = d.p.locator('[data-act=c3pay]');
    if (await give.count()) {
      await give.first().click();
      await settle(d, 500);
      assert.equal(new URL(d.p.url()).hash, '#EV003', 'the address stays on the event');
    }
    assert.deepEqual(d.errors, []);
    await d.close();
  });
});

describe('a weak network at the venue', () => {
  /** Makes an entry offline, then brings the phone back. */
  async function offlineEntry(phone, name, whileOffline = async () => {}) {
    await login(phone, ['divya.sankar@gmail.com', 'divya123']);
    await settle(phone, 1000);
    await phone.ctx.setOffline(true);
    await phone.p.evaluate(() => window.dispatchEvent(new Event('offline')));
    await receiveMoi(phone, 'e2', name, 3001);
    await settle(phone, 300);
    await whileOffline();
    await phone.ctx.setOffline(false);
    await synced(phone, 'navigator.onLine');
  }
  const onServer = async (name) => {
    const o = new Device();
    await o.login(...OWNER);
    return o.state.state.moi.filter((m) => m.c.name === name).length;
  };

  test('an entry is not lost when the first send after reopening fails', async () => {
    const phone = await device();
    const name = uniq('Weak Signal ');
    let refused = 0;
    await offlineEntry(phone, name, () => phone.p.route('**/api/sync', (r) => { refused++; return r.abort(); }));
    await phone.p.reload({ waitUntil: 'domcontentloaded' });
    await synced(phone, 'MPS.ready&&me', 15000);
    await settle(phone, 500);
    assert.ok(refused >= 1, 'the send must have been tried');
    assert.equal(await phone.S(`S.moi.filter(m=>m.c.name===${JSON.stringify(name)}).length`), 1, 'the entry must stay on the phone');
    await phone.p.unroute('**/api/sync');
    await phone.S('mpSoon()');
    const end = Date.now() + 20000;
    while (Date.now() < end && !(await onServer(name))) await settle(phone, 500);
    assert.equal(await onServer(name), 1, 'the entry must reach the server once, when the network returns');
    await phone.close();
  });

  test('an entry is not lost when a full refresh arrives before it is sent', async () => {
    const phone = await device();
    const name = uniq('Refresh Race ');
    await login(phone, ['divya.sankar@gmail.com', 'divya123']);
    await settle(phone, 1000);
    await phone.p.route('**/api/sync', (r) => r.abort());
    await receiveMoi(phone, 'e2', name, 3001);
    await settle(phone, 300);
    await phone.S('mpReloadState()');
    await settle(phone, 800);
    assert.equal(await phone.S(`S.moi.filter(m=>m.c.name===${JSON.stringify(name)}).length`), 1, 'a refresh must not wipe unsent work');
    await phone.p.unroute('**/api/sync');
    await phone.S('mpSoon()');
    const end = Date.now() + 20000;
    while (Date.now() < end && !(await onServer(name))) await settle(phone, 500);
    assert.equal(await onServer(name), 1);
    await phone.close();
  });

  test('an entry is not lost when the login runs out while offline', async () => {
    const phone = await device();
    const name = uniq('Expired Login ');
    await offlineEntry(phone, name, () => phone.p.route('**/api/sync', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Please log in again."}' })));
    await phone.S('mpSoon()');
    await phone.p.waitForFunction(() => location.hash === '#login');
    await phone.p.unroute('**/api/sync');
    await phone.p.waitForSelector('#l_user');
    await phone.p.fill('#l_user', 'divya.sankar@gmail.com');
    await phone.p.fill('#l_pw', 'divya123');
    await phone.p.click('form[data-form=login] button.btn-primary');
    await phone.p.waitForFunction(() => /dashboard/.test(location.hash));
    const end = Date.now() + 20000;
    while (Date.now() < end && !(await onServer(name))) await settle(phone, 500);
    assert.equal(await onServer(name), 1, 'logging back in must send what was waiting');
    await phone.close();
  });

  test('logging out offline waits, so a shared phone never loses an entry', async () => {
    const phone = await device();
    const name = uniq('Logout Offline ');
    await login(phone, ['divya.sankar@gmail.com', 'divya123']);
    await settle(phone, 1000);
    await phone.ctx.setOffline(true);
    await phone.p.evaluate(() => window.dispatchEvent(new Event('offline')));
    await receiveMoi(phone, 'e2', name, 3001);
    await phone.S('ACT.logout()');
    await settle(phone, 500);
    assert.ok(await phone.S('!!me'), 'it must stay logged in');
    assert.equal(await phone.S(`S.moi.filter(m=>m.c.name===${JSON.stringify(name)}).length`), 1);
    await phone.ctx.setOffline(false);
    await synced(phone, 'navigator.onLine');
    await phone.S('mpSoon()');
    const end = Date.now() + 15000;
    while (Date.now() < end && !(await onServer(name))) await settle(phone, 500);
    assert.equal(await onServer(name), 1);
    await phone.close();
  });

  test('a slow font server never holds up the page', async () => {
    const d = await device();
    await d.p.route(/fonts\.(googleapis|gstatic)\.com/, () => { /* never answers */ });
    const t = Date.now();
    await d.p.goto(`${BASE}/#login`, { waitUntil: 'commit' });
    await d.p.waitForSelector('#l_user', { state: 'visible', timeout: 6000 });
    assert.ok(Date.now() - t < 6000);
    await d.close();
  });
});
