import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';
import { cfg } from './config';
import { MessagesService } from './messages.service';
import { OtpService } from './otp.service';
import { mergePerson } from './people';
import { PrismaService, Tx } from './prisma.service';
import { isDataImage, StorageService } from './storage.service';
import { StreamService } from './stream.service';
import { fail, fmt, maskMob, mobOk, normMob, nowT, today, uid } from './util';
import { spendCredit } from './wallet';

const LIMIT = cfg.devTools ? 500 : 30;
const GUEST_CODES_PER_HOUR = 300;
const GUEST_ENTRIES_PER_HOUR = 10;
const parse = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const r = schema.safeParse(body);
  return r.success ? r.data : fail('Please check the details and try again.');
};

/** The same wording the app used, from the automation report (C5, C6). */
const QRMSG: Record<string, Record<string, (m: any, ev: any) => string>> = {
  tocollect: {
    en: (m, e) => `Hello ${m.c.name}, your Moi of ${fmt(m.amount)} for ${e.name} is noted. No. ${m.code}. Status: PENDING – please pay at the Moi counter and show this number. Thank you! – Moi Point`,
    ta: (m, e) => `வணக்கம் ${m.c.name}, ${e.name} விழாவுக்கான உங்கள் ${fmt(m.amount)} மொய் விவரம் பதிவானது. எண்: ${m.code}. நிலை: நிலுவை – மொய் கவுண்டரில் பணம் செலுத்தி இந்த எண்ணைக் காட்டுங்கள். நன்றி! – Moi Point`,
  },
  pending: {
    en: (m, e) => `Hello ${m.c.name}, we got your UPI payment details for ${fmt(m.amount)} at ${e.name}. No. ${m.code}. Status: PENDING until the family checks it. If you have not paid yet, pay at the counter or online. – Moi Point`,
    ta: (m, e) => `வணக்கம் ${m.c.name}, ${e.name} விழாவுக்கு ${fmt(m.amount)} UPI கட்டண விவரம் கிடைத்தது. எண்: ${m.code}. நிலை: குடும்பத்தினர் சரிபார்க்கும் வரை நிலுவை. இன்னும் செலுத்தவில்லை என்றால் கவுண்டரில் அல்லது ஆன்லைனில் செலுத்துங்கள். – Moi Point`,
  },
  verified: {
    en: (m, e) => `Your Moi of ${fmt(m.amount)} for ${e.name} has been received and verified. Receipt ${m.code}. Thank you!`,
    ta: (m, e) => `${e.name} – உங்கள் ${fmt(m.amount)} மொய் பெறப்பட்டு சரிபார்க்கப்பட்டது. ரசீது எண்: ${m.code}. நன்றி!`,
  },
};
const TRIGGER: Record<string, string> = { tocollect: 'C5', pending: 'C6', verified: 'C7' };

@Controller('api/public')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: LIMIT * 4, ttl: 60000 } })
export class PublicController {
  constructor(
    private prisma: PrismaService,
    private otp: OtpService,
    private messages: MessagesService,
    private storage: StorageService,
    private stream: StreamService,
  ) {}

  private async findEvent(key: string) {
    const k = decodeURIComponent(String(key || ''));
    const up = k.toUpperCase().replace(/^EV-(\d+)$/, 'EV$1');
    // the printed number always wins, so nothing can stand in for a real function's QR
    return (
      (await this.prisma.event.findFirst({ where: { deleted: false, no: up } })) ??
      (await this.prisma.event.findFirst({ where: { deleted: false, token: k } })) ??
      (await this.prisma.event.findFirst({ where: { deleted: false, data: { path: ['oldNo'], equals: up } } }))
    );
  }

  /** What a stranger with the QR may see. Bank details, helpers and other guests stay out. */
  private publicEvent(ev: any) {
    const d = { ...(ev.data as any) };
    delete d.bank;
    delete d.orgEmail;
    delete d.bookSent;
    return { ...d, id: ev.id, no: ev.no, token: ev.token, acc: ev.accountId, status: ev.status };
  }
  private publicAccount(a: any) {
    const d: any = a.data;
    return { id: a.id, name: a.name, status: a.status, plan: a.plan, sub: d.sub, lang: d.lang, wallet: { credits: 0, used: 0, usage: {}, purchases: [], batches: [] }, grants: {}, onboard: {} };
  }

  @Get('event/:key')
  async event(@Param('key') key: string) {
    const ev = await this.findEvent(key);
    if (!ev) return { event: null };
    const a = await this.prisma.account.findUnique({ where: { id: ev.accountId } });
    return { event: this.publicEvent(ev), account: a ? this.publicAccount(a) : null };
  }

