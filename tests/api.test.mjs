// Server rules. Each test here is something a real person might try, on purpose or by accident.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BASE, collector, Device, manager, mobile, moiRecord, newCustomer, owner, staff, uniq, FUTURE } from './helpers.mjs';

const credits = async (d) => {
  const r = await d.get('/api/state');
  return r.json.state.accounts.find((a) => a.id !== 'A0' && (a.owner === r.json.me || a.id === d.accountId)).wallet.credits;
};
const outbox = async () => (await new Device().get('/api/dev/messages')).json.messages;

describe('who can read what', () => {
  test('a visitor who is not logged in sees no private data', async () => {
    const r = await new Device().get('/api/state');
    const s = r.json.state;
    assert.equal(r.json.me, null);
    for (const k of ['users', 'events', 'moi', 'expenses', 'payouts', 'notifications', 'audit']) assert.equal(s[k].length, 0, k);
    assert.equal(s.platform.coupons, undefined);
    assert.equal(s.platform.crm, undefined);
  });

  test('passwords and password hashes never reach a browser', async () => {
    for (const d of [await owner(), await staff()]) {
      const r = await d.get('/api/state');
      assert.ok(!r.text.includes('argon2'), 'hash leaked');
      assert.ok(!r.text.includes('passwordHash'), 'hash field leaked');
    }
  });

  test('a person sees only their own password hint', async () => {
    const r = await (await owner()).get('/api/state');
    const others = r.json.state.users.filter((u) => u.id !== r.json.me);
    assert.ok(others.length > 0);
    assert.ok(others.every((u) => u.pwHint === undefined));
    assert.ok(r.json.state.users.find((u) => u.id === r.json.me).pwHint);
  });

  test('one customer never receives another customer’s data', async () => {
    const a = await newCustomer('Family A');
    const r = await a.get('/api/state');
    const text = r.text;
    assert.equal(r.json.state.events.length, 0);
    assert.equal(r.json.state.moi.length, 0);
    assert.ok(!text.includes('ramesh.kumar@gmail.com'));
    assert.ok(!text.includes('Selvi Valaikappu'));
    const ch = await a.get(`/api/changes?since=0&scope=${encodeURIComponent(r.json.scope)}`);
    assert.ok(!ch.text.includes('ramesh.kumar@gmail.com'));
  });

  test('a Moi Collector only sees the events they work on', async () => {
    const c = await collector();
    assert.deepEqual(c.state.state.events.map((e) => e.id).sort(), ['e1', 'e4']);
    assert.ok(c.state.state.moi.every((m) => ['e1', 'e4'].includes(m.event_id)));
    assert.equal(c.state.state.msgLog.length, 0);
    assert.equal(c.state.state.accounts[0].wallet.purchases.length, 0);
  });

  test('the public event page hides the bank account', async () => {
    const o = await owner();
    const ev = o.state.state.events.find((e) => e.id === 'e2');
    await o.pushOne('events', 'e2', { ...ev, bank: { holder: 'X', last4: '1234', ifsc: 'SBIN0001234', linked: true } });
    const r = await new Device().get('/api/public/event/EV003');
    assert.equal(r.json.event.no, 'EV003');
    assert.equal(r.json.event.bank, undefined);
    assert.equal(r.json.account.wallet.credits, 0);
  });

  test('the receipt check page hides the full mobile number', async () => {
    const o = await owner();
    const m = o.state.state.moi.find((x) => x.c.mobile);
    const r = await new Device().get(`/api/public/receipt?code=${encodeURIComponent(m.code)}`);
    assert.equal(r.json.moi.code, m.code);
    assert.ok(!r.text.includes(m.c.mobile), 'full mobile leaked');
    assert.equal(r.json.moi.shot, undefined);
  });
});

