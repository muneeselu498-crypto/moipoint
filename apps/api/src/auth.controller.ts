import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { cfg, publicBase } from './config';
import { FirebaseService } from './firebase.service';
import { MessagesService } from './messages.service';
import { OtpService } from './otp.service';
import { PrismaService } from './prisma.service';
import { inAccessWindow, Scope, ScopeService } from './scope.service';
import { AuthedRequest, SessionService } from './session';
import { isDataImage } from './storage.service';
import { SyncService } from './sync.service';
import { addDays, checkPassword, emailOk, fail, hashPassword, mobOk, normMob, pwHintFields, pwOk, PW_RULE, today, uid } from './util';
import { addCredits, emptyWallet, walletSync } from './wallet';

const LIMIT = cfg.devTools ? 500 : 20;
const OTP_TEXT = (code: string) => `${code} is your Moi Point code. Don't share it. It expires in 10 minutes.`;
const parse = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const r = schema.safeParse(body);
  return r.success ? r.data : fail('Please check the details and try again.');
};

@Controller('api')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private scopes: ScopeService,
    private sessions: SessionService,
    private otp: OtpService,
    private messages: MessagesService,
    private sync: SyncService,
    private firebase: FirebaseService,
  ) {}

  private clientCfg() {
    return { devTools: cfg.devTools, messages: cfg.messageProvider, payments: cfg.paymentProvider, base: publicBase(), google: this.firebase.webConfig() };
  }

  private async stateFor(scope: Scope, extra: object = {}) {
    return { cfg: this.clientCfg(), me: scope.userId, ...(await this.sync.buildState(scope)), ...extra };
  }

  @Get('state')
  async state(@Req() req: AuthedRequest) {
    return this.stateFor(req.scope, { imp: req.sessionRow?.impersonatorId ?? null });
  }

  private async findLogin(id: string) {
    const direct = await this.prisma.user.findFirst({ where: { deleted: false, status: { not: 'deleted' }, OR: [{ email: id }, { username: id }] } });
    return direct ?? this.prisma.user.findFirst({ where: { deleted: false, status: { not: 'deleted' }, data: { path: ['oldUser'], equals: id } } });
  }

  /** The same three checks the login screen always made. */
  private async refuseLogin(u: any) {
    if (u.status !== 'active') fail('This login is disabled. Ask the admin to enable it.', 403);
    if (u.role !== 'platform' && u.accountId) {
      const a = await this.prisma.account.findUnique({ where: { id: u.accountId } });
      if (a?.status === 'suspended') fail('This account is paused by Moi Point. Call support to reopen it.', 403);
    }
    if (u.role !== 'platform' && u.role !== 'admin') {
      const links = await this.prisma.eventUser.findMany({ where: { userId: u.id, deleted: false } });
      if (links.length) {
        const evs = await this.prisma.event.findMany({ where: { id: { in: links.map((l) => l.eventId) } } });
        const open = links.some((l) => inAccessWindow((l.data as any).access, evs.find((e) => e.id === l.eventId)?.date));
        if (!open) fail('Your access to these events has ended. Ask the event owner to extend it.', 403);
      }
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const b = parse(z.object({ email: z.string().min(1).max(200), password: z.string().min(1).max(200), remember: z.boolean().optional() }), body);
    const u = await this.findLogin(b.email.trim().toLowerCase());
    if (!u || !(await checkPassword(u.passwordHash, b.password))) fail('Email or password is wrong. Check and try again, or tap Forgot password.', 401);
    await this.refuseLogin(u);
    await this.sessions.start(res, u!.id, b.remember !== false);
    return this.stateFor(await this.scopes.forUser(u));
  }

  /**
   * Sign in with Google. The browser hands over the token Google gave it, the server checks it, and then
   * opens the same session a password login does, so every existing protection still applies.
   * Who is Master Admin is decided here, from the server's own setting, never from the browser.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/google')
  @HttpCode(200)
  async google(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const b = parse(z.object({ idToken: z.string().min(20).max(8000), remember: z.boolean().optional() }), body);
    const g = await this.firebase.verify(b.idToken);
    if (!g.email || !g.emailVerified) fail('Your Google account’s email isn’t verified yet. Verify it with Google, then try again.', 403);
    const master = !!cfg.masterAdminEmail && g.email === cfg.masterAdminEmail;
    let u = await this.prisma.user.findFirst({ where: { email: g.email, deleted: false, status: { not: 'deleted' } } });
    if (master) {
      if (u && u.role !== 'platform') fail('This Google account already has a customer login. Ask Moi Point support to move it.', 409);
      u = u ? await this.makeOwner(u) : await this.createOwner(g.email, g.name);
    } else {
      // a new person signs up the usual way, with their email already filled in
      if (!u) return { needsSignup: true, email: g.email, name: g.name };
      // only the one Master Admin reaches Moi Point's staff side through Google; other staff use their password
      if (u.role === 'platform') fail('Moi Point staff sign in with their email and password.', 403);
    }
    await this.refuseLogin(u);
    await this.sessions.start(res, u!.id, b.remember !== false);
    return this.stateFor(await this.scopes.forUser(u));
  }

  private createOwner(email: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      const id = uid('p');
      const data = { id, name: name || 'Master Admin', email, username: email, role: 'platform', prole: 'owner', status: 'active' };
      return tx.user.create({ data: { id, accountId: null, email, username: email, mobile: null, role: 'platform', platformRole: 'owner', status: 'active', passwordHash: null, data, rev } });
    });
  }

  private makeOwner(u: any) {
    if (u.platformRole === 'owner') return u;
    return this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      return tx.user.update({ where: { id: u.id }, data: { platformRole: 'owner', data: { ...(u.data as object), prole: 'owner' }, rev } });
    });
  }

  @Post('auth/logout')
  @HttpCode(200)
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    await this.sessions.end(req, res);
    return { ok: true };
  }

  // ---------- sign up: mobile code, then details ----------

  private nonHelper = (u: any) => u && (u.role === 'admin' || u.role === 'platform');

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/signup/otp')
  @HttpCode(200)
  async signupOtp(@Body() body: unknown) {
    const { mobile } = parse(z.object({ mobile: z.string() }), body);
    const m = normMob(mobile);
    if (!mobOk(m)) fail('Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9)');
    const ex = await this.prisma.user.findFirst({ where: { mobile: m, deleted: false, status: { not: 'deleted' }, role: { not: 'platform' } } });
    if (this.nonHelper(ex)) fail('This number already has an account. Log in with your email and password.', 409, { login: true });
    const code = await this.otp.issue('signup', m);
    await this.messages.sendPlatform({ trigger: 'M1', channel: 'SMS', to: m, text: OTP_TEXT(code), vars: { otp: code } });
    return { ok: true, ...(cfg.devTools ? { devCode: code } : {}) };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/signup/verify')
  @HttpCode(200)
  async signupVerify(@Body() body: unknown) {
    const b = parse(z.object({ mobile: z.string(), code: z.string() }), body);
    return { ticket: await this.otp.check('signup', normMob(b.mobile), '', b.code) };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/signup')
  @HttpCode(200)
  async signup(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const b = parse(
      z.object({
        mobile: z.string(), ticket: z.string(), name: z.string().min(1).max(120), email: z.string().max(200), password: z.string().max(200),
        kind: z.string().max(40).optional(), biz: z.string().max(120).optional(), state: z.string().max(60).optional(), district: z.string().max(60).optional(),
        city: z.string().max(60).optional(), source: z.string().max(60).optional(), photo: z.string().nullable().optional(), lang: z.string().max(8).optional(),
      }),
      body,
    );
    const mobile = normMob(b.mobile);
    const email = b.email.trim().toLowerCase();
    if (!emailOk(email)) fail('Enter a valid email, e.g. name@gmail.com');
    if (!pwOk(b.password)) fail(PW_RULE);
    await this.otp.consume('signup', mobile, '', b.ticket);

    const byEmail = await this.prisma.user.findFirst({ where: { email, deleted: false, status: { not: 'deleted' } } });
    const byMobile = await this.prisma.user.findFirst({ where: { mobile, deleted: false, status: { not: 'deleted' }, role: { not: 'platform' } } });
    if (this.nonHelper(byMobile)) fail('This number already has an account. Log in with your email and password.', 409);
    // A helper can become an owner and keep the same login, but only on the mobile just confirmed.
    // Knowing a helper's email proves nothing, and this step replaces their password.
    const upgrade = byMobile && !this.nonHelper(byMobile) && (!byEmail || byEmail.id === byMobile.id) ? byMobile : null;
    if (byEmail && byEmail.id !== upgrade?.id) fail('This email already has an account. Log in or use another email.', 409);
    if (upgrade && upgrade.status !== 'active') fail('This login is disabled. Ask the admin to enable it.', 403);

    const passwordHash = await hashPassword(b.password);
    const userId = await this.openAccount({ email, mobile, passwordHash, hint: pwHintFields(b.password), upgrade, b, by: 'Sign-up' });
    await this.sessions.start(res, userId, true);
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.stateFor(await this.scopes.forUser(u));
  }

  /**
   * Creating an account with Google. Google has already proved the email, so there is no mobile code step:
   * the person fills in "Your details" and gets their own new family account, like any other sign-up.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/google/signup')
  @HttpCode(200)
  async googleSignup(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const b = parse(
      z.object({
        idToken: z.string().min(20).max(8000), name: z.string().trim().min(1).max(120), mobile: z.string().max(20),
        kind: z.string().max(40).optional(), biz: z.string().max(120).optional(), state: z.string().max(60).optional(), district: z.string().trim().min(1).max(60),
        city: z.string().trim().min(1).max(60), source: z.string().max(60).optional(), photo: z.string().nullable().optional(), lang: z.string().max(8).optional(),
      }),
      body,
    );
    const g = await this.firebase.verify(b.idToken);
    if (!g.email || !g.emailVerified) fail('Your Google account’s email isn’t verified yet. Verify it with Google, then try again.', 403);
    if (cfg.masterAdminEmail && g.email === cfg.masterAdminEmail) fail('This Google account is Moi Point’s Master Admin. Use Continue with Google on the log-in page.', 409);
    const mobile = normMob(b.mobile);
    if (!mobOk(mobile)) fail('Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9)');
    if (await this.prisma.user.findFirst({ where: { email: g.email, deleted: false, status: { not: 'deleted' } } })) {
      fail('This Google account already has a Moi Point login. Continue with Google on the log-in page.', 409);
    }
    if (await this.prisma.user.findFirst({ where: { mobile, deleted: false, status: { not: 'deleted' }, role: { not: 'platform' } } })) {
      fail('This mobile number is already used by another login. Use a different number.', 409);
    }
    const userId = await this.openAccount({ email: g.email, mobile, passwordHash: null, hint: {}, upgrade: null, b, by: 'Google sign-up' });
    await this.sessions.start(res, userId, true);
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.stateFor(await this.scopes.forUser(u));
  }

  /** Creates a family's account and its Owner login. Both sign-up routes use this, so they always match. */
  private openAccount(o: { email: string; mobile: string; passwordHash: string | null; hint: object; upgrade: any; b: any; by: string }) {
    const { email, mobile, passwordHash, hint, upgrade, b } = o;
    // the photo goes straight into pages others open, so only a real image is kept
    const photo = typeof b.photo === 'string' && isDataImage(b.photo) ? b.photo : null;
    return this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      const pricing: any = (await tx.platformDoc.findUnique({ where: { key: 'pricing' } }))?.data ?? {};
      const freeDays = Number((await tx.platformDoc.findUnique({ where: { key: 'freeDays' } }))?.data ?? 365);
      const defaultPlan = String((await tx.platformDoc.findUnique({ where: { key: 'defaultPlan' } }))?.data ?? 'free');
      const validDays = +pricing.validDays || 365;
      const nums = (await tx.account.findMany({ select: { id: true } })).map((a) => +a.id.replace(/\D/g, '') || 0);
      const accId = `A${Math.max(1000, ...nums) + 1}`;
      const id = upgrade?.id ?? uid('u');
      const t = today();
      const userData = {
        ...((upgrade?.data as object) ?? {}), id, acc: accId, name: b.name, email, mobile, username: email, role: 'admin', status: 'active',
        photo: photo ?? (upgrade?.data as any)?.photo ?? null, ...hint,
        ...(upgrade ? { helperFrom: upgrade.accountId, oldUser: upgrade.username !== email ? upgrade.username : (upgrade.data as any)?.oldUser } : {}),
      };
      const row = { accountId: accId, email, username: email, mobile, role: 'admin', status: 'active', passwordHash, data: userData, rev };
      if (upgrade) await tx.user.update({ where: { id }, data: row });
      else await tx.user.create({ data: { id, ...row } });

      const wallet = emptyWallet();
      walletSync(wallet, validDays);
      const trial = +pricing.trial || 0;
      if (trial) addCredits(wallet, trial, 0, 'Welcome credits', 'WELCOME', validDays);
      const sub = { plan: defaultPlan, start: t, end: addDays(t, freeDays), period: 'free', amount: 0 };
      const name = b.biz || `${b.name}${b.kind === 'Family' ? ' Family' : ''}`;
      const data = {
        id: accId, name, kind: b.kind || 'Family', owner: id, city: b.city || '', district: b.district || '', state: b.state || 'Tamil Nadu',
        signup: t, source: b.source || '', plan: defaultPlan, status: 'active', lang: b.lang === 'ta' ? 'ta' : 'en', grants: {}, onboard: {}, sub,
      };
      await tx.account.create({ data: { id: accId, name, status: 'active', plan: defaultPlan, ownerId: id, wallet, data, rev } });
      if (trial) await tx.creditTxn.create({ data: { accountId: accId, qty: trial, kind: 'Welcome credits', ref: 'WELCOME' } });
      const subsDoc = await tx.platformDoc.findUnique({ where: { key: 'subs' } });
      const subs: any[] = Array.isArray(subsDoc?.data) ? (subsDoc!.data as any[]) : [];
      subs.push({ id: uid('s'), acc: accId, from: defaultPlan, to: defaultPlan, amount: 0, at: Date.now(), by: o.by, start: t, end: sub.end, period: 'free', kind: 'Started' });
      await tx.platformDoc.upsert({ where: { key: 'subs' }, create: { key: 'subs', data: subs, rev }, update: { data: subs, rev } });
      return id;
    });
  }

  // ---------- forgot password: email, registered mobile, code, new password ----------

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/forgot/find')
  @HttpCode(200)
  async forgotFind(@Body() body: unknown) {
    const { email } = parse(z.object({ email: z.string().max(200) }), body);
    const u = await this.prisma.user.findFirst({ where: { email: email.trim().toLowerCase(), deleted: false, status: { not: 'deleted' } } });
    if (!u) fail('No account uses this email. Check the spelling.', 404);
    const authCfg: any = (await this.prisma.platformDoc.findUnique({ where: { key: 'authCfg' } }))?.data ?? {};
    const d: any = u!.data;
    // staff logins reach every customer, so they never show a hint
    return { email: u!.email, ...(authCfg.hint !== false && u!.role !== 'platform' ? { pwHint: d.pwHint, pwLen: d.pwLen } : {}) };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/forgot/send')
  @HttpCode(200)
  async forgotSend(@Body() body: unknown) {
    const b = parse(z.object({ email: z.string(), mobile: z.string() }), body);
    const email = b.email.trim().toLowerCase();
    const m = normMob(b.mobile);
    if (!mobOk(m)) fail('Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9)');
    const u = await this.prisma.user.findFirst({ where: { email, deleted: false } });
    if (!u || u.mobile !== m) fail('This mobile number is not registered with this account.');
    const code = await this.otp.issue('reset', email);
    await this.messages.sendPlatform({ trigger: 'M2', channel: 'SMS', to: m, text: OTP_TEXT(code), vars: { otp: code } });
    return { ok: true, ...(cfg.devTools ? { devCode: code } : {}) };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/forgot/verify')
  @HttpCode(200)
  async forgotVerify(@Body() body: unknown) {
    const b = parse(z.object({ email: z.string(), code: z.string() }), body);
    return { ticket: await this.otp.check('reset', b.email.trim().toLowerCase(), '', b.code) };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT, ttl: 60000 } })
  @Post('auth/reset')
  @HttpCode(200)
  async reset(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const b = parse(z.object({ email: z.string(), ticket: z.string(), password: z.string().max(200) }), body);
    if (!pwOk(b.password)) fail(PW_RULE);
    const email = b.email.trim().toLowerCase();
    await this.otp.consume('reset', email, '', b.ticket);
    const u = await this.prisma.user.findFirst({ where: { email, deleted: false } });
    if (!u) return fail('This page has expired', 404);
    await this.setPassword(u, b.password);
    await this.sessions.endAllFor(u.id);
    // a suspended or disabled person gets the new password but stays logged out
    try {
      await this.refuseLogin(u);
    } catch (e: any) {
      return { loggedIn: false, email, error: e.response?.error };
    }
    await this.sessions.start(res, u.id, true);
    return { loggedIn: true, ...(await this.stateFor(await this.scopes.forUser(u))) };
  }

  @Post('auth/password')
  @HttpCode(200)
  async changePassword(@Req() req: AuthedRequest, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const u = req.scope.user;
    if (!u) return fail('Please log in again.', 401);
    if (u.role !== 'admin' && u.role !== 'platform') fail('Your event owner manages your password.', 403);
    const b = parse(z.object({ current: z.string().optional(), password: z.string().max(200) }), body);
    if (u.passwordHash && !(await checkPassword(u.passwordHash, b.current ?? ''))) fail('Current password is not right', 400, { field: 'current' });
    if (!pwOk(b.password)) fail(PW_RULE);
    const row = await this.setPassword(u, b.password);
    await this.sessions.endAllFor(u.id);
    await this.sessions.start(res, u.id, req.sessionRow?.remember ?? true);
    return { ok: true, user: this.sync.toClient('users', row, req.scope) };
  }

  private setPassword(u: any, password: string) {
    return this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      return tx.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(password), data: { ...(u.data as object), ...pwHintFields(password) }, rev } });
    });
  }

  // ---------- finding people outside this browser's own data ----------

  /** "Is this person already on Moi Point?" Used when adding a helper. */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT * 3, ttl: 60000 } })
  @Post('people/find')
  @HttpCode(200)
  async findPerson(@Req() req: AuthedRequest, @Body() body: unknown) {
    const s = req.scope;
    if (s.kind === 'anon') fail('Please log in again.', 401);
    // only people who add helpers need this
    if (s.kind === 'tenant' && !s.ownerOf.length && !Object.values(s.helperOn).some((h) => h.role === 'manager')) fail('Only the owner or an Event Admin can add helpers.', 403);
    const b = parse(z.object({ email: z.string().max(200).optional(), mobile: z.string().max(20).optional() }), body);
    const email = b.email?.trim().toLowerCase();
    const mobile = b.mobile ? normMob(b.mobile) : undefined;
    const u = await this.prisma.user.findFirst({
      where: { deleted: false, status: { not: 'deleted' }, OR: [...(email ? [{ email }, { username: email }] : []), ...(mobile ? [{ mobile, role: { not: 'platform' } }] : [])] },
    });
    if (!u) return { user: null };
    const d: any = u.data;
    return { user: { id: u.id, name: d.name, email: u.email || '', username: u.username, mobile: u.mobile || '', role: u.role, status: u.status, acc: u.accountId } };
  }

  /** Fills a known guest's name and place from their mobile, as the counter always did. */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LIMIT * 6, ttl: 60000 } })
  @Post('people/lookup')
  @HttpCode(200)
  async lookup(@Req() req: AuthedRequest, @Body() body: unknown) {
    if (req.scope.kind === 'anon') fail('Please log in again.', 401);
    const { mobile } = parse(z.object({ mobile: z.string().max(20) }), body);
    const p = await this.prisma.person.findUnique({ where: { mobile: normMob(mobile) } });
    if (!p || p.deleted) return { person: null };
    const d: any = p.data;
    // name and place only: another family's notes about this guest stay with that family
    return { person: { mobile: p.mobile, name: d.name, place: d.place, alt: d.alt, at: d.at, first: d.first, srcs: [], accs: [] } };
  }
}
