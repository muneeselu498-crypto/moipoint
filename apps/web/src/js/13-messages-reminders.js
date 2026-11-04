/* ---------- sent messages: what was sent, to whom, and who has seen it ---------- */
/* WhatsApp reports sent → delivered → read; SMS reports sent → delivered only. In this prototype the reports arrive on a timer. */
const hsh=s=>{let x=0;for(const c of String(s))x=(x*31+c.charCodeAt(0))>>>0;x^=x>>>16;x=Math.imul(x,0x45d9f3b)>>>0;x^=x>>>16;x=Math.imul(x,0x45d9f3b)>>>0;x^=x>>>16;return x>>>0};
function rStat(L,r,now){now=now||Date.now();if(r.st==='queue')return {s:'wait',t:0,why:'Waiting for internet'};if(r.st==='credit')return {s:'wait',t:0,why:'Waiting for credits'};
  const x=hsh(L.id+r.mob+r.ch),age=(now-L.at)/1000;if(x%37===0)return {s:'fail',t:L.at+4000,why:'Number not on '+(r.ch==='wa'?'WhatsApp':'SMS')+' or switched off'};
  const dly=4+x%50;if(age<dly)return {s:'sent',t:L.at};const dAt=L.at+dly*1000;
  if(r.ch==='wa'){const willRead=(x>>>3)%100<72,rd=30+((x>>>9)%5400);if(willRead&&age>=rd)return {s:'read',t:L.at+rd*1000}}
  return {s:'dlv',t:dAt}}
const RST={read:['Seen','good'],dlv:['Delivered · not seen yet','info'],sent:['Sent','muted'],wait:['Waiting','warn'],fail:['Not delivered','bad']};
function msgPeople(L,now){const m=new Map();(L.recips||[]).forEach(r=>{let p=m.get(r.k);if(!p){p={k:r.k,nm:r.nm,mob:r.mob,ch:{}};m.set(r.k,p)}p.ch[r.ch]=rStat(L,r,now)});
  const rank={read:5,dlv:4,sent:3,wait:2,fail:1};return [...m.values()].map(p=>{const best=Object.values(p.ch).sort((a,b)=>rank[b.s]-rank[a.s])[0];p.s=best.s;p.t=best.t;return p})}
function msgSum(L){const ps=msgPeople(L),c={read:0,dlv:0,sent:0,wait:0,fail:0};ps.forEach(p=>c[p.s]++);c.n=ps.length||L.n;c.notSeen=c.dlv+c.sent;c.hasWa=(L.recips||[]).some(r=>r.ch==='wa');return c}
const mSample=x=>String(x.sample||String(x.text).replace(/{name}/g,x.recips&&x.recips[0]?String(x.recips[0].nm).split(' ')[0]:'Name'));
const mKind=x=>MSGK.find(k=>k[0]===x.kind)||['','Message','msg'];
const mWhen=t=>new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
function msgBar(c){const tot=c.n||1,seg=(k,cls)=>c[k]?`<i class="${cls}" style="width:${(c[k]/tot*100).toFixed(2)}%"></i>`:'';return `<div class="ms-bar" aria-hidden="true">${seg('read','r')}${seg('dlv','d')}${seg('sent','s')}${seg('wait','w')}${seg('fail','f')}</div>`}
function msgRow(x){const c=msgSum(x),k=mKind(x),rec=!!(x.recips&&x.recips.length);
  return `<button class="row-card ms-row" data-act="msgView" data-id="${x.id}" ${rec?'':'disabled'}><span class="tile-ic" style="margin:0">${ic(k[2],18)}</span><div class="rc-main"><b>${esc(k[1])} · ${c.n} guest${c.n===1?'':'s'}</b><small>${esc(mSample(x).slice(0,80))}${mSample(x).length>80?'…':''}</small>
    ${rec?`${msgBar(c)}<small class="ms-cnt">${c.hasWa?`<span class="g">${c.read} seen</span> · <span>${c.notSeen} not seen</span>`:`<span class="g">${c.read+c.dlv} delivered</span> · <span>${c.sent} sent</span>`}${c.wait?` · <span class="w">${c.wait} waiting</span>`:''}${c.fail?` · <span class="f">${c.fail} not delivered</span>`:''}</small>`:''}
    <small>${[x.ch,x.img?'Photo':'',x.video?'Video':'',(x.vlink||x.link)?'Link':''].filter(Boolean).join(' · ')} · ${mWhen(x.at)}</small></div>${rec?`<span class="ms-go">${ic('arrow',18)}</span>`:''}</button>`}
