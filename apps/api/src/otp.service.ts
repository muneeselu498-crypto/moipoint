import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { fail, otpCode, randomToken, sha256 } from './util';

export type OtpPurpose = 'signup' | 'reset' | 'lead' | 'guest';

const SENDS_PER_HOUR: Record<OtpPurpose, number> = { signup: 5, reset: 3, lead: 3, guest: 3 };
const MAX_TRIES = 5;
const CODE_MINUTES = 10;
const RESEND_SECONDS = 30;
const TICKET_MINUTES = 30;

const hashCode = (purpose: string, target: string, code: string) => sha256(`${purpose}:${target}:${code}`);

/** Codes are made and checked here, so a browser can never see or guess them. */
@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  async issue(purpose: OtpPurpose, target: string, scope = ''): Promise<string> {
    const recent = await this.prisma.otpCode.findMany({
      where: { purpose, target, scope, createdAt: { gte: new Date(Date.now() - 3600e3) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent.length >= SENDS_PER_HOUR[purpose]) fail('Too many codes. Please try again after some time.', 429);
    const gap = recent[0] ? (Date.now() - recent[0].createdAt.getTime()) / 1000 : Infinity;
    if (gap < RESEND_SECONDS) fail(`Please wait ${Math.ceil(RESEND_SECONDS - gap)} seconds before asking for a new code.`, 429);
    const code = otpCode();
    await this.prisma.otpCode.create({
      data: { purpose, target, scope, codeHash: hashCode(purpose, target, code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60e3) },
    });
    return code;
  }

  /** Checks a code and returns a one-use ticket that proves the next step is allowed. */
  async check(purpose: OtpPurpose, target: string, scope: string, code: string): Promise<string> {
    const row = await this.prisma.otpCode.findFirst({ where: { purpose, target, scope }, orderBy: { createdAt: 'desc' } });
    if (!row || row.verifiedAt || row.expiresAt < new Date()) return fail('This code expired. Tap Resend code.');
    if (row.tries >= MAX_TRIES) return fail('Too many wrong tries. Tap Resend code.', 429);
    if (row.codeHash !== hashCode(purpose, target, code)) {
      await this.prisma.otpCode.update({ where: { id: row.id }, data: { tries: { increment: 1 } } });
      return fail(row.tries + 1 >= MAX_TRIES ? 'Too many wrong tries. Tap Resend code.' : 'That code is not right. Check the latest SMS.');
    }
    const ticket = randomToken(24);
    await this.prisma.otpCode.update({ where: { id: row.id }, data: { verifiedAt: new Date(), ticketHash: sha256(ticket) } });
    return ticket;
  }

  /** A ticket works once, for the same person and purpose, within 30 minutes. */
  async consume(purpose: OtpPurpose, target: string, scope: string, ticket: string) {
    const row = await this.prisma.otpCode.findFirst({ where: { purpose, target, scope, ticketHash: sha256(ticket || ''), usedAt: null } });
    if (!row || !row.verifiedAt || Date.now() - row.verifiedAt.getTime() > TICKET_MINUTES * 60e3) {
      fail('This step has expired. Please start again.', 401);
    }
    await this.prisma.otpCode.update({ where: { id: row!.id }, data: { usedAt: new Date() } });
  }

  /** For repeat use within a session, such as several QR entries from one confirmed mobile. */
  async peek(purpose: OtpPurpose, target: string, scope: string, ticket: string) {
    const row = await this.prisma.otpCode.findFirst({ where: { purpose, target, scope, ticketHash: sha256(ticket || '') } });
    return !!row?.verifiedAt && Date.now() - row.verifiedAt.getTime() < TICKET_MINUTES * 60e3;
  }
}
