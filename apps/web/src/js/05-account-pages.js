/* ---------- V42: Moi Book PDF on WhatsApp when the function ends ---------- */
const evEndAt=ev=>{const t=ev.end||ev.start||'23:59',d=new Date(ev.date+'T'+(t.length===5?t:'23:59')+':00');if(ev.start&&ev.end&&ev.end<ev.start)d.setDate(d.getDate()+1);return d.getTime()};
function sendBook(ev,again){const A=accOfEv(ev),ow=A&&S.users.find(u=>u.id===A.owner),to=ev.orgMobile||(ow&&ow.mobile)||'',em=bookEmail(ev);if(!to&&!em)return false;const n=S.moi.filter(m=>m.event_id===ev.id&&m.status!=='void').length,t=calc(ev.id);
  const file=`MoiBook-${String(ev.no||ev.id).replace(/\W/g,'')}.pdf`;
  S.notifications.push({id:uid('n'),eid:ev.id,channel:'WhatsApp',to,text:`Your Moi Book for ${ev.name} is ready: ${n} entries, total ${fmt(t.total)}. PDF attached.`,status:online()?'Sent':WAITING,at:Date.now(),attach:file});
  S.notifications.push({id:uid('n'),owner:A&&A.owner,channel:'In app',to:'You',text:`Moi Book PDF for ${ev.name} sent to WhatsApp +91 ${String(to).slice(0,5)} ${String(to).slice(5)}.`,status:'Sent',at:Date.now()});
  ev.bookSent={at:Date.now(),to,file,n,again:!!again,email:em};if(em)S.notifications.push({id:uid('n'),eid:ev.id,channel:'Email',to:em,text:`Your Moi Book for ${ev.name}: ${n} entries, total ${fmt(t.total)}. PDF attached.`,status:online()?'Sent':WAITING,at:Date.now(),attach:file});platMsg('moibook',1,ev.no||ev.id);log(ev.id,again?'Moi Book sent again':'Moi Book sent on WhatsApp',file);return true}
let lastBookCheck=0;
function autoBooks(){if(Date.now()-lastBookCheck<20000)return;lastBookCheck=Date.now();if((P().autoBook||{}).off)return;let n=0;
  S.events.forEach(ev=>{if(ev.bookSent||ev.status==='void'||ev.status==='draft'||!ev.date)return;if(Date.now()<evEndAt(ev))return;if(!S.moi.some(m=>m.event_id===ev.id))return;if(sendBook(ev))n++});if(n)save()}
function bookCard(ev){const b=ev.bookSent;if(!b)return Date.now()<evEndAt(ev)&&ev.status!=='void'?`<div class="note info book-note">${ic('bill',20)}<div><b>Moi Book on WhatsApp and email</b><p>When the function ends (${dfmt(ev.date)}, ${tfmt(ev.end||'23:59')}), the full Moi Book PDF is sent to ${esc(ev.organizer||'the organiser')} on WhatsApp${bookEmail(ev)?' and to '+esc(bookEmail(ev)):''} by itself.</p><div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-act="bookMail" data-id="${ev.id}">${ic('mail',16)}See the email</button></div></div></div>`:'';
  return `<div class="note good book-note">${ic('check',20)}<div><b>Moi Book PDF sent on WhatsApp${b.email?' and email':''}</b><p>${esc(b.file)} · ${b.n} entries · to +91 ${esc(String(b.to).slice(0,5)+' '+String(b.to).slice(5))}${b.email?' · '+esc(b.email):''} · ${new Date(b.at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</p><div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-act="bkOpen">${ic('bill',16)}Open Moi Book</button><button class="btn btn-ghost btn-sm" data-act="bookMail" data-id="${ev.id}">${ic('mail',16)}See the email</button>${manages(ev.id)?`<button class="btn btn-ghost btn-sm" data-act="bookAgain" data-id="${ev.id}">${ic('msg',16)}Send again</button>`:''}</div></div></div>`}