let msv={id:'',tab:'all'};
function msgView(id){const L=(S.msgLog||[]).find(x=>x.id===id);if(!L)return;msv.id=id;const now=Date.now(),ps=msgPeople(L,now),c=msgSum(L),k=mKind(L),ev=S.events.find(e=>e.id===L.ev);
  const tabs=[['all','All',ps.length],['read','Seen',c.read],['not','Not seen',c.notSeen],['prob','Waiting / not delivered',c.wait+c.fail]].filter(t=>t[0]!=='read'&&t[0]!=='not'||c.hasWa);
  const sel=ps.filter(p=>msv.tab==='all'||(msv.tab==='read'&&p.s==='read')||(msv.tab==='not'&&(p.s==='dlv'||p.s==='sent'))||(msv.tab==='prob'&&(p.s==='wait'||p.s==='fail')));
  const chip=(ch,st)=>`<span class="ms-ch ${st.s}">${ch==='wa'?'WhatsApp':'SMS'} · ${ch==='sms'&&st.s==='dlv'?'Delivered':RST[st.s][0].split(' · ')[0]}${st.s==='read'||st.s==='dlv'?' '+new Date(st.t).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}):''}</span>`;
  const firstName=ps[0]?String(ps[0].nm).split(' ')[0]:'Name',body=L.sample||String(L.text).replace(/{name}/g,firstName);
  openModal(`${mh(esc(k[1]),`${mWhen(L.at)}${ev?' · '+esc(ev.name):''}${L.by?' · sent by '+esc(L.by):''}`)}<div class="md-b stack" style="gap:16px">
    <div class="ms-stats">${(c.hasWa?[['read','Seen',c.read],['not','Not seen yet',c.notSeen]]:[['read','Delivered',c.read+c.dlv],['not','Sent',c.sent]]).concat([['prob','Waiting / not delivered',c.wait+c.fail]]).map(([t,l,v])=>`<button type="button" class="ms-st ${t}" data-act="msgTab" data-v="${t==='read'&&!c.hasWa?'all':t}"><b>${v}</b><span>${l}</span></button>`).join('')}<div class="ms-st n"><b>${c.n}</b><span>Guests</span></div></div>
    ${msgBar(c)}
    <p class="small muted">${L.ch} · ${(L.recips||[]).length} message${(L.recips||[]).length===1?'':'s'} · ${fmt((L.recips||[]).filter(r=>r.st==='sent').length*RATE())}${c.hasWa?' · “Seen” comes from WhatsApp read receipts. Guests who turned off read receipts show as Delivered.':' · SMS reports delivery only, not whether it was read.'}</p>
    <div><span class="lbl">Message</span><div class="cm-phone" style="margin-top:8px"><div class="xbubble">${L.img&&L.img!==1?`<img src="${L.img}" alt="Photo">`:L.img?`<div class="ms-media">${ic('image',18)} Photo</div>`:''}${L.video?`<div class="ms-media">${ic('video',18)} ${esc(L.video)}</div>`:''}<div>${esc(body)}</div>${L.vlink?`<a class="cm-lnk" href="${esc(L.vlink)}" target="_blank" rel="noopener">${ic('video',14)} ${esc(L.vlink)}</a>`:''}${L.link?`<a class="cm-lnk" href="${esc(L.link)}" target="_blank" rel="noopener">${ic('link',14)} ${esc(L.link)}</a>`:''}</div></div></div>
    <div class="stack" style="gap:10px"><div class="ms-tabs">${tabs.map(([t,l,v])=>`<button type="button" class="${msv.tab===t?'on':''}" data-act="msgTab" data-v="${t}">${l} <small>${v}</small></button>`).join('')}</div>
      <div class="ms-list">${sel.length?sel.map(p=>`<div class="ms-p"><span class="avatar ${avc(p.nm)}">${esc(ini(p.nm))}</span><div class="ms-pt"><b>${esc(p.nm)}</b><small>+91 ${fmtMob(p.mob)}</small><div class="ms-chs">${Object.entries(p.ch).map(([ch,st])=>chip(ch,st)).join('')}</div>${Object.values(p.ch).find(s=>s.why)?`<small class="ms-why">${esc(Object.values(p.ch).find(s=>s.why).why)}</small>`:''}</div><span class="ms-dot ${p.s}" title="${RST[p.s][0]}"></span></div>`).join(''):`<p class="small muted" style="padding:10px 0">No one here.</p>`}</div></div>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Close</button>${c.notSeen+c.wait+c.fail?`<button type="button" class="btn btn-primary" data-act="msgAgain" data-id="${L.id}">${ic('refresh',18)}Send again (${c.notSeen+c.wait+c.fail})</button>`:''}</div>`)}
function vMessages(evId){const ev=evId&&S.events.find(e=>e.id===evId),L=(S.msgLog||[]).filter(x=>x.acc===me.acc&&(!evId||x.ev===evId));const tot=L.reduce((a,x)=>{const c=msgSum(x);a.n+=c.n;a.read+=c.read;a.not+=c.notSeen;a.prob+=c.wait+c.fail;return a},{n:0,read:0,not:0,prob:0});
  return `<div class="page-head"><div><a class="link small" href="#${evId?'ev-'+evId+'-guests':'guests'}">${ic('back',14)} ${ev?'Guests of this event':'Guest list'}</a><h1>Messages sent</h1><p class="sub">Every invitation, update and thank-you you sent${ev?' for '+esc(ev.name):''}. Open one to see the message and who has seen it.</p></div>
    <div class="btn-row"><button class="btn btn-primary btn-sm" data-act="msgNew" data-ev="${evId||''}">${ic('msg',16)}Send message</button></div></div>
  <div class="g-stats"><div><span class="lbl">Messages</span><b>${L.length}</b><small>${tot.n} guests reached</small></div><div><span class="lbl">Seen</span><b>${tot.read}</b><small>WhatsApp read receipts</small></div><div><span class="lbl">Not seen yet</span><b>${tot.not}</b><small>${tot.prob?tot.prob+' waiting or not delivered':'delivered or on the way'}</small></div></div>
  <section class="card pad stack" style="gap:10px">${L.length?`<div class="rows">${L.map(msgRow).join('')}</div>`:`<div class="empty">${ic('msg',28)}<b>No messages yet</b><p class="muted">Send an invitation, an update or a thank-you from the guest list.</p></div>`}</section>`}

/* add or edit a guest by hand: the mobile number fills in what Moi Point already knows */
let ga={key:'',ev:''};
function gaFind(mob){const A=curAcc(),own=guestBook(A.id).find(g=>g.mobile===mob&&(g.entries.length||g.gid));if(own)return {own:true,g:own};
  {const pp=masterFind(mob);if(pp)return {own:false,g:{name:pp.name,place:pp.place||'',des:pp.des||'',address:pp.address||'',n:S.moi.filter(x=>x.c.mobile===mob).length}}}
  const m=S.moi.filter(x=>x.c.mobile===mob).sort((a,b)=>(b.c.updatedAt||b.created_at)-(a.c.updatedAt||a.created_at))[0];if(m)return {own:false,g:{name:m.c.name,place:m.c.place||'',des:m.c.designation||'',address:m.c.address||'',n:S.moi.filter(x=>x.c.mobile===mob).length}};
  const r=(S.guests||[]).find(x=>x.mobile===mob);if(r)return {own:false,g:{name:r.name,place:r.place||'',des:r.des||'',address:r.address||'',n:0}};return null}
