/* ---------- global admin pages ---------- */
function vStaff(){
  return `<div class="page-head"><div><h1>Staff &amp; Access</h1><p class="sub">Every login and the events it can open.</p></div><button class="btn btn-primary" data-act="userNewGlobal">${ic('plus')}Add user</button></div>
  ${table([{t:'Name'},{t:'Email'},{t:'Mobile'},{t:'Role'},{t:'Events'},{t:'Status'},{t:''}],staffUsers().map(u=>[`<b>${esc(u.name)}</b>`,esc(u.email||u.username),esc(u.mobile),ROLE[u.role],u.role==='admin'&&u.acc===realMe().acc?'All events':S.eventUsers.filter(a=>a.user_id===u.id&&(S.events.find(x=>x.id===a.event_id)||{}).acc===realMe().acc).map(a=>{const e=S.events.find(x=>x.id===a.event_id);return e?`${esc(e.name)} <span class="muted small">(${ROLE[a.role]} · ${esc(accessTxt(a))})</span>`:''}).join('<br>')||'<span class="muted">None</span>',u.status==='active'?pill('active',EVST):'<span class="pill bad">Disabled</span>',u.id===me.id?'':u.acc!==realMe().acc?`<div class="btn-row" style="flex-wrap:nowrap"><span class="ctx-badge">${ic('link',12)}Own login</span><button class="btn btn-ghost btn-sm" data-act="userEdit" data-id="${u.id}">${ic('edit',14)}Access</button><button class="btn btn-ghost btn-sm btn-del" data-act="userUnlink" data-id="${u.id}">${ic('x',14)}Remove</button></div>`:`<div class="btn-row" style="flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" data-act="userEdit" data-id="${u.id}">${ic('edit',14)}Edit</button><button class="btn btn-ghost btn-sm" data-act="userToggle" data-id="${u.id}">${u.status==='active'?'Disable':'Enable'}</button>${userDelOk(u)?`<button class="icon-btn icon-sm btn-del" data-act="userDel" data-id="${u.id}" aria-label="Delete ${esc(u.name)}" title="Delete user">${ic('trash',16)}</button>`:''}</div>`]))}
  <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="staffCsv">${ic('copy',16)}Copy staff list as CSV</button></div>`;
}
function vAudit(){
  const sub=me.role==='admin'?'Everything done in every event. Pick a section or a person to narrow it down.':S.eventUsers.some(a=>a.user_id===me.id&&a.role==='manager')?'Activity in the events you manage.':'Your own activity.';
  return `<div class="page-head"><div><h1>Activity Log</h1><p class="sub">${sub}</p></div></div><section class="card pad">${auditView(visibleLogs())}</section>`;
}

/* ---------- public QR payment page ---------- */
function vPublic(token){
  const tk=decodeURIComponent(String(token||'')).toUpperCase().replace(/^EV-(\d+)$/,'EV$1'),ev=S.events.find(e=>(e.no&&e.no.toUpperCase()===tk)||(e.oldNo&&e.oldNo.toUpperCase()===tk)||e.token===token);pubEv=ev||null;
  const back=me&&ev&&roleIn(ev.id)?`<div class="preview-bar"><span>Guest view preview</span><button class="btn btn-ghost btn-sm" data-go="#ev-${ev.id}-qr">${ic('back',16)}Back to event</button></div>`:'';
  if(ev&&(isExpired(accOfEv(ev))||accOfEv(ev).status==='suspended'))return `<div class="pub">${back}<div class="card pad center" style="margin-top:40px">${logo()}<h2>This event isn’t taking Moi online</h2><p class="muted">Please give your Moi at the counter.</p></div></div>`;
  if(!ev||!takesMoi(ev)){const k=ev&&ev.status,msg=k==='void'?['This event was cancelled','This event is void, so it can’t receive Moi. Please check with the family.']:k==='draft'?['This event hasn’t started taking Moi yet','The family is still setting it up. Please check with them or give your Moi at the counter.']:k==='archived'?['This event is closed','It isn’t receiving Moi any more. Please check with the family.']:['This event link isn’t active','The QR may be old. Please check with the family.'];
    return `<div class="pub">${back}<div class="card pad center" style="margin-top:40px">${logo()}<h2>${msg[0]}</h2><p class="muted">${msg[1]}</p><button class="btn btn-ghost" data-go="#home">Go to Moi Point</button></div></div>`}
  const pms=qrModes(ev);if(!pms.length)return pubNoQr(ev,back);let f=flows.public;if(!f||f.eid!==ev.id)f=flows.public={eid:ev.id,stage:'form',mode:online()&&pms.includes('online')?'online':pms[0]};if(!pms.includes(f.mode))f.mode=pms[0];
  if(f.mode==='online'&&!online()&&f.stage==='form')f.mode=pms.find(k=>k!=='online')||'online';
  let body;
  if(f.stage==='pay')body=payStep(ev,'public');
  else if(f.stage==='done')body=doneStep(ev,'public');
  else body=`<form class="card pad stack" data-form="pub" style="gap:16px" novalidate><h2>Enter your details</h2>${moiForm(ev,'p')}${amountBlock('p',f.mode,ev)}<div id="panel-p" class="stack" style="gap:12px">${modePanel(ev,f.mode,'p')}</div><button class="btn btn-primary btn-block" style="min-height:54px">Continue ${ic('arrow',18)}</button></form>`;
  return `<div class="pub">${back}
    <section class="pub-ev">${ev.logo?`<div class="pub-img ${ev.logoT?'cut':''}"><img src="${ev.logo}" alt="${esc(ev.name)}" style="aspect-ratio:${ev.logoW||1}/${ev.logoH||1}"></div>`:evLogo(ev)}<h1>${esc(ev.name)}</h1><p>${dfmt(ev.date)} · ${esc(ev.venue)}</p><blockquote>Thank you for your wishes and blessings.</blockquote></section>
    ${body}<p class="small muted" style="text-align:center">Powered by Moi Point · Your details are shared only with the event family.</p></div>`;
}