describe('who can change what', () => {
  test('a forged request from another website is refused', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 403);
  });

  test('one customer cannot change another customer’s Moi', async () => {
    const a = await newCustomer();
    const o = await owner();
    const victim = o.state.state.moi[0];
    const r = await a.pushOne('moi', victim.id, { ...victim, amount: 1 });
    assert.equal(r.ok, false);
    const after = (await o.get('/api/state')).json.state.moi.find((m) => m.id === victim.id);
    assert.equal(after.amount, victim.amount);
  });

  test('one customer cannot add entries to another customer’s event', async () => {
    const a = await newCustomer();
    const r = await a.pushOne('moi', uniq('m'), moiRecord('e2'));
    assert.equal(r.ok, false);
  });

  test('one customer cannot create an event inside another account', async () => {
    const a = await newCustomer();
    const r = await a.pushOne('events', uniq('e'), { name: 'Sneaky', acc: 'A1001', date: FUTURE, status: 'active' });
    assert.equal(r.ok, false);
  });

  test('one customer cannot spend another customer’s credits', async () => {
    const a = await newCustomer();
    const r = await a.pushOne('notifications', uniq('n'), { eid: 'e2', channel: 'WhatsApp', to: '9876512345', text: 'spam', status: 'Sent', at: Date.now() });
    assert.equal(r.ok, false);
  });

  test('nobody can give themselves credits', async () => {
    const a = await newCustomer();
    const before = await credits(a);
    const acct = a.state.state.accounts[0];
    await a.pushOne('accounts', acct.id, { ...acct, wallet: { ...acct.wallet, credits: 99999, batches: [{ id: 'b', qty: 99999, left: 99999, at: '2026-01-01', exp: '2099-01-01', kind: 'x' }] } });
    assert.equal(await credits(a), before);
  });

  test('nobody can upgrade their own plan or unsuspend themselves', async () => {
    const a = await newCustomer();
    const acct = a.state.state.accounts[0];
    const r = await a.pushOne('accounts', acct.id, { ...acct, plan: 'pro', status: 'active', name: 'Renamed Family' });
    assert.equal(r.ok, true);
    assert.equal(r.data.plan, 'free');
    assert.equal(r.data.name, 'Renamed Family');
  });

  test('a person cannot make themselves Moi Point staff', async () => {
    const a = await newCustomer();
    const me = a.state.state.users.find((u) => u.id === a.state.me);
    await a.pushOne('users', me.id, { ...me, role: 'platform', prole: 'owner' });
    const r = await a.get('/api/state');
    assert.equal(r.json.state.users.find((u) => u.id === me.id).role, 'admin');
    assert.equal((await a.post('/api/admin/campaign', { aud: 'organizers', ch: 'wa', text: 'x', mobiles: [] })).status, 403);
  });

  test('customers cannot change prices', async () => {
    const o = await owner();
    await o.push([], [], { platform: { pricing: { perMsg: 0.01 } } });
    const r = await new Device().get('/api/state');
    assert.equal(r.json.state.platform.pricing.perMsg, 2);
  });

  test('the activity log can be added to but never rewritten', async () => {
    const o = await owner();
    const id = uniq('l');
    await o.pushOne('audit', id, { id, at: new Date().toISOString(), user: 'x', action: 'Original', detail: '' });
    const r = await o.pushOne('audit', id, { id, action: 'Changed' });
    assert.equal(r.data.action, 'Original');
  });
});

