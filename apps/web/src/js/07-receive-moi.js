/* ---------- event: receive moi ---------- */
function upiStr(ev,amt,tr,acc){const a=acc||{id:ev.upi,name:ev.payee};return `upi://pay?pa=${encodeURIComponent(a.id||ev.upi||'moipoint@upi')}&pn=${encodeURIComponent(a.name||ev.payee||ev.organizer||ev.name)}&cu=INR${amt?'&am='+amt:''}${tr?'&tr='+tr:''}&tn=${encodeURIComponent('Moi - '+ev.name)}`}
function modePanel(ev,mode,px){
  if(mode==='cash')return `<div class="note good">${ic('check',20)}<div><b>${px==='p'?'Pay at the Moi counter':'Cash in hand'}</b><p>${px==='p'?'Your entry is saved now. Hand the cash to the Moi collector at the venue and they will confirm it.':'Saved straight away as Cash Received.'}</p></div></div>`;
  if(mode==='upi'){const accs=upiAccs(ev),fl=flows[px==='m'?'staff':'public']||{};
    if(fl.upiAcc==null||!accs[fl.upiAcc]){fl.upiAcc=0;const t0=accs.length>1?upiToday(ev,0):0;if(t0>=UPI_DAY*.9)fl.upiAcc=1}
    const ai=fl.upiAcc,a=accs[ai];
    const tabs=accs.length>1?`<div class="seg upi-tabs" role="tablist">${accs.map((x,i)=>`<button type="button" role="tab" aria-selected="${i===ai}" class="${i===ai?'on':''}" data-act="upiAcc" data-px="${px}" data-i="${i}">QR ${i+1}${x.name?' · '+esc(x.name):''}</button>`).join('')}</div>`:'';
    const used=a&&px==='m'?upiToday(ev,ai):0,near=used>=UPI_DAY*.9;
    return `${tabs}<div class="upi-box">${a&&a.qr?`<div class="upi-qr-img"><img src="${a.qr}" alt="UPI QR ${ai+1}"></div>`:`<div class="qr-box" data-qr="${esc(upiStr(ev,0,'',a))}" data-size="150"></div>`}<div class="upi-meta"><span class="lbl">${accs.length>1?'UPI '+(ai+1):'Event UPI'}${a&&a.name?' · '+esc(a.name):''}</span><b>${a&&a.id?esc(a.id):a?'Scan the QR':'Not set yet'}</b><p class="muted">${a?'Pay with any UPI app, then attach the success screenshot.':'Add the UPI ID under Payment Collection.'}</p>
      ${a&&px==='m'?`<div class="upi-day ${near?'warn':''}"><div class="bar"><i style="width:${Math.min(100,used/UPI_DAY*100)}%"></i></div><small>Today on this UPI: <b>${fmt(used)}</b> of about ${fmt(UPI_DAY)}${near&&accs.length>1?' · switch to the other QR':near?' · close to the daily limit':''}</small></div>`:''}</div></div>
    <label class="upload" for="${px}_shot">${ic('upload',22)}<span>${imgBuf[px+'shot']?'Change screenshot':'Upload payment screenshot'}</span><small>Take a photo or pick the screenshot from gallery</small><input type="file" id="${px}_shot" accept="image/*" capture="environment" data-img="${px}shot" hidden></label>
    <div class="shot-prev" id="prev-${px}shot">${imgBuf[px+'shot']?`<img src="${imgBuf[px+'shot']}" alt="Payment screenshot preview">`:''}</div>
    ${fld('UTR / Transaction ID (optional)',px+'_utr','text',false,'','inputmode="numeric" placeholder="12-digit UPI reference"')}
    <p class="small muted">Saved as Pending Verification until an admin or event manager checks it.</p>`}
  if(mode==='online'){const g=gwCalc(ev,0);return `<div class="note info">${ic('zap',20)}<div><b>Dynamic payment QR</b><p>After you continue, a QR for the exact amount appears. ${ev.gateway&&ev.gateway!=='none'?GATEWAYS[ev.gateway]+' is configured for this event.':'No payment gateway is connected yet, so the confirmation is simulated in this prototype.'}</p>${g.pct?`<p class="small"><b>Gateway fee ${g.pct}% + GST</b> · ${g.guest?'added on top for the guest':'paid by the family'}</p>`:''}</div></div>`}
  return '';
}
const AMTS=[101,501,1001,2001,5001,10001];
/* which ways this event takes Moi; old events take all three */
const QRML={cash:'Cash at the counter',upi:'Offline UPI (you verify)',online:'Online payment'};
const qrModes=ev=>{const all=evModes(ev),q=ev&&ev.qrModes;if(!q)return all;if(!q.cash&&!q.upi&&!q.online)return [];const r=['cash','upi','online'].filter(k=>q[k]&&(k!=='online'||feat('online',ev)));return r.length?r:all};
const evModes=ev=>{const m=(ev&&ev.modes)||{cash:1,upi:1,online:1},r=['cash','upi','online'].filter(k=>m[k]&&(k!=='online'||feat('online',ev)));return r.length?r:['cash']};
/* up to two UPI accounts: main + backup (banks usually cap UPI at about ₹1 lakh a day per account) */
const UPI_DAY=100000;
const upiAccs=ev=>(ev&&ev.upis&&ev.upis.length?ev.upis:(ev&&ev.upi?[{id:ev.upi,name:ev.payee||'',qr:null}]:[])).filter(a=>a&&(a.id||a.qr)&&a.on!==false);
const upiToday=(ev,i)=>S.moi.filter(m=>m.event_id===ev.id&&m.mode==='upi'&&m.date===today()&&m.status!=='rejected'&&(+m.upiAcc||0)===i).reduce((a,m)=>a+(+m.amount||0),0);
/* payment gateway charges (typical standard plans; the family sets the exact rate) */
const GWRATE={none:0,razorpay:2,cashfree:1.95,phonepe:2,other:2};
const gwPct=ev=>+((S.platform&&S.platform.gwFee)!=null?S.platform.gwFee:2);
function gwCalc(ev,amt){const p=gwPct(ev),fee=Math.round(amt*p/100*(1+(+P().gwGst||18)/100)*100)/100,guest=(ev&&ev.gwWho)==='guest';
  return {pct:p,fee,guest,pays:guest?Math.round((amt+fee)*100)/100:amt,gets:guest?amt:Math.round((amt-fee)*100)/100}}
