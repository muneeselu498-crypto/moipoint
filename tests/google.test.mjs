// Sign in with Google (Firebase), against a stand-in Google that signs tokens exactly as Firebase does.
// The server must accept only real, current, verified tokens for this project, make exactly one Master Admin,
// and send everyone else to their normal dashboard, with no way into staff screens or staff data.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { chromium } from 'playwright-core';
import { BASE, Device, FIREBASE_PROJECT, MASTER_EMAIL, googleKeys, googleToken, mobile, newCustomer, otherKey, staff, uniq } from './helpers.mjs';

before(googleKeys);

const google = (token, extra = {}) => new Device().post('/api/auth/google', { idToken: token, ...extra });
async function googleDevice(email, over) {
  const d = new Device();
  const r = await d.post('/api/auth/google', { idToken: googleToken(email, over) });
  return { d, r };
}
const meOf = (r) => r.json.state.users.find((u) => u.id === r.json.me);

describe('Google sign-in on the server', () => {
  test('A: the Master Admin email becomes the one Owner and opens the staff side', async () => {
    const { d, r } = await googleDevice(MASTER_EMAIL);
    assert.equal(r.status, 200, r.text);
    const me = meOf(r);
    assert.equal(me.email, MASTER_EMAIL);
    assert.equal(me.role, 'platform');
    assert.equal(me.prole, 'owner');
    assert.equal((await d.get('/api/state')).json.me, me.id, 'the session holds after sign-in');
    assert.equal((await d.post('/api/admin/campaign', { aud: 'organizers', ch: 'wa', text: 'x', mobiles: [] })).status, 200, 'Owner-only work is allowed');
    const again = await googleDevice('MuneesElu498@Gmail.com', { email: 'MuneesElu498@Gmail.com' });
    assert.equal(again.r.json.me, me.id, 'the same account every time, whatever the letter case');
  });

  test('a Master Admin email that Google has not verified is refused', async () => {
    const r = await google(googleToken(MASTER_EMAIL, { email_verified: false }));
    assert.equal(r.status, 403);
    assert.equal(r.json.state, undefined);
  });

  test('B: any other Google account opens its own normal dashboard, never the staff side', async () => {
    const c = await newCustomer('Google Family');
    const { d, r } = await googleDevice(c.email);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.me, c.state.me);
    assert.equal(meOf(r).role, 'admin');
    assert.deepEqual(r.json.state.accounts.map((a) => a.id), [c.accountId], 'only their own account');
    assert.equal((await d.post('/api/admin/impersonate', { userId: 'u1' })).status, 403);
    assert.equal((await d.post('/api/admin/campaign', { aud: 'organizers', ch: 'wa', text: 'x', mobiles: [] })).status, 403);
    const self = meOf(r);
    await d.pushOne('users', self.id, { ...self, role: 'platform', prole: 'owner' });
    assert.equal(meOf(await d.get('/api/state')).role, 'admin', 'nobody can make themselves staff');
  });

  test('a Google account with no Moi Point login is sent to sign-up, with no session', async () => {
    const email = `${uniq('new')}@gmail.com`;
    const d = new Device();
    const r = await d.post('/api/auth/google', { idToken: googleToken(email) });
    assert.deepEqual({ needsSignup: r.json.needsSignup, email: r.json.email }, { needsSignup: true, email });
    assert.equal((await d.get('/api/state')).json.me, null);
  });

  /** Your details, as the sign-up form sends them. */
  const details = (over = {}) => ({ name: 'Google Owner', mobile: mobile(), kind: 'Family', state: 'Tamil Nadu', district: 'Madurai', city: 'Madurai', source: 'Friend referral', lang: 'en', ...over });

  test('a new Google account creates its own family account from Your details, with no mobile code', async () => {
    const email = `${uniq('gnew')}@gmail.com`;
    const d = new Device();
    const r = await d.post('/api/auth/google/signup', { idToken: googleToken(email), ...details() });
    assert.equal(r.status, 200, r.text);
    const me = meOf(r);
    assert.equal(me.email, email, 'the email is the one Google proved');
    assert.equal(me.role, 'admin', 'an Owner of their own account, not staff');
    assert.equal(r.json.state.accounts.length, 1, 'a brand-new account of their own');
    assert.equal(r.json.state.accounts[0].owner, me.id);
    assert.equal(r.json.state.events.length, 0, 'nobody else’s functions');
    assert.equal((await d.get('/api/state')).json.me, me.id, 'signed in straight away');
    const back = await google(googleToken(email));
    assert.equal(back.json.me, me.id, 'next time, Continue with Google opens the same account');
  });

  test('Google sign-up refuses what it should', async () => {
    const taken = await newCustomer('Taken Family');
    const cases = {
      'an email that already has a login': [googleToken(taken.email), details(), 409],
      'a mobile another login already uses': [googleToken(`${uniq('m')}@gmail.com`), details({ mobile: taken.mobile }), 409],
      'the Master Admin email': [googleToken(MASTER_EMAIL), details(), 409],
      'an email Google has not verified': [googleToken(`${uniq('u')}@gmail.com`, { email_verified: false }), details(), 403],
      'a token Google did not sign': [googleToken(`${uniq('f')}@gmail.com`, {}, otherKey()), details(), 401],
      'missing details': [googleToken(`${uniq('d')}@gmail.com`), { name: '', mobile: '1', district: '', city: '' }, 400],
    };
    for (const [why, [token, body, want]] of Object.entries(cases)) {
      const d = new Device();
      const r = await d.post('/api/auth/google/signup', { idToken: token, ...body });
      assert.equal(r.status, want, `${why}: got ${r.status} ${r.text}`);
      assert.equal((await d.get('/api/state')).json.me, null, `${why}: no session`);
    }
  });

  test('a photo that is not a real image is dropped at sign-up', async () => {
    const r = await new Device().post('/api/auth/google/signup', { idToken: googleToken(`${uniq('p')}@gmail.com`), ...details({ photo: 'x" onerror="alert(1)' }) });
    assert.equal(r.status, 200, r.text);
    assert.equal(meOf(r).photo, null);
  });

  test('other Moi Point staff cannot reach the staff side through Google', async () => {
    assert.equal((await google(googleToken('finance@moipoint.in'))).status, 403);
  });

  test('F: forged, expired, wrong-project and non-Google tokens are all refused', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cases = {
      'another project': googleToken(MASTER_EMAIL, { aud: 'someone-else' }),
      'another issuer': googleToken(MASTER_EMAIL, { iss: 'https://securetoken.google.com/someone-else' }),
      expired: googleToken(MASTER_EMAIL, { exp: now - 600, iat: now - 4200, auth_time: now - 4200 }),
      'issued in the future': googleToken(MASTER_EMAIL, { iat: now + 3600 }),
      'not signed by Google': googleToken(MASTER_EMAIL, {}, otherKey()),
      'a password sign-in, not Google': googleToken(MASTER_EMAIL, { firebase: { sign_in_provider: 'password' } }),
      'no email': googleToken('', { email: undefined }),
      'garbage text': 'not.a.realtokenatall',
    };
    for (const [why, token] of Object.entries(cases)) {
      const d = new Device();
      const r = await d.post('/api/auth/google', { idToken: token });
      assert.ok([400, 401, 403].includes(r.status), `${why}: got ${r.status}`);
      assert.equal((await d.get('/api/state')).json.me, null, `${why}: no session`);
    }
    const tampered = googleToken(`${uniq('x')}@gmail.com`).split('.');
    tampered[1] = Buffer.from(JSON.stringify({ email: MASTER_EMAIL, email_verified: true })).toString('base64url');
    assert.equal((await google(tampered.join('.'))).status, 401, 'changing the email inside a real token breaks it');
    assert.ok(FIREBASE_PROJECT);
  });

  test('there is exactly one Owner: nobody else can be given or created with that role', async () => {
    const { d } = await googleDevice(MASTER_EMAIL);
    const id = uniq('p');
    const made = await d.pushOne('users', id, { id, name: 'Second Owner', email: `${uniq('o')}@example.com`, role: 'platform', prole: 'owner' });
    assert.equal(made.ok, false, 'a second Owner login');
    const finance = (await d.get('/api/state')).json.state.users.find((u) => u.email === 'finance@moipoint.in');
    const promoted = await d.pushOne('users', finance.id, { ...finance, prole: 'owner' });
    assert.equal(promoted.ok, false, 'promoting existing staff to Owner');
    const sid = uniq('p');
    const support = await d.pushOne('users', sid, { id: sid, name: 'Support Person', email: `${uniq('s')}@example.com`, role: 'platform', prole: 'support' });
    assert.equal(support.ok, true, 'the Owner can still add other staff');
  });

  test('a paused family cannot get in through Google either', async () => {
    const c = await newCustomer('Paused Family');
    const s = await staff();
    const acct = (await s.get('/api/state')).json.state.accounts.find((a) => a.id === c.accountId);
    await s.pushOne('accounts', c.accountId, { ...acct, status: 'suspended' });
    assert.equal((await google(googleToken(c.email))).status, 403);
    await s.pushOne('accounts', c.accountId, { ...acct, status: 'active' });
  });

  test('E: logging out ends a Google session like any other', async () => {
    const { d } = await googleDevice(MASTER_EMAIL);
    await d.post('/api/auth/logout');
    assert.equal((await d.get('/api/state')).json.me, null);
    assert.equal((await d.post('/api/admin/campaign', { aud: 'organizers', ch: 'wa', text: 'x', mobiles: [] })).status, 403);
  });
});