/* ---------- V42: "Other" function type and relationship with saved suggestions ---------- */
function ctypesFor(A){const own=(A&&A.ctypes)||[];return [...TYPES.filter(t=>t!=='Other'),...own.filter(t=>!TYPES.includes(t)),'Other']}
function crelsFor(A){const own=(A&&A.crels)||[];return [...RELS.filter(t=>t!=='Other'),...own.filter(t=>!RELS.includes(t)),'Other']}
function otherBox(id,kind,show){const M=(P()[kind==='ctype'?'ctypes':'crels'])||{},L=Object.entries(M).sort((a,b)=>b[1]-a[1]).slice(0,40).map(x=>x[0]);
  return `<label class="field other-box full" id="${id}_ow" ${show?'':'hidden'}><span>${kind==='ctype'?'Which function? Type it':'Which relation? Type it'} <i>*</i></span><input id="${id}_o" list="dl_${kind}" autocomplete="off" placeholder="${kind==='ctype'?'e.g. Seemantham, Upanayanam, Shashtiapthapoorthi':'e.g. Co-brother, Sambandhi, Teacher'}"><small class="muted">${L.length?'Start typing to pick one others have used.':'It is saved for next time.'}</small></label><datalist id="dl_${kind}">${L.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`}
function saveCustom(kind,val,A){val=String(val||'').trim();if(!val)return;const base=kind==='ctype'?TYPES:RELS;if(base.includes(val))return;const M=P()[kind==='ctype'?'ctypes':'crels']=P()[kind==='ctype'?'ctypes':'crels']||{};
  const k=Object.keys(M).find(x=>x.toLowerCase()===val.toLowerCase())||val;M[k]=(M[k]||0)+1;if(A){const L=A[kind==='ctype'?'ctypes':'crels']=A[kind==='ctype'?'ctypes':'crels']||[];if(!L.some(x=>x.toLowerCase()===k.toLowerCase()))L.push(k)}}
/* ---------- V42: light / dark screens ---------- */
const THK='moipoint-theme';const themeGet=()=>{try{return localStorage.getItem(THK)||'light'}catch(e){return 'light'}};
function themeApply(h){const pub=['home','how','contact','login','signup','forgot','pricing'].includes(h)||/^(blog|reset-|pay-|r\/)/.test(h)||/^EV\d/.test(h);document.documentElement.dataset.theme=pub?'light':themeGet()}
const themeChip=()=>`<button type="button" class="lang-chip theme-chip" data-act="theme" aria-label="${themeGet()==='dark'?'Switch to light screens':'Switch to dark screens'}" title="${themeGet()==='dark'?'Light screens':'Dark screens'}">${ic(themeGet()==='dark'?'sun':'moon',16)}</button>`;
/* ---------- V42: guest QR page: cash and offline UPI are not complete until the counter confirms ---------- */
const QRV={en:{c:n=>`Thank you. Your Moi is not complete yet. Please pay at the Moi counter and show number ${n}.`,u:n=>`Thank you. Please show your UPI payment at the Moi counter so they can check it. Number ${n}.`},
 ta:{c:n=>`நன்றி. உங்கள் மொய் இன்னும் முழுமையாகவில்லை. மொய் கவுண்டரில் பணம் கொடுத்து ${n} எண்ணைக் காட்டுங்கள்.`,u:n=>`நன்றி. உங்கள் UPI கட்டணத்தை மொய் கவுண்டரில் காட்டி சரிபார்த்துக்கொள்ளுங்கள். எண் ${n}.`},
 hi:{c:n=>`धन्यवाद। आपका मोई अभी पूरा नहीं हुआ है। कृपया मोई काउंटर पर भुगतान करें और नंबर ${n} दिखाएँ।`,u:n=>`धन्यवाद। कृपया मोई काउंटर पर अपना UPI भुगतान दिखाकर जाँच करवाएँ। नंबर ${n}।`}};
