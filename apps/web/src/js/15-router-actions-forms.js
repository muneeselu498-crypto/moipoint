/* ---------- router ---------- */
const VIEWS={guests:ev=>vGuests(ev.id),overview:vOverview,receive:vReceive,list:vList,expenses:vExpenses,payouts:vPayouts,payments:vPayments,users:vUsers,qr:vQR,reports:vReports,settings:vSettings};
function go(h){if(location.hash==='#'+h)render();else location.hash=h}
/* a void event is view-only: nothing can be added, changed or removed in it */
const VOID_ACT=new Set(['evArchive','evDel','evEdit','evActivate','expDel','expNew','flowNew','mode','kind','amt','markRet','unret','moiDel','moiEdit','paySim','payCancel','poDel','poNew','poEdit','poPurp','reject','verify','collected','teamAdd','teamDel','unassign','upiAcc','upiqrDel','userNew','logoRemove','phRemove','voiceTest','ekind','wzNext','wzGo','wzBack']);
const VOID_FORM=new Set(['assign','evSave','evVoid','exp','markRet','moi','moiEdit','moiVoid','paySet','po','reject']);
function evOfEl(el){const m=location.hash.match(/^#ev-([^-]+)-/);if(m)return S.events.find(e=>e.id===m[1]);const id=el&&el.dataset&&el.dataset.id;if(id){const mo=S.moi.find(x=>x.id===id);if(mo)return S.events.find(e=>e.id===mo.event_id);const ev=S.events.find(e=>e.id===id);if(ev)return ev}return null}
function voidBlocked(kind,name,el){if(!(kind==='a'?VOID_ACT:VOID_FORM).has(name))return false;const ev=evOfEl(el);if(!ev||ev.status!=='void')return false;
  toast('This event is void. You can only view it; nothing can be added or changed. Create a new event instead.','bad');return true}
function render(){
  try{ctxApply()}catch(_){}
  {let ts='';try{ts=localStorage.getItem(K+'-ts')||''}catch(_){}if(ts&&ts!==myTs)syncFromStore()}
  const h=location.hash.slice(1)||'home',root=$('#root');curEv=null;pubEv=null;processDue();try{if(!S.v45)mig45();if(!S.v46)mig46();if(!S.pplV45)pplSeed();if(evAuto())save();remRingCheck()}catch(e){console.error(e)}themeApply(h);try{autoBooks()}catch(e){}if(P().gwPlan&&gwApply())save();document.body.classList.remove('ev-void');
  if(me&&me.role!=='platform'&&myAcc()&&myAcc().status==='suspended'){me=null;try{localStorage.removeItem(SK);sessionStorage.removeItem(SK)}catch(e){}toast('This account is paused by Moi Point. Call support to reopen it.','bad')}
  if(me&&me.role!=='platform'&&myAcc()){walletSync(myAcc().wallet);grantMonthly(myAcc());
    if(isExpired(myAcc())&&!['plan','help'].includes(h)){if(me.role==='admin'){toast('Your free year has ended. Pay for the plan to open your events again.','bad');return go('plan')}me=null;try{localStorage.removeItem(SK);sessionStorage.removeItem(SK)}catch(e){}toast('This account’s plan has ended. Ask the owner to renew.','bad');return go('login')}}
  if(h.startsWith('pay-')){root.innerHTML=vPublic(h.slice(4));return after(h)}
  if(/^EV-?\d+$|^EV-\d{4}-\d+$/i.test(h)){root.innerHTML=vPublic(h);return after(h)}
  if(h==='home'||h==='pricing'){if(h==='pricing')return go('home');root.innerHTML=vLanding();after(h);lMount();return}
  if(h==='how'){root.innerHTML=vHow();after(h);lMount();return}
  if(h==='contact'){root.innerHTML=vContact();after(h);lMount();return}
  if(h==='blog'||/^blog[-\/]/.test(h)){root.innerHTML=vBlog(h==='blog'?'':h.slice(5));after(h);lMount();return}
  if(/^r\//.test(h)){root.innerHTML=vVerify(h.slice(2));return after(h)}
  if(h==='login'){if(me)return go(me.role==='platform'?'admin':'dashboard');root.innerHTML=vLogin();return after(h)}
  if(h==='forgot'){if(me)return go('dashboard');root.innerHTML=vForgot();return after(h)}
  if(h.startsWith('reset-')){root.innerHTML=vReset(h.slice(6));return after(h)}
  if(h==='signup'){if(me)return go('dashboard');root.innerHTML=vSignup();return after(h)}
  if(!me)return go('login');
  if(me.role==='platform'){if(!h.startsWith('admin'))return go('admin');root.innerHTML=MX.page(h);return after(h)}
  if(h.startsWith('admin'))return go('dashboard');
  if(h==='plan'&&me.role==='admin'){root.innerHTML=shell(null,'plan',vPlan());return after(h)}
  if(h==='help'){root.innerHTML=shell(null,'help',vHelp());return after(h)}
  if(h==='profile'){if(lastH!=='profile')delete imgBuf.pf_photo;root.innerHTML=shell(null,'profile',vProfile());return after(h)}
  if(h==='staff'&&me.role==='admin'){root.innerHTML=shell(null,'staff',vStaff());return after(h)}
  if(h==='audit'){root.innerHTML=shell(null,'audit',vAudit());return after(h)}
  if(h==='functions'){root.innerHTML=shell(null,'functions',vFunctions());return after(h)}
  if(h==='reminders'){root.innerHTML=shell(null,'reminders',vReminders());return after(h)}
  {const mm=h.match(/^messages(?:-(.+))?$/);if(mm){if(!(me&&(me.role==='admin'||S.events.some(e=>e.acc===me.acc&&manages(e.id)))))return go('dashboard');root.innerHTML=shell(null,'guests',vMessages(mm[1]||''));return after(h)}}
  if(h==='guests'){if(!(me.role==='admin'||S.events.some(e=>e.acc===me.acc&&manages(e.id))))return go('dashboard');root.innerHTML=shell(null,'guests',vGuests());return after(h)}
  if(h==='credits'&&canBuy()){root.innerHTML=shell(null,'credits',vCredits());return after(h)}
  const m=h.match(/^ev-([a-z0-9]+)-([a-z]+)$/);
  if(m){const ev=S.events.find(e=>e.id===m[1]);
    if(!ev||!roleIn(ev.id)){toast('You don’t have access to that event','bad');return go('dashboard')}
    if(!VIEWS[m[2]]||!can(ev.id,m[2]))return go(`ev-${ev.id}-overview`);
    curEv=ev;document.body.classList.toggle('ev-void',ev.status==='void');root.innerHTML=shell(ev,m[2],(takesMoi(ev)||m[2]==='receive'?'':evStopNote(ev))+VIEWS[m[2]](ev));return after(h)}
  if(h!=='dashboard')return go('dashboard');
  root.innerHTML=shell(null,'dashboard',vDash());after(h);obAuto();
}
function after(h){if(h!==lastH){window.scrollTo(0,0);lastH=h;if(vx.state)vxClose()}mountQR();if(/^guests$|^ev-[^-]+-guests$/.test(h))try{guestPrompt()}catch(_){}else gpShown='';try{vxDecorate()}catch(_){}}
function mountQR(scope){(scope||document).querySelectorAll('[data-qr]').forEach(el=>{if(el.dataset.done===el.dataset.qr)return;el.innerHTML='';const s=+el.dataset.size||160;
  if(window.QRCode){try{new QRCode(el,{text:el.dataset.qr,width:s,height:s,colorDark:'#15133B',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M})}catch(e){el.textContent='QR'}}else{el.innerHTML=`<div style="width:${s}px;height:${s}px;display:grid;place-items:center;color:#15133B;font-size:.8rem;line-height:1.3">QR preview unavailable offline</div>`}
  el.dataset.done=el.dataset.qr})}

/* ---------- modal, toast, clipboard ---------- */
function openModal(html,wide){$('#modal').innerHTML=`<div class="mb"><div class="md ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div></div>`;mountQR($('#modal'));const f=$('#modal input:not([readonly]),#modal select,#modal button');}
function closeModal(){$('#modal').innerHTML='';if(pendSync){pendSync=0;setTimeout(render,0)}}
function toast(msg,kind){const t=document.createElement('div');t.className='toast '+(kind||'');t.textContent=msg;$('#toast').appendChild(t);setTimeout(()=>t.remove(),2800)}
function ask(title,text,label,fn,danger=true){onConfirm=fn;openModal(`${mh(title)}<div class="md-b"><p>${text}</p></div><div class="md-f"><button class="btn btn-ghost" data-act="close">Cancel</button><button class="btn ${danger?'btn-danger':'btn-primary'}" data-act="confirmYes">${label}</button></div>`)}
function copy(text,label){
  const fb=()=>openModal(`${mh('Copy '+(label||'text'),'Select all and copy')}<div class="md-b"><textarea class="copybox" readonly>${esc(text)}</textarea></div>`);
  try{navigator.clipboard.writeText(text).then(()=>toast((label||'Text')+' copied')).catch(()=>{fb();setTimeout(()=>{const a=$('.copybox');a&&a.select()},50)})}catch(e){fb()}
}
const csv=rows=>rows.map(r=>r.map(c=>`"${String(c).replace(/<[^>]+>/g,'').replace(/"/g,'""')}"`).join(',')).join('\n');
function readImg(file,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,900/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};im.onerror=()=>toast('That file isn’t an image we can read. Try a JPG or PNG.','bad');im.src=r.result};r.readAsDataURL(file)}
/* keeps the original aspect ratio; only scales down very large files, never crops */
function readImgFull(file,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const W=im.naturalWidth,H=im.naturalHeight,k=Math.min(1,1400/Math.max(W,H));const c=document.createElement('canvas');c.width=Math.round(W*k);c.height=Math.round(H*k);const x=c.getContext('2d');const alpha=file.type==='image/png'||file.type==='image/webp';if(!alpha){x.fillStyle='#FFFFFF';x.fillRect(0,0,c.width,c.height)}x.drawImage(im,0,0,c.width,c.height);let t=0;if(alpha){try{const d=x.getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4*37)if(d[i]<240){t=1;break}}catch(_){}}cb({url:alpha?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.86),w:W,h:H,t})};im.onerror=()=>toast('That file isn’t an image we can read. Try a JPG or PNG.','bad');im.src=r.result};r.readAsDataURL(file)}
function bad(f,id,msg){const el=f.querySelector('#'+id);if(el){el.classList.add('invalid');el.focus();el.addEventListener('input',()=>el.classList.remove('invalid'),{once:true})}toast(msg,'bad')}

