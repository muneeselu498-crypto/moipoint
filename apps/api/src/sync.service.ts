import { HttpException, Injectable, Logger } from '@nestjs/common';
import { MODEL, PLATFORM_ARRAYS, PUBLIC_DOCS, PUSH_ORDER, STATE_FLAGS, TENANT_DOCS, type Col } from './collections';
import { MessagesService } from './messages.service';
import { PrismaService, Tx } from './prisma.service';
import { Scope, ScopeService } from './scope.service';
import { StorageService } from './storage.service';
import { StreamService } from './stream.service';
import { fail, hashPassword, mobOk, pwHintFields, pwOk } from './util';
import { addCredits, spendCredit, walletSync } from './wallet';

interface Ctx {
  scope: Scope;
  rev: bigint;
  touched: Set<string>;
  /** Receipt numbers the server had to change, so messages in the same batch quote the right one. */
  codeMap: Map<string, string>;
  /** Event numbers the server assigned, so Moi entries saved with the new event use the right prefix. */
  evNoMap: Map<string, string>;
  messages: string[];
  pricing: any;
  validDays: number;
  scopeChanged: boolean;
}
interface Outcome {
  col: string;
  id: string;
  ok: boolean;
  reason?: string;
  data: any | null;
}

const DOC_NEVER_FROM_BROWSER = new Set(['platLog', 'resets']);

type PushBody = { upserts: any[]; deletes: any[]; people?: Record<string, any>; platform?: Record<string, any>; pw?: Record<string, string> };

@Injectable()
export class SyncService {
  private log = new Logger('Sync');

  constructor(
    private prisma: PrismaService,
    private scopes: ScopeService,
    private stream: StreamService,
    private messages: MessagesService,
    private storage: StorageService,
  ) {}

  // ---------- reading ----------

  /** Turns a table row back into the record the screens expect. Secrets stop here. */
  toClient(col: Col, row: any, scope: Scope): any {
    const d: any = { ...(row.data as object) };
    if (col === 'users') {
      delete d.pw;
      delete d.pwh;
      Object.assign(d, { id: row.id, email: row.email || '', username: row.username, mobile: row.mobile || '', role: row.role, status: row.status });
      if (row.accountId) d.acc = row.accountId;
      if (row.platformRole) d.prole = row.platformRole;
      if (row.id !== scope.userId) {
        delete d.pwHint;
        delete d.pwLen;
        delete d.pwAt;
      }
    } else if (col === 'accounts') {
      const wallet: any = { ...(row.wallet as object) };
      const full = scope.kind === 'platform' || scope.ownerOf.includes(row.id);
      if (!full) wallet.purchases = [];
      Object.assign(d, { id: row.id, name: row.name, status: row.status, plan: row.plan, owner: row.ownerId, wallet });
    } else if (col === 'events') {
      Object.assign(d, { id: row.id, no: row.no, token: row.token, acc: row.accountId, status: row.status });
    } else if (col === 'moi') {
      Object.assign(d, { id: row.id, code: row.code, event_id: row.eventId, status: row.status });
    } else if (col === 'notifications') {
      Object.assign(d, { id: row.id, status: row.status });
    }
    return d;
  }

  /** Who may see which rows. Returning null means this person sees none of that collection. */
  private async whereFor(col: Col, s: Scope): Promise<any | null> {
    if (s.kind === 'platform') return {};
    if (s.kind === 'anon') return null;
    const ev = { in: s.eventIds };
    const acc = { in: s.accountIds };
    switch (col) {
      case 'users': {
        const links = await this.prisma.eventUser.findMany({ where: { eventId: ev, deleted: false }, select: { userId: true } });
        const owners = await this.prisma.account.findMany({ where: { id: acc }, select: { ownerId: true } });
        const ids = [...links.map((l) => l.userId), ...owners.map((o) => o.ownerId).filter(Boolean), s.userId] as string[];
        return { OR: [{ id: { in: ids } }, { accountId: { in: s.ownerOf } }] };
      }
      case 'accounts': return { id: acc };
      case 'events': return { id: ev };
      case 'eventUsers': case 'moi': case 'expenses': case 'payouts': return { eventId: ev };
      case 'guests': case 'ggroups': return { accountId: acc };
      case 'reminders': return { ownerId: s.userId };
      case 'notifications': return { OR: [{ eventId: ev }, { ownerId: s.userId }] };
      case 'msgLog': {
        const managed = Object.entries(s.helperOn).filter(([, h]) => h.role === 'manager').map(([id]) => id);
        return { OR: [{ accountId: { in: s.ownerOf } }, { eventId: { in: managed } }] };
      }
      case 'audit': return { OR: [{ accountId: { in: s.ownerOf } }, { eventId: ev }] };
      case 'tickets': return { accountId: s.user?.accountId ?? '' };
      case 'stockAlerts': return { accountId: { in: s.ownerOf } };
      default: return null;
    }
  }

