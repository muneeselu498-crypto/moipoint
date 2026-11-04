/* ---------- app shell ---------- */
function shell(ev,tab,inner){
  const r=ev?roleIn(ev.id):me.role;
  const tabs=ev?TABS.filter(t=>can(ev.id,t[0])):[];
  const gnav=[['dashboard',me.role==='admin'?'Dashboard':'My Events','grid','#dashboard'],['functions','Our Events / Functions','gift','#functions'],...(me.role==='admin'||S.events.some(e=>e.acc===me.acc&&manages(e.id))?[['guests','Guest list','users','#guests']]:[]),['reminders','Reminders','cal','#reminders']];
  if(canBuy())gnav.push(['credits','Message Credits','wallet','#credits']);
  if(me.role==='admin')gnav.push(['staff','Staff & Access','users','#staff'],['plan','Plan & Usage','card','#plan']);gnav.push(['audit','Activity Log','clock','#audit'],['help','Help & Support','msg','#help']);
  const unread=myNotifs().length>0;
  const TT={functions:'Our Events / Functions',guests:'Guest list',plan:'Plan & Usage',help:'Help & Support',staff:'Staff & Access',audit:'Activity Log',reminders:'Reminders',credits:'Message Credits'};
  const side=`<aside class="side"><div class="side-in">${brand()}
    ${ev?`<button class="evsw" data-act="switcher"><span class="evsw-l">Working on</span><span class="evsw-n">${esc(ev.name)}</span><span class="evsw-d">${dfmt(ev.date)} · ${(EVST[evPh(ev)]||[ev.status])[0]}</span>${ic('down',18)}</button>
    <nav class="snav" aria-label="Event">${tabs.map(t=>`<button class="snav-i ${t[0]===tab?'on':''}" data-go="#ev-${ev.id}-${t[0]}">${ic(t[2])}<span>${t[1]}</span></button>`).join('')}</nav><div class="side-sep"></div>`:''}
    <nav class="snav" aria-label="Main">${gnav.map(g=>`<button class="snav-i ${!ev&&g[0]===tab?'on':''}" data-go="${g[3]}">${ic(g[2])}<span>${g[1]}</span></button>`).join('')}</nav>
    <div class="side-user"><button class="side-me ${tab==='profile'?'on':''}" data-go="#profile" title="My profile"><span class="avatar">${me.photo?`<img src="${me.photo}" alt="">`:ini(me.name)}</span><div><b>${esc(me.name)}</b><small>My profile · ${me.role==='admin'?'Owner':(ROLE[r]||ROLE[me.role])}</small></div></button><button class="icon-btn icon-sm" data-act="logout" aria-label="Log out">${ic('logout',17)}</button></div>
  </div></aside>`;
  const top=`<header class="top"><div class="top-in"><span class="only-m top-logo">${logo()}</span>
    ${ev?`<button class="top-ev" data-act="switcher" aria-label="Switch event"><span class="top-ev-t"><span class="top-ev-n">${esc(ev.name)}</span><small class="top-ev-s"><i class="st-dot ${(EVST[evPh(ev)]||['',''])[1]}"></i><span class="only-m">${esc((EVST[evPh(ev)]||[ev.status])[0])} · </span><span>${dfmt(ev.date).replace(/ (\d{4})$/,'<span class="yr"> $1</span>')}${ev.no?`<span class="only-d"> · ${esc(ev.no)}</span>`:''}</span></small></span>${ic('down',18)}</button><span class="only-d">${pill(evPh(ev),EVST)}</span>`:`<div class="top-ev static"><span class="top-ev-n">${TT[tab]||(me.role==='admin'?'All Events':'My Events')}</span></div>`}
    <div class="top-r"><div class="top-chips">${netChip()}${creditChip()}${langChip()}${themeChip()}</div><div class="top-me"><button class="icon-btn" data-act="notifs" aria-label="Notifications">${ic('bell')}${unread?'<i class="dot"></i>':''}</button><button class="avatar-btn" data-act="account" aria-label="Account">${me.photo?`<img src="${me.photo}" alt="">`:ini(me.name)}</button></div></div>
  </div></header>`;
  let items;
  if(ev){const prim=(r==='collector'?['overview','receive','list','payouts','qr']:['overview','receive','list','expenses']).filter(t=>can(ev.id,t));
    const SH={overview:'Overview',receive:'Receive',list:'Moi List',expenses:'Expenses',qr:'QR',payouts:'Payout'};
    items=prim.map(t=>[t,SH[t],TABS.find(x=>x[0]===t)[2],`#ev-${ev.id}-${t}`]);
    if(r!=='collector')items.push(['more','More','more',null]);
    if(!prim.includes(tab)&&r!=='collector')tab='more';
  }else{items=[['dashboard','Home','home','#dashboard'],['functions','Events / Functions','gift','#functions'],...(me.role==='admin'?[['guests','Guests','users','#guests']]:[]),['reminders','Reminders','cal','#reminders']];if(canBuy())items.push(['credits','Credits','wallet','#credits']);if(items.length>4)items=items.filter(i=>i[0]!=='reminders');items.push(['account','Account','user',null])}
  const bnav=`<nav class="bnav" aria-label="Quick navigation"><div class="bnav-in">${items.map(i=>`<button class="bnav-i ${i[0]===tab?'on':''}" ${i[3]?`data-go="${i[3]}"`:`data-act="${i[0]}"`}>${ic(i[2],21)}<span>${i[1]}</span></button>`).join('')}</div></nav>`;
  let fab='';
  if(ev&&tab==='list')fab=`<button class="fab" data-go="#ev-${ev.id}-receive" aria-label="Receive Moi">${ic('plus',26)}</button>`;
  if(ev&&location.hash.endsWith('-payouts'))fab=`<button class="fab" data-act="poNew" aria-label="Record payout">${ic('plus',26)}</button>`;
  if(ev&&location.hash.endsWith('-expenses'))fab=`<button class="fab" data-act="expNew" aria-label="Add expense">${ic('plus',26)}</button>`;
  return `<div class="app">${side}<div class="main">${top}<main class="content">${impBar()}${offBanner()}${inner}</main></div>${bnav}${fab}</div>`;
}

