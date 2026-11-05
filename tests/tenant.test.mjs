// Tenants: every family's data stays inside that family, and every helper sees only the functions they work on.
// Two families are built with the same kinds of records. Each then tries to read, change and delete the other's,
// by every route a device has. Their own data must come out exactly as it went in.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { BASE, Device, FUTURE, mobile, moiRecord, newCustomer, staff, uniq } from './helpers.mjs';

const COLS = ['users', 'accounts', 'events', 'eventUsers', 'moi', 'expenses', 'payouts', 'guests', 'ggroups', 'reminders', 'msgLog', 'notifications', 'audit'];
const ALL_PERMS = { list: 1, edit: 1, void: 1, exp: 1, pay: 1, verify: 1, rep: 1, out: 0 };

/** A whole family: two functions, a collector on the first, an Event Admin on the second, and records of every kind. */
async function buildFamily(name) {
  const o = await newCustomer(name);
  const t = { name, o, acc: o.accountId, ids: {}, mobiles: [] };
  const add = (col, id) => (t.ids[col] ??= []).push(id);
  for (const label of ['first', 'second']) {
    const id = uniq('e');
    const r = await o.pushOne('events', id, { id, acc: t.acc, name: `${name} ${label}`, date: FUTURE, status: 'active', token: uniq('t'), bank: { ac: '1234567890', ifsc: 'SBIN0000001' }, orgEmail: `${uniq('org')}@example.com` });
    assert.equal(r.ok, true);
    t[label] = { id, no: r.data.no };
    add('events', id);
    for (let i = 0; i < 2; i++) {
      const guestMobile = mobile();
      t.mobiles.push(guestMobile);
      const m = moiRecord(id, { code: `${r.data.no}/00${i + 1}`, c: { name: `${name} Guest ${label} ${i}`, mobile: guestMobile, place: 'Madurai', relationship: 'Friend', address: `${name} private address` } });
      await o.pushOne('moi', m.id, m);
      add('moi', m.id);
      await o.post('/api/sync', { upserts: [], deletes: [], people: { [guestMobile]: { mobile: guestMobile, name: m.c.name, place: 'Madurai', address: m.c.address, rel: 'Friend', at: Date.now() } } });
    }
    const ex = uniq('x');
    await o.pushOne('expenses', ex, { id: ex, event_id: id, amount: 500, what: `${name} hall`, category: 'Hall' });
    add('expenses', ex);
    const po = uniq('p');
    await o.pushOne('payouts', po, { id: po, event_id: id, amount: 200, to: `${name} receiver`, purpose: 'Cook', mode: 'cash' });
    add('payouts', po);
    const n = uniq('n');
    await o.pushOne('notifications', n, { id: n, eid: id, channel: 'In app', to: 'You', text: `${name} note`, status: 'Sent', at: Date.now() });
    add('notifications', n);
    const l = uniq('l');
    await o.pushOne('audit', l, { id: l, eid: id, action: 'Test', detail: `${name} log`, at: new Date().toISOString() });
    add('audit', l);
  }
  const g = uniq('g');
  await o.pushOne('guests', g, { id: g, acc: t.acc, name: `${name} invited guest`, mobile: mobile() });
  add('guests', g);
  const gg = uniq('gg');
  await o.pushOne('ggroups', gg, { id: gg, acc: t.acc, name: `${name} group` });
  add('ggroups', gg);
  const rm = uniq('rm');
  await o.pushOne('reminders', rm, { id: rm, owner: o.state.me, title: `${name} reminder`, person: 'Someone', date: FUTURE, at: '09:00', before: '0', via: { wa: false, sms: false }, status: 'upcoming' });
  add('reminders', rm);
  const ml = uniq('ml');
  await o.pushOne('msgLog', ml, { id: ml, acc: t.acc, ev: t.first.id, kind: 'invite', recips: [], at: Date.now() });
  add('msgLog', ml);
  t.collector = await helper(t, t.first.id, 'collector');
  t.manager = await helper(t, t.second.id, 'manager', ALL_PERMS);
  t.ids.users = [o.state.me, t.collector.userId, t.manager.userId];
  t.ids.accounts = [t.acc];
  t.ids.eventUsers = [t.collector.linkId, t.manager.linkId];
  return t;
}

