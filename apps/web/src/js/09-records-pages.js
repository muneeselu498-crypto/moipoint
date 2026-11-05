/* ---------- printing ---------- */
const framed=(()=>{try{return window.self!==window.top}catch(e){return true}})();
const PSIZES=[['80','80 mm thermal'],['58','58 mm thermal'],['a4','A4 / Letter']];
let printPref='80';try{printPref=localStorage.getItem('moipoint-print')||'80'}catch(e){}
function thermalHtml(m,lg,size){const ev=S.events.find(e=>e.id===m.event_id);const L=k=>esc(trT(lg,k));
  const row=(k,v)=>v?`<tr><td>${L(k)}</td><td>${v}</td></tr>`:'';
  return `<div class="pr-th w${size}">
  <div class="c"><div class="pr-brand"><span class="pr-logo">${mpMark()}</span>${MPW()}</div><div class="pr-kind">${L('title')}</div></div>
  <hr><div class="c"><b class="pr-ev">${esc(ev.name)}</b><br>${esc(ev.type)} · ${dfmt(ev.date)}<br>${tfmt(ev.start)} – ${tfmt(ev.end)}<br>${esc(ev.venue)}${ev.address?'<br>'+esc(ev.address):''}${ev.organizer?`<br>${L('organizer')}: ${esc(ev.organizer)}${ev.orgMobile?' · '+esc(ev.orgMobile):''}`:''}</div>
  <hr><div class="c">${L('no')}<br><b class="pr-code">${m.code}</b></div><hr>
  <table>${row('from','<b>'+esc(nm(m,lg))+'</b>')}${row('mobile',esc(m.c.mobile))}${row('rel',esc(relT(m.c.relationship,lg)))}${row('place',esc(plc(m.c.place,lg)))}${row('des',esc(locDes(m.c.designation,lg)))}${row('address',esc(m.c.address))}${row('notes',esc(m.c.notes))}</table>
  <hr><div class="c">${isItem(m)?L('kind'):L('amount')}<div class="pr-amt">${esc(amtTxt(m,lg))}</div>${isItem(m)&&m.est?`<div class="pr-small">${L('est')}: ${fmt(m.est)}</div>`:''}</div>
  <table>${row('payment',esc(modeT(lg,m.mode)))}${row('status',esc(statT(lg,m.status)))}${row('utr',esc(m.utr))}${row('gref',esc(m.gref))}${row('ref',esc(m.ref))}</table>
  <hr><table>${row('received',`${dfmt(m.date)}, ${tfmt(m.time)}`)}${row('recorded',recAt(m))}${row('by',esc(byWho(m)))}</table>
  <hr><div class="c"><div class="pr-qr" data-qr="https://moipoint.in/r/${m.code}" data-size="${size==='58'?96:120}"></div><div class="pr-small">${L('scan')}</div><p class="pr-thanks">${tr(lg,'thanks').map(esc).join('<br>')}</p></div>
  <hr><div class="c pr-small"><b>Moi Point</b> · Free Moi &amp; event app<br>Create your event free · moipoint.in</div></div>`}
function printBody(m,lg,size){return size==='a4'?`<div class="pr-a4">${ticketHtml(m,lg,'#FFFFFF')}</div>`:thermalHtml(m,lg,size)}
function printModal(id,lg,size){const m=S.moi.find(x=>x.id===id),ev=S.events.find(e=>e.id===m.event_id);lg=lg||evLang(ev);size=size||printPref;
  openModal(`${mh('Print receipt',m.code+' · '+esc(m.c.name))}<div class="md-b">
    <div class="row-between" style="align-items:flex-start;gap:12px">
      <div><span class="lbl">Paper size</span><div class="chips" style="margin-top:8px" role="radiogroup">${PSIZES.map(([k,l])=>`<button type="button" role="radio" aria-checked="${k===size}" class="chip ${k===size?'on':''}" data-act="printSize" data-id="${id}" data-l="${lg}" data-s="${k}">${l}</button>`).join('')}</div></div>
      <div><span class="lbl">Language</span><div style="margin-top:8px"><select class="inp" style="min-height:40px" data-printlang="${id}" data-s="${size}" aria-label="Receipt language">${LANGS.map(([k,l])=>`<option value="${k}" ${k===lg?'selected':''}>${l}</option>`).join('')}</select></div></div>
    </div>
    ${framed?`<div class="note warn">${ic('alert',20)}<div><b>Printing is blocked inside this preview window</b><p>In the live app, or when this page is opened directly in Chrome, the Print button opens the printer dialog. Thermal sizes work with Bluetooth and USB receipt printers.</p></div></div>`:''}
    <div class="paper-wrap"><div class="paper ${size==='a4'?'a4':'th'}">${printBody(m,lg,size)}</div></div>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Close</button><button type="button" class="btn btn-primary" data-act="doPrint" data-id="${id}" data-l="${lg}" data-s="${size}">${ic('bill',18)}Print</button></div>`,true);
}
function doPrint(id,lg,size){const m=S.moi.find(x=>x.id===id);let pa=$('#printArea');if(!pa){pa=document.createElement('div');pa.id='printArea';document.body.appendChild(pa)}
  pa.innerHTML=printBody(m,lg,size);mountQR(pa);
  let ps=$('#printPage');if(!ps){ps=document.createElement('style');ps.id='printPage';document.head.appendChild(ps)}
  ps.textContent=size==='a4'?'@page{size:A4;margin:12mm}':`@page{size:${size}mm auto;margin:2mm}`;
  try{printPref=size;localStorage.setItem('moipoint-print',size)}catch(e){}
  log(m.event_id,'Receipt printed',`${m.code} · ${size==='a4'?'A4':size+' mm'}`);save();
  if(framed){toast('Printing is blocked in this preview. It works in the live app.','bad');return}
  setTimeout(()=>{try{window.print()}catch(e){toast('This browser couldn’t open the print dialog.','bad')}},150);
}
function receiptModal(id,lg,fk){
  const m=S.moi.find(x=>x.id===id),ev=S.events.find(e=>e.id===m.event_id);lg=lg||evLang(ev);fk=fk||rfmtOf(ev);
  openModal(`${mh('Moi receipt',m.code)}<div class="md-b">
    <div><span class="lbl">Receipt language</span><div class="chips" role="radiogroup" aria-label="Receipt language" style="margin-top:8px">${LANGS.map(([k])=>`<button type="button" role="radio" aria-checked="${k===lg}" class="chip ${k===lg?'on':''}" data-act="rlang" data-l="${k}" data-id="${m.id}">${LSHORT[k]}${k===evLang(ev)?' ★':''}</button>`).join('')}</div>
    <p class="small muted" style="margin-top:6px">★ This event’s default. Change it in event Settings.</p></div>
    <div><span class="lbl">Format</span><div class="chips" role="radiogroup" aria-label="Receipt format" style="margin-top:8px">${RFORMATS.map(([k,l])=>`<button type="button" role="radio" aria-checked="${k===fk}" class="chip ${k===fk?'on':''}" data-act="rfmt" data-f="${k}" data-l="${lg}" data-id="${m.id}">${l}${k===rfmtOf(ev)?' ★':''}</button>`).join('')}</div></div>
    ${rcptHtml(m,lg,fk)}
    <div class="btn-row"><button class="btn btn-primary" data-act="print" data-id="${m.id}" data-l="${lg}">${ic('bill',18)}Print receipt</button><button class="btn btn-ghost" data-act="copyReceipt" data-id="${m.id}" data-l="${lg}">${ic('copy',18)}Copy receipt</button><a class="btn btn-wa" href="${waLink(m,lg)}" target="_blank" rel="noopener">${ic('msg',18)}Share on WhatsApp</a></div></div>`,true);
}
let editKind='cash';
/* a photo with full-size preview, replace and remove — used in the edit form */
function photoField(key,label,src){return `<div class="full ph-field"><span class="lbl">${label}</span>
  <div class="ph-row" id="phw-${key}">${src?`<button type="button" class="ph-prev" data-act="phZoom" aria-label="Show larger"><img src="${src}" alt="${label}"></button>`:`<span class="ph-none">${ic('image',22)}No photo yet</span>`}
  <div class="ph-btns"><label class="btn btn-soft btn-sm" for="e_${key}_file">${ic('upload',16)}${src?'Replace':'Add photo'}</label><input type="file" id="e_${key}_file" accept="image/*" capture="environment" data-img="${key}" hidden>${src?`<button type="button" class="btn btn-ghost btn-sm" data-act="phRemove" data-k="${key}">${ic('trash',16)}Remove</button>`:''}</div></div></div>`}
