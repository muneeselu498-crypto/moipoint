/* ================= V54: bank accounts are kept, and can be reused, changed or removed ================= */
function savedBanks(){const A=myAcc()||curAcc();if(!A)return [];A.banks=A.banks||[];return A.banks}
function bankRemember(b){const L=savedBanks();if(!b||!b.last4)return;const ex=L.find(x=>x.last4===b.last4&&x.ifsc===b.ifsc);if(ex){ex.holder=b.holder;ex.at=Date.now()}else L.unshift({id:uid('bk'),holder:b.holder,last4:b.last4,ifsc:b.ifsc,at:Date.now()})}
function mig54(){if(S.v54)return;S.events.forEach(e=>{if(e.bank&&e.bank.linked){const A=accById(e.acc);if(!A)return;A.banks=A.banks||[];if(!A.banks.some(x=>x.last4===e.bank.last4&&x.ifsc===e.bank.ifsc))A.banks.push({id:uid('bk'),holder:e.bank.holder,last4:e.bank.last4,ifsc:e.bank.ifsc,at:e.bank.at||Date.now()})}});S.v54=1;save()}
try{mig54()}catch(_){}
const bkRow=(b,px,cur)=>`<div class="bkr ${cur?'on':''}"><span class="ur-qr">${ic('card',18)}</span><div class="ur-t"><b>${esc(b.holder)} · ••••${esc(b.last4)}</b><small>${esc(b.ifsc)}${cur?' · used for this event / function':''}</small></div>${cur?`<span class="tag">${ic('check',12)}In use</span>`:`<button type="button" class="btn btn-soft btn-sm" data-act="bkUse" data-px="${px}" data-id="${b.id}">Use this</button>`}<button type="button" class="icon-btn icon-sm" data-act="bkDel" data-px="${px}" data-id="${b.id}" aria-label="Remove ${esc(b.holder)} ••••${esc(b.last4)}">${ic('trash',15)}</button></div>`;
function bankBox(e,px){const b=e.bank&&e.bank.linked?e.bank:null;
  return `<div class="bank-box" id="${px}bkBox">${bankInner(b,px)}<div hidden><input id="${px}bk_name" value="${esc(b?b.holder:'')}"><input id="${px}bk_no" value=""><input id="${px}bk_l4" value="${esc(b?b.last4:'')}"><input id="${px}bk_ifsc" value="${esc(b?b.ifsc:'')}"><input type="checkbox" id="${px}bk_ok" ${b?'checked':''}></div></div>`}
function bankInner(b,px){const L=savedBanks(),cur=b&&L.find(x=>x.last4===b.last4&&x.ifsc===b.ifsc);
  return `<span class="lbl">Bank account for online Moi</span><div id="${px}bkSum" class="bk-list">${b&&!cur?bkRow({id:'',holder:b.holder,last4:b.last4,ifsc:b.ifsc},px,true):''}${L.map(x=>bkRow(x,px,cur&&cur.id===x.id)).join('')}${!b&&!L.length?`<p class="small muted">${ic('alert',14)} Not added yet. Online Moi starts once you add it.</p>`:''}</div>
   <button type="button" class="btn btn-soft btn-sm" id="${px}bkBtn" data-act="bankEdit" data-px="${px}">${ic('plus',16)}${L.length||b?'Add a new bank account':'Add bank account'}</button>`}
function bkPaint(px){const box=document.getElementById(px+'bkBox');if(!box)return;const v=id=>(document.getElementById(px+id)||{}).value||'',ok=document.getElementById(px+'bk_ok'),b=ok&&ok.checked&&v('bk_l4')?{holder:v('bk_name'),last4:v('bk_l4'),ifsc:v('bk_ifsc')}:null;
  const keep=box.querySelector('[hidden]');box.innerHTML=bankInner(b,px);box.appendChild(keep)}