  /** C8. The guest's code is paid from the family's credits, as the report describes. */
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('otp/send')
  @HttpCode(200)
  async otpSend(@Body() body: unknown) {
    const b = parse(z.object({ eventId: z.string(), mobile: z.string() }), body);
    const m = normMob(b.mobile);
    if (!mobOk(m)) fail('Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9)');
    const ev = await this.prisma.event.findUnique({ where: { id: b.eventId } });
    if (!ev || ev.deleted || !['active', 'completed'].includes(ev.status)) return fail('This event link isn’t active');
    if ((await this.prisma.account.findUnique({ where: { id: ev.accountId }, select: { status: true } }))?.status === 'suspended') fail('This event is paused. Please give your Moi at the counter.');
    // a public page could be used to burn a family's credits, so each function has an hourly ceiling
    const recent = await this.prisma.otpCode.count({ where: { purpose: 'guest', scope: ev.id, createdAt: { gte: new Date(Date.now() - 3600e3) } } });
    if (recent >= GUEST_CODES_PER_HOUR) fail('Too many codes right now. Please give your Moi at the counter.', 429);
    const code = await this.otp.issue('guest', m, ev.id);
    const text = `${code} is your Moi Point code for ${(ev.data as any).name}. Don’t share it. It expires in 10 minutes.`;
    const id = await this.prisma.$transaction(async (tx) => this.chargeAndQueue(tx, ev, { trigger: 'C8', channel: 'SMS', to: m, text, vars: { otp: code, event: (ev.data as any).name }, shownText: `Verification code sent to +91 ${maskMob(m)}` }));
    if (!id) fail('We can’t send the code right now. Please give your Moi at the counter.', 402);
    this.messages.deliver([id!]);
    return { ok: true, ...(cfg.devTools ? { devCode: code } : {}) };
  }

  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('otp/verify')
  @HttpCode(200)
  async otpVerify(@Body() body: unknown) {
    const b = parse(z.object({ eventId: z.string(), mobile: z.string(), code: z.string() }), body);
    return { ticket: await this.otp.check('guest', normMob(b.mobile), b.eventId, b.code) };
  }

  /** Spends one of the family's credits and queues the message. Returns null when none are left. */
  private async chargeAndQueue(tx: Tx, ev: any, m: { trigger: string; channel: string; to: string; text: string; vars?: any; shownText?: string; mid?: string }) {
    const rev = await this.messages.bump(tx);
    const a = await tx.account.findUnique({ where: { id: ev.accountId } });
    const pricing: any = (await tx.platformDoc.findUnique({ where: { key: 'pricing' } }))?.data ?? {};
    const w: any = a?.wallet;
    const nid = uid('n');
    if (!a || !spendCredit(w, +pricing.validDays || 365)) {
      await tx.notification.create({
        data: { id: nid, accountId: ev.accountId, eventId: ev.id, channel: m.channel, status: 'Not sent · no credits', dispatchedAt: new Date(), rev, data: { id: nid, eid: ev.id, channel: m.channel, to: m.to, text: m.shownText ?? m.text, status: 'Not sent · no credits', at: Date.now(), mid: m.mid ?? null } },
      });
      this.stream.publish([ev.accountId], Number(rev));
      return null;
    }
    w.usage = w.usage || {};
    w.usage[ev.id] = (w.usage[ev.id] || 0) + 1;
    await tx.account.update({ where: { id: a.id }, data: { wallet: w, rev } });
    await tx.notification.create({
      data: { id: nid, accountId: ev.accountId, eventId: ev.id, channel: m.channel, status: 'Sent', dispatchedAt: new Date(), rev, data: { id: nid, eid: ev.id, channel: m.channel, to: m.to, text: m.shownText ?? m.text, status: 'Sent', at: Date.now(), mid: m.mid ?? null, cat: 'util' } },
    });
    const id = await this.messages.enqueue(tx, { trigger: m.trigger, channel: m.channel, to: m.to, text: m.text, vars: m.vars, paidBy: 'customer', accountId: ev.accountId, eventId: ev.id, notificationId: nid });
    this.stream.publish([ev.accountId], Number(rev));
    return id;
  }

