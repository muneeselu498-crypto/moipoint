import { Body, Controller, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { BookService } from './book.service';
import { cfg } from './config';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';
import { ScopeService } from './scope.service';
import { AuthedRequest, SessionService } from './session';
import { StreamService } from './stream.service';
import { SyncService } from './sync.service';
import { addDays, fail, mobOk, normMob, today, uid } from './util';
import { priceOf } from './wallet';

const parse = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const r = schema.safeParse(body);
  return r.success ? r.data : fail('Please check the details and try again.');
};

@Controller('api')
export class AccountController {
  constructor(
    private prisma: PrismaService,
    private sync: SyncService,
    private messages: MessagesService,
    private stream: StreamService,
    private sessions: SessionService,
    private scopes: ScopeService,
    private books: BookService,
  ) {}

  /** Buying message credits. The price is worked out here, so a browser can't choose its own. */
  @Post('credits/purchase')
  @HttpCode(200)
  async purchase(@Req() req: AuthedRequest, @Body() body: unknown) {
    const s = req.scope;
    const b = parse(z.object({ accountId: z.string(), qty: z.number().int().min(100).max(10000000), code: z.string().max(40).nullable().optional() }), body);
    const manager = Object.values(s.helperOn).some((h) => h.role === 'manager' && h.accountId === b.accountId);
    if (!s.ownerOf.includes(b.accountId) && !manager) fail('Only the owner or an Event Admin can buy credits.', 403);
    if (cfg.paymentProvider !== 'simulate') fail('Online payment isn’t connected yet.', 503);

    const out = await this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      const doc = async (key: string) => (await tx.platformDoc.findUnique({ where: { key } }))?.data as any;
      const pricing = (await doc('pricing')) ?? {};
      const stock = Number((await doc('stock')) ?? 0);
      const coupons: any[] = (await doc('coupons')) ?? [];
      let coupon: any = null;
      if (b.code) {
        coupon = coupons.find((x) => x.code.toLowerCase() === String(b.code).trim().toLowerCase());
        if (!coupon) fail('That code doesn’t exist. Check the spelling.');
        if (!coupon.on) fail('This code is switched off.');
        if (coupon.until && today() > coupon.until) fail(`This code expired on ${coupon.until}.`);
        if (coupon.max && coupon.used >= coupon.max) fail('This code has been used the maximum number of times.');
      }
      const bonus = coupon?.type === 'bonus' ? +coupon.value : 0;
      const pr = priceOf(b.qty, +pricing.perMsg || 0, +pricing.gst || 0, coupon?.type === 'discount' ? +coupon.value : 0);
      if (b.qty + bonus > stock) fail(`Only ${stock} credits are available right now. Choose a smaller pack.`);
      const ref = `MP-PAY-${Date.now().toString().slice(-6)}`;
      const ctx = { rev, validDays: +pricing.validDays || 365, touched: new Set<string>() };
      await this.sync.grant(tx, ctx, b.accountId, b.qty + bonus, pr.total, coupon ? `${b.qty} credits + code ${coupon.code}` : `${b.qty} credits`, ref, coupon?.code ?? null, s.user?.id);
      await tx.platformDoc.update({ where: { key: 'stock' }, data: { data: stock - b.qty - bonus, rev } });
      if (coupon) {
        coupon.used = (coupon.used || 0) + 1;
        await tx.platformDoc.update({ where: { key: 'coupons' }, data: { data: coupons, rev } });
      }
      await tx.payment.create({ data: { accountId: b.accountId, provider: cfg.paymentProvider, purpose: 'credits', qty: b.qty + bonus, amount: Math.round(pr.total), status: 'paid', ref, meta: { code: coupon?.code ?? null } } });
      return { rev, total: pr.total, credits: b.qty + bonus };
    });
    this.stream.publish([b.accountId], Number(out.rev));
    const a = await this.prisma.account.findUnique({ where: { id: b.accountId } });
    return { rev: Number(out.rev), total: out.total, credits: out.credits, account: this.sync.toClient('accounts', a, s) };
  }

  /** Paying for a yearly plan. Same rule: the amount comes from stored prices, not the browser. */
  @Post('plan/pay')
  @HttpCode(200)
  async planPay(@Req() req: AuthedRequest, @Body() body: unknown) {
    const s = req.scope;
    const b = parse(z.object({ plan: z.string().max(30) }), body);
    const accId = s.ownerOf[0];
    if (!accId) return fail('Only the owner can change the plan.', 403);
    if (cfg.paymentProvider !== 'simulate') fail('Online payment isn’t connected yet.', 503);
    const out = await this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      const plans: any = (await tx.platformDoc.findUnique({ where: { key: 'plans' } }))?.data ?? {};
      const p = plans[b.plan];
      if (!p) fail('That plan doesn’t exist.');
      const a = await tx.account.findUnique({ where: { id: accId } });
      const d: any = a!.data;
      const amount = +p.yearly || 0;
      const from = a!.plan === b.plan && d.sub?.end >= today() ? addDays(d.sub.end, 1) : today();
      const sub = { plan: b.plan, start: d.sub?.start ?? from, end: addDays(from, 365), period: 'year', amount };
      await tx.account.update({ where: { id: accId }, data: { plan: b.plan, data: { ...d, plan: b.plan, sub }, rev } });
      await tx.payment.create({ data: { accountId: accId, provider: cfg.paymentProvider, purpose: 'plan', amount: Math.round(amount), status: 'paid', ref: `MP-PLAN-${Date.now().toString().slice(-6)}`, meta: { plan: b.plan } } });
      const subsDoc = await tx.platformDoc.findUnique({ where: { key: 'subs' } });
      const subs: any[] = Array.isArray(subsDoc?.data) ? (subsDoc!.data as any[]) : [];
      subs.push({ id: uid('s'), acc: accId, from: a!.plan, to: b.plan, amount, at: Date.now(), by: s.user?.id, start: from, end: sub.end, period: 'year', kind: a!.plan === b.plan ? 'Renewed' : 'Upgraded' });
      await tx.platformDoc.upsert({ where: { key: 'subs' }, create: { key: 'subs', data: subs, rev }, update: { data: subs, rev } });
      return rev;
    });
    this.stream.publish([accId], Number(out));
    const a = await this.prisma.account.findUnique({ where: { id: accId } });
    return { rev: Number(out), account: this.sync.toClient('accounts', a, s) };
  }

  /** "Send again" on the Moi Book card. */
  @Post('events/:id/book')
  @HttpCode(200)
  async book(@Req() req: AuthedRequest, @Param('id') id: string) {
    const s = req.scope;
    const ev = await this.prisma.event.findUnique({ where: { id } });
    if (!ev) return fail('That event doesn’t exist.', 404);
    const can = s.kind === 'platform' || s.ownerOf.includes(ev.accountId) || s.helperOn[id]?.role === 'manager';
    if (!can) fail('You can’t send this.', 403);
    if (!(await this.books.send(ev, true))) fail('There is no mobile or email to send it to.');
    return { ok: true };
  }

  // ---------- Moi Point staff ----------

  private staff(req: AuthedRequest) {
    if (req.scope.kind !== 'platform') fail('This is for Moi Point staff.', 403);
  }

  /** Support view: staff see a customer's account. The session remembers who is really behind it. */
  @Post('admin/impersonate')
  @HttpCode(200)
  async impersonate(@Req() req: AuthedRequest, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    this.staff(req);
    const { userId } = parse(z.object({ userId: z.string() }), body);
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u || u.role === 'platform') return fail('That person can’t be opened.', 404);
    const staffId = req.scope.userId!;
    await this.sessions.end(req, res);
    await this.sessions.start(res, u.id, false, staffId);
    const scope = await this.scopes.forUser(u);
    return { me: u.id, imp: staffId, ...(await this.sync.buildState(scope)) };
  }

  @Post('admin/impersonate/exit')
  @HttpCode(200)
  async impersonateExit(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    const staffId = req.sessionRow?.impersonatorId;
    if (!staffId) return fail('This isn’t a support view.', 400);
    await this.sessions.end(req, res);
    await this.sessions.start(res, staffId, false);
    const u = await this.prisma.user.findUnique({ where: { id: staffId } });
    const scope = await this.scopes.forUser(u);
    return { me: staffId, ...(await this.sync.buildState(scope)) };
  }

  /**
   * M6. Guests only receive offers if they said yes. No consent box exists yet, so today this
   * reaches organisers only. That is deliberate: see "Open decisions" in the automation report.
   */
  @Post('admin/campaign')
  @HttpCode(200)
  async campaign(@Req() req: AuthedRequest, @Body() body: unknown) {
    this.staff(req);
    const b = parse(z.object({ aud: z.enum(['organizers', 'guests']), ch: z.enum(['wa', 'sms', 'both']), text: z.string().min(1).max(4000), mobiles: z.array(z.string()).max(50000) }), body);
    let mobiles = [...new Set(b.mobiles.map(normMob).filter(mobOk))];
    let skipped = 0;
    if (b.aud === 'guests') {
      const people = await this.prisma.person.findMany({ where: { mobile: { in: mobiles } } });
      const ok = new Set(people.filter((p) => (p.data as any).consent === true && !(p.data as any).optOut).map((p) => p.mobile));
      skipped = mobiles.filter((m) => !ok.has(m)).length;
      mobiles = mobiles.filter((m) => ok.has(m));
    }
    const channels = b.ch === 'both' ? ['WhatsApp', 'SMS'] : b.ch === 'wa' ? ['WhatsApp'] : ['SMS'];
    const ids: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const to of mobiles) for (const channel of channels) ids.push(await this.messages.enqueue(tx, { trigger: 'M6', channel, to, text: b.text, paidBy: 'platform' }));
      await this.messages.logPlatformCost(tx, 'M6', ids.length, 'campaign');
    }, { timeout: 60000 });
    this.messages.deliver(ids);
    return { sent: ids.length, skipped };
  }
}