function bkSet(px,b){const s=(id,v)=>{const el=document.getElementById(px+id);if(el)el.value=v};s('bk_name',b?b.holder:'');s('bk_l4',b?b.last4:'');s('bk_ifsc',b?b.ifsc:'');s('bk_no','');const ok=document.getElementById(px+'bk_ok');if(ok)ok.checked=!!b;bkPaint(px)}
{const _bs=ACT.bankSave;ACT.bankSave=b=>{const px=b.dataset.px,before=document.getElementById('subpop');_bs(b);if(document.getElementById('subpop'))return;/* saved */const v=id=>(document.getElementById(px+id)||{}).value||'',no=v('bk_no');if(!no)return;const bk={holder:v('bk_name'),last4:no.slice(-4),ifsc:v('bk_ifsc')};const l4=document.getElementById(px+'bk_l4');if(l4)l4.value=bk.last4;bankRemember(bk);save();bkPaint(px)}}
Object.assign(ACT,{
 bkUse:b=>{const x=savedBanks().find(y=>y.id===b.dataset.id);if(!x)return;bkSet(b.dataset.px,x);toast(`Online Moi will go to ••••${x.last4}`,'good')},
 bkDel:b=>{const px=b.dataset.px,L=savedBanks(),x=L.find(y=>y.id===b.dataset.id),v=id=>(document.getElementById(px+id)||{}).value||'';if(!x){bkSet(px,null);return}const inUse=v('bk_l4')===x.last4&&v('bk_ifsc')===x.ifsc;
   subPop(`<div class="sp-h"><div><h3>${ic('trash',20)} Remove this bank account?</h3><p class="small muted">${esc(x.holder)} · ••••${esc(x.last4)} · ${esc(x.ifsc)}</p></div></div><p class="small">${inUse?'This event / function will have no bank account until you add or choose one, so online Moi stops.':'It is removed from your saved accounts. Events already using it keep it.'}</p><div class="sp-f"><button type="button" class="btn btn-ghost" data-act="spCancel" data-px="${px}">Cancel</button><button type="button" class="btn btn-primary" data-act="bkDelYes" data-px="${px}" data-id="${x.id}">Remove</button></div>`)},
 bkDelYes:b=>{const px=b.dataset.px,L=savedBanks(),i=L.findIndex(y=>y.id===b.dataset.id),x=L[i],v=id=>(document.getElementById(px+id)||{}).value||'';subClose();if(!x)return;const inUse=v('bk_l4')===x.last4&&v('bk_ifsc')===x.ifsc;L.splice(i,1);if(inUse)bkSet(px,null);else bkPaint(px);save();toast('Bank account removed','good')}});