/* ---------- message credits: ₹1 per WhatsApp or SMS ---------- */
const LOWV=()=>+P().pricing.low||0,RATE=()=>+P().pricing.perMsg||0,GSTP=()=>+P().pricing.gst||0;
const PACKS=()=>P().pricing.packs.map(q=>[q,q===+P().pricing.popular?'Popular':'']);
const rateTxt=()=>`₹${RATE()} per message (incl. GST)`;
/* the message price already includes GST: the GST line only shows the part of the price that is tax */
const priceOf=(q,disc)=>{const base=q*RATE(),off=disc?Math.round(base*disc/100*100)/100:0,net=base-off,gst=Math.round((net-net/(1+GSTP()/100))*100)/100;return {base,off,net,gst,total:Math.round(net*100)/100}};
function couponCheck(code,q){const c=P().coupons.find(x=>x.code.toLowerCase()===String(code||'').trim().toLowerCase());
  if(!c)return {err:'That code doesn’t exist. Check the spelling.'};if(!c.on)return {err:'This code is switched off.'};if(c.until&&today()>c.until)return {err:'This code expired on '+dfmt(c.until)+'.'};if(c.max&&c.used>=c.max)return {err:'This code has been used the maximum number of times.'};
  return {c,bonus:c.type==='bonus'?+c.value:0,disc:c.type==='discount'?+c.value:0}}
const canBuy=()=>!!me&&(me.role==='admin'||S.eventUsers.some(a=>a.user_id===me.id&&a.role==='manager'));
const crState=()=>{const c=S.wallet.credits;return c<=0?'zero':c<LOWV()?'low':'ok'};
const cr=n=>Number(n).toLocaleString('en-IN');
function netState(){const q=S.queue.length+pendingMsgs().length;return syncing?['sync','Syncing']:!online()?['off','Offline'+(q?', '+q+' waiting':'')]:q?['warn',q+' waiting to sync']:['on','All synced']}
function creditChip(){if(!canBuy())return '';const s=crState(),ns=netState();return `<button class="credit-chip ${s}" data-go="#credits" aria-label="${S.wallet.credits} message credits · ${ns[1]}">${ic(s==='ok'?'check':'alert',16)}<b>${cr(S.wallet.credits)}</b><span>credits</span><i class="sync-dot ${ns[0]}" title="${ns[1]}"></i></button>`}
function creditBanner(){if(!canBuy()||crState()==='ok')return '';const z=crState()==='zero';
  return `<div class="note ${z?'bad':'warn'}" style="align-items:center;flex-wrap:wrap">${ic('alert',20)}<div style="flex:1;min-width:200px"><b>${z?'No message credits left':'Only '+S.wallet.credits+' message credits left'}</b><p>${z?'WhatsApp and SMS receipts are paused. Moi entries are still saved.':'WhatsApp and SMS receipts stop when credits reach 0.'}</p></div><button class="btn btn-primary btn-sm" data-act="buy">Buy credits</button></div>`}