  private docKeys(s: Scope) {
    return s.kind === 'platform' ? null : s.kind === 'tenant' ? TENANT_DOCS : PUBLIC_DOCS;
  }

  async currentRev() {
    const c = await this.prisma.syncCounter.findUnique({ where: { id: 1 } });
    return Number(c?.rev ?? 0);
  }

  /** Everything this person may see, in the shape the screens already use. */
  async buildState(s: Scope) {
    const rev = await this.currentRev();
    const state: any = { ...STATE_FLAGS, seq: 1000, evSeq: 0, queue: [], people: {} };
    const platform: any = {};
    const keys = this.docKeys(s);
    const docs = await this.prisma.platformDoc.findMany({ where: keys ? { key: { in: keys } } : {} });
    for (const d of docs) if (!d.key.startsWith('_')) platform[d.key] = d.data;
    for (const col of PUSH_ORDER) {
      const where = await this.whereFor(col, s);
      const rows = where ? await (this.prisma as any)[MODEL[col]].findMany({ where: { ...where, deleted: false }, orderBy: { createdAt: 'asc' } }) : [];
      const list = rows.map((r: any) => this.toClient(col, r, s));
      if (PLATFORM_ARRAYS[col]) platform[PLATFORM_ARRAYS[col]!] = list;
      else state[col] = list;
    }
    // the app shows newest messages first
    state.msgLog.sort((a: any, b: any) => (b.at || 0) - (a.at || 0));
    const people = s.kind === 'anon' ? [] : await this.prisma.person.findMany({ where: { deleted: false, ...(s.kind === 'tenant' ? { accounts: { hasSome: s.accountIds } } : {}) } });
    for (const p of people) state.people[p.mobile] = p.data;
    state.platform = platform;
    return { rev, scope: s.key, state };
  }

  /** Only what changed since the number this device last saw. */
  async changes(s: Scope, since: number, key: string) {
    if (key !== s.key) return { full: true };
    const rev = await this.currentRev();
    const out: any[] = [];
    const gt = { rev: { gt: BigInt(since) } };
    for (const col of PUSH_ORDER) {
      const where = await this.whereFor(col, s);
      if (!where) continue;
      const rows = await (this.prisma as any)[MODEL[col]].findMany({ where: { ...where, ...gt } });
      for (const r of rows) out.push(r.deleted ? { col, id: r.id, deleted: true } : { col, id: r.id, data: this.toClient(col, r, s) });
    }
    const keys = this.docKeys(s);
    const docs = (await this.prisma.platformDoc.findMany({ where: { ...gt, ...(keys ? { key: { in: keys } } : {}) } })).filter((d) => !d.key.startsWith('_'));
    const people = await this.prisma.person.findMany({ where: { ...gt, ...(s.kind === 'tenant' ? { accounts: { hasSome: s.accountIds } } : {}) } });
    return {
      rev,
      changes: out,
      docs: Object.fromEntries(docs.map((d) => [d.key, d.data])),
      people: Object.fromEntries(people.map((p) => [p.mobile, p.data])),
    };
  }

  // ---------- writing ----------

  /**
   * Saves a device's changes. If something unexpected breaks the batch, each change is tried
   * on its own, so one bad record can't hold every later entry hostage on that device.
   */
  async push(scope: Scope, body: PushBody) {
    if (scope.kind === 'anon') fail('Please log in again.', 401);
    try {
      return await this.pushBatch(scope, body);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.log.error(`Batch failed, retrying one by one: ${e.message}`);
    }
    const results: Outcome[] = [];
    let last: any = { rev: await this.currentRev(), scope: scope.key };
    const single = async (part: PushBody, col: string, id: string) => {
      try {
        last = await this.pushBatch(scope, part);
        results.push(...last.results);
      } catch (e: any) {
        this.log.error(`Rejected ${col}/${id}: ${e.message}`);
        const row = col && MODEL[col as Col] ? await (this.prisma as any)[MODEL[col as Col]].findUnique({ where: { id } }) : null;
        results.push(this.no(col as Col, id, 'This change could not be saved.', row, scope));
      }
    };
    for (const u of body.upserts) await single({ upserts: [u], deletes: [] }, u.col, u.id);
    for (const d of body.deletes) await single({ upserts: [], deletes: [d] }, d.col, d.id);
    if (body.people || body.platform || body.pw) await single({ upserts: [], deletes: [], people: body.people, platform: body.platform, pw: body.pw }, '', '');
    return { ...last, results: results.filter((r) => r.col) };
  }