/* ================= V55: the default receipt, redesigned as a premium centred ticket ================= */
function ticketHtml(m,lg,notch){const ev=S.events.find(e=>e.id===m.event_id);lg=lg||evLang(ev);const H=k=>trH(lg,k),TN=s=>s&&IBASE[lg]?locPhrase(String(s),lg,false):(s||'');
  const row=(k,v)=>v?`<div class="t2-r"><dt>${H(k)}</dt><dd>${v}</dd></div>`:'';const item=isItem(m);
  const words=!item&&lg==='en'&&+m.amount>0?`<p class="t2-words">Rupees ${inWords(m.amount)} only</p>`:'';
  const st=STATUS[m.status]||['',''];
  return `<article class="ticket t2" style="--notch:${notch||'var(--bg)'}" lang="${lg==='en'?'en':lg.slice(0,2)}">
  <header class="t2-head"><div class="t2-glow" aria-hidden="true"></div>
    <div class="t2-brand"><span class="t2-mark">${mpMark()}</span><span class="t2-wm">${MPW()}</span></div>
    <p class="t2-kind"><i></i>${H('title')}<i></i></p>
    ${ev.logo&&feat('logo',ev)?`<figure class="t2-photo ${ev.logoT?'cut':''}"><img src="${ev.logo}" alt="${esc(ev.name)}"></figure>`:''}
    <span class="t2-type">${esc(TN(ev.type))}</span>
    <h2 class="t2-ev">${esc(TN(ev.name))}</h2>
    <p class="t2-when">${dfmt(ev.date)} · ${tfmt(ev.start)} – ${tfmt(ev.end)}</p>
    <p class="t2-where">${esc(TN(ev.venue))}${ev.address?`<br><small>${esc(TN(ev.address))}</small>`:''}</p>
  </header>
  <div class="t2-perf" aria-hidden="true"></div>
  <section class="t2-amt">
    <span class="t2-lbl">${item?H('kind'):H('amount')}</span>
    <strong class="${item?'item':''}">${item?esc(itemTxt(m,lg)):fmt(m.amount)}</strong>${words}${item&&m.est?`<p class="t2-words">${H('est')} · ${fmt(m.est)}</p>`:''}
    <div class="t2-tags"><span class="pill ${st[1]}">${esc(statT(lg,m.status))}</span><span class="t2-mode">${ic(MODEI[m.mode]||'cash',13)}${esc(modeT(lg,m.mode))}</span></div>
  </section>
  <section class="t2-who"><span class="t2-lbl">${H('from')}</span><b class="t2-name">${esc(nm(m,lg))}</b>
    <p class="t2-sub">${[relT(m.c.relationship,lg),plc(m.c.place,lg),locDes(m.c.designation,lg)].filter(Boolean).map(esc).join(' · ')}</p></section>
  <dl class="t2-list">
    ${row('mobile',esc(m.c.mobile))}
    ${item?`${row('weight',m.gift&&m.gift.grams?esc(m.gift.grams)+' g':'')}${row('purity',m.gift&&m.gift.purity&&m.gift.purity!=='Other'?esc(m.gift.purity):'')}${row('item',esc(m.gift&&m.gift.item))}${row('qty',m.gift&&(+m.gift.qty||1)>1?esc(m.gift.qty):'')}`
      :`${row('payment',esc(modeT(lg,m.mode)))}${row('utr',m.utr?`<span class="code">${esc(m.utr)}</span>`:'')}${row('gref',m.gref?`<span class="code">${esc(m.gref)}</span>`:'')}${row('ref',esc(m.ref))}`}
    ${row('received',`${dfmt(m.date)}, ${tfmt(m.time)}`)}${row('by',esc(TN(byWho(m))))}${row('organizer',ev.organizer?esc(TN(ev.organizer)):'')}
    ${row('address',esc(m.c.address))}${row('notes',esc(m.c.notes))}
  </dl>
  ${m.shot||(item&&m.gift&&m.gift.photo)?`<div class="t2-proof"><img src="${m.shot||m.gift.photo}" alt="${item?'Photo of the gift':'Payment screenshot'}"></div>`:''}
  <div class="t2-perf" aria-hidden="true"></div>
  <footer class="t2-stub">
    <div class="t2-qr"><div class="qr-box" data-qr="https://moipoint.in/r/${m.code}" data-size="110"></div></div>
    <span class="t2-lbl">${H('no')}</span><b class="t2-code">${m.code}</b><small class="t2-scan">${esc(trT(lg,'scan'))}</small>
    <p class="t2-thanks">${tr(lg,'thanks').map(esc).join('<br>')}</p>
  </footer>
  ${feat('brand',ev)?'':`<a class="t2-foot" href="https://moipoint.in" target="_blank" rel="noopener" aria-label="Moi Point, free Moi and event app"><span class="t2-fm">${mpMark()}</span><span><b>${MPW()}</b> · Grow Together</span><em>moipoint.in</em></a>`}
  </article>`}
Object.assign(LW.ta,{'moi collector':'மொய் வசூலிப்பாளர்','event admin':'நிகழ்வு நிர்வாகி','event manager':'நிகழ்வு நிர்வாகி','admin':'நிர்வாகி','owner':'உரிமையாளர்','event qr page':'நிகழ்வு QR பக்கம்','qr page':'QR பக்கம்','self':'தானாக','via':'வழியாக','page':'பக்கம்'});