async function helper(t, eventId, role, perm) {
  const userId = uniq('u');
  const email = `${uniq(role)}@example.com`;
  await t.o.post('/api/sync', { upserts: [{ col: 'users', id: userId, data: { id: userId, acc: t.acc, name: `${t.name} ${role}`, email, mobile: mobile(), username: email, role } }], deletes: [], pw: { [userId]: 'Helper1234' } });
  const linkId = uniq('a');
  const r = await t.o.pushOne('eventUsers', linkId, { id: linkId, event_id: eventId, user_id: userId, role, access: { mode: 'always' }, ...(perm ? { perm } : {}) });
  assert.equal(r.ok, true);
  const d = new Device();
  await d.login(email, 'Helper1234');
  return { d, userId, linkId, email };
}

/** Every record a device can see, as id lists per collection, plus the guest numbers. */
async function seen(d) {
  const r = await d.get('/api/state');
  const s = r.json.state;
  const out = {};
  for (const c of COLS) out[c] = new Set((s[c] ?? []).map((x) => x.id));
  out.people = new Set(Object.keys(s.people ?? {}));
  out.raw = s;
  return out;
}

/** The family's own records exactly as the owner sees them, to prove nothing changed. */
async function snapshot(t) {
  const s = (await t.o.get('/api/state')).json.state;
  const pick = {};
  for (const c of COLS) {
    const mine = new Set(t.ids[c] ?? []);
    pick[c] = (s[c] ?? []).filter((x) => mine.has(x.id)).map((x) => JSON.stringify(x)).sort();
  }
  pick.people = t.mobiles.map((m) => JSON.stringify(s.people[m] ?? null));
  return pick;
}

const none = (set, ids, what) => {
  const leaked = (ids ?? []).filter((id) => set.has(id));
  assert.deepEqual(leaked, [], `${what} leaked: ${leaked.join(', ')}`);
};