  private async pushBatch(scope: Scope, body: PushBody) {
    const results: Outcome[] = [];
    const ctx = await this.prisma.$transaction(
      async (tx) => {
        const rev = await this.messages.bump(tx);
        const pricing: any = (await tx.platformDoc.findUnique({ where: { key: 'pricing' } }))?.data ?? {};
        const c: Ctx = { scope, rev, touched: new Set(), codeMap: new Map(), evNoMap: new Map(), messages: [], pricing, validDays: +pricing.validDays || 365, scopeChanged: false };
        for (const col of PUSH_ORDER) {
          for (const ch of body.upserts.filter((u) => u.col === col)) results.push(await this.upsert(tx, c, col, String(ch.id), this.storage.externalize(ch.data)));
          for (const ch of body.deletes.filter((u) => u.col === col)) results.push(await this.remove(tx, c, col, String(ch.id)));
        }
        await this.savePeople(tx, c, body.people);
        await this.saveDocs(tx, c, body.platform);
        await this.savePasswords(tx, c, body.pw);
        return c;
      },
      { timeout: 30000, maxWait: 15000 },
    );
    this.messages.deliver(ctx.messages);
    this.stream.publish(ctx.touched, Number(ctx.rev));
    let scopeKey = scope.key;
    if (ctx.scopeChanged && scope.user) scopeKey = (await this.scopes.forUser(scope.user)).key;
    return { rev: Number(ctx.rev), scope: scopeKey, results };
  }

  private no(col: Col, id: string, reason: string, row: any, s: Scope): Outcome {
    return { col, id, ok: false, reason, data: row && !row.deleted ? this.toClient(col, row, s) : null };
  }
  private yes(col: Col, id: string, row: any, s: Scope): Outcome {
    return { col, id, ok: true, data: this.toClient(col, row, s) };
  }

  private isOwner = (s: Scope, accountId?: string | null) => s.kind === 'platform' || (!!accountId && s.ownerOf.includes(accountId));
  private managerIn = (s: Scope, accountId: string) => Object.values(s.helperOn).some((h) => h.role === 'manager' && h.accountId === accountId);

  /** Owner, staff, or a helper with this permission on this event. */
  private can(s: Scope, ev: any, perm?: string) {
    if (this.isOwner(s, ev.accountId)) return true;
    const h = s.helperOn[ev.id];
    return !!h && (!perm || !!h.perm[perm]);
  }

  private async upsert(tx: Tx, c: Ctx, col: Col, id: string, d: any): Promise<Outcome> {
    switch (col) {
      case 'users': return this.upUser(tx, c, id, d);
      case 'accounts': return this.upAccount(tx, c, id, d);
      case 'events': return this.upEvent(tx, c, id, d);
      case 'eventUsers': return this.upEventUser(tx, c, id, d);
      case 'moi': return this.upMoi(tx, c, id, d);
      case 'expenses': return this.upEventRecord(tx, c, 'expenses', id, d, 'exp');
      case 'payouts': return this.upEventRecord(tx, c, 'payouts', id, d, 'pay');
      case 'guests': case 'ggroups': return this.upGuestRecord(tx, c, col, id, d);
      case 'reminders': return this.upReminder(tx, c, id, d);
      case 'tickets': return this.upTicket(tx, c, id, d);
      case 'stockAlerts': return this.upStockAlert(tx, c, id, d);
      case 'leads': return this.upLead(tx, c, id, d);
      case 'msgLog': return this.upMsgLog(tx, c, id, d);
      case 'notifications': return this.upNotification(tx, c, id, d);
      case 'audit': return this.upAudit(tx, c, id, d);
    }
  }

  private async write(tx: Tx, c: Ctx, col: Col, id: string, cols: any, data: any) {
    const m = (tx as any)[MODEL[col]];
    return m.upsert({ where: { id }, create: { id, ...cols, data, rev: c.rev }, update: { ...cols, data, rev: c.rev, deleted: false } });
  }