const packsHtml=()=>`<div class="packs">${PACKS().map(([q,b])=>`<button class="pack ${b==='Popular'?'pop':''}" data-act="pack" data-q="${q}">${b?`<span class="badge">${b}</span>`:''}<b>${cr(q)}</b><span class="muted small">messages</span><span class="price">${fmt(priceOf(q).net)}</span></button>`).join('')}</div>`;
function buyModal(){openModal(`${mh('Buy message credits','1 credit = 1 WhatsApp or SMS message = '+fmt(RATE())+' incl. GST')}<div class="md-b">${packsHtml()}
  <form data-form="buyCustom" class="row-between" style="gap:10px;align-items:flex-end"><label class="field" for="bq" style="flex:1"><span>Or any number of messages (min 100)</span><input id="bq" type="number" min="100" step="1" inputmode="numeric" placeholder="e.g. 750"></label><button class="btn btn-ghost">Continue</button></form>
  <p class="small muted">Current balance: <b>${cr(S.wallet.credits)}</b> credits. Credits work across all events in this account. New credits stay valid for <b>${cr(P().pricing.validDays)} days</b>, till <b>${dfmt(crValidTill())}</b>.</p>
  <div class="note warn" style="padding:10px 12px">${ic('alert',18)}<div><b>No refunds</b><p>${NOREF}</p></div></div>
  <div class="note info" style="padding:10px 12px">${ic('wallet',18)}<div><b>${cr(P().stock)} credits available from Moi Point</b><p>Buy any amount up to this.</p></div></div></div>`)}
let buyQ=0,buyCode=null;
function buyPay(q,code){if(!(q>=100)){toast('The smallest pack is 100 messages','bad');return}buyQ=q;const cc=code?couponCheck(code,q):null;buyCode=cc&&!cc.err?cc:null;const pr=priceOf(q,buyCode&&buyCode.disc),bonus=buyCode?buyCode.bonus:0;if(q+bonus>P().stock)return stockShort(q+bonus);
  openModal(`${mh('Pay '+fmt(pr.total),cr(q)+' message credits'+(bonus?' + '+cr(bonus)+' free':''))}<div class="md-b center">
  <div class="qr-box big" data-qr="upi://pay?pa=moipoint@upi&pn=Moi%20Point&am=${pr.total}&cu=INR&tn=${encodeURIComponent(q+' message credits')}" data-size="200"></div>
  <form data-form="coupon" class="row-between" style="gap:8px;width:100%;align-items:flex-end"><label class="field" for="cp_code" style="flex:1"><span>Offer code</span><input id="cp_code" value="${esc(code||'')}" placeholder="e.g. WELCOME50" autocapitalize="characters"></label><button class="btn btn-ghost">Apply</button></form>
  ${cc&&cc.err?`<p class="small" style="color:var(--bad)">${esc(cc.err)}</p>`:buyCode?`<p class="small" style="color:var(--good)">${ic('check',14)} ${esc(buyCode.c.code)} applied · ${esc(buyCode.c.note||'')}</p>`:''}
  <dl class="kvlist" style="width:100%;text-align:left"><div><dt>Credits</dt><dd>${cr(q)}${bonus?` + <b>${cr(bonus)} free</b>`:''}</dd></div><div><dt>Rate</dt><dd>${rateTxt()}</dd></div>${pr.off?`<div><dt>Discount</dt><dd>− ${fmt(pr.off)}</dd></div>`:''}${pr.gst?`<div><dt>Includes GST ${GSTP()}%</dt><dd>${fmt(pr.gst)}</dd></div>`:''}<div><dt>Amount</dt><dd class="rc-amt">${fmt(pr.total)}</dd></div><div><dt>Balance after payment</dt><dd>${cr(S.wallet.credits+q+bonus)}</dd></div><div><dt>Valid till</dt><dd><b>${dfmt(crValidTill())}</b></dd></div></dl><label class="buy-ok" id="buyOkL"><input type="checkbox" id="buy_ok"><span>I understand: credits are not refundable. Unused or expired credits are not refunded and no money is returned.</span></label>
  <div class="waiting"><i></i>Waiting for payment</div><p class="small muted">Demo mode: tap below to simulate the payment gateway confirming it.</p></div>
  <div class="md-f"><button class="btn btn-ghost" data-act="buy">Back</button><button class="btn btn-primary" data-act="buySim">${ic('check',18)}Simulate payment success</button></div>`)}