const fmt2=n=>'₹'+Number(n).toLocaleString('en-IN',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});
function feeExample(ev){const g=gwCalc(ev,1001);
  return `<div class="fee-eg"><span class="lbl">Example · ₹1,001 Moi</span><dl class="kvlist"><div><dt>Gateway fee (${g.pct}% + 18% GST)</dt><dd>${fmt2(g.fee)}</dd></div><div><dt>Guest pays</dt><dd>${fmt2(g.pays)}</dd></div><div><dt>Family receives</dt><dd><b>${fmt2(g.gets)}</b></dd></div></dl></div>`}
function paymentFields(e,px){e=e||{};const m=e.modes||{cash:1,upi:1,online:0},accs=e.upis&&e.upis.length?e.upis:(e.upi?[{id:e.upi,name:e.payee||''}]:[]);
  const acc=i=>{const a=accs[i]||{},k='upiqr'+i;return `<div class="upi-acc"><span class="lbl">${i?'UPI 2 · backup (optional)':'UPI 1 · main'}</span><div class="fields">${fld('UPI ID',px+'upi'+i,'text',false,a.id||'','placeholder="name@okaxis" autocapitalize="none" autocomplete="off"')}${fld('Account holder name',px+'upn'+i,'text',false,a.name||'',i?'placeholder="e.g. wife or brother"':'')}</div>
    <div class="upi-qr-row"><label class="upload upload-sm" for="${px}${k}">${ic('qr',20)}<span>${imgBuf[k]?'Change UPI QR image':'Add UPI QR image (optional)'}</span><small>Photo or screenshot of the bank’s QR</small><input type="file" id="${px}${k}" accept="image/*" data-img="${k}" hidden></label><div class="shot-prev qr-prev" id="prev-${k}">${imgBuf[k]?`<img src="${imgBuf[k]}" alt="UPI QR"><button type="button" class="btn btn-ghost btn-sm" data-act="upiqrDel" data-k="${k}">Remove</button>`:''}</div></div></div>`};
  const SUBU=`
  <div class="pm-sub stack" id="${px}pmUpi" ${m.upi||(e.qrModes&&e.qrModes.upi)?'':'hidden'} style="gap:12px">
    <div class="note warn">${ic('alert',20)}<div><b>About ₹1 lakh a day per UPI account</b><p>Banks usually stop UPI around ₹1,00,000 a day on one account. Add a second UPI, for example the spouse’s, and the counter switches to it when the first one is close to the limit.</p></div></div>
    ${upiBox(e,px)}</div>`,SUBO=`
  <div class="pm-sub stack" id="${px}pmOn" ${m.online||(e.qrModes&&e.qrModes.online&&feat('online',e.acc?e:null))?'':'hidden'} style="gap:12px">
    <div class="note info">${ic('zap',20)}<div><b>Online payment fee: ${gwPct(e)}% + ${P().gwGst!=null?+P().gwGst:18}% GST on each payment</b><p>Charged by the payment gateway through Moi Point. Every online Moi shows the amount given, the fee and what reaches you.${P().gwPlan?` <b>From ${dfmt(P().gwPlan.from)} it becomes ${P().gwPlan.fee}% + ${P().gwPlan.gst}% GST.</b>`:''}</p></div></div>
    <div class="fields">${sel('Who pays the fee?',px+'gwwho',[['family','We pay it · guest pays the exact Moi'],['guest','Guest pays it · fee added on top']],e.gwWho||'family','full')}</div>
    <div id="${px}feeEg">${feeExample(e)}</div>
    ${bankBox(e,px)}</div>`;
  return `<fieldset class="full msg-opt"><legend class="lbl">How will this event receive Moi?</legend>
  <p class="small muted">Only the ways you tick appear when you receive Moi. Change it any time.</p>
  <div class="pmx" role="group" aria-label="Ways to receive Moi">
    <p class="pmx-note small muted" id="${px}pmxNote">${ic('qr',14)} Each switch works on its own. The QR page is optional: switch all of it off and guests who scan only see the event details.</p>
    <div class="pmx-head" aria-hidden="true"><span></span><span>At the counter</span><span>On the QR page</span></div>
    ${[['cash','cash','Cash','At the Moi counter · no charges','Guest fills the form on the QR page and pays cash at the counter'],['upi','phone','Offline UPI','Guest scans your UPI QR · no charges','Guest pays your UPI and uploads the screenshot; you verify'],['online','zap','Online payment','Exact-amount QR · gateway charges','Exact amount through the gateway; confirmed at once']].map(([k,i,l,d,qd])=>{const lock=k==='online'&&!feat('online',e.acc?e:null),on=!lock&&m[k],qon=!lock&&(e.qrModes?!!e.qrModes[k]:!!m[k]);
      return `<div class="pmx-item ${on||qon?'on':''}" data-pmk="${k}"><div class="pmx-row ${on||qon?'on':''} ${lock?'lock':''}" data-pmk="${k}"><span class="pmx-ic">${ic(i,20)}</span><div class="pmx-t"><b>${l}</b><small>${lock?'Not in your plan · <a class="link" href="#plan">see plans</a>':d}</small>${k==='upi'?`<span class="pmx-cnt" id="${px}upiCnt">${upiCntTxt(accs)}</span>`:''}</div>
        <label class="pmx-sw" title="${esc(d)}"><input type="checkbox" id="${px}pm_${k}" ${on?'checked':''} ${lock?'disabled':''}><span class="sw" aria-hidden="true"></span><em>Counter</em></label>
        <label class="pmx-sw" title="${esc(qd)}"><input type="checkbox" id="${px}qr_${k}" ${qon?'checked':''} ${lock?'disabled':''}><span class="sw" aria-hidden="true"></span><em>QR page</em></label></div>${k==='upi'?SUBU:k==='online'&&!lock?SUBO:''}</div>`}).join('')}
  </div>
  </fieldset>`}
function pmSync(px,k,src,on){const pm=document.getElementById(px+'pm_'+k),qr=document.getElementById(px+'qr_'+k);if(!pm)return;
  /* each switch is independent: the counter and the QR page are chosen separately */
  const any=pm.checked||!!(qr&&qr.checked),row=pm.closest('.pmx-row');if(row){row.classList.toggle('on',any);const it=row.closest('.pmx-item');if(it)it.classList.toggle('on',any)}[pm,qr].forEach(x=>x&&x.classList.remove('invalid'));
  const b=k==='upi'?document.getElementById(px+'pmUpi'):k==='online'?document.getElementById(px+'pmOn'):null;if(b)b.hidden=!any;
  if(on&&k==='online'&&!bankLinked(px)){const L=savedBanks();if(L.length){bkSet(px,L[0]);toast('Online Moi will go to your saved account ••••'+L[0].last4+'. Change it below if needed.','good')}else setTimeout(()=>bankPop(px,true),60)}if(on&&k==='upi'&&!upiList(px).some(a=>a.on!==false))setTimeout(()=>upiPop(px,-1,true),60)}