const qrSpoken=new Set();
function qrSpeak(ev,m){if(qrSpoken.has(m.id)||!['tocollect','pending'].includes(m.status))return;qrSpoken.add(m.id);const lg=QRV[evLang(ev)]?evLang(ev):'en',n=String(m.code).split('').join(' ');
  try{speakTone='warm';speakLines([[lg,(m.status==='tocollect'?QRV[lg].c:QRV[lg].u)(n)]])}catch(e){}}
function qrWarnTop(ev,m){if(!['tocollect','pending'].includes(m.status))return '';setTimeout(()=>qrSpeak(ev,m),500);
  return `<div class="qr-topbar" role="status">${ic('alert',18)}<b>${m.status==='tocollect'?'Not complete yet · pay at the Moi counter':'Not complete yet · show your UPI payment at the counter'}</b><span class="code">${esc(m.code)}</span></div><div class="qr-warn" role="alert">${ic('alert',22)}<div><b>${m.status==='tocollect'?'Not complete yet · pay at the Moi counter':'Not complete yet · show your UPI payment at the counter'}</b><span>${m.status==='tocollect'?'Your Moi counts only after you pay the cash at the counter.':'The family checks your UPI payment at the counter, then your receipt comes on WhatsApp.'} No. <b class="code">${esc(m.code)}</b></span></div><button type="button" class="icon-btn" data-act="qrSay" data-id="${m.id}" aria-label="Hear this again">${ic('speaker',18)}</button></div>`}