/** Opens the live-update channel and counts the pings it receives. */
async function listen(d) {
  const ctl = new AbortController();
  const res = await fetch(`${BASE}/api/stream`, { headers: { cookie: d.cookie }, signal: ctl.signal });
  const got = [];
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split('\n')) if (line.startsWith('data:')) got.push(line);
      }
    } catch { /* closed */ }
  })();
  return { got, stop: () => ctl.abort() };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('tenants: each family is sealed off from every other', () => {
  let A;
  let B;
  let beforeA;
  let beforeB;

  before(async () => {
    A = await buildFamily('Alpha');
    B = await buildFamily('Beta');
    beforeA = await snapshot(A);
    beforeB = await snapshot(B);
  });

  test('both families were built in full', () => {
    for (const t of [A, B]) {
      for (const c of COLS) assert.ok((t.ids[c] ?? []).length > 0, `${t.name} has no ${c}`);
      for (const [c, ids] of Object.entries(t.ids)) assert.equal(beforeOf(t)[c].length, ids.length, `${t.name}: ${c} not all saved`);
    }
  });
  const beforeOf = (t) => (t === A ? beforeA : beforeB);

  test('an owner sees everything of their own family and nothing of the other', async () => {
    for (const [me, other] of [[A, B], [B, A]]) {
      const s = await seen(me.o);
      for (const c of COLS) {
        none(s[c], other.ids[c], `${other.name} ${c} to ${me.name}'s owner`);
        for (const id of me.ids[c] ?? []) assert.ok(s[c].has(id), `${me.name}'s owner can't see own ${c} ${id}`);
      }
      none(s.people, other.mobiles, `${other.name}'s guest numbers`);
      assert.ok(!JSON.stringify(s.raw).includes(`${other.name} private address`), 'another family’s guest address showed up');
    }
  });

  test('the change feed leaks nothing either, from the very first change', async () => {
    for (const [me, other] of [[A, B], [B, A]]) {
      const st = (await me.o.get('/api/state')).json;
      const r = (await me.o.get(`/api/changes?since=0&scope=${encodeURIComponent(st.scope)}`)).json;
      const ids = new Set(r.changes.map((c) => c.id));
      for (const c of COLS) none(ids, other.ids[c], `${other.name} ${c} in the change feed`);
      none(new Set(Object.keys(r.people)), other.mobiles, 'guest numbers in the change feed');
    }
  });

  test('a collector sees only the one function they work on', async () => {
    for (const [me, other] of [[A, B], [B, A]]) {
      const s = await seen(me.collector.d);
      assert.deepEqual([...s.events], [me.first.id]);
      none(s.events, [me.second.id], 'the other function of the same family');
      const secondMoi = s.raw.moi.filter((m) => m.event_id === me.second.id);
      assert.deepEqual(secondMoi, [], 'Moi from a function they do not work on');
      assert.equal(s.msgLog.size, 0, 'a collector does not see the message log');
      for (const c of COLS) none(s[c], other.ids[c], `${other.name} ${c} to ${me.name}'s collector`);
    }
  });

  test('an Event Admin sees only their function, never the family’s other one', async () => {
    for (const [me, other] of [[A, B], [B, A]]) {
      const s = await seen(me.manager.d);
      assert.deepEqual([...s.events], [me.second.id]);
      assert.deepEqual(s.raw.moi.filter((m) => m.event_id === me.first.id), []);
      for (const c of COLS) none(s[c], other.ids[c], `${other.name} ${c} to ${me.name}'s Event Admin`);
    }
  });

  test('a visitor with no login sees no family data at all', async () => {
    const v = new Device();
    const s = (await v.get('/api/state')).json.state;
    for (const c of ['users', 'events', 'eventUsers', 'moi', 'expenses', 'payouts', 'guests', 'ggroups', 'reminders', 'msgLog', 'notifications', 'audit']) assert.equal((s[c] ?? []).length, 0, `visitor sees ${c}`);
    assert.deepEqual(s.people, {});
    const ch = (await v.get('/api/changes?since=0&scope=anon')).json;
    assert.deepEqual(ch.changes, []);
    assert.deepEqual(ch.people, {});
    assert.equal((await fetch(`${BASE}/api/stream`)).status, 401);
  });

  test('the public QR page shows the function but not its bank details or contacts', async () => {
    const r = (await new Device().get(`/api/public/event/${A.first.no}`)).json;
    assert.equal(r.event.id, A.first.id);
    assert.equal(r.event.bank, undefined);
    assert.equal(r.event.orgEmail, undefined);
    assert.equal(r.account.wallet.credits, 0, 'the family’s balance stays private');
  });

  test('one family cannot change any record of another, by any collection', async () => {
    for (const [me, other] of [[B, A], [A, B]]) {
      for (const c of COLS) {
        for (const id of other.ids[c] ?? []) {
          const r = await me.o.pushOne(c, id, { id, acc: me.acc, event_id: me.first.id, eid: me.first.id, name: 'Hijacked', amount: 1, status: 'void', owner: me.o.state.me, wallet: { credits: 99999 } });
          if (c === 'audit') assert.equal(r.data, null, `${c} ${id} came back to ${me.name}`);
          else {
            assert.equal(r.ok, false, `${me.name} changed ${other.name}'s ${c} ${id}`);
            assert.equal(r.data, null, `${other.name}'s ${c} ${id} came back in the refusal`);
          }
        }
      }
    }
  });

  test('one family cannot delete any record of another', async () => {
    for (const [me, other] of [[B, A], [A, B]]) {
      const deletes = COLS.flatMap((c) => (other.ids[c] ?? []).map((id) => ({ col: c, id })));
      const r = await me.o.push([], deletes);
      const allowed = (r.json.results ?? []).filter((x) => x.ok);
      assert.deepEqual(allowed.map((x) => `${x.col}/${x.id}`), [], `${me.name} deleted ${other.name}'s records`);
    }
  });

  test('one family cannot add records into another family’s function', async () => {
    const tgt = A.first.id;
    const m = moiRecord(tgt);
    assert.equal((await B.o.pushOne('moi', m.id, m)).ok, false, 'Moi');
    const ex = uniq('x');
    assert.equal((await B.o.pushOne('expenses', ex, { id: ex, event_id: tgt, amount: 1 })).ok, false, 'expense');
    const po = uniq('p');
    assert.equal((await B.o.pushOne('payouts', po, { id: po, event_id: tgt, amount: 1, to: 'x' })).ok, false, 'payout');
    const link = uniq('a');
    assert.equal((await B.o.pushOne('eventUsers', link, { id: link, event_id: tgt, user_id: B.o.state.me, role: 'manager' })).ok, false, 'a helper link');
    const n = uniq('n');
    assert.equal((await B.o.pushOne('notifications', n, { id: n, eid: tgt, channel: 'WhatsApp', to: mobile(), text: 'x', status: 'Sent', at: Date.now() })).ok, false, 'a message charged to them');
    const g = uniq('g');
    assert.equal((await B.o.pushOne('guests', g, { id: g, acc: A.acc, name: 'x' })).ok, false, 'a guest');
    const u = uniq('u');
    assert.equal((await B.o.pushOne('users', u, { id: u, acc: A.acc, name: 'x', email: `${uniq('x')}@example.com`, role: 'manager' })).ok, false, 'a login');
  });

  test('helpers cannot reach past their own function, even in the same family', async () => {
    const c = A.collector.d;
    const m = moiRecord(A.second.id);
    assert.equal((await c.pushOne('moi', m.id, m)).ok, false, 'Moi in a function they do not work on');
    const ev = beforeA.events.map((x) => JSON.parse(x)).find((e) => e.id === A.first.id);
    assert.equal((await c.pushOne('events', A.first.id, { ...ev, name: 'Renamed by collector' })).ok, false, 'a collector cannot edit the function');
    const ex = A.ids.expenses[0];
    const del = await c.push([], [{ col: 'expenses', id: ex }]);
    assert.equal(del.json.results[0].ok, false, 'a collector cannot delete expenses');
    assert.equal((await c.post('/api/credits/purchase', { accountId: A.acc, qty: 100 })).status, 403, 'a collector cannot buy credits');
    assert.equal((await c.post(`/api/events/${A.first.id}/book`)).status, 403, 'a collector cannot send the Moi Book');
    const mgr = A.manager.d;
    assert.equal((await mgr.pushOne('events', A.first.id, { ...ev, name: 'Renamed by admin' })).ok, false, 'an Event Admin cannot edit another function');
    assert.equal((await mgr.post('/api/credits/purchase', { accountId: B.acc, qty: 100 })).status, 403, 'nor buy for another family');
  });

  test('after every attack, both families’ data is exactly as it was', async () => {
    assert.deepEqual(await snapshot(A), beforeA);
    assert.deepEqual(await snapshot(B), beforeB);
  });

  test('each family pays for its own messages only', async () => {
    const credits = async (t) => (await t.o.get('/api/state')).json.state.accounts.find((a) => a.id === t.acc).wallet.credits;
    const a0 = await credits(A);
    const b0 = await credits(B);
    const n = uniq('n');
    const r = await B.o.pushOne('notifications', n, { id: n, eid: B.first.id, channel: 'WhatsApp', to: mobile(), text: 'Thanks', status: 'Sent', at: Date.now(), trigger: 'C11' });
    assert.equal(r.ok, true);
    assert.equal(await credits(B), b0 - 1);
    assert.equal(await credits(A), a0);
  });

  test('receipt numbers are counted per function, so families never collide', async () => {
    const ma = moiRecord(A.first.id);
    const mb = moiRecord(B.first.id);
    const ra = await A.o.pushOne('moi', ma.id, ma);
    const rb = await B.o.pushOne('moi', mb.id, mb);
    assert.ok(ra.data.code.startsWith(`${A.first.no}/`));
    assert.ok(rb.data.code.startsWith(`${B.first.no}/`));
    assert.notEqual(A.first.no, B.first.no);
  });

  test('live updates reach only the family that changed', async () => {
    const b = await listen(B.o);
    const a = await listen(A.o);
    await wait(500);
    const n = uniq('n');
    await A.o.pushOne('notifications', n, { id: n, eid: A.first.id, channel: 'In app', to: 'You', text: 'ping', status: 'Sent', at: Date.now() });
    await wait(1500);
    assert.ok(a.got.length >= 1, 'the family that changed must hear about it');
    assert.equal(b.got.length, 0, 'the other family must hear nothing');
    a.stop();
    b.stop();
  });

  test('Moi Point staff can see both families, as their job needs', async () => {
    const s = await seen(await staff());
    assert.ok(s.accounts.has(A.acc) && s.accounts.has(B.acc));
    assert.ok(s.events.has(A.first.id) && s.events.has(B.first.id));
  });
});

after(() => { /* devices hold no open handles beyond fetch, which closes itself */ });