function gaLookup(raw){const box=$('#found-ga'),f=$('#ga_mobile')&&$('#ga_mobile').form;if(!box||!f)return;const mob=normMob(raw);
  if(!mobOk(mob)){const sb0=f.querySelector('.md-f .btn-primary');if(sb0)sb0.disabled=false;f.querySelectorAll('[data-auto]').forEach(el=>{el.value='';delete el.dataset.auto});box.innerHTML=mob.length>=10?`<p class="small" style="color:var(--bad,#C62828)">${MOBERR}</p>`:'';box.dataset.mob='';return}if(box.dataset.mob===mob)return;box.dataset.mob=mob;
  f.querySelectorAll('[data-auto]').forEach(el=>{if(el.dataset.auto!==mob){el.value='';delete el.dataset.auto}});
  const hit=gaFind(mob),set=(id,v)=>{const el=f.querySelector('#ga_'+id);if(el&&v&&!el.value){el.value=v;el.dataset.auto=mob;el.classList.remove('invalid')}};
  if(!hit){box.innerHTML=`<div class="found new">${ic('user',18)}<div><b>New guest</b><br><small>This number is not on Moi Point yet. Fill in the details below.</small></div></div>`;return}
  const g=hit.g;if(!ga.key||!hit.own){set('name',g.name);set('place',g.place);set('des',g.des);set('addr',g.address)}
  const sb=f.querySelector('.md-f .btn-primary');if(sb)sb.disabled=false;
  if(hit.own&&g.key!==ga.key&&!g.hidden){if(sb)sb.disabled=true;const inE=ga.ev&&g.evs.includes(ga.ev),evN=ga.ev&&(S.events.find(e=>e.id===ga.ev)||{}).name;
    box.innerHTML=`<div class="found warn">${ic('alert',18)}<div><b>${esc(g.name)} is already in your guest list</b><br><small>${ga.key?'Another guest has this number. A number can belong to only one guest.':'A guest can be added only once.'}</small>${ga.ev?`<small style="display:block">${inE?`Already on the guest list of ${esc(evN)}.`:`Not on the guest list of ${esc(evN)} yet.`}</small>`:''}<div class="btn-row" style="margin-top:8px">${ga.ev&&!inE?`<button type="button" class="btn btn-primary btn-sm" data-act="gaToEv" data-key="${esc(g.key)}">${ic('plus',16)}Add to this event</button>`:''}<button type="button" class="btn btn-ghost btn-sm" data-act="gAdd" data-key="${esc(g.key)}">${ic('edit',16)}Edit this guest</button></div></div></div>`;return}
  box.innerHTML=hit.own&&g.hidden?`<div class="found">${ic('check',18)}<div><b>${esc(g.name)}</b>${g.place?' · '+esc(g.place):''}<br><small>Removed from your list earlier. Saving brings them back.</small></div></div>`
    :`<div class="found">${ic('check',18)}<div><b>${esc(g.name)}</b>${g.place?' · '+esc(g.place):''}<br><small>${hit.own?'Your guest.':`Found on Moi Point${g.n?` · gave Moi at ${g.n} function${g.n>1?'s':''}`:''}. Details are filled in; change anything that is different.`}</small></div></div>`}
function guestAddModal(o){o=o||{};ga={key:o.key||'',ev:o.ev||''};const g=ga.key?myGuests().find(x=>x.key===ga.key):null,evs=S.events.filter(e=>e.acc===me.acc&&manages(e.id)&&e.status!=='void').sort((a,b)=>b.date.localeCompare(a.date)),grps=myGroups();
  const inEv=id=>g?g.evs.includes(id):id===ga.ev,inGrp=x=>g?x.keys.includes(g.key):o.grp===x.id;
  openModal(`${mh(g?'Edit guest':'Add guest',g?esc(g.name):'Type the mobile number first. If they are on Moi Point, the details fill in by themselves.')}<form data-form="guestAdd" novalidate><div class="md-b stack" style="gap:14px"><div class="fields">
    ${fld('Mobile number','ga_mobile','tel',false,g?g.mobile:'','inputmode="numeric" maxlength="10" placeholder="10-digit mobile"','full')}
    <div class="full" id="found-ga">${g&&g.entries.length?`<p class="small muted">${g.entries.length} Moi recorded with this guest. Their Moi history stays as it is.</p>`:''}</div>
    ${fld('Name','ga_name','text',true,g?g.name:'','autocomplete="off" placeholder="Guest name"','full')}
    ${sel('Relationship','ga_rel',RELS,g&&g.rel?g.rel:'Relative')}
    ${acFld('Place','ga_place','place','e.g. Madurai')}
    ${acFld('Designation','ga_des','des','e.g. Teacher')}
    ${fld('Address','ga_addr','text',false,g?g.address:'','autocomplete="off" placeholder="Door no, street, town"','full')}
    <label class="field full" for="ga_notes"><span>Notes</span><textarea id="ga_notes" rows="2" placeholder="e.g. Bride’s uncle · coming with family of 4">${esc(g&&g.notes||'')}</textarea></label></div>
    ${evs.length?`<fieldset class="g-pick"><legend class="lbl">Add to the guest list of</legend><div class="g-pick-l">${evs.map(e=>{const has=g&&g.entries.some(m=>m.event_id===e.id);return `<label class="check"><input type="checkbox" name="ga_ev" value="${e.id}" ${inEv(e.id)?'checked':''}> ${esc(e.name)} <small class="muted">${dfmt(e.date)}${has?' · gave Moi':''}</small></label>`}).join('')}</div><p class="small muted">Every guest is also in your common guest list. Untick an event to take them off that event’s list only.</p></fieldset>`:''}
    ${grps.length?`<fieldset class="g-pick"><legend class="lbl">Groups</legend><div class="g-pick-l">${grps.map(x=>`<label class="check"><input type="checkbox" name="ga_grp" value="${x.id}" ${inGrp(x)?'checked':''}> ${esc(x.name)} <small class="muted">${x.keys.length}</small></label>`).join('')}</div></fieldset>`:''}
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${ic('check',18)}${g?'Save guest':'Add guest'}</button></div></form>`);
  if(g){const f=$('#modal form');[['place',g.place],['des',g.des]].forEach(([k,v])=>{const el=f.querySelector('#ga_'+k);if(el&&v)el.value=v})}
  setTimeout(()=>{const el=$(g?'#ga_name':'#ga_mobile');if(el)el.focus()},30)}