function readPayment(f,px){const q=id=>f.querySelector('#'+px+id),val=id=>(q(id)?q(id).value.trim():'');
  if(!q('pm_cash'))return {};
  const modes={cash:q('pm_cash').checked?1:0,upi:q('pm_upi').checked?1:0,online:q('pm_online').checked?1:0};
  if(!modes.cash&&!modes.upi&&!modes.online)return {err:[px+'pm_cash','Tick at least one way to receive Moi at the counter']};
  const qrc=k=>{const c=q('qr_'+k);return c?(c.checked?1:0):modes[k]};
  const upis=q('upisJson')?(()=>{try{return JSON.parse(q('upisJson').value||'[]').filter(a=>a.id||a.qr)}catch(e){return []}})():[0,1].map(i=>({id:val('upi'+i).replace(/\s/g,''),name:val('upn'+i),qr:imgBuf['upiqr'+i]||null})).filter(a=>a.id||a.qr);
  for(const [i,a] of upis.entries())if(a.id&&!/^[\w.\-]{2,}@[a-z][a-z0-9]+$/i.test(a.id))return {err:[px+'upi'+i,'UPI ID looks wrong. It should look like name@okaxis']};
  if((modes.upi||qrc('upi'))&&!upis.some(a=>a.on!==false))return {err:[px+'upiSum','Add a UPI account (or switch one on) for Offline UPI']};
  let bank;if(q('bk_ok')&&q('bk_ok').checked){const prev=(f.dataset.id?(S.events.find(x=>x.id===f.dataset.id)||{}).bank:(px!=='n_'&&curEv?curEv.bank:null))||null,no=val('bk_no').replace(/\s/g,''),ifsc=val('bk_ifsc').toUpperCase(),hn=val('bk_name');
    if(!hn)return {err:[px+'bk_name','Add the bank account holder name']};if(!no&&!(prev&&prev.last4)&&!val('bk_l4'))return {err:[px+'bk_no','Add the bank account number']};if(no&&!/^\d{9,18}$/.test(no))return {err:[px+'bk_no','Account number should be 9 to 18 digits']};
    if(!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))return {err:[px+'bk_ifsc','IFSC looks wrong. It is 11 characters, like SBIN0001234']};if(!q('bk_ok').checked)return {err:[px+'bk_ok','Tick the box to link this bank account']};
    bank={holder:hn,last4:no?no.slice(-4):(val('bk_l4')||prev.last4),ifsc,linked:true,at:Date.now()};try{bankRemember(bank)}catch(_){}}
  const qm={};['cash','upi','online'].forEach(k=>{qm[k]=qrc(k)});
  return {qrModes:qm,modes,upis,upi:upis[0]?upis[0].id:'',payee:upis[0]?upis[0].name:'',gateway:(modes.online||qm.online)?'razorpay':'none',gwWho:val('gwwho')||'family',...(bank?{bank}:{})}}
function moiForm(ev,px){
  const st=px==='m';
  return `<div class="fields">
      ${fld('Mobile number',px+'_mobile','tel',!st,'','inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="Type the mobile first"','full')}${st?'':`<p class="small muted full" style="margin-top:-6px">${ic('lock',14)} We send a one-time code to this number to confirm it’s you.</p>`}
      <div class="full found-wrap" id="found-${px}"><p class="small muted">${st?'If this number has given Moi on Moi Point before, the name and details fill in by themselves.':'Given Moi on Moi Point before? Your details fill in from your number.'}</p></div>
      ${st?acFld('Name',px+'_name','guest','Contributor name','full',true):fld('Name',px+'_name','text',true,'','autocomplete="name" placeholder="Contributor name"','full')}
      ${st&&IBASE[evLang(ev)]?`<label class="field full alt-name" for="m_alt"><span>Name on receipt · ${LSHORT[evLang(ev)]}</span><input id="m_alt" name="m_alt_receipt" type="text" autocomplete="off" autocorrect="off" spellcheck="false" data-lg="${evLang(ev)}" lang="${evLang(ev)}" placeholder="Fills in as you type the name"><small class="muted">Written from the English name. Fix the spelling here if it isn’t right.</small></label>`:''}
      ${sel('Relationship',px+'_rel',crelsFor(accOfEv(ev)),'Relative')}${otherBox(px+'_rel','crel',false)}
      ${acFld(st?'Native place / Town':'Place',px+'_place','place','e.g. Madurai')}
      ${acFld('Designation',px+'_des','des','e.g. Teacher','full')}
    </div>
    ${st?`<details class="more"><summary>More details (address, notes)</summary><div class="fields">${area('Address (optional)','m_addr','')}${area('Notes','m_notes','')}</div></details>`:''}
`;
}
function amountBlock(px,mode,ev){const ms=px==='p'?qrModes(ev):evModes(ev);
  return `<label class="field" for="${px}_amount"><span>Amount <i>*</i></span><div class="amount-in"><b>₹</b><input id="${px}_amount" type="number" inputmode="numeric" min="1" step="1" placeholder="0" required></div></label>
   <div class="chips" role="group" aria-label="Quick amounts">${AMTS.map(a=>`<button type="button" class="chip" data-act="amt" data-px="${px}" data-v="${a}">₹${a.toLocaleString('en-IN')}</button>`).join('')}</div>
   <div ${ms.length<2?'hidden':''}><span class="lbl" style="display:block;margin-bottom:8px">Payment mode</span><div class="modes m${ms.length}" role="radiogroup">${ms.map(k=>{const off=k==='online'&&!online();return `<button type="button" role="radio" aria-checked="${mode===k}" class="mode ${mode===k?'on':''} ${off?'dis':''}" ${off?'disabled':''} data-act="mode" data-px="${px}" data-mode="${k}"><i>${ic(off?'cloudoff':MODEI[k],22)}</i>${MODE[k]}${off?'<small>Needs internet</small>':''}</button>`}).join('')}</div></div>`;
}
/* an event takes Moi only while it is Active (or Completed, for late Moi). Draft and Archived can be switched back; Void is final */
const takesMoi=ev=>!!ev&&(ev.status==='active'||ev.status==='completed');
const EVMSG={draft:['This event is a draft','Moi can’t be received while the event is a draft. Change its status to Active when you are ready to start.'],archived:['This event is archived','Moi can’t be received for an archived event. Change its status back to Active to take Moi again.'],void:['This event is void','It is view-only now. Moi, expenses, payouts, returns, payments and team can’t be added or changed. A void event can never be reopened. Create a new event instead.']};
function evStopNote(ev,big){const k=ev.status,[t,s]=EVMSG[k]||['This event is closed','Moi can’t be received right now.'],adm=manages(ev.id);
  const btn=k==='void'?(me&&me.role==='admin'?`<button class="btn btn-primary btn-sm" data-act="evNew">${ic('plus',16)}Create a new event</button>`:''):adm?`<button class="btn btn-primary btn-sm" data-act="evActivate" data-id="${ev.id}">${ic('check',16)}Make it Active</button>`:'';
  return `<div class="note ${k==='void'?'bad':'warn'} ev-stop ${big?'big':''}">${ic(k==='void'?'x':'alert',20)}<div><b>${t}</b><p>${s}${k==='void'&&ev.void?` Reason: ${esc(ev.void.reason)}.`:''}${!adm&&k!=='void'?' Ask the event owner to change the status.':''}</p></div>${btn}</div>`}
