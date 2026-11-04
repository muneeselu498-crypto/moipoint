/* ---------- settings ---------- */
/* ---------- receipt formats the family can choose (the guest gets this look) ---------- */
const RFORMATS=[['ticket','Ticket','Colourful ticket with photo, QR and every detail'],['royal','Royal','Deep maroon with gold foil, monogram and seal'],['temple','Kolam','Cream paper, temple arch and kolam corners'],['classic','Heritage bill','Old bill-book style with stamp and amount in words'],['elegant','Elegant','White and gold, wedding-card serif type'],['festive','Festive','Marigold garland and mango-leaf thoranam'],['compact','Modern card','Small, bold card that reads well on a phone'],['slip','Counter slip','Narrow black-and-white slip like a shop bill']];
const rfmtOf=ev=>(ev&&ev.rformat)||'ticket';
const monoOf=s=>String(s||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>[...w][0]).join('').toUpperCase()||'M';
function inWords(n){n=Math.round(+n||0);if(!n)return 'Zero';const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=x=>x<20?a[x]:b[Math.floor(x/10)]+(x%10?' '+a[x%10]:''),three=x=>(x>=100?a[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?two(x%100):'');
  const parts=[[1e7,'Crore'],[1e5,'Lakh'],[1e3,'Thousand']];let out=[];for(const [v,l] of parts){if(n>=v){out.push(three(Math.floor(n/v))+' '+l);n%=v}}if(n)out.push(three(n));return out.join(' ')}
function rcptHtml(m,lg,fk,notch){const ev=S.events.find(e=>e.id===m.event_id);fk=fk||rfmtOf(ev);lg=lg||evLang(ev);
  if(fk==='ticket')return ticketHtml(m,lg,notch);
  if(fk==='slip')return `<div class="rc-slip-wrap">${thermalHtml(m,lg,'80')}</div>`;
  const L=k=>esc(trT(lg,k)),la=lg==='en'?'en':lg.slice(0,2),item=isItem(m),amt=esc(amtTxt(m,lg)),from=esc(nm(m,lg)),rel=esc(relT(m.c.relationship,lg)),place=esc(plc(m.c.place,lg));
  const st=STATUS[m.status]||['',''],stT=esc(statT(lg,m.status)),mode=esc(modeT(lg,m.mode)),when=`${dfmt(m.date)}, ${tfmt(m.time)}`,thx=tr(lg,'thanks').map(esc);
  const photo=ev.logo&&feat('logo',ev)?`<img class="rx-photo ${ev.logoT?'cut':''}" src="${ev.logo}" alt="">`:'',mono=`<span class="rx-mono" aria-hidden="true">${esc(monoOf(ev.name))}</span>`;
  const brand=feat('brand',ev)?'':`<p class="rx-brand"><span class="rx-bm">${mpMark()}</span> Moi Point · moipoint.in</p>`;
  const qr=n=>`<div class="qr-box" data-qr="https://moipoint.in/r/${m.code}" data-size="${n||72}"></div>`;
  const row=(k,v)=>v?`<div class="rx-r"><dt>${L(k)}</dt><dd>${v}</dd></div>`:'';
  const rows=`${row('from',`<b>${from}</b>`)}${row('rel',rel)}${row('place',place)}${row('mobile',esc(m.c.mobile))}${row('payment',mode)}${row('received',when)}${row('by',esc(byWho(m)))}`;
  const evLine=`${esc(ev.type)} · ${dfmt(ev.date)}`,venue=esc([ev.venue,ev.address].filter(Boolean).join(', '));
  const words=!item&&lg==='en'?`<p class="rx-words">Rupees ${inWords(m.amount)} only</p>`:'';
  const voidMark=m.status==='void'?`<span class="rx-void">${stT}</span>`:'';
  if(fk==='royal')return `<article class="rx rx-royal" lang="${la}">${voidMark}<div class="rx-frame">
    <header class="rx-h">${photo||mono}<p class="rx-k">${L('title')}</p><h3>${esc(ev.name)}</h3><p class="rx-sub">${evLine}</p><p class="rx-sub">${venue}</p></header>
    <div class="rx-orn" aria-hidden="true"><i></i><b>✦</b><i></i></div>
    <div class="rx-seal"><span>${item?L('kind'):L('amount')}</span><strong>${amt}</strong>${words}</div>
    <dl class="rx-dl">${rows}</dl>
    <footer class="rx-f"><div><span class="rx-k">${L('no')}</span><b class="rx-code">${m.code}</b><span class="rx-st ${st[1]}">${stT}</span></div>${qr(70)}</footer>
    <p class="rx-thx">${thx.join('<br>')}</p>${ev.organizer?`<p class="rx-sign">${esc(ev.organizer)}</p>`:''}${brand}</div></article>`;
  if(fk==='temple')return `<article class="rx rx-temple" lang="${la}">${voidMark}<i class="rx-kc tl"></i><i class="rx-kc tr"></i><i class="rx-kc bl"></i><i class="rx-kc br"></i>
    <header class="rx-arch">${photo||`<span class="rx-lamp" aria-hidden="true"></span>`}<p class="rx-k">${L('title')}</p><h3>${esc(ev.name)}</h3><p class="rx-sub">${evLine} · ${venue}</p></header>
    <div class="rx-ribbon"><span>${item?L('kind'):L('amount')}</span><strong>${amt}</strong></div>${words}
    <dl class="rx-dl rx-dots">${rows}</dl>
    <footer class="rx-f"><div><span class="rx-k">${L('no')}</span><b class="rx-code">${m.code}</b><span class="rx-st ${st[1]}">${stT}</span></div>${qr(66)}</footer>
    <p class="rx-thx">${thx.join('<br>')}</p>${brand}</article>`;
  if(fk==='classic')return `<article class="rx rx-bill" lang="${la}">${voidMark}
    <header class="rx-bh"><div><p class="rx-k">${L('title')}</p><h3>${esc(ev.name)}</h3><p class="rx-sub">${evLine}<br>${venue}</p></div><div class="rx-serial"><span>${L('no')}</span><b>${m.code}</b></div></header>
    <table class="rx-tbl"><tbody>
      <tr><th>${L('from')}</th><td><b>${from}</b>${rel?` · ${rel}`:''}${place?` · ${place}`:''}</td></tr>
      ${m.c.mobile?`<tr><th>${L('mobile')}</th><td>${esc(m.c.mobile)}</td></tr>`:''}
      <tr><th>${L('payment')}</th><td>${mode}</td></tr><tr><th>${L('received')}</th><td>${when}</td></tr>
      <tr class="rx-tot"><th>${item?L('kind'):L('amount')}</th><td><b>${amt}</b>${words}</td></tr></tbody></table>
    <div class="rx-stamp ${st[1]}" aria-hidden="true">${stT}</div>
    <footer class="rx-bf"><div>${qr(64)}</div><div class="rx-sigs"><span>${esc(byWho(m))}<small>${L('by')}</small></span>${ev.organizer?`<span>${esc(ev.organizer)}<small>${L('organizer')}</small></span>`:''}</div></footer>
    <p class="rx-thx">${thx.join(' ')}</p>${brand}</article>`;
  if(fk==='elegant')return `<article class="rx rx-elegant" lang="${la}">${voidMark}
    <header class="rx-h">${photo||mono}<p class="rx-k">${L('title')}</p><h3>${esc(ev.name)}</h3><p class="rx-sub">${evLine}</p><p class="rx-sub">${venue}</p></header>
    <div class="rx-amt"><span>${item?L('kind'):L('amount')}</span><strong>${amt}</strong>${words}<em>${from}</em></div>
    <dl class="rx-dl">${row('rel',rel)}${row('place',place)}${row('payment',mode)}${row('status',stT)}${row('received',when)}${row('by',esc(byWho(m)))}</dl>
    <p class="rx-thx">${thx.join('<br>')}</p>
    <footer class="rx-stub">${qr(64)}<div><span class="rx-k">${L('no')}</span><b class="rx-code">${m.code}</b><small>${esc(trT(lg,'scan'))}</small></div></footer>${brand}</article>`;
  if(fk==='festive')return `<article class="rx rx-festive" lang="${la}">${voidMark}<div class="rx-garland" aria-hidden="true"></div><div class="rx-leaves" aria-hidden="true"></div>
    <header class="rx-h">${photo}<p class="rx-k">${L('title')}</p><h3>${esc(ev.name)}</h3><p class="rx-sub">${evLine} · ${venue}</p></header>
    <div class="rx-badge"><span>${item?L('kind'):L('amount')}</span><strong>${amt}</strong><em>${from}</em></div>${words}
    <dl class="rx-dl">${row('rel',rel)}${row('place',place)}${row('mobile',esc(m.c.mobile))}${row('payment',mode)}${row('received',when)}${row('by',esc(byWho(m)))}</dl>
    <footer class="rx-f"><div><span class="rx-k">${L('no')}</span><b class="rx-code">${m.code}</b><span class="rx-st ${st[1]}">${stT}</span></div>${qr(66)}</footer>
    <p class="rx-thx">${thx.join('<br>')}</p>${brand}</article>`;
  /* compact = modern card */
  return `<article class="rx rx-card" lang="${la}">${voidMark}<header class="rx-band">${photo?`<span class="rx-av">${photo}</span>`:mono}<div><p class="rx-k">${L('title')}</p><h3>${esc(ev.name)}</h3><p class="rx-sub">${evLine}</p></div></header>
    <div class="rx-big"><span>${item?L('kind'):L('amount')}</span><strong>${amt}</strong><p>${L('from')}: <b>${from}</b>${rel?` · ${rel}`:''}</p></div>
    <div class="rx-chips"><span class="rx-st ${st[1]}">${stT}</span><span>${mode}</span><span>${when}</span></div>
    <footer class="rx-f"><div><span class="rx-k">${L('no')}</span><b class="rx-code">${m.code}</b></div>${qr(58)}</footer>
    <p class="rx-thx">${thx.join(' ')}</p>${brand}</article>`}
function rfmtPicker(sel,px){return `<div class="rfmt-grid" role="radiogroup" aria-label="Receipt format">${RFORMATS.map(([k,l,d])=>`<label class="rfmt ${sel===k?'on':''}"><input type="radio" name="${px}rformat" value="${k}" ${sel===k?'checked':''}><span class="rfmt-art ${k}" aria-hidden="true"><i></i><i></i><i></i></span><b>${l}</b><small>${d}</small></label>`).join('')}</div>`}

/* ---------- voice tones: speed, pitch and wording change with the tone ---------- */
const VTONES=[['warm','Warm and friendly',.92,1.05],['respect','Respectful, for elders',.84,.95],['festive','Festive and cheerful',1.02,1.2],['calm','Calm and slow',.78,.9],['formal','Formal announcer',.95,.85],['short','Short and quick',1.1,1]];
const toneOf=k=>VTONES.find(t=>t[0]===k)||VTONES[0];
let speakTone='warm';
function toneText(lang,d,tone,text){const n=d.name,a=String(Math.round(d.amt));
  if(tone==='short'){const S2={ta:`${n} அவர்களுக்கு நன்றி! ${d.item||a+' ரூபாய்'} மொய் பெற்றுக்கொண்டோம்.`,en:`Thank you ${n}. ${d.item||a+' rupees'} received.`};return S2[lang]||text}
  if(tone==='respect'){const R2={ta:`மதிப்பிற்குரிய ${text}`,en:`Respected ${text}`};return R2[lang]||text}
  if(tone==='festive'){const F2={ta:`${text} இந்த மகிழ்ச்சியான நாளை உங்கள் வருகை இன்னும் சிறப்பாக்கியது!`,en:`${text} Your presence made this happy day even more special!`};return F2[lang]||text}
  if(tone==='formal'){const F3={ta:text.replace(/^வணக்கம்/,'அன்பான வணக்கம்'),en:text.replace(/^Welcome,/,'Good day,')};return F3[lang]||text}
  return text}

/* ---------- Create Event in five steps ---------- */
const EWZ=[['Function','cal'],['Payments','card'],['Receipts','bill'],['Voice','speaker'],['Team','users']];
function evDetails(e,px,isNew){e=e||{};return `<div class="fields">
  ${fld('Function name',px+'name','text',true,e.name,'placeholder="e.g. Kavi Birthday Function"','full')}
  ${sel('Function type',px+'type',ctypesFor(curAcc()),e.type||'Birthday')}${otherBox(px+'type','ctype',false)}${isNew?'':sel('Status',px+'status',[['active','Active · sets itself by date'],['draft','Draft'],['archived','Archived']],e.status==='completed'?'active':(e.status||'active'))}
  ${fld('Date',px+'date','date',true,e.date||'')}${tfld('From',px+'start',e.start||'18:00')}${tfld('Till',px+'end',e.end||'22:00')}
  ${fld('Venue name',px+'venue','text',true,e.venue,'placeholder="e.g. Sri Murugan Mahal"')}${fld('Venue address',px+'address','text',false,e.address,'placeholder="Street, area, city"','full')}
  ${fld('Organizer name',px+'org','text',true,e.organizer)}${fld('Organizer mobile',px+'orgm','tel',false,e.orgMobile,'inputmode="numeric" maxlength="10"')}${fld('Organizer email (Moi Book comes here)',px+'orge','email',false,e.orgEmail||'','autocomplete="email" inputmode="email" placeholder="name@gmail.com"','full')}
  ${area('About the function (optional)',px+'desc',e.desc)}
  <div class="full stack" style="gap:8px"><span class="lbl">Function photo or logo</span>
    <label class="upload" for="${px}logo">${ic('image',22)}<span>${imgBuf.logo?'Change photo':'Choose photo'}</span><small>Shown whole on the QR page, receipts and event cards</small><input type="file" id="${px}logo" accept="image/png,image/jpeg,image/webp" data-img="logo" hidden></label>
    <div id="prev-logo">${logoPreview(imgBuf.logo)}</div></div></div>`}
function evReceipts(e,px,isNew){e=e||{};return `${isNew?msgOptions(e):''}
  <div class="fields">${sel('Receipt language',px+'lang',LANGS,e.lang||e.id?evLang(e):(UIL==='en'?'ta':UIL),'full')}<p class="small muted full" style="margin-top:-6px">Used for the receipt, WhatsApp, SMS and the Moi Book. Names typed in English are written in this language’s letters.</p></div>
  <div class="stack" style="gap:8px"><span class="lbl">Receipt format</span><p class="small muted">This is the receipt guests see and you print or share.</p>${rfmtPicker(rfmtOf(e),px)}</div>`}
function teamSummary(e){const as=S.eventUsers.filter(a=>a.event_id===e.id).map(a=>({a,u:S.users.find(x=>x.id===a.user_id)})).filter(x=>x.u);
  return `<div class="stack" style="gap:10px">${as.length?`<div class="rows">${as.map(({a,u})=>`<div class="row-card" style="cursor:default"><span class="avatar ${avc(u.name)}">${ini(u.name)}</span><div class="rc-main"><b>${esc(u.name)}</b><small>${ROLE[a.role]||a.role} · ${esc(accessTxt(a))}</small></div></div>`).join('')}</div>`:'<p class="muted">Only you collect Moi for this event.</p>'}
    <p class="small muted">Add, edit or remove helpers on the <b>Event users</b> page after saving.</p></div>`}
function eventWizard(e){const steps=EWZ.map(([l,i],k)=>`<li class="${k?'':'on'}" data-ewl="${k+1}"><span>${k+1}</span>${l}</li>`).join('');
  return `<form data-form="evSave" data-wz="1" data-step="1" class="ewz" ${e?`data-id="${e.id}" data-edit="1"`:''}><ol class="wz-steps ewz-steps">${steps}</ol><div class="md-b">
   <section class="ewz-p" data-p="1"><h3>Function details</h3>${evDetails(e,'n_',!e)}</section>
   <section class="ewz-p" data-p="2" hidden><h3>How will you receive Moi?</h3>${paymentFields(e||{modes:{cash:1,upi:0,online:0},qrModes:{cash:1,upi:0,online:0}},'n_')}</section>
   <section class="ewz-p" data-p="3" hidden><h3>Messages and receipt</h3>${evReceipts(e,'n_',true)}</section>
   <section class="ewz-p" data-p="4" hidden><h3>Voice announcement</h3>${voiceOptions(e,'n_')}</section>
   <section class="ewz-p" data-p="5" hidden><h3>Who will collect Moi?</h3>${e?teamSummary(e):teamFields()+`<p class="small muted">${ic('qr',14)} A simple event QR code and the next event number are created when you save.</p>`}</section>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="ewBack">Cancel</button><button type="button" class="btn btn-primary" data-act="ewNext">Next ${ic('arrow',18)}</button></div></form>`}
function ewValid(f,step){const v=id=>{const el=f.querySelector('#n_'+id);return el?el.value.trim():''};
  if(step===1){if(!v('name'))return bad(f,'n_name','Give the function a name'),false;if(!v('date'))return bad(f,'n_date','Pick the date'),false;if(!v('venue'))return bad(f,'n_venue','Add the venue name'),false;if(!v('org'))return bad(f,'n_org','Add the organizer’s name'),false;
    const om=v('orgm').replace(/\D/g,'');if(om&&!mobOk(om))return bad(f,'n_orgm',MOBERR),false}
  if(step===2){const p=readPayment(f,'n_');if(p.err)return bad(f,p.err[0],p.err[1]),false}
  if(step===5&&!f.dataset.edit){const t=readTeam(f);if(t.err)return bad(f,t.err[0],t.err[1]),false}
  return true}
function ewSet(f,n){f.dataset.step=n;f.querySelectorAll('.ewz-p').forEach(p=>p.hidden=+p.dataset.p!==n);f.querySelectorAll('[data-ewl]').forEach(li=>{const k=+li.dataset.ewl;li.className=k<n?'done':k===n?'on':'';li.querySelector('span').innerHTML=k<n?ic('check',14):k});
  const back=f.querySelector('[data-act="ewBack"]'),nx=f.querySelector('[data-act="ewNext"]');back.textContent=n===1?'Cancel':'Back';nx.innerHTML=n===5?`${ic('check',18)}${f.dataset.edit?'Save changes':'Create event'}`:`Next ${ic('arrow',18)}`;
  const md=f.closest('.md');if(md)md.scrollTop=0;const b=f.querySelector('.md-b');if(b)b.scrollTop=0}
function eventFields(e,px){e=e||{};return `<div class="stack ev-sections" style="gap:22px">
  <section><h3 class="sec-h">${ic('cal',18)}Function details</h3>${evDetails(e,px,false)}</section>
  <section><h3 class="sec-h">${ic('card',18)}Payments</h3>${paymentFields(e,px)}</section>
  <section><h3 class="sec-h">${ic('bill',18)}Receipt</h3>${evReceipts(e,px,false)}</section>
  <section><h3 class="sec-h">${ic('speaker',18)}Voice announcement</h3>${voiceOptions(e,px)}</section>
  <p class="small muted">${ic('qr',14)} Event number <b>${esc(e.no||'')}</b> and its QR code never change.</p></div>`}
let teamN=0;
function teamFields(){const ex=accUsers().filter(u=>u.role!=='admin'&&u.status==='active');teamN=0;
  return `<fieldset class="full msg-opt"><legend class="lbl">Who will collect Moi at this event?</legend>
  <div class="optcards">
    <label class="optcard"><input type="radio" name="n_team" value="self" checked><span class="tile-ic" style="margin:0">${ic('user',18)}</span><span><b>I’ll collect it myself</b><small>No extra login needed</small></span></label>
    <label class="optcard"><input type="radio" name="n_team" value="team"><span class="tile-ic" style="margin:0">${ic('users',18)}</span><span><b>Add helpers</b><small>Moi Collectors or an Event Manager</small></span></label>
  </div>
  <div id="teamBox" class="stack" hidden style="gap:12px">
    ${ex.length?`<div><span class="lbl">People already on Moi Point</span><div class="team-ex">${ex.map(u=>`<div class="team-exr"><label class="check"><input type="checkbox" name="t_ex" value="${u.id}"> <b>${esc(u.name)}</b> <span class="small muted">${esc(u.email||u.username)}</span></label><select name="t_exrole_${u.id}" aria-label="Role for ${esc(u.name)}"><option value="collector">Moi Collector</option>${me.role==='admin'?'<option value="manager">Event Manager</option>':''}</select></div>`).join('')}</div></div>`:''}
    <div id="teamRows" class="stack" style="gap:10px"></div>
    <button type="button" class="btn btn-soft" data-act="teamAdd">${ic('plus',18)}Add a new person</button>
    <p class="small muted">Each person logs in with their own username and password and sees only the events you give them. A Moi Collector can add Moi and print receipts. An Event Manager can also verify payments, add expenses and see reports.</p>
  </div></fieldset>`}
function teamRow(i){const others=accEvents().filter(e=>e.status!=='archived');
  return `<div class="team-row" data-tr="${i}"><div class="row-between"><b>Person ${i+1}</b><button type="button" class="icon-btn icon-sm" data-act="teamDel" aria-label="Remove this person">${ic('x',16)}</button></div>
  <div class="fields">${fld('Name','t_name'+i,'text',true,'','autocomplete="off" data-tn="'+i+'"')}${fld('Mobile number','t_mob'+i,'tel',true,'','inputmode="numeric" maxlength="10"')}
  ${sel('Role','t_role'+i,me.role==='admin'?[['collector','Moi Collector'],['manager','Event Admin']]:[['collector','Moi Collector']],'collector')}${fld('Email (to log in)','t_user'+i,'email',true,'','autocomplete="off" autocapitalize="none" inputmode="email" placeholder="name@gmail.com"')}
  ${fld('Password','t_pw'+i,'text',true,tok().slice(0,8),'autocomplete="off" minlength="6"')}${accessFields('t'+i,{mode:'always'})}${permFields('t'+i,'collector')}</div>
  ${others.length&&me.role==='admin'?`<details class="more"><summary>Also give access to other events</summary><div class="team-ex">${others.map(e=>`<label class="check"><input type="checkbox" name="t_oev${i}" value="${e.id}"> ${esc(e.name)} <span class="small muted">· ${dfmt(e.date)}</span></label>`).join('')}</div></details>`:''}
  <p class="small muted">Share the email and password with this person. Only you can change their password later.</p></div>`}
function readTeam(f){const mode=(f.querySelector('input[name="n_team"]:checked')||{}).value;if(mode!=='team')return {people:[],existing:[]};
  const people=[],taken=new Set(S.users.map(u=>u.username));
  for(const r of f.querySelectorAll('.team-row')){const i=r.dataset.tr,v=id=>r.querySelector('#'+id+i).value.trim();
    const name=v('t_name'),mob=v('t_mob').replace(/\D/g,''),un=v('t_user').toLowerCase(),pw=r.querySelector('#t_pw'+i).value;
    if(!name)return {err:['t_name'+i,'Enter the helper’s name']};if(!mobOk(mob))return {err:['t_mob'+i,MOBERR]};
    if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(un))return {err:['t_user'+i,'Enter a valid email, like name@gmail.com']};if(taken.has(un)||S.users.some(u=>(u.email||'').toLowerCase()===un))return {err:['t_user'+i,'Another login already uses this email']};
    if(pw.length<6)return {err:['t_pw'+i,'Password needs at least 6 characters']};taken.add(un);
    const acc=readAccess(r,'t'+i);if(acc.err)return {err:acc.err};
    people.push({access:acc,perm:readPerm(r,'t'+i),name,mobile:mob,username:un,pw,role:v('t_role'),others:[...r.querySelectorAll(`input[name="t_oev${i}"]:checked`)].map(x=>x.value)})}
  const existing=[...f.querySelectorAll('input[name="t_ex"]:checked')].map(x=>({id:x.value,role:f.querySelector(`select[name="t_exrole_${x.value}"]`).value}));
  return {people,existing}}