/* ================= V56: ten receipt designs on the premium ticket layout + Moi Book style choice ================= */
const TTH={ticket:1,royal:1,temple:1,classic:1,elegant:1,festive:1,compact:1,peacock:1,jasmine:1};
(function(){const D={ticket:['Ticket · Premium','Indigo and gold ticket with photo, QR and every detail. Recommended'],royal:['Royal','Deep maroon with gold foil frame and a gold seal'],temple:['Kolam','Saffron temple arch on cream paper with kolam corners'],classic:['Heritage bill','Old bill-book paper, ruled lines and a round stamp'],elegant:['Elegant','Ivory and gold, wedding-card serif letters'],festive:['Festive','Marigold garland and mango-leaf thoranam'],compact:['Modern dark','Graphite and teal, looks sharp on a phone'],peacock:['Peacock','Teal, sapphire and gold peacock feathers'],jasmine:['Jasmine','Calm green and white with small jasmine flowers'],slip:['Counter slip','Narrow black-and-white slip for a thermal printer']};
  if(!RFORMATS.some(r=>r[0]==='peacock')){const at=RFORMATS.findIndex(r=>r[0]==='slip');RFORMATS.splice(at<0?RFORMATS.length:at,0,['peacock','',''],['jasmine','',''])}
  RFORMATS.forEach(r=>{if(D[r[0]]){r[1]=D[r[0]][0];r[2]=D[r[0]][1]}})})();
const _tk56=ticketHtml;
ticketHtml=function(m,lg,notch,th){th=TTH[th]?th:'ticket';let h=_tk56(m,lg,notch);
  h=h.replace('class="ticket t2"',`class="ticket t2 th-${th}" data-th="${th}"`).replace('<div class="t2-glow" aria-hidden="true"></div>','<div class="t2-glow" aria-hidden="true"></div><span class="t2-orn" aria-hidden="true"></span>');
  if(th==='temple')h=h.replace(/<\/article>\s*$/,'<i class="t2-orn2 bl" aria-hidden="true"></i><i class="t2-orn2 br" aria-hidden="true"></i></article>');
  return h};
const _rc56=rcptHtml;
rcptHtml=function(m,lg,fk,notch){const ev=S.events.find(e=>e.id===m.event_id);fk=fk||rfmtOf(ev);
  if(fk==='slip'||!TTH[fk])return _rc56(m,lg,fk,notch);lg=lg||evLang(ev);return ticketHtml(m,lg,notch,fk)};
/* picker: a real, small rendered receipt for every design + a full-size preview of the chosen one */
function rfShot(k){let h='';try{h=webRx(k)}catch(e){}return `<span class="rfmt-shot" aria-hidden="true">${k==='ticket'?'<em class="rfmt-def">Default</em>':''}<span class="rfmt-in" data-noi18n>${h}</span></span>`}
const _rfp56=rfmtPicker;
rfmtPicker=function(sel,px){sel=sel||'ticket';return `<div class="rfmt-grid v56" role="radiogroup" aria-label="Receipt format">${RFORMATS.map(([k,l,d])=>`<label class="rfmt ${sel===k?'on':''}"><input type="radio" name="${px}rformat" value="${k}" ${sel===k?'checked':''} data-rfpick="${px}">${rfShot(k)}<b>${l}</b><small>${d}</small></label>`).join('')}</div>
  <div class="rfmt-big" id="rfBig-${px}"><span class="lbl"><span>Preview · <b data-rfname>${esc((RFORMATS.find(r=>r[0]===sel)||RFORMATS[0])[1])}</b></span><small class="muted">Sample entry</small></span><div class="rfmt-zoom" data-noi18n>${webRx(sel)}</div></div>`};
document.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches||!t.matches('input[data-rfpick]'))return;const px=t.dataset.rfpick,k=t.value;
  t.closest('.rfmt-grid').querySelectorAll('.rfmt').forEach(l=>l.classList.toggle('on',l.contains(t)));
  const b=document.getElementById('rfBig-'+px);if(b){b.querySelector('.rfmt-zoom').innerHTML=webRx(k);const n=b.querySelector('[data-rfname]');if(n)n.textContent=(RFORMATS.find(r=>r[0]===k)||[k,k])[1];try{mountQR(b)}catch(_){}}});