function editKindBlock(m,kind){const same=(m.kind||'cash')===kind,g=same?(m.gift||{}):{};
  if(kind==='cash')return `<div class="fields">
    <label class="field" for="e_amount"><span>Amount <i>*</i></span><div class="amount-in"><b>₹</b><input id="e_amount" type="number" inputmode="numeric" min="1" step="1" value="${same?m.amount:''}" required></div></label>
    ${sel('Payment mode','e_mode',[['cash','Cash'],['upi','Offline UPI'],['online','Online Payment']],same?m.mode:'cash')}
    ${fld('UTR / Transaction ID','e_utr','text',false,same?m.utr:'','inputmode="numeric"')}${m.gref?fld('Gateway reference','e_gref','text',false,m.gref,'readonly'):''}
    ${photoField('eshot','Payment screenshot',imgBuf.eshot)}</div>`;
  const metal=kind==='gold'||kind==='silver';
  return `<div class="fields">
    ${metal?`${fld('Weight (grams)','e_grams','number',true,g.grams||'','inputmode="decimal" min="0.01" step="0.01"')}${sel('Purity','e_purity',PURITY[kind],g.purity||PURITY[kind][0])}`:''}
    ${fld(metal?'Item':kind==='gift'?'What gift?':'Description','e_item','text',!metal,g.item||'','',metal||kind!=='gift'?'full':'')}
    ${kind==='gift'?fld('Quantity','e_qty','number',false,g.qty||1,'inputmode="numeric" min="1" step="1"'):''}
    ${fld('Estimated value (₹)','e_est','number',false,same?(m.est||''):'','inputmode="numeric" min="0"','full')}
    ${photoField('eitem','Photo of the '+(metal?KINDL.en[kind].toLowerCase():'item'),imgBuf.eitem)}</div>`}
function moiEdit(id){
  {const mm=S.moi.find(x=>x.id===id);if(mm&&mm.status==='void')return toast('Void entries can’t be edited','bad')}
  const m=S.moi.find(x=>x.id===id),ev=S.events.find(e=>e.id===m.event_id),lg=evLang(ev);
  editKind=m.kind||'cash';imgBuf.eshot=m.shot||null;imgBuf.eitem=(m.gift&&m.gift.photo)||null;
  const st=Object.entries(STATUS).filter(([k])=>editKind==='cash'||k==='received').map(([k,v])=>[k,v[0]]);
  openModal(`${mh('Edit Moi entry',m.code+' · recorded '+recAt(m)+' by '+esc(uname(m.collected_by)))}<form data-form="moiEdit" data-id="${id}"><div class="md-b">
    <section class="ed-sec"><h3>${ic('user',18)}Contributor</h3><div class="fields">
      ${fld('Name','e_name','text',true,m.c.name,'','full')}
      ${IBASE[lg]?`<label class="field full alt-name" for="e_alt"><span>Name on receipt · ${LSHORT[lg]}</span><input id="e_alt" name="e_alt_receipt" type="text" autocomplete="off" spellcheck="false" data-lg="${lg}" lang="${lg}" value="${esc(nm(m,lg))}" ${m.c.alt&&m.c.alt[lg]?'data-touched="1"':''}></label>`:''}
      ${fld('Mobile','e_mobile','tel',false,m.c.mobile,'inputmode="numeric" maxlength="10"')}${sel('Relationship','e_rel',[['','Select'],...crelsFor(curAcc()),...(m.c.relationship&&!crelsFor(curAcc()).includes(m.c.relationship)?[m.c.relationship]:[])],m.c.relationship)}
      ${fld('Place','e_place','text',false,m.c.place)}${fld('Designation','e_des','text',false,m.c.designation)}
      ${area('Address','e_addr',m.c.address||'')}${area('Notes','e_notes',m.c.notes||'')}
    </div></section>
    <section class="ed-sec"><h3>${ic('wallet',18)}Moi</h3>
      <div class="kinds">${KIND.map(k=>`<button type="button" role="radio" aria-checked="${editKind===k}" class="kind ${editKind===k?'on':''}" data-act="ekind" data-k="${k}" data-id="${id}"><i>${ic(KINDI[k],20)}</i><span>${KINDL.en[k]}</span></button>`).join('')}</div>
      <div id="ekind">${editKindBlock(m,editKind)}</div>
      <div class="fields" style="margin-top:14px">${sel('Status','e_status',st,m.status,'full')}
        ${fld('Date','e_date','date',false,m.date)}${tfld('Time','e_time',m.time||nowT())}${fld('Reference number','e_ref','text',false,m.ref||'','','full')}</div>
    </section>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${ic('check',18)}Save changes</button></div></form>`,true);
}