describe('helper permissions', () => {
  test('a Moi Collector can record Moi on their event', async () => {
    const c = await collector();
    const r = await c.pushOne('moi', uniq('m'), moiRecord('e1'));
    assert.equal(r.ok, true);
  });

  test('a Moi Collector cannot record Moi on an event they are not on', async () => {
    const c = await collector();
    assert.equal((await c.pushOne('moi', uniq('m'), moiRecord('e2'))).ok, false);
  });

  test('a Moi Collector cannot verify a payment', async () => {
    const o = await owner();
    const m = moiRecord('e1', { mode: 'upi', status: 'pending' });
    await o.pushOne('moi', m.id, m);
    const c = await collector();
    const r = await c.pushOne('moi', m.id, { ...m, status: 'verified' });
    assert.equal(r.ok, false);
    assert.equal(r.data.status, 'pending');
  });

  test('a Moi Collector cannot edit or void an entry', async () => {
    const o = await owner();
    const m = moiRecord('e1');
    const made = await o.pushOne('moi', m.id, m);
    const c = await collector();
    assert.equal((await c.pushOne('moi', m.id, { ...made.data, amount: 5 })).ok, false);
    assert.equal((await c.pushOne('moi', m.id, { ...made.data, status: 'void' })).ok, false);
  });

  test('a Moi Collector can take cash for a waiting QR entry', async () => {
    const o = await owner();
    const m = moiRecord('e1', { status: 'tocollect' });
    const made = await o.pushOne('moi', m.id, m);
    const c = await collector();
    assert.equal((await c.pushOne('moi', m.id, { ...made.data, status: 'received' })).ok, true);
  });

  test('an Event Admin can verify a payment on their event', async () => {
    const o = await owner();
    const m = moiRecord('e2', { mode: 'upi', status: 'pending' });
    const made = await o.pushOne('moi', m.id, m);
    const d = await manager();
    assert.equal((await d.pushOne('moi', m.id, { ...made.data, status: 'verified' })).ok, true);
  });

  test('a Moi Collector cannot add expenses', async () => {
    const c = await collector();
    assert.equal((await c.pushOne('expenses', uniq('x'), { event_id: 'e1', amount: 100, category: 'Food' })).ok, false);
  });

  test('only the owner can add a login, and the new helper can then log in', async () => {
    const c = await collector();
    const email = `${uniq('h')}@example.com`;
    const id = uniq('u');
    const user = { id, acc: 'A1001', name: 'New Helper', email, mobile: mobile(), username: email, role: 'collector', status: 'active' };
    assert.equal((await c.pushOne('users', id, user)).ok, false);
    const o = await owner();
    const r = await o.push([{ col: 'users', id, data: user }], [], { pw: { [id]: 'Helper12345' } });
    assert.equal(r.json.results[0].ok, true);
    await new Device().login(email, 'Helper12345');
  });

  test('the same email cannot be used twice', async () => {
    const o = await owner();
    const id = uniq('u');
    const r = await o.pushOne('users', id, { id, acc: 'A1001', name: 'Dup', email: 'divya.sankar@gmail.com', mobile: mobile(), username: 'divya.sankar@gmail.com', role: 'collector', status: 'active' });
    assert.equal(r.ok, false);
    assert.match(r.reason, /already/);
  });

  test('a helper’s access ends when their access window ends', async () => {
    const o = await owner();
    const link = o.state.state.eventUsers.find((x) => x.user_id === 'u4');
    await o.pushOne('eventUsers', link.id, { ...link, access: { mode: 'custom', from: '2020-01-01', to: '2020-01-02' } });
    const r = await new Device().post('/api/auth/login', { email: 'suresh.k@gmail.com', password: 'suresh123' });
    assert.equal(r.status, 403);
    assert.match(r.json.error, /access to these events has ended/);
    await o.pushOne('eventUsers', link.id, { ...link, access: { mode: 'always' } });
  });
});