/* ---------- dashboard ---------- */
/* event cover: same 16:9 frame for every event; the whole image shows (never cropped) over a soft blurred fill */
const COVERS=['linear-gradient(135deg,#2A2580,#5A52E0)','linear-gradient(135deg,#7A2E5C,#D46A8C)','linear-gradient(135deg,#0E5E6F,#3BB3C3)','linear-gradient(135deg,#7A4B12,#D6A23A)','linear-gradient(135deg,#1F5136,#4FA875)'];
function evCover(ev){const g=COVERS[[...ev.name].reduce((a,c)=>a+c.charCodeAt(0),0)%COVERS.length];
  return `<span class="cover" style="--cv:${g}">${ev.logo?`<img class="cv-bg" src="${ev.logo}" alt=""><img class="cv-fg" src="${ev.logo}" alt="">`:autoArt(ev)}</span>`}
/* things that need someone's attention today */
function attention(){const items=[];
  if(canBuy()&&crState()!=='ok')items.push({ic:'alert',tone:'bad',t:crState()==='zero'?'No message credits left':`Only ${S.wallet.credits} message credits left`,s:'WhatsApp & SMS receipts',act:'buy'});
  myEvents().forEach(e=>{const ms=S.moi.filter(m=>m.event_id===e.id),p=ms.filter(m=>m.status==='pending').length,c=ms.filter(m=>m.status==='tocollect').length,t=calc(e.id),dd=daysTo(e.date);
    if(p&&manages(e.id))items.push({ic:'shield',tone:'warn',t:`${p} UPI payment${p>1?'s':''} to verify`,s:e.name,go:`#ev-${e.id}-payments`});
    if(c)items.push({ic:'cash',tone:'warn',t:`${c} cash Moi to collect`,s:e.name,go:`#ev-${e.id}-${manages(e.id)?'payments':'list'}`});
    if(e.status==='active'&&dd>=0&&dd<=30)items.push({ic:'cal',tone:'good',t:dd===0?'Function is today':`Function in ${dd} day${dd>1?'s':''}`,s:e.name,go:`#ev-${e.id}-overview`});
    if(manages(e.id)&&t.vendorDue>0&&e.status!=='archived')items.push({ic:'bill',tone:'info',t:`${fmt(t.vendorDue)} still to pay vendors`,s:e.name,go:`#ev-${e.id}-expenses`});
    if(e.status==='draft'&&manages(e.id))items.push({ic:'edit',tone:'info',t:'Draft · finish setting up',s:e.name,go:`#ev-${e.id}-settings`})});
  myRem().filter(r=>r.status!=='done'&&daysTo(r.date)>=0&&daysTo(r.date)<=7).forEach(r=>items.push({ic:'undo',tone:'info',t:`Return Moi: ${r.title}`,s:`${remState(r)[0]}${r.amount?' · '+fmt(r.amount):''}`,go:'#reminders'}));
  return items}