function vReceive(ev){return vReceive0(ev)+(takesMoi(ev)?credPop(ev):'')}
function vReceive0(ev){
  if(!takesMoi(ev))return `<div class="page-head"><div><h1>Receive Moi</h1><p class="sub">${esc(ev.name)} · ${dfmt(ev.date)}</p></div></div>${evStopNote(ev,1)}`;
  let f=flows.staff;if(!f||f.eid!==ev.id)f=flows.staff={eid:ev.id,stage:'form',mode:evModes(ev)[0]};if(!evModes(ev).includes(f.mode))f.mode=evModes(ev)[0];
  if(f.mode==='online'&&!online()&&f.stage==='form')f.mode=evModes(ev).find(k=>k!=='online')||'online';
  if(f.stage==='pay')return `<div class="flow-box">${payStep(ev,'staff')}</div>`;
  if(f.stage==='done')return `<div class="flow-box">${doneStep(ev,'staff')}</div>`;
  if(!f.kind)f.kind='cash';
  const nfy=ev.notify||{},vc=voiceCfg(ev);
  return `<form data-form="moi" class="stack wiz" data-step="1" novalidate>
    <div class="page-head"><div><h1>Receive Moi</h1><p class="sub">Recording for <b>${esc(ev.name)}</b> · ${dfmt(ev.date)}</p></div>${voiceChip(ev)}</div>
    <ol class="wz-bar" aria-label="Steps"><li data-s="1" class="on"><b>1</b><span>Contributor</span></li><li data-s="2"><b>2</b><span>Moi details</span></li><li data-s="3"><b>3</b><span>Preview</span></li></ol>
    ${waitPanel(ev,1)}${vxBar('m')}
    <div class="form-grid wz-grid">
      <section class="card pad stack wz wz1" style="gap:16px"><h3>Contributor details</h3>${moiForm(ev,'m')}</section>
      <section class="card pad stack wz wz2" style="gap:16px"><h3>Moi details</h3>
        <div><span class="lbl" style="display:block;margin-bottom:8px">Moi type</span><div class="kinds" role="radiogroup" aria-label="Moi type">${kindsAllowed(ev,f).map(k=>`<button type="button" role="radio" aria-checked="${f.kind===k}" class="kind ${f.kind===k?'on':''}" data-act="kind" data-k="${k}"><i>${ic(KINDI[k],22)}</i><span>${KINDL.en[k]}</span>${k==='cash'?'<small>Main</small>':''}</button>`).join('')}</div></div>
        <div id="kind-m" class="stack" style="gap:16px">${kindBlock(ev,f)}</div>
        <details class="more"><summary>Date, time &amp; reference</summary><div class="fields">${fld('Date','m_date','date',false,today())}${tfld('Time','m_time',nowT())}${fld('Collected by','m_by','text',false,me.name,'readonly')}${fld('Reference number','m_ref','text',false,'','placeholder="Moi book page, envelope no."')}</div></details>
      </section>
    </div>
    <section class="card pad wz wz3" id="wzPrev" aria-live="polite"></section>
    <div class="sticky-act wz-act">
      <button type="button" class="btn btn-ghost wz-back" data-act="wzBack">${ic('back',18)}Back</button>
      <div class="sum" id="sum-m">₹0<small>${MODE[f.mode]}</small></div>
      <button type="button" class="btn btn-primary wz-next" data-act="wzNext">Next${ic('arrow',18)}</button>
      <button class="btn btn-primary wz-submit">${ic('check',18)}<span id="wzSubmitTxt">${f.kind==='cash'&&f.mode==='online'?'Generate payment QR':'Submit Moi'}</span></button>
    </div>
  </form>`;
}
/* the Moi details part changes with the Moi type */
function kindBlock(ev,f){
  if(f.kind==='cash')return `${amountBlock('m',f.mode,ev)}<div id="panel-m" class="stack" style="gap:12px">${modePanel(ev,f.mode,'m')}</div>`;
  const metal=f.kind==='gold'||f.kind==='silver';
  const ph={gold:'Ring, chain, coin, bangle…',silver:'Kuthuvilakku, plate, anklet…',gift:'Mixie, saree, dinner set, wall clock…',other:'What did they give?'}[f.kind];
  return `<div class="fields">
    ${metal?`${fld('Weight (grams)','m_grams','number',true,'','inputmode="decimal" min="0.01" step="0.01" placeholder="e.g. 8"')}${sel('Purity','m_purity',PURITY[f.kind])}${fld('Item','m_item','text',false,'',`placeholder="${ph}"`,'full')}`
      :`${fld(f.kind==='gift'?'What gift?':'Description','m_item','text',true,'',`placeholder="${ph}"`,f.kind==='gift'?'':'full')}${f.kind==='gift'?fld('Quantity','m_qty','number',false,'1','inputmode="numeric" min="1" step="1"'):''}`}
    ${fld('Estimated value (₹)','m_est','number',false,'','inputmode="numeric" min="0" placeholder="Approximate, for your records"','full')}
    <div class="full"><label class="upload" for="m_item_photo">${ic('image',22)}<span>Photo of the ${metal?KINDL.en[f.kind].toLowerCase():'item'}</span><small>Take a photo or pick from gallery</small><input type="file" id="m_item_photo" accept="image/*" capture="environment" data-img="mitem" hidden></label><div class="shot-prev" id="prev-mitem" style="margin-top:8px">${imgBuf.mitem?`<img src="${imgBuf.mitem}" alt="Item photo">`:''}</div></div>
  </div>
  <div class="note good">${ic('check',20)}<div><b>Saved as received</b><p>Recorded with its estimated value for your records. It is not added to the cash total or the event balance.</p></div></div>`;
}
/* step 3: everything that will be saved, before submitting */
function previewHtml(ev,f){const v=id=>{const el=f.querySelector('#m_'+id);return el?el.value.trim():''};const fl=flows.staff,lg=evLang(ev),nf=ev.notify||{};
  const fake={kind:fl.kind,amount:+v('amount')||0,gift:{grams:v('grams'),purity:v('purity'),item:v('item'),qty:v('qty')||1}};
  const row=(l,val)=>val?`<div><dt>${l}</dt><dd>${val}</dd></div>`:'';
  const ch=[nf.wa?'WhatsApp':'',nf.sms?'SMS':''].filter(Boolean).join(' + ');
  return `<div class="pv-head"><div><span class="lbl">Check before you submit</span><h2>${esc(v('alt')||v('name'))}</h2>${v('alt')&&v('alt')!==v('name')?`<p class="muted">${esc(v('name'))}</p>`:''}</div>
    <div class="pv-amt"><strong>${esc(amtTxt(fake))}</strong><span class="tag">${ic(fl.kind==='cash'?MODEI[fl.mode]:KINDI[fl.kind],13)}${fl.kind==='cash'?MODE[fl.mode]:KINDL.en[fl.kind]}</span></div></div>
    <div class="pv-grid">
      <div class="pv-sec"><div class="pv-sh"><b>Contributor</b><button type="button" class="link" data-act="wzGo" data-s="1">${ic('edit',14)} Edit</button></div><dl class="kvlist">
        ${row('Mobile',esc(v('mobile')))}${row('Relationship',esc(v('rel')))}${row('Place',esc(v('place')))}${row('Designation',esc(v('des')))}${row('Address',esc(v('addr')))}${row('Notes',esc(v('notes')))}</dl></div>
      <div class="pv-sec"><div class="pv-sh"><b>Moi</b><button type="button" class="link" data-act="wzGo" data-s="2">${ic('edit',14)} Edit</button></div><dl class="kvlist">
        ${fl.kind==='cash'?row('Amount',fmt(fake.amount))+row('Payment',MODE[fl.mode])+row('UTR',esc(v('utr'))):row('Moi type',KINDL.en[fl.kind])+row('Weight',v('grams')?esc(v('grams'))+' g':'')+row('Purity',esc(v('purity')))+row('Item',esc(v('item')))+row('Quantity',fl.kind==='gift'?esc(v('qty')||'1'):'')+row('Estimated value',v('est')?fmt(+v('est')):'')}
        ${row('Date & time',`${dfmt(v('date')||today())} · ${tfmt(v('time')||nowT())}`)}${row('Collected by',esc(me.name))}${row('Reference no.',esc(v('ref')))}</dl>
        ${imgBuf.mitem&&fl.kind!=='cash'?`<img class="pv-photo" src="${imgBuf.mitem}" alt="Item photo">`:''}${imgBuf.mshot&&fl.kind==='cash'&&fl.mode==='upi'?`<img class="pv-photo" src="${imgBuf.mshot}" alt="Payment screenshot">`:''}</div>
    </div>
    <ul class="pv-after">
      <li>${ic('bill',16)}Receipt in ${esc(LANGS.find(l=>l[0]===lg)[1])}</li>
      ${ch?`<li>${ic('msg',16)}${v('mobile')?`${ch} receipt to ${esc(v('mobile'))} · ${fmt2(RATE())} each`:'No mobile, so no WhatsApp / SMS'}</li>`:''}
      ${voiceCfg(ev).on&&!deviceMute?`<li>${ic('speaker',16)}Voice thank-you in ${esc(LSHORT[voiceLang(ev)])}</li>`:''}
    </ul>`}