function msgOptions(e){const n=(e&&e.notify)||{wa:true,sms:true},s=crState();
  return `<fieldset class="full msg-opt"><legend class="lbl">Send messages to contributors?</legend>
  <p class="small muted">Each contributor gets their Moi receipt on WhatsApp or SMS. ${rateTxt()} from your credits. You can change this any time in Settings.</p>
  <div class="optcards">
    <label class="optcard"><input type="checkbox" id="n_wa" ${n.wa?'checked':''}><span class="tile-ic" style="margin:0">${ic('msg',18)}</span><span><b>WhatsApp receipt</b><small>${rateTxt()}</small></span></label>
    <label class="optcard"><input type="checkbox" id="n_sms" ${n.sms?'checked':''}><span class="tile-ic" style="margin:0">${ic('phone',18)}</span><span><b>SMS receipt</b><small>${rateTxt()}</small></span></label>
  </div>
  <p class="small msg-bal ${s}">${ic(s==='ok'?'check':'alert',14)} ${cr(S.wallet.credits)} credits available${s==='ok'?'':s==='low'?' · running low':' · buy credits before the function'}</p>
  </fieldset>`}
function voiceOptions(e,px){const c=voiceCfg(e);if(!feat('voice',e&&e.acc?e:null))return `<div class="note warn full">${ic('speaker',20)}<div><b>Voice announcement is not in your plan</b><p>Move to a plan with voice to have each Moi spoken aloud at the counter. <a class="link" href="#plan">See plans</a></p></div></div>`;
  const acts=c.acts||{};
  return `<fieldset class="full msg-opt"><legend class="lbl">Voice announcements</legend>
  <div class="seg vmode" role="radiogroup" aria-label="Voice"><label class="${c.on?'on':''}"><input type="radio" name="${px}vmode" value="on" ${c.on?'checked':''}>${ic('speaker',16)} Announce aloud</label><label class="${c.on?'':'on'}"><input type="radio" name="${px}vmode" value="off" ${c.on?'':'checked'}>${ic('mute',16)} Silent</label></div>
  <div class="vacts"><span class="lbl">Speak when</span>${VACTS.map(([k,l,d])=>`<label class="qm"><input type="checkbox" id="${px}va_${k}" ${acts[k]!==0?'checked':''}><span><b>${l}</b><small>${d}</small></span></label>`).join('')}</div>
  <p class="small muted">As soon as a Moi is submitted, the phone or computer speaks it aloud for the contributor standing at the counter, e.g. “வணக்கம் Kaviya அவர்களே! Kavi Birthday Function நிகழ்வுக்கு வந்ததற்கு நன்றி. நீங்கள் ரொக்கமாக வழங்கிய 5001 ரூபாய் மொய் பெறப்பட்டது. உங்கள் அன்புக்கும் ஆசீர்வாதத்துக்கும் மிக்க நன்றி!” Free, uses no credits.</p>
  <input type="checkbox" id="${px}voice" ${c.on?'checked':''} hidden>
  <div class="fields">${sel('Voice language',px+'vlang',[['same','Same as receipt language'],...LANGS],c.lang)}${sel('Voice tone',px+'vtone',VTONES.map(t=>[t[0],t[1]]),c.tone||'warm')}</div>
  <div class="tone-grid">${VTONES.map(t=>`<button type="button" class="tone ${(c.tone||'warm')===t[0]?'on':''}" data-act="voiceTest" data-px="${px}" data-tone="${t[0]}">${ic('speaker',16)}<span>${t[1]}</span></button>`).join('')}</div>
  <p class="small muted">Tap a tone to hear it. Each tone changes the speed, pitch and wording.</p>
  ${voicePick(px,e)}</fieldset>`}