/* ---------- moi creation ---------- */
function createMoi(ev,c,amount,mode,status,meta,ctx){
  if(!takesMoi(ev))throw new Error('Event is '+ev.status+'; Moi can’t be received');
  S.seq++;ev.moiSeq=Math.max(+ev.moiSeq||0,S.moi.filter(x=>x.event_id===ev.id).length);let n=ev.moiSeq+1;while(S.moi.some(x=>x.code===moiNo(ev,n)))n++;ev.moiSeq=n;const m={id:uid('m'),code:moiNo(ev,n),device:DEV,pending:!online(),event_id:ev.id,c,amount,mode,status,utr:meta.utr||'',ref:meta.ref||'',gref:meta.gref||'',shot:meta.shot||null,date:meta.date||today(),time:meta.time||nowT(),collected_by:ctx==='staff'?me.id:'qr',created_at:Date.now(),upiAcc:meta.upiAcc!=null?meta.upiAcc:undefined,fee:meta.fee||0,feeBy:meta.feeBy||undefined,kind:meta.kind||'cash',gift:meta.gift||null,est:meta.est||0};
  S.moi.push(m);try{pplPut(moiPpl(m),'moi',m.created_at)}catch(_){}log(ev.id,'Moi added',`${amtTxt(m)} from ${c.name} · ${isItem(m)?kindT(m.kind,'en'):MODE[mode]}`);if(ctx==='public')qrNotify(ev,m);else notify(ev,m,status==='verified'?'verified':'received');save();return m;
}
function submitMoi(ctx,f){
  const px=ctx==='staff'?'m':'p',fl=flows[ctx],ev=S.events.find(e=>e.id===fl.eid);
  if(!takesMoi(ev))return toast((EVMSG[ev.status]||['This event isn’t taking Moi'])[0]+'. Moi can’t be received.','bad');
  {const pl=planOfEv(ev);if(entriesOf(ev.id)>=lim(pl.entries))return ctx==='staff'?limitHit('Moi entry limit',`This event has reached ${cr(pl.entries)} entries, the most your plan allows. Move to a bigger plan to keep recording.`):toast('This event can’t take more entries online. Please give your Moi at the counter.','bad')}
  if(accOfEv(ev)&&accOfEv(ev).status==='suspended')return toast('This event is paused. Please give your Moi at the counter.','bad');
  const v=id=>{const el=f.querySelector('#'+px+'_'+id);return el?el.value.trim():''};
  const c={name:v('name'),mobile:normMob(v('mobile')),relationship:(v('rel')==='Other'&&v('rel_o'))?v('rel_o'):v('rel'),place:v('place'),designation:v('des'),address:v('addr'),notes:v('notes')};
  if(v('rel')==='Other'&&!v('rel_o'))return bad(f,px+'_rel_o','Type the relationship');if(v('rel')==='Other')saveCustom('crel',v('rel_o'),accOfEv(ev));
  {const cb=f.querySelector('#'+px+'_consent');if(cb&&cb.checked){c.consent=true;c.consentAt=Date.now()}}
  const al=v('alt');if(al&&IBASE[evLang(ev)])c.alt={[evLang(ev)]:translit(al,evLang(ev))};
  const amount=Math.round(+v('amount'));
  if(ctx==='public'&&!mobOk(c.mobile))return bad(f,px+'_mobile',c.mobile?MOBERR:'Enter your mobile number. We send a code to confirm it.');
  if(!c.name)return bad(f,px+'_name','Enter the contributor’s name');
  if(c.mobile&&!mobOk(c.mobile))return bad(f,px+'_mobile',MOBERR);
  if(ctx==='public'&&fl.otpOk!==c.mobile&&!qrOk.has(ev.id+':'+c.mobile)){if(!(Math.round(+v('amount'))>0))return bad(f,px+'_amount','Enter an amount above ₹0');return qrOtp(ev,c.mobile,f)}
  if(px==='m'&&fl.kind&&fl.kind!=='cash'){if(!wzValid(f,2))return;
    const meta={date:v('date')||today(),time:v('time')||nowT(),ref:v('ref'),kind:fl.kind,gift:{grams:+v('grams')||'',purity:v('purity'),item:v('item'),qty:+v('qty')||1,photo:imgBuf.mitem||null},est:Math.round(+v('est'))||0};
    const m=createMoi(ev,c,0,'item','received',meta,ctx);announce(ev,m);imgBuf.mitem=null;fl.stage='done';fl.moiId=m.id;lastH='';return render()}
  if(!(amount>0))return bad(f,px+'_amount','Enter an amount above ₹0');
  const meta={date:v('date')||today(),time:v('time')||nowT(),ref:v('ref'),utr:v('utr')};
  if(fl.mode==='upi'&&!imgBuf[px+'shot']&&!meta.utr)return bad(f,px+'_utr','Attach the payment screenshot or type the UTR number');
  if(fl.mode==='online'&&!online())return toast('Online payment needs internet. Choose Cash or Offline UPI.','bad');
  if(fl.mode==='online'){fl.stage='pay';fl.draft={c,amount,meta};fl.payRef='PR'+Date.now().toString(36).toUpperCase();lastH='';return render()}
  const status=fl.mode==='cash'?(ctx==='staff'?'received':'tocollect'):'pending';
  if(ctx==='public')return mpGuestMoi(ev,c,amount,fl.mode,{utr:meta.utr,shot:fl.mode==='upi'?imgBuf[px+'shot']:null,upiAcc:fl.mode==='upi'?(fl.upiAcc||0):null});
  const m=createMoi(ev,c,amount,fl.mode,status,{...meta,shot:fl.mode==='upi'?imgBuf[px+'shot']:null,upiAcc:fl.mode==='upi'?(fl.upiAcc||0):null},ctx);
  announce(ev,m);
  imgBuf[px+'shot']=null;fl.stage='done';fl.moiId=m.id;lastH='';render();
}