  private async upUser(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const plat = s.kind === 'platform';
    const before = await tx.user.findUnique({ where: { id } });
    const clean = { ...d };
    delete clean.pw;
    delete clean.pwh;
    const email = String(d.email || '').trim().toLowerCase() || null;
    const mobile = String(d.mobile || '').trim() || null;
    let role: string, status: string, accountId: string | null, platformRole: string | null;

    if (!before) {
      role = d.role;
      status = 'active';
      accountId = d.acc ?? null;
      platformRole = d.prole ?? null;
      if (role === 'platform' ? !plat : !['manager', 'collector'].includes(role)) return this.no('users', id, 'This login can’t be created.', null, s);
      if (role !== 'platform' && !this.isOwner(s, accountId) && !(accountId && this.managerIn(s, accountId))) return this.no('users', id, 'Only the owner can add logins.', null, s);
    } else {
      const self = before.id === s.userId;
      const owner = this.isOwner(s, before.accountId);
      if (!plat && !self && !owner) return this.no('users', id, 'You can’t change this person.', before, s);
      role = before.role;
      status = before.status;
      accountId = before.accountId;
      platformRole = before.platformRole;
      if (plat) {
        role = d.role || role;
        status = d.status || status;
        platformRole = d.prole ?? platformRole;
      } else if (owner && !self) {
        if (['manager', 'collector'].includes(d.role)) role = d.role;
        if (['active', 'disabled', 'deleted'].includes(d.status)) status = d.status;
      }
      const prev: any = before.data;
      for (const k of ['pwHint', 'pwLen', 'pwAt']) {
        if (prev[k] === undefined) delete clean[k];
        else clean[k] = prev[k];
      }
    }

    const username = String(d.username || email || id).toLowerCase();
    if (status !== 'deleted') {
      const clash = await tx.user.findFirst({ where: { id: { not: id }, deleted: false, OR: [...(email ? [{ email }] : []), { username }] } });
      if (clash) return this.no('users', id, 'Another login already uses this email.', before, s);
      if (mobile && role !== 'platform') {
        const mob = await tx.user.findFirst({ where: { id: { not: id }, mobile, deleted: false, role: { not: 'platform' }, status: { not: 'deleted' } } });
        if (mob) return this.no('users', id, 'Another login already uses this number.', before, s);
      }
    }
    if (accountId) c.touched.add(accountId);
    const row = await this.write(tx, c, 'users', id, { accountId, email, username, mobile, role, platformRole, status }, clean);
    return this.yes('users', id, row, s);
  }

  private async upAccount(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const plat = s.kind === 'platform';
    const before = await tx.account.findUnique({ where: { id } });
    if (!before) return this.no('accounts', id, 'Accounts are created at sign-up.', null, s);
    if (!this.isOwner(s, id)) return this.no('accounts', id, 'You can’t change this account.', before, s);
    const prev: any = before.data;
    const data = { ...d };
    delete data.wallet;
    if (!plat) {
      // money and plan fields only change through the server's own payment steps
      for (const k of ['plan', 'status', 'owner', 'sub', 'grants']) data[k] = prev[k];
    }
    const cols: any = { name: String(d.name || before.name), status: plat ? d.status || before.status : before.status, plan: plat ? d.plan || before.plan : before.plan, ownerId: before.ownerId };
    const row = await tx.account.update({ where: { id }, data: { ...cols, data, wallet: plat && d.wallet ? d.wallet : (before.wallet as any), rev: c.rev } });
    c.touched.add(id);
    return this.yes('accounts', id, row, s);
  }

  private async nextEventNo(tx: Tx) {
    const doc = await tx.platformDoc.findUnique({ where: { key: '_counters' } });
    const counters: any = doc?.data ?? { evSeq: 0 };
    counters.evSeq = (counters.evSeq || 0) + 1;
    await tx.platformDoc.upsert({ where: { key: '_counters' }, create: { key: '_counters', data: counters }, update: { data: counters } });
    return `EV${String(counters.evSeq).padStart(3, '0')}`;
  }

  private async upEvent(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.event.findUnique({ where: { id } });
    if (!before) {
      if (!this.isOwner(s, d.acc)) return this.no('events', id, 'Only the owner can create an event.', null, s);
      const no = await this.nextEventNo(tx);
      if (d.no && d.no !== no) c.evNoMap.set(d.no, no);
      const data = { ...d, no };
      const n = +c.pricing.evFree === 0 ? 0 : +c.pricing.evFree || 20;
      if (d.freeCr && n > 0) await this.grant(tx, c, d.acc, n, 0, `Free credits · ${d.name}`, `EVFREE-${no}`);
      const row = await this.write(tx, c, 'events', id, { accountId: d.acc, no, token: d.token ?? null, date: d.date ?? null, status: d.status || 'active' }, data);
      s.eventIds.push(id);
      c.touched.add(d.acc);
      c.scopeChanged = true;
      return this.yes('events', id, row, s);
    }
    const h = s.helperOn[id];
    if (!this.isOwner(s, before.accountId) && h?.role !== 'manager') return this.no('events', id, 'Only the owner or an Event Admin can change this event.', before, s);
    const prev: any = before.data;
    const data = { ...d, acc: before.accountId, no: before.no, token: before.token };
    if (prev.bookSent && !d.bookSent) data.bookSent = prev.bookSent;
    const row = await this.write(tx, c, 'events', id, { accountId: before.accountId, no: before.no, token: before.token, date: d.date ?? before.date, status: d.status || before.status }, data);
    c.touched.add(before.accountId);
    return this.yes('events', id, row, s);
  }