function msgStatus(ev){const n=ev.notify||{},on=n.wa||n.sms,s=crState(),ready=on&&s!=='zero';
  return `<button class="msg-status" data-go="#ev-${ev.id}-settings"><span class="tile-ic" style="margin:0;--c:${ready?'var(--good-bg)':'var(--warn-bg)'}">${ic('msg',18)}</span><div class="rc-main"><b>Receipts: ${[n.wa?'WhatsApp':'',n.sms?'SMS':''].filter(Boolean).join(' + ')||'Off'} ${ready?`<span class="tick">${ic('check',13)}</span>`:''}</b><small>${cr(S.wallet.credits)} credits · ${rateTxt()}${on&&s==='zero'?' · paused, no credits':on&&s==='low'?' · running low':''}</small></div>${ic('arrow',18)}</button>`}
function notifCard(ev){const n=ev.notify||{},s=crState(),on=n.wa||n.sms,per=(n.wa?1:0)+(n.sms?1:0);
  return `<div class="card-h"><h3>WhatsApp &amp; SMS receipts</h3>${on?(s==='zero'?'<span class="pill bad">Paused</span>':'<span class="pill good">Active</span>'):'<span class="pill mute">Off</span>'}</div>
  <div class="credit-box ${s}"><div><span class="lbl">Message credits</span><b>${cr(S.wallet.credits)}</b><small>${ic(s==='ok'?'check':'alert',14)} ${s==='ok'?'Ready to send':s==='low'?'Running low':'No credits'} · ${rateTxt()}</small></div>${canBuy()?`<button class="btn btn-primary btn-sm" data-act="buy">Buy credits</button>`:''}</div>
  ${[['wa','WhatsApp','Receipt and thank-you to the contributor'],['sms','SMS','Short confirmation to the contributor']].map(([k,l,d])=>`<div class="toggle-r"><div><b>${l} ${n[k]&&s!=='zero'?`<span class="tick">${ic('check',13)}</span>`:''}</b><div class="small muted">${d} · ${fmt(RATE())} each</div></div><button class="switch ${n[k]?'on':''}" role="switch" aria-checked="${!!n[k]}" aria-label="${l}" data-act="ntf" data-k="${k}"></button></div>`).join('')}
  <p class="small" style="margin-top:12px">${ic('msg',14)} Receipt language: <b>${esc(LANGS.find(l=>l[0]===evLang(ev))[1])}</b> · change it in Event details</p>
  ${on?`<p class="small" style="margin-top:12px">Each Moi with a mobile number uses <b>${per} credit${per>1?'s':''} (${fmt2(per*RATE())})</b>. Your balance covers about <b>${cr(Math.floor(S.wallet.credits/per))}</b> more Moi entries.</p>`:'<p class="small muted" style="margin-top:12px">Turn on a channel to send receipts automatically. Using Moi Point itself stays free.</p>'}
  ${on&&s!=='ok'?`<div class="note ${s==='zero'?'bad':'warn'}" style="margin-top:12px">${ic('alert',20)}<div><b>${s==='zero'?'Messages are paused':'Low balance'}</b><p>${s==='zero'?'Moi is still recorded, but no receipts go out until you add credits.':'Receipts stop when credits reach 0.'}</p></div></div>`:''}`}
function msgLines(ev,m,ctx){const n=ev.notify||{},on=n.wa||n.sms,res=m.notified||[];
  if(ctx==='public')return res.filter(x=>x.status==='Sent').map(x=>`<p class="msg-line good">${ic('check',16)}${OK(m)?'Receipt':'Details'} sent to your ${x.channel}</p>`).join('');
  if(!on)return manages(ev.id)?`<p class="small muted">Receipt messages are off for this event. Turn on WhatsApp or SMS in Settings (${rateTxt()}).</p>`:'';
  if(!m.c.mobile)return `<p class="small muted">No mobile number, so no receipt message was sent.</p>`;
  return `<div class="stack" style="gap:4px;align-items:center">${res.map(x=>x.status==='Queued'?`<p class="msg-line warn">${ic('cloudoff',16)}${x.channel} receipt will be sent when internet is back</p>`:`<p class="msg-line ${x.status==='Sent'?'good':'bad'}">${ic(x.status==='Sent'?'check':'alert',16)}${x.channel} receipt ${x.status==='Sent'?'sent · 1 credit used':'not sent · no credits left'}</p>`).join('')}${m.pending?`<p class="msg-line warn">${ic('cloudoff',16)}Saved on this phone · syncs when online</p>`:''}${crState()!=='ok'&&canBuy()?`<button class="link" data-act="buy">${S.wallet.credits} credits left · Buy more</button>`:''}</div>`}