/* ---------- Moi Book: Classic or Premium ---------- */
book.style=book.style||'premium';
const BKSTY=[['premium','Premium','Same look as the ticket receipt: indigo and gold cover, dark table headings'],['classic','Classic','Simple notebook look, light lines. Uses less printer ink']];
const _bh56=bookHtml;
bookHtml=function(ev,o){let h=_bh56(ev,o);if((o.style||'premium')!=='premium')return h;
  h=h.replace(/^<div class="bk /,'<div class="bk bkp ');
  h=h.replace(/<div class="bk-cover">([\s\S]*?)(<table class="bk-info">[\s\S]*?<p class="bk-gen">[\s\S]*?<\/p>)<\/div>/,(_,top,body)=>`<div class="bk-cover"><div class="bk-cv-top">${top}</div><div class="bk-cv-body">${body}</div></div>`);
  return h};
function bkStyleHtml(){const st=book.style||'premium';return `<div><span class="lbl">Book design · see the preview below</span><div class="bk-style" role="radiogroup" aria-label="Moi Book design">${BKSTY.map(([k,l,d])=>`<button type="button" role="radio" class="bk-style-b ${st===k?'on':''}" data-act="bkStyle" data-v="${k}" aria-checked="${st===k}"><span class="bk-sw ${k}" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span><b>${l}${k==='premium'?' <span class="pill ok" style="font-size:.64rem;vertical-align:1px">Default</span>':''}</b><small>${d}</small></span></button>`).join('')}</div></div>`}
ACT.bkStyle=b=>{book.style=b.dataset.v;if(curEv){curEv.bookStyle=book.style;save()}document.querySelectorAll('.bk-style-b').forEach(x=>{const on=x.dataset.v===book.style;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});bookRefresh()};
const _bm56=bookModal;
bookModal=function(){if(curEv&&curEv.bookStyle)book.style=curEv.bookStyle;_bm56();
  const m=document.getElementById('bkModal');if(m&&!document.querySelector('.bk-style')){const body=m.parentElement.querySelector('.md-b');if(body)body.insertAdjacentHTML('afterbegin',bkStyleHtml())}};
Object.assign(TA,{'Book design · see the preview below':'புத்தக வடிவமைப்பு · கீழே முன்னோட்டம் பாருங்கள்','Premium':'பிரீமியம்','Classic':'கிளாசிக்','Default':'இயல்புநிலை','Sample entry':'மாதிரிப் பதிவு',
 'Same look as the ticket receipt: indigo and gold cover, dark table headings':'டிக்கெட் ரசீது போன்ற தோற்றம்: இண்டிகோ, தங்க நிற அட்டை, அடர் அட்டவணைத் தலைப்புகள்','Simple notebook look, light lines. Uses less printer ink':'எளிய நோட்டுப் புத்தகத் தோற்றம், மெல்லிய கோடுகள். குறைந்த மை செலவு',
 'Ticket · Premium':'டிக்கெட் · பிரீமியம்','Royal':'ராயல்','Kolam':'கோலம்','Heritage bill':'பாரம்பரிய பில்','Elegant':'எலிகண்ட்','Festive':'பண்டிகை','Modern dark':'மாடர்ன் டார்க்','Peacock':'மயில்','Jasmine':'மல்லிகை','Counter slip':'கவுண்டர் சீட்டு',
 'Indigo and gold ticket with photo, QR and every detail. Recommended':'புகைப்படம், QR, முழு விவரங்களுடன் இண்டிகோ-தங்க டிக்கெட். பரிந்துரை','Deep maroon with gold foil frame and a gold seal':'அடர் மெரூன், தங்க ஃபாயில் சட்டம், தங்க முத்திரை','Saffron temple arch on cream paper with kolam corners':'கிரீம் தாளில் காவி கோயில் வளைவு, கோலம் மூலைகள்','Old bill-book paper, ruled lines and a round stamp':'பழைய பில் புத்தகத் தாள், கோடுகள், வட்ட முத்திரை','Ivory and gold, wedding-card serif letters':'தந்தம்-தங்க நிறம், திருமண அழைப்பிதழ் எழுத்துகள்','Marigold garland and mango-leaf thoranam':'சாமந்தி மாலை, மாவிலைத் தோரணம்','Graphite and teal, looks sharp on a phone':'கிராஃபைட், டீல் நிறம், கைபேசியில் தெளிவாகத் தெரியும்','Teal, sapphire and gold peacock feathers':'டீல், நீலம், தங்க மயில் இறகுகள்','Calm green and white with small jasmine flowers':'அமைதியான பச்சை-வெள்ளை, சிறு மல்லிகைப் பூக்கள்','Narrow black-and-white slip for a thermal printer':'தெர்மல் பிரிண்டருக்கான குறுகிய கருப்பு-வெள்ளைச் சீட்டு'});


/* V57: layout fixes only (see css57.css) */


/* ================= V58: edit event → Team step can add, edit and remove helpers ================= */
function teamEditHtml(e){const as=S.eventUsers.filter(a=>a.event_id===e.id).map(a=>({a,u:S.users.find(x=>x.id===a.user_id)})).filter(x=>x.u&&x.u.role!=='admin');
  const roles=me.role==='admin'?[['collector',ROLE.collector],['manager',ROLE.manager]]:[['collector',ROLE.collector]];
  const cur=`<fieldset class="full msg-opt tm-cur"><div class="tm-h"><span class="lbl">People on this event / function</span><span class="tm-n">${as.length}</span></div>
   ${as.length?`<div class="tm-list">${as.map(({a,u})=>`<div class="tm-r" data-aid="${a.id}">
     <div class="tm-top"><span class="avatar ${avc(u.name)}">${ini(u.name)}</span><div class="tm-t"><b>${esc(u.name)}</b><small>${esc(ROLE[a.role]||a.role)} · ${esc(accessTxt(a))}${u.email||u.username?' · '+esc(u.email||u.username):''}</small></div>
       <div class="tm-btns"><button type="button" class="btn btn-ghost btn-sm" data-act="tmEdit" aria-expanded="false">${ic('edit',16)}<span>Edit</span></button><button type="button" class="icon-btn icon-sm tm-del" data-act="tmRm" aria-label="Remove ${esc(u.name)} from this event">${ic('trash',16)}</button></div></div>
     <div class="tm-gone" hidden>${ic('alert',16)}<span>${esc(u.name)} will be removed from this event when you save.</span><button type="button" class="btn btn-soft btn-sm" data-act="tmRm">Undo</button></div>
     <div class="tm-ed" hidden><div class="fields">${sel('Role','tm'+a.id+'_role',roles,a.role==='manager'&&me.role!=='admin'?'collector':a.role)}${accessFields('tm'+a.id,a.access)}${permFields('tm'+a.id,a.role,a.perm)}</div>
       <p class="small muted">Name, mobile and password are changed on the <b>Event / Function users</b> page.</p></div>
     <input type="hidden" id="tm${a.id}_rm" value="0"></div>`).join('')}</div>`:`<p class="muted tm-none">${ic('user',16)} No helpers yet. Only you collect Moi for this event / function.</p>`}</fieldset>`;
  const on=new Set(as.map(x=>x.u.id));
  let add=teamFields().replace(/<legend[^>]*>[\s\S]*?<\/legend>/,`<div class="tm-h"><span class="lbl">Add Moi Collector / Event Admin</span></div>`)
    .replace(/<div class="optcards">[\s\S]*?<\/div>\s*<div id="teamBox" class="stack" hidden/,`<input type="radio" name="n_team" value="team" checked hidden><div id="teamBox" class="stack"`)
    .replace(/<div class="team-exr"><label class="check"><input type="checkbox" name="t_ex" value="([^"]+)">[\s\S]*?<\/select><\/div>/g,(m,id)=>on.has(id)?'':m)
    .replace(/<div><span class="lbl">People already on Moi Point<\/span><div class="team-ex"><\/div><\/div>/,'')
    .replace('Add a new person','Add a new person (new login)');
  return cur+add}