/* ---------- V44: my profile ---------- */
function vProfile(){const u=me,A=myAcc(),own=u.role==='admin',hasPw=!!u.pwHint,ph=imgBuf.pf_photo!==undefined?imgBuf.pf_photo:u.photo;
  return `<div class="page-head"><div><h1>My profile</h1><p class="sub">Your name, photo, login and ${own?'account details':'password'}.</p></div></div>
  <div class="pf-grid">
   <section class="card pad pf-id"><div class="pf-av"><label class="avatar huge" id="prev-pf_photo" for="pf_photo">${ph?`<img src="${ph}" alt="Profile photo">`:esc(ini(u.name))}</label><label class="pf-cam" for="pf_photo" aria-label="Change photo">${ic('upload',16)}</label><input type="file" id="pf_photo" accept="image/*" data-img="pf_photo" hidden></div>
    <h2>${esc(u.name)}</h2><p class="muted">${esc(own?'Account owner':ROLE[u.role]||'')}${A?' · '+esc(A.name):''}</p>
    <div class="pf-tags">${u.mobile?`<span>${ic('phone',14)}+91 ${esc(fmtMob(u.mobile))} <b class="pf-ok">${ic('check',12)}Verified</b></span>`:''}${u.email?`<span>${ic('mail',14)}${esc(u.email)}</span>`:''}${A?`<span>${ic('grid',14)}${esc(A.id)}</span>`:''}</div>
    ${ph&&u.photo?`<button type="button" class="link" data-act="pfPhotoDel">Remove photo</button>`:''}</section>
   <div class="stack" style="gap:16px">
    <form class="card pad stack" style="gap:14px" data-form="pfSave" novalidate><div class="card-h"><h3>${ic('user',18)} Personal details</h3></div><div class="fields">
      ${fld('Your name','pf_name','text',true,u.name,'autocomplete="name"','full')}
      ${own?fld('Email (used to log in)','pf_email','email',true,u.email||'','autocomplete="email"','full'):`<label class="field full"><span>Email (used to log in)</span><div class="pf-ro">${ic('mail',16)}${esc(u.email||'—')}<small>Set by your event owner.</small></div></label>`}
      <label class="field full"><span>Mobile</span><div class="pf-ro">${ic('phone',16)}+91 ${esc(fmtMob(u.mobile||''))}<small>Verified at sign-up. To change it, contact Moi Point support.</small></div></label></div>
      <div class="btn-row"><button class="btn btn-primary">${ic('check',16)}Save details</button></div></form>
    ${own&&A?`<form class="card pad stack" style="gap:14px" data-form="pfAcc" novalidate><div class="card-h"><h3>${ic('grid',18)} Account details</h3><span class="tag">${esc(A.id)}</span></div><div class="fields">
      ${fld('Account / business name','pa_name','text',true,A.name,'','full')}
      ${sel('Type','pa_kind',[['Family','Family'],['Event business','Event business']],A.kind||'Family')}${sel('State','pa_state',STATES,A.state||'Tamil Nadu')}
      ${fld('District','pa_dist','text',true,A.district||'')}${fld('City / town','pa_city','text',true,A.city||'')}</div>
      <div class="btn-row"><button class="btn btn-primary">${ic('check',16)}Save account</button></div></form>`:''}
    ${u.role==='admin'?`<form class="card pad stack" style="gap:14px" data-form="pfPw" novalidate><div class="card-h"><h3>${ic('lock',18)} ${hasPw?'Change password':'Set a password'}</h3></div><div class="fields">
      ${hasPw?`<div class="pf-cur full">${ic('lock',16)}<span>Your current password</span><b class="code" data-noi18n>${esc(pwHintTxt(u))}</b><small>For your safety only the first 2 and last 2 letters are shown. Type the full password below to change it.</small></div>`+pwFld('Current password','pp_cur','current-password'):''}${pwFld('New password','su_pw','new-password','8+ letters with a number')}${pwFld('Confirm new password','pp_pw2','new-password')}
      <div class="pw-meter full" id="pwMeter"><i></i><span>Use 8 or more characters with letters and numbers</span></div></div>
      <div class="btn-row"><button class="btn btn-primary">${ic('lock',16)}${hasPw?'Change password':'Set password'}</button></div></form>`:helperPwNote(u)}
    <section class="card pad"><div class="card-h"><h3>${ic('sliders',18)} Preferences</h3></div><div class="pf-prefs"><button type="button" class="pf-pref" data-act="uiLang">${ic('globe',18)}<span><b>App language</b><small>${esc((UILANGS.find(x=>x[0]===UIL)||['','English'])[1])}</small></span>${ic('arrow',16)}</button><button type="button" class="pf-pref" data-act="theme">${ic(themeGet()==='dark'?'sun':'moon',18)}<span><b>Screens</b><small>${themeGet()==='dark'?'Dark':'Light'}</small></span>${ic('arrow',16)}</button>${me&&realMe().role==='admin'&&helperAs(realMe()).length?`<button type="button" class="pf-pref" data-act="ctxSwitch">${ic('users',18)}<span><b>Switch role</b><small>${me.__ctx?'Now working as a helper':'Now working as the event owner'}</small></span>${ic('arrow',16)}</button>`:''}<button type="button" class="pf-pref danger" data-act="logout">${ic('logout',18)}<span><b>Log out</b><small>On this device</small></span>${ic('arrow',16)}</button></div></section>
   </div></div>`}
function loginAs(u,remember){
  if(u.status!=='active')return toast('This login is disabled. Ask the admin to enable it.','bad');
  if(u.role!=='platform'&&accById(u.acc)&&accById(u.acc).status==='suspended')return toast('This account is paused by Moi Point. Call support to reopen it.','bad');
  if(u.role!=='platform'&&u.role!=='admin'&&!accessOk(u))return toast('Your access to these events has ended. Ask the event owner to extend it.','bad');
  ctxSet('');me=u;try{(remember?localStorage:sessionStorage).setItem(SK,u.id)}catch(e){}AUTH.step='mobile';AUTH.code='';
  log(null,'Logged in',u.name);save();toast('Welcome, '+first(u.name));go(u.role==='platform'?'admin':'dashboard');if(u.role==='admin'&&helperAs(u).length)setTimeout(()=>ctxModal(u),500)}

