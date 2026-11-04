/* ---------- event: moi list ---------- */
function vList(ev){
  const t=calc(ev.id),mg=manages(ev.id);
  return `<div class="page-head"><div><h1>Moi List</h1><p class="sub">${t.entries} entries · ${fmt(t.total)} received · ${t.pendingN} pending</p></div>
    <div class="btn-row">${manages(ev.id)?`<button class="btn btn-soft btn-sm" data-act="bkOpen">${ic('bill',16)}Export Moi Book</button>`:''}<button class="btn btn-ghost btn-sm" data-act="copyCsv" data-kind="moi">${ic('copy',16)}Copy as CSV</button><button class="btn btn-primary btn-sm only-d" data-go="#ev-${ev.id}-receive">${ic('plus',16)}Receive Moi</button></div></div>
  ${waitPanel(ev)}
  <div class="filters">
    <div class="search">${ic('search',18)}<input class="inp" data-lq="q" placeholder="Search name, mobile, place, ID" value="${esc(ui.lq.q)}" aria-label="Search Moi"></div>
    <select data-lq="mode" aria-label="Payment mode">${[['','All modes'],...Object.entries(MODE)].map(([k,v])=>`<option value="${k}" ${ui.lq.mode===k?'selected':''}>${v}</option>`).join('')}</select>
    <select data-lq="ret" aria-label="Returned">${[['','Returned: all'],['yes','Returned by us'],['no','Not returned yet']].map(([k,v])=>`<option value="${k}" ${ui.lq.ret===k?'selected':''}>${v}</option>`).join('')}</select>
    <select data-lq="status" aria-label="Status">${[['','All statuses'],...Object.entries(STATUS).map(([k,v])=>[k,v[0]])].map(([k,v])=>`<option value="${k}" ${ui.lq.status===k?'selected':''}>${v}</option>`).join('')}</select>
    <select data-lq="sort" aria-label="Sort">${[['new','Newest first'],['old','Oldest first'],['hi','Amount: high to low'],['lo','Amount: low to high'],['name','Name A–Z']].map(([k,v])=>`<option value="${k}" ${ui.lq.sort===k?'selected':''}>${v}</option>`).join('')}</select>
    <input type="number" inputmode="numeric" data-lq="min" placeholder="Min ₹" value="${esc(ui.lq.min)}" style="width:110px" aria-label="Minimum amount">
    <input type="date" data-lq="date" value="${esc(ui.lq.date)}" aria-label="Date">
  </div>
  <div id="moiRows">${listBody(ev,mg)}</div>`;
}
function filteredMoi(ev){
  const q=ui.lq.q.toLowerCase();
  let a=S.moi.filter(m=>m.event_id===ev.id&&(!ui.lq.mode||m.mode===ui.lq.mode)&&(!ui.lq.status||m.status===ui.lq.status)&&(!ui.lq.ret||(ui.lq.ret==='yes'?!!m.ret:OK(m)&&!m.ret))&&(!ui.lq.min||+m.amount>=+ui.lq.min)&&(!ui.lq.date||m.date===ui.lq.date)&&(!q||[m.code,m.c.name,m.c.mobile,m.c.place,m.c.relationship,m.c.designation].join(' ').toLowerCase().includes(q)));
  const s=ui.lq.sort;a.sort((x,y)=>s==='old'?x.created_at-y.created_at:s==='hi'?y.amount-x.amount:s==='lo'?x.amount-y.amount:s==='name'?x.c.name.localeCompare(y.c.name):y.created_at-x.created_at);
  {const P=pinsOf(ev);if(P.length){const top=P.map(id=>a.find(m=>m.id===id)).filter(Boolean);a=[...top,...a.filter(m=>!P.includes(m.id))]}}
  return a;
}
function listBody(ev,mg){
  const a=filteredMoi(ev),pinSet=new Set(pinsOf(ev));
  if(!a.length)return `<div class="card">${emptyBox('No entries match','Clear a filter or record a new Moi.')}</div>`;
  const sum=a.reduce((s,m)=>s+(OK(m)?+m.amount:0),0);
  const acts=m=>`<div class="act-icons">${pinBtn(m,mg)}<button class="icon-btn icon-sm" data-act="moiView" data-id="${m.id}" aria-label="View">${ic('eye',17)}</button>${mg?`<button class="icon-btn icon-sm" data-act="moiEdit" data-id="${m.id}" aria-label="Edit">${ic('edit',17)}</button>${m.status==='void'?'':`<button class="icon-btn icon-sm" data-act="moiDel" data-id="${m.id}" aria-label="Void">${ic('x',17)}</button>`}`:''}</div>`;
  return `<div class="list-desk"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Entry ID</th><th>Name</th><th>Mobile</th><th>Relationship</th><th>Place</th><th>Designation</th><th class="r">Amount</th><th>Mode</th><th>Date</th><th>Collected by</th><th>Status</th><th>Returned by us</th><th class="r">Actions</th></tr></thead><tbody>
    ${a.map(m=>`<tr data-mid="${m.id}" class="${rowTone(m)} ${pinSet.has(m.id)?'pinned':''}" ${pinSet.has(m.id)?`data-pin="${m.id}"`:''}><td class="code">${pinSet.has(m.id)&&mg?dragH():''}${m.code}</td><td><b>${esc(UN(m.c.name))}</b>${pinSet.has(m.id)?' '+vipTag():''}</td><td>${esc(m.c.mobile||'—')}</td><td>${esc(m.c.relationship||'—')}</td><td>${esc(UP(m.c.place)||'—')}</td><td>${esc(UD(m.c.designation)||'—')}</td><td class="r"><b>${esc(amtTxt(m))}</b>${isItem(m)&&m.est?`<br><span class="muted small">est. ${fmt(m.est)}</span>`:''}${feeLine(m)}</td><td>${isItem(m)?KINDL.en[m.kind]:MODE[m.mode]}</td><td>${dfmt(m.date)}<br><span class="muted small">${tfmt(m.time)}</span></td><td>${esc(uname(m.collected_by))}</td><td>${pill(m.status)}${m.pending?`<br><span class="tag pend">${ic('cloudoff',12)}Not synced</span>`:''}</td><td>${m.ret?`<button class="tag ret" data-act="markRet" data-id="${m.id}">${ic('check',12)}${fmt(m.ret.amount)}</button><br><span class="muted small">${dfmt(m.ret.date)}</span>`:OK(m)&&mg?`<button class="btn btn-good btn-sm" data-act="markRet" data-id="${m.id}">Mark returned</button>`:'<span class="muted">—</span>'}</td><td class="r">${acts(m)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="6">${a.length} entries shown · received total${(()=>{const fs=a.filter(m=>m.mode==='online'&&OK(m)).map(feeOf).filter(f=>f.by==='family').reduce((x,f)=>x+f.fee,0);return fs?` · gateway fees ${fmt2(fs)}`:''})()}</td><td class="r">${fmt(sum)}</td><td colspan="6"></td></tr></tfoot></table></div></div>
  <div class="list-mob rows">${a.map(m=>`<button class="row-card ${rowTone(m)} ${pinSet.has(m.id)?'pinned':''}" ${pinSet.has(m.id)?`data-pin="${m.id}"`:''} data-act="moiView" data-id="${m.id}">${pinSet.has(m.id)&&mg?dragH():''}<span class="avatar ${avc(m.c.name)}">${ini(m.c.name)}</span><div class="rc-main"><b>${esc(UN(m.c.name))}</b>${pinSet.has(m.id)?vipTag():''}<small>${esc(m.c.relationship||'—')} · ${esc(UP(m.c.place)||'—')}</small><small class="code">${m.code} · ${dfmt(m.date)}</small></div><div class="rc-end"><span class="rc-amt">${esc(amtTxt(m))}</span>${feeLine(m)}${pill(m.status)}${retTag(m)}${m.pending?`<span class="tag pend">${ic('cloudoff',12)}Not synced</span>`:''}</div></button>`).join('')}
    <p class="small muted" style="text-align:center">${a.length} entries · ${fmt(sum)} received${(()=>{const fs=a.filter(m=>m.mode==='online'&&OK(m)).map(feeOf).filter(f=>f.by==='family').reduce((x,f)=>x+f.fee,0);return fs?` · ${fmt2(fs)} gateway fees`:''})()}</p></div>`;
}

/* ---------- moi details / edit ---------- */
function moiView(id){
  const m=S.moi.find(x=>x.id===id);if(!m)return;const ev=S.events.find(e=>e.id===m.event_id),mg=manages(ev.id);
  openModal(`${mh(esc(UN(m.c.name)),m.code)}<div class="md-b">
    <div class="receipt"><div class="receipt-amt"><span class="lbl">${isItem(m)?KINDL.en[m.kind]:MODE[m.mode]}</span><br><strong>${esc(amtTxt(m))}</strong>${isItem(m)&&m.est?`<br><span class="muted">Estimated value ${fmt(m.est)}</span>`:''}${m.mode==='online'?(()=>{const f=feeOf(m);return `<dl class="fee-box"><div><dt>Moi given</dt><dd>${fmt(m.amount)}</dd></div><div><dt>Gateway fee ${f.by==='guest'?'(paid by guest)':'(paid by you)'}</dt><dd>${fmt2(f.fee)}</dd></div><div><dt>${f.by==='guest'?'Guest paid':'Reached you'}</dt><dd><b>${fmt2(f.by==='guest'?f.paid:f.net)}</b></dd></div></dl><p class="small muted">When you return Moi to them, count the full ${fmt(m.amount)} they gave.</p>`})():''}<br>${pill(m.status)}</div>${isItem(m)&&m.gift&&m.gift.photo?`<img src="${m.gift.photo}" alt="Photo of the gift" style="max-height:240px;border-radius:14px;border:1px solid var(--line);margin:0 auto 10px">`:''}
    <dl class="kvlist">
      <div><dt>Mobile</dt><dd>${esc(m.c.mobile||'—')}</dd></div><div><dt>Relationship</dt><dd>${esc(m.c.relationship||'—')}</dd></div>
      <div><dt>Place</dt><dd>${esc(m.c.place||'—')}</dd></div><div><dt>Designation</dt><dd>${esc(m.c.designation||'—')}</dd></div>
      ${m.c.address?`<div><dt>Address</dt><dd>${esc(m.c.address)}</dd></div>`:''}
      <div><dt>Date &amp; time</dt><dd>${dfmt(m.date)} · ${tfmt(m.time)}</dd></div><div><dt>Collected by</dt><dd>${esc(uname(m.collected_by))}</dd></div>
      ${m.utr?`<div><dt>UTR</dt><dd class="code">${esc(m.utr)}</dd></div>`:''}${m.gref?`<div><dt>Gateway reference</dt><dd class="code">${esc(m.gref)}</dd></div>`:''}${m.ref?`<div><dt>Reference no.</dt><dd>${esc(m.ref)}</dd></div>`:''}
      ${m.c.notes?`<div><dt>Notes</dt><dd>${esc(m.c.notes)}</dd></div>`:''}
    </dl></div>
    ${OK(m)?`<div class="ret-strip ${m.ret?'done':''}">${ic(m.ret?'check':'undo',20)}<div><b>${m.ret?`Returned ${fmt(m.ret.amount)} on ${dfmt(m.ret.date)}`:'Not returned yet'}</b><small>${m.ret?esc(m.ret.note||'')+(m.ret.note?' · ':'')+'marked by '+esc(uname(m.ret.by)):'When you give Moi back at their function, mark it here.'}</small></div>${mg?`<button class="btn ${m.ret?'btn-ghost':'btn-good'} btn-sm" data-act="markRet" data-id="${m.id}">${m.ret?'Edit':'Mark as returned'}</button>`:''}</div>`:''}
    ${m.shot?`<div><span class="lbl">Payment screenshot</span><div style="margin-top:8px"><img src="${m.shot}" alt="Payment screenshot" style="max-height:320px;border-radius:14px;border:1px solid var(--line)"></div></div>`:''}
    ${mg&&m.status==='pending'?`<div class="note warn">${ic('shield',20)}<div><b>Check before approving</b><p>Match the amount, payee UPI ID and UTR on the screenshot with your bank app.</p></div></div><div class="btn-row"><button class="btn btn-good" data-act="verify" data-id="${m.id}">${ic('check',18)}Verify payment</button><button class="btn btn-danger" data-act="reject" data-id="${m.id}">${ic('x',18)}Reject</button></div>`:''}
    ${m.status==='tocollect'&&roleIn(ev.id)?`<button class="btn btn-good" data-act="collected" data-id="${m.id}">${ic('cash',18)}Mark cash collected</button>`:''}
    <div class="btn-row"><button class="btn btn-soft btn-sm" data-act="receipt" data-id="${m.id}">${ic('eye',16)}Receipt</button><button class="btn btn-ghost btn-sm" data-act="print" data-id="${m.id}">${ic('bill',16)}Print</button><button class="btn btn-ghost btn-sm" data-act="copyReceipt" data-id="${m.id}">${ic('copy',16)}Copy</button><button class="btn btn-ghost btn-sm" data-go="#r/${m.code}">${ic('qr',16)}What the QR shows</button><a class="btn btn-wa btn-sm" href="${waLink(m)}" target="_blank" rel="noopener">${ic('msg',16)}WhatsApp</a>
    ${OK(m)?`<button class="btn btn-soft btn-sm" data-act="remFromMoi" data-id="${m.id}">${ic('cal',16)}Set return reminder</button>`:''}
    ${m.status==='void'?'':pinBtn(m,mg,1)}${mg?`<button class="btn btn-ghost btn-sm" data-act="moiEdit" data-id="${m.id}">${ic('edit',16)}Edit</button>${m.status==='void'?`<span class="pill mute">Void · ${esc((m.void||{}).reason||'')}</span>`:`<button class="btn btn-danger btn-sm" data-act="moiDel" data-id="${m.id}">${ic('x',16)}Void entry</button>`}`:''}</div>
  </div>`);
}
/* ---------- Moi Book export (printable notebook, portrait or landscape) ---------- */
const BSECS=[['cover','Front page'],['summary','Accounts summary'],['moi','Cash Moi'],['gold','Gold'],['silver','Silver'],['gift','Gift items'],['other','Other items'],['returns','Returned Moi'],['expenses','Expenses'],['payouts','Payouts'],['history','History']];
const book={lg:'',orient:'portrait',order:'time',group:false,pend:true,voids:true,secs:{cover:1,summary:1,moi:1,gold:1,silver:1,gift:1,other:1,returns:1,expenses:1,payouts:1,history:1}};
function bookHtml(ev,o){
  const lg=o.lg,B=(ta,en)=>(lg==='ta'?ta:bk(lg,en)).replace('{n}',t.returnedN),L=o.orient==='landscape',TN=s=>s&&IBASE[lg]?locPhrase(String(s),lg,false):(s||''),TD=s=>s&&IBASE[lg]?locDes(String(s),lg):(s||'');
  const t=calc(ev.id),now=new Date(),gen=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+', '+now.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});
  const th=(a)=>`<tr>${a.map(([ta,en,r])=>`<th class="${r?'r':''}">${B(ta,en)}</th>`).join('')}</tr>`;
  const pages=[];
  if(o.secs.cover)pages.push({ad:1,h:`<div class="bk-cover">
    <div class="bk-top"><span class="bk-mini">${mpMark()}</span><b>${MPW()}</b><span class="bk-top-r">${B('மொய் புத்தகம்','Moi Book')}</span></div>
    ${ev.logo?`<img class="bk-logo" src="${ev.logo}" alt="" style="aspect-ratio:${ev.logoW||1}/${ev.logoH||1}">`:''}
    <p class="bk-type">${esc(ev.type)}</p><h1 class="bk-title">${esc(TN(ev.name))}</h1><p class="bk-sub">${B('மொய் புத்தகம்','Moi Book')}</p>
    <table class="bk-info">
      <tr><th>${B('தேதி & நேரம்','Date & time')}</th><td>${dfmt(ev.date)} · ${tfmt(ev.start)} – ${tfmt(ev.end)}</td></tr>
      <tr><th>${B('இடம்','Venue')}</th><td>${esc(TN(ev.venue))}${ev.address?'<br>'+esc(TN(ev.address)):''}</td></tr>
      ${ev.organizer?`<tr><th>${B('ஏற்பாட்டாளர்','Organizer')}</th><td>${esc(TN(ev.organizer))}${ev.orgMobile?' · '+esc(ev.orgMobile):''}</td></tr>`:''}
      ${ev.desc?`<tr><th>${B('விவரம்','About')}</th><td>${esc(ev.desc)}</td></tr>`:''}
    </table>
    <div class="bk-stats"><div><span>${B('மொய் பதிவுகள்','Moi entries')}</span><b>${t.okN}</b></div><div><span>${B('மொத்த மொய்','Total Moi')}</span><b>${fmt(t.total)}</b></div><div><span>${B('செலவு','Expenses')}</span><b>${fmt(t.billTotal)}</b></div><div><span>${B('மீதம்','Balance')}</span><b>${fmt(t.net)}</b></div></div>
    <p class="bk-gen">${B('நேரடி தரவிலிருந்து உருவாக்கியது','Generated from live data')}: ${gen} · ${esc(me?me.name:'')}</p></div>`});
  if(o.secs.summary){const by={};S.moi.filter(m=>m.event_id===ev.id&&OK(m)).forEach(m=>{const k=uname(m.collected_by);by[k]=by[k]||{n:0,a:0};by[k].n++;by[k].a+= +m.amount});
    const R=(ta,en,v,cls)=>`<tr class="${cls||''}"><td>${B(ta,en)}</td><td class="r">${v}</td></tr>`;
    pages.push({h:`<h2 class="bk-h">${B('கணக்கு சுருக்கம்','Accounts summary')}</h2><div class="bk-cols">
      <table class="bk-tbl"><thead>${th([['விவரம்','Item'],['தொகை','Amount',1]])}</thead><tbody>
        ${R('ரொக்கம்','Cash',fmt(t.cash))}${R('UPI (நேரடி)','Offline UPI',fmt(t.upi))}${R('ஆன்லைன்','Online payment',fmt(t.online))}
        ${R('மொத்த மொய்','Total Moi received',fmt(t.total),'tot')}${t.itemN?R('தங்கம்','Gold received',+t.goldG.toFixed(2)+' g')+R('வெள்ளி','Silver received',+t.silverG.toFixed(2)+' g')+R('பரிசுப் பொருட்கள்','Gift items',t.giftN)+R('மற்ற பொருட்கள்','Other items',t.otherN)+R('பொருட்களின் மதிப்பீடு (கணக்கில் சேர்க்கவில்லை)','Estimated value of items (not added)',fmt(t.itemEst)):''}${R('சரிபார்ப்பில் / பெற வேண்டியது','Pending (not counted)',fmt(t.pendingAmt))}
        ${R('செலவு (செலுத்தியது, advance உட்பட)','Expenses paid (incl. advance)',' − '+fmt(t.expenses))}${R('எடுத்த தொகை (payout)','Payouts taken',' − '+fmt(t.payouts))}
        ${R('கையிருப்பு மீதம்','Balance in hand',fmt(t.net),'tot')}${R('vendors-க்கு கொடுக்க வேண்டியது','Still to pay vendors',' − '+fmt(t.vendorDue))}${R('எல்லாம் செலுத்திய பின் மீதம்','Final balance after all bills',fmt(t.netAfterDue),'tot')}${R('மொய் கவுண்டரில் ரொக்கம்','Cash at Moi counter',fmt(t.cashAtCounter))}${R(`நாங்கள் திருப்பி செய்த மொய் (${t.returnedN} பேர், கழிக்கப்படவில்லை)`,'Moi we returned ({n} people, not deducted)',fmt(t.returns))}
      </tbody></table>
      <table class="bk-tbl"><thead>${th([['வசூலித்தவர்','Collected by'],['பதிவுகள்','Entries',1],['தொகை','Amount',1]])}</thead><tbody>${Object.entries(by).map(([k,v])=>`<tr><td>${esc(k==='Event QR page'?B('நிகழ்வு QR பக்கம்','Event QR page'):TN(k))}</td><td class="r">${v.n}</td><td class="r">${fmt(v.a)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>${B('மொத்தம்','Total')} · ${t.contributors} ${B('பேர்','contributors')}</td><td class="r">${t.okN}</td><td class="r">${fmt(t.total)}</td></tr></tfoot></table></div>`})}
  if(o.secs.moi){let ms=S.moi.filter(m=>m.event_id===ev.id&&!isItem(m)&&(o.voids||(m.status!=='void'&&m.status!=='rejected'))&&(o.pend||OK(m)||m.status==='void'||m.status==='rejected'));
    const srt={time:(a,b)=>a.created_at-b.created_at,name:(a,b)=>a.c.name.localeCompare(b.c.name),place:(a,b)=>(a.c.place||'').localeCompare(b.c.place||'')||a.created_at-b.created_at,amount:(a,b)=>b.amount-a.amount}[o.order];ms.sort(srt);const PSET=new Set(pinsOf(ev));if(PSET.size){const PO=pinsOf(ev),ix=m=>{const k=PO.indexOf(m.id);return k<0?1e9:k};ms.sort((a,b)=>ix(a)-ix(b))}const VIPB=m=>PSET.has(m.id)?`<span class="bk-vip">★ ${B('சிறப்பு விருந்தினர்','Special guest')}</span>`:'';
    const groups=o.group?Object.entries(ms.reduce((g,m)=>{const k=plc(m.c.place,lg)||'—';(g[k]=g[k]||[]).push(m);return g},{})).sort((a,b)=>a[0].localeCompare(b[0])):[['',ms]];
    const H=L?[['எண்','No.'],['ரசீது','Receipt'],['பெயர்','Name'],['கைபேசி','Mobile'],['உறவு','Relation'],['ஊர்','Place'],['பணி','Work'],['தொகை','Amount',1],['முறை','Mode'],['நேரம்','Time'],['வசூலித்தவர்','By'],['கூட்டுத்தொகை','Running total',1]]
      :[['எண்','No.'],['பெயர்','Name'],['உறவு','Relation'],['ஊர்','Place'],['தொகை','Amount',1],['முறை','Mode'],['கூட்டுத்தொகை','Running total',1]];
    let run=0,i=0;const body=groups.map(([g,list])=>{const sub=list.filter(OK).reduce((s,m)=>s+ +m.amount,0);
      return (g?`<tr class="grp"><td colspan="${H.length}">${B('ஊர்','Place')}: ${esc(g)} · ${list.length} · ${fmt(sub)}</td></tr>`:'')+list.map(m=>{i++;const ok=OK(m);if(ok)run+= +m.amount;const md=modeT(lg,m.mode);const st=ok?'':` <span class="bk-st">${esc(statT(lg,m.status))}</span>`;
        return `<tr class="${ok?'':m.status==='void'||m.status==='rejected'?'bk-void':'bk-pend'}">${L?`<td>${i}</td><td class="mono">${m.code.replace('MOI-','')}</td><td><b>${esc(nm(m,lg))}</b>${VIPB(m)}</td><td>${esc(m.c.mobile)}</td><td>${esc(relT(m.c.relationship,lg))}</td><td>${esc(plc(m.c.place,lg))}</td><td>${esc(TD(m.c.designation))}</td><td class="r"><b class="bk-amt">${esc(amtTxt(m,lg))}</b>${st}</td><td>${md}</td><td>${dfmt(m.date).slice(0,6)} ${tfmt(m.time)}</td><td>${esc(m.collected_by==='qr'?B('QR பக்கம்','QR page'):TN(uname(m.collected_by)))}</td><td class="r">${fmt(run)}</td>`
          :`<td>${i}</td><td><b>${esc(nm(m,lg))}</b>${VIPB(m)}${m.c.designation?`<br><small>${esc(TD(m.c.designation))}</small>`:''}</td><td>${esc(relT(m.c.relationship,lg))}</td><td>${esc(plc(m.c.place,lg))}</td><td class="r"><b class="bk-amt">${esc(amtTxt(m,lg))}</b>${st}</td><td>${md}</td><td class="r">${fmt(run)}</td>`}</tr>`}).join('')}).join('');
    pages.push({h:`<h2 class="bk-h">${B('ரொக்க மொய்','Cash Moi')} <small>${ms.length} ${B('பதிவுகள்','entries')} · ${fmt(t.total)}</small></h2>
      <table class="bk-tbl"><thead>${th(H)}</thead><tbody>${body||`<tr><td colspan="${H.length}">—</td></tr>`}</tbody><tfoot><tr><td colspan="${H.length-1}">${B('மொத்த மொய் (பெறப்பட்டது)','Total Moi received')}</td><td class="r">${fmt(t.total)}</td></tr></tfoot></table>
      <p class="bk-note">${B('மங்கலான வரிகள் சரிபார்ப்பில் / நிராகரிக்கப்பட்டவை, மொத்தத்தில் சேர்க்கப்படவில்லை.','Faded rows are pending or rejected and are not added to the total.')}</p>`})}
  /* gold, silver, gift items and other items: one page each with their own totals */
  [['gold','தங்கம்','Gold'],['silver','வெள்ளி','Silver'],['gift','பரிசுப் பொருட்கள்','Gift items'],['other','மற்ற பொருட்கள்','Other items']].forEach(([k,ta,en])=>{
    if(!o.secs[k])return;const list=S.moi.filter(m=>m.event_id===ev.id&&m.kind===k);if(!list.length)return;
    list.sort(o.order==='name'?(a,b)=>a.c.name.localeCompare(b.c.name):o.order==='place'?(a,b)=>(a.c.place||'').localeCompare(b.c.place||''):o.order==='amount'?(a,b)=>(+b.est||0)-(+a.est||0)||(+(b.gift||{}).grams||0)-(+(a.gift||{}).grams||0):(a,b)=>a.created_at-b.created_at);
    const metal=k==='gold'||k==='silver',g=m=>m.gift||{},est=list.reduce((a,m)=>a+(+m.est||0),0),grams=list.reduce((a,m)=>a+(+g(m).grams||0),0);
    const H=[['எண்','No.'],...(L?[['ரசீது','Receipt']]:[]),['பெயர்','Name'],...(L?[['கைபேசி','Mobile']]:[]),['உறவு','Relation'],['ஊர்','Place'],...(metal?[['எடை','Weight',1],['தரம்','Purity']]:[]),['பொருள்','Item'],...(metal?[]:[['எண்ணிக்கை','Qty',1]]),['மதிப்பீடு','Est. value',1],...(L?[['நேரம்','Time'],['வசூலித்தவர்','By']]:[])];
    const rows=list.map((m,ix)=>`<tr>${[`${ix+1}`,...(L?[`<span class="mono">${m.code.replace('MOI-','')}</span>`]:[]),`<b>${esc(nm(m,lg))}</b>`,...(L?[esc(m.c.mobile)]:[]),esc(relT(m.c.relationship,lg)),esc(plc(m.c.place,lg)),...(metal?[`<b>${esc(g(m).grams)} g</b>`,esc(g(m).purity&&g(m).purity!=='Other'?g(m).purity:'—')]:[]),esc(lg==='en'?g(m).item:translit(g(m).item,lg))||'—',...(metal?[]:[esc(g(m).qty||1)]),m.est?fmt(m.est):'—',...(L?[`${dfmt(m.date).slice(0,6)} ${tfmt(m.time)}`,esc(uname(m.collected_by))]:[])].map((c,ci)=>`<td class="${H[ci][2]?'r':''}">${c}</td>`).join('')}</tr>`).join('');
    const span=H.length,wIdx=H.findIndex(h=>h[1]==='Weight'),eIdx=H.findIndex(h=>h[1]==='Est. value');
    const foot=H.map((h,ci)=>ci===0?`<td>${B('மொத்தம்','Total')} · ${list.length}</td>`:ci===wIdx?`<td class="r">${+grams.toFixed(2)} g</td>`:ci===eIdx?`<td class="r">${fmt(est)}</td>`:'<td></td>').join('');
    pages.push({h:`<h2 class="bk-h">${B(ta,en)} <small>${list.length} ${B('பதிவுகள்','entries')}${metal?` · ${+grams.toFixed(2)} g`:''}${est?` · ${B('மதிப்பீடு','est.')} ${fmt(est)}`:''}</small></h2>
      <table class="bk-tbl"><thead>${th(H)}</thead><tbody>${rows}</tbody><tfoot><tr>${foot}</tr></tfoot></table>
      <p class="bk-note">${B('மதிப்பீடு தோராயமானது. ரொக்க மொத்தத்திலோ மீதத்திலோ சேர்க்கப்படவில்லை.','Estimated values are approximate and are not added to the cash total or the balance.')}</p>`})});
  if(o.secs.returns){const rs=S.moi.filter(m=>m.event_id===ev.id&&m.ret).sort((a,b)=>a.ret.date.localeCompare(b.ret.date));
    pages.push({h:`<h2 class="bk-h">${B('திருப்பி செய்த மொய்','Returned Moi')} <small>${rs.length} ${B('பேர்','people')}</small></h2><table class="bk-tbl"><thead>${th([['பெயர்','Name'],['ஊர்','Place'],['அவர் கொடுத்தது','They gave',1],['நாங்கள் கொடுத்தது','We gave',1],['தேதி','Date'],['எந்த விழா','At which function']])}</thead>
    <tbody>${rs.length?rs.map(m=>`<tr><td><b>${esc(nm(m,lg))}</b><br><small>${esc(relT(m.c.relationship,lg))}</small></td><td>${esc(plc(m.c.place,lg))}</td><td class="r">${fmt(m.amount)}</td><td class="r">${fmt(m.ret.amount)}</td><td>${dfmt(m.ret.date)}</td><td>${esc(m.ret.note)}</td></tr>`).join(''):`<tr><td colspan="6">—</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">${B('மொத்தம்','Total')}</td><td class="r">${fmt(t.returns)}</td><td colspan="2"></td></tr></tfoot></table>
    <p class="bk-note">${B('இது பதிவுக்கு மட்டும். நிகழ்வு கணக்கில் கழிக்கப்படவில்லை.','For reference only. Not deducted from this event’s balance.')} ${B('இன்னும் திருப்பி செய்ய வேண்டியவர்கள்','Still to return')}: ${S.moi.filter(m=>m.event_id===ev.id&&OK(m)&&!m.ret).length}</p>`})}
  if(o.secs.expenses){const xs=S.expenses.filter(x=>x.event_id===ev.id).sort((a,b)=>a.date.localeCompare(b.date));
    pages.push({h:`<h2 class="bk-h">${B('செலவு கணக்கு','Expenses')}</h2><table class="bk-tbl"><thead>${th([['தேதி','Date'],['வகை','Category'],['விவரம்','Description'],['யாருக்கு','Vendor'],['முறை','Mode'],['மொத்த bill','Bill total',1],['செலுத்தியது / advance','Paid / advance',1],['மீதம்','Balance',1]])}</thead>
    <tbody>${xs.length?xs.map(x=>{const bt=Math.max(+x.billTotal||0,+x.amount);return `<tr><td>${dfmt(x.date)}</td><td>${esc(x.category)}</td><td>${esc(TD(x.desc))}</td><td>${esc(TN(x.vendor))}</td><td>${esc(x.mode)}</td><td class="r">${fmt(bt)}</td><td class="r">${fmt(x.amount)}</td><td class="r ${bt>x.amount?'due':''}">${bt>x.amount?fmt(bt-x.amount):'—'}</td></tr>`}).join(''):`<tr><td colspan="8">—</td></tr>`}</tbody>
    <tfoot><tr><td colspan="5">${B('மொத்தம்','Total')}</td><td class="r">${fmt(t.billTotal)}</td><td class="r">${fmt(t.expenses)}</td><td class="r">${fmt(t.vendorDue)}</td></tr></tfoot></table>`})}
  if(o.secs.payouts){const ps=(S.payouts||[]).filter(p=>p.event_id===ev.id).sort((a,b)=>a.created_at-b.created_at);
    pages.push({h:`<h2 class="bk-h">${B('எடுத்த தொகை','Payouts')}</h2><table class="bk-tbl"><thead>${th([['தேதி & நேரம்','Date & time'],['யாருக்கு','Paid to'],['காரணம்','Purpose'],['முறை','Mode'],['கொடுத்தவர்','Handed over by'],['உறுதி','Confirmed'],['தொகை','Amount',1]])}</thead>
    <tbody>${ps.length?ps.map(p=>`<tr><td>${dfmt(p.date)} ${tfmt(p.time)}</td><td><b>${esc(TN(p.to))}</b><br><small>${esc(TN(p.toRole))}${p.toMobile?' · '+esc(p.toMobile):''}</small></td><td>${esc(p.purpose)}${p.notes?`<br><small>${esc(p.notes)}</small>`:''}</td><td>${POMODE[p.mode]}${p.ref?`<br><small>${esc(p.ref)}</small>`:''}</td><td>${esc(TN(uname(p.by)))}</td><td>${p.ack?'✓':'—'}</td><td class="r">${fmt(p.amount)}</td></tr>`).join(''):`<tr><td colspan="7">—</td></tr>`}</tbody>
    <tfoot><tr><td colspan="6">${B('மொத்தம்','Total')}</td><td class="r">${fmt(t.payouts)}</td></tr></tfoot></table>
    <p class="bk-note">${B('கையொப்பம்','Signature')}: ______________________ &nbsp;&nbsp; ${B('சரிபார்த்தவர்','Checked by')}: ______________________</p>`})}
  if(o.secs.history){const ls=S.audit.filter(a=>a.eid===ev.id).sort((a,b)=>a.at.localeCompare(b.at));
    pages.push({h:`<h2 class="bk-h">${B('செயல் வரலாறு','History')}</h2><table class="bk-tbl"><thead>${th([['தேதி & நேரம்','Date & time'],['யார்','Who'],['செயல்','Action'],['விவரம்','Details']])}</thead>
    <tbody>${ls.length?ls.map(a=>{const d=new Date(a.at);return `<tr><td>${d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} ${d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</td><td>${esc(TN(a.user))}<br><small>${esc(a.role)}</small></td><td>${esc(a.action)}</td><td>${esc(a.detail)}</td></tr>`}).join(''):`<tr><td colspan="4">—</td></tr>`}</tbody></table>`})}
  if(!pages.length)return `<p class="muted" style="padding:20px;text-align:center">Pick at least one section.</p>`;
  const foot=`<div class="bk-foot"><span class="bk-mini">${mpMark()}</span><b>${MPW()}</b><span>${esc(TN(ev.name))} · ${gen}</span><span class="bk-foot-r">moipoint.in</span></div>`;
  const ad=`<div class="bk-ad"><span class="bk-mini big">${mpMark()}</span><div><b>${MPW()}</b><small>${B('இலவச மொய் & நிகழ்வு கணக்கு app','Free Moi &amp; event accounts app')}</small></div><div class="bk-ad-r">${B('எதிர்கால குறிப்புக்காக இந்த புத்தகத்தை பத்திரமாக வையுங்கள்','Keep this book safe for future reference')}<b>moipoint.in</b></div></div>`;
  return `<div class="bk ${o.orient}">${pages.map(p=>`<section class="bk-page">${p.h}${p.ad?ad:foot}</section>`).join('')}</div>`;
}
function bookModal(){const ev=curEv,o=book;if(!o.lg||o.lg==='ta-en'||!LSHORT[o.lg])o.lg=evLang(ev);
  const md=$('.md');const keep=md&&$('#bkModal')?md.scrollTop:0;
  openModal(`<div id="bkModal"></div>${mh('Export Moi Book','A printed Moi notebook made from live data. Print it or save as PDF.')}<div class="md-b">
    <div><span class="lbl">How will you bind it?</span><div class="orient" style="margin-top:8px">${[['portrait','Portrait · A4','Tall A4 pages · 7 columns'],['landscape','Landscape · A4','Wide A4 pages · 12 columns with mobile, receipt no., collector']].map(([k,l,s])=>`<button type="button" class="orient-b ${o.orient===k?'on':''}" data-act="bkOrient" data-v="${k}" aria-pressed="${o.orient===k}"><span class="pg ${k}"></span><span><b>${l}</b><small>${s}</small></span></button>`).join('')}</div></div>
    <div><span class="lbl">Include</span><div class="chips" style="margin-top:8px">${BSECS.map(([k,l])=>`<label class="chip ck"><input type="checkbox" data-bksec="${k}" ${o.secs[k]?'checked':''}> ${l}</label>`).join('')}</div></div>
    <div class="fields">
      <label class="field" for="bk_order"><span>Moi list order</span><select id="bk_order" data-bk="order">${[['time','Entry time (like the notebook)'],['name','Name A–Z'],['place','Place (ஊர்)'],['amount','Amount, high to low']].map(([k,l])=>`<option value="${k}" ${o.order===k?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="field" for="bk_lg"><span>Language</span><select id="bk_lg" data-bk="lg">${LANGS.map(([k,l])=>`<option value="${k}" ${o.lg===k?'selected':''}>${l}</option>`).join('')}</select></label>
      <div class="full bk-flt"><span class="lbl">Moi that is not confirmed</span><label class="check"><input type="checkbox" id="bk_pend" ${o.pend?'checked':''}> Show pending verification <i class="bk-key pend"></i> (orange, struck, not counted)</label><label class="check"><input type="checkbox" id="bk_void" ${o.voids?'checked':''}> Show void and rejected <i class="bk-key void"></i> (red, struck, not counted)</label></div>
      <label class="check full"><input type="checkbox" id="bk_group" data-bkgroup ${o.group?'checked':''}> Group Moi by place (ஊர் வாரியாக) with subtotals</label>
    </div>
    ${framed?`<div class="note warn">${ic('alert',20)}<div><b>Printing is blocked inside this preview window</b><p>In the live app, or with the file opened directly in Chrome, Print opens the printer dialog. Choose “Save as PDF” there to keep a PDF copy.</p></div></div>`:''}
    <div class="bk-preview" id="bkPrev">${bookHtml(ev,o)}</div>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="copyCsv" data-kind="moi">${ic('copy',18)}Copy for Excel</button><button type="button" class="btn btn-primary" data-act="bkPrint">${ic('bill',18)}Print / Save PDF</button></div>`,true);
  const n=$('.md');if(n)n.scrollTop=keep}
function bookRefresh(){const p=$('#bkPrev');if(p&&curEv)p.innerHTML=bookHtml(curEv,book)}
function bookPrint(){const ev=curEv;let pa=$('#printArea');if(!pa){pa=document.createElement('div');pa.id='printArea';document.body.appendChild(pa)}
  pa.innerHTML=bookHtml(ev,book);let ps=$('#printPage');if(!ps){ps=document.createElement('style');ps.id='printPage';document.head.appendChild(ps)}
  ps.textContent=`@page{size:A4 ${book.orient};margin:10mm}`;
  log(ev.id,'Moi book exported',`${book.orient} · ${BSECS.filter(s=>book.secs[s[0]]).map(s=>s[1]).join(', ')}`);save();
  if(framed){toast('Printing is blocked in this preview. It works in the live app.','bad');return}
  setTimeout(()=>{try{window.print()}catch(e){toast('This browser couldn’t open the print dialog.','bad')}},150)}

/* ---------- offline UI ---------- */
function netChip(){const q=S.queue.length+pendingMsgs().length;
  if(syncing)return `<button class="net-chip sync" data-act="syncPanel">${ic('refresh',15)}<span>Syncing…</span></button>`;
  if(!online())return `<button class="net-chip off" data-act="syncPanel" aria-label="Offline, ${q} waiting to sync">${ic('cloudoff',15)}<span>Offline${q?' · '+q:''}</span></button>`;
  return `<button class="net-chip ${q?'warn':'on'}" data-act="syncPanel" aria-label="${q?q+' waiting to sync':'All synced'}">${ic(q?'refresh':'cloud',15)}<span>${q?q+' to sync':'Synced'}</span></button>`}
function offBanner(){const q=S.queue.length,mq=pendingMsgs().length;
  if(!online())return `<div class="note warn" style="align-items:center;flex-wrap:wrap">${ic('cloudoff',20)}<div style="flex:1;min-width:200px"><b>You’re offline</b><p>Keep recording Moi. Everything is saved on this phone${q?` (${q} change${q>1?'s':''} waiting)`:''} and syncs when internet returns.</p></div><button class="btn btn-ghost btn-sm" data-act="syncPanel">Details</button></div>`;
  if(q||mq)return `<div class="note info" style="align-items:center;flex-wrap:wrap">${ic('refresh',20)}<div style="flex:1;min-width:200px"><b>${q} change${q===1?'':'s'}${mq?` and ${mq} message${mq>1?'s':''}`:''} waiting to sync</b><p>Internet is back. Sync now so other collectors and the admin see them.</p></div><button class="btn btn-primary btn-sm" data-act="syncNow">Sync now</button></div>`;
  return ''}
function syncPanel(){const q=S.queue,mq=pendingMsgs(),on=online();
  openModal(`<div id="syncPanel"></div>${mh('Offline & sync',on?'Connected to the internet':'No internet. Everything is saved on this phone.')}<div class="md-b">
    <div class="sync-state ${on?(q.length||mq.length?'warn':'on'):'off'}">${ic(on?(q.length||mq.length?'refresh':'cloud'):'cloudoff',26)}<div><b>${on?(q.length||mq.length?'Online · waiting to sync':'Online · all synced'):'Offline'}</b><small>This device: <span class="code">${DEV}</span> · receipt numbers from this phone look like MOI-2026-${DEV}-000125, so two phones never clash.</small></div></div>
    <div class="tiles t3">${tile('Changes waiting',q.length,'','refresh','--tint-amber')}${tile('Messages queued',mq.length,mq.length?'Credits used on send':'','msg','--tint-cyan')}${tile('Moi on this phone only',S.moi.filter(m=>m.pending).length,'','cloudoff','--tint-rose')}</div>
    ${q.length?`<div><span class="lbl">Waiting to sync</span><div class="rows" style="margin-top:8px">${[...q].reverse().slice(0,12).map(x=>`<div class="row-card" style="cursor:default;padding:10px 12px"><span class="tile-ic" style="margin:0;width:32px;height:32px">${ic('refresh',15)}</span><div class="rc-main"><b style="white-space:normal;font-size:.88rem">${esc(x.label)}</b><small>${esc(x.by)} · ${new Date(x.at).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}${x.eid?' · '+esc((S.events.find(e=>e.id===x.eid)||{}).name||''):''}</small></div></div>`).join('')}</div></div>
    <div class="note warn">${ic('alert',20)}<div><b>Until it syncs, this data is only on this phone</b><p>Don’t clear browser data, log out or uninstall the app before syncing. Connect to Wi-Fi or mobile data once after the function.</p></div></div>`:''}
    <div class="toggle-r"><div><b>Test offline mode</b><div class="small muted">Demo switch: acts as if the internet is off, so you can try recording Moi offline.</div></div><button class="switch ${simOffline?'on':''}" role="switch" aria-checked="${simOffline}" aria-label="Test offline mode" data-act="simOff"></button></div>
    <p class="small muted">${ic('phone',14)} In the live app, tap <b>Add to Home screen</b> once. Moi Point then opens like a normal app even with no signal.</p>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Close</button><button type="button" class="btn btn-primary" data-act="syncNow" ${on?'':'disabled'}>${ic('refresh',18)}Sync now</button></div>`)}