/* ---------- actions ---------- */
const ACT={
  ewNext:b=>{const f=b.closest('form'),n=+f.dataset.step;if(!ewValid(f,n))return;if(n<5)return ewSet(f,n+1);FORMS.evSave(f,true)},
  ewBack:b=>{const f=b.closest('form'),n=+f.dataset.step;if(n<=1)return closeModal();ewSet(f,n-1)},
  rfmt:b=>{const md=$('.md');const top=md?md.scrollTop:0;receiptModal(b.dataset.id,b.dataset.l,b.dataset.f);const n=$('.md');if(n)n.scrollTop=top},
  userEdit:b=>userEditModal(b.dataset.id),
  staffCsv:()=>{const rows=[['Name','Username','Mobile','Email','Role','Status','Events and access']].concat(accUsers().map(u=>[u.name,u.username,u.mobile,u.email||'',ROLE[u.role],u.status,u.role==='admin'?'All events':S.eventUsers.filter(a=>a.user_id===u.id).map(a=>{const e=S.events.find(x=>x.id===a.event_id);return e?`${e.name} (${ROLE[a.role]}, ${accessTxt(a)})`:''}).join('; ')]));copy(rows.map(r=>r.map(c=>/[",\n]/.test(String(c))?'"'+String(c).replace(/"/g,'""')+'"':c).join(',')).join('\n'),`Copied ${rows.length-1} people. Paste into Excel or Google Sheets.`)},
  authTab:b=>{AUTH.tab='pw';render()},
  pwEye:b=>{const i=document.getElementById(b.dataset.for);if(!i)return;const sh=i.type==='password';i.type=sh?'text':'password';b.classList.toggle('on',sh);b.setAttribute('aria-label',sh?'Hide password':'Show password')},
  fpResend:()=>{if(Date.now()<fp.next)return;fpOtpSend()},fpMobBack:()=>{fp.step='mobile';fp.code='';render();fpFocus('fp_mob')},
  fpOther:()=>{fpClear();render()},fpLogin:()=>{AUTH.email=fp.u?fp.u.email:'';fpClear();go('login')},
  theme:()=>{const n=themeGet()==='dark'?'light':'dark';try{localStorage.setItem(THK,n)}catch(e){}document.documentElement.dataset.theme=n;render();toast(n==='dark'?'Dark screens on':'Light screens on')},
  bookAgain:b=>{const ev=S.events.find(e=>e.id===b.dataset.id);if(ev&&sendBook(ev,true)){save();render();toast('Moi Book PDF sent again on WhatsApp','good')}},
  qrSay:b=>{const m=S.moi.find(x=>x.id===b.dataset.id),ev=m&&S.events.find(e=>e.id===m.event_id);if(!m)return;qrSpoken.delete(m.id);qrSpeak(ev,m)},
  otpBack:()=>{AUTH.step='mobile';render()},otpResend:()=>sendOtp(AUTH.via),
  otpEmail:()=>{const u=userByMobile(AUTH.mobile);if(!u||!u.email)return toast('No email saved for this number','bad');AUTH.email=u.email;sendOtp('email')},
  planSwitch:b=>{const k='free',p=P().plans[k],A=myAcc();
    if(planCharges())openModal(`${mh('Pay for '+esc(p.name),'One year · everything unlimited')}<form data-form="planPay" data-k="${k}"><div class="md-b"><div class="optcards">
      <label class="optcard on"><input type="radio" name="pp_per" value="year" checked><span><b>${fmt(p.yearly)} / year</b><small>365 days · GST included</small></span></label></div>
      <p class="small muted">${A.plan===k&&!isExpired(A)?`Starts after your current period ends on ${dfmt(A.sub.end)}.`:'Starts today.'}</p>
      <div class="qr-box" data-qr="upi://pay?pa=moipoint@upi&pn=Moi%20Point&am=${p.yearly}&cu=INR&tn=${encodeURIComponent(p.name+' plan')}" data-size="150"></div><p class="small muted">Demo mode: tap below to simulate the payment.</p></div>
      <div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${ic('check',18)}Simulate payment success</button></div></form>`);
    else toast('The plan is free right now. Nothing to pay.')},
  tkOpen:b=>tkModal(b.dataset.id),
  lSl:b=>{const sl=b.closest('.lp-slider');lSlGo(sl,+sl.dataset.i+ +b.dataset.d)},lSlGo:b=>{const w=b.closest('[data-sw]');lSlGo(w&&w.querySelector('.lp-slider'),+b.dataset.v)},
  lGo:b=>{const m=$('#lnav');if(m)m.classList.remove('open');const t=b.dataset.to;go(t);window.scrollTo(0,0)},
  loRe:()=>{if(lo&&Date.now()>=lo.next)lOtpSend()},loBack:()=>{const o=lo;if(!o)return closeModal();clearInterval(o.t);if(o.form){closeModal();const i=o.form.querySelector('#ld_mobile');if(i){i.focus();i.select&&i.select()}}else{lLeadModal(o.kind,o.data.fn);const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.value=v};set('ll_name',o.data.name);set('ll_mobile',o.mobile);set('ll_city',o.data.city);set('ll_date',o.data.date);set('ll_msg',o.data.msg);const i=document.getElementById('ll_mobile');if(i)i.focus()}lo=null},
  lStPick:b=>{const v=b.dataset.v;try{localStorage.setItem(LSTKEY,v)}catch(e){}lLangPop(v)},lStSkip:()=>{try{localStorage.setItem(LSTKEY,'skip')}catch(e){}closeModal();if(UIL!=='en')ACT.setUiLang({dataset:{v:'en'}})},lStBack:()=>lStatePop(),
  lLgPick:b=>{const v=b.dataset.v;if(v===UIL){closeModal();return}ACT.setUiLang({dataset:{v}})},
  lDemo:b=>lLeadModal('demo',b&&b.dataset&&b.dataset.fn),lEnq:()=>lLeadModal('enq'),
  lBlog:()=>{const m=$('#lnav');if(m)m.classList.remove('open');go('blog');window.scrollTo(0,0)},lPolicyX:()=>{},lPost:b=>{go('blog/'+b.dataset.id);window.scrollTo(0,0)},
  lGal:b=>{const g=$('#lpGal');if(g)g.scrollBy({left:(+b.dataset.d)*Math.max(280,g.clientWidth*.7),behavior:'smooth'})},
  lPolicy:b=>{const p=LPOL[b.dataset.k];openModal(`${mh(p[0])}<div class="md-b"><p>${p[1]}</p></div><div class="md-f"><button class="btn btn-primary" data-act="close">Close</button></div>`)},
  qrPayNow:b=>{const fl=flows.public,m=S.moi.find(x=>x.id===b.dataset.id);if(!m||!fl)return;if(!online())return toast('Online payment needs internet.','bad');fl.mode='online';fl.payFor=m.id;fl.draft={c:m.c,amount:m.amount,meta:{}};fl.payRef='PR'+Date.now().toString(36).toUpperCase();fl.stage='pay';lastH='';render()},
  otpGo:b=>qrOtpCheck(),otpRe:()=>{const o=qo;if(!o)return;if(Date.now()<o.next)return;qrOtpSend()},otpChange:()=>{closeModal();const i=document.getElementById('p_mobile');if(i){i.focus();i.select&&i.select()}},
  wpCash:b=>{const m=S.moi.find(x=>x.id===b.dataset.id);if(!m)return;const ev=S.events.find(e=>e.id===m.event_id);m.mode='cash';m.status='received';m.collected_by=me.id;m.c.notes=[m.c.notes,'UPI not paid · cash taken at counter'].filter(Boolean).join(' · ');announce(ev,m);notify(ev,m,'received');log(m.event_id,'Updated',`Cash ${fmt(m.amount)} taken from ${m.c.name} instead of UPI · ${m.code}`);save();toast('Marked as Cash Received','good');render()},
  guestOpen:b=>guestModal(b.dataset.key),
  vxGo:b=>vxStart(b.dataset.px||'m',b.dataset.t||'all'),
  vxCancel:()=>vxClose(),
  vxDone:()=>vxFinish(),
  vxType:()=>{const r=vx.rec;vx.rec=null;if(r){r.onresult=r.onerror=r.onend=null;try{r.abort()}catch(_){}}clearTimeout(vx.timer);clearTimeout(vx.wd);vxReview(vx.text||'');setTimeout(()=>{const t=document.getElementById('vxr_said');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}},50)},
  vxUseFound:()=>{const g=vx.found;if(!g)return;const al=document.getElementById('m_alt'),lg=al&&al.dataset.lg;[['name',g.name],['place',g.place],['des',g.des],['native',g.alt&&lg&&g.alt[lg]]].forEach(([k,v])=>{const el=document.getElementById('vxr_'+k);if(el&&v)el.value=v});if(g.rel){const r=document.getElementById('vxr_rel');if(r)r.value=g.rel}},
  vxgGo:b=>vxgStart(b.closest('form')),
  vxgNext:()=>{vxgSave();vxStopEngine();vxg.i++;vxgStep()},
  vxgBack:()=>{vxgSave();vxStopEngine();vxg.i=Math.max(0,vxg.i-1);vxgStep()},
  vxgSkip:()=>{vxStopEngine();vxg.i++;vxgStep()},
  vxgReview:()=>vxgReview(),
  vxgRetry:()=>{vxStopEngine();vxg.i=0;vxgStep()},
  vxReparse:()=>{const t=document.getElementById('vxr_said');vxReview(t?t.value:'')},
  msgView:b=>{msv={id:b.dataset.id,tab:'all'};msgView(b.dataset.id)},
  msgTab:b=>{msv.tab=b.dataset.v;msgView(msv.id)},
  msgAgain:b=>{const L=S.msgLog.find(x=>x.id===b.dataset.id);if(!L)return;const keys=msgPeople(L).filter(p=>p.s!=='read').map(p=>p.k);closeModal();msgOpen({aud:'sel',keys,ev:L.ev||'',kind:L.kind,lg:L.lg||'',text:L.text,link:L.link||'',vlink:L.vlink||'',img:L.img&&L.img!==1?L.img:null,wa:/WhatsApp/.test(L.ch),sms:/SMS/.test(L.ch)})},
  gDel:b=>{const keys=b.dataset.key?[b.dataset.key]:[...gst.sel];if(!keys.length)return toast('Tick the guests first','bad');gDelModal(keys,b.dataset.ev||'')},
  gDelGo:b=>gDelDo(b.dataset.all==='1'),
  gaToEv:b=>{const ev=ga.ev,g=myGuests().find(x=>x.key===b.dataset.key);if(!ev||!g)return;evPush(ev,[g.key]);save();closeModal();toast(`${g.name} added to this event’s guest list`,'good');render()},
  gClear:()=>{gst.sel.clear();render()},
  gRemNew:b=>{const g=myGuests().find(x=>x.key===b.dataset.key);if(!g)return;const m=g.entries.slice().sort((a,b2)=>(b2.created_at||0)-(a.created_at||0))[0];closeModal();remModal(null,m&&m.id)},
  invite:b=>{const sc=b.dataset.scope,keys=sc==='one'?[b.dataset.key]:[...gst.sel];if(!keys.length)return toast('Tick the guests first','bad');msgOpen({aud:sc==='one'?'one':'sel',keys})},
  msgNew:b=>{const ev=b.dataset.ev||(curEv?curEv.id:''),grp=b.dataset.grp||'',keys=[...gst.sel];msgOpen({aud:grp?'grp':keys.length?'sel':ev?'ev':'all',keys,ev,grp})},
  cmAud:b=>{msgSave();inv.aud=b.dataset.v;inviteModal()},
  cmKind:b=>{msgSave();inv.kind=b.dataset.v;inv.text='';inviteModal()},
  cmLang:b=>{msgSave();inv.lg=b.dataset.v;inv.text='';inviteModal()},
  cmClear:()=>{msgSave();if(inv.video)try{URL.revokeObjectURL(inv.video)}catch(_){}inv.img=null;inv.video=null;inv.vname='';inviteModal()},
  gAdd:b=>guestAddModal({key:b.dataset.key||'',ev:b.dataset.ev||gEvCtx()||(curEv?curEv.id:''),grp:gst.grp}),
  grpNew:b=>groupModal(null,b.dataset.ev||'',false),
  grpEdit:b=>groupModal(b.dataset.id),
  grpPick:b=>{gst.grp=b.dataset.id;gst.sel.clear();render()},
  grpDel:b=>{const x=myGroups().find(g=>g.id===b.dataset.id);if(!x)return;ask('Delete this group?',`“${esc(x.name)}” will be removed. The ${x.keys.length} guests stay in your guest list.`,'Delete group',()=>{S.ggroups=S.ggroups.filter(g=>g.id!==x.id);gst.grp='';save();closeModal();toast('Group deleted');render()})},
  grpOut:b=>{const x=myGroups().find(g=>g.id===b.dataset.id);if(!x)return;const n=[...gst.sel].filter(k=>x.keys.includes(k)).length;x.keys=x.keys.filter(k=>!gst.sel.has(k));gst.sel.clear();save();toast(`${n} removed from ${x.name}`);render()},
  gPush:b=>{if(!gst.sel.size)return toast('Tick the guests first','bad');if(b.dataset.to==='grp'&&!myGroups().length)return groupModal(null,curEv?curEv.id:'',true);pushModal(b.dataset.to)},
  copyGuests:b=>{const list=myGuests(b.dataset.ev||null);const rows=[['Name','Mobile','Relation','Place','Work','Address','Moi count','Given to us','We returned','Last event']].concat(list.map(g=>[g.name,g.mobile,g.rel,g.place,g.des,g.address,g.entries.length,g.given,g.returned,(S.events.find(e=>e.id===g.lastEv)||{}).name||'']));
    copy(rows.map(r=>r.map(c=>{const s=String(c??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')).join('\n'),`Copied ${list.length} guests. Paste into Excel or Google Sheets.`)},
  sugPick:b=>{const px=b.closest('#found-p,[id^="ac-p_"]')?'p':'m';fillGuest(px,b.dataset.key)},
  acPick:b=>{const t=document.getElementById(b.dataset.for);if(!t)return;t.value=b.dataset.v;t.classList.remove('invalid');const box=document.getElementById('ac-'+t.id);if(box){box.hidden=true;box.innerHTML=''}
    const els=[...t.form.querySelectorAll('input:not([type=hidden]):not([readonly]),select,textarea')].filter(x=>x.offsetParent);const nx=els[els.indexOf(t)+1];if(nx)nx.focus()},
  tkClose:b=>{const t=P().tickets.find(x=>x.id===b.dataset.id);t.status='closed';log(null,'Support question closed',t.subject);save();closeModal();toast('Marked as solved');render()},
  annHide:b=>{me.dismissed=[...(me.dismissed||[]),b.dataset.id];save();render()},
  obHide:()=>{myAcc().onboard.hide=true;save();render()},
  impExit:()=>{const pid=impBy(),A=myAcc();log(null,'Support view closed',A?A.name:'');try{sessionStorage.removeItem('mp-imp');sessionStorage.setItem(SK,pid);localStorage.removeItem(SK)}catch(e){}me=S.users.find(u=>u.id===pid)||null;save();go('admin-accounts')},
  teamAdd:()=>{const box=$('#teamRows');if(!box)return;box.insertAdjacentHTML('beforeend',teamRow(teamN++));const r=box.lastElementChild;r.querySelector('input').focus()},
  teamDel:b=>{b.closest('.team-row').remove()},
  ampm:b=>{const w=b.closest('.tpick');w.querySelectorAll('.ampm button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});tpSync(w)},
  close:()=>closeModal(),
  confirmYes:()=>{const f=onConfirm;onConfirm=null;closeModal();f&&f()},
  scroll:b=>{if(location.hash.startsWith('#blog')){go('home');return setTimeout(()=>{const el=document.getElementById(b.dataset.to);el&&el.scrollIntoView()},60)}const el=document.getElementById(b.dataset.to);$('#lnav').classList.remove('open');el&&el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})},
  lmenu:()=>$('#lnav').classList.toggle('open'),
  smCopy:()=>{const t=document.getElementById('smx');if(!t)return;t.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(navigator.clipboard)navigator.clipboard.writeText(t.value).then(()=>toast('Copied'),()=>toast(ok?'Copied':'Select the text and copy it'));else toast(ok?'Copied':'Select the text and copy it')},
  pfPhotoDel:()=>{imgBuf.pf_photo=null;const p=document.getElementById('prev-pf_photo');if(p)p.textContent=ini(me.name);toast('Photo will be removed when you save details')},
  credX:()=>{const p=document.getElementById('credPop');if(p)p.remove()},
  lwf:b=>{ui.lwf=b.dataset.k;const w=$('#lwf');if(w){w.innerHTML=lwfHtml();try{mountQR(w)}catch(e){}const t=w.querySelector('.lwf-body');if(t&&b.closest('.lwf-copy'))w.scrollIntoView({behavior:'smooth',block:'start'});const tb=w.querySelector('.lwf-tabs .on');if(tb)tb.scrollIntoView({block:'nearest',inline:'center'})}},
  ctaManage:()=>go(me?(me.role==='platform'?'admin':'dashboard'):'signup'),
  demo:b=>{AUTH.tab='pw';render();setTimeout(()=>{$('#l_user').value=b.dataset.u;$('#l_pw').value=b.dataset.p},0)},
  forgot:()=>go('forgot'),
  forgotOld:()=>openModal(`${mh('Reset password','We’ll send a reset link to the registered mobile or email.')}<form data-form="forgot"><div class="md-b">${fld('Username, email or mobile','fp_id','text',true)}</div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">Send reset link</button></div></form>`),
  logout:()=>{log(null,'Logged out',me.name);save();me=null;ctxSet('');try{localStorage.removeItem(SK);sessionStorage.removeItem(SK)}catch(e){}closeModal();flows.staff=null;go('home')},
  account:()=>openModal(`${mh(esc(me.name),esc(me.email||me.username)+' · '+(me.role==='admin'?'Account owner':ROLE[me.role]))}<div class="md-b"><button class="pf-head" data-go="#profile"><span class="avatar">${me.photo?`<img src="${me.photo}" alt="">`:esc(ini(me.name))}</span><span><b>Edit my profile</b><small>Name, photo, email, password</small></span>${ic('arrow',18)}</button><div class="sheet-list">
    <button data-go="#dashboard">${ic('grid')}<div>${me.role==='admin'?'All events':'My events'}</div></button>
    ${me.role==='admin'?`<button data-go="#staff">${ic('users')}<div>Staff &amp; Access</div></button><button data-go="#plan">${ic('card')}<div>Plan &amp; usage<small>${esc(planOf(myAcc()).name)} plan</small></div></button>`:''}<button data-go="#audit">${ic('clock')}<div>Activity log</div></button><button data-go="#help">${ic('msg')}<div>Help &amp; support</div></button>
    ${me.role==='admin'?`<button data-go="#guests">${ic('users')}<div>Guest list<small>Everyone who gave Moi · invite them</small></div></button>`:''}<button data-go="#reminders">${ic('cal')}<div>Reminders</div></button>
    ${canBuy()?`<button data-go="#credits">${ic('wallet')}<div>Message credits<small>${cr(S.wallet.credits)} left · ${rateTxt()}</small></div></button>`:''}
    <button data-go="#home">${ic('home')}<div>Website</div></button>
    ${realMe().role==='admin'&&helperAs(realMe()).length?`<button data-act="ctxSwitch">${ic('users')}<div>Switch role<small>${me.__ctx?'Now: helper':'Now: event owner'}</small></div></button>`:''}<button data-act="resetDemo">${ic('undo')}<div>Reset sample data<small>Restore Kavi Birthday Function and the other demo events</small></div></button>
    <button data-act="logout">${ic('logout')}<div>Log out</div></button></div></div>`),
  resetDemo:()=>ask('Reset sample data?','All changes made in this browser will be replaced with the original sample events.','Reset data',()=>{S=seed();initState();if(me)me=S.users.find(u=>u.id===me.id)||null;save();flows.staff=flows.public=null;toast('Sample data restored');render()}),
  switcher:()=>{const evs=myEvents();openModal(`${mh('Switch event','Every record stays inside its own event.')}<div class="md-b"><div class="sheet-list">
    ${evs.map(e=>`<button class="${curEv&&curEv.id===e.id?'on':''}" data-go="#ev-${e.id}-overview">${evLogo(e)}<div>${esc(e.name)}<small>${esc(e.no||'')} · ${dfmt(e.date)} · ${esc(e.venue)}</small></div>${pill(evPh(e),EVST)}</button>`).join('')}</div>
    <div class="btn-row">${me.role==='admin'?`<button class="btn btn-primary" data-act="evNew">${ic('plus')}Create Event</button>`:''}<button class="btn btn-ghost" data-go="#dashboard">${me.role==='admin'?'All events dashboard':'My events'}</button></div></div>`)},
  more:()=>{const ev=curEv;const rest=TABS.filter(t=>can(ev.id,t[0])&&!['overview','receive','list','expenses'].includes(t[0]));openModal(`${mh('More',esc(ev.name))}<div class="md-b"><div class="sheet-list">${rest.map(t=>`<button data-go="#ev-${ev.id}-${t[0]}">${ic(t[2])}<div>${t[1]}</div>${ic('arrow',16)}</button>`).join('')}<button data-go="#dashboard">${ic('grid')}<div>${me.role==='admin'?'All events':'My events'}</div></button></div></div>`)},
  notifs:()=>{const ns=myNotifs().sort((a,b)=>b.at-a.at).slice(0,30);
    openModal(`${mh('Notifications','WhatsApp and SMS use 1 credit each. In-app reminders are free.')}<div class="md-b">${ns.length?`<div class="rows">${ns.map(n=>`<div class="row-card" style="cursor:default;align-items:flex-start"><span class="tile-ic" style="margin:0">${ic(n.channel==='WhatsApp'?'msg':n.channel==='SMS'?'phone':'bell',18)}</span><div class="rc-main"><b style="white-space:normal">${esc(n.text)}</b>${n.media?annMedia(n.media):''}<small>${n.channel} · to ${esc(n.to)} · ${new Date(n.at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'})}</small></div><span class="pill ${n.status==='Sent'?'good':n.status==='Queued'?'warn':'bad'}">${n.status}</span></div>`).join('')}</div>`:emptyBox('Nothing yet','Turn on WhatsApp or SMS in event Settings, or add a reminder.')}</div>`)},
  buy:()=>online()?buyModal():toast('Buying credits needs internet','bad'),pack:b=>buyPay(+b.dataset.q),
  buySim:()=>{const q=buyQ,cc=buyCode,pr=priceOf(q,cc&&cc.disc),bonus=cc?cc.bonus:0;{const ok=document.getElementById('buy_ok');if(ok&&!ok.checked){const l=document.getElementById('buyOkL');if(l){l.classList.add('invalid');l.scrollIntoView({block:'center'});ok.addEventListener('change',()=>l.classList.remove('invalid'),{once:true})}return toast('Tick the box to agree to the no-refund terms','bad')}}if(q+bonus>P().stock)return stockAlert(q+bonus,'pay'),toast(`Only ${cr(P().stock)} credits are available right now. Choose a smaller pack.`,'bad');
    P().stock-=q+bonus;addCredits(curAcc(),q+bonus,pr.total,cc?`${cr(q)} credits + code ${cc.c.code}`:`${cr(q)} credits`,'MP-PAY-'+Date.now().toString().slice(-6),cc?cc.c.code:null);if(cc)cc.c.used=(cc.c.used||0)+1;buyCode=null;
    log(null,'Credits purchased',`${cr(q+bonus)} credits · ${fmt(pr.total)}${cc?' · code '+cc.c.code:''}`);save();closeModal();toast(`${cr(q+bonus)} credits added. Messages are ready to send.`);render()},
  logoRemove:()=>{imgBuf.logo=null;const p=$('#prev-logo');if(p)p.innerHTML=''},
  remNew:()=>remModal(),remEdit:b=>remModal(b.dataset.id),remFromMoi:b=>remModal(null,b.dataset.id),
  remTab:b=>{ui.remTab=b.dataset.k;render()},
  remDel:b=>{const r=S.reminders.find(x=>x.id===b.dataset.id);ask('Delete this reminder?',esc(r.title),'Delete',()=>{S.reminders=S.reminders.filter(x=>x.id!==r.id);save();toast('Reminder deleted');render()})},
  remDone:b=>{const r=S.reminders.find(x=>x.id===b.dataset.id),m=r.moi&&S.moi.find(x=>x.id===r.moi),ok=m&&manages(m.event_id);
    openModal(`${mh('Mark as done',esc(r.title))}<form data-form="remDone" data-id="${r.id}"><div class="md-b">
    ${ok?`<label class="check"><input type="checkbox" id="rd_rec" checked> Also mark ${esc(m.c.name)}’s Moi as returned</label>${retInfo(m.id)}<div class="fields">${fld('Amount you gave (₹)','rd_amount','number',true,r.amount||m.amount||m.est||'','min="1" inputmode="numeric"','full')}</div>`:`<p class="muted">The reminder moves to Done.</p>`}
    </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">Mark done</button></div></form>`)},
  evNew:()=>{const A=myAcc(),pl=planOf(A);if(A&&eventsThisMonth(A)>=lim(pl.events))return limitHit('Event limit reached',`Your plan allows ${pl.events} new event${pl.events>1?'s':''} a month and you have created ${eventsThisMonth(A)} this month. Move to a bigger plan to create more.`);imgBuf.logo=null;imgBuf.upiqr0=imgBuf.upiqr1=null;openModal(`${mh('Create event / function','Three quick steps. Receipts and voice are ready-made; change them any time in Settings.')}${eventWizard()}`,true)},
  evEdit:b=>{const e=S.events.find(x=>x.id===(b.dataset.id||(curEv&&curEv.id)));if(!e)return;if(e.status==='void')return toast('A void event can’t be changed. Create a new event instead.','bad');imgBuf.logo=logoObj(e);[0,1].forEach(i=>{imgBuf['upiqr'+i]=(e.upis&&e.upis[i]&&e.upis[i].qr)||null});openModal(`${mh('Edit event',esc(e.no||'')+' · '+esc(e.name))}${eventWizard(e)}`,true)},
  evActivate:b=>{const e=S.events.find(x=>x.id===b.dataset.id);if(!e||e.status==='void')return toast('A void event can’t be reopened. Create a new event.','bad');if(!manages(e.id))return;const was=e.status;e.status='active';log(e.id,'Updated',`Status ${EVST[was][0]} → Active`);save();toast('Event is Active. It can receive Moi now.');render()},
  evArchive:()=>{const e=curEv;ask('Archive this event?','Moi can’t be received while it is archived, at the counter or from the QR page. You can change the status back to Active in Event details.','Archive',()=>{e.status='archived';log(e.id,'Updated','Event archived');save();toast('Event archived');render()},false)},
  evDel:()=>{const e=curEv;openModal(`${mh('Void '+esc(e.name)+'?',e.no||'')}<form data-form="evVoid"><div class="md-b"><p class="muted">The event number ${esc(e.no||'')} and all its Moi records stay saved and visible, marked Void. Moi can’t be received any more, at the counter or from the QR page. Events can’t be deleted.</p><div class="note bad">${ic('alert',20)}<div><b>Void is final</b><p>A void event can never be made Active again. If the function happens later, create a new event.</p></div></div>${fld('Reason','ev_r','text',true,'','placeholder="e.g. Function cancelled"','full')}<label class="check"><input type="checkbox" id="ev_ok"> I understand this can’t be undone</label></div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-danger">Void event</button></div></form>`)},
  upiAcc:b=>{const px=b.dataset.px,fl=flows[px==='m'?'staff':'public'];fl.upiAcc=+b.dataset.i;const p=$('#panel-'+px);if(p){p.innerHTML=modePanel(curEv||S.events.find(e=>e.id===fl.eid),'upi',px);mountQR(p)}},
  upiqrDel:b=>{imgBuf[b.dataset.k]=null;const p=$('#prev-'+b.dataset.k);if(p)p.innerHTML='';const l=document.querySelector(`[data-img="${b.dataset.k}"]`);if(l)l.closest('label').querySelector('span').textContent='Add UPI QR image (optional)'},
  alCat:b=>{ui.al.cat=b.dataset.v;ui.al.n=40;render()},alMore:()=>{ui.al.n+=40;render()},
  mode:b=>{const px=b.dataset.px,ctx=px==='m'?'staff':'public',fl=flows[ctx];fl.mode=b.dataset.mode;
    b.parentElement.querySelectorAll('.mode').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b)});
    const ev=S.events.find(e=>e.id===fl.eid);const p=$('#panel-'+px);p.innerHTML=modePanel(ev,fl.mode,px);mountQR(p);updSum(px);
    const st=$('#wzSubmitTxt');if(st&&px==='m')st.textContent=fl.mode==='online'?'Generate payment QR':'Submit Moi'},
  amt:b=>{const i=$('#'+b.dataset.px+'_amount');i.value=b.dataset.v;i.classList.remove('invalid');updSum(b.dataset.px)},
  paySim:b=>{if(!online())return toast('Internet dropped. The payment will confirm once you’re back online.','bad');const ctx=b.dataset.ctx,fl=flows[ctx],ev=S.events.find(e=>e.id===fl.eid),d=fl.draft;const g=gwCalc(ev,d.amount);
    if(ctx==='public'){if(fl.payFor)return toast('Online payment isn’t available yet. Please pay at the counter.','bad');return mpGuestMoi(ev,d.c,d.amount,'online',{fee:g.fee,feeBy:g.guest?'guest':'family'})}
    if(fl.payFor){const m=S.moi.find(x=>x.id===fl.payFor);if(m){m.mode='online';m.status='verified';m.gref='pay_'+tok();m.fee=g.fee;m.feeBy=g.guest?'guest':'family';m.shot=null;log(ev.id,'Paid online',`${fmt(m.amount)} from ${m.c.name} · ${m.code}`);qrNotify(ev,m);announce(ev,m);save();fl.payFor=null;fl.stage='done';fl.moiId=m.id;lastH='';render();return toast('Payment confirmed')}}const m=createMoi(ev,d.c,d.amount,'online','verified',{...d.meta,gref:'pay_'+tok(),fee:g.fee,feeBy:g.guest?'guest':'family'},ctx);announce(ev,m);fl.stage='done';fl.moiId=m.id;lastH='';render();toast('Payment confirmed')},
  payCancel:b=>{const fl=flows[b.dataset.ctx];if(fl.payFor){fl.stage='done';fl.moiId=fl.payFor;fl.payFor=null}else fl.stage='form';lastH='';render()},
  flowNew:b=>{const ctx=b.dataset.ctx;flows[ctx]={eid:flows[ctx].eid,stage:'form',mode:ctx==='staff'?'cash':'online',kind:'cash'};imgBuf.mitem=null;imgBuf.mshot=null;lastH='';render()},
  wzNext:b=>{const f=b.closest('form'),n=+f.dataset.step,t=wzDesk()?3:n+1;if(!wzValid(f,t>=3?2:1))return;wzSet(f,t)},
  wzBack:b=>{const f=b.closest('form'),n=+f.dataset.step;wzSet(f,wzDesk()?1:Math.max(1,n-1))},
  wzGo:b=>{const f=b.closest('form');wzSet(f,wzDesk()?1:+b.dataset.s);const el=f.querySelector(+b.dataset.s===1?'#m_name':(flows.staff.kind==='cash'?'#m_amount':'#m_item, #m_grams'));if(el)el.focus()},
  dqSt:b=>{ui.dq.st=b.dataset.k;document.querySelectorAll('.ev-seg button').forEach(x=>x.classList.toggle('on',x===b));const r=$('#dashRows');if(r)r.innerHTML=dashRows()},
  itemsList:()=>{ui.lq.mode='item';go(`ev-${curEv.id}-list`)},
  kind:b=>{const fl=flows.staff,ev=S.events.find(e=>e.id===fl.eid);fl.kind=b.dataset.k;imgBuf.mitem=null;
    b.parentElement.querySelectorAll('.kind').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b)});
    const k=$('#kind-m');k.innerHTML=kindBlock(ev,fl);mountQR(k);updSum('m');const st=$('#wzSubmitTxt');if(st)st.textContent=fl.kind==='cash'&&fl.mode==='online'?'Generate payment QR':'Submit Moi'},
  moiView:b=>moiView(b.dataset.id),receipt:b=>receiptModal(b.dataset.id),
  copyReceipt:b=>copy(receiptText(S.moi.find(m=>m.id===b.dataset.id),b.dataset.l),'Receipt'),
  poNew:()=>poModal(),
  poEdit:b=>{const p=S.payouts.find(x=>x.id===b.dataset.id);if(p)poModal(p)},
  poPurp:b=>{b.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b));$('#po_purpose').value=b.dataset.v},
  poProof:b=>{const p=S.payouts.find(x=>x.id===b.dataset.id);openModal(`${mh('Payout proof',fmt(p.amount)+' to '+esc(p.to))}<div class="md-b"><img src="${p.proof}" alt="Payout proof" style="border-radius:14px"></div>`)},
  poDel:b=>{const p=S.payouts.find(x=>x.id===b.dataset.id);ask('Delete this payout?',`${fmt(p.amount)} to ${esc(p.to)} (${esc(p.purpose)}) will be removed and the balance will go back up.`,'Delete payout',()=>{S.payouts=S.payouts.filter(x=>x.id!==p.id);log(p.event_id,'Deleted',`Payout ${fmt(p.amount)} to ${p.to}`);save();toast('Payout deleted');render()})},
  bkOpen:()=>feat('book',curEv)?bookModal():limitHit('Moi Book export','The Moi Book export is not part of your plan. Move to a plan that includes it.'),bkPrint:()=>bookPrint(),
  bkOrient:b=>{book.orient=b.dataset.v;document.querySelectorAll('.orient-b').forEach(x=>{const on=x.dataset.v===book.orient;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});bookRefresh()},
  uiLang:()=>uiLangModal(),
  setUiLang:b=>{UIL=b.dataset.v;try{localStorage.setItem('moipoint-uilang',UIL)}catch(e){}document.documentElement.lang=UIL;closeModal();if(UIL==='en')location.reload();else render();
    toast(UIL==='en'?'App language: English':UIL==='ta'?'மொழி மாற்றப்பட்டது: தமிழ்':'✓ '+(UILANGS.find(x=>x[0]===UIL)||['',''])[1])},
  syncPanel:()=>syncPanel(),syncNow:()=>{if(!online())return toast('No internet yet. Entries stay safe on this phone.','bad');syncing=true;render();if($('#syncPanel'))closeModal();setTimeout(syncNow,900)},
  simOff:()=>{simOffline=!simOffline;try{sessionStorage.setItem('moipoint-simoff',simOffline?'1':'0')}catch(e){}
    if(simOffline){toast('Offline mode on. Try receiving a Moi.','bad');render();syncPanel()}else{closeModal();toast('Internet back. Syncing…');autoSync()}},
  print:b=>printModal(b.dataset.id,b.dataset.l),
  printSize:b=>printModal(b.dataset.id,b.dataset.l,b.dataset.s),
  doPrint:b=>doPrint(b.dataset.id,b.dataset.l,b.dataset.s),
  voiceReplay:b=>{const m=S.moi.find(x=>x.id===b.dataset.id),ev=S.events.find(e=>e.id===m.event_id);speakMoi(b.dataset.l||voiceLang(ev),vData(ev,m),voiceCfg(ev).tone)},
  voiceTest:b=>{const px=b.dataset.px,f=b.closest('form');const vl=f.querySelector('#'+px+'vlang').value,lg=f.querySelector('#'+px+'lang'),rl=lg?lg.value:UIL,en=f.querySelector('#'+px+'name'),ts=f.querySelector('#'+px+'vtone');
    if(b.dataset.tone&&ts){ts.value=b.dataset.tone;f.querySelectorAll('.tone').forEach(x=>x.classList.toggle('on',x===b))}
    speakMoi(vl==='same'?rl:vl,{name:'Kaviya',amt:5001,status:'received',mode:'cash',ev:(en&&en.value.trim())||'Kavi Birthday Function'},ts?ts.value:'warm')},
  muteToggle:()=>{deviceMute=!deviceMute;try{localStorage.setItem('moipoint-mute',deviceMute?'1':'0')}catch(e){}if(deviceMute&&'speechSynthesis' in window)speechSynthesis.cancel();toast(deviceMute?'Voice muted on this device':'Voice on for this device');render()},
  rlang:b=>{const md=$('.md');const top=md?md.scrollTop:0;const cur=document.querySelector('[data-act="rfmt"].on');receiptModal(b.dataset.id,b.dataset.l,cur?cur.dataset.f:null);const n=$('.md');if(n)n.scrollTop=top},
  copyText:b=>copy(b.dataset.text,'Link'),
  moiEdit:b=>moiEdit(b.dataset.id),
  moiDel:b=>{const m=S.moi.find(x=>x.id===b.dataset.id);if(!m||m.status==='void')return;openModal(`${mh('Void this Moi entry?',`${m.code} · ${esc(amtTxt(m))} from ${esc(m.c.name)}`)}<form data-form="moiVoid" data-id="${m.id}"><div class="md-b"><p class="muted">The receipt number stays in the records and the Moi Book, marked Void. It is not counted in any total. Entries can’t be deleted.</p>${fld('Reason','mv_r','text',true,'','placeholder="e.g. Entered twice by mistake"','full')}</div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-danger">Void entry</button></div></form>`)},
  verify:b=>{const m=S.moi.find(x=>x.id===b.dataset.id),ev=S.events.find(e=>e.id===m.event_id);m.status='verified';log(m.event_id,'Payment verified',`${fmt(m.amount)} from ${m.c.name}`);notify(ev,m,'verified');save();closeModal();toast('Payment verified');render()},
  reject:b=>{const m=S.moi.find(x=>x.id===b.dataset.id);openModal(`${mh('Reject payment',`${fmt(m.amount)} from ${esc(m.c.name)}`)}<form data-form="reject" data-id="${m.id}"><div class="md-b">${sel('Reason','rj_reason',['Amount does not match','Different payee on screenshot','Screenshot unclear','Duplicate entry','Payment not received in bank','Other'],'','full')}</div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-danger">Reject payment</button></div></form>`)},
  collected:b=>{const m=S.moi.find(x=>x.id===b.dataset.id);m.status='received';m.collected_by=me.id;announce(S.events.find(e=>e.id===m.event_id),m);if(m.collected_by&&m.c.mobile)notify(S.events.find(e=>e.id===m.event_id),m,'received');log(m.event_id,'Updated',`Cash ${fmt(m.amount)} collected from ${m.c.name}`);save();closeModal();toast('Marked as Cash Received');render()},
  markRet:b=>retModal(b.dataset.id),
  ekind:b=>{editKind=b.dataset.k;const m=S.moi.find(x=>x.id===b.dataset.id);b.parentElement.querySelectorAll('.kind').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b)});$('#ekind').innerHTML=editKindBlock(m,editKind);
    const st=$('#e_status');if(st){st.innerHTML=Object.entries(STATUS).filter(([k])=>editKind==='cash'||k==='received').map(([k,v])=>`<option value="${k}" ${k===m.status?'selected':''}>${v[0]}</option>`).join('')}},
  phZoom:b=>b.classList.toggle('zoom'),
  phRemove:b=>{const k=b.dataset.k;imgBuf[k]=null;const w=$('#phw-'+k);if(w){const lbl=w.parentElement.querySelector('.lbl').textContent;w.parentElement.outerHTML=photoField(k,lbl,null)}},
  unret:b=>{const m=S.moi.find(x=>x.id===b.dataset.id);delete m.ret;log(m.event_id,'Updated',`${m.c.name} marked as not returned`);save();closeModal();toast('Marked as not returned');render()},
  expNew:()=>expModal(),expEdit:b=>expModal(b.dataset.id),
  expBill:b=>{const x=S.expenses.find(e=>e.id===b.dataset.id);openModal(`${mh('Bill',esc(x.desc))}<div class="md-b"><img src="${x.receipt}" alt="Bill" style="border-radius:14px"></div>`)},
  expDel:b=>{const x=S.expenses.find(e=>e.id===b.dataset.id);ask('Delete this expense?',`${fmt(x.amount)} · ${esc(x.category)} · ${esc(x.vendor||'')}`,'Delete',()=>{S.expenses=S.expenses.filter(e=>e.id!==x.id);log(x.event_id,'Deleted',`Expense ${fmt(x.amount)} · ${x.category}`);save();toast('Expense deleted');render()})},
  userNew:b=>userModal(curEv,b&&b.dataset&&b.dataset.r),userNewGlobal:()=>userModal(null),assign:()=>assignModal(curEv),
  unassign:b=>{const a=S.eventUsers.find(x=>x.id===b.dataset.id),u=S.users.find(x=>x.id===a.user_id);ask('Remove access?',`${esc(u.name)} will no longer see ${esc(curEv.name)}.`,'Remove access',()=>{S.eventUsers=S.eventUsers.filter(x=>x.id!==a.id);log(a.event_id,'Updated',`Access removed for ${u.name}`);save();render()})},
  userToggle:b=>{const u=S.users.find(x=>x.id===b.dataset.id);u.status=u.status==='active'?'disabled':'active';log(null,'Updated',`${u.name} ${u.status==='active'?'enabled':'disabled'}`);save();render()},
  rep:b=>{ui.rep=b.dataset.k;render()},
  ntf:b=>{const e=curEv;e.notify=e.notify||{};const k=b.dataset.k;e.notify[k]=!e.notify[k];const l=k==='wa'?'WhatsApp':'SMS';
    log(e.id,'Updated',`${l} receipts ${e.notify[k]?'on':'off'}`);save();render();
    toast(e.notify[k]?(crState()==='zero'?`${l} is on, but there are no credits. Buy credits to start sending.`:`${l} receipts on · ${rateTxt()}`):`${l} receipts off`,e.notify[k]&&crState()==='zero'?'bad':'')},
  copyCsv:b=>{const ev=curEv;let rows;
    if(b.dataset.kind==='moi'){const PS=new Set(pinsOf(ev));rows=[['Entry ID','Special guest','Name','Mobile','Relationship','Place','Designation','Amount','Payment Mode','Date','Time','Collected By','Status'],...filteredMoi(ev).map(m=>[m.code,PS.has(m.id)?'★ Special guest':'',m.c.name,m.c.mobile,m.c.relationship,m.c.place,m.c.designation,m.amount,MODE[m.mode],m.date,m.time,uname(m.collected_by),STATUS[m.status][0]])]}
    else{const d=repData(ev);rows=[d.h.map(h=>h.t),...d.rows,...(d.foot?[d.foot]:[])].map(r=>r.map(c=>String(c).replace(/<[^>]+>/g,'').replace(/[₹,]/g,'').replace('− ','-')))}
    copy(csv(rows),'CSV')}
};