/* ---------- plan & usage (account owner) ---------- */
function meter(label,used,limit,unit){const L=lim(limit),pc=L===Infinity?0:Math.min(100,used/L*100);
  return `<div class="meter ${pc>=100?'bad':pc>=80?'warn':''}"><div class="row-between"><span>${label}</span><b>${cr(used)}${L===Infinity?' · unlimited':' of '+cr(limit)}${unit?' '+unit:''}</b></div><div class="mbar"><i style="width:${L===Infinity?6:pc}%"></i></div></div>`}
function vPlan(){const A=myAcc(),pl=planOf(A),st=subState(A),sb=A.sub,dl=daysLeft(sb.end),chg=planCharges(),y=+pl.yearly||0,free=sb.period==='free';
  const feats=FEATS.filter(([k])=>k!=='brand'&&pl.feat[k]);
  return `<div class="page-head"><div><h1>Plan &amp; usage</h1><p class="sub">Moi Point is free. Buy message credits only if you want receipts and reminders sent on WhatsApp or SMS.</p></div></div>
  ${st==='expired'?`<div class="note bad">${ic('alert',20)}<div><b>Your plan ended on ${dfmt(sb.end)}</b><p>Your events, Moi records and reminders are safe. Pay ${fmt(y)} for one year to open them again.</p></div><button class="btn btn-primary btn-sm" data-act="planSwitch" data-k="free">Pay ${fmt(y)}</button></div>`
   :st==='expiring'?`<div class="note warn">${ic('alert',20)}<div><b>Your free period ends in ${dl} day${dl===1?'':'s'} (${dfmt(sb.end)})</b><p>After that the plan is ${fmt(y)} a year. Pay now so your records stay open without a break.</p></div><button class="btn btn-primary btn-sm" data-act="planSwitch" data-k="free">Pay ${fmt(y)}</button></div>`:''}
  <div class="split"><section class="card pad stack" style="gap:14px"><div class="row-between"><div><span class="lbl">Your plan</span><h2 style="margin-top:4px">${esc(pl.name)}</h2><p class="small muted">${free?'Since '+dfmt(sb.start):`Paid · ${dfmt(sb.start)} – ${dfmt(sb.end)}`}</p></div><span class="plan-price">₹0<small> · Free</small></span></div>
    <ul class="featlist"><li class="yes">${ic('check',16)}Unlimited events</li><li class="yes">${ic('check',16)}Unlimited Moi entries</li><li class="yes">${ic('check',16)}Unlimited helpers (collectors and event admins)</li>${feats.map(([,l])=>`<li class="yes">${ic('check',16)}${l}</li>`).join('')}</ul>
    ${chg?`<p class="small muted plan-hint">${ic('info',14)} ${free?`From ${dfmt(addDays(sb.end,1))}`:`After ${dfmt(sb.end)}`}, the plan is ${fmt(y)} a year.${st==='active'&&(!free||dl<=60)?` <button class="link" data-act="planSwitch" data-k="free">Pay now</button>`:''}</p>`:''}</section>
  <section class="card pad stack" style="gap:12px"><div class="card-h"><h3>Message charges</h3></div><p class="plan-price">${fmt(RATE())}<small> per message</small></p><p class="small muted">Same price for WhatsApp and SMS, GST included. Buy credits only if you want receipts and reminders sent.</p><p class="small">You have <b>${cr(A.wallet.credits)}</b> credits.</p>${canBuy()&&st!=='expired'?`<button class="btn btn-primary btn-sm" style="align-self:flex-start" data-go="#credits">Buy message credits</button>`:''}</section></div>
  ${(P().subs||[]).filter(x=>x.acc===A.id).length?`<section class="card pad"><div class="card-h"><h3>Plan history</h3></div><div class="rows">${P().subs.filter(x=>x.acc===A.id).slice().reverse().map(x=>`<div class="row-card" style="cursor:default"><span class="tile-ic" style="margin:0">${ic('card',18)}</span><div class="rc-main"><b>${esc(x.kind||'Changed')} · ${esc(P().plans[x.from].name)} → ${esc(P().plans[x.to].name)}</b><small>${x.start?dfmt(x.start)+' – '+dfmt(x.end):new Date(x.at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}${x.by?' · by '+esc(x.by):''}</small></div><span class="rc-amt">${x.amount?fmt(x.amount):'₹0'}</span></div>`).join('')}</div></section>`:''}`}