ACT.tmEdit=b=>{const r=b.closest('.tm-r'),ed=r.querySelector('.tm-ed'),open=ed.hidden;ed.hidden=!open;b.setAttribute('aria-expanded',open);b.querySelector('span').textContent=open?'Close':'Edit';r.classList.toggle('open',open)};
ACT.tmRm=b=>{const r=b.closest('.tm-r'),h=r.querySelector('input[id$="_rm"]'),rm=h.value!=='1';h.value=rm?'1':'0';r.classList.toggle('rm',rm);r.querySelector('.tm-gone').hidden=!rm;r.querySelector('.tm-top').hidden=rm;if(rm)r.querySelector('.tm-ed').hidden=true};
{const _ew=eventWizard;eventWizard=function(e){let h=_ew(e);if(e)h=h.replace(teamSummary(e),teamEditHtml(e));return h}}
function readTeamEdit(f){const out=[];for(const r of f.querySelectorAll('.tm-r')){const aid=r.dataset.aid,px='tm'+aid,rm=f.querySelector('#'+px+'_rm').value==='1';
  if(rm){out.push({aid,rm:true});continue}const acc=readAccess(r,px);if(acc.err){r.querySelector('.tm-ed').hidden=false;return {err:acc.err}}
  out.push({aid,role:(r.querySelector('#'+px+'_role')||{}).value||'collector',access:acc,perm:readPerm(r,px)})}return {rows:out}}
{const _es=FORMS.evSave;FORMS.evSave=function(f){if(!f||!f.dataset||!f.dataset.edit||!f.querySelector('.tm-cur'))return _es.apply(this,arguments);
  const ev=S.events.find(x=>x.id===f.dataset.id);const te=readTeamEdit(f);if(te.err){ewSet(f,5);return bad(f,te.err[0],te.err[1])}
  const t=readTeam(f);if(t.err){ewSet(f,5);return bad(f,t.err[0],t.err[1])}
  {const pl=planOf(myAcc()),nh=te.rows.filter(x=>!x.rm).length+t.people.length+t.existing.length;if(pl&&nh>lim(pl.helpers))return limitHit('Helper limit',`Your plan allows ${pl.helpers} helper${pl.helpers>1?'s':''} per event / function. This would make ${nh}.`)}
  const res=_es.apply(this,arguments);if(document.body.contains(f)||!ev)return res;
  let n=0;te.rows.forEach(x=>{const a=S.eventUsers.find(y=>y.id===x.aid);if(!a)return;const u=S.users.find(y=>y.id===a.user_id)||{name:'Helper'};
    if(x.rm){S.eventUsers=S.eventUsers.filter(y=>y.id!==a.id);log(ev.id,'Updated',`Access removed for ${u.name}`);n++;return}
    const before=JSON.stringify([a.role,a.access,a.perm||null]);a.role=x.role;a.access=x.access;if(x.perm)a.perm=x.perm;if(JSON.stringify([a.role,a.access,a.perm||null])!==before){log(ev.id,'Updated',`${u.name} · ${ROLE[a.role]} · ${accessTxt(a)}`);n++}});
  t.people.forEach(p=>{const lk=p.link&&S.users.find(x=>x.id===p.link);const u=lk||{id:uid('u'),acc:me.acc,name:p.name,email:p.username,mobile:p.mobile,username:p.username,role:p.role,status:'active'};if(!lk){setPw(u,p.pw);S.users.push(u)}
    [ev.id,...p.others].forEach(eid=>grantEv(eid,u,p.role,eid===ev.id?p.access:{mode:'always'},p.perm||undefined));log(ev.id,lk?'Helper linked':'User created',`${u.name} · ${ROLE[p.role]}`);n++});
  t.existing.forEach(x=>{const u=S.users.find(y=>y.id===x.id);if(!u)return;grantEv(ev.id,u,x.role);log(ev.id,'Updated',`${u.name} given ${ROLE[x.role]} access`);n++});
  if(n){save();render();setTimeout(()=>toast(`Team updated · ${n} change${n>1?'s':''}`,'good'),900)}return res}}
