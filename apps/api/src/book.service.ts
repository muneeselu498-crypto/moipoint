import { Injectable } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';
import { StreamService } from './stream.service';
import { fmt, uid } from './util';

const OK_STATUS = ['received', 'verified'];

/** M4: the Moi Book goes to the organiser when the function ends. */
@Injectable()
export class BookService {
  constructor(private prisma: PrismaService, private messages: MessagesService, private stream: StreamService) {}

  /** Same rule as the app: the end time, else the start time, else 23:59. An end before the start means the next day. */
  endAt(d: any): number {
    const t = d.end || d.start || '23:59';
    const at = new Date(`${d.date}T${t.length === 5 ? t : '23:59'}:00`);
    if (d.start && d.end && d.end < d.start) at.setDate(at.getDate() + 1);
    return at.getTime();
  }

  async send(ev: any, again = false): Promise<boolean> {
    const d: any = ev.data;
    const account = await this.prisma.account.findUnique({ where: { id: ev.accountId } });
    const owner = account?.ownerId ? await this.prisma.user.findUnique({ where: { id: account.ownerId } }) : null;
    const to: string = d.orgMobile || owner?.mobile || '';
    const email: string = d.orgEmail || owner?.email || '';
    if (!to && !email) return false;

    const entries = await this.prisma.moi.findMany({ where: { eventId: ev.id, deleted: false } });
    const n = entries.filter((m) => m.status !== 'void').length;
    const total = entries.filter((m) => OK_STATUS.includes(m.status)).reduce((s, m) => s + m.amount, 0);
    const file = `MoiBook-${String(ev.no).replace(/\W/g, '')}.pdf`;
    const text = `Your Moi Book for ${d.name} is ready: ${n} entries, total ${fmt(total)}. PDF attached.`;
    const now = Date.now();

    const out = await this.prisma.$transaction(async (tx) => {
      const rev = await this.messages.bump(tx);
      const ids: string[] = [];
      const note = async (channel: string, target: string, body: string, ownerId: string | null, status = 'Sent') => {
        const id = uid('n');
        await tx.notification.create({
          data: { id, accountId: ev.accountId, eventId: channel === 'In app' ? null : ev.id, ownerId, channel, status, dispatchedAt: new Date(), rev, data: { id, eid: channel === 'In app' ? null : ev.id, owner: ownerId, channel, to: target, text: body, status, at: now, attach: channel === 'In app' ? undefined : file } },
        });
        return id;
      };
      if (to) {
        const nid = await note('WhatsApp', to, text, null);
        ids.push(await this.messages.enqueue(tx, { trigger: 'M4', channel: 'WhatsApp', to, text, vars: { event: d.name, entries: n, total: fmt(total) }, media: { document: file }, paidBy: 'platform', accountId: ev.accountId, eventId: ev.id, notificationId: nid }));
      }
      await note('In app', 'You', `Moi Book PDF for ${d.name} sent to WhatsApp +91 ${to.slice(0, 5)} ${to.slice(5)}.`, account?.ownerId ?? null);
      if (email) {
        const nid = await note('Email', email, `Your Moi Book for ${d.name}: ${n} entries, total ${fmt(total)}. PDF attached.`, null);
        ids.push(await this.messages.enqueue(tx, { trigger: 'M4', channel: 'Email', to: email, text: `Subject: Your Moi Book · ${d.name} · ${n} entries · ${fmt(total)}\n\n${text}`, media: { document: file }, paidBy: 'platform', accountId: ev.accountId, eventId: ev.id, notificationId: nid }));
      }
      await this.messages.logPlatformCost(tx, 'M4', 1, ev.no);
      const fresh = await tx.event.findUnique({ where: { id: ev.id } });
      const data = { ...(fresh!.data as object), bookSent: { at: now, to, file, n, again, email } };
      await tx.event.update({ where: { id: ev.id }, data: { data, rev } });
      const aid = uid('l');
      await tx.audit.create({ data: { id: aid, accountId: ev.accountId, eventId: ev.id, rev, data: { id: aid, acc: ev.accountId, uid: null, at: new Date().toISOString(), user: 'Moi Point', role: '', eid: ev.id, action: again ? 'Moi Book sent again' : 'Moi Book sent on WhatsApp', detail: file } } });
      return { ids, rev };
    });
    this.messages.deliver(out.ids);
    this.stream.publish([ev.accountId], Number(out.rev));
    return true;
  }
}
