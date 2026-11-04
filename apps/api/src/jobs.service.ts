import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BookService } from './book.service';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';
import { StreamService } from './stream.service';
import { dfmt, fmt, tfmt, uid } from './util';
import { spendCredit } from './wallet';

/**
 * Work that must happen on time even when nobody has the app open. In the prototype these
 * ran only inside an open browser, so a function ending at night sent nothing until morning.
 */
@Injectable()
export class JobsService {
  private log = new Logger('Jobs');
  private current: Promise<void> | null = null;

  constructor(private prisma: PrismaService, private messages: MessagesService, private books: BookService, private stream: StreamService) {}

  @Interval(30000)
  tick() {
    this.current ??= this.work().finally(() => { this.current = null; });
    return this.current;
  }

  private async work() {
    try {
      await this.eventStatus();
      await this.reminders();
      await this.moiBooks();
    } catch (e: any) {
      this.log.error(e.message);
    }
  }

  /** Active while the function runs, Completed once its end time passes. */
  private async eventStatus() {
    const events = await this.prisma.event.findMany({ where: { deleted: false, status: { in: ['active', 'completed'] }, date: { not: null } } });
    for (const ev of events) {
      const want = Date.now() > this.books.endAt(ev.data) ? 'completed' : 'active';
      if (ev.status === want) continue;
      const rev = await this.prisma.$transaction(async (tx) => {
        const r = await this.messages.bump(tx);
        await tx.event.update({ where: { id: ev.id }, data: { status: want, data: { ...(ev.data as object), status: want }, rev: r } });
        return r;
      });
      this.stream.publish([ev.accountId], Number(rev));
    }
  }

  /** C10. Reminders fire the set number of days before the function, at the set hour. */
  private async reminders() {
    const rows = await this.prisma.reminder.findMany({ where: { deleted: false } });
    const now = new Date();
    for (const r of rows) {
      const d: any = r.data;
      if (d.status === 'done' || d.sent || !d.date) continue;
      const at = new Date(`${d.date}T${d.at || '09:00'}:00`);
      at.setDate(at.getDate() - (+d.before || 0));
      if (at > now) continue;
      await this.fireReminder(r, d);
    }
  }

  private async fireReminder(r: any, d: any) {
    const text = `Reminder: ${d.title} on ${dfmt(d.date)}${d.time ? ` at ${tfmt(d.time)}` : ''}.${d.amount ? ` Moi to give: ${fmt(d.amount)}.` : ''}`;
    const u = await this.prisma.user.findUnique({ where: { id: r.ownerId } });
    const out = await this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      const ids: string[] = [];
      await tx.reminder.update({ where: { id: r.id }, data: { data: { ...d, sent: true }, rev } });
      const note = async (channel: string, status: string, to: string) => {
        const id = uid('n');
        await tx.notification.create({ data: { id, accountId: r.accountId, ownerId: r.ownerId, channel, status, dispatchedAt: new Date(), rev, data: { id, eid: null, owner: r.ownerId, channel, to, text, status, at: Date.now() } } });
        return id;
      };
      await note('In app', 'Sent', (u?.data as any)?.name || '');
      const channels = [d.via?.wa ? 'WhatsApp' : '', d.via?.sms ? 'SMS' : ''].filter(Boolean);
      const acct = r.accountId ? await tx.account.findUnique({ where: { id: r.accountId } }) : null;
      const pricing: any = (await tx.platformDoc.findUnique({ where: { key: 'pricing' } }))?.data ?? {};
      for (const ch of channels) {
        if (!u?.mobile || !acct) continue;
        const w: any = acct.wallet;
        if (spendCredit(w, +pricing.validDays || 365)) {
          w.usage = w.usage || {};
          w.usage.rem = (w.usage.rem || 0) + 1;
          await tx.account.update({ where: { id: acct.id }, data: { wallet: w, rev } });
          const nid = await note(ch, 'Sent', u.mobile);
          ids.push(await this.messages.enqueue(tx, { trigger: 'C10', channel: ch, to: u.mobile, text, vars: { title: d.title, date: dfmt(d.date), time: tfmt(d.time), amount: d.amount ? fmt(d.amount) : '' }, paidBy: 'customer', accountId: acct.id, notificationId: nid }));
        } else {
          await note(ch, 'Not sent · no credits', u.mobile);
        }
      }
      return { ids, rev };
    });
    this.messages.deliver(out.ids);
    if (r.accountId) this.stream.publish([r.accountId], Number(out.rev));
  }

  /** M4. Runs once per function, after it ends, if it has at least one Moi. */
  private async moiBooks() {
    const off = (await this.prisma.platformDoc.findUnique({ where: { key: 'autoBook' } }))?.data as any;
    if (off?.off) return;
    const events = await this.prisma.event.findMany({ where: { deleted: false, status: { notIn: ['void', 'draft'] }, date: { not: null } } });
    for (const ev of events) {
      const d: any = ev.data;
      if (d.bookSent || Date.now() < this.books.endAt(d)) continue;
      const any = await this.prisma.moi.findFirst({ where: { eventId: ev.id, deleted: false }, select: { id: true } });
      if (any) await this.books.send(ev);
    }
  }
}
