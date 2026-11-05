import { Body, Controller, Get, Header, HttpCode, NotFoundException, Param, Post, Headers } from '@nestjs/common';
import { z } from 'zod';
import { cfg } from './config';
import { JobsService } from './jobs.service';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';
import { fail, normMob } from './util';

const only = () => {
  if (!cfg.devTools) throw new NotFoundException();
};

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Moi Point Dev Outbox</title>
<style>
:root{color-scheme:light dark;--bg:#f4f4fb;--card:#fff;--ink:#1c1b3a;--mute:#66658a;--line:#e2e1f2;--good:#11784a;--bad:#b0263a;--acc:#211d6b}
@media(prefers-color-scheme:dark){:root{--bg:#121126;--card:#1b1a35;--ink:#ececff;--mute:#a3a1c9;--line:#2e2c55;--good:#5bd99a;--bad:#ff8494;--acc:#8d86f5}}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--ink)}
header{position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--line);padding:14px 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
h1{font-size:18px;margin:0}header p{margin:0;color:var(--mute);font-size:13px}main{padding:16px 20px;display:grid;gap:10px;max-width:980px;margin:auto}
.m{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;gap:6px}
.t{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--mute)}.id{font-weight:700;color:var(--acc)}.ch{font-weight:600;color:var(--ink)}
.s{margin-left:auto;font-weight:600}.s.failed{color:var(--bad)}.s.read,.s.delivered{color:var(--good)}
.b{white-space:pre-wrap;word-break:break-word}.otp{font:700 22px ui-monospace,monospace;letter-spacing:.14em;color:var(--good)}
button{font:inherit;font-size:12px;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:8px;padding:3px 9px;cursor:pointer}
.empty{color:var(--mute);text-align:center;padding:40px}select{font:inherit;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
</style></head><body><header><h1>Dev Outbox</h1><p>Every message the app would send. Nothing leaves this computer while MESSAGE_PROVIDER=dev.</p>
<select id="f" aria-label="Filter"><option value="">All messages</option><option value="otp">Codes only</option><option value="WhatsApp">WhatsApp</option><option value="SMS">SMS</option><option value="Email">Email</option></select></header><main id="l"></main>
<script>
const l=document.getElementById('l'),f=document.getElementById('f');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function load(){const r=await fetch('/api/dev/messages');const {messages}=await r.json();const v=f.value;
 const L=messages.filter(m=>!v||(v==='otp'?m.vars&&m.vars.otp:m.channel===v));
 l.innerHTML=L.length?L.map(m=>'<article class="m"><div class="t"><span class="id">'+esc(m.trigger)+'</span><span class="ch">'+esc(m.channel)+'</span><span>to '+esc(m.to)+'</span><span>'+new Date(m.createdAt).toLocaleTimeString()+'</span><span>'+(m.paidBy==='customer'?'1 credit':'Moi Point pays')+'</span><span class="s '+esc(m.status)+'">'+esc(m.status)+'</span></div>'+(m.vars&&m.vars.otp?'<div class="otp">'+esc(m.vars.otp)+'</div>':'')+'<div class="b">'+esc(m.text)+'</div>'+(m.media?'<div class="t">'+esc(JSON.stringify(m.media))+'</div>':'')+(m.error?'<div class="t">'+esc(m.error)+'</div>':'')+'<div class="t"><button data-id="'+m.id+'" data-s="failed">Mark failed</button></div></article>').join(''):'<p class="empty">No messages yet. Use the app and they will appear here.</p>'}
l.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;await fetch('/api/dev/messages/'+b.dataset.id+'/status',{method:'POST',headers:{'content-type':'application/json','x-moipoint':'1'},body:JSON.stringify({status:b.dataset.s})});load()});
f.addEventListener('change',load);load();setInterval(load,2000);
</script></body></html>`;

@Controller()
export class DevController {
  constructor(private prisma: PrismaService, private messages: MessagesService, private jobs: JobsService) {}

  @Get('dev/outbox')
  @Header('content-type', 'text/html; charset=utf-8')
  page() {
    only();
    return PAGE;
  }

  @Get('api/dev/messages')
  async list() {
    only();
    return { messages: await this.prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }) };
  }

  @Post('api/dev/messages/:id/status')
  @HttpCode(200)
  async status(@Param('id') id: string, @Body() body: unknown) {
    only();
    const b = z.object({ status: z.enum(['delivered', 'read', 'failed']) }).parse(body);
    await this.messages.setStatus(id, b.status, b.status === 'failed' ? 'Marked failed in the Dev Outbox' : undefined);
    return { ok: true };
  }

  /** Runs the timed jobs now, so a test doesn't have to wait. */
  @Post('api/dev/run-jobs')
  @HttpCode(200)
  async runJobs() {
    only();
    await this.jobs.tick();
    return { ok: true };
  }

  /**
   * Delivery reports and replies from the provider or the automation team's system.
   * { "messageId" or "ref", "status": "delivered" | "read" | "failed" } or { "from": "98...", "text": "STOP" }
   */
  @Post('api/webhooks/messages')
  @HttpCode(200)
  async webhook(@Headers('x-moipoint-secret') secret: string, @Body() body: any) {
    if (!cfg.webhookSecret || secret !== cfg.webhookSecret) fail('Not allowed', 401);
    if (body?.from && /^\s*stop\s*$/i.test(String(body.text || ''))) {
      const mobile = normMob(body.from);
      const p = await this.prisma.person.findUnique({ where: { mobile } });
      await this.prisma.$transaction(async (tx) => {
        const rev = await this.messages.bump(tx);
        const data = { ...((p?.data as object) ?? { mobile }), optOut: true, consent: false };
        await tx.person.upsert({ where: { mobile }, create: { mobile, accounts: [], data, rev }, update: { data, rev } });
      });
      return { ok: true };
    }
    const m = await this.prisma.message.findFirst({ where: { OR: [{ id: String(body?.messageId ?? '') }, { providerRef: String(body?.ref ?? '__none') }] } });
    if (!m) return fail('Unknown message', 404);
    if (['delivered', 'read', 'failed'].includes(body?.status)) await this.messages.setStatus(m.id, body.status, body.error);
    return { ok: true };
  }
}