Object.assign(TA,{'People on this event / function':'இந்த நிகழ்வு / விழாவில் உள்ளவர்கள்','Add Moi Collector / Event Admin':'மொய் வசூலிப்பாளர் / நிகழ்வு நிர்வாகியைச் சேர்','Add a new person (new login)':'புதிய நபரைச் சேர் (புதிய லாகின்)','Edit':'திருத்து','Close':'மூடு','Undo':'திரும்பப் பெறு',
 'No helpers yet. Only you collect Moi for this event / function.':'இன்னும் உதவியாளர் இல்லை. இந்த நிகழ்வுக்கு நீங்கள் மட்டுமே மொய் பெறுகிறீர்கள்.'});


/* ================= V59: delete a user from Staff & Access, Event Users, the edit-user window and the Master Admin ================= */
function userDelOk(u){const r=realMe();if(!u||!r||u.status==='deleted'||u.id===r.id||u.role==='admin'||u.role==='platform')return false;
  if(r.role==='platform')return true;return r.role==='admin'&&u.acc===r.acc}
function userDelDo(u){const r=realMe(),evs=S.eventUsers.filter(a=>a.user_id===u.id).map(a=>a.event_id);
  u.del={email:u.email||'',username:u.username||'',mobile:u.mobile||'',at:Date.now(),by:r?r.id:''};
  u.status='deleted';u.email='';u.username='deleted.'+u.id;u.mobile='';u.pw='';u.pwh='';
  S.eventUsers=S.eventUsers.filter(a=>a.user_id!==u.id);
  (evs.length?evs:[null]).forEach(eid=>log(eid,'Updated',`User deleted: ${u.name}`));save()}