  private async upEventUser(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.eventUser.findUnique({ where: { id } });
    const ev = await tx.event.findUnique({ where: { id: d.event_id } });
    if (!ev) return this.no('eventUsers', id, 'That event doesn’t exist.', before, s);
    const owner = this.isOwner(s, ev.accountId);
    const manager = s.helperOn[ev.id]?.role === 'manager';
    if (!owner && !(manager && d.role === 'collector')) return this.no('eventUsers', id, 'You can’t change who works on this event.', before, s);
    const row = await this.write(tx, c, 'eventUsers', id, { accountId: ev.accountId, eventId: ev.id, userId: d.user_id, role: d.role }, d);
    c.touched.add(ev.accountId);
    c.scopeChanged = true;
    return this.yes('eventUsers', id, row, s);
  }

  /** Gives a Moi entry its receipt number. If two phones chose the same one, the later entry gets the next free number. */
  private async allocateReceipt(tx: Tx, ev: any, wanted: string) {
    const m = String(wanted || '').match(/\/(\d+)$/);
    let seq = m ? +m[1] : 0;
    const taken = seq > 0 ? await tx.moi.findFirst({ where: { eventId: ev.id, seq } }) : true;
    if (taken) {
      const agg = await tx.moi.aggregate({ where: { eventId: ev.id }, _max: { seq: true } });
      seq = Math.max(agg._max.seq || 0, ev.moiSeq) + 1;
    }
    if (seq > ev.moiSeq) await tx.event.update({ where: { id: ev.id }, data: { moiSeq: seq } });
    return { seq, code: `${ev.no}/${String(seq).padStart(3, '0')}` };
  }

  private moiCols(d: any, ev: any) {
    return { accountId: ev.accountId, eventId: ev.id, mobile: d.c?.mobile || null, status: d.status, mode: d.mode || 'cash', amount: Math.round(+d.amount || 0) };
  }

  private async upMoi(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.moi.findUnique({ where: { id } });
    const ev = await tx.event.findUnique({ where: { id: before?.eventId ?? d.event_id } });
    if (!ev) return this.no('moi', id, 'That event doesn’t exist.', before, s);
    if (!this.can(s, ev)) return this.no('moi', id, 'You don’t have access to this event.', before, s);

    if (!before) {
      if (!['active', 'completed'].includes(ev.status)) return this.no('moi', id, 'This event isn’t taking Moi.', null, s);
      const { seq, code } = await this.allocateReceipt(tx, ev, d.code);
      if (d.code !== code) c.codeMap.set(d.code, code);
      const data = { ...d, code, collected_by: s.userId ?? d.collected_by };
      const row = await this.write(tx, c, 'moi', id, { ...this.moiCols(d, ev), code, seq }, data);
      c.touched.add(ev.accountId);
      return this.yes('moi', id, row, s);
    }

    if (!this.isOwner(s, ev.accountId)) {
      const perm = s.helperOn[ev.id].perm;
      const b: any = before.data;
      const changed = b.status !== d.status;
      if (changed) {
        // taking the cash at the counter is receiving, which every helper does
        const collecting = d.status === 'received' && ['tocollect', 'pending'].includes(b.status) && d.mode === 'cash';
        const need = d.status === 'void' ? 'void' : collecting ? null : 'verify';
        if (need && !perm[need]) return this.no('moi', id, 'You don’t have permission to do this.', before, s);
      } else if (['amount', 'mode', 'kind'].some((k) => b[k] !== d[k]) || JSON.stringify(b.c) !== JSON.stringify(d.c) || JSON.stringify(b.gift ?? null) !== JSON.stringify(d.gift ?? null)) {
        if (!perm.edit) return this.no('moi', id, 'You don’t have permission to edit this entry.', before, s);
      }
    }
    const data = { ...d, code: before.code, event_id: before.eventId };
    const row = await this.write(tx, c, 'moi', id, { ...this.moiCols(d, ev), code: before.code, seq: before.seq }, data);
    c.touched.add(ev.accountId);
    return this.yes('moi', id, row, s);
  }