describe('receipt numbers', () => {
  test('two phones saving at the same moment never share a number', async () => {
    const a = await owner();
    const b = await manager();
    const code = 'EV003/777';
    const [m1, m2] = [moiRecord('e2', { code }), moiRecord('e2', { code })];
    const [r1, r2] = await Promise.all([a.pushOne('moi', m1.id, m1), b.pushOne('moi', m2.id, m2)]);
    assert.equal(r1.ok && r2.ok, true);
    assert.notEqual(r1.data.code, r2.data.code);
    assert.match(r1.data.code, /^EV003\/\d+$/);
    assert.match(r2.data.code, /^EV003\/\d+$/);
  });

  test('twenty entries at once all get different numbers', async () => {
    const devices = await Promise.all([owner(), manager()]);
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => {
      const m = moiRecord('e2', { code: 'EV003/500' });
      return devices[i % 2].pushOne('moi', m.id, m);
    }));
    const codes = results.map((r) => r.data.code);
    assert.equal(new Set(codes).size, 20);
  });

  test('a receipt number cannot be changed afterwards', async () => {
    const o = await owner();
    const m = o.state.state.moi[0];
    const r = await o.pushOne('moi', m.id, { ...m, code: 'EV999/001' });
    assert.equal(r.data.code, m.code);
  });

  test('a new event always gets the next number from the server', async () => {
    const a = await newCustomer();
    const b = await newCustomer();
    const mk = (d) => { const id = uniq('e'); return d.pushOne('events', id, { id, no: 'EV001', acc: d.accountId, name: 'My Function', date: '2026-12-25', status: 'active', token: uniq('t') }); };
    const [e1, e2] = [await mk(a), await mk(b)];
    assert.notEqual(e1.data.no, e2.data.no);
    assert.notEqual(e1.data.no, 'EV001');
  });
});

describe('credits and messages', () => {
  const send = (d, eid, over = {}) => {
    const id = uniq('n');
    return { id, res: d.pushOne('notifications', id, { id, eid, channel: 'WhatsApp', to: '9876512345', text: `Test ${id}`, status: 'Sent', at: Date.now(), trigger: 'C1', ...over }) };
  };
  const event = async (d) => {
    const id = uniq('e');
    const r = await d.pushOne('events', id, { id, acc: d.accountId, name: 'Fn', date: FUTURE, status: 'active', token: uniq('t') });
    return r.data;
  };

  test('a new customer starts with 20 welcome credits', async () => {
    assert.equal(await credits(await newCustomer()), 20);
  });

  test('a new event adds 20 free credits, once', async () => {
    const a = await newCustomer();
    const id = uniq('e');
    const ev = { id, acc: a.accountId, name: 'Fn', date: FUTURE, status: 'active', token: uniq('t'), freeCr: 20 };
    const made = await a.pushOne('events', id, ev);
    assert.equal(await credits(a), 40);
    await a.pushOne('events', id, { ...made.data, desc: 'edited' });
    assert.equal(await credits(a), 40);
  });

  test('a message costs one credit and reaches the outbox', async () => {
    const a = await newCustomer();
    const ev = await event(a);
    const { id, res } = send(a, ev.id);
    assert.equal((await res).data.status, 'Sent');
    assert.equal(await credits(a), 19);
    const m = (await outbox()).find((x) => x.notificationId === id);
    assert.equal(m.channel, 'WhatsApp');
    assert.equal(m.trigger, 'C1');
    assert.equal(m.paidBy, 'customer');
  });

  test('sending the same message twice charges once and sends once', async () => {
    const a = await newCustomer();
    const ev = await event(a);
    const { id, res } = send(a, ev.id);
    const first = await res;
    await a.pushOne('notifications', id, first.data);
    await a.pushOne('notifications', id, { ...first.data, status: 'Sent' });
    assert.equal(await credits(a), 19);
    assert.equal((await outbox()).filter((x) => x.notificationId === id).length, 1);
  });

  test('with no credits the message is not sent and the Moi is still saved', async () => {
    const a = await newCustomer();
    const ev = await event(a);
    for (let i = 0; i < 20; i++) await send(a, ev.id).res;
    assert.equal(await credits(a), 0);
    const m = moiRecord(ev.id);
    assert.equal((await a.pushOne('moi', m.id, m)).ok, true);
    const { id, res } = send(a, ev.id);
    assert.equal((await res).data.status, 'Not sent · no credits');
    assert.equal((await outbox()).filter((x) => x.notificationId === id).length, 0);
    assert.equal(await credits(a), 0);
  });

  test('a receipt quotes the final number if the server had to change it', async () => {
    const o = await owner();
    const clash = moiRecord('e2', { code: 'EV003/888' });
    await o.pushOne('moi', clash.id, clash);
    const m = moiRecord('e2', { code: 'EV003/888' });
    const nid = uniq('n');
    const r = await o.push([
      { col: 'moi', id: m.id, data: m },
      { col: 'notifications', id: nid, data: { id: nid, eid: 'e2', channel: 'WhatsApp', to: '9876512345', text: 'Receipt EV003/888. Thank you!', status: 'Sent', at: Date.now(), mid: m.id } },
    ]);
    const final = r.json.results.find((x) => x.col === 'moi').data.code;
    assert.notEqual(final, 'EV003/888');
    const sent = (await outbox()).find((x) => x.notificationId === nid);
    assert.ok(sent.text.includes(final), sent.text);
  });

  test('buying credits uses the server’s price, whatever the browser says', async () => {
    const a = await newCustomer();
    const r = await a.post('/api/credits/purchase', { accountId: a.accountId, qty: 100, price: 1, total: 1 });
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 200);
    assert.equal(await credits(a), 120);
  });

  test('a discount code is applied by the server, and a fake one is refused', async () => {
    const a = await newCustomer();
    assert.equal((await a.post('/api/credits/purchase', { accountId: a.accountId, qty: 100, code: 'FREEMONEY' })).status, 400);
    const r = await a.post('/api/credits/purchase', { accountId: a.accountId, qty: 100, code: 'MUHURTHAM20' });
    assert.equal(r.json.total, 160);
  });

  test('you cannot buy credits for someone else’s account', async () => {
    const a = await newCustomer();
    assert.equal((await a.post('/api/credits/purchase', { accountId: 'A1001', qty: 100 })).status, 403);
  });
});