/* ---------- V41: credit alerts, free credits per event, validity from last purchase, price-change conversion ---------- */
const ALERTAT=()=>{const v=P().pricing.alertAt;return v===undefined||v===''?10:+v};
const EVFREE=()=>{const v=P().pricing.evFree;return v===undefined||v===''?20:+v};
/* every paid purchase keeps the whole balance alive for another validity period */
function walletRenew(w){if(!w||!w.batches)return;const paid=(w.purchases||[]).filter(p=>p.amount>0&&p.qty>0).map(p=>p.at).sort();const last=[paid[paid.length-1]||'',w.lastUse||''].sort().pop();if(!last)return;
  const exp=addDays(last,+P().pricing.validDays||365);w.batches.forEach(b=>{if(b.left>0&&b.exp>=last&&b.exp<exp)b.exp=exp});w.renewTill=exp}
function grantEventCredits(e){const n=EVFREE(),A=accOfEv(e)||myAcc();if(!(n>0)||!A||e.freeCr)return 0;e.freeCr=n;addCredits(A,n,0,`Free credits · ${e.name}`,'EVFREE-'+e.no);
  S.notifications.push({id:uid('n'),owner:A.owner,channel:'In app',to:'You',text:`${n} free message credits added for ${e.name}. Use them for receipts and invitations.`,status:'Sent',at:Date.now()});return n}
/* one-time notes to the owner when credits run low or run out */
function credNote(eid,owner){const e=eid&&S.events.find(x=>x.id===eid),A=e?accOfEv(e):(S.users.find(u=>u.id===owner)?accById(S.users.find(u=>u.id===owner).acc):null);if(!A)return;const n=walletSync(A.wallet).credits,k=n<=0?'out':n<=ALERTAT()?'low':'';
  if(!k){A.credFlag='';return}if(A.credFlag===k)return;A.credFlag=k;
  S.notifications.push({id:uid('n'),owner:A.owner,channel:'In app',to:'You',text:k==='out'?'Message credits are over. Receipts are not going to guests. Buy credits to send them again.':`Only ${n} message credits left. Buy credits so every guest keeps getting a receipt.`,status:'Sent',at:Date.now()})}
/* red / amber signal on Receive Moi: shows on every visit and after every entry */
function credPop(ev){const A=accOfEv(ev);if(!A||!me)return '';const n=walletSync(A.wallet).credits;if(n>ALERTAT())return '';
  const own=me.role==='admin'&&me.acc===A.id,ow=S.users.find(u=>u.id===A.owner)||{},out=n<=0;
  const t=out?'Message credits are over':n===1?'Only 1 message credit left':`Only ${n} message credits left`;
  const p=out?(own?'Receipts are not going to guests on WhatsApp or SMS. Buy credits to send them again.':'Receipts are not going to guests on WhatsApp or SMS. Please tell the event organiser to add credits.'):(own?'Buy credits now so every guest keeps getting a receipt.':'Please tell the event organiser to add credits soon.');
  return `<div class="cred-pop ${out?'out':'low'}" role="alertdialog" aria-labelledby="cpT" id="credPop"><span class="cp-sig" aria-hidden="true"><i></i>${ic(out?'alert':'wallet',22)}</span><div class="cp-t"><b id="cpT">${t}</b><p>${p}</p></div>
    <div class="cp-b">${own?`<button type="button" class="btn btn-sm cp-buy" data-go="#credits">${ic('wallet',16)}Buy credits</button>`:ow.mobile?`<a class="btn btn-sm cp-buy" href="tel:+91${ow.mobile}">${ic('phone',16)}Call organiser</a>`:''}<button type="button" class="btn btn-ghost btn-sm" data-act="credX">Later</button></div></div>`}