function payStep(ev,ctx){
  const f=flows[ctx],d=f.draft;
  return `<section class="card pad center">
    <p class="eyebrow">${esc(ev.name)}</p><h2 style="font-size:1.6rem">Scan &amp; Pay ${fmt2(gwCalc(ev,d.amount).pays)}</h2><p class="muted">Open any UPI app and scan. The amount is already filled in.</p>
    <div class="qr-box big" data-qr="${esc(upiStr(ev,gwCalc(ev,d.amount).pays,f.payRef))}" data-size="220"></div>
    <dl class="kvlist" style="width:100%"><div><dt>Payment request</dt><dd class="code">${f.payRef}</dd></div><div><dt>Payer</dt><dd>${esc(d.c.name)}</dd></div>${(()=>{const g=gwCalc(ev,d.amount);return g.pct?`<div><dt>Moi</dt><dd>${fmt(d.amount)}</dd></div><div><dt>Gateway fee (${g.pct}% + GST)</dt><dd>${fmt2(g.fee)}${g.guest?' · added':' · from the Moi'}</dd></div><div><dt>Family receives</dt><dd><b>${fmt2(g.gets)}</b></dd></div>`:''})()}</dl>
    <div class="waiting"><i></i>Waiting for payment confirmation</div>
    <p class="small muted">Demo mode: ${!ev.gateway||ev.gateway==='none'?'no gateway is connected':GATEWAYS[ev.gateway]+' is configured but not live'}. Use the button below to simulate the confirmation a gateway would send.</p>
    <div class="btn-row" style="justify-content:center"><button class="btn btn-primary" data-act="paySim" data-ctx="${ctx}">${ic('check',18)}Simulate payment success</button><button class="btn btn-ghost" data-act="payCancel" data-ctx="${ctx}">Cancel</button></div>
  </section>`;
}
/* who recorded the entry, with their role in that event */
function byWho(m){if(m.collected_by==='qr')return 'Self · via event QR page';const u=S.users.find(x=>x.id===m.collected_by);if(!u)return 'Unknown';
  const r=u.role==='admin'?'admin':((S.eventUsers.find(a=>a.event_id===m.event_id&&a.user_id===u.id)||{}).role||u.role);return `${u.name} · ${ROLE[r]}`}