function applyPlan(k,amount,by,period){const A=myAcc(),from=A.plan;startPlan(A,k,amount,by||me.name,period||(k==='free'?'free':'year'));log(null,'Plan changed',`${P().plans[from].name} → ${P().plans[k].name}${amount?' · '+fmt(amount):''}`);grantMonthly(A);save();closeModal();toast(`You are on the ${P().plans[k].name} plan till ${dfmt(A.sub.end)}`);render()}

/* ---------- help & support: tickets go to the Moi Point support inbox ---------- */
const TCATS=['How to','Payment or credits','Bug or error','Plan and billing','Other'];
const myTickets=()=>P().tickets.filter(t=>t.acc===me.acc&&(me.role==='admin'||t.user===me.id));
const tkPill=t=>t.status==='open'?'<span class="pill warn">Waiting for Moi Point</span>':t.status==='answered'?'<span class="pill info">Moi Point replied</span>':'<span class="pill mute">Closed</span>';
function vHelp(){const ts=myTickets().slice().sort((a,b)=>b.at-a.at),pr=feat('support');
  return `<div class="page-head"><div><h1>Help &amp; support</h1><p class="sub">Ask the Moi Point team anything. Replies show here and in your notifications.</p></div></div>
  <div class="split"><form class="card pad stack" style="gap:14px" data-form="ticket"><h3>New question</h3>
    <div class="fields">${sel('Topic','tk_cat',TCATS,'How to')}${fld('Subject','tk_sub','text',true,'','placeholder="e.g. Receipt not sent on WhatsApp"')}${area('Tell us more','tk_msg','')}</div>
    <button class="btn btn-primary">Send to support</button></form>
  <section class="card pad stack" style="gap:12px"><div class="note ${pr?'good':'info'}">${ic(pr?'phone':'msg',20)}<div><b>${pr?'Priority phone support':'WhatsApp support'}</b><p>${pr?'Your plan includes priority support. Call 98400 12345, 8 AM to 10 PM, every day including function days.':'We reply within one working day. Priority phone support comes with Silver and Gold plans.'}</p></div></div>
    <h3>Your questions</h3>${ts.length?`<div class="rows">${ts.map(t=>`<button class="row-card" data-act="tkOpen" data-id="${t.id}"><span class="tile-ic" style="margin:0">${ic('msg',18)}</span><div class="rc-main"><b>${esc(t.subject)}</b><small>${esc(t.cat)} · ${new Date(t.at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} · ${t.msgs.length} message${t.msgs.length>1?'s':''}</small></div>${tkPill(t)}</button>`).join('')}</div>`:'<p class="muted small">No questions yet.</p>'}</section></div>`}