function attnCard(){const a=attention();
  return `<section class="card pad dash-card"><div class="card-h"><h3 class="h-ic">${ic('bell',18)}Needs attention</h3>${a.length?`<span class="tag">${a.length}</span>`:''}</div>
  ${a.length?`<div class="attn">${a.slice(0,6).map(x=>`<button class="attn-i ${x.tone}" ${x.go?`data-go="${x.go}"`:`data-act="${x.act}"`}><span class="attn-ic">${ic(x.ic,16)}</span><span class="attn-t"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span>${ic('arrow',16)}</button>`).join('')}</div>`
  :`<div class="attn-ok">${ic('check',20)}<span>All clear. Nothing waiting for you.</span></div>`}</section>`}
function vDash(){
  const evs=myEvents(),adm=me.role==='admin';
  const all=evs.map(e=>calc(e.id)),sum=k=>all.reduce((s,t)=>s+(t[k]||0),0),net=sum('net');
  const now=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const hero=adm?`<section class="dash-hero">
      <div class="dh-main"><span class="dh-lbl">Net balance · all events</span><strong class="${net<0?'neg':''}">${fmt(net)}</strong><p>${fmt(sum('total'))} Moi − ${fmt(sum('expenses'))} expenses − ${fmt(sum('payouts'))} payouts${sum('gwFees')?` − ${fmt2(sum('gwFees'))} gateway fees`:''}</p></div>
      <div class="dh-stats">
        <div><span>Moi received</span><b>${fmt(sum('total'))}</b></div><div><span>Pending</span><b>${fmt(sum('pendingAmt'))}</b></div>
        <div><span>Gold &amp; gifts</span><b>${sum('goldG')?+sum('goldG').toFixed(2)+' g':'—'}</b></div><div><span>Entries</span><b>${sum('okN')}</b></div>
      </div></section>`
    :`<section class="dash-hero"><div class="dh-main"><span class="dh-lbl">Your events</span><strong>${evs.length}</strong><p>You can work only on the events assigned to you.</p></div>
      <div class="dh-stats"><div><span>Moi received</span><b>${fmt(sum('total'))}</b></div><div><span>Entries</span><b>${sum('okN')}</b></div></div></section>`;
  return `${annBanner()}${onboardCard()}<div class="dash-top"><div><p class="eyebrow">Hello, ${esc(first(me.name))}</p><h1>${adm?'Your events at a glance':'Select your event'}</h1><p class="sub">${now}</p></div>${adm?`<button class="btn btn-primary" data-act="evNew">${ic('plus')}Create Event</button>`:''}</div>
  ${hero}
  ${howtoCard()}
  <div class="dash-cols">${attnCard()}${remStrip()}</div>
  <section class="stack" style="gap:14px"><div class="ev-head"><h2>Events</h2>
    <div class="seg ev-seg" role="tablist">${[['','All'],['live','Live now'],['upcoming','Upcoming'],['completed','Completed'],['done','All done'],['draft','Draft'],['void','Void']].filter(([k])=>!k||k==='upcoming'||ui.dq.st===k||evs.some(e=>evPh(e)===k)).map(([k,l])=>{const n=k?evs.filter(e=>evPh(e)===k).length:evs.length;return `<button role="tab" class="${ui.dq.st===k?'on':''}" data-act="dqSt" data-k="${k}">${l} <span class="seg-n">${n}</span></button>`}).join('')}</div>
    <div class="filters ev-search"><div class="search">${ic('search',18)}<input class="inp" data-dq="q" placeholder="Search events" value="${esc(ui.dq.q)}" aria-label="Search events"></div></div></div>
    <div id="dashRows">${dashRows()}</div></section>`;
}
function dashRows(){
  const q=ui.dq.q.toLowerCase(),evs=myEvents().filter(e=>(!ui.dq.st||evPh(e)===ui.dq.st)&&(!q||(e.name+e.type+e.organizer+e.venue+(e.no||'')).toLowerCase().includes(q)));
  if(!evs.length)return `<div class="card">${emptyBox('No events match','Try another search, or create a new event.')}</div>`;
  return `<div class="evgrid">${evs.map(e=>{const t=calc(e.id),mg=manages(e.id),spent=t.expenses+t.payouts,pct=t.total?Math.min(100,Math.round(spent/t.total*100)):0;
    return `<article class="evc">
      <button class="evc-cv" data-go="#ev-${e.id}-overview" aria-label="Open ${esc(e.name)}">${evCover(e)}<span class="evc-st">${phChip(e)}</span>${!mg?`<span class="evc-role">${ROLE[roleIn(e.id)]}</span>`:''}</button>
      <div class="evc-b">
        <div><span class="evc-type">${esc(e.type)} · <span class="ev-no">${esc(e.no||'')}</span></span><h3>${esc(e.name)}</h3><p class="evc-m"><span>${ic('cal',14)}${dfmt(e.date)}</span><span>${ic('pin',14)}${esc(e.venue)}</span></p></div>
        ${mg?`<div class="evc-n"><div><span>Moi</span><b>${fmt(t.total)}</b></div><div><span>Spent</span><b>${fmt(spent)}</b></div><div><span>Balance</span><b class="${t.net<0?'neg':''}">${fmt(t.net)}</b></div></div>
        <div class="evc-bar" title="${pct}% of Moi spent"><i style="width:${pct}%"></i></div>`
        :`<div class="evc-n two"><div><span>Moi</span><b>${fmt(t.total)}</b></div><div><span>Entries</span><b>${t.okN}</b></div></div>`}
        <div class="evc-a"><button class="btn btn-primary btn-sm" data-go="#ev-${e.id}-overview">Open Event${ic('arrow',16)}</button>${mg?`<button class="icon-btn icon-sm" data-act="evEdit" data-id="${e.id}" aria-label="Edit event">${ic('edit',16)}</button><button class="icon-btn icon-sm" data-go="#ev-${e.id}-reports" aria-label="View report">${ic('chart',16)}</button>`:''}</div>
      </div></article>`}).join('')}</div>`;
}