const recAt=m=>{const d=new Date(m.created_at||Date.parse(m.date+'T'+m.time));return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+', '+d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',second:'2-digit'})};
function receiptText(m,lg){const ev=S.events.find(e=>e.id===m.event_id);lg=lg||evLang(ev);const L=k=>trT(lg,k),r=[];
  const rets=0;
  r.push(`*${L('title')}* · ${m.code}`,'',`*${ev.name}* (${ev.type})`,`${L('date')}: ${dfmt(ev.date)}, ${tfmt(ev.start)} – ${tfmt(ev.end)}`,`${L('venue')}: ${ev.venue}${ev.address?', '+ev.address:''}`);
  if(ev.organizer)r.push(`${L('organizer')}: ${ev.organizer}${ev.orgMobile?' · '+ev.orgMobile:''}`);
  r.push('— — — — — — —',`${L('from')}: ${nm(m,lg)}`);
  [['mobile',m.c.mobile],['rel',relT(m.c.relationship,lg)],['place',plc(m.c.place,lg)],['des',m.c.designation],['address',m.c.address],['notes',m.c.notes]].forEach(([k,v])=>{if(v)r.push(`${L(k)}: ${v}`)});
  if(isItem(m)){const g=m.gift||{};r.push('',`*${L('kind')}: ${kindT(m.kind,lg)}*`);[['weight',g.grams?g.grams+' g':''],['purity',g.purity&&g.purity!=='Other'?g.purity:''],['item',g.item],['qty',(+g.qty||1)>1?g.qty:''],['est',m.est?fmt(m.est):'']].forEach(([k,v])=>{if(v)r.push(`${L(k)}: ${v}`)})}
  else r.push('',`*${L('amount')}: ${fmt(m.amount)}*`,`${L('payment')}: ${modeT(lg,m.mode)}`,`${L('status')}: ${statT(lg,m.status)}`);
  [['utr',m.utr],['gref',m.gref],['ref',m.ref]].forEach(([k,v])=>{if(v)r.push(`${L(k)}: ${v}`)});
  if(rets)r.push(`${L('returned')}: ${fmt(rets)}`);
  r.push('',`${L('received')}: ${dfmt(m.date)}, ${tfmt(m.time)}`,`${L('recorded')}: ${recAt(m)}`,`${L('by')}: ${byWho(m)}`,'— — — — — — —',tr(lg,'thanks').join('\n'),'',`Verify: moipoint.in/r/${m.code}`,`— Sent by *Moi Point* · ${lg==='ta'||lg==='ta-en'?'இலவச மொய் & நிகழ்வு கணக்கு app · ':''}Free Moi & event app · moipoint.in`);
  return r.join('\n')}
const waLink=(m,lg)=>`https://wa.me/${m.c.mobile?'91'+m.c.mobile:''}?text=${encodeURIComponent(receiptText(m,lg))}`;
/* ticket-style receipt: full event + full Moi + collection details */
function ticketHtml(m,lg,notch){const ev=S.events.find(e=>e.id===m.event_id);lg=lg||evLang(ev);const H=k=>trH(lg,k);
  const rets=0;
  const f=(k,v,full)=>v?`<div class="tk-f ${full?'full':''}"><dt>${H(k)}</dt><dd>${v}</dd></div>`:'';
  return `<article class="ticket" style="--notch:${notch||'var(--bg)'}" lang="${lg==='en'?'en':lg.slice(0,2)}">
  <header class="tk-head">
    ${ev.logo&&feat('logo',ev)?`<figure class="tk-img ${ev.logoT?'cut':''}"><img class="tk-img-bg" src="${ev.logo}" alt=""><img class="tk-img-fg" src="${ev.logo}" alt="${esc(ev.name)}"></figure>`:''}
    <div class="tk-brand">${logo()}<span>${MPW()}</span><span class="tk-kind">${H('title')}</span></div>
    <span class="hc-chip">${esc(ev.type)}</span><h2>${esc(ev.name)}</h2>
    <div class="tk-ev">
      <div><span>${H('date')}</span><b>${dfmt(ev.date)}</b><small>${tfmt(ev.start)} – ${tfmt(ev.end)}</small></div>
      <div><span>${H('venue')}</span><b>${esc(ev.venue)}</b><small>${esc(ev.address||'')}</small></div>
      ${ev.organizer?`<div><span>${H('organizer')}</span><b>${esc(ev.organizer)}</b><small>${esc(ev.orgMobile||'')}</small></div>`:''}
    </div>
  </header>
  <div class="tk-perf" aria-hidden="true"></div>
  <section class="tk-amt"><div>${isItem(m)?`<span class="tk-lbl">${H('kind')}</span><strong class="tk-item">${esc(itemTxt(m,lg))}</strong>${m.est?`<span class="tk-lbl">${H('est')} · ${fmt(m.est)}</span>`:''}`:`<span class="tk-lbl">${H('amount')}</span><strong>${fmt(m.amount)}</strong>`}</div>
    <div class="tk-amt-r"><span class="pill ${STATUS[m.status][1]}">${esc(statT(lg,m.status))}</span><span class="tag">${ic(MODEI[m.mode],13)}${esc(modeT(lg,m.mode))}</span></div></section>
  <section class="tk-sec"><h4>${H('contributor')}</h4><dl class="tk-grid">
    ${f('from',`<b class="tk-name">${esc(nm(m,lg))}</b>`,1)}${f('mobile',esc(m.c.mobile))}${f('rel',esc(relT(m.c.relationship,lg)))}${f('place',esc(plc(m.c.place,lg)))}${f('des',esc(locDes(m.c.designation,lg)))}${f('address',esc(m.c.address),1)}${f('notes',esc(m.c.notes),1)}</dl></section>
  ${isItem(m)?`<section class="tk-sec"><h4>${H('kind')}</h4><dl class="tk-grid">${f('kind',esc(kindT(m.kind,lg)))}${f('weight',m.gift&&m.gift.grams?esc(m.gift.grams)+' g':'')}${f('purity',m.gift&&m.gift.purity&&m.gift.purity!=='Other'?esc(m.gift.purity):'')}${f('item',esc(m.gift&&m.gift.item))}${f('qty',m.gift&&(+m.gift.qty||1)>1?esc(m.gift.qty):'')}${f('est',m.est?fmt(m.est):'')}${m.gift&&m.gift.photo?f('photo',`<img class="tk-proof" src="${m.gift.photo}" alt="Photo of the gift">`,1):''}</dl></section>`:`<section class="tk-sec"><h4>${H('payDetails')}</h4><dl class="tk-grid">
    ${f('payment',esc(modeT(lg,m.mode)))}${f('status',esc(statT(lg,m.status)))}${f('utr',m.utr?`<span class="code">${esc(m.utr)}</span>`:'')}${f('gref',m.gref?`<span class="code">${esc(m.gref)}</span>`:'')}${f('ref',esc(m.ref))}${rets?f('returned',fmt(rets)):''}
    ${m.shot?f('proof',`<img class="tk-proof" src="${m.shot}" alt="Payment screenshot">`,1):''}</dl></section>`}
  <section class="tk-sec"><h4>${H('collection')}</h4><dl class="tk-grid">
    ${f('received',`${dfmt(m.date)}, ${tfmt(m.time)}`)}${f('recorded',recAt(m))}${f('by',esc(byWho(m)),1)}</dl></section>
  <div class="tk-perf" aria-hidden="true"></div>
  <footer class="tk-stub"><div class="qr-box" data-qr="https://moipoint.in/r/${m.code}" data-size="92"></div>
    <div class="tk-stub-t"><span class="tk-lbl">${H('no')}</span><b class="tk-code">${m.code}</b><small>${esc(trT(lg,'scan'))}</small><p class="tk-thanks">${tr(lg,'thanks').map(esc).join('<br>')}</p></div></footer>
  ${feat('brand',ev)?'':`<a class="tk-ad" href="https://moipoint.in" target="_blank" rel="noopener" aria-label="Moi Point, free Moi and event app">
    <span class="tk-ad-logo" aria-hidden="true">${mpMark()}</span>
    <span class="tk-ad-t"><b>${MPW()}</b><small>${lg==='ta'||lg==='ta-en'?'இலவச மொய் & நிகழ்வு கணக்கு app · ':''}Free Moi &amp; event accounts app</small></span>
    <span class="tk-ad-cta">Create your event free<em>moipoint.in</em></span>
  </a>`}
  </article>`}
function doneStep(ev,ctx){
  const m=S.moi.find(x=>x.id===flows[ctx].moiId);if(!m){flows[ctx].stage='form';return ''}
  const H={received:['Moi Received Successfully','good','check'],verified:['Moi Received Successfully','good','check'],pending:['Moi recorded, awaiting verification','warn','clock'],tocollect:['Thank you! Please pay at the counter','warn','clock']}[m.status];
  return `<section class="card pad center">
    <div class="done-ic ${H[1]}">${ic(H[2],34)}</div><h2 style="font-size:1.5rem">${H[0]}</h2><span class="tx">${m.code}</span>
    ${ctx==='public'?qrDoneNote(ev,m):m.status==='tocollect'?`<p class="muted">Show this receipt number to the Moi collector when you hand over ${fmt(m.amount)}.</p>`:''}
    ${voiceCfg(ev).on?`<button type="button" class="voice-chip" data-act="voiceReplay" data-id="${m.id}">${ic('speaker',16)}${deviceMute&&ctx==='staff'?'Voice muted · tap to play once':'Speak again · '+LSHORT[voiceLang(ev)]}</button>`:''}
    ${msgLines(ev,m,ctx)}
    ${rcptHtml(m,evLang(ev),rfmtOf(ev),'var(--surface)')}
    <div class="btn-grid"><button class="btn btn-primary" data-act="print" data-id="${m.id}">${ic('bill',18)}Print receipt</button><button class="btn btn-soft" data-act="receipt" data-id="${m.id}">${ic('eye',18)}Other language</button><button class="btn btn-ghost" data-act="copyReceipt" data-id="${m.id}">${ic('copy',18)}Copy receipt</button><a class="btn btn-wa" href="${waLink(m)}" target="_blank" rel="noopener">${ic('msg',18)}WhatsApp</a></div>
    <button class="btn btn-primary btn-block" data-act="flowNew" data-ctx="${ctx}">${ctx==='staff'?'Receive another Moi':'Done'}</button>
  </section>`;
}


/* ---------- QR page: one-time code to the guest's mobile, then one status message ---------- */
let qo=null;const qrOk=new Set();
function qrOtp(ev,mobile,f){qo={ev:ev.id,mobile,code:'',sends:0,next:0,tries:0,form:f};qrOtpSend()}
function qrOtpSend(){const o=qo,ev=S.events.find(e=>e.id===o.ev);if(o.sends>=3)return qrOtpView('Too many codes sent. Please give your Moi at the counter.');
  o.code=String(Math.floor(100000+Math.random()*900000));o.sends++;o.next=Date.now()+30000;o.tries=0;
  const st=sendMsg('SMS',o.mobile,`${o.code} is your Moi Point code for ${ev.name}. Don’t share it. It expires in 10 minutes.`,ev.id);o.at=Date.now();
  if(st!=='Sent'&&st!=='Queued'){o.code='';return qrOtpView(st==='Queued'?'':'We can’t send the code right now. Please give your Moi at the counter.')}
  qrOtpView()}
function qrOtpView(err){const o=qo;if(!o)return;const left=Math.max(0,Math.ceil((o.next-Date.now())/1000));
  openModal(`${mh('Confirm your mobile','Code sent by SMS to +91 '+fmtMob(o.mobile))}<form data-form="qrOtp" novalidate><div class="md-b stack" style="gap:14px">
    ${err?`<div class="note bad">${ic('alert',20)}<div><b>${esc(err)}</b></div></div>`:`<label class="field" for="qo_code"><span>6-digit code</span><input id="qo_code" class="otp-in" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" required></label>
    ${o.code?`<p class="small muted"><span>Demo code (in the live app it comes by SMS):</span> <b class="code">${o.code}</b></p>`:''}
    <div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="otpRe" ${left?'disabled':''} id="qoRe">${left?`Resend in ${left}s`:'Resend code'}</button><button type="button" class="btn btn-ghost btn-sm" data-act="otpChange">Change number</button></div>`}
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">${err?'Close':'Cancel'}</button>${err?'':`<button class="btn btn-primary">${ic('check',18)}Confirm</button>`}</div></form>`);
  setTimeout(()=>{const i=document.getElementById('qo_code');if(i)i.focus()},40);
  clearInterval(o.iv);if(!err&&left)o.iv=setInterval(()=>{const b=document.getElementById('qoRe');const l=Math.max(0,Math.ceil((o.next-Date.now())/1000));if(!b){clearInterval(o.iv);return}b.disabled=!!l;b.textContent=l?`Resend in ${l}s`:'Resend code';if(!l)clearInterval(o.iv)},1000)}
function qrOtpCheck(f){const o=qo,i=document.getElementById('qo_code');if(!o||!i)return;const v=i.value.replace(/\D/g,'');
  if(v.length!==6)return bad(i.form,'qo_code','Enter the 6-digit code');if(Date.now()-o.at>600000)return bad(i.form,'qo_code','This code expired. Tap Resend code.');
  if(v!==o.code){o.tries++;if(o.tries>=5){o.code='';return qrOtpView('Too many wrong tries. Tap Resend code or give your Moi at the counter.')}return bad(i.form,'qo_code','That code is not right. Check the SMS and try again.')}
  const fl=flows.public;fl.otpOk=o.mobile;qrOk.add(o.ev+':'+o.mobile);clearInterval(o.iv);closeModal();toast('Mobile confirmed','good');const form=document.querySelector('form[data-form="pub"]');if(form)submitMoi('public',form)}
const QRMSG={
 tocollect:{en:(m,ev)=>`Hello ${m.c.name}, your Moi of ${fmt(m.amount)} for ${ev.name} is noted. No. ${m.code}. Status: PENDING – please pay at the Moi counter and show this number. Thank you! – Moi Point`,ta:(m,ev)=>`வணக்கம் ${m.c.name}, ${ev.name} விழாவுக்கான உங்கள் ${fmt(m.amount)} மொய் விவரம் பதிவானது. எண்: ${m.code}. நிலை: நிலுவை – மொய் கவுண்டரில் பணம் செலுத்தி இந்த எண்ணைக் காட்டுங்கள். நன்றி! – Moi Point`},
 pending:{en:(m,ev)=>`Hello ${m.c.name}, we got your UPI payment details for ${fmt(m.amount)} at ${ev.name}. No. ${m.code}. Status: PENDING until the family checks it. If you have not paid yet, pay at the counter or online. – Moi Point`,ta:(m,ev)=>`வணக்கம் ${m.c.name}, ${ev.name} விழாவுக்கு ${fmt(m.amount)} UPI கட்டண விவரம் கிடைத்தது. எண்: ${m.code}. நிலை: குடும்பத்தினர் சரிபார்க்கும் வரை நிலுவை. இன்னும் செலுத்தவில்லை என்றால் கவுண்டரில் அல்லது ஆன்லைனில் செலுத்துங்கள். – Moi Point`}};
function qrNotify(ev,m){const lg=evLang(ev),T=QRMSG[m.status],text=T?(T[lg]||T.en)(m,ev):msgText(ev,m,'verified');
  if(!m.c.mobile){m.notified=[];return}const st=sendMsg('WhatsApp',m.c.mobile,text,ev.id);S.notifications[S.notifications.length-1].mid=m.id;m.notified=[{channel:'WhatsApp',status:st}]}
function qrDoneNote(ev,m){return qrWarnTop(ev,m)+qrDoneNote0(ev,m)}
function qrDoneNote0(ev,m){const canOnline=qrModes(ev).includes('online')&&online(),pay=canOnline&&!OK(m)?`<button class="btn btn-primary btn-block" data-act="qrPayNow" data-id="${m.id}">${ic('zap',18)}Pay ${fmt(m.amount)} online now</button>`:'';
  if(m.status==='tocollect')return `<div class="note warn" style="text-align:left">${ic('clock',20)}<div><b>Pending · pay at the Moi counter</b><p><span>Your details are saved. Go to the Moi counter, pay in cash and show this number:</span> <b class="code">${m.code}</b> · <b>${fmt(m.amount)}</b></p><p class="small">It turns to Received once they collect it.</p></div></div>${pay}`;
  if(m.status==='pending')return `<div class="note warn" style="text-align:left">${ic('clock',20)}<div><b>Pending · waiting for the family to check your UPI payment</b><p><span>${canOnline?'If you haven’t paid yet, pay at the counter or online below.':'If you haven’t paid yet, pay at the counter.'}</span> <b class="code">${m.code}</b></p></div></div>${pay}`;
  return `<div class="note good" style="text-align:left">${ic('check',20)}<div><b>Paid · thank you!</b><p>Your receipt is on your WhatsApp.</p></div></div>`}
/* ---------- waiting for the counter: QR entries to collect or verify, always on top ---------- */
const wq={q:''};
function waitPanel(ev,compact){const ms=S.moi.filter(m=>m.event_id===ev.id&&(m.status==='tocollect'||m.status==='pending')).sort((a,b)=>(b.created_at||0)-(a.created_at||0));if(!ms.length)return '';
  const q=wq.q.trim().toLowerCase(),qd=q.replace(/\D/g,''),list=ms.filter(m=>!q||String(m.c.name).toLowerCase().includes(q)||String(m.code).toLowerCase().includes(q)||(qd.length>=3&&String(m.c.mobile||'').includes(qd))),tot=ms.reduce((s,m)=>s+(+m.amount||0),0),mg=manages(ev.id);
  const ago=t=>{const s=Math.round((Date.now()-(t||Date.now()))/60000);return s<1?'just now':s<60?s+' min ago':s<1440?Math.round(s/60)+' h ago':dfmt(new Date(t).toISOString().slice(0,10))};
  if(compact)return `<a class="wp-strip" href="#ev-${ev.id}-list">${ic('clock',18)}<span><b>${ms.length} waiting at the counter · ${fmt(tot)}</b><small>QR entries to collect or verify. Tap to see them.</small></span>${ic('arrow',16)}</a>`;
  return `<section class="wp" aria-label="Waiting for you"><div class="wp-h">${ic('clock',20)}<div><b>Waiting for you · ${ms.length}</b><small>${fmt(tot)} from QR entries. Collect the cash or check the UPI payment, then mark it.</small></div></div>
    ${ms.length>3?`<div class="search wp-s">${ic('search',16)}<input class="inp" data-wq placeholder="Receipt no., name or mobile" value="${esc(wq.q)}" aria-label="Find a waiting entry"></div>`:''}
    <div class="wp-l">${list.map(m=>`<div class="wp-r"><div class="wp-m"><b>${esc(UN(m.c.name))} · ${fmt(m.amount)}</b><small><span class="code">${esc(m.code)}</span> · <span>${m.status==='tocollect'?'Cash at counter':'Offline UPI · check screenshot'}</span> · <span>${ago(m.created_at)}</span></small></div>
      <div class="wp-a">${m.c.mobile?`<a class="icon-btn icon-sm" href="tel:+91${m.c.mobile}" aria-label="Call ${esc(m.c.name)}">${ic('phone',16)}</a>`:''}
      ${m.status==='tocollect'?`<button class="btn btn-good btn-sm" data-act="collected" data-id="${m.id}">${ic('cash',16)}Cash collected</button>`:`${mg?`<button class="btn btn-good btn-sm" data-act="verify" data-id="${m.id}">${ic('check',16)}Verify</button>`:''}<button class="btn btn-ghost btn-sm" data-act="wpCash" data-id="${m.id}">${ic('cash',16)}Took cash instead</button>${mg?`<button class="btn btn-ghost btn-sm" data-act="reject" data-id="${m.id}">Reject</button>`:`<button class="btn btn-ghost btn-sm" data-act="moiView" data-id="${m.id}">${ic('eye',16)}View</button>`}`}</div></div>`).join('')||`<p class="small muted">No match.</p>`}</div></section>`}