function tkModal(id){const t=P().tickets.find(x=>x.id===id);if(!t)return;
  openModal(`${mh(esc(t.subject),esc(t.cat)+' · '+t.id)}<div class="md-b"><div class="thread">${t.msgs.map(m=>`<div class="msg ${m.from}"><b>${esc(m.name)}</b><p>${esc(m.text)}</p><small>${new Date(m.at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'})}</small></div>`).join('')}</div>
  ${t.status!=='closed'?`<form data-form="tkReply" data-id="${t.id}" class="stack" style="gap:10px">${area('Reply','tr_msg','')}<div class="btn-row"><button class="btn btn-primary btn-sm">Send reply</button><button type="button" class="btn btn-ghost btn-sm" data-act="tkClose" data-id="${t.id}">Mark solved</button></div></form>`:'<p class="small muted">This question is closed.</p>'}</div>`)}

/* ---------- announcements from Moi Point ---------- */
function annList(){const A=myAcc();if(!A)return [];const hid=me.dismissed||[];
  return P().announcements.filter(a=>a.on&&!hid.includes(a.id)&&(a.aud==='all'||a.aud==='plan:'+A.plan||a.aud==='city:'+A.city||(a.aud==='owners'&&me.role==='admin')))}
function annMedia(a){if(!a)return '';const L=a.vid||a.url;return `${a.img?`<img class="ann-img" src="${a.img}" alt="">`:''}${L?`<div class="ann-links">${a.vid?`<a class="btn btn-ghost btn-sm" href="${esc(a.vid)}" target="_blank" rel="noopener">▶ Watch video</a>`:''}${a.url?`<a class="btn btn-primary btn-sm" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.btn||'Learn more')}</a>`:''}</div>`:''}`}
function annBanner(){return annList().map(a=>`<div class="note ${a.tone||'info'} ann">${ic('bell',20)}<div style="flex:1;min-width:0"><b>${esc(a.title)}</b><p>${esc(a.text)}</p>${annMedia(a)}</div><button class="icon-btn icon-sm" data-act="annHide" data-id="${a.id}" aria-label="Hide this message">${ic('x',16)}</button></div>`).join('')}

/* ---------- first-steps checklist for new accounts ---------- */
function onboardSteps(){const A=myAcc(),evs=accEvents(),ids=new Set(evs.map(e=>e.id));
  return [['Create your account',true,''],['Create your first event',evs.length>0,'evNew'],['Set how you receive Moi (UPI or cash)',evs.some(e=>e.modes||e.upi||(e.upis&&e.upis.length)),evs[0]?'#ev-'+evs[0].id+'-payments':'evNew'],
    ['Add a helper or choose to collect yourself',S.eventUsers.some(a=>ids.has(a.event_id))||!!A.onboard.self,evs[0]?'#ev-'+evs[0].id+'-users':'evNew'],['Record your first Moi',S.moi.some(m=>ids.has(m.event_id)),evs[0]?'#ev-'+evs[0].id+'-receive':'evNew'],
    ['Turn on WhatsApp receipts',evs.some(e=>e.notify&&(e.notify.wa||e.notify.sms)),evs[0]?'#ev-'+evs[0].id+'-settings':'evNew']]}
function onboardCard(){if(!me||me.role!=='admin')return '';const A=myAcc();if(A.onboard.hide)return '';const st=onboardSteps(),done=st.filter(x=>x[1]).length;if(done===st.length)return '';
  return `<section class="card pad onboard"><div class="row-between"><div><span class="lbl">Getting started</span><h3 style="margin-top:4px">${done} of ${st.length} done</h3></div><button class="link small" data-act="obHide">Hide</button></div>
  <div class="mbar" style="margin:10px 0 12px"><i style="width:${done/st.length*100}%"></i></div>
  <div class="ob-list">${st.map(([t,ok,go])=>`<div class="ob-i ${ok?'ok':''}">${ic(ok?'check':'arrow',16)}<span>${t}</span>${ok?'':go.startsWith('#')?`<button class="link small" data-go="${go}">Do it</button>`:`<button class="link small" data-act="${go}">Do it</button>`}</div>`).join('')}</div></section>`}

/* ---------- support view: Moi Point staff inside a customer's app ---------- */
const impBy=()=>{try{return sessionStorage.getItem('mp-imp')}catch(e){return null}};
function impBar(){const id=impBy();if(!id||!me||me.role==='platform')return '';return `<div class="imp-bar">${ic('shield',18)}<span>Support view of <b>${esc(myAcc()?myAcc().name:'')}</b>. Everything you do is logged.</span><button class="btn btn-white btn-sm" data-act="impExit">Back to Master Admin</button></div>`}