describe('codes and passwords', () => {
  test('a wrong password and an unknown email give the same answer', async () => {
    const a = await new Device().post('/api/auth/login', { email: 'ramesh.kumar@gmail.com', password: 'wrong' });
    const b = await new Device().post('/api/auth/login', { email: 'nobody@nowhere.com', password: 'wrong' });
    assert.equal(a.status, 401);
    assert.equal(a.text, b.text);
  });

  test('a sign-up code locks after five wrong tries', async () => {
    const d = new Device();
    const m = mobile();
    const { json } = await d.post('/api/auth/signup/otp', { mobile: m });
    for (let i = 0; i < 5; i++) await d.post('/api/auth/signup/verify', { mobile: m, code: '000000' });
    const r = await d.post('/api/auth/signup/verify', { mobile: m, code: json.devCode });
    assert.equal(r.status, 429);
  });

  test('a code works only once', async () => {
    const d = new Device();
    const m = mobile();
    const { json } = await d.post('/api/auth/signup/otp', { mobile: m });
    assert.equal((await d.post('/api/auth/signup/verify', { mobile: m, code: json.devCode })).status, 200);
    assert.equal((await d.post('/api/auth/signup/verify', { mobile: m, code: json.devCode })).status, 400);
  });

  test('sign-up needs a confirmed mobile', async () => {
    const r = await new Device().post('/api/auth/signup', { mobile: mobile(), ticket: 'fake', name: 'X', email: `${uniq('e')}@example.com`, password: 'Testpass123' });
    assert.equal(r.status, 401);
  });

  test('a code cannot be requested again within 30 seconds', async () => {
    const d = new Device();
    const m = mobile();
    await d.post('/api/auth/signup/otp', { mobile: m });
    assert.equal((await d.post('/api/auth/signup/otp', { mobile: m })).status, 429);
  });

  test('a mobile that already owns an account cannot sign up again', async () => {
    const r = await new Device().post('/api/auth/signup/otp', { mobile: '9840012345' });
    assert.equal(r.status, 409);
    assert.equal(r.json.login, true);
  });

  async function resetFlow(email, mob) {
    const d = new Device();
    const s = await d.post('/api/auth/forgot/send', { email, mobile: mob });
    const v = await d.post('/api/auth/forgot/verify', { email, code: s.json.devCode });
    return { d, ticket: v.json.ticket };
  }

  test('forgot password: wrong mobile is refused and no code goes out', async () => {
    const a = await newCustomer();
    const before = (await outbox()).length;
    const r = await new Device().post('/api/auth/forgot/send', { email: a.email, mobile: mobile() });
    assert.equal(r.status, 400);
    assert.equal((await outbox()).length, before);
  });

  test('forgot password works, logs in, and ends every old session', async () => {
    const a = await newCustomer();
    assert.equal((await a.get('/api/state')).json.me !== null, true);
    const { d, ticket } = await resetFlow(a.email, a.mobile);
    const r = await d.post('/api/auth/reset', { email: a.email, ticket, password: 'Brandnew123' });
    assert.equal(r.json.loggedIn, true);
    assert.equal((await a.get('/api/state')).json.me, null, 'old session must end');
    await new Device().login(a.email, 'Brandnew123');
    assert.equal((await new Device().post('/api/auth/login', { email: a.email, password: 'Testpass123' })).status, 401);
  });

  test('a reset ticket works once and only for its own account', async () => {
    const a = await newCustomer();
    const b = await newCustomer();
    const { d, ticket } = await resetFlow(a.email, a.mobile);
    assert.equal((await d.post('/api/auth/reset', { email: b.email, ticket, password: 'Hacked12345' })).status, 401);
    assert.equal((await d.post('/api/auth/reset', { email: a.email, ticket, password: 'Newpass1234' })).json.loggedIn, true);
    assert.equal((await d.post('/api/auth/reset', { email: a.email, ticket, password: 'Again123456' })).status, 401);
  });

  test('changing a password needs the current one', async () => {
    const a = await newCustomer();
    assert.equal((await a.post('/api/auth/password', { current: 'wrong', password: 'Another123' })).status, 400);
    assert.equal((await a.post('/api/auth/password', { current: 'Testpass123', password: 'Another123' })).status, 200);
    await new Device().login(a.email, 'Another123');
  });

  test('a helper cannot change their own password', async () => {
    assert.equal((await (await collector()).post('/api/auth/password', { current: 'raj123', password: 'Mine12345' })).status, 403);
  });
});