/* ---------- forms ---------- */
const FORMS={
  moiVoid:f=>{const m=S.moi.find(x=>x.id===f.dataset.id),r=f.querySelector('#mv_r').value.trim();if(!r)return bad(f,'mv_r','Add a reason');m.void={reason:r,by:me.id,at:Date.now(),was:m.status};m.status='void';log(m.event_id,'Voided',`Moi ${m.code} · ${amtTxt(m)} from ${m.c.name} · ${r}`);save();closeModal();toast('Entry voided');render()},
  evVoid:f=>{const e=curEv,r=f.querySelector('#ev_r').value.trim();if(!f.querySelector('#ev_ok')||!f.querySelector('#ev_ok').checked)return bad(f,'ev_ok','Tick the box to confirm. Void can’t be undone.');if(!r)return bad(f,'ev_r','Add a reason');e.void={reason:r,by:me.id,at:Date.now(),was:e.status};e.status='void';log(e.id,'Event voided',`${e.no} · ${e.name} · ${r}`);save();closeModal();toast('Event voided');render()},
  userEdit:f=>{const u=S.users.find(x=>x.id===f.dataset.id),v=id=>f.querySelector('#'+id).value.trim(),mob=v('ue_mobile').replace(/\D/g,'');
    if(!v('ue_name'))return bad(f,'ue_name','Enter a name');if(!mobOk(mob))return bad(f,'ue_mobile',MOBERR);if(S.users.some(x=>x.id!==u.id&&x.mobile===mob&&x.role!=='platform'))return bad(f,'ue_mobile','Another login already uses this number');
    const em=v('ue_email');if(em&&!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em))return bad(f,'ue_email','Enter a valid email');if(!em&&u.role!=='admin'&&u.role!=='platform')return bad(f,'ue_email','Enter the email they log in with');if(em&&S.users.some(x=>x.id!==u.id&&(x.email||'').toLowerCase()===em.toLowerCase()))return bad(f,'ue_email','Another login already uses this email');{const np=f.querySelector('#ue_pw');if(np&&np.value&&!pwOk(np.value))return bad(f,'ue_pw','Use 8 or more characters with letters and numbers, or tap Suggest a strong password')}
    const ch=[];const as=S.eventUsers.filter(a=>a.user_id===u.id&&f.querySelector('#ue'+a.id+'_role'));
    for(const a of as){const acc=readAccess(f,'ue'+a.id);if(acc.err)return bad(f,acc.err[0],acc.err[1]);a._acc=acc}
    if(u.name!==v('ue_name'))ch.push('name');if(u.mobile!==mob)ch.push('mobile');u.name=v('ue_name');u.mobile=mob;u.email=em;if(em&&u.role!=='admin'&&u.role!=='platform')u.username=em.toLowerCase();{const np=f.querySelector('#ue_pw');if(np&&np.value){setPw(u,np.value);ch.push('password changed by owner')}}const st=f.querySelector('#ue_status');if(st&&st.value!==u.status){u.status=st.value;ch.push(st.value==='active'?'enabled':'disabled')}
    as.forEach(a=>{const rm=f.querySelector('#ue'+a.id+'_rm').checked;if(rm){S.eventUsers=S.eventUsers.filter(x=>x.id!==a.id);ch.push('removed from an event');return}const r=f.querySelector('#ue'+a.id+'_role').value;if(r!==a.role){a.role=r;ch.push('role → '+ROLE[r])}if(JSON.stringify(a.access||{mode:'always'})!==JSON.stringify(a._acc)){a.access=a._acc;ch.push('access → '+accessTxt(a))}{const np=readPerm(f,'ue'+a.id);if(np&&JSON.stringify(np)!==JSON.stringify(a.perm||{})){a.perm=np;ch.push('permissions')}}delete a._acc});
    if(u.role!=='admin'){const roles=S.eventUsers.filter(a=>a.user_id===u.id).map(a=>a.role);if(roles.length)u.role=roles.includes('manager')?'manager':'collector'}
    log(null,'Updated',`${u.name}: ${ch.join(', ')||'details'}`);save();closeModal();toast('Saved');render()},
  planPay:f=>{const k=f.dataset.k,p=P().plans[k],A=myAcc(),per='year',amt=+p.yearly;
    const from=A.plan===k&&!isExpired(A)?addDays(A.sub.end,1):null;if(from){const prev=A.sub;startPlan(A,k,amt,me.name,per,from);A.sub.start=prev.start;log(null,'Plan renewed',`${p.name} till ${dfmt(A.sub.end)} · ${fmt(amt)}`);save();closeModal();toast(`Renewed till ${dfmt(A.sub.end)}`);return render()}
    applyPlan(k,amt,me.name,per)},
  otpSend:f=>{const m=f.querySelector('#o_mobile').value.replace(/\D/g,'');if(!needAll(f,[['o_mobile',mobOk(m),MOBERR]]))return;
    {const ex=userByMobile(m);if(ex&&NONHELPER(ex)){AUTH.email='';toast('This number already has an account. Log in with your email and password.','bad');return go('login')}}
    if(AUTH.mobile!==m)AUTH.sends=0;AUTH.mobile=m;sendOtp('sms')},
  otpVerify:f=>{const c=f.querySelector('#otp_code').value.replace(/\D/g,'');if(!needAll(f,[['otp_code',c.length===6,'Enter the 6-digit code']]))return;
    if(Date.now()-AUTH.sent>10*60e3)return needAll(f,[['otp_code',false,'This code expired. Tap Resend code.']]);
    if(c!==AUTH.code)return needAll(f,[['otp_code',false,'That code is not right. Check the latest SMS.']]);
    AUTH.step='profile';AUTH.verified=AUTH.mobile;imgBuf.su_photo=null;AUTH.state='Tamil Nadu';render()},
  signup:f=>{const v=id=>{const el=f.querySelector('#'+id);return el?el.value.trim():''};const name=v('su_name'),email=v('su_email').toLowerCase(),mob=AUTH.mobile,pw=(f.querySelector('#su_pw')||{}).value||'',pw2=(f.querySelector('#su_pw2')||{}).value||'';
    if(!mob||AUTH.verified!==mob||NONHELPER(userByMobile(mob))){AUTH.step='mobile';return render()}
    const emOk=/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email),used0=emOk&&userByEmail(email),hm=userByMobile(mob),upg=(used0&&!NONHELPER(used0)&&(!hm||hm===used0)?used0:null)||(!used0&&hm&&!NONHELPER(hm)?hm:null),used=used0&&used0!==upg?used0:null;
    if(!needAll(f,[['su_name',!!name,'Enter your name'],['su_email',emOk&&!used,!email?'Enter your email':!emOk?'Enter a valid email, e.g. name@gmail.com':'This email already has an account. Log in or use another email.'],['su_pw',pwOk(pw),'Use 8 or more characters with letters and numbers'],['su_pw2',!!pw2&&pw2===pw,!pw2?'Type the password again':'The two passwords are not the same'],['su_dist',!!v('su_dist'),'Add your district'],['su_city',!!v('su_city'),'Add your city or town'],['su_terms',f.querySelector('#su_terms').checked,'Please agree to the terms to continue']]))return;
    let n=S.accounts.length+1001;while(accById('A'+n))n++;const kind=v('su_kind'),tr=+P().pricing.trial||0,state=v('su_state'),dist=v('su_dist'),city=v('su_city');
    const u=upg?Object.assign(upg,{acc:'A'+n,name,email,mobile:mob,oldUser:upg.username!==email?upg.username:upg.oldUser,username:email,role:'admin',status:'active',helperFrom:upg.acc,photo:imgBuf.su_photo||upg.photo||null}):{id:uid('u'),acc:'A'+n,name,email,mobile:mob,username:email,role:'admin',status:'active',photo:imgBuf.su_photo||null};setPw(u,pw);
    const A={id:'A'+n,name:v('su_biz')||name+(kind==='Family'?' Family':''),kind,owner:u.id,city,district:dist,state,signup:today(),source:v('su_src'),plan:P().defaultPlan||'free',status:'active',lang:UIL==='ta'?'ta':'en',
      wallet:{credits:0,used:0,usage:{},purchases:[]},grants:{},onboard:{}};
    if(!upg)S.users.push(u);S.accounts.push(A);startPlan(A,A.plan,0,'Sign-up');if(tr)addCredits(A,tr,0,'Welcome credits','WELCOME');
    me=u;try{localStorage.setItem(SK,u.id)}catch(e){}AUTH.step='mobile';AUTH.mobile='';AUTH.verified='';AUTH.sends=0;imgBuf.su_photo=null;
    log(null,'Account created',`${A.name} · ${city}, ${dist}, ${state} · via ${A.source}`);log(null,'Logged in',u.name);save();toast(`Welcome, ${first(name)}! From next time, log in with ${email}.`);go('dashboard')},
  pfSave:f=>{const v=id=>{const e=f.querySelector('#'+id);return e?e.value.trim():null},name=v('pf_name'),em=v('pf_email');const ok=em===null||/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em),dup=em&&ok&&S.users.some(x=>x!==me&&x.email&&x.email.toLowerCase()===em.toLowerCase());
    if(!needAll(f,[['pf_name',!!name,'Enter your name'],...(em!==null?[['pf_email',ok&&!dup,!em?'Enter your email':!ok?'Enter a valid email':'Another account uses this email']]:[])]))return;
    me.name=name;if(em!==null){if(me.username===me.email)me.username=em.toLowerCase();me.email=em.toLowerCase()}if(imgBuf.pf_photo!==undefined)me.photo=imgBuf.pf_photo;delete imgBuf.pf_photo;log(null,'Profile updated',me.name);save();toast('Profile saved','good');render()},
  pfAcc:f=>{const A=myAcc();if(!A)return;const v=id=>f.querySelector('#'+id).value.trim();if(!needAll(f,[['pa_name',!!v('pa_name'),'Enter the account name'],['pa_dist',!!v('pa_dist'),'Add the district'],['pa_city',!!v('pa_city'),'Add the city or town']]))return;
    Object.assign(A,{name:v('pa_name'),kind:v('pa_kind'),state:v('pa_state'),district:v('pa_dist'),city:v('pa_city')});log(null,'Account details updated',A.name);save();toast('Account details saved','good');render()},
  pfPw:f=>{if(me.role!=='admin')return toast('Your event owner manages your password.','bad');const cur=f.querySelector('#pp_cur'),pw=f.querySelector('#su_pw').value,pw2=f.querySelector('#pp_pw2').value;
    if(!needAll(f,[...(cur?[['pp_cur',!!cur.value&&me.pw===hash(cur.value),!cur.value?'Enter your current password':'Current password is not right']]:[]),['su_pw',pwOk(pw),'Use 8 or more characters with letters and numbers'],['pp_pw2',!!pw2&&pw2===pw,!pw2?'Type the new password again':'The two passwords are not the same']]))return;
    setPw(me,pw);log(null,'Password changed',me.name);save();toast('Password changed. Use it next time you log in.','good');render()},
  fpFind:f=>{const e=f.querySelector('#fp_email').value.trim().toLowerCase(),ok=/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e),u=ok&&userByEmail(e);
    if(!needAll(f,[['fp_email',ok&&!!u,!e?'Enter your email':!ok?'Enter a valid email':'No account uses this email. Check the spelling.']]))return;fpClear(u);render();fpFocus('fp_mob')},
  fpMob:f=>{const u=fp.u,m=normMob(f.querySelector('#fp_mob').value);if(!u)return render();if(!needAll(f,[['fp_mob',mobOk(m),MOBERR]]))return;
    if(m!==u.mobile)return needAll(f,[['fp_mob',false,'This mobile number is not registered with this account.']]);fp.mob=m;fpOtpSend()},
  fpOtp:f=>{const c=f.querySelector('#fp_code').value.replace(/\D/g,'');if(!needAll(f,[['fp_code',c.length===6,'Enter the 6-digit code']]))return;
    if(!fp.code)return needAll(f,[['fp_code',false,'Too many wrong tries. Tap Resend code.']]);if(Date.now()-fp.at>10*60e3)return needAll(f,[['fp_code',false,'This code expired. Tap Resend code.']]);
    if(c!==fp.code){fp.tries++;if(fp.tries>=5)fp.code='';return needAll(f,[['fp_code',false,fp.code?'That code is not right. Check the latest SMS.':'Too many wrong tries. Tap Resend code.']])}
    const t=tok_();(P().resets=P().resets||{})[t]={uid:fp.u.id,exp:Date.now()+10*60e3};fp.code='';save();go('reset-'+t)},
  resetPw:f=>{const tok=f.dataset.tok,r=(P().resets||{})[tok],u=r&&S.users.find(x=>x.id===r.uid),pw=f.querySelector('#rp_pw').value,pw2=f.querySelector('#rp_pw2').value;if(!u||Date.now()>r.exp)return render();
    if(!needAll(f,[['rp_pw',pwOk(pw),'Use 8 or more characters with letters and numbers'],['rp_pw2',!!pw2&&pw2===pw,!pw2?'Type the password again':'The two passwords are not the same']]))return;
    setPw(u,pw);delete P().resets[tok];fpClear();loginAs(u,true);log(null,'Password changed',u.name);save();if(me)toast('Password changed. You are logged in.','good');else{AUTH.email=u.email;go('login')}},
  ticket:f=>{const sub=f.querySelector('#tk_sub').value.trim(),msg=f.querySelector('#tk_msg').value.trim();if(!sub)return bad(f,'tk_sub','Add a short subject');if(!msg)return bad(f,'tk_msg','Tell us what happened');
    const n=P().tickets.length+1001;P().tickets.push({id:'TK'+n,acc:me.acc,user:me.id,subject:sub,cat:f.querySelector('#tk_cat').value,status:'open',at:Date.now(),msgs:[{from:'customer',name:me.name,text:msg,at:Date.now()}]});
    log(null,'Support question sent',sub);save();toast('Sent. Moi Point support will reply here.');render()},
  tkReply:f=>{const t=P().tickets.find(x=>x.id===f.dataset.id),msg=f.querySelector('#tr_msg').value.trim();if(!msg)return bad(f,'tr_msg','Type your reply');t.msgs.push({from:'customer',name:me.name,text:msg,at:Date.now()});t.status='open';save();tkModal(t.id);render()},
  coupon:f=>{const c=f.querySelector('#cp_code').value.trim();if(!c)return toast('Type the offer code','bad');buyPay(buyQ,c)},
  login:f=>{const id=f.querySelector('#l_user').value.trim().toLowerCase(),pw=f.querySelector('#l_pw').value;
    if(!needAll(f,[['l_user',!!id,'Enter your email'],['l_pw',!!pw,'Enter your password']]))return;
    const u=S.users.find(x=>x.username.toLowerCase()===id||(x.email&&x.email.toLowerCase()===id)||x.oldUser===id);
    if(!u||u.pw!==hash(pw))return needAll(f,[['l_pw',false,'Email or password is wrong. Check and try again, or tap Forgot password.']]);AUTH.email='';loginAs(u,f.querySelector('#l_rem').checked)},
  contact:f=>{f.reset();toast('Thanks! We’ll call you back soon.')},
  moi:f=>{if(+f.dataset.step<3)return ACT.wzNext(f.querySelector('[data-act=wzNext]'));submitMoi('staff',f)},pub:f=>submitMoi('public',f),
  moiEdit:f=>{const m=S.moi.find(x=>x.id===f.dataset.id),v=id=>{const el=f.querySelector('#e_'+id);return el?el.value.trim():''};
    if(!v('name'))return bad(f,'e_name','Enter the contributor’s name');
    const mob=normMob(v('mobile'));if(mob&&!mobOk(mob))return bad(f,'e_mobile',MOBERR);
    const k=editKind,before=amtTxt(m);
    if(k==='cash'){const amt=Math.round(+v('amount'));if(!(amt>0))return bad(f,'e_amount','Enter an amount above ₹0');
      Object.assign(m,{kind:'cash',amount:amt,mode:v('mode')||'cash',utr:v('utr'),shot:imgBuf.eshot||null,gift:null,est:0})}
    else{const metal=k==='gold'||k==='silver',gr=+v('grams');
      if(metal&&!(gr>0))return bad(f,'e_grams','Enter the weight in grams');if(!metal&&!v('item'))return bad(f,'e_item','Say what was given');
      Object.assign(m,{kind:k,amount:0,mode:'item',utr:'',shot:null,gift:{grams:metal?gr:'',purity:metal?v('purity'):'',item:v('item'),qty:+v('qty')||1,photo:imgBuf.eitem||null},est:Math.round(+v('est'))||0})}
    Object.assign(m.c,{name:v('name'),mobile:mob,relationship:v('rel'),place:v('place'),designation:v('des'),address:v('addr'),notes:v('notes')});
    const ea=f.querySelector('#e_alt');if(ea){m.c.alt=m.c.alt||{};if(ea.dataset.touched&&ea.value.trim())m.c.alt[ea.dataset.lg]=translit(ea.value.trim(),ea.dataset.lg);else delete m.c.alt[ea.dataset.lg]}
    m.status=k==='cash'?(v('status')||m.status):'received';m.date=v('date')||m.date;m.time=v('time')||m.time;m.c.updatedAt=Date.now();m.ref=v('ref');try{pplPut(moiPpl(m),'moi',m.c.updatedAt)}catch(_){}
    const after=amtTxt(m);imgBuf.eshot=imgBuf.eitem=null;
    log(m.event_id,'Updated',`Moi ${m.code}${before!==after?` · ${before} → ${after}`:''}`);save();closeModal();toast('Entry updated');render()},
  markRet:f=>{const m=S.moi.find(x=>x.id===f.dataset.id),amt=Math.round(+f.querySelector('#rt_amount').value);if(!(amt>0))return bad(f,'rt_amount','Enter the amount you gave');
    const was=!!m.ret;m.ret={amount:amt,date:f.querySelector('#rt_date').value||today(),note:f.querySelector('#rt_note').value.trim(),by:me.id,at:Date.now()};speakAct(S.events.find(e=>e.id===m.event_id),'ret',{amount:amt,to:m.c.name});
    log(m.event_id,was?'Updated':'Marked returned',`${fmt(amt)} returned to ${m.c.name}${m.ret.note?' · '+m.ret.note:''}`);save();closeModal();toast(`Marked as returned · ${fmt(amt)} to ${m.c.name}`);render()},
  exp:f=>{const v=id=>f.querySelector('#x_'+id).value.trim();const amt=Math.round(+v('amount'));
    if(!v('desc'))return bad(f,'x_desc','Add a short description');if(!(amt>0))return bad(f,'x_amount','Enter an amount above ₹0');
    const tot=Math.round(+v('total'))||0;if(tot&&tot<amt)return bad(f,'x_total','Full bill can’t be less than what you paid');
    if(v('cat')==='Other'){if(!v('cat_o'))return bad(f,'x_cat_o','Type what this expense is for');saveCustom('xcat',v('cat_o'),curAcc())}
    const data={billTotal:tot>amt?tot:null,category:v('cat')==='Other'?v('cat_o'):v('cat'),desc:v('desc'),amount:amt,mode:v('mode'),date:v('date')||today(),vendor:v('vendor'),notes:v('notes'),receipt:imgBuf.bill||null};
    if(f.dataset.id){Object.assign(S.expenses.find(x=>x.id===f.dataset.id),data);log(curEv.id,'Updated',`Expense ${fmt(amt)} · ${data.category}`)}
    else{S.expenses.push({id:uid('x'),event_id:curEv.id,created_by:me.id,...data});log(curEv.id,'Expense added',`${fmt(amt)} · ${data.category}${data.vendor?' · '+data.vendor:''}`);speakAct(curEv,'exp',data)}
    imgBuf.bill=null;save();closeModal();toast('Expense saved');render()},
  paySet:f=>{const e=curEv,p=readPayment(f,'ps_');if(p.err)return bad(f,p.err[0],p.err[1]);Object.assign(e,p);log(e.id,'Updated','Payment settings');save();toast('Payment settings saved');render()},
  evSave:(f,fin)=>{{const ex=f.dataset.id&&S.events.find(x=>x.id===f.dataset.id);if(ex&&ex.status==='void')return toast('A void event can’t be changed. Create a new event instead.','bad')}if(f.dataset.wz&&!fin){const nb=f.querySelector('[data-act="ewNext"]');return ACT.ewNext(nb)}
    const px=f.dataset.id&&!$('#modal').contains(f)?'s_':'n_',v=id=>{const el=f.querySelector('#'+px+id);return el?el.value.trim():''};
    if(!f.dataset.id){const A=myAcc(),pl=planOf(A);if(A&&eventsThisMonth(A)>=lim(pl.events))return limitHit('Event limit reached',`Your plan allows ${pl.events} new events a month.`)}
    const pay=readPayment(f,px);if(pay.err)return bad(f,pay.err[0],pay.err[1]);const team=px==='n_'&&!f.dataset.edit?readTeam(f):{people:[],existing:[]};if(team.err)return bad(f,team.err[0],team.err[1]);{const pl=planOf(myAcc()),nh=team.people.length+team.existing.length;if(nh>lim(pl.helpers))return limitHit('Helper limit',`Your plan allows ${pl.helpers} helper${pl.helpers>1?'s':''} per event. You added ${nh}.`)}delete pay.err;
    if(!v('name'))return bad(f,px+'name','Give the event a name');if(!v('date'))return bad(f,px+'date','Pick the event date');if(!v('venue'))return bad(f,px+'venue','Add the venue name');if(!v('org'))return bad(f,px+'org','Add the organizer’s name');
    const om=v('orgm').replace(/\D/g,'');if(om&&!mobOk(om))return bad(f,px+'orgm',MOBERR);
    if(v('type')==='Other'){if(!v('type_o'))return bad(f,px+'type_o','Type the function name');saveCustom('ctype',v('type_o'),curAcc())}
    const data={name:v('name'),type:(v('type')==='Other'&&v('type_o'))?v('type_o'):v('type'),status:v('status')||(f.dataset.id?(S.events.find(x=>x.id===f.dataset.id)||{}).status:'active'),date:v('date'),start:v('start'),end:v('end'),venue:v('venue'),address:v('address'),organizer:v('org'),orgMobile:om,...(f.querySelector('#'+px+'orge')?{orgEmail:f.querySelector('#'+px+'orge').value.trim().toLowerCase()}:{}),desc:v('desc'),logo:imgBuf.logo?imgBuf.logo.url:null,logoW:imgBuf.logo?imgBuf.logo.w:null,logoH:imgBuf.logo?imgBuf.logo.h:null,logoT:imgBuf.logo?(imgBuf.logo.t?1:0):0,lang:v('lang')||'ta'};
    Object.assign(data,pay);const vc=f.querySelector('#'+px+'voice');if(vc){const vm=f.querySelector(`input[name="${px}vmode"]:checked`),acts={};VACTS.forEach(([k])=>{const x=f.querySelector('#'+px+'va_'+k);acts[k]=x&&!x.checked?0:1});data.voice={on:vm?vm.value==='on':vc.checked,lang:v('vlang')||'same',tone:v('vtone')||'warm',acts};const A=myAcc();if(A)A.voice={on:data.voice.on&&acts.rem!==0,lang:data.voice.lang,tone:data.voice.tone}}{const rf=f.querySelector(`input[name="${px}rformat"]:checked`);if(rf)data.rformat=rf.value}
    const nwa=f.querySelector('#n_wa');if(nwa)data.notify={wa:nwa.checked,sms:f.querySelector('#n_sms').checked};
    if(data.notify&&(data.notify.wa||data.notify.sms)&&crState()!=='ok')setTimeout(()=>toast(crState()==='zero'?'Messages are on, but you have no credits. Buy credits so receipts go out.':'Messages are on. Credits are running low.','bad'),3000);
    if(f.dataset.id){const e=S.events.find(x=>x.id===f.dataset.id);Object.assign(e,data);log(e.id,'Updated','Event details');save();closeModal();toast('Event saved');render()}
    else{S.evSeq=(S.evSeq||0)+1;const e={id:uid('e'),no:evNo(S.evSeq),acc:me.acc,token:tok(),created_by:me.id,created_at:today(),upi:'',payee:data.organizer,gateway:'none',notify:{wa:true,sms:false,email:false},...data};S.events.push(e);log(e.id,'Event created',e.name);{const fcr=grantEventCredits(e);if(fcr)setTimeout(()=>toast(fcr+' free message credits added for this event','good'),1400)}
      team.people.forEach(p=>{const lk=p.link&&S.users.find(x=>x.id===p.link);const u=lk||{id:uid('u'),acc:me.acc,name:p.name,email:p.username,mobile:p.mobile,username:p.username,role:p.role,status:'active'};if(!lk){setPw(u,p.pw);S.users.push(u)}[e.id,...p.others].forEach(eid=>grantEv(eid,u,p.role,eid===e.id?p.access:{mode:'always'},p.perm||undefined));log(e.id,lk?'Helper linked':'User created',`${u.name} · ${ROLE[u.role]} · ${1+p.others.length} event${p.others.length?'s':''}`)});
      team.existing.forEach(x=>{const u=S.users.find(y=>y.id===x.id);if(!u)return;grantEv(e.id,u,x.role);log(e.id,'Updated',`${u.name} given ${ROLE[x.role]} access`)});
      const nt=team.people.length+team.existing.length;if(!nt&&myAcc())myAcc().onboard.self=true;save();closeModal();toast(nt?`Event created with ${nt} helper${nt>1?'s':''}`:'Event created. You are the Moi collector.');go(`ev-${e.id}-overview`)}},

  invite:f=>{msgSave();const ev=S.events.find(e=>e.id===inv.ev),gs=msgGuests(),t=inv.text.trim()||f.querySelector('#inv_text').value.trim();if(!t)return bad(f,'inv_text','Write the message');if(!inv.wa&&!inv.sms)return toast('Pick WhatsApp or SMS','bad');if(!gs.length)return toast('No guest with a mobile number here','bad');
    for(const k of ['vlink','link'])if(inv[k]&&!/^https?:\/\/\S+\.\S+/.test(inv[k]))return bad(f,'inv_'+k,'Paste the full link, starting with https://');
    let sent=0,wait=0;const recips=[];gs.forEach(g=>{const body=inv._fill(t,g)+[inv.vlink,inv.link].filter(Boolean).map(x=>'\n'+x).join('');[inv.wa?'WhatsApp':'',inv.sms?'SMS':''].filter(Boolean).forEach(ch=>{const tag=ch==='WhatsApp'?[inv.img?'[Photo] ':'',inv.video?'[Video] ':''].join(''):'';const st=sendMsg(ch,g.mobile,tag+body,ev?ev.id:null);if(st==='Sent')sent++;else wait++;recips.push({k:g.key,nm:g.name,mob:g.mobile,ch:ch==='WhatsApp'?'wa':'sms',st:st==='Sent'?'sent':st==='Queued'?'queue':'credit'})})});
    const kl=(MSGK.find(k=>k[0]===inv.kind)||['','Message'])[1];S.msgLog.unshift({id:uid('ml'),acc:me.acc,ev:ev?ev.id:null,kind:inv.kind,text:t,img:inv.img&&inv.img.length<250000?inv.img:(inv.img?1:0),video:inv.video?(inv.vname||'video'):'',vlink:inv.vlink||'',link:inv.link,n:gs.length,recips,lg:inv.lg,sample:inv._fill(t,gs[0]),ch:[inv.wa?'WhatsApp':'',inv.sms?'SMS':''].filter(Boolean).join(' + '),at:Date.now(),by:me.name});S.msgLog=S.msgLog.slice(0,60);
    log(ev?ev.id:null,kl+' sent',`${gs.length} guest${gs.length===1?'':'s'}${ev?' · '+ev.name:''}`);save();closeModal();gst.sel.clear();toast(wait?`${sent} sent · ${wait} waiting for credits or internet`:`${kl} sent to ${gs.length} guest${gs.length===1?'':'s'}`,wait?'bad':'good');render()},
  vxgFill:()=>vxgFill(),
  qrOtp:f=>qrOtpCheck(f),
  lLead:f=>{closeModal();lSaveLead(f,'ll_',f.dataset.kind)},
  lDemo:f=>lSaveLead(f,'ld_','demo'),
  lOtp:f=>lOtpCheck(f),
  vxFill:f=>{const v=k=>{const el=f.querySelector('#vxr_'+k);return el?el.value.trim():null},o={};['mobile','name','native','place','des','rel','amount','mode'].forEach(k=>{const x=v(k);if(x!=null)o[k]=x});
    if(o.mobile&&!mobOk(normMob(o.mobile)))return bad(f,'vxr_mobile',MOBERR);if(o.amount&&!(+o.amount>0))return bad(f,'vxr_amount','Amount should be a number');
    if(vx.target==='all'&&!o.name&&!o.amount&&!o.mobile)return bad(f,'vxr_said','Nothing to fill yet. Speak again or type the entry.');
    const px=vx.px||'m';vxClose();vxApply(px,o);toast('Filled in. Check and save.','good');const first=document.getElementById(px+'_'+(o.name?'name':'amount'));if(first)first.scrollIntoView({block:'center',behavior:'smooth'})},
  guestAdd:f=>{const v=id=>{const el=f.querySelector('#ga_'+id);return el?el.value.trim():''},mob=normMob(v('mobile')),name=v('name');if(mob&&!mobOk(mob))return bad(f,'ga_mobile',MOBERR);if(!name)return bad(f,'ga_name','Enter the guest’s name');
    const all=guestBook(me.acc).filter(g=>g.entries.length||g.gid),old=ga.key?all.find(g=>g.key===ga.key):null,key=gKey(mob,name);
    const clash=all.find(g=>g.key===key&&g.key!==ga.key&&!g.hidden);if(clash)return bad(f,mob?'ga_mobile':'ga_name',mob?`${clash.name} already has this number in your guest list. A guest can be added only once.`:`${clash.name} is already in your guest list without a number. Add their mobile number, or edit that guest.`);
    const back=!old&&all.find(g=>g.key===key&&g.hidden),base=old||back||null;
    const evBoxes=[...f.querySelectorAll('input[name="ga_ev"]')],evIds=evBoxes.filter(x=>x.checked).map(x=>x.value),gIds=[...f.querySelectorAll('input[name="ga_grp"]')].map(x=>[x.value,x.checked]);
    const r=saveGuestRec({id:base&&base.gid,mobile:mob,name,place:v('place'),des:v('des'),rel:v('rel'),address:v('addr'),notes:v('notes'),evs:evIds,keepEvs:false});
    if(old){evBoxes.filter(x=>!x.checked&&old.entries.some(m=>m.event_id===x.value)).forEach(x=>{r.hideEvs=r.hideEvs||{};r.hideEvs[x.value]=Date.now()});
      evBoxes.filter(x=>!x.checked).forEach(x=>S.ggroups.filter(gp=>gp.ev===x.value).forEach(gp=>{gp.keys=gp.keys.filter(k=>k!==old.key)}));
      if(old.key!==key){r.merge=[...new Set([...(r.merge||[]),old.key])];(S.ggroups||[]).forEach(x=>{x.keys=[...new Set(x.keys.map(k=>k===old.key?key:k))]})}}
    gIds.forEach(([id,on])=>{const x=S.ggroups.find(g=>g.id===id);if(!x)return;if(on)grpAdd(x,[key]);else x.keys=x.keys.filter(k=>k!==key)});
    save();closeModal();toast(old?'Guest saved':back?`${name} is back in your guest list`:`${name} added to your guest list`,'good');render()},
  group:f=>{const name=f.querySelector('#gp_name').value.trim(),ev=f.querySelector('#gp_ev').value;if(!name)return bad(f,'gp_name','Give the group a name');let x=f.dataset.id&&S.ggroups.find(g=>g.id===f.dataset.id);
    if(x){x.name=name;x.ev=ev;if(ev)evPush(ev,x.keys)}else{x={id:uid('gp'),acc:me.acc,name,ev,keys:[],at:Date.now(),by:me.name};S.ggroups.push(x);if(f.dataset.sel){grpAdd(x,[...gst.sel]);gst.sel.clear()}gst.grp=x.id}
    save();closeModal();toast(f.dataset.id?'Group saved':`Group “${name}” made`,'good');render()},
  gPush:f=>{const keys=[...gst.sel];if(f.dataset.to==='grp'){let id=f.querySelector('#gpu_grp').value,x;if(id==='new'){const nm=f.querySelector('#gpu_name').value.trim();if(!nm)return bad(f,'gpu_name','Give the new group a name');x={id:uid('gp'),acc:me.acc,name:nm,ev:curEv?curEv.id:'',keys:[],at:Date.now(),by:me.name};S.ggroups.push(x)}else x=S.ggroups.find(g=>g.id===id);grpAdd(x,keys);toast(`${keys.length} added to ${x.name}`,'good')}
    else{const ev=S.events.find(e=>e.id===f.querySelector('#gpu_ev').value);if(!ev)return;evPush(ev.id,keys);toast(`${keys.length} added to the guest list of ${ev.name}`,'good')}
    gst.sel.clear();save();closeModal();render()},
  user:f=>{const v=id=>f.querySelector('#u_'+id).value.trim();const evs=[...f.querySelectorAll('input[name="u_ev"]:checked')].map(x=>x.value);
    if(!v('name'))return bad(f,'u_name','Enter a name');const mob=normMob(v('mobile'));if(!mobOk(mob))return bad(f,'u_mobile',MOBERR);
    const un=v('user').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(un))return bad(f,'u_user','Enter a valid email, like name@gmail.com');if(S.users.some(u=>u.username===un||(u.email&&u.email.toLowerCase()===un)))return bad(f,'u_user','Another login already uses this email');
    if(f.querySelector('#u_pw').value.length<6)return bad(f,'u_pw','Password needs at least 6 characters');if(!evs.length)return toast('Tick at least one event this person can access','bad');
    {const pl=planOf(myAcc()),full=evs.find(eid=>helpersOf(eid)>=lim(pl.helpers));if(full)return limitHit('Helper limit',`Your plan allows ${pl.helpers} helper${pl.helpers>1?'s':''} per event and ${esc(S.events.find(e=>e.id===full).name)} already has them.`)}
    const acc=readAccess(f,'u');if(acc.err)return bad(f,acc.err[0],acc.err[1]);
    const u={id:uid('u'),acc:me.acc,name:v('name'),email:un,mobile:mob,username:un,pw:hash(f.querySelector('#u_pw').value),role:v('role'),status:'active'};S.users.push(u);
    evs.forEach(eid=>S.eventUsers.push({id:uid('a'),event_id:eid,user_id:u.id,role:u.role,access:acc,perm:readPerm(f,'u')}));log(evs[0],'User created',`${u.name} · ${ROLE[u.role]} · ${evs.length} event${evs.length>1?'s':''}`);save();closeModal();toast(`Login created for ${u.name}`);render()},
  assign:f=>{{const pl=planOf(myAcc());if(helpersOf(curEv.id)>=lim(pl.helpers))return limitHit('Helper limit',`Your plan allows ${pl.helpers} helper${pl.helpers>1?'s':''} per event.`)}const uidv=f.querySelector('#as_user').value,role=f.querySelector('#as_role').value,u=S.users.find(x=>x.id===uidv),acc=readAccess(f,'as');if(acc.err)return bad(f,acc.err[0],acc.err[1]);S.eventUsers.push({id:uid('a'),event_id:curEv.id,user_id:uidv,role,access:acc,perm:readPerm(f,'as')});log(curEv.id,'Updated',`${u.name} given ${ROLE[role]} access`);save();closeModal();toast('Access given');render()},
  po:f=>{const v=id=>f.querySelector('#po_'+id).value.trim(),ev=curEv,t=calc(ev.id);const amt=Math.round(+v('amount'));
    if(!(amt>0))return bad(f,'po_amount','Enter the amount taken out');if(!v('to'))return bad(f,'po_to','Who took the money?');
    const mob=normMob(v('mobile'));if(mob&&!mobOk(mob))return bad(f,'po_mobile',MOBERR);
    const old=f.dataset.id&&S.payouts.find(x=>x.id===f.dataset.id),room=t.cashAtCounter+(old&&old.mode==='cash'?+old.amount:0);
    const mode=v('mode');if(mode==='cash'&&amt>room&&!f.dataset.ok){f.dataset.ok='1';$('#po_warn').innerHTML=`<span style="color:var(--warn);font-weight:700">${ic('alert',14)} Only ${fmt(room)} cash is recorded at the counter. Tap Record payout again if this is correct.</span>`;return}
    const fields={amount:amt,to:v('to'),toRole:v('role'),toMobile:mob,purpose:v('purpose'),mode,date:v('date')||today(),time:v('time')||nowT(),ref:v('ref'),notes:v('notes'),proof:imgBuf.po||null,ack:f.querySelector('#po_ack').checked};
    if(old){const was=`${fmt(old.amount)} to ${old.to}`;Object.assign(old,fields,{editedBy:me.id,editedAt:Date.now()});log(ev.id,'Payout updated',`${was} → ${fmt(amt)} to ${old.to} · ${POMODE[mode]} · ${old.purpose}`);save();closeModal();toast('Payout updated');speakAct(ev,'po',fields);return render()}
    const p={id:uid('p'),event_id:ev.id,...fields,by:me.id,created_at:Date.now()};
    S.payouts.push(p);log(ev.id,'Payout recorded',`${fmt(amt)} to ${p.to} · ${POMODE[mode]} · ${p.purpose}`);speakAct(ev,'po',p);
    const wa=f.querySelector('#po_wa');let st='';if(wa&&wa.checked&&mob){st=sendMsg('WhatsApp',mob,`${ev.name}: ${fmt(amt)} payout recorded to ${p.to} for ${p.purpose} on ${dfmt(p.date)}, ${tfmt(p.time)}. Handed over by ${me.name}. — Moi Point`,ev.id)}
    imgBuf.po=null;save();closeModal();toast(`Payout of ${fmt(amt)} recorded${st==='Sent'?' · WhatsApp sent':st==='Queued'?' · WhatsApp queued':st?' · WhatsApp not sent (no credits)':''}`);render()},
  buyCustom:f=>{const q=Math.round(+f.querySelector('#bq').value);if(!(q>=100))return bad(f,'bq','Enter 100 or more messages');buyPay(q)},
  rem:f=>{const v=id=>f.querySelector('#rm_'+id).value.trim();
    if(!v('title'))return bad(f,'rm_title','Add a title');if(!v('person'))return bad(f,'rm_person','Whose function is it?');if(!v('date'))return bad(f,'rm_date','Pick the function date');
    const mob=normMob(v('mobile'));if(mob&&!mobOk(mob))return bad(f,'rm_mobile',MOBERR);
    const data={title:v('title'),moi:v('moi'),person:v('person'),mobile:mob,relationship:v('rel'),type:v('type'),date:v('date'),time:v('time'),place:v('place'),amount:Math.round(+v('amount'))||0,before:v('before'),at:v('at')||'09:00',via:{wa:f.querySelector('#rm_wa').checked,sms:f.querySelector('#rm_sms').checked},desc:v('desc')};
    if(f.dataset.id){const r=S.reminders.find(x=>x.id===f.dataset.id);Object.assign(r,data);if(remAt(r)>new Date())r.sent=false;toast('Reminder saved')}
    else{S.reminders.push({id:uid('rm'),owner:me.id,status:'upcoming',sent:false,created:Date.now(),...data});toast('Reminder added');speakAct(null,'rem',data)}
    {const cb=f.querySelector('#rm_cal'),r=f.dataset.id?S.reminders.find(x=>x.id===f.dataset.id):S.reminders[S.reminders.length-1];if(r&&remAt(r)>new Date())r.rung=0;if(cb&&cb.checked&&r){if(f.dataset.id)delete r.calSent;remCalInvite(r)}}
    log(null,'Reminder',data.title);save();closeModal();ui.remTab='up';render()},
  remDone:f=>{const r=S.reminders.find(x=>x.id===f.dataset.id),rec=f.querySelector('#rd_rec');
    if(rec&&rec.checked){const amt=Math.round(+f.querySelector('#rd_amount').value);if(!(amt>0))return bad(f,'rd_amount','Enter the amount you gave');const m=S.moi.find(x=>x.id===r.moi);
      m.ret={amount:amt,date:r.date<=today()?r.date:today(),note:r.title,by:me.id,at:Date.now()};
      log(m.event_id,'Marked returned',`${fmt(amt)} returned to ${m.c.name} · from reminder`)}
    r.status='done';save();closeModal();toast(rec&&rec.checked?'Done, and the return is recorded':'Marked as done');render()},
  reject:f=>{const m=S.moi.find(x=>x.id===f.dataset.id),r=f.querySelector('#rj_reason').value;m.status='rejected';m.c.notes=r;log(m.event_id,'Payment rejected',`${fmt(m.amount)} from ${m.c.name} · ${r}`);save();closeModal();toast('Payment rejected');render()}
};
function updSum(px){const a=$('#'+px+'_amount'),s=$('#sum-'+px);if(a){const v=+a.value;document.querySelectorAll(`.chip[data-px="${px}"]`).forEach(c=>c.classList.toggle('on',+c.dataset.v===v))}if(!s)return;const fl=flows[px==='m'?'staff':'public'];
  if(px==='m'&&fl.kind&&fl.kind!=='cash'){const g=id=>{const el=$('#m_'+id);return el?el.value.trim():''};s.innerHTML=`${esc(amtTxt({kind:fl.kind,gift:{grams:g('grams')||'—',purity:g('purity'),item:g('item'),qty:g('qty')||1}}))}<small>${KINDL.en[fl.kind]}${g('est')?' · est. '+fmt(+g('est')):''}</small>`;return}
  s.innerHTML=`${fmt(a?+a.value||0:0)}<small>${MODE[fl.mode]}</small>`}