describe('Google sign-in in the browser', () => {
  let browser;
  before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
  after(async () => { await browser.close(); });

  /** A phone with the real app and real page rules, where the Firebase library is a stand-in that returns our token. */
  async function phone(result) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('mp-noob', '1'); localStorage.setItem('moipoint-state', 'Tamil Nadu'); } catch { /* blocked */ } });
    const fb = 'https://www.gstatic.com/firebasejs/10.12.2/';
    await ctx.route(`${fb}firebase-app.js`, (r) => r.fulfill({ contentType: 'text/javascript', body: 'export const getApps=()=>[];export const getApp=()=>({});export const initializeApp=(c)=>{globalThis.__fbConfig=c;return {}};' }));
    const sign = result.code ? `throw Object.assign(new Error('x'),{code:${JSON.stringify(result.code)}})` : `return {user:{getIdToken:async()=>${JSON.stringify(result.token)}}}`;
    await ctx.route(`${fb}firebase-auth.js`, (r) => r.fulfill({ contentType: 'text/javascript', body: `export const getAuth=()=>({});export class GoogleAuthProvider{setCustomParameters(){}};export const signOut=async()=>{globalThis.__fbSignedOut=true};export const signInWithPopup=async()=>{${sign}};` }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(12000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
    const S = (expr) => p.evaluate((x) => (0, eval)(x), expr);
    const until = async (expr, ms = 10000) => {
      const end = Date.now() + ms;
      for (;;) {
        try { if (await S(`!!(${expr})`)) return; } catch { /* still loading */ }
        if (Date.now() > end) assert.fail(`timed out waiting for: ${expr}`);
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    return { ctx, p, S, until, errors, close: () => ctx.close() };
  }
  const tapGoogle = async (d) => {
    await d.p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('[data-act=googleLogin]');
    await d.p.click('[data-act=googleLogin]');
  };
  const toastText = (d) => d.p.evaluate(() => document.getElementById('toast')?.innerText || '');

  test('the existing login page offers Continue with Google, set up from the server', async () => {
    const d = await phone({ token: 'unused' });
    await d.p.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('#l_user');
    assert.equal(await d.p.locator('[data-act=googleLogin]').count(), 1);
    assert.equal(await d.S('MPS.cfg.google.projectId'), FIREBASE_PROJECT);
    await d.close();
  });

  test('the sign-up page offers it too, and an existing account signs straight in from there', async () => {
    const c = await newCustomer('Signup Page Family');
    const d = await phone({ token: googleToken(c.email) });
    await d.p.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('#o_mobile');
    await d.p.waitForSelector('[data-act=googleLogin]');
    await d.p.click('[data-act=googleLogin]');
    await d.until(`location.hash==='#dashboard'&&me&&me.id===${JSON.stringify(c.state.me)}`);
    assert.deepEqual(d.errors, []);
    await d.close();
  });

  test('A and D: the Master Admin lands on /admin, and stays signed in after a reload', async () => {
    const d = await phone({ token: googleToken(MASTER_EMAIL) });
    await tapGoogle(d);
    await d.until(`location.hash==='#admin'&&me&&me.prole==='owner'`);
    await d.p.waitForSelector('.xnav');
    assert.equal(await d.S('globalThis.__fbSignedOut===true'), true, 'Firebase is signed out once Moi Point takes over');
    await d.p.reload({ waitUntil: 'domcontentloaded' });
    await d.until(`MPS.ready&&me&&me.email===${JSON.stringify(MASTER_EMAIL)}&&location.hash.startsWith('#admin')`);
    await d.S('ACT.logout()');
    await d.until('!me&&MPS.ready');
    await d.p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await d.until(`MPS.ready&&!me&&location.hash!=='#admin'`);
    assert.equal(await d.p.locator('.xnav').count(), 0, 'E: after logout, /admin shows nothing of the staff side');
    assert.deepEqual(d.errors, []);
    await d.close();
  });

  test('B and C: another account lands on its dashboard, and typing /admin sends it back there', async () => {
    const c = await newCustomer('Browser Family');
    const d = await phone({ token: googleToken(c.email) });
    await tapGoogle(d);
    await d.until(`location.hash==='#dashboard'&&me&&me.role==='admin'`);
    await d.p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await d.until(`MPS.ready&&me&&location.hash==='#dashboard'`);
    assert.equal(await d.p.locator('.xnav').count(), 0, 'no staff screens');
    assert.deepEqual(d.errors, []);
    await d.close();
  });

  test('F: a closed Google window explains itself and leaves you on the login page', async () => {
    const d = await phone({ code: 'auth/popup-closed-by-user' });
    await tapGoogle(d);
    await d.p.waitForFunction(() => /closed before it finished/.test(document.getElementById('toast')?.innerText || ''));
    assert.equal(await d.S('!me&&location.hash'), '#login');
    assert.equal(await d.p.locator('[data-act=googleLogin]').isEnabled(), true, 'the button works again');
    await d.close();
  });

  test('F: an unverified Google email is refused with a clear message', async () => {
    const d = await phone({ token: googleToken(MASTER_EMAIL, { email_verified: false }) });
    await tapGoogle(d);
    await d.p.waitForFunction(() => /isn’t verified/.test(document.getElementById('toast')?.innerText || ''));
    assert.equal(await d.S('!!me'), false);
    await d.close();
  });

  test('a new person taps Google on sign-up, fills in Your details, and lands in their own new account', async () => {
    const email = `${uniq('fresh')}@gmail.com`;
    const d = await phone({ token: googleToken(email) });
    await d.p.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
    await d.p.waitForSelector('[data-act=googleLogin]');
    await d.p.click('[data-act=googleLogin]');
    await d.p.waitForSelector('form[data-form=signup] #su_mob');
    assert.equal(await d.p.locator('#o_mobile, #otp_code').count(), 0, 'no mobile code step');
    assert.equal(await d.p.inputValue('#su_email'), email);
    assert.equal(await d.p.locator('#su_email').getAttribute('readonly'), '', 'the Google email cannot be changed');
    assert.equal(await d.p.inputValue('#su_name'), 'Google Person');
    assert.equal(await d.p.locator('#su_pw').isVisible(), false, 'no password: they sign in with Google');
    await d.p.fill('#su_mob', mobile());
    await d.p.fill('#su_city', 'Madurai');
    await d.p.check('#su_terms');
    await d.p.click('form[data-form=signup] button.btn-primary');
    await d.until(`location.hash==='#dashboard'&&me&&me.email===${JSON.stringify(email)}&&me.role==='admin'`);
    assert.equal(await d.S('S.accounts.filter(a=>a.owner===me.id).length'), 1, 'their own new account');
    assert.deepEqual(d.errors, []);
    await d.close();
  });

  test('a new person who taps Google on the log-in page gets the same Your details step', async () => {
    const d = await phone({ token: googleToken(`${uniq('fromlogin')}@gmail.com`) });
    await tapGoogle(d);
    await d.until(`location.hash==='#signup'`);
    await d.p.waitForSelector('form[data-form=signup] #su_mob');
    assert.match(await toastText(d), /Add your details/);
    await d.close();
  });
});