describe('guest QR page', () => {
  async function guest(key = 'e2') {
    const d = new Device();
    const m = mobile();
    const s = await d.post('/api/public/otp/send', { eventId: key, mobile: m });
    const v = await d.post('/api/public/otp/verify', { eventId: key, mobile: m, code: s.json.devCode });
    return { d, m, ticket: v.json.ticket };
  }
  const entry = (g, over = {}) => ({ eventId: 'e2', mobile: g.m, ticket: g.ticket, mode: 'cash', amount: 501, c: { name: 'QR Guest', place: 'Madurai', relationship: 'Friend' }, ...over });

  test('a guest entry needs a confirmed mobile', async () => {
    const r = await new Device().post('/api/public/moi', { eventId: 'e2', mobile: mobile(), ticket: 'fake', mode: 'cash', amount: 501, c: { name: 'X' } });
    assert.equal(r.status, 401);
  });

  test('a guest cannot use someone else’s confirmed mobile', async () => {
    const g = await guest();
    const r = await g.d.post('/api/public/moi', entry(g, { mobile: mobile() }));
    assert.equal(r.status, 401);
  });

  test('a cash entry waits at the counter and appears for the family', async () => {
    const o = await owner();
    const g = await guest();
    const r = await g.d.post('/api/public/moi', entry(g));
    assert.equal(r.json.moi.status, 'tocollect');
    assert.equal(r.json.moi.collected_by, 'qr');
    assert.match(r.json.moi.code, /^EV003\/\d+$/);
    const seen = (await o.get('/api/state')).json.state.moi.find((m) => m.id === r.json.moi.id);
    assert.equal(seen.status, 'tocollect');
  });

  test('the guest code and status message are charged to the family and reach the outbox', async () => {
    const o = await owner();
    const before = (await o.get('/api/state')).json.state.accounts[0].wallet.credits;
    const g = await guest();
    const r = await g.d.post('/api/public/moi', entry(g));
    const after = (await o.get('/api/state')).json.state.accounts[0].wallet.credits;
    assert.equal(before - after, 2);
    const list = await outbox();
    assert.ok(list.some((m) => m.trigger === 'C8' && m.to === g.m));
    assert.ok(list.some((m) => m.trigger === 'C5' && m.to === g.m && m.text.includes(r.json.moi.code)));
  });

  test('the code never appears in the family’s notification list', async () => {
    const o = await owner();
    const g = await guest();
    const list = await outbox();
    const code = list.find((m) => m.trigger === 'C8' && m.to === g.m).vars.otp;
    const r = await o.get('/api/state');
    assert.ok(!r.json.state.notifications.some((n) => String(n.text).includes(code)));
  });

  test('a switched-off payment mode is refused', async () => {
    const a = await newCustomer();
    const id = uniq('e');
    await a.pushOne('events', id, { id, acc: a.accountId, name: 'Fn', date: FUTURE, status: 'active', token: uniq('t'), lang: 'en', qrModes: { cash: 1, upi: 0, online: 0 } });
    const g = await guest(id);
    const r = await g.d.post('/api/public/moi', { ...entry(g), eventId: id, mode: 'upi', utr: '123456789012' });
    assert.equal(r.status, 400);
  });

  test('a void event takes no entries', async () => {
    const a = await newCustomer();
    const id = uniq('e');
    await a.pushOne('events', id, { id, acc: a.accountId, name: 'Fn', date: FUTURE, status: 'void', token: uniq('t') });
    const g = await guest(id);
    assert.equal((await g.d.post('/api/public/moi', { ...entry(g), eventId: id })).status, 400);
  });

  test('with no credits the guest is sent to the counter', async () => {
    const a = await newCustomer();
    const id = uniq('e');
    const ev = await a.pushOne('events', id, { id, acc: a.accountId, name: 'Fn', date: FUTURE, status: 'active', token: uniq('t') });
    for (let i = 0; i < 20; i++) { const n = uniq('n'); await a.pushOne('notifications', n, { id: n, eid: ev.data.id, channel: 'SMS', to: '9876512345', text: 'x', status: 'Sent', at: Date.now() }); }
    const r = await new Device().post('/api/public/otp/send', { eventId: id, mobile: mobile() });
    assert.equal(r.status, 402);
    assert.match(r.json.error, /counter/);
  });
});