/* when the price per message changes, unused credits keep their rupee value */
function convertBalances(old,nw){if(!(old>0)||!(nw>0)||old===nw)return 0;let n=0;
  S.accounts.forEach(A=>{const w=walletSync(A.wallet);if(!w||!w.credits)return;const before=w.credits;
    w.batches.forEach(b=>{if(b.left>0)b.left=Math.floor(b.left*old/nw)});w.credits=w.batches.reduce((s,b)=>s+b.left,0);const d=w.credits-before;if(!d)return;n++;
    w.purchases.push({at:today(),qty:d,amount:0,ref:'PRICE-'+Date.now().toString().slice(-6),kind:`Price change ₹${old} → ₹${nw}: ${before} → ${w.credits} credits`,code:null,exp:null});
    S.notifications.push({id:uid('n'),owner:A.owner,channel:'In app',to:'You',text:`Message price changed from ₹${old} to ₹${nw}. Your unused credits keep the same value: ${before} → ${w.credits} credits.`,status:'Sent',at:Date.now()})});
  const L=P().priceLog||[];if(L.length)L[L.length-1].converted=n;return n}

function vCredits(){const w=S.wallet,s=crState(),u=w.usage||{},mx=Math.max(1,...Object.values(u));
  return `<div class="page-head"><div><h1>Message Credits</h1><p class="sub">Moi Point is free to use. You pay only for WhatsApp and SMS messages: ${rateTxt()}.</p></div><button class="btn btn-primary" data-act="buy">${ic('plus')}Buy credits</button></div>
  <section class="balance ${s}"><div><span class="lbl">Available credits</span><strong>${cr(w.credits)}</strong><p>${ic(s==='ok'?'check':'alert',16)} ${s==='ok'?'WhatsApp and SMS receipts are ready to send':s==='low'?'Running low. Messages stop at 0.':'Messages are paused. Buy credits to resume.'}</p></div><div class="bal-side">${(()=>{const nx=nextExpiry(w);return nx?`<span><b>${cr(nx.n)}</b> expire ${dfmt(nx.date)}</span>`:''})()}<span><b>${cr(w.used||0)}</b> used</span>${w.expired?`<span><b>${cr(w.expired)}</b> expired</span>`:''}<span><b>${cr(w.purchases.reduce((a,p)=>a+p.qty,0))}</b> bought</span></div></section>
  ${creditTerms()}
  <section class="card pad"><div class="card-h"><h3>Choose a pack</h3><span class="tag">${rateTxt()}</span></div>${packsHtml()}<p class="small muted" style="margin-top:10px">Every purchase keeps all your credits valid for ${cr(P().pricing.validDays)} days from that purchase. Each new event gets ${cr(EVFREE())} free credits. ${cr(P().stock)} credits available from Moi Point right now.</p></section>
  <div class="split"><section class="card pad"><div class="card-h"><h3>What uses a credit</h3></div><dl class="kvlist">
    <div><dt>Moi receipt on WhatsApp</dt><dd>1 credit</dd></div><div><dt>Moi receipt on SMS</dt><dd>1 credit</dd></div><div><dt>WhatsApp + SMS for one Moi</dt><dd>2 credits</dd></div><div><dt>“Payment verified” message</dt><dd>1 per channel</dd></div><div><dt>Reminder to you on WhatsApp or SMS</dt><dd>1 per channel</dd></div><div><dt>Events, Moi records, reports, in-app reminders</dt><dd class="yes">Free</dd></div></dl></section>
  <section class="card pad"><div class="card-h"><h3>Credits used by event</h3></div>${Object.keys(u).length?`<div class="bars">${Object.entries(u).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar-r"><span>${k==='rem'?'Reminders':esc((S.events.find(e=>e.id===k)||{name:'Deleted event'}).name)}</span><div class="t"><span style="width:${v/mx*100}%"></span></div><b>${cr(v)}</b></div>`).join('')}</div>`:'<p class="muted small">No messages sent yet.</p>'}
    <h3 style="margin:22px 0 10px">Purchases</h3>${w.purchases.length?`<div class="rows">${[...w.purchases].reverse().map(p=>`<div class="row-card" style="cursor:default"><span class="tile-ic" style="margin:0;--c:var(--good-bg)">${ic('check',18)}</span><div class="rc-main"><b>${cr(p.qty)} credits</b><small>${dfmt(p.at)} · ${esc(p.kind||p.ref)}${p.exp?' · valid till '+dfmt(p.exp):''}</small></div><span class="rc-amt">${p.amount?fmt(p.amount):'Free'}</span></div>`).join('')}</div>`:'<p class="muted small">No purchases yet.</p>'}</section></div>`}