function voiceChip(ev){const c=voiceCfg(ev);if(!c.on)return '';
  return `<button type="button" class="voice-chip ${deviceMute?'off':''}" data-act="muteToggle" aria-pressed="${!deviceMute}">${ic(deviceMute?'mute':'speaker',16)}${deviceMute?'Voice muted on this device':'Voice on · '+LSHORT[voiceLang(ev)]}</button>`}
function evSummary(ev){const ms=evModes(ev).map(k=>MODE[k]).join(', '),nf=ev.notify||{},vc=voiceCfg(ev);
  const row=(l,v)=>`<div><dt>${l}</dt><dd>${v}</dd></div>`;
  return `<dl class="kvlist ev-sum">${row('Event number',`<span class="code">${esc(ev.no||'')}</span>`)}${row('Function',`${esc(ev.name)} · ${esc(ev.type)}`)}${row('Status',pill(evPh(ev),EVST))}${row('Date & time',`${dfmt(ev.date)} · ${tfmt(ev.start)} – ${tfmt(ev.end)}`)}${row('Venue',esc([ev.venue,ev.address].filter(Boolean).join(', ')))}${row('Organizer',esc([ev.organizer,ev.orgMobile].filter(Boolean).join(' · ')))}
    ${row('Receives Moi by',ms)}${row('QR page takes',(qrModes(ev).map(k=>QRML[k]).join(', ')||'Off · event details only'))}${row('Messages',[nf.wa?'WhatsApp':'',nf.sms?'SMS':''].filter(Boolean).join(' + ')||'Off')}${row('Receipt',`${esc((LANGS.find(l=>l[0]===evLang(ev))||['',''])[1])} · ${esc((RFORMATS.find(f=>f[0]===rfmtOf(ev))||['','Ticket'])[1])}`)}${row('Voice',vc.on?'On':'Silent')}</dl>`}