  /** A guest's own entry from the QR page. Needs a mobile they just confirmed. */
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('moi')
  @HttpCode(200)
  async createMoi(@Body() body: unknown) {
    const b = parse(
      z.object({
        eventId: z.string(), mobile: z.string(), ticket: z.string(), mode: z.enum(['cash', 'upi', 'online']), amount: z.number().int().positive().max(100000000),
        c: z.object({ name: z.string().min(1).max(120), relationship: z.string().max(80).optional(), place: z.string().max(120).optional(), designation: z.string().max(120).optional(), address: z.string().max(300).optional(), notes: z.string().max(500).optional(), alt: z.record(z.string(), z.string().max(200)).optional(), consent: z.boolean().optional() }),
        utr: z.string().max(40).optional(), shot: z.string().max(12000000).nullable().optional(), upiAcc: z.number().int().min(0).max(20).nullable().optional(), fee: z.number().min(0).max(100000000).optional(), feeBy: z.enum(['guest', 'family']).optional(),
      }),
      body,
    );
    const mobile = normMob(b.mobile);
    if (!(await this.otp.peek('guest', mobile, b.eventId, b.ticket))) fail('Please confirm your mobile again.', 401);
    // the screenshot goes straight into a page the family opens, so only a real image is kept
    if (b.shot && !isDataImage(b.shot)) fail('Attach the payment screenshot as a photo.');
    // each entry uses one of the family's credits, so one confirmed mobile can't keep adding them
    const mine = await this.prisma.moi.count({ where: { eventId: b.eventId, mobile, createdAt: { gte: new Date(Date.now() - 3600e3) } } });
    if (mine >= GUEST_ENTRIES_PER_HOUR) fail('Too many entries from this number. Please give your Moi at the counter.', 429);
    const ev = await this.prisma.event.findUnique({ where: { id: b.eventId } });
    if (!ev || ev.deleted || !['active', 'completed'].includes(ev.status)) return fail('This event isn’t taking Moi. Please give your Moi at the counter.');
    const acct = await this.prisma.account.findUnique({ where: { id: ev.accountId } });
    if (acct?.status === 'suspended') fail('This event is paused. Please give your Moi at the counter.');
    const d: any = ev.data;
    const allowed = d.qrModes ? !!d.qrModes[b.mode] : !d.modes || !!d.modes[b.mode];
    if (!allowed) fail('This way of paying is switched off for this event.');
    if (b.mode === 'online' && !(cfg.paymentProvider === 'simulate' && cfg.devTools)) fail('Online payment isn’t available yet. Please pay at the counter.');
    if (b.mode === 'upi' && !b.shot && !b.utr) fail('Attach the payment screenshot or type the UTR number');

    const status = b.mode === 'cash' ? 'tocollect' : b.mode === 'upi' ? 'pending' : 'verified';
    const shot = b.shot ? this.storage.externalize(b.shot) : null;
    const created = await this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      const fresh = await tx.event.findUnique({ where: { id: ev.id } });
      const agg = await tx.moi.aggregate({ where: { eventId: ev.id }, _max: { seq: true } });
      const seq = Math.max(agg._max.seq || 0, fresh!.moiSeq) + 1;
      await tx.event.update({ where: { id: ev.id }, data: { moiSeq: seq } });
      const code = `${ev.no}/${String(seq).padStart(3, '0')}`;
      const id = uid('m');
      const c = { ...b.c, mobile, ...(b.c.consent ? { consent: true, consentAt: Date.now() } : {}) };
      const m: any = {
        id, code, device: 'QR', pending: false, event_id: ev.id, c, amount: b.amount, mode: b.mode, status, utr: b.utr || '', ref: '', gref: b.mode === 'online' ? uid('pay_') : '',
        shot, date: today(), time: nowT(), collected_by: 'qr', created_at: Date.now(), upiAcc: b.upiAcc ?? undefined, fee: b.fee || 0, feeBy: b.feeBy, kind: 'cash', gift: null, est: 0,
      };
      await tx.moi.create({ data: { id, accountId: ev.accountId, eventId: ev.id, code, seq, mobile, status, mode: b.mode, amount: b.amount, data: m, rev } });
      // the guest is known next time, the same as an entry made at the counter
      const person = await tx.person.findUnique({ where: { mobile } });
      const accounts = [...new Set([...(person?.accounts ?? []), ev.accountId])];
      const known = mergePerson(person?.data, mobile, ev.accountId, accounts, { name: c.name, place: c.place, des: c.designation, rel: c.relationship, address: c.address, alt: c.alt, src: 'moi' }, !!b.c.consent);
      await tx.person.upsert({ where: { mobile }, create: { mobile, accounts, data: known, rev }, update: { accounts, data: known, rev, deleted: false } });
      const auditId = uid('l');
      await tx.audit.create({ data: { id: auditId, accountId: ev.accountId, eventId: ev.id, rev, data: { id: auditId, acc: ev.accountId, uid: null, at: new Date().toISOString(), user: 'Guest (QR page)', role: 'Guest', eid: ev.id, action: 'Moi added', detail: `${fmt(b.amount)} from ${c.name}` } } });
      const lang = d.lang === 'en' ? 'en' : 'ta';
      const text = QRMSG[status][lang](m, d);
      const msg = await this.chargeAndQueue(tx, ev, { trigger: TRIGGER[status], channel: 'WhatsApp', to: mobile, text, vars: { guest: c.name, amount: fmt(b.amount), event: d.name, receipt: code }, mid: id });
      m.notified = [{ channel: 'WhatsApp', status: msg ? 'Sent' : 'Not sent · no credits' }];
      await tx.moi.update({ where: { id }, data: { data: m } });
      return { m, msg, rev };
    });
    if (created.msg) this.messages.deliver([created.msg]);
    this.stream.publish([ev.accountId], Number(created.rev));
    return { moi: created.m };
  }

  /** Lets the guest's page see when the counter accepts their entry. */
  @Get('moi/:id')
  async moiStatus(@Param('id') id: string, @Query('mobile') mobile: string, @Query('ticket') ticket: string) {
    const m = await this.prisma.moi.findUnique({ where: { id } });
    if (!m || m.deleted || m.mobile !== normMob(mobile) || !(await this.otp.peek('guest', m.mobile!, m.eventId, ticket))) return fail('Not found', 404);
    return { moi: m.data };
  }

  /** The receipt check page: proves a receipt is genuine without showing private details. */
  @Get('receipt')
  async receipt(@Query('code') code: string) {
    const m = await this.prisma.moi.findFirst({ where: { code: { equals: String(code || '').trim(), mode: 'insensitive' }, deleted: false } });
    if (!m) return { moi: null };
    const ev = await this.prisma.event.findUnique({ where: { id: m.eventId } });
    const a = ev ? await this.prisma.account.findUnique({ where: { id: ev.accountId } }) : null;
    const d: any = { ...(m.data as object) };
    delete d.shot;
    delete d.notified;
    d.c = { name: d.c?.name, relationship: d.c?.relationship, place: d.c?.place, mobile: d.c?.mobile ? maskMob(d.c.mobile) : '' };
    return { moi: d, event: ev ? this.publicEvent(ev) : null, account: a ? this.publicAccount(a) : null };
  }

  // ---------- website demo and enquiry forms (M3) ----------

  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('lead/otp')
  @HttpCode(200)
  async leadOtp(@Body() body: unknown) {
    const { mobile } = parse(z.object({ mobile: z.string() }), body);
    const m = normMob(mobile);
    if (!mobOk(m)) fail('Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9)');
    const code = await this.otp.issue('lead', m);
    await this.messages.sendPlatform({ trigger: 'M3', channel: 'SMS', to: m, text: `${code} is your Moi Point code. Don't share it. It expires in 10 minutes.`, vars: { otp: code } });
    return { ok: true, ...(cfg.devTools ? { devCode: code } : {}) };
  }

  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('lead/verify')
  @HttpCode(200)
  async leadVerify(@Body() body: unknown) {
    const b = parse(
      z.object({ mobile: z.string(), code: z.string(), kind: z.string().max(20), data: z.object({ name: z.string().max(120).optional(), fn: z.string().max(120).optional(), city: z.string().max(120).optional(), date: z.string().max(20).optional(), msg: z.string().max(2000).optional() }) }),
      body,
    );
    const m = normMob(b.mobile);
    await this.otp.check('lead', m, '', b.code);
    const id = uid('ld');
    const at = Date.now();
    const lead = {
      id, kind: b.kind, ...b.data, mobile: m, verified: 1, at, status: 'new', stage: 'new', ref: `MP-${String(at).slice(-6)}`,
      notes: [{ at, by: 'Website', kind: 'sys', text: `${b.kind === 'demo' ? 'Demo booked' : 'Enquiry'} on the website · mobile confirmed by OTP` }],
    };
    const rev = await this.prisma.$transaction(async (tx) => {
      const r = await this.messages.bump(tx);
      await tx.lead.create({ data: { id, data: lead, rev: r } });
      return r;
    });
    this.stream.publish(['*'], Number(rev));
    return { lead };
  }
}