  private async upEventRecord(tx: Tx, c: Ctx, col: 'expenses' | 'payouts', id: string, d: any, perm: string): Promise<Outcome> {
    const s = c.scope;
    const before = await (tx as any)[MODEL[col]].findUnique({ where: { id } });
    const ev = await tx.event.findUnique({ where: { id: before?.eventId ?? d.event_id } });
    if (!ev || !this.can(s, ev, perm)) return this.no(col, id, 'You don’t have permission to do this.', before, s);
    const row = await this.write(tx, c, col, id, { accountId: ev.accountId, eventId: ev.id }, d);
    c.touched.add(ev.accountId);
    return this.yes(col, id, row, s);
  }

  private async upGuestRecord(tx: Tx, c: Ctx, col: 'guests' | 'ggroups', id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await (tx as any)[MODEL[col]].findUnique({ where: { id } });
    const acc = before?.accountId ?? d.acc;
    if (!this.isOwner(s, acc) && !this.managerIn(s, acc)) return this.no(col, id, 'You don’t have permission to do this.', before, s);
    const row = await this.write(tx, c, col, id, { accountId: acc }, d);
    c.touched.add(acc);
    return this.yes(col, id, row, s);
  }

  private async upReminder(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.reminder.findUnique({ where: { id } });
    const ownerId = before?.ownerId ?? d.owner ?? s.userId;
    if (ownerId !== s.userId && s.kind !== 'platform') return this.no('reminders', id, 'This reminder belongs to someone else.', before, s);
    const row = await this.write(tx, c, 'reminders', id, { accountId: s.user?.accountId ?? null, ownerId }, { ...d, owner: ownerId });
    if (s.user?.accountId) c.touched.add(s.user.accountId);
    return this.yes('reminders', id, row, s);
  }

  private async upTicket(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.ticket.findUnique({ where: { id } });
    const acc = before?.accountId ?? d.acc;
    if (s.kind !== 'platform' && acc !== s.user?.accountId) return this.no('tickets', id, 'This question belongs to another account.', before, s);
    const row = await this.write(tx, c, 'tickets', id, { accountId: acc }, d);
    c.touched.add(acc);
    return this.yes('tickets', id, row, s);
  }

  private async upStockAlert(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.stockAlert.findUnique({ where: { id } });
    if (before && s.kind !== 'platform') return this.no('stockAlerts', id, 'Only Moi Point can change this.', before, s);
    const row = await this.write(tx, c, 'stockAlerts', id, { accountId: before?.accountId ?? d.acc ?? s.user?.accountId ?? null }, d);
    return this.yes('stockAlerts', id, row, s);
  }

  private async upLead(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    if (c.scope.kind !== 'platform') return this.no('leads', id, 'Only Moi Point can change this.', null, c.scope);
    return this.yes('leads', id, await this.write(tx, c, 'leads', id, {}, d), c.scope);
  }

  private async upMsgLog(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.msgLog.findUnique({ where: { id } });
    const acc = before?.accountId ?? d.acc;
    if (!this.isOwner(s, acc) && !this.managerIn(s, acc)) return this.no('msgLog', id, 'You don’t have permission to do this.', before, s);
    const data = { ...d };
    // delivery results come from the provider, so an older copy from a phone can't erase them
    if (before) {
      const prev: any = before.data;
      data.recips = (d.recips || []).map((r: any) => {
        const p = (prev.recips || []).find((x: any) => x.mob === r.mob && x.ch === r.ch);
        return p?.ds ? { ...r, ds: p.ds, st: p.st } : r;
      });
    }
    const row = await this.write(tx, c, 'msgLog', id, { accountId: acc, eventId: d.ev ?? null }, data);
    c.touched.add(acc);
    return this.yes('msgLog', id, row, s);
  }