/* ---------- event: overview ---------- */

function vOverview0(ev){
  const t=calc(ev.id),full=manages(ev.id),base=`#ev-${ev.id}-`;
  const recent=S.moi.filter(m=>m.event_id===ev.id).sort((a,b)=>b.created_at-a.created_at).slice(0,5);
  const q=[['receive','plus','Receive Moi','Add entry'],['list','list','Moi List','Mark returned'],['expenses','bill','Expense','Add cost'],['payouts','wallet','Payout','Urgent cash'],['qr','qr','Event QR','Guests scan']].filter(x=>can(ev.id,x[0])).slice(0,4);
  const tot=t.cash+t.upi+t.online||1,pc=v=>Math.round(v/tot*100);
  const cats={};S.expenses.filter(x=>x.event_id===ev.id).forEach(x=>cats[x.category]=(cats[x.category]||0)+ +x.amount);
  const cmax=Math.max(1,...Object.values(cats));
  return `<section class="hero-card ${ev.logo?'has-bg':''}">${ev.logo?`<figure class="hc-photo ${ev.logoT?'cut':''}"><img class="hc-blur" src="${ev.logo}" alt=""><img class="hc-img" src="${ev.logo}" alt="${esc(ev.name)}"></figure>`:''}<div><span class="hc-chip">${esc(ev.type)}</span> <span class="hc-chip ev-no">${esc(ev.no||'')}</span>${ev.status==='void'?' <span class="hc-chip" style="background:#B0263A">Void</span>':''}<h1>${esc(ev.name)}</h1>
      <div class="hc-meta"><span>${ic('cal',16)}${dfmt(ev.date)} · ${tfmt(ev.start)}–${tfmt(ev.end)}</span><span>${ic('pin',16)}${esc(ev.venue)}${ev.address?', '+esc(ev.address.split(',').slice(-2,-1)[0]||''):''}</span></div>
      <div class="hc-act"><button class="btn btn-white" data-go="${base}receive">${ic('plus',18)}Receive Moi</button><button class="btn btn-glass" data-go="${base}qr">${ic('qr',18)}Event QR</button>${manages(ev.id)&&ev.status!=='void'?`<button class="btn btn-glass" data-act="evEdit" data-id="${ev.id}">${ic('edit',18)}Edit event</button>`:''}</div></div>
    <div class="hc-fig"><span>${full?'Net balance':'Moi received'}</span><strong>${fmt(full?t.net:t.total)}</strong><small>${full?`${fmt(t.total)} Moi − ${fmt(t.expenses)} expenses − ${fmt(t.payouts)} payouts${t.gwFees?` − ${fmt2(t.gwFees)} gateway fees`:''}`:`${t.contributors} contributors so far`}</small></div></section>
  <div class="quick">${q.map(x=>`<button data-go="${base}${x[0]}"><i>${ic(x[1],24)}</i><b>${x[2]}<small>${x[3]}</small></b></button>`).join('')}</div>
  ${full?msgStatus(ev):''}
  <div class="tiles ${full?'':'t3'}">
    ${tile('Total Moi Received',fmt(t.total),t.okN+' entries','wallet')}${tile('Cash Received',fmt(t.cash),'','cash','--tint-amber')}${tile('Offline UPI Received',fmt(t.upi),'Verified only','phone','--tint-cyan')}
    ${tile('Online Payment Received',fmt(t.online),'','zap','--tint-rose')}
    ${full?tile('Total Expenses',fmt(t.expenses),'','bill','--tint-amber')+tile('Returned by us',fmt(t.returns),t.returnedN+' people · not deducted','undo','--tint-rose')+tile('Payouts taken',fmt(t.payouts),t.payoutN+' payouts','wallet','--tint-rose')+tile('Cash at Moi counter',fmt(t.cashAtCounter),'Cash in − cash out','cash','--tint-amber',t.cashAtCounter<0)+tile('To pay vendors',fmt(t.vendorDue),'Bill balance','clock','--tint-amber')+tile('Net Amount',fmt(t.net),'','chart','--tint-cyan',t.net<0):''}
    ${tile('Contributors',t.contributors,'','users')}${tile('Pending Entries',t.pendingN,fmt(t.pendingAmt)+' waiting','clock','--tint-rose')}
  </div>
  ${t.itemN?`<section class="card pad"><div class="card-h"><h3 class="h-ic">${ic('gold',18)}Gold, silver &amp; gifts</h3><button class="link" data-act="itemsList">See all</button></div>
    <div class="gift-sum">${t.goldG?`<span><b>${+t.goldG.toFixed(2)} g</b>Gold</span>`:''}${t.silverG?`<span><b>${+t.silverG.toFixed(2)} g</b>Silver</span>`:''}${t.giftN?`<span><b>${t.giftN}</b>Gift items</span>`:''}${t.otherN?`<span><b>${t.otherN}</b>Other items</span>`:''}${t.itemEst?`<span><b>${fmt(t.itemEst)}</b>Estimated value</span>`:''}</div>
    <div class="gift-rows">${S.moi.filter(m=>m.event_id===ev.id&&isItem(m)).sort((a,b)=>b.created_at-a.created_at).slice(0,4).map(m=>`<button class="row-card" data-act="moiView" data-id="${m.id}">${m.gift&&m.gift.photo?`<img class="shot-thumb" src="${m.gift.photo}" alt="">`:`<span class="tile-ic" style="margin:0">${ic(KINDI[m.kind],18)}</span>`}<div class="rc-main"><b>${esc(itemTxt(m))}</b><small>${esc(m.c.name)}${m.est?' · est. '+fmt(m.est):''}</small></div></button>`).join('')}</div>
    <p class="small muted" style="margin-top:10px">Kept separately. Not added to the cash total or net balance.</p></section>`:''}
  <div class="split">
    <section class="card pad"><div class="card-h"><h3>How Moi came in</h3></div>
      <div class="mix" role="img" aria-label="Payment mode split"><span style="width:${pc(t.cash)}%;background:var(--m-cash)"></span><span style="width:${pc(t.upi)}%;background:var(--m-upi)"></span><span style="width:${pc(t.online)}%;background:var(--m-online)"></span></div>
      <div class="legend"><div><i style="background:var(--m-cash)"></i>Cash<b>${fmt(t.cash)}</b><small>${pc(t.cash)}%</small></div><div><i style="background:var(--m-upi)"></i>Offline UPI<b>${fmt(t.upi)}</b><small>${pc(t.upi)}%</small></div><div><i style="background:var(--m-online)"></i>Online Payment<b>${fmt(t.online)}</b><small>${pc(t.online)}%</small></div></div>
      ${full&&Object.keys(cats).length?`<div class="card-h" style="margin-top:26px"><h3>Expenses by category</h3></div><div class="bars">${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar-r"><span>${k}</span><div class="t"><span style="width:${v/cmax*100}%"></span></div><b>${fmt(v)}</b></div>`).join('')}</div>`:''}
    </section>
    <section class="card pad"><div class="card-h"><h3>Recent Moi</h3><button class="link" data-go="${base}list">See all</button></div>
      ${recent.length?`<div class="rows">${recent.map(moiRow).join('')}</div>`:emptyBox('No Moi yet','Entries appear here as soon as they are recorded.',`<button class="btn btn-primary btn-sm" data-go="${base}receive">Receive first Moi</button>`)}
    </section>
  </div>`;
}
const moiRow=m=>`<button class="row-card ${rowTone(m)}" data-act="moiView" data-id="${m.id}"><span class="avatar ${avc(m.c.name)}">${ini(m.c.name)}</span><div class="rc-main"><b>${esc(UN(m.c.name))}</b><small>${esc(m.c.relationship||'—')} · ${esc(m.c.place||'—')}</small></div><div class="rc-end"><span class="rc-amt">${esc(amtTxt(m))}</span>${feeLine(m)}<span class="tag">${ic(MODEI[m.mode],13)}${MODE[m.mode]}</span></div></button>`;