describe('Moi Point staff', () => {
  test('staff see every account, and a customer’s login stops them seeing it', async () => {
    const a = await newCustomer('Staff Sees This');
    const s = await staff();
    const r = await s.get('/api/state');
    assert.ok(r.json.state.accounts.some((x) => x.id === a.accountId));
    assert.equal((await a.post('/api/admin/impersonate', { userId: 'u1' })).status, 403);
  });

  test('support view opens a customer’s account and returns to staff', async () => {
    const s = await staff();
    const r = await s.post('/api/admin/impersonate', { userId: 'u1' });
    assert.equal(r.json.me, 'u1');
    assert.equal(r.json.imp, 'p1');
    assert.equal((await s.get('/api/state')).json.imp, 'p1');
    const back = await s.post('/api/admin/impersonate/exit');
    assert.equal(back.json.me, 'p1');
  });

  test('a suspended customer cannot log in', async () => {
    const a = await newCustomer();
    const s = await staff();
    const acct = (await s.get('/api/state')).json.state.accounts.find((x) => x.id === a.accountId);
    await s.pushOne('accounts', a.accountId, { ...acct, status: 'suspended' });
    const r = await new Device().post('/api/auth/login', { email: a.email, password: 'Testpass123' });
    assert.equal(r.status, 403);
    assert.match(r.json.error, /paused/);
  });

  test('staff can change prices and every device sees it', async () => {
    const s = await staff();
    const pricing = (await s.get('/api/state')).json.state.platform.pricing;
    await s.push([], [], { platform: { pricing: { ...pricing, perMsg: 3 } } });
    assert.equal((await new Device().get('/api/state')).json.state.platform.pricing.perMsg, 3);
    await s.push([], [], { platform: { pricing } });
  });

  test('guests who never agreed get no promotions, even if staff try', async () => {
    const s = await staff();
    const m = '9876500777';
    const before = (await outbox()).filter((x) => x.to === m).length;
    const r = await s.post('/api/admin/campaign', { aud: 'guests', ch: 'wa', text: 'Offer', mobiles: [m] });
    assert.equal(r.json.sent, 0);
    assert.equal(r.json.skipped, 1);
    assert.equal((await outbox()).filter((x) => x.to === m).length, before);
  });
});