  /** A WhatsApp or SMS notification is a send request. This is the one place credits are charged. */
  private async upNotification(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.notification.findUnique({ where: { id } });
    const eventId: string | null = before?.eventId ?? d.eid ?? null;
    const ownerId: string | null = before?.ownerId ?? d.owner ?? null;
    const ev = eventId ? await tx.event.findUnique({ where: { id: eventId } }) : null;
    const owner = ownerId ? await tx.user.findUnique({ where: { id: ownerId } }) : null;
    const accountId = ev?.accountId ?? owner?.accountId ?? s.user?.accountId ?? null;
    const allowed = s.kind === 'platform' || (ev ? this.can(s, ev) : ownerId === s.userId);
    if (!allowed) return this.no('notifications', id, 'You can’t send this.', before, s);

    const data = { ...d };
    for (const [from, to] of c.codeMap) if (typeof data.text === 'string') data.text = data.text.split(from).join(to);
    if (data.vars?.receipt && c.codeMap.has(data.vars.receipt)) data.vars.receipt = c.codeMap.get(data.vars.receipt);

    let status: string = before?.dispatchedAt ? before.status : d.status;
    let dispatchedAt = before?.dispatchedAt ?? null;
    const wantsSend = !dispatchedAt && d.status === 'Sent' && !!d.to && d.to !== '—';
    if (wantsSend && (d.channel === 'WhatsApp' || d.channel === 'SMS') && accountId) {
      dispatchedAt = new Date();
      const acct = await tx.account.findUnique({ where: { id: accountId } });
      const w: any = acct?.wallet;
      if (acct && spendCredit(w, c.validDays)) {
        w.usage = w.usage || {};
        const k = eventId || 'rem';
        w.usage[k] = (w.usage[k] || 0) + 1;
        await tx.account.update({ where: { id: accountId }, data: { wallet: w, rev: c.rev } });
        let media: any = null;
        if (d.logId) {
          const log = await tx.msgLog.findUnique({ where: { id: d.logId } });
          const img = (log?.data as any)?.img;
          if (typeof img === 'string') media = { image: img };
        }
        c.messages.push(await this.messages.enqueue(tx, {
          trigger: d.trigger || 'C1', channel: d.channel, to: String(d.to), text: String(data.text || '').slice(0, 4096),
          vars: data.vars ?? null, media, paidBy: 'customer', accountId, eventId, notificationId: id, logId: d.logId ?? null,
        }));
      } else {
        status = 'Not sent · no credits';
        data.status = status;
        if (d.mid) await this.markMoiNotified(tx, c, d.mid, d.channel, status);
        if (d.logId) await this.markLogNoCredit(tx, c, d.logId, String(d.to), d.channel);
      }
      c.touched.add(accountId);
    } else if (wantsSend && d.channel === 'Email' && s.user?.email && d.to === s.user.email) {
      // calendar invites go only to the person's own address
      dispatchedAt = new Date();
      c.messages.push(await this.messages.enqueue(tx, { trigger: 'M5', channel: 'Email', to: String(d.to), text: String(data.text || ''), media: { attach: d.attach ?? null }, paidBy: 'platform', accountId, notificationId: id }));
    }
    const row = await this.write(tx, c, 'notifications', id, { accountId, eventId, ownerId, channel: String(d.channel || 'In app'), status, dispatchedAt }, data);
    if (accountId) c.touched.add(accountId);
    return this.yes('notifications', id, row, s);
  }

  private async markMoiNotified(tx: Tx, c: Ctx, moiId: string, channel: string, status: string) {
    const m = await tx.moi.findUnique({ where: { id: moiId } });
    if (!m) return;
    const d: any = m.data;
    (d.notified || []).forEach((r: any) => {
      if (r.channel === channel) r.status = status;
    });
    await tx.moi.update({ where: { id: moiId }, data: { data: d, rev: c.rev } });
  }

  private async markLogNoCredit(tx: Tx, c: Ctx, logId: string, to: string, channel: string) {
    const row = await tx.msgLog.findUnique({ where: { id: logId } });
    if (!row) return;
    const d: any = row.data;
    const ch = channel === 'WhatsApp' ? 'wa' : 'sms';
    const r = (d.recips || []).find((x: any) => x.mob === to && x.ch === ch);
    if (r) r.st = 'credit';
    await tx.msgLog.update({ where: { id: logId }, data: { data: d, rev: c.rev } });
  }

  private async upAudit(tx: Tx, c: Ctx, id: string, d: any): Promise<Outcome> {
    const s = c.scope;
    const before = await tx.audit.findUnique({ where: { id } });
    // the activity log can be added to but never rewritten
    if (before) return this.yes('audit', id, before, s);
    const ev = d.eid ? await tx.event.findUnique({ where: { id: d.eid } }) : null;
    if (ev && !this.can(s, ev)) return this.no('audit', id, 'You don’t have access to this event.', null, s);
    const accountId = ev?.accountId ?? (s.kind === 'platform' ? (d.acc ?? null) : (s.user?.accountId ?? null));
    const data = { ...d, uid: s.userId };
    const row = await tx.audit.create({ data: { id, accountId, eventId: d.eid ?? null, data, rev: c.rev } });
    if (accountId) c.touched.add(accountId);
    return this.yes('audit', id, row, s);
  }