function vSettings(ev){
  imgBuf.logo=logoObj(ev);[0,1].forEach(i=>{imgBuf['upiqr'+i]=(ev.upis&&ev.upis[i]&&ev.upis[i].qr)||null});
  const n=ev.notify||{};
  return `<div class="page-head"><div><h1>Event Settings</h1><p class="sub">Details, notifications and activity for this event.</p></div></div>
  ${ev.status==='void'?`<section class="card pad stack"><h3>Event details</h3><p class="muted">${esc(ev.no||'')} · ${esc(ev.name)} · ${dfmt(ev.date)} · ${esc(ev.venue)}</p><p class="small muted">Void is final: details, status and Moi records stay as they are for your accounts.</p></section>`:`<section class="card pad stack"><div class="card-h"><h3>Event details</h3><button class="btn btn-primary btn-sm" data-act="evEdit" data-id="${ev.id}">${ic('edit',16)}Edit event</button></div>${evSummary(ev)}</section>`}
  <div class="split"><section class="card pad">${notifCard(ev)}
    ${me.role==='admin'?`<div class="side-sep" style="margin:16px 0"></div><h3 style="margin-bottom:10px">Danger zone</h3><div class="btn-row">${ev.status!=='archived'&&ev.status!=='void'?`<button class="btn btn-ghost btn-sm" data-act="evArchive">Archive event</button>`:''}${ev.status==='void'?'':`<button class="btn btn-danger btn-sm" data-act="evDel">${ic('x',16)}Void event</button>`}</div>`:''}</section>
  <section class="card pad"><div class="card-h"><h3>Activity log</h3><a class="btn btn-ghost btn-sm" href="#audit">All activity</a></div>${auditView(visibleLogs(),ev.id)}</section></div>`;
}
const ALCAT=[['all','All','clock'],['moi','Moi','gift'],['pay','Payments','card'],['money','Expenses & payouts','wallet'],['team','Team & access','users'],['event','Event settings','sliders'],['login','Logins','lock'],['other','Credits & reminders','bell']];
function alCat(a){const x=a.action,d=(a.detail||'').toLowerCase();
  if(['Moi added','Marked returned','Receipt printed','Moi book exported'].includes(x))return 'moi';
  if(x==='Payment verified'||x==='Payment rejected')return 'pay';
  if(x==='Expense added'||x==='Payout recorded')return 'money';
  if(x==='User created'||/access|login for/.test(d))return 'team';
  if(x==='Logged in'||x==='Logged out')return 'login';
  if(x==='Credits purchased'||x==='Reminder')return 'other';
  if(/moi|receipt|returned/.test(d))return 'moi';if(/expense|payout|bill/.test(d))return 'money';if(/payment|upi|gateway/.test(d))return 'pay';
  return 'event'}