function saveGuestRec(o){S.guests=S.guests||[];const key=gKey(o.mobile,o.name);let r=S.guests.find(x=>x.acc===me.acc&&(o.id?x.id===o.id:gKey(x.mobile,x.name)===key));
  if(!r){r={id:uid('g'),acc:me.acc,evs:[],at:Date.now(),by:me.name};S.guests.push(r)}
  ['mobile','name','place','des','rel','address','notes'].forEach(k=>{if(o[k]!=null)r[k]=o[k]});if(o.evs){r.evs=[...new Set([...(o.keepEvs?r.evs:[]),...o.evs])];r.hideEvs=r.hideEvs||{};o.evs.forEach(id=>{delete r.hideEvs[id]})}
  if(r.hidden){r.hidden=false;delete r.hiddenAt}if(!o.link){r.at=Date.now();try{pplPut({...r},'guest',r.at)}catch(_){}}return r}
/* the guest record behind a guest, made without changing their details */
function gRecOf(g){S.guests=S.guests||[];let r=g.gid&&S.guests.find(x=>x.id===g.gid);if(!r){r={id:uid('g'),acc:me.acc,mobile:g.mobile||'',name:g.name,evs:[],at:0,by:me.name};S.guests.push(r)}return r}
const gEvCtx=()=>{const m=location.hash.match(/^#ev-([^-]+)-guests/);return m?m[1]:''};
/* remove: from one event only, or from the common list and every event and group */
let gdel={keys:[],ev:''};
function gDelModal(keys,evId){gdel={keys,ev:evId||''};const gs=myGuests().filter(g=>keys.includes(g.key)),n=gs.length,ev=evId&&S.events.find(e=>e.id===evId),one=n===1?esc(gs[0].name):`${n} guests`,moi=gs.some(g=>g.entries.length);
  openModal(`${mh(n===1?`Remove ${esc(gs[0].name)}?`:`Remove ${n} guests?`,ev?'Choose where to remove from':'')}<div class="md-b stack" style="gap:12px">
    ${ev?`<div class="gdel-opts"><button type="button" class="gdel-o" data-act="gDelGo" data-all="0">${ic('cal',20)}<span><b>Only from this event</b><small>${one} leave${n===1?'s':''} the guest list of ${esc(ev.name)} and its groups. They stay in your common guest list and other events.</small></span></button>
      <button type="button" class="gdel-o bad" data-act="gDelGo" data-all="1">${ic('trash',20)}<span><b>From the common list and every event</b><small>${one} ${n===1?'is':'are'} removed from your common guest list, all event guest lists and all groups.</small></span></button></div>`
    :`<p>${one} ${n===1?'is':'are'} removed from your common guest list, from every event’s guest list and from all groups.</p>`}
    ${moi?`<p class="small muted">${ic('alert',14)} Moi entries stay in the Moi list, reports and Moi Book. If they give Moi again, they come back to the list.</p>`:''}
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button>${ev?'':`<button type="button" class="btn btn-danger" data-act="gDelGo" data-all="1">${ic('trash',18)}Remove</button>`}</div>`)}
function gDelDo(all){const gs=myGuests().filter(g=>gdel.keys.includes(g.key)),evId=gdel.ev,now=Date.now();
  gs.forEach(g=>{if(all){if(g.gid&&!g.entries.length)S.guests=S.guests.filter(r=>r.id!==g.gid);else{const r=gRecOf(g);r.hidden=true;r.hiddenAt=now;r.evs=[];r.hideEvs={}}S.ggroups.forEach(x=>{x.keys=x.keys.filter(k=>k!==g.key)})}
    else{const r=gRecOf(g);r.evs=(r.evs||[]).filter(id=>id!==evId);if(g.entries.some(m=>m.event_id===evId)){r.hideEvs=r.hideEvs||{};r.hideEvs[evId]=now}S.ggroups.filter(x=>x.ev===evId).forEach(x=>{x.keys=x.keys.filter(k=>k!==g.key)})}
    gst.sel.delete(g.key)});
  log(all?null:evId,'Guest removed',`${gs.length} guest${gs.length===1?'':'s'}${all?' · all lists':' · '+((S.events.find(e=>e.id===evId)||{}).name||'')}`);save();closeModal();toast(all?`${gs.length===1?gs[0].name:gs.length+' guests'} removed from all guest lists`:`${gs.length===1?gs[0].name:gs.length+' guests'} removed from this event`,'good');render()}

/* groups */
function groupModal(id,evId,withSel){const x=id&&myGroups().find(g=>g.id===id),evs=S.events.filter(e=>e.acc===me.acc&&manages(e.id)&&e.status!=='void');const n=withSel?[...gst.sel].length:0;
  openModal(`${mh(x?'Rename group':'New group',x?esc(x.name):'Keep guests together and message them in one go.')}<form data-form="group" data-id="${x?x.id:''}" data-sel="${withSel?1:''}"><div class="md-b stack" style="gap:14px"><div class="fields">
    ${fld('Group name','gp_name','text',true,x?x.name:'','autocomplete="off" placeholder="e.g. Bride’s side, Office friends"','full')}
    ${sel('For which event?','gp_ev',[['','Any function · my own group'],...evs.map(e=>[e.id,e.name+' · '+dfmt(e.date)])],x?x.ev||'':(evId||''),'full')}</div>
    <p class="small muted">A group for an event also puts its guests on that event’s guest list.</p>
    ${n?`<div class="note info">${ic('users',20)}<div><b>${n} selected guest${n===1?'':'s'} will be added</b><p>You can add more later from the guest list.</p></div></div>`:''}
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${ic('check',18)}${x?'Save':'Make group'}</button></div></form>`)}
function grpAdd(grp,keys){keys.forEach(k=>{if(!grp.keys.includes(k))grp.keys.push(k)});if(grp.ev)evPush(grp.ev,keys)}
function evPush(evId,keys){const gs=myGuests().filter(g=>keys.includes(g.key));gs.forEach(g=>{if(!g.evs.includes(evId))saveGuestRec({id:g.gid,mobile:g.mobile,name:g.gid?undefined:g.name,evs:[evId],keepEvs:1,link:1})})}
function pushModal(to){const n=[...gst.sel].length,grps=myGroups(),evs=S.events.filter(e=>e.acc===me.acc&&manages(e.id)&&e.status!=='void').sort((a,b)=>b.date.localeCompare(a.date));
  openModal(`${mh(to==='grp'?'Add to group':'Add to event guest list',`${n} guest${n===1?'':'s'} selected`)}<form data-form="gPush" data-to="${to}"><div class="md-b stack" style="gap:14px"><div class="fields">
    ${to==='grp'?`${sel('Group','gpu_grp',[...grps.map(x=>[x.id,x.name+' · '+x.keys.length]),['new','+ New group']],grps[0]?grps[0].id:'new','full')}<div class="full" id="gpu_newbox" ${grps.length?'hidden':''}>${fld('New group name','gpu_name','text',false,'','autocomplete="off" placeholder="e.g. Office friends"')}</div>`
    :sel('Event','gpu_ev',evs.map(e=>[e.id,e.name+' · '+dfmt(e.date)]),curEv?curEv.id:(evs[0]||{}).id,'full')}</div>
    <p class="small muted">${to==='grp'?'They stay in your common guest list too.':'They join that event’s guest list, so you can message them about that function.'}</p>
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${ic('check',18)}Add ${n}</button></div></form>`)}

/* messages: invitation, reception, maruveedu, any update or thank you · text, photo, video and link · WhatsApp and/or SMS */
const MSGK=[['invite','Invitation','mail'],['reception','Reception','users'],['maruveedu','Maruveedu','home'],['update','Function update','bell'],['thanks','Thank you','heart'],['custom','Own message','edit']];
const MSGT={
 invite:{ta:'வணக்கம் {name}! எங்கள் {event} விழாவுக்கு உங்களை அன்புடன் அழைக்கிறோம். நாள்: {date}, நேரம்: {time}. இடம்: {venue}. உங்கள் வருகையை எதிர்பார்க்கிறோம். — {org}',en:'Hello {name}! You are warmly invited to our {event} on {date} at {time}, {venue}. We look forward to seeing you. — {org}'},
 reception:{ta:'வணக்கம் {name}! {event} வரவேற்பு நிகழ்ச்சி {when} அன்று {where}-ல் நடைபெறும். குடும்பத்துடன் வந்து மணமக்களை வாழ்த்துங்கள். — {org}',en:'Hello {name}! The reception for {event} is on {when} at {where}. Please come with your family and bless the couple. — {org}'},
 maruveedu:{ta:'வணக்கம் {name}! {event} மறுவீடு விருந்து {when} அன்று {where}-ல் நடைபெறும். அன்புடன் அழைக்கிறோம். — {org}',en:'Hello {name}! The Maruveedu feast for {event} is on {when} at {where}. You are warmly invited. — {org}'},
 update:{ta:'வணக்கம் {name}! {event} பற்றிய தகவல்: {when}, {where}. தவறாமல் வாருங்கள். — {org}',en:'Hello {name}! An update about {event}: {when}, {where}. Hope to see you there. — {org}'},
 thanks:{ta:'வணக்கம் {name}! எங்கள் {event} விழாவுக்கு வந்து வாழ்த்தியதற்கும் உங்கள் அன்புக்கும் மனமார்ந்த நன்றி. — {org}',en:'Hello {name}! Thank you for coming to our {event} and for your love and blessings. — {org}'},
 custom:{ta:'வணக்கம் {name}! ',en:'Hello {name}! '}};
const INVT=MSGT.invite;
let inv={aud:'sel',keys:[],ev:'',grp:'',kind:'invite',lg:'',wa:true,sms:false,text:'',when:'',where:'',img:null,video:null,vname:'',vlink:'',link:''};
const MSGW=['reception','maruveedu','update'];
const cmLinks=()=>`${inv.vlink?`<a class="cm-lnk" id="inv_pv" href="${esc(inv.vlink)}" target="_blank" rel="noopener">${ic('video',14)} ${esc(inv.vlink)}</a>`:''}${inv.link?`<a class="cm-lnk" id="inv_pl" href="${esc(inv.link)}" target="_blank" rel="noopener">${ic('link',14)} ${esc(inv.link)}</a>`:''}`;
function msgOpen(o){const prev=inv;inv={aud:'sel',keys:[],ev:curEv?curEv.id:'',grp:'',kind:'invite',lg:'',wa:true,sms:false,text:'',when:'',where:'',img:null,video:null,vname:'',vlink:'',link:'',...o};if(prev.video&&prev.video!==inv.video)try{URL.revokeObjectURL(prev.video)}catch(_){}inviteModal()}
function msgGuests(){if(inv.aud==='ev')return myGuests(inv.ev).filter(g=>g.mobile);if(inv.aud==='grp'){const x=myGroups().find(g=>g.id===inv.grp);return x?myGuests().filter(g=>x.keys.includes(g.key)&&g.mobile):[]}if(inv.aud==='all')return myGuests().filter(g=>g.mobile);return myGuests().filter(g=>inv.keys.includes(g.key)&&g.mobile)}
function msgSave(){const v=id=>{const el=$('#'+id);return el?el.value:null};['text','when','where','link','vlink'].forEach(k=>{const x=v('inv_'+k);if(x!=null)inv[k]=x});const g=v('inv_grp');if(g!=null)inv.grp=g;const e=v('inv_ev');if(e!=null)inv.ev=e;const w=$('#inv_wa'),s=$('#inv_sms');if(w)inv.wa=w.checked;if(s)inv.sms=s.checked}
function inviteModal(){const evs=S.events.filter(e=>e.acc===me.acc&&manages(e.id)&&e.status!=='void').sort((a,b)=>b.date.localeCompare(a.date)),ev=S.events.find(e=>e.id===inv.ev)||evs.find(e=>e.date>=today())||evs[0];inv.ev=ev?ev.id:'';
  const grps=myGroups();if(inv.aud==='grp'&&!grps.some(x=>x.id===inv.grp))inv.grp=grps[0]?grps[0].id:'';
  const lg=inv.lg||(ev&&evLang(ev)==='en'?'en':'ta');inv.lg=lg;
  if(!inv.when&&ev)inv.when=ev.date+'T'+(ev.start||'10:00');if(!inv.where&&ev)inv.where=[ev.venue,ev.address].filter(Boolean).join(', ');
  const tpl=inv.text||(MSGT[inv.kind]||MSGT.custom)[lg],gs=msgGuests(),n=gs.length,ch=(inv.wa?1:0)+(inv.sms?1:0),cost=n*ch,first=gs[0],media=inv.img||inv.video||inv.vlink;
  const whenTxt=()=>{const w=String(inv.when||'');if(!w)return '';const [d,t]=w.split('T');return [d?dfmt(d):'',t?tfmt(t):''].filter(Boolean).join(', ')};
  const fill=(t,g)=>t.replace(/{name}/g,g?String(g.name).split(' ')[0]:'Name').replace(/{event}/g,ev?ev.name:'').replace(/{date}/g,ev?dfmt(ev.date):'').replace(/{time}/g,ev?tfmt(ev.start):'').replace(/{venue}/g,ev?[ev.venue,ev.address].filter(Boolean).join(', '):'').replace(/{org}/g,ev?(ev.organizer||me.name):me.name).replace(/{when}/g,whenTxt()).replace(/{where}/g,inv.where||'');
  const one=inv.aud==='one',selN=myGuests().filter(g=>inv.keys.includes(g.key)&&g.mobile).length,evN=myGuests(inv.ev).filter(g=>g.mobile).length,allN=myGuests().filter(g=>g.mobile).length;
  const aud=one?`<div class="found">${ic('user',18)}<div><b>${esc(first?first.name:'')}</b><br><small>${first?'+91 '+fmtMob(first.mobile):'No mobile number'}</small></div></div>`
    :`<div class="cm-aud">${[['sel',`Selected guests`,selN,!inv.keys.length],['ev','Guests of the event',evN,!ev],['grp','A group',grps.length?((grps.find(x=>x.id===inv.grp)||grps[0]).keys.length):0,!grps.length],['all','All my guests',allN,false]].map(([k,l,c,dis])=>`<button type="button" class="cm-a ${inv.aud===k?'on':''}" data-act="cmAud" data-v="${k}" ${dis?'disabled':''}><b>${l}</b><small>${dis&&k==='grp'?'No groups yet':c+' with mobile'}</small></button>`).join('')}</div>
      ${inv.aud==='grp'&&grps.length?`<div class="fields">${sel('Group','inv_grp',grps.map(x=>[x.id,x.name+' · '+x.keys.length]),inv.grp,'full')}</div>`:''}`;
  openModal(`${mh('Send message',`${n} guest${n===1?'':'s'} with a mobile number`)}<form data-form="invite" class="cm"><div class="md-b stack" style="gap:16px">
    <div class="cm-sec"><span class="lbl">1 · Who gets it</span>${aud}</div>
    <div class="cm-sec"><span class="lbl">2 · What is it about</span><div class="fields">${sel('Function','inv_ev',evs.map(e=>[e.id,`${e.name} · ${dfmt(e.date)}`]),inv.ev,'full')}</div>
      <div class="cm-kinds">${MSGK.map(([k,l,i])=>`<button type="button" class="cm-k ${inv.kind===k?'on':''}" data-act="cmKind" data-v="${k}">${ic(i,18)}<span>${l}</span></button>`).join('')}</div>
      ${MSGW.includes(inv.kind)?`<div class="fields"><label class="field" for="inv_when"><span>${inv.kind==='update'?'Date and time':'When'}</span><input id="inv_when" type="datetime-local" value="${esc(inv.when)}"></label><label class="field" for="inv_where"><span>Where</span><input id="inv_where" type="text" value="${esc(inv.where)}" placeholder="Hall, town"></label></div>`:''}</div>
    <div class="cm-sec"><div class="row-between"><span class="lbl">3 · Message</span><div class="cm-lg">${[['ta','தமிழ்'],['en','English']].map(([k,l])=>`<button type="button" class="${lg===k?'on':''}" data-act="cmLang" data-v="${k}">${l}</button>`).join('')}</div></div>
      <label class="field" for="inv_text"><span>Message text</span><textarea id="inv_text" rows="5">${esc(tpl)}</textarea><small class="muted">{name}, {event}, {date}, {time}, {venue}, {when}, {where} and {org} are filled in for each guest.</small></label>
      <div class="cm-media">
        <label class="cm-m ${inv.img?'on':''}" for="inv_imgf">${ic('image',18)}<span>${inv.img?'Change photo':'Add photo'}</span><input type="file" id="inv_imgf" accept="image/*" hidden></label>
        <label class="cm-m ${inv.video?'on':''}" for="inv_vidf">${ic('video',18)}<span>${inv.video?'Change video':'Add video'}</span><input type="file" id="inv_vidf" accept="video/*" hidden></label>
        ${inv.img||inv.video?`<button type="button" class="cm-m" data-act="cmClear">${ic('x',18)}<span>Remove ${inv.img&&inv.video?'photo and video':inv.img?'photo':'video'}</span></button>`:''}</div>
      <div class="fields"><label class="field" for="inv_vlink"><span>Video link (optional)</span><input id="inv_vlink" type="url" inputmode="url" value="${esc(inv.vlink)}" placeholder="YouTube or Google Drive link"></label><label class="field" for="inv_link"><span>Link (optional)</span><input id="inv_link" type="url" inputmode="url" value="${esc(inv.link)}" placeholder="Location, live stream or album link"></label></div></div>
    <div class="cm-sec"><span class="lbl">4 · Send by</span><div class="optcards"><label class="optcard"><input type="checkbox" id="inv_wa" ${inv.wa?'checked':''}><span class="tile-ic" style="margin:0">${ic('msg',18)}</span><span><b>WhatsApp</b><small>Text, photo, video and link · ${fmt(RATE())} each</small></span></label><label class="optcard"><input type="checkbox" id="inv_sms" ${inv.sms?'checked':''}><span class="tile-ic" style="margin:0">${ic('phone',18)}</span><span><b>SMS</b><small>Text and links only · ${fmt(RATE())} each</small></span></label></div>
      ${inv.sms&&(inv.img||inv.video)?`<p class="small muted">${ic('alert',14)} SMS can’t carry a photo or video file. SMS guests get the text and the links.</p>`:''}</div>
    <div class="inv-prev"><span class="lbl">Preview${first?' for '+esc(first.name):''}</span><div class="cm-phone"><div class="xbubble" id="inv_bub">${inv.img?`<img src="${inv.img}" alt="Photo">`:''}${inv.video?`<video src="${inv.video}" controls playsinline preload="metadata"></video>`:''}<div id="inv_prev">${esc(fill(tpl,first))}</div><div id="inv_lnks">${cmLinks()}</div></div></div></div>
    <div class="note ${cost>S.wallet.credits?'warn':'info'}">${ic('wallet',20)}<div><b>${cost} credit${cost===1?'':'s'} · ${fmt(cost*RATE())}</b><p>${n} guest${n===1?'':'s'} × ${ch} channel${ch===1?'':'s'}. You have ${cr(S.wallet.credits)} credits.${cost>S.wallet.credits?' Buy credits first, or the rest will wait.':''}</p></div></div>
    ${n===1&&first?`<a class="btn btn-ghost btn-sm" style="align-self:flex-start" target="_blank" rel="noopener" href="https://wa.me/91${first.mobile}?text=${encodeURIComponent(fill(tpl,first)+[inv.vlink,inv.link].filter(Boolean).map(x=>'\n'+x).join(''))}">${ic('msg',16)}Or send from your own WhatsApp (free)</a>`:''}
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button>${cost>S.wallet.credits&&canBuy()?`<button type="button" class="btn btn-ghost" data-go="#credits">Buy credits</button>`:''}<button class="btn btn-primary" ${n&&ch?'':'disabled'}>${ic('msg',18)}Send to ${n}</button></div></form>`);
  inv._fill=fill}

/* ---------- reminders (account level, not inside an event) ---------- */
const BEFORE=[['0','On the day'],['1','1 day before'],['2','2 days before'],['7','1 week before']];
const myRem=()=>S.reminders.filter(r=>r.owner===me.id);
function remAt(r){const d=new Date(r.date+'T'+(r.at||'09:00')+':00');d.setDate(d.getDate()-(+r.before||0));return d}
const daysTo=d=>Math.round((new Date(d+'T00:00:00')-new Date(today()+'T00:00:00'))/864e5);
function remState(r){if(r.status==='done')return['Done','good'];const d=daysTo(r.date);return d<0?['Date passed','bad']:d===0?['Today','warn']:d===1?['Tomorrow','warn']:[`In ${d} days`,'info']}
const via=r=>['In app',r.via&&r.via.wa?'WhatsApp':'',r.via&&r.via.sms?'SMS':''].filter(Boolean).join(' + ');
function dateBox(d){const x=new Date(d+'T00:00:00'),n=daysTo(d);return `<div class="datebox ${n>=0&&n<=1?'hot':''}"><small>${x.toLocaleDateString('en-IN',{month:'short'})}</small><b>${x.getDate()}</b><small>${x.toLocaleDateString('en-IN',{weekday:'short'})}</small></div>`}
function remCard(r){const st=remState(r),m=r.moi&&S.moi.find(x=>x.id===r.moi),ra=remAt(r);
  return `<article class="rem-card ${r.status==='done'?'done':''}">${dateBox(r.date)}<div class="rc-main">
    <div class="rem-top"><b>${esc(r.title)}</b><span class="pill ${st[1]}">${st[0]}</span></div>
    <small>${esc(r.person)}${r.relationship?' · '+esc(r.relationship):''} · ${esc(r.type)}${r.place?' · '+esc(r.place):''}${r.time?' · '+tfmt(r.time):''}</small>
    <div class="rem-meta"><span class="rc-amt">${r.amount?fmt(r.amount):'Amount not set'}</span>${m?`<span class="tag">${ic('undo',13)}They gave ${fmt(m.amount)}</span>`:''}</div>
    <small>${ic('bell',13)} ${r.sent?'Reminded on':'Reminds you on'} ${ra.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}, ${ra.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})} · ${via(r)}${r.sent?' ✓':''}</small>
    ${r.desc?`<p class="small" style="margin-top:4px">${esc(r.desc)}</p>`:''}
    ${remCalRow(r)}<div class="btn-row" style="margin-top:10px">${r.status!=='done'?`<button class="btn btn-good btn-sm" data-act="remDone" data-id="${r.id}">${ic('check',16)}Mark done</button>`:''}<button class="btn btn-ghost btn-sm" data-act="remEdit" data-id="${r.id}">${ic('edit',16)}Edit</button><button class="btn btn-ghost btn-sm" data-act="remDel" data-id="${r.id}" aria-label="Delete reminder">${ic('trash',16)}</button></div>
  </div></article>`}
function remStrip(){const up=myRem().filter(r=>r.status!=='done').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  return `<section class="card pad"><div class="card-h"><h3 class="h-ic">${ic('cal',18)}Upcoming reminders</h3><div class="btn-row"><button class="link" data-act="remNew">+ Add</button><button class="link" data-go="#reminders">See all</button></div></div>
  ${up.length?`<div class="rem-strip">${up.map(r=>{const st=remState(r);return `<button class="rem-mini" data-go="#reminders">${dateBox(r.date)}<div class="rc-main"><b>${esc(r.title)}</b><small>${esc(r.person)} · ${r.amount?fmt(r.amount):'—'}</small><span class="pill ${st[1]}">${st[0]}</span></div></button>`}).join('')}</div>`:`<p class="muted small">No reminders yet. Add one when someone who gave you Moi has a function coming up.</p>`}</section>`}
function vReminders(){const all=myRem(),up=all.filter(r=>r.status!=='done').sort((a,b)=>a.date.localeCompare(b.date)),dn=all.filter(r=>r.status==='done').sort((a,b)=>b.date.localeCompare(a.date));
  const list=ui.remTab==='done'?dn:up,due=up.reduce((s,r)=>s+(+r.amount||0),0);
  return `<div class="page-head"><div><h1>Reminders</h1><p class="sub">Functions where you go to return Moi. These are yours, not tied to any one event.</p></div><button class="btn btn-primary" data-act="remNew">${ic('plus')}Add reminder</button></div>
  ${alertsBar()}
  <div class="tiles t3">${tile('Upcoming',up.length,'','cal')}${tile('In the next 30 days',up.filter(r=>daysTo(r.date)>=0&&daysTo(r.date)<=30).length,'','clock','--tint-cyan')}${tile('Moi to return',fmt(due),'Across upcoming reminders','undo','--tint-rose')}</div>
  <div class="seg" role="tablist"><button role="tab" class="${ui.remTab!=='done'?'on':''}" data-act="remTab" data-k="up">Upcoming (${up.length})</button><button role="tab" class="${ui.remTab==='done'?'on':''}" data-act="remTab" data-k="done">Done (${dn.length})</button></div>
  ${list.length?`<div class="rows">${list.map(remCard).join('')}</div>`:`<div class="card">${emptyBox(ui.remTab==='done'?'Nothing marked done yet':'No upcoming reminders','When someone who gave you Moi has a function, add it here so you don’t miss it.',`<button class="btn btn-primary btn-sm" data-act="remNew">Add reminder</button>`)}</div>`}`}
function remHint(mid){const m=mid&&S.moi.find(x=>x.id===mid);return m?`<div class="note good" style="padding:10px 12px">${ic('undo',16)}<span>They gave <b>${fmt(m.amount)}</b> at ${esc((S.events.find(e=>e.id===m.event_id)||{}).name)}</span></div>`:`<p class="small muted">Link a Moi to see what they gave you.</p>`}
function remModal(id,pre){
  const r=id?S.reminders.find(x=>x.id===id):{title:'',person:'',mobile:'',relationship:'',type:'Wedding',place:'',date:'',time:'',amount:'',moi:'',before:'1',at:'09:00',via:{wa:false,sms:false},desc:''};
  if(pre){const m=S.moi.find(x=>x.id===pre);if(m)Object.assign(r,{moi:m.id,person:m.c.name,mobile:m.c.mobile,relationship:m.c.relationship,place:m.c.place,amount:m.amount,title:m.c.name+'’s function'})}
  const ms=S.moi.filter(m=>OK(m)&&roleIn(m.event_id)).sort((a,b)=>a.c.name.localeCompare(b.c.name));
  openModal(`${mh(id?'Edit reminder':'Add reminder','Get reminded before you go to return Moi')}<form data-form="rem" data-id="${id||''}"><div class="md-b"><div class="fields">
    ${fld('Title','rm_title','text',true,r.title,'placeholder="e.g. Raj Kumar’s son’s wedding"','full')}
    ${sel('Linked Moi (optional)','rm_moi',[['','Not linked'],...ms.map(m=>[m.id,`${m.c.name} gave ${fmt(m.amount)} · ${(S.events.find(e=>e.id===m.event_id)||{}).name}`])],r.moi,'full')}
    <div class="full" id="rm_hint">${remHint(r.moi)}</div>
    ${fld('Whose function','rm_person','text',true,r.person,'placeholder="Name"')}${fld('Their mobile','rm_mobile','tel',false,r.mobile,'inputmode="numeric" maxlength="10"')}
    ${sel('Relationship','rm_rel',[['','Select'],...RELS],r.relationship)}${sel('Function type','rm_type',TYPES,r.type)}
    ${fld('Function date','rm_date','date',true,r.date)}${tfld('Function time','rm_time',r.time||'18:00')}
    ${fld('Place / venue','rm_place','text',false,r.place)}${fld('Amount to give (₹)','rm_amount','number',false,r.amount,'min="0" inputmode="numeric"')}
    ${sel('Remind me','rm_before',BEFORE,r.before)}${tfld('Reminder time','rm_at',r.at||'09:00')}
    <fieldset class="field full" style="border:0;padding:0;margin:0"><span>Remind me by</span><div class="chips">
      <label class="chip ck"><input type="checkbox" checked disabled> In app · free</label>
      <label class="chip ck"><input type="checkbox" id="rm_wa" ${r.via.wa?'checked':''}> WhatsApp · ${fmt(RATE())}</label>
      <label class="chip ck"><input type="checkbox" id="rm_sms" ${r.via.sms?'checked':''}> SMS · ${fmt(RATE())}</label></div>
      <small class="muted">WhatsApp and SMS go to your number${me.mobile?' '+esc(me.mobile):''} and use 1 credit each. Balance: ${cr(S.wallet.credits)} credits.</small>
      ${me.email?`<label class="check" style="margin-top:8px"><input type="checkbox" id="rm_cal" ${id&&!r.calSent?'':'checked'}> Also send a calendar invite to my email <b>${esc(me.email)}</b> (Google Calendar alerts on your phone)</label>`:''}</fieldset>
    ${area('Notes','rm_desc',r.desc)}
  </div></div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${id?'Save reminder':'Add reminder'}</button></div></form>`);
}
function processDue(){let ch=false;const now=new Date();
  S.reminders.forEach(r=>{if(r.status==='done'||r.sent||remAt(r)>now)return;r.sent=true;ch=true;const u=S.users.find(x=>x.id===r.owner)||{};
    const text=`Reminder: ${r.title} on ${dfmt(r.date)}${r.time?' at '+tfmt(r.time):''}.${r.amount?' Moi to give: '+fmt(r.amount)+'.':''}`;
    S.notifications.push({id:uid('n'),eid:null,owner:r.owner,channel:'In app',to:u.name||'',text,status:'Sent',at:Date.now()});
    if(r.via&&r.via.wa)sendMsg('WhatsApp',u.mobile,text,null,r.owner);if(r.via&&r.via.sms)sendMsg('SMS',u.mobile,text,null,r.owner)});
  if(ch)save()}