describe('work that runs on time', () => {
  test('a due reminder sends once, even if the job runs twice', async () => {
    const o = await owner();
    const id = uniq('r');
    await o.pushOne('reminders', id, { id, owner: 'u1', title: uniq('Wedding'), date: '2020-01-01', at: '09:00', before: '0', via: { wa: true, sms: false }, status: 'open', amount: 501 });
    const dev = new Device();
    await dev.post('/api/dev/run-jobs');
    await dev.post('/api/dev/run-jobs');
    const r = (await o.get('/api/state')).json.state.reminders.find((x) => x.id === id);
    assert.equal(r.sent, true);
    assert.equal((await outbox()).filter((m) => m.trigger === 'C10' && m.text.includes(r.title)).length, 1);
  });

  test('the Moi Book goes out once after a function ends', async () => {
    const a = await newCustomer();
    const id = uniq('e');
    const ev = await a.pushOne('events', id, { id, acc: a.accountId, name: uniq('Past Function'), date: '2020-01-01', start: '10:00', end: '12:00', status: 'active', token: uniq('t'), orgMobile: a.mobile });
    const m = moiRecord(id);
    await a.pushOne('moi', m.id, m);
    const dev = new Device();
    await dev.post('/api/dev/run-jobs');
    await dev.post('/api/dev/run-jobs');
    const after = (await a.get('/api/state')).json.state.events.find((e) => e.id === id);
    assert.ok(after.bookSent);
    assert.equal(after.status, 'completed');
    const books = (await outbox()).filter((x) => x.trigger === 'M4' && x.text.includes(ev.data.name));
    assert.equal(books.filter((b) => b.channel === 'WhatsApp').length, 1);
    assert.equal(books[0].paidBy, 'platform');
    const pdf = await fetch(books[0].media.document.url);
    assert.equal(pdf.status, 200);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF', 'must be a real PDF');
    assert.ok(bytes.length > 5000, 'must have content');
  });
});

describe('robustness', () => {
  test('a render pass works once, and a guessed one gets nothing', async () => {
    assert.equal((await new Device().get('/api/render/state?token=guess')).status, 404);
  });

  test('one bad record does not block the rest of a batch', async () => {
    const o = await owner();
    const good = moiRecord('e2');
    const bad = moiRecord('e2', { amount: 'not a number', c: null });
    const r = await o.push([{ col: 'moi', id: bad.id, data: bad }, { col: 'moi', id: good.id, data: good }]);
    assert.equal(r.status, 200);
    assert.equal(r.json.results.find((x) => x.id === good.id).ok, true);
  });

  test('photos are stored as files, not inside the database record', async () => {
    const o = await owner();
    const png = `data:image/png;base64,${Buffer.alloc(3000, 7).toString('base64')}`;
    const m = moiRecord('e2', { shot: png });
    const r = await o.pushOne('moi', m.id, m);
    assert.match(r.data.shot, /^\/uploads\/.+\.png$/);
    assert.equal((await fetch(BASE + r.data.shot)).status, 200);
  });

  test('a device is told to reload everything when its access changes', async () => {
    const d = await manager();
    const r = await d.get(`/api/changes?since=0&scope=stale`);
    assert.equal(r.json.full, true);
  });
});