/* what this login may see: admin everything; event manager their events; collector only their own work */
function visibleLogs(){if(!me)return [];const ofAcc=a=>(a.acc||(a.eid&&(S.events.find(e=>e.id===a.eid)||{}).acc)||'A1001')===me.acc;if(me.role==='admin')return S.audit.filter(ofAcc);
  const mine=new Set(S.eventUsers.filter(a=>a.user_id===me.id&&a.role==='manager').map(a=>a.event_id));
  return S.audit.filter(a=>(a.eid&&mine.has(a.eid))||a.user===me.name)}
ui.al={cat:'all',who:'',ev:'',n:40};
function auditView(all,scopeEv){const q=ui.al,base=scopeEv?all.filter(a=>a.eid===scopeEv):all;
  const people=[...new Set(base.map(a=>a.user))].sort(),evs=scopeEv?[]:[...new Set(base.map(a=>a.eid).filter(Boolean))];
  const cnt=k=>base.filter(a=>k==='all'||alCat(a)===k).length;
  const list=base.filter(a=>(q.cat==='all'||alCat(a)===q.cat)&&(!q.who||a.user===q.who)&&(scopeEv||!q.ev||a.eid===q.ev)).sort((a,b)=>b.at.localeCompare(a.at));
  const shown=list.slice(0,q.n);let lastDay='';
  const lk=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const dayLbl=d=>{const k=lk(d),t=lk(new Date()),y=lk(new Date(Date.now()-864e5));return k===t?'Today':k===y?'Yesterday':d.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})};
  return `<div class="al-bar"><div class="al-chips" role="tablist">${ALCAT.filter(([k])=>k==='all'||cnt(k)).map(([k,l,i])=>`<button role="tab" aria-selected="${q.cat===k}" class="al-chip ${q.cat===k?'on':''}" data-act="alCat" data-v="${k}">${ic(i,15)}${l}<span>${cnt(k)}</span></button>`).join('')}</div>
    <div class="al-sel">${people.length>1?`<label class="field" for="al_who"><span>Person</span><select id="al_who"><option value="">Everyone</option>${people.map(p=>`<option ${q.who===p?'selected':''}>${esc(p)}</option>`).join('')}</select></label>`:''}${evs.length>1?`<label class="field" for="al_ev"><span>Event</span><select id="al_ev"><option value="">All events</option>${evs.map(id=>{const e=S.events.find(x=>x.id===id);return `<option value="${id}" ${q.ev===id?'selected':''}>${esc(e?e.name:'Deleted event')}</option>`}).join('')}</select></label>`:''}</div></div>
  ${shown.length?`<div class="audit">${shown.map(a=>{const d=new Date(a.at),dl=dayLbl(d),hd=dl!==lastDay?`<div class="al-day">${dl}</div>`:'';lastDay=dl;const c=ALCAT.find(x=>x[0]===alCat(a));
    return hd+`<div class="audit-i"><span class="tile-ic al-ic">${ic(c[2],16)}</span><div><b>${esc(a.action)}</b> <span class="muted small">· ${esc(a.user)}${a.role?' · '+esc(a.role):''}</span><p>${esc(a.detail)}${a.eid&&!scopeEv?' · <span class="muted">'+esc((S.events.find(e=>e.id===a.eid)||{name:'Deleted event'}).name)+'</span>':''}</p><span class="when">${d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</span></div></div>`}).join('')}</div>
  ${list.length>shown.length?`<button class="btn btn-ghost btn-block" data-act="alMore">Show ${Math.min(40,list.length-shown.length)} more of ${list.length-shown.length}</button>`:''}`:emptyBox('Nothing here','No activity matches this filter.')}`}
const auditList=logs=>logs.length?`<div class="audit">${logs.map(a=>{const d=new Date(a.at);return `<div class="audit-i"><span class="avatar ${avc(a.user)}" style="width:36px;height:36px;font-size:.74rem">${ini(a.user)}</span><div><b>${esc(a.user)} <span class="muted small">· ${esc(a.role)}</span></b><p><b style="color:var(--ink);font-weight:700">${esc(a.action)}</b> — ${esc(a.detail)}${a.eid&&!curEv?' · '+esc((S.events.find(e=>e.id===a.eid)||{name:'Deleted event'}).name):''}</p><span class="when">${d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} · ${d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</span></div></div>`}).join('')}</div>`:emptyBox('No activity yet','');
