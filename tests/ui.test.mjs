// Real browser tests. Each one is something a person actually does, on separate devices.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { chromium } from 'playwright-core';
import { BASE, Device, mobile, uniq } from './helpers.mjs';

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
  await d.p.goto(`${BASE}/#login`, { waitUntil: 'load' });
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
  await d.p.goto(`${BASE}/#signup`, { waitUntil: 'load' });
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
  await d.p.evaluate(() => { const el = document.getElementById('n_date'); el.value = '2027-03-10'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await d.p.fill('#n_venue', 'Test Mahal');
  await d.p.fill('#n_org', 'Test Organiser');
  for (let i = 0; i < 8 && (await d.p.locator('form.ewz').count()); i++) {
    await d.p.locator('form.ewz [data-act=ewNext]').first().click();
    await settle(d, 300);
  }
  await d.p.waitForFunction((n) => (0, eval)(`S.events.some(e=>e.name===${JSON.stringify(n)})`), name);
  await settle(d, 900);
  await d.S('closeModal()');
  return d.S(`S.events.find(e=>e.name===${JSON.stringify(name)}).id`);
}

const synced = (d, expr, ms = 8000) => d.p.waitForFunction((x) => !!(0, eval)(x), expr, { timeout: ms });

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
    await d.p.reload({ waitUntil: 'load' });
    await synced(d, 'MPS.ready&&me');
    assert.equal(await d.S('me.email'), OWNER[0]);
    assert.equal(await d.S('S.moi.length'), before);
    await d.close();
  });

  test('logging out wipes the account from a shared phone', async () => {
    const d = await device();
    await login(d, OWNER);
    await d.S('ACT.logout()');
    await d.p.waitForFunction(() => !(0, eval)('me') && (0, eval)('MPS.ready'), null, { timeout: 8000 });
    await settle(d, 500);
    const kept = await d.p.evaluate(() => localStorage.getItem('moipoint-v7') || '');
    assert.ok(!kept.includes('ramesh.kumar@gmail.com'), 'account data stayed on the phone');
    assert.equal(await d.S('S.moi.length'), 0);
    await d.close();
  });

  test('wrong password shows the message on the form', async () => {
    const d = await device();
    await d.p.goto(`${BASE}/#login`, { waitUntil: 'load' });
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
    await d.p.goto(`${BASE}/#forgot`, { waitUntil: 'load' });
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
    await g.p.goto(`${BASE}/#EV003`, { waitUntil: 'load' });
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
    await g.p.goto(`${BASE}/#EV003`, { waitUntil: 'load' });
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
    await d.p.goto(`${BASE}/r/${m.code}`, { waitUntil: 'load' });
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
    await phone.p.reload({ waitUntil: 'load' });
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
    await d.p.waitForFunction(() => (0, eval)(`me&&me.id==='u1'`));
    await settle(d, 500);
    assert.ok((await d.p.evaluate(() => document.body.innerText)).includes('Support view'));
    await d.S('ACT.impExit()');
    await d.p.waitForFunction(() => (0, eval)(`me&&me.id==='p1'`));
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
    await d.p.goto(`${BASE}/`, { waitUntil: 'load' });
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
    await d.p.reload({ waitUntil: 'load' });
    await synced(d, 'MPS.ready&&me&&document.body.innerText.length>200');
    await settle(d, 500);
    const text = await d.p.evaluate(() => document.body.innerText);
    assert.match(text, /[஀-௿]{3,}/);
    assert.deepEqual(d.errors, []);
    await d.close();
  });
});