/* ---------- mark as returned: we gave Moi back at their function (record only, not deducted) ---------- */
const retAmt=m=>m.ret?+m.ret.amount||0:0;
function retTag(m){return m.ret?`<span class="tag ret">${ic('check',12)}Returned ${fmt(m.ret.amount)}</span>`:''}
function retInfo(mid){const m=S.moi.find(x=>x.id===mid);if(!m)return'';
  return `<dl class="nums"><div><dt>They gave us</dt><dd>${fmt(m.amount)}</dd></div><div><dt>We returned</dt><dd>${m.ret?fmt(m.ret.amount):'—'}</dd></div><div><dt>Status</dt><dd>${m.ret?'Returned':'Not yet'}</dd></div></dl>`}
function retModal(id){const m=S.moi.find(x=>x.id===id);if(!m)return;const ev=S.events.find(e=>e.id===m.event_id),r=m.ret||{};
  openModal(`${mh(m.ret?'Returned Moi':'Mark as returned',esc(m.c.name)+' · '+m.code)}<form data-form="markRet" data-id="${m.id}"><div class="md-b">
    <div class="ret-box"><span class="avatar ${avc(m.c.name)}">${ini(m.c.name)}</span><div><b>${esc(m.c.name)}</b><small>${esc(m.c.relationship||'')}${m.c.place?' · '+esc(m.c.place):''}</small></div><div class="ret-gave"><span class="lbl">They gave at ${esc(ev.name)}</span><b>${esc(amtTxt(m))}</b></div></div>
    <p class="small muted">Only a record of what you gave back at their function. It is not taken out of this event’s balance.</p>
    <div class="fields">
      ${fld('Amount we gave (₹)','rt_amount','number',true,r.amount||m.amount||m.est||'','min="1" inputmode="numeric"')}${fld('Date we gave','rt_date','date',true,r.date||today())}
      ${fld('At which function','rt_note','text',false,r.note||'','placeholder="e.g. Their son’s wedding"','full')}
    </div>
    ${m.ret?`<p class="small muted">Marked by ${esc(uname(m.ret.by))} · ${new Date(m.ret.at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>`:''}
  </div><div class="md-f">${m.ret?`<button type="button" class="btn btn-danger" data-act="unret" data-id="${m.id}">Mark not returned</button>`:''}<button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${ic('check',18)}${m.ret?'Save':'Mark as returned'}</button></div></form>`);
}

/* ---------- expenses ---------- */
function vExpenses(ev){
  const xs=S.expenses.filter(x=>x.event_id===ev.id).sort((a,b)=>b.date.localeCompare(a.date)),t=calc(ev.id);
  const cats={};xs.forEach(x=>cats[x.category]=(cats[x.category]||0)+ +x.amount);const cmax=Math.max(1,...Object.values(cats));
  return `<div class="page-head"><div><h1>Expenses</h1><p class="sub">Net balance = Moi received − returns − expenses</p></div><button class="btn btn-primary only-d" data-act="expNew">${ic('plus')}Add Expense</button></div>
  <div class="tiles">${tile('Total bills',fmt(t.billTotal),xs.length+' bills','bill','--tint-amber')}${tile('Paid (incl. advance)',fmt(t.expenses),'','check','--tint-cyan')}${tile('Balance to pay vendors',fmt(t.vendorDue),t.vendorDue?'Still owed':'All settled','clock','--tint-rose')}${tile('Event net balance',fmt(t.net),`After returns, expenses and ${fmt(t.payouts)} payouts`,'chart','--tint-cyan',t.net<0)}</div>
  ${xs.length?`<div class="split"><section class="card pad"><div class="card-h"><h3>By category</h3></div><div class="bars">${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar-r"><span>${k}</span><div class="t"><span style="width:${v/cmax*100}%"></span></div><b>${fmt(v)}</b></div>`).join('')}</div></section>
  <section class="rows">${xs.map(x=>`<article class="row-card" style="cursor:default"><span class="tile-ic" style="margin:0">${ic('bill',18)}</span><div class="rc-main"><b>${esc(x.desc||x.category)}</b><small>${x.category} · ${esc(x.vendor||'—')} · ${x.mode}</small><small>${dfmt(x.date)} · added by ${esc(uname(x.created_by))}${x.receipt?' · bill attached':''}</small>${(+x.billTotal||0)>+x.amount?`<small class="due">Bill ${fmt(x.billTotal)} · Advance ${fmt(x.amount)} · <b>Balance ${fmt(x.billTotal-x.amount)}</b></small>`:''}</div><div class="rc-end"><span class="rc-amt">${fmt(x.amount)}</span>${(+x.billTotal||0)>+x.amount?'<span class="pill warn">Balance due</span>':''}<div class="act-icons">${x.receipt?`<button class="icon-btn icon-sm" data-act="expBill" data-id="${x.id}" aria-label="View bill">${ic('eye',16)}</button>`:''}<button class="icon-btn icon-sm" data-act="expEdit" data-id="${x.id}" aria-label="Edit">${ic('edit',16)}</button><button class="icon-btn icon-sm" data-act="expDel" data-id="${x.id}" aria-label="Delete">${ic('trash',16)}</button></div></div></article>`).join('')}</section></div>`
  :`<div class="card">${emptyBox('No expenses yet','Add hall rent, catering, decoration and other costs to see the real balance.',`<button class="btn btn-primary btn-sm" data-act="expNew">Add Expense</button>`)}</div>`}`;
}
function expModal(id){
  const x=id?S.expenses.find(e=>e.id===id):{category:'Food',desc:'',amount:'',mode:'Cash',date:today(),vendor:'',notes:'',receipt:null};
  imgBuf.bill=x.receipt||null;
  openModal(`${mh(id?'Edit expense':'Add expense',esc(curEv.name))}<form data-form="exp" data-id="${id||''}"><div class="md-b"><div class="fields">
    ${sel('Category','x_cat',xcatsFor(curAcc(),x.category),x.category,'',true)}${otherBox('x_cat','xcat',false)}${fld('Paid now / advance (₹)','x_amount','number',true,x.amount,'min="1" inputmode="numeric"')}
    ${fld('Full bill amount (₹)','x_total','number',false,x.billTotal||'','min="0" inputmode="numeric" placeholder="Leave empty if fully paid"')}<div class="field" id="x_due"><span>Balance to pay</span><b class="rc-amt" style="padding-top:12px">${(+x.billTotal||0)>+x.amount?fmt(x.billTotal-x.amount):'₹0 · settled'}</b></div>
    ${fld('Description','x_desc','text',true,x.desc,'placeholder="e.g. Dinner for 180 guests"','full')}
    ${sel('Payment mode','x_mode',['Cash','UPI','Bank Transfer','Card','Cheque'],x.mode)}${fld('Date','x_date','date',true,x.date)}
    ${fld('Vendor / Paid to','x_vendor','text',false,x.vendor,'','full')}
    <div class="full"><label class="upload" for="x_bill">${ic('upload',22)}<span>Upload bill / receipt</span><small>Photo of the bill</small><input type="file" id="x_bill" accept="image/*" capture="environment" data-img="bill" hidden></label><div class="shot-prev" id="prev-bill" style="margin-top:8px">${x.receipt?`<img src="${x.receipt}" alt="Bill">`:''}</div></div>
    ${area('Notes','x_notes',x.notes)}${fld('Added by','x_by','text',false,id?uname(x.created_by):me.name,'readonly','full')}
  </div></div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${id?'Save changes':'Add expense'}</button></div></form>`);
}

/* ---------- payouts: money taken out of the Moi collection ---------- */
const POMODE={cash:'Cash from Moi counter',upi:'UPI transfer',bank:'Bank transfer'};
const POPURP=['Urgent vendor payment','Catering balance','Pooja / priest','Transport','Gifts / return gifts','Hall / decoration','Personal use by family','Other'];
function vPayouts(ev){
  const ps=(S.payouts||[]).filter(p=>p.event_id===ev.id).sort((a,b)=>b.created_at-a.created_at),t=calc(ev.id),mg=manages(ev.id);
  return `<div class="page-head"><div><h1>Payouts</h1><p class="sub">Money the family takes out of the Moi collection, for urgent payments or other needs. Every rupee is recorded.</p></div><button class="btn btn-primary only-d" data-act="poNew">${ic('plus')}Record payout</button></div>
  <div class="tiles">${tile('Total paid out',fmt(t.payouts),t.payoutN+' payout'+(t.payoutN===1?'':'s'),'wallet','--tint-rose')}${tile('Cash at Moi counter',fmt(t.cashAtCounter),'Cash Moi − cash taken out','cash','--tint-amber',t.cashAtCounter<0)}${tile('Moi received',fmt(t.total),'','check','--tint-cyan')}${mg?tile('Net balance',fmt(t.net),'After returns, expenses, payouts','chart','--tint-cyan',t.net<0):tile('Entries',t.okN,'','list')}</div>
  ${ps.length?`<div class="rows">${ps.map(p=>`<article class="po-card">
    <div class="po-amt"><span class="lbl">Paid out</span><strong>${fmt(p.amount)}</strong><span class="tag">${ic(p.mode==='cash'?'cash':p.mode==='upi'?'phone':'card',13)}${POMODE[p.mode]}</span></div>
    <div class="po-main"><b>${esc(p.to)}</b> <span class="pill info">${esc(p.toRole)}</span>
      <p><b>${esc(p.purpose)}</b>${p.notes?' · '+esc(p.notes):''}</p>
      <small>${dfmt(p.date)}, ${tfmt(p.time)} · handed over by ${esc(uname(p.by))}${p.toMobile?' · '+esc(p.toMobile):''}${p.ref?' · Ref '+esc(p.ref):''}</small>
      <small class="${p.ack?'ok':'warn'}">${ic(p.ack?'check':'alert',13)} ${p.ack?'Receiver confirmed taking this amount':'Not yet confirmed by receiver'}</small>
      ${p.proof?`<button class="po-proof" data-act="poProof" data-id="${p.id}"><img src="${p.proof}" alt="Payout proof">View proof</button>`:''}
    </div>
    ${mg?`<div class="act-icons"><button class="icon-btn icon-sm" data-act="poEdit" data-id="${p.id}" aria-label="Edit payout">${ic('edit',16)}</button><button class="icon-btn icon-sm" data-act="poDel" data-id="${p.id}" aria-label="Delete payout">${ic('trash',16)}</button></div>`:''}
  </article>`).join('')}</div>`
  :`<div class="card">${emptyBox('No payouts yet','When the family takes money from the Moi box for an urgent payment, record it here so the accounts match.',`<button class="btn btn-primary btn-sm" data-act="poNew">Record payout</button>`)}</div>`}
  <div class="note info">${ic('shield',20)}<div><b>Why record payouts?</b><p>The Moi counter’s cash and the final balance stay correct, and the family can see who took how much, when and why. Payouts appear in Reports and the Moi Book.</p></div></div>`;
}
function poModal(p){const ev=curEv,t=calc(ev.id);imgBuf.po=p&&p.proof||null;const pv=k=>p?(p[k]==null?'':p[k]):null;
  openModal(`${mh(p?'Edit payout':'Record payout','Money taken out of '+esc(ev.name)+'’s Moi collection')}<form data-form="po" ${p?`data-id="${p.id}"`:''}><div class="md-b">
    <div class="po-box"><div><span class="lbl">Cash at Moi counter now</span><b>${fmt(t.cashAtCounter)}</b></div><div><span class="lbl">Net balance</span><b>${fmt(t.net)}</b></div></div>
    <label class="field" for="po_amount"><span>Amount <i>*</i></span><div class="amount-in"><b>₹</b><input id="po_amount" type="number" inputmode="numeric" min="1" step="1" placeholder="0" value="${p?p.amount:''}" required></div></label>
    <div class="fields">
      ${fld('Paid to','po_to','text',true,p?p.to:(ev.organizer||''),'placeholder="Who is taking the money"')}${sel('They are','po_role',['Organizer','Family member','Vendor (paid directly)','Other'],p?p.toRole:'')}
      ${fld('Their mobile','po_mobile','tel',false,p?p.toMobile:(ev.orgMobile||''),'inputmode="numeric" maxlength="10"')}${sel('How','po_mode',Object.entries(POMODE),p?p.mode:'')}
    </div>
    <div><span class="lbl">Purpose</span><div class="chips" style="margin-top:8px">${(p&&!POPURP.includes(p.purpose)?[...POPURP,p.purpose]:POPURP).map((x,i)=>`<button type="button" class="chip ${(p?x===p.purpose:i===0)?'on':''}" data-act="poPurp" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><input type="hidden" id="po_purpose" value="${esc(p?p.purpose:POPURP[0])}"></div>
    <div class="fields">
      ${fld('Date','po_date','date',false,p?p.date:today())}${tfld('Time','po_time',p?p.time:nowT())}
      ${fld('UPI / bank reference','po_ref','text',false,p?p.ref:'','placeholder="For UPI or bank transfer"','full')}
      ${area('Notes','po_notes',p?p.notes:'')}
      <div class="full"><label class="upload" for="po_proof">${ic('upload',22)}<span>Photo proof (optional)</span><small>Signed slip, bill or transfer screenshot</small><input type="file" id="po_proof" accept="image/*" capture="environment" data-img="po" hidden></label><div class="shot-prev" id="prev-po" style="margin-top:8px">${p&&p.proof?`<img src="${p.proof}" alt="Payout proof">`:''}</div></div>
      ${fld('Handed over by','po_by','text',false,p?uname(p.by):me.name,'readonly','full')}
      <label class="check full"><input type="checkbox" id="po_ack" ${!p||p.ack?'checked':''}> The receiver has confirmed taking this amount</label>
      ${canBuy()||manages(ev.id)?`<label class="check full"><input type="checkbox" id="po_wa"> Send WhatsApp confirmation to the receiver (1 credit)</label>`:''}
    </div>
    <p class="small muted" id="po_warn"></p>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${p?'Save changes':'Record payout'}</button></div></form>`);
}

/* ---------- payments ---------- */
function vPayments(ev){
  [0,1].forEach(i=>{imgBuf['upiqr'+i]=(ev.upis&&ev.upis[i]&&ev.upis[i].qr)||null});
  const pend=S.moi.filter(m=>m.event_id===ev.id&&(m.status==='pending'||m.status==='tocollect')).sort((a,b)=>b.created_at-a.created_at);
  const onl=S.moi.filter(m=>m.event_id===ev.id&&m.mode==='online').sort((a,b)=>b.created_at-a.created_at);
  return `<div class="page-head"><div><h1>Payment Collection</h1><p class="sub">Verify UPI screenshots, confirm cash and set up how this event receives money.</p></div></div>
  <section class="card pad"><div class="card-h"><h3>Waiting for action (${pend.length})</h3></div>
  ${pend.length?`<div class="rows">${pend.map(m=>`<div class="row-card" style="cursor:default;flex-wrap:wrap">${m.shot?`<img class="shot-thumb" src="${m.shot}" alt="Screenshot from ${esc(m.c.name)}">`:`<span class="avatar ${avc(m.c.name)}">${ini(m.c.name)}</span>`}<div class="rc-main" style="min-width:150px"><b>${esc(m.c.name)} · ${fmt(m.amount)}</b><small>${MODE[m.mode]}${m.utr?' · UTR '+esc(m.utr):''} · ${dfmt(m.date)} ${tfmt(m.time)}</small><small>${pill(m.status)}</small></div>
    <div class="btn-row">${m.status==='pending'?`<button class="btn btn-good btn-sm" data-act="verify" data-id="${m.id}">${ic('check',16)}Verify</button><button class="btn btn-danger btn-sm" data-act="reject" data-id="${m.id}">Reject</button>`:`<button class="btn btn-good btn-sm" data-act="collected" data-id="${m.id}">${ic('cash',16)}Cash collected</button>`}<button class="btn btn-ghost btn-sm" data-act="moiView" data-id="${m.id}">Details</button></div></div>`).join('')}</div>`:emptyBox('All caught up','No screenshots to verify and no cash waiting to be collected.')}</section>
  <div class="split">
  <form class="card pad stack" style="gap:16px" data-form="paySet"><div><h3>Payment settings</h3><p class="small muted">Ways to receive Moi, UPI accounts and gateway charges for this event.</p></div>
    ${paymentFields(ev,'ps_')}
    <p class="small muted">${ic('link',14)} Gateway API keys are added on the server when you go live. They are never stored in this page.</p>
    <button class="btn btn-primary">Save settings</button></form>
  <section class="card pad"><div class="card-h"><h3>Online payments</h3><span class="tag">${onl.length}</span></div>
    ${onl.length?`<div class="rows">${onl.map(moiRow).join('')}</div>`:emptyBox('No online payments yet','They appear here after guests pay through the dynamic QR.')}</section></div>`;
}

/* ---------- users ---------- */
function vUsers(ev){
  const admins=S.users.filter(u=>u.role==='admin'&&u.acc===ev.acc);
  const as=S.eventUsers.filter(a=>a.event_id===ev.id).map(a=>({a,u:S.users.find(u=>u.id===a.user_id)})).filter(x=>x.u);
  const can_=(r,k)=>({admin:1,manager:['add','view','verify','expense','report','users'].includes(k),collector:['add','view','shot','receipt'].includes(k)})[r];
  const rows=[['Add Moi & record cash','add'],['View Moi entries','view'],['Upload payment screenshots','shot'],['Generate receipts','receipt'],['Verify / reject payments','verify'],['Expenses & returns','expense'],['Reports','report'],['Manage event users','users'],['Delete event / admin settings','del'],['See other events','other']];
  const cell=(r,k)=>{const y=k==='shot'||k==='receipt'?true:k==='del'?r==='admin':k==='other'?r==='admin':can_(r,k);return y?'<span class="yes">✓</span>':'<span class="no">—</span>'};
  return `<div class="page-head"><div><h1>Event Users</h1><p class="sub">People who can work on ${esc(ev.name)}. Each login sees only the events it is given.</p></div><div class="btn-row">${S.users.some(u=>u.role!=='admin'&&u.status!=='deleted'&&u.acc===ev.acc&&!as.some(x=>x.u.id===u.id))?`<button class="btn btn-ghost btn-sm" data-act="assign">Assign existing</button>`:''}${me.role==='admin'?`<button class="btn btn-soft btn-sm" data-act="userNew" data-r="manager">${ic('plus',16)}Add Event Admin</button>`:''}<button class="btn btn-primary btn-sm" data-act="userNew" data-r="collector">${ic('plus',16)}Add Moi Collector</button></div></div>
  <section class="rows">
    ${admins.map(u=>`<div class="row-card" style="cursor:default"><span class="avatar">${ini(u.name)}</span><div class="rc-main"><b>${esc(u.name)}</b><small>${esc(u.email||u.username)} · all events</small></div><span class="pill info">Admin</span></div>`).join('')}
    ${as.map(({a,u})=>`<div class="row-card" style="cursor:default"><span class="avatar ${avc(u.name)}">${ini(u.name)}</span><div class="rc-main"><b>${esc(u.name)}</b><small>${esc(u.email||u.username)} · ${esc(u.mobile)}${u.status!=='active'?' · disabled':''}</small></div><div class="rc-end"><span class="pill ${a.role==='manager'?'info':'mute'}">${ROLE[a.role]}</span><small class="${inAccess(a)?'muted':'neg-t'}">${ic('cal',12)} ${esc(accessTxt(a))}${inAccess(a)?'':' · not active today'}</small></div>${(me.role==='admin'||a.role==='collector')&&u.id!==me.id?`<button class="icon-btn icon-sm" data-act="userEdit" data-id="${u.id}" aria-label="Edit ${esc(u.name)}">${ic('edit',16)}</button><button class="icon-btn icon-sm" data-act="unassign" data-id="${a.id}" aria-label="Remove access">${ic('x',16)}</button>${userDelOk(u)?`<button class="icon-btn icon-sm btn-del" data-act="userDel" data-id="${u.id}" aria-label="Delete ${esc(u.name)}" title="Delete user">${ic('trash',16)}</button>`:''}`:''}</div>`).join('')}
    ${as.length?'':`<div class="card">${emptyBox('No collectors yet','Add a Moi Collector so someone can run the counter without admin access.')}</div>`}
  </section>
  <section class="card pad"><div class="card-h"><h3>What each role can do</h3></div>
    ${table([{t:'Permission'},{t:'Admin'},{t:'Event Manager'},{t:'Moi Collector'}],rows.map(([l,k])=>[l,cell('admin',k),cell('manager',k),cell('collector',k)])).replace('class="tbl"','class="tbl matrix"')}</section>`;
}
function userEditModal(id){const u=S.users.find(x=>x.id===id);if(!u)return;const as=S.eventUsers.filter(a=>a.user_id===u.id&&(!me||me.role==='platform'||S.events.some(e=>e.id===a.event_id&&e.acc===me.acc)));const mgr=!me||me.role==='admin'||me.role==='platform';
  openModal(`${mh('Edit '+esc(u.name),esc(u.email||u.username))}<form data-form="userEdit" data-id="${u.id}"><div class="md-b"><div class="fields">
    ${fld('Name','ue_name','text',true,u.name,'autocomplete="off"','full')}${fld('Mobile number','ue_mobile','tel',true,u.mobile,'inputmode="numeric" maxlength="10"')}${fld(u.role==='admin'?'Email':'Email (login)','ue_email','email',u.role!=='admin'&&u.role!=='platform',u.email||'')}${me&&(me.role==='admin'||me.role==='platform')&&u.role!=='admin'&&u.role!=='platform'?`<div class="field full">${pwFld('New password (leave empty to keep)','ue_pw','new-password')}${u.pwHint?`<small class="muted">Current password: <b class="code" data-noi18n>${esc(pwHintTxt(u))}</b></small>`:''}</div>`:''}
    ${u.role!=='admin'?sel('Login','ue_status',[['active','Enabled'],['disabled','Disabled']],u.status,'full'):''}</div>
    ${as.length?`<div class="stack" style="gap:10px;margin-top:14px"><span class="lbl">Events and access</span>${as.map(a=>{const e=S.events.find(x=>x.id===a.event_id);return `<div class="team-row"><div class="row-between"><b>${esc(e?e.name:'Event')}</b><span class="small muted">${e?dfmt(e.date):''}</span></div><div class="fields">${sel('Role','ue'+a.id+'_role',mgr?[['collector','Moi Collector'],['manager','Event Admin']]:[['collector','Moi Collector']],a.role)}${accessFields('ue'+a.id,a.access)}</div>${permFields('ue'+a.id,a.role,a.perm)}<label class="check small"><input type="checkbox" id="ue${a.id}_rm"> Remove from this event</label></div>`}).join('')}</div>`:''}
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">Save changes</button></div></form>`)}
function userModal(ev){
  const evs=me.role==='admin'?accEvents():[ev];
  openModal(`${mh(ev?'Add Moi Collector':'Add user',ev?'They will be able to log in and work only on the events you tick.':'Create a login and choose its events')}<form data-form="user"><div class="md-b"><div class="fields">
    ${fld('Name','u_name','text',true,'','autocomplete="off"','full')}${fld('Mobile number','u_mobile','tel',true,'','inputmode="numeric" maxlength="10"')}
    ${fld('Email (to log in)','u_user','email',true,'','autocomplete="off" autocapitalize="none" inputmode="email" placeholder="name@gmail.com"')}${fld('Password','u_pw','password',true,'','autocomplete="new-password" minlength="6"')}
    ${sel('Role','u_role',me.role==='admin'?[['collector','Moi Collector'],['manager','Event Admin']]:[['collector','Moi Collector']],'collector')}${accessFields('u',{mode:'always'})}${permFields('u','collector')}
    <fieldset class="field full" style="border:0;padding:0;margin:0"><span>Event access</span><div class="sheet-list">${evs.map(e=>`<label class="check" style="padding:12px 14px;border-radius:14px;background:var(--surface);border:1px solid var(--line)"><input type="checkbox" name="u_ev" value="${e.id}" ${ev&&e.id===ev.id?'checked':''}> ${esc(e.name)} <span class="small muted">· ${dfmt(e.date)}</span></label>`).join('')}</div></fieldset>
  </div><p class="small muted">Passwords are hashed before they are stored. Share the login with the person directly.</p></div>
  <div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">Create login</button></div></form>`);
}
function assignModal(ev){
  const free=S.users.filter(u=>u.acc===ev.acc&&u.role!=='admin'&&u.status!=='deleted'&&!S.eventUsers.some(a=>a.event_id===ev.id&&a.user_id===u.id));
  openModal(`${mh('Assign existing user',esc(ev.name))}<form data-form="assign"><div class="md-b"><div class="fields">${sel('User','as_user',free.map(u=>[u.id,`${u.name} (${u.email||u.username})`]),'','full')}${sel('Role in this event','as_role',me.role==='admin'?[['collector','Moi Collector'],['manager','Event Admin']]:[['collector','Moi Collector']],'collector','full')}${accessFields('as',{mode:'always'})}${permFields('as','collector')}</div></div>
  <div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">Give access</button></div></form>`);
}

/* ---------- QR ---------- */
const payUrl=ev=>`${window.MP_BASE||'https://moipoint.in'}/${ev.no||ev.token}`;
function vQR(ev){
  return `<div class="page-head"><div><h1>Event QR Code</h1><p class="sub">Print it for the Moi counter or share it on the invitation. Guests scan to open this event’s payment page.</p></div></div>
  <div class="split"><section class="card pad center">${evLogo(ev)}<h2>${esc(ev.name)}</h2><p class="muted">${dfmt(ev.date)} · ${esc(ev.venue)}</p>
    <div class="qr-box big" data-qr="${esc(payUrl(ev))}" data-size="230"></div><p class="small muted">Scan to give Moi</p>${qrModes(ev).some(k=>k==='cash'||k==='upi')?`<div class="qr-modewarn">${ic('alert',16)}<span>${QRWARN}</span></div>`:''}
    <div class="btn-row" style="justify-content:center"><button class="btn btn-primary" data-go="#pay-${ev.no||ev.token}">${ic('eye',18)}Open payment page</button><button class="btn btn-ghost" data-act="copyText" data-text="${esc(payUrl(ev))}">${ic('copy',18)}Copy link</button></div><div class="qr-dlrow" style="margin-top:10px"><button class="btn btn-soft" data-act="qrDl">${ic('upload',18)}Download QR · preview first</button></div></section>
  <section class="card pad stack" style="gap:14px"><h3>About this QR</h3>
    <dl class="kvlist"><div><dt>Event link</dt><dd class="code">${esc(payUrl(ev))}</dd></div><div><dt>Event number</dt><dd class="code">${esc(ev.no||'')}</dd></div><div><dt>Guests can pay by</dt><dd>${qrModes(ev).map(k=>QRML[k]).join(' · ')||'QR page payment off · event details only'}</dd></div><div><dt>Event status</dt><dd>${pill(evPh(ev),EVST)}</dd></div></dl>
    <div class="note info">${ic('shield',20)}<div><b>Simple link: moipoint.in/${esc(ev.no||'')}</b><p>The link is just the event number, easy to type or say on the phone. Payment details never travel in the URL, and the page takes Moi only while the event is Active.</p></div></div>
    <p class="small muted">Change how guests can pay on the QR page in Edit event → Payments.</p>
    <div class="note good">${ic('lock',20)}<div><b>One permanent QR for this event</b><p>This QR never changes, so the printed copy and the invitation always work. It only stops taking Moi when the event is marked Completed or Archived.</p></div></div>
  </section></div>`;
}

/* ---------- reports ---------- */
function vReports(ev){
  const R=[['sum','Event report'],['fin','Financial'],['con','Contributors'],['pay','Payments'],['exp','Expenses']];
  return `<div class="page-head"><div><h1>Reports</h1><p class="sub">${esc(ev.name)} · ${dfmt(ev.date)}</p></div><div class="btn-row"><button class="btn btn-primary btn-sm" data-act="bkOpen">${ic('bill',16)}Export Moi Book</button><button class="btn btn-ghost btn-sm" data-act="copyCsv" data-kind="rep">${ic('copy',16)}Copy as CSV</button></div></div>
  <div class="seg" role="tablist">${R.map(([k,l])=>`<button role="tab" aria-selected="${ui.rep===k}" class="${ui.rep===k?'on':''}" data-act="rep" data-k="${k}">${l}</button>`).join('')}</div>
  ${ui.rep==='fin'||ui.rep==='sum'?'':`<div class="filters"><div class="search">${ic('search',18)}<input class="inp" data-rq="q" placeholder="Search" value="${esc(ui.rq.q)}" aria-label="Search report"></div>
    <label class="f-lbl">From<input type="date" data-rq="from" value="${ui.rq.from}"></label><label class="f-lbl">To<input type="date" data-rq="to" value="${ui.rq.to}"></label>
    ${ui.rep!=='exp'?`<label class="f-lbl">Payment<select data-rq="mode">${[['','All'],...Object.entries(MODE)].map(([k,v])=>`<option value="${k}" ${ui.rq.mode===k?'selected':''}>${v}</option>`).join('')}</select></label>`:''}
    ${ui.rep==='pay'?`<label class="f-lbl">Status<select data-rq="status">${[['','All'],['pending','Pending'],['verified','Verified'],['received','Cash received'],['tocollect','Cash to collect'],['rejected','Rejected']].map(([k,v])=>`<option value="${k}" ${ui.rq.status===k?'selected':''}>${v}</option>`).join('')}</select></label>`:''}</div>`}
  <div id="repBody">${ui.rep==="sum"?repSummary(ev):repBody(ev)}</div>`;
}
function repData(ev){
  const q=ui.rq.q.toLowerCase(),inD=d=>(!ui.rq.from||d>=ui.rq.from)&&(!ui.rq.to||d<=ui.rq.to);
  if(ui.rep==='fin'){const t=calc(ev.id);return {h:[{t:'Item'},{t:'Amount',r:1}],rows:[['Total Moi',fmt(t.total)],['Total Cash',fmt(t.cash)],['Total Offline UPI (verified)',fmt(t.upi)],['Total Online Payment',fmt(t.online)],...(t.onlineN?[[`Online gateway fees (${t.onlineN} payments)`,'− '+fmt2(t.gwFees)+(t.gwFeesAll>t.gwFees?` · guests paid ${fmt2(t.gwFeesAll-t.gwFees)} more`:'')],['Online Moi that reached you',fmt2(t.onlineNet)]]:[]),['Total Expenses','− '+fmt(t.expenses)],['Total Payouts','− '+fmt(t.payouts)],['Cash at Moi counter',fmt(t.cashAtCounter)],[`Moi returned by us (${t.returnedN} people, not deducted)`,fmt(t.returns)]],foot:['Net Balance',fmt(t.net)],t}}
  if(ui.rep==='exp'){const xs=S.expenses.filter(x=>x.event_id===ev.id&&inD(x.date)&&(!q||(x.category+x.desc+x.vendor).toLowerCase().includes(q)));return {h:[{t:'Category'},{t:'Description'},{t:'Amount',r:1},{t:'Date'},{t:'Vendor'},{t:'Payment Mode'}],rows:xs.map(x=>[x.category,esc(x.desc),fmt(x.amount),dfmt(x.date),esc(x.vendor),x.mode]),foot:['Total','',fmt(xs.reduce((s,x)=>s+ +x.amount,0)),'','','']}}
  const ms=S.moi.filter(m=>m.event_id===ev.id&&inD(m.date)&&(!ui.rq.mode||m.mode===ui.rq.mode)&&(!q||(m.c.name+m.c.place+m.c.mobile+m.code).toLowerCase().includes(q)));
  if(ui.rep==='con'){const ok=ms.filter(OK);return {h:[{t:'Name'},{t:'Mobile'},{t:'Relationship'},{t:'Place'},{t:'Amount',r:1},{t:'Payment Mode'}],rows:ok.sort((a,b)=>b.amount-a.amount).map(m=>[esc(m.c.name),esc(m.c.mobile),esc(m.c.relationship),esc(m.c.place),esc(amtTxt(m)),isItem(m)?KINDL.en[m.kind]:MODE[m.mode]]),foot:['Total','','','',fmt(ok.reduce((s,m)=>s+ +m.amount,0)),'']}}
  const ps=ms.filter(m=>!ui.rq.status||m.status===ui.rq.status);
  return {h:[{t:'Entry ID'},{t:'Name'},{t:'Mode'},{t:'Status'},{t:'Amount',r:1},{t:'UTR / Ref'},{t:'Date'}],rows:ps.map(m=>[`<span class="code">${m.code}</span>`,esc(m.c.name),MODE[m.mode],pill(m.status),esc(amtTxt(m)),esc(m.utr||m.gref||'—'),dfmt(m.date)]),foot:[ps.length+' payments','','','',fmt(ps.reduce((s,m)=>s+ +m.amount,0)),'','']};
}
function repBody(ev){const d=repData(ev);
  if(ui.rep==='fin'){const t=d.t;const by={};S.moi.filter(m=>m.event_id===ev.id&&OK(m)).forEach(m=>by[m.collected_by]=(by[m.collected_by]||0)+ +m.amount);
    return `<div class="split"><div>${table(d.h,d.rows,d.foot)}</div><section class="card pad"><div class="card-h"><h3>Collected by</h3></div><div class="bars">${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar-r"><span>${esc(uname(k))}</span><div class="t"><span style="width:${v/Math.max(1,t.total)*100}%"></span></div><b>${fmt(v)}</b></div>`).join('')}</div><p class="small muted" style="margin-top:14px">${t.contributors} contributors · ${t.pendingN} entries pending (${fmt(t.pendingAmt)}) are not counted.</p></section></div>`}
  return table(d.h,d.rows,d.foot)}
