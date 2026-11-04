import { Injectable, Logger } from '@nestjs/common';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { cfg } from './config';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { StreamService } from './stream.service';
import { fmt, randomToken, uid } from './util';

const OK_STATUS = ['received', 'verified'];
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/** M4: the Moi Book goes to the organiser when the function ends. */
@Injectable()
export class BookService {
  private log = new Logger('MoiBook');
  /** One-time passes that let the PDF browser read a single event for a minute. */
  private passes = new Map<string, { eventId: string; exp: number }>();

  constructor(private prisma: PrismaService, private messages: MessagesService, private stream: StreamService, private storage: StorageService) {}

  takePass(token: string) {
    const p = this.passes.get(token);
    this.passes.delete(token);
    return p && p.exp > Date.now() ? p.eventId : null;
  }

  /**
   * Prints the app's own Moi Book page, so the PDF matches the screen exactly, Tamil included.
   * If no browser is available the message still goes out, without the attachment.
   */
  async pdf(ev: any): Promise<{ name: string; url: string } | null> {
    const executablePath = cfg.chromePath || CHROME_PATHS.find((p) => fs.existsSync(p));
    if (!executablePath) {
      this.log.warn('No Chrome or Edge found, so the Moi Book PDF was skipped. Set CHROME_PATH.');
      return null;
    }
    const token = randomToken();
    this.passes.set(token, { eventId: ev.id, exp: Date.now() + 60000 });
    const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${cfg.port}/?render=${encodeURIComponent(token)}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => (globalThis as any).__bookReady === true, null, { timeout: 30000 });
      const orientation = await page.evaluate(() => (globalThis as any).__bookOrient);
      const buf = await page.pdf({ format: 'A4', landscape: orientation === 'landscape', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
      const name = `MoiBook-${String(ev.no).replace(/\W/g, '')}.pdf`;
      return { name, url: this.storage.save(Buffer.from(buf), 'pdf') };
    } catch (e: any) {
      this.log.error(`Moi Book PDF failed for ${ev.no}: ${e.message}`);
      return null;
    } finally {
      await browser.close().catch(() => {});
    }
  }

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
    const document = (await this.pdf(ev)) ?? { name: file, url: null };
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
        ids.push(await this.messages.enqueue(tx, { trigger: 'M4', channel: 'WhatsApp', to, text, vars: { event: d.name, entries: n, total: fmt(total) }, media: { document }, paidBy: 'platform', accountId: ev.accountId, eventId: ev.id, notificationId: nid }));
      }
      await note('In app', 'You', `Moi Book PDF for ${d.name} sent to WhatsApp +91 ${to.slice(0, 5)} ${to.slice(5)}.`, account?.ownerId ?? null);
      if (email) {
        const nid = await note('Email', email, `Your Moi Book for ${d.name}: ${n} entries, total ${fmt(total)}. PDF attached.`, null);
        ids.push(await this.messages.enqueue(tx, { trigger: 'M4', channel: 'Email', to: email, text: `Subject: Your Moi Book · ${d.name} · ${n} entries · ${fmt(total)}\n\n${text}`, media: { document }, paidBy: 'platform', accountId: ev.accountId, eventId: ev.id, notificationId: nid }));
      }
      await this.messages.logPlatformCost(tx, 'M4', 1, ev.no);
      const fresh = await tx.event.findUnique({ where: { id: ev.id } });
      const data = { ...(fresh!.data as object), bookSent: { at: now, to, file, url: document.url, n, again, email } };
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