/* ---------- Receive Moi steps ---------- */
const wzDesk=()=>matchMedia('(min-width:901px)').matches;
function wzValid(f,upto){const v=id=>{const el=f.querySelector('#m_'+id);return el?el.value.trim():''};
  if(!v('name')){bad(f,'m_name','Enter the contributor’s name');if(!wzDesk())wzSet(f,1);return false}
  const mob=normMob(v('mobile'));if(mob&&!mobOk(mob)){bad(f,'m_mobile',MOBERR);if(!wzDesk())wzSet(f,1);return false}
  if(upto<2)return true;const fl=flows.staff;
  if(fl.kind==='cash'){if(!(+v('amount')>0)){bad(f,'m_amount','Enter an amount above ₹0');return false}
    if(fl.mode==='upi'&&!imgBuf.mshot&&!v('utr')){bad(f,'m_utr','Attach the payment screenshot or type the UTR number');return false}
    if(fl.mode==='online'&&!online()){toast('Online payment needs internet. Choose Cash or Offline UPI.','bad');return false}}
  else if(fl.kind==='gold'||fl.kind==='silver'){if(!(+v('grams')>0)){bad(f,'m_grams','Enter the weight in grams');return false}}
  else if(!v('item')){bad(f,'m_item','Say what was given');return false}
  return true}
function wzSet(f,n){f.dataset.step=n;const desk=wzDesk();
  f.querySelectorAll('.wz-bar li').forEach(li=>{const k=+li.dataset.s;li.classList.toggle('on',desk&&n<3?k<3:k===n);li.classList.toggle('done',k<n&&!(desk&&n<3))});
  if(n===3){const ev=S.events.find(e=>e.id===flows.staff.eid);$('#wzPrev').innerHTML=previewHtml(ev,f)}
  const st=$('#wzSubmitTxt');if(st)st.textContent=flows.staff.kind==='cash'&&flows.staff.mode==='online'?'Generate payment QR':'Submit Moi';
  const top=f.getBoundingClientRect().top+window.scrollY-80;window.scrollTo(0,Math.max(0,top))}
