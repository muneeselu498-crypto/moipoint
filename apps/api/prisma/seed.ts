// Fills an empty database. Always loads the plans, prices and website content.
// With SEED_DEMO=1 it also loads the demo family, events and Moi entries for testing.
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
} catch {
  /* variables come from the environment */
}

const prisma = new PrismaClient();
const demo = process.env.SEED_DEMO === '1';

/** Demo logins only. A real install adds its first staff login with npm run admin:create. */
const DEMO_PASSWORDS: Record<string, string> = {
  u1: 'admin123', u2: 'raj123', u3: 'divya123', u4: 'suresh123',
  p1: 'master123', p2: 'finance123', p3: 'support123', p4: 'marketing123',
};
const SKIP_DOCS = new Set(['tickets', 'leads', 'stockAlerts', 'resets', 'over']);

const DAY = 86400000;
/** The day the demo data was exported from the app. */
const EXPORTED = Date.UTC(2026, 10, 4);

/** Moves every date by the same gap, so the demo's upcoming function is still upcoming whenever someone first runs this. */
function moved(v: any, days: number): any {
  if (typeof v === 'number') return v > 1.6e12 && v < 2.1e12 ? v + days * DAY : v;
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(Date.parse(v) + days * DAY).toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(Date.parse(v) + days * DAY).toISOString();
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => moved(x, days));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, moved(x, days)]));
  return v;
}

async function main() {
  await prisma.syncCounter.upsert({ where: { id: 1 }, create: { id: 1, rev: 1 }, update: {} });
  if (await prisma.platformDoc.findUnique({ where: { key: 'plans' } })) {
    console.log('Database already has data. Nothing to do.');
    return;
  }
  const S = moved(JSON.parse(fs.readFileSync(path.join(__dirname, 'seed/demo-state.json'), 'utf8')), Math.round((Date.now() - EXPORTED) / DAY));
  const rev = 1n;

  for (const [key, value] of Object.entries(S.platform)) {
    if (SKIP_DOCS.has(key) || value === null || value === undefined) continue;
    const data = key === 'platLog' ? [] : key === 'provBal' ? 0 : (value as any);
    await prisma.platformDoc.create({ data: { key, data, rev } });
  }
  await prisma.platformDoc.create({ data: { key: 'authCfg', data: S.platform.authCfg ?? {}, rev } }).catch(() => {});

  if (!demo) {
    await prisma.platformDoc.create({ data: { key: '_counters', data: { evSeq: 0 } } });
    console.log('Loaded settings only. Add the first Master Admin login with npm run admin:create.');
    return;
  }

  await prisma.platformDoc.create({ data: { key: '_counters', data: { evSeq: S.evSeq || S.events.length } } });

  for (const u of S.users) {
    const data = { ...u };
    delete data.pw;
    await prisma.user.create({
      data: {
        id: u.id, accountId: u.acc ?? null, email: u.email ? u.email.toLowerCase() : null, username: String(u.username || u.email).toLowerCase(), mobile: u.mobile || null,
        role: u.role, platformRole: u.prole ?? null, status: u.status || 'active', passwordHash: DEMO_PASSWORDS[u.id] ? await hash(DEMO_PASSWORDS[u.id]) : null, data, rev,
      },
    });
  }
  for (const a of S.accounts) {
    const data = { ...a };
    delete data.wallet;
    await prisma.account.create({ data: { id: a.id, name: a.name, status: a.status || 'active', plan: a.plan || 'free', ownerId: a.owner ?? null, wallet: a.wallet, data, rev } });
  }
  for (const e of S.events) {
    const seqs = S.moi.filter((m: any) => m.event_id === e.id).map((m: any) => +String(m.code).split('/').pop()!);
    await prisma.event.create({ data: { id: e.id, accountId: e.acc, no: e.no, token: e.token ?? null, date: e.date ?? null, status: e.status, moiSeq: Math.max(0, +e.moiSeq || 0, ...seqs), data: e, rev } });
  }
  const accOf = (eid: string) => S.events.find((e: any) => e.id === eid)?.acc;
  for (const x of S.eventUsers) await prisma.eventUser.create({ data: { id: x.id, accountId: accOf(x.event_id), eventId: x.event_id, userId: x.user_id, role: x.role, data: x, rev } });
  for (const m of S.moi) {
    await prisma.moi.create({
      data: { id: m.id, accountId: accOf(m.event_id), eventId: m.event_id, code: m.code, seq: +String(m.code).split('/').pop()!, mobile: m.c?.mobile || null, status: m.status, mode: m.mode || 'cash', amount: Math.round(+m.amount || 0), data: m, rev },
    });
  }
  for (const x of S.expenses) await prisma.expense.create({ data: { id: x.id, accountId: accOf(x.event_id), eventId: x.event_id, data: x, rev } });
  for (const x of S.payouts) await prisma.payout.create({ data: { id: x.id, accountId: accOf(x.event_id), eventId: x.event_id, data: x, rev } });
  for (const x of S.reminders) {
    const owner = x.owner ?? 'u1';
    await prisma.reminder.create({ data: { id: x.id, accountId: S.users.find((u: any) => u.id === owner)?.acc ?? null, ownerId: owner, data: { ...x, owner }, rev } });
  }
  for (const x of S.msgLog) await prisma.msgLog.create({ data: { id: x.id, accountId: x.acc, eventId: x.ev ?? null, data: x, rev } });
  for (const x of S.notifications) {
    await prisma.notification.create({
      data: { id: x.id, accountId: x.eid ? accOf(x.eid) : 'A1001', eventId: x.eid ?? null, ownerId: x.owner ?? null, channel: x.channel, status: x.status, dispatchedAt: new Date(), data: x, rev },
    });
  }
  for (const x of S.audit) await prisma.audit.create({ data: { id: x.id, accountId: x.acc ?? (x.eid ? accOf(x.eid) : null), eventId: x.eid ?? null, data: x, rev } });
  for (const t of S.platform.tickets || []) await prisma.ticket.create({ data: { id: t.id, accountId: t.acc, data: t, rev } });
  for (const [mobile, p] of Object.entries<any>(S.people || {})) await prisma.person.create({ data: { mobile, accounts: p.accs || [], data: p, rev } });

  console.log(`Loaded demo data: ${S.users.length} logins, ${S.events.length} events, ${S.moi.length} Moi entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
