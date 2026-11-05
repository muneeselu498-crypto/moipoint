import { Injectable, Logger } from '@nestjs/common';
import { cfg } from './config';
import { PrismaService, Tx } from './prisma.service';
import { StreamService } from './stream.service';

export interface OutMessage {
  id: string;
  trigger: string;
  channel: string;
  to: string;
  text: string;
  vars?: any;
  media?: any;
}

/**
 * Every message goes through one of these, so the client's WhatsApp, SMS and email
 * accounts plug in here without any change to the rest of the app.
 */
export interface MessageProvider {
  name: string;
  send(m: OutMessage): Promise<{ ref?: string }>;
}

/** Nothing leaves this computer. Messages wait in the Dev Outbox for you to read. */
class DevProvider implements MessageProvider {
  name = 'dev';
  async send(m: OutMessage) {
    return { ref: `dev-${m.id}` };
  }
}

/** Hands each message to the automation team's system as signed JSON. */
class WebhookProvider implements MessageProvider {
  name = 'webhook';
  async send(m: OutMessage) {
    const res = await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-moipoint-secret': cfg.webhookSecret },
      body: JSON.stringify(m),
    });
    if (!res.ok) throw new Error(`Webhook answered ${res.status}`);
    const body: any = await res.json().catch(() => ({}));
    return { ref: body.ref || body.id || m.id };
  }
}

/** Master Admin's cost pages read this log. */
const PLAT_KIND: Record<string, string> = { M1: 'signup-otp', M2: 'reset-otp', M3: 'lead-otp', M4: 'moibook', M6: 'campaign' };

@Injectable()
export class MessagesService {
  private log = new Logger('Messages');
  private provider: MessageProvider = cfg.messageProvider === 'webhook' ? new WebhookProvider() : new DevProvider();

  constructor(private prisma: PrismaService, private stream: StreamService) {}

  /** Records a message inside the caller's transaction. Call deliver() after it commits. */
  async enqueue(tx: Tx, m: { trigger: string; channel: string; to: string; text: string; vars?: any; media?: any; paidBy: 'customer' | 'platform'; accountId?: string | null; eventId?: string | null; notificationId?: string; logId?: string | null }) {
    const row = await tx.message.create({ data: { ...m, accountId: m.accountId ?? null, eventId: m.eventId ?? null, logId: m.logId ?? null } });
    return row.id;
  }

  /** A message Moi Point pays for, such as a sign-up code. */
  async sendPlatform(m: { trigger: string; channel: string; to: string; text: string; vars?: any; media?: any; accountId?: string | null; eventId?: string | null }) {
    const id = await this.prisma.$transaction(async (tx) => {
      const mid = await this.enqueue(tx, { ...m, paidBy: 'platform' });
      await this.logPlatformCost(tx, m.trigger, 1, m.to);
      return mid;
    });
    this.deliver([id]);
    return id;
  }

  async logPlatformCost(tx: Tx, trigger: string, n: number, ref: string) {
    const kind = PLAT_KIND[trigger];
    if (!kind) return;
    const doc = await tx.platformDoc.findUnique({ where: { key: 'platLog' } });
    const list: any[] = Array.isArray(doc?.data) ? (doc!.data as any[]) : [];
    list.push({ at: Date.now(), kind, n, ref });
    if (list.length > 3000) list.splice(0, list.length - 3000);
    await tx.platformDoc.upsert({ where: { key: 'platLog' }, create: { key: 'platLog', data: list }, update: { data: list } });
  }

  /** Runs outside any transaction, so a slow provider never holds up the counter. */
  deliver(ids: string[]) {
    for (const id of ids) {
      this.deliverOne(id).catch((e) => this.log.error(`Delivery failed for ${id}: ${e.message}`));
    }
  }

  private async deliverOne(id: string) {
    const m = await this.prisma.message.findUnique({ where: { id } });
    if (!m || m.status !== 'queued') return;
    try {
      const { ref } = await this.provider.send({ id: m.id, trigger: m.trigger, channel: m.channel, to: m.to, text: m.text, vars: m.vars, media: m.media });
      await this.prisma.message.update({ where: { id }, data: { status: 'sent', sentAt: new Date(), provider: this.provider.name, providerRef: ref || null } });
    } catch (e: any) {
      await this.setStatus(id, 'failed', e.message);
      return;
    }
    if (this.provider.name === 'dev') this.simulateDelivery(id, m.channel);
  }

  /** In testing, moves messages along as a real provider would, so the Messages sent screen fills in. */
  private simulateDelivery(id: string, channel: string) {
    setTimeout(() => this.setStatus(id, 'delivered').catch(() => {}), 2500).unref();
    if (channel === 'WhatsApp') setTimeout(() => this.setStatus(id, 'read').catch(() => {}), 8000).unref();
  }

  /** Called by the simulator, the Dev Outbox, or a provider's delivery report. */
  async setStatus(id: string, status: 'sent' | 'delivered' | 'read' | 'failed', error?: string) {
    const m = await this.prisma.message.findUnique({ where: { id } });
    if (!m) return;
    const rank: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
    if (status !== 'failed' && (m.status === 'failed' || rank[m.status] >= rank[status])) return;
    const now = new Date();
    await this.prisma.message.update({
      where: { id },
      data: { status, error: error ?? m.error, ...(status === 'delivered' ? { deliveredAt: now } : {}), ...(status === 'read' ? { readAt: now, deliveredAt: m.deliveredAt ?? now } : {}) },
    });
    if (m.logId) await this.updateLog(m.logId, m.to, m.channel, status, now.getTime());
  }

  /** Writes the delivery result onto the row the Messages sent screen reads. */
  private async updateLog(logId: string, to: string, channel: string, status: string, at: number) {
    const code: Record<string, string> = { delivered: 'dlv', read: 'read', failed: 'fail', sent: 'sent' };
    const ch = channel === 'WhatsApp' ? 'wa' : 'sms';
    const out = await this.prisma.$transaction(async (tx) => {
      const rev = await this.bump(tx);
      const row = await tx.msgLog.findUnique({ where: { id: logId } });
      if (!row) return null;
      const d: any = row.data;
      const r = (d.recips || []).find((x: any) => x.mob === to && x.ch === ch);
      if (!r) return null;
      r.ds = { s: code[status], t: at };
      await tx.msgLog.update({ where: { id: logId }, data: { data: d, rev } });
      return { rev, acc: row.accountId };
    });
    if (out) this.stream.publish([out.acc], Number(out.rev));
  }

  async bump(tx: Tx): Promise<bigint> {
    const rows = await tx.$queryRaw<{ rev: bigint }[]>`UPDATE "SyncCounter" SET rev = rev + 1 WHERE id = 1 RETURNING rev`;
    return rows[0].rev;
  }
}