ACT.userDel=b=>{const u=S.users.find(x=>x.id===b.dataset.id);if(!userDelOk(u))return toast('This login can’t be deleted here.','bad');
  const ne=new Set(S.eventUsers.filter(a=>a.user_id===u.id).map(a=>a.event_id)).size,nm=S.moi.filter(m=>m.collected_by===u.id).length;
  ask(`Delete ${esc(u.name)}?`,`<b>${esc(u.name)}</b> (${esc(u.email||u.username)}) will no longer be able to log in${ne?` and will be removed from ${ne} event${ne>1?'s':''} / function${ne>1?'s':''}`:''}.<br><br>${nm?`The ${nm} Moi entr${nm>1?'ies':'y'} they took stay in your books under their name. `:''}Their email and mobile number become free, so you can add them again later as a new user.<br><br><b>This cannot be undone.</b> To stop them only for now, use <b>Disable</b> instead.`,'Delete user',()=>{userDelDo(u);toast(`${u.name} deleted`,'good');render()})};
ACT.userUnlink=b=>{const u=S.users.find(x=>x.id===b.dataset.id),r=realMe();if(!u||!r)return;const mine=S.eventUsers.filter(a=>a.user_id===u.id&&(S.events.find(e=>e.id===a.event_id)||{}).acc===r.acc);
  ask(`Remove ${esc(u.name)}?`,`${esc(u.name)} uses their own Moi Point login, so it can’t be deleted. They will be removed from your ${mine.length} event${mine.length===1?'':'s'} / function${mine.length===1?'':'s'} and will no longer see them.`,'Remove from my events',()=>{const ids=new Set(mine.map(a=>a.id));S.eventUsers=S.eventUsers.filter(a=>!ids.has(a.id));mine.forEach(a=>log(a.event_id,'Updated',`Access removed for ${u.name}`));save();toast(`${u.name} removed from your events`,'good');render()})};
{const _ue=userEditModal;userEditModal=function(id){_ue(id);const u=S.users.find(x=>x.id===id);if(!userDelOk(u))return;const b=document.querySelector('form[data-form="userEdit"] .md-b');if(!b||b.querySelector('.del-zone'))return;
  b.insertAdjacentHTML('beforeend',`<div class="del-zone"><div><b>Delete this user</b><small>Removes the login and all event access. Moi entries they took are kept.</small></div><button type="button" class="btn btn-danger btn-sm" data-act="userDel" data-id="${u.id}">${ic('trash',16)}Delete user</button></div>`)}}
Object.assign(TA,{'Delete':'நீக்கு','Delete user':'பயனரை நீக்கு','Delete this user':'இந்தப் பயனரை நீக்கு','Remove':'நீக்கு','Remove from my events':'என் நிகழ்வுகளிலிருந்து நீக்கு','Removes the login and all event access. Moi entries they took are kept.':'லாகினும் எல்லா நிகழ்வு அணுகலும் நீக்கப்படும். அவர் பெற்ற மொய் பதிவுகள் அப்படியே இருக்கும்.'});


/* ================= V60: receipt QR link moipoint.in/r/<receipt no> opens the receipt check page ================= */
(function(){try{const m=location.pathname.match(/\/r\/(.+)$/);if(m){const c=decodeURIComponent(m[1]).replace(/\/+$/,'');history.replaceState(null,'',location.pathname.replace(/\/r\/.+$/,'/')+'#r/'+encodeURIComponent(c))}}catch(e){}})();