  private async remove(tx: Tx, c: Ctx, col: Col, id: string): Promise<Outcome> {
    const s = c.scope;
    const m = (tx as any)[MODEL[col]];
    const row = await m.findUnique({ where: { id } });
    if (!row) return { col, id, ok: true, data: null };
    let allowed = s.kind === 'platform';
    if (!allowed) {
      if (col === 'reminders') allowed = row.ownerId === s.userId;
      else if (col === 'eventUsers' || col === 'expenses' || col === 'payouts') {
        const ev = await tx.event.findUnique({ where: { id: row.eventId } });
        allowed = !!ev && (col === 'eventUsers' ? this.isOwner(s, ev.accountId) || s.helperOn[ev.id]?.role === 'manager' : this.can(s, ev, col === 'expenses' ? 'exp' : 'pay'));
      } else if (col === 'guests' || col === 'ggroups' || col === 'msgLog') allowed = this.isOwner(s, row.accountId) || this.managerIn(s, row.accountId);
    }
    // Moi entries, events, accounts and the activity log are voided, never removed
    if (!allowed || ['moi', 'events', 'accounts', 'audit', 'users'].includes(col)) return this.no(col, id, 'This can’t be removed.', row, s);
    await m.update({ where: { id }, data: { deleted: true, rev: c.rev } });
    if (col === 'eventUsers') c.scopeChanged = true;
    if (row.accountId) c.touched.add(row.accountId);
    return { col, id, ok: true, data: null };
  }

  private async savePeople(tx: Tx, c: Ctx, people?: Record<string, any>) {
    if (!people) return;
    const mine = c.scope.kind === 'platform' ? null : new Set(c.scope.accountIds);
    for (const [mobile, rec] of Object.entries(people)) {
      if (!mobOk(mobile)) continue;
      const clean = this.storage.externalize(rec);
      const old = await tx.person.findUnique({ where: { mobile } });
      const claimed: string[] = (clean.accs || []).filter((a: string) => !mine || mine.has(a));
      const accounts = [...new Set([...(old?.accounts ?? []), ...claimed])];
      const data = { ...((old?.data as object) ?? {}), ...clean, accs: accounts };
      await tx.person.upsert({ where: { mobile }, create: { mobile, accounts, data, rev: c.rev }, update: { accounts, data, rev: c.rev, deleted: false } });
    }
  }

  private async saveDocs(tx: Tx, c: Ctx, docs?: Record<string, any>) {
    if (!docs || c.scope.kind !== 'platform') return;
    for (const [key, value] of Object.entries(docs)) {
      if (key.startsWith('_') || DOC_NEVER_FROM_BROWSER.has(key) || Object.values(PLATFORM_ARRAYS).includes(key)) continue;
      const data = this.storage.externalize(value) ?? {};
      await tx.platformDoc.upsert({ where: { key }, create: { key, data, rev: c.rev }, update: { data, rev: c.rev } });
    }
    c.touched.add('*');
  }

  /** New logins made by an owner arrive with their password. It is hashed here and never stored as typed. */
  private async savePasswords(tx: Tx, c: Ctx, pw?: Record<string, string>) {
    if (!pw) return;
    for (const [id, plain] of Object.entries(pw)) {
      const u = await tx.user.findUnique({ where: { id } });
      // the screens check these first, so a refusal here only means someone is tampering
      if (!u || !pwOk(String(plain)) || u.id === c.scope.userId || !this.isOwner(c.scope, u.accountId)) continue;
      await tx.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(plain), data: { ...(u.data as object), ...pwHintFields(plain) }, rev: c.rev },
      });
    }
  }

  async grant(tx: Tx, c: { rev: bigint; validDays: number; touched: Set<string> }, accountId: string, qty: number, amount: number, kind: string, ref: string, code?: string | null, by?: string) {
    const a = await tx.account.findUnique({ where: { id: accountId } });
    if (!a) return;
    const w: any = a.wallet;
    addCredits(w, qty, amount, kind, ref, c.validDays, code);
    walletSync(w, c.validDays);
    await tx.account.update({ where: { id: accountId }, data: { wallet: w, rev: c.rev } });
    await tx.creditTxn.create({ data: { accountId, qty, amount: Math.round(amount), kind, ref, code: code ?? null, by: by ?? null } });
    c.touched.add(accountId);
  }
}
