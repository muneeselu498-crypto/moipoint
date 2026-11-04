/* ===== Server layer =====
   Everything above this file is the original app: its screens and its rules. It works on one
   object, S, and calls save() after every change. This file is the only part that knows a
   server exists. It loads S from the server, sends what changed after each save(), and
   merges in what other devices changed. Anything that needs real trust (passwords, codes,
   credits, payments) is replaced below with a call to the server. */

const MPS={rev:0,scope:'',base:new Map(),pw:{},cfg:{},ready:false,timer:0,busy:false,again:false,pulling:false,pullAgain:false,es:null,saveBase:0};
const MP_COLS=['users','accounts','events','eventUsers','moi','expenses','payouts','guests','ggroups','reminders','msgLog','notifications','audit'];
const MP_PCOLS=['tickets','stockAlerts','leads'];
const MP_NO_DOC=new Set([...MP_PCOLS,'platLog','resets']);
const MP_BASE_KEY=K+'-base';

function mpStubAccount(){return {id:'A0',name:'',status:'active',plan:'free',sub:{plan:'free',start:today(),end:'2099-01-01',period:'free',amount:0},lang:'ta',wallet:{credits:0,used:0,usage:{},purchases:[],batches:[]},grants:{},onboard:{}}}
/* an empty app, used for the moment before the server answers */
function mpShell(){return {seq:1000,evSeq:0,evNo3:1,moiNo2:1,v31msg:1,v45:1,v46:1,v50:1,v54:1,pplV45:1,users:[],accounts:[mpStubAccount()],events:[],eventUsers:[],moi:[],expenses:[],payouts:[],guests:[],ggroups:[],reminders:[],notifications:[],msgLog:[],audit:[],queue:[],people:{},platform:{}}}

async function mpApi(url,body,ms=30000){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms);
  const r=await fetch(url,{signal:ctl.signal,method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-moipoint':'1'},body:body===undefined?undefined:JSON.stringify(body)}).finally(()=>clearTimeout(t));
  let j=null;try{j=await r.json()}catch(_){}
  if(!r.ok){const e=new Error((j&&j.error)||'Something went wrong. Please try again.');e.status=r.status;e.data=j;throw e}
  return j}

/* ---------- what changed since the server last agreed ---------- */
const mpIsStaff=()=>!!(me&&me.role==='platform');
/* credits are the server's: a customer's own copy of the balance is never sent back */
function mpSer(col,e){if(col==='accounts'&&!mpIsStaff()){const {wallet,...r}=e;return JSON.stringify(r)}return JSON.stringify(e)}
const mpList=col=>MP_PCOLS.includes(col)?(S.platform||{})[col]||[]:S[col]||[];
const mpColsNow=()=>mpIsStaff()?[...MP_COLS,...MP_PCOLS]:[...MP_COLS,'tickets','stockAlerts'];

function mpRebase(){MPS.base=new Map();
  mpColsNow().forEach(col=>mpList(col).forEach(e=>{if(e&&e.id&&!e._ext)MPS.base.set(col+'/'+e.id,hash(mpSer(col,e)))}));
  Object.entries(S.people||{}).forEach(([k,v])=>MPS.base.set('people/'+k,hash(JSON.stringify(v))));
  if(mpIsStaff())Object.keys(S.platform||{}).forEach(k=>{if(!MP_NO_DOC.has(k))MPS.base.set('doc/'+k,hash(JSON.stringify(S.platform[k])??''))});
  mpSaveBase()}
function mpSaveBase(){clearTimeout(MPS.saveBase);MPS.saveBase=setTimeout(()=>{try{localStorage.setItem(MP_BASE_KEY,JSON.stringify([...MPS.base]))}catch(_){}},800)}

function mpCollect(){const upserts=[],deletes=[],seen=new Set(),sent=new Map(),people={},platform={};
  mpColsNow().forEach(col=>mpList(col).forEach(e=>{if(!e||!e.id||e._ext)return;const k=col+'/'+e.id;seen.add(k);const j=mpSer(col,e),h=hash(j);if(MPS.base.get(k)!==h){upserts.push({col,id:e.id,data:JSON.parse(j)});sent.set(k,h)}}));
  MPS.base.forEach((_,k)=>{if(k.startsWith('people/')||k.startsWith('doc/')||seen.has(k))return;const i=k.indexOf('/');deletes.push({col:k.slice(0,i),id:k.slice(i+1)});sent.set(k,null)});
  Object.entries(S.people||{}).forEach(([m,v])=>{const k='people/'+m,h=hash(JSON.stringify(v));if(MPS.base.get(k)!==h){people[m]=v;sent.set(k,h)}});
  if(mpIsStaff())Object.keys(S.platform||{}).forEach(d=>{if(MP_NO_DOC.has(d))return;const k='doc/'+d,h=hash(JSON.stringify(S.platform[d])??'');if(MPS.base.get(k)!==h){platform[d]=S.platform[d];sent.set(k,h)}});
  const pw={...MPS.pw};
  return {payload:{upserts,deletes,people,platform,pw},sent,empty:!upserts.length&&!deletes.length&&!Object.keys(people).length&&!Object.keys(platform).length&&!Object.keys(pw).length}}

/* updates a record where it stands, so screens holding a reference to it stay correct */
function mpPut(col,id,data){const list=mpList(col);const cur=list.find(x=>x&&x.id===id);
  if(cur){Object.keys(cur).forEach(k=>{if(k!=='wallet'||data.wallet)delete cur[k]});Object.assign(cur,data)}else list.push(data);
  const row=cur||data;MPS.base.set(col+'/'+id,hash(mpSer(col,row)));return row}
function mpDrop(col,id){const list=mpList(col),i=list.findIndex(x=>x&&x.id===id);if(i>=0)list.splice(i,1);MPS.base.delete(col+'/'+id)}

function mpSoon(){clearTimeout(MPS.timer);MPS.timer=setTimeout(mpPush,180)}
async function mpPush(){
  if(!MPS.ready||!me||!online())return;
  if(MPS.busy){MPS.again=true;return}
  const {payload,sent,empty}=mpCollect();if(empty)return;
  MPS.busy=true;
  try{
    const r=await mpApi('/api/sync',payload);
    Object.keys(payload.pw).forEach(k=>delete MPS.pw[k]);
    sent.forEach((h,k)=>{if(h===null)MPS.base.delete(k);else MPS.base.set(k,h)});
    let touched=false;
    (r.results||[]).forEach(o=>{
      if(o.data){const before=mpList(o.col).find(x=>x&&x.id===o.id);const was=before&&mpSer(o.col,before),row=mpPut(o.col,o.id,o.data);if(was!==mpSer(o.col,row))touched=true}
      else if(!o.ok){mpDrop(o.col,o.id);touched=true}
      if(!o.ok&&o.reason){toast(o.reason,'bad');touched=true}});
    if(r.scope)MPS.scope=r.scope;
    mpSaveBase();mpLocalSave();
    if(touched)mpRefresh();
    mpPull();
  }catch(e){
    if(e.status===401)return mpSessionLost();
    setTimeout(mpSoon,5000);
  }finally{MPS.busy=false;if(MPS.again){MPS.again=false;mpSoon()}}}

async function mpPull(){
  if(!MPS.ready||!me||!online())return;
  if(MPS.pulling){MPS.pullAgain=true;return}
  MPS.pulling=true;
  try{
    const r=await mpApi(`/api/changes?since=${MPS.rev}&scope=${encodeURIComponent(MPS.scope)}`);
    if(r.full){await mpReloadState();return}
    let touched=false;
    (r.changes||[]).forEach(c=>{
      const key=c.col+'/'+c.id;
      if(c.deleted){if(mpList(c.col).some(x=>x&&x.id===c.id)){mpDrop(c.col,c.id);touched=true}return}
      const cur=mpList(c.col).find(x=>x&&x.id===c.id);
      /* a record edited here and not yet sent stays as it is, and goes up on the next push */
      if(cur&&MPS.base.get(key)!==hash(mpSer(c.col,cur))){MPS.base.set(key,hash(mpSer(c.col,c.data)));return}
      if(!cur||mpSer(c.col,cur)!==mpSer(c.col,c.data)||(c.col==='accounts'&&JSON.stringify(cur.wallet)!==JSON.stringify(c.data.wallet))){mpPut(c.col,c.id,c.data);touched=true}});
    Object.entries(r.docs||{}).forEach(([k,v])=>{if(JSON.stringify(S.platform[k])!==JSON.stringify(v)){S.platform[k]=v;touched=true}if(mpIsStaff()&&!MP_NO_DOC.has(k))MPS.base.set('doc/'+k,hash(JSON.stringify(v)??''))});
    Object.entries(r.people||{}).forEach(([k,v])=>{S.people[k]=v;MPS.base.set('people/'+k,hash(JSON.stringify(v)))});
    if(r.rev>MPS.rev)MPS.rev=r.rev;
    if(touched){mpSaveBase();mpLocalSave();mpRefresh()}
  }catch(e){if(e.status===401)mpSessionLost()}
  finally{MPS.pulling=false;if(MPS.pullAgain){MPS.pullAgain=false;mpPull()}}}

/* writes the cached copy without starting another push */
function mpLocalSave(){try{localStorage.setItem(K,JSON.stringify(S))}catch(_){}}

/* never redraw under someone's fingers: wait until the form or pop-up is finished with */
function mpBusy(){return !!(document.querySelector('#modal .md')||document.querySelector('.subpop')||(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&document.activeElement.closest('form')))}
function mpRefresh(){if(mpBusy()){pendSync=1;return}pendSync=0;render()}
{const _cm=closeModal;closeModal=function(){_cm.apply(this,arguments);if(pendSync)setTimeout(mpRefresh,60)}}
document.addEventListener('focusout',()=>{if(pendSync)setTimeout(()=>{if(pendSync&&!mpBusy())mpRefresh()},300)});

function mpStream(){if(MPS.es){MPS.es.close();MPS.es=null}if(!me||typeof EventSource==='undefined')return;
  const es=new EventSource('/api/stream');es.addEventListener('rev',()=>mpPull());MPS.es=es}
/* a safety net for phones that drop the live connection */
setInterval(()=>{if(me&&online()&&!document.hidden){mpPull();mpSoon()}},15000);
window.addEventListener('online',()=>{mpSoon();mpPull()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&me){mpPull();mpSoon()}});

function mpApplyState(r){
  const st=r.state;MPS.rev=r.rev;MPS.scope=r.scope;if(r.cfg)MPS.cfg=r.cfg;
  if(!st.accounts||!st.accounts.length)st.accounts=[mpStubAccount()];
  S=st;initState();S.queue=S.queue||[];
  me=r.me?S.users.find(u=>u.id===r.me)||null:null;
  mpRebase();mpLocalSave()}
async function mpReloadState(){try{const r=await mpApi('/api/state');const id=me&&me.id;mpApplyState(r);if(id&&!me)return mpSessionLost();try{ctxApply()}catch(_){}mpRefresh()}catch(_){}}

function mpSessionLost(){if(!me)return;const id=me.id;me=null;if(MPS.es){MPS.es.close();MPS.es=null}try{localStorage.setItem('mp-lastuser',id);localStorage.removeItem(SK);sessionStorage.removeItem(SK)}catch(_){}toast('Please log in again. Your entries are safe on this device.','bad');go('login')}

async function mpBoot(){
  let sid=null;try{sid=localStorage.getItem(SK)||sessionStorage.getItem(SK)}catch(_){}
  const saved=!!(sid&&me);
  /* a returning person sees their saved copy at once, however slow the venue's network is */
  if(saved)render();else $('#root').innerHTML='<div style="min-height:100vh;display:grid;place-items:center;color:#64638A;font:15px system-ui,sans-serif">Loading Moi Point…</div>';
  /* anything saved here while offline goes up first, before fresh data replaces it */
  try{const b=localStorage.getItem(MP_BASE_KEY);if(saved&&b){MPS.base=new Map(JSON.parse(b));MPS.ready=true;const {payload,empty}=mpCollect();MPS.ready=false;if(!empty&&online())await mpApi('/api/sync',payload,12000)}}catch(_){}
  let fresh=false;
  try{
    const r=await mpApi('/api/state',undefined,12000);mpApplyState(r);fresh=true;
    try{if(r.imp)sessionStorage.setItem('mp-imp',r.imp);else sessionStorage.removeItem('mp-imp')}catch(_){}
    if(!me){try{localStorage.removeItem(SK);sessionStorage.removeItem(SK)}catch(_){}}
    else{try{ctxApply()}catch(_){}mpStream()}
  }catch(e){/* no server reachable: the saved copy keeps the counter working */}
  MPS.ready=true;
  if(fresh&&saved&&me)mpRefresh();else render()}

{const _s=save;save=function(){_s();if(MPS.ready&&me)mpSoon()}}

/* ---------- the server now runs these on time, so the browser copies stand down ---------- */
processDue=function(){};
autoBooks=function(){};
evAuto=function(){return 0};

/* ---------- logging in ---------- */
function mpFormError(f,field,e){if(field&&f.querySelector('#'+field))needAll(f,[[field,false,e.message]]);else toast(e.message,'bad')}
const mpLock=f=>{const b=f.querySelector('button.btn-primary,button:not([type=button])');if(b)b.disabled=true;return ()=>{if(b)b.disabled=false}};

async function mpLoggedIn(r,remember){
  let last=null;try{last=localStorage.getItem('mp-lastuser');localStorage.removeItem('mp-lastuser')}catch(_){}
  /* same person back after a lost session: send what they entered before reloading */
  if(last&&last===r.me){try{const b=localStorage.getItem(MP_BASE_KEY);if(b){MPS.base=new Map(JSON.parse(b));me=S.users.find(u=>u.id===r.me)||null;if(me){const {payload,empty}=mpCollect();if(!empty)await mpApi('/api/sync',payload);r=await mpApi('/api/state')}}}catch(_){}}
  mpApplyState(r);const u=me;me=null;loginAs(u,remember);mpStream()}

FORMS.login=async f=>{const id=f.querySelector('#l_user').value.trim().toLowerCase(),pw=f.querySelector('#l_pw').value,remember=f.querySelector('#l_rem').checked;
  if(!needAll(f,[['l_user',!!id,'Enter your email'],['l_pw',!!pw,'Enter your password']]))return;
  const un=mpLock(f);try{const r=await mpApi('/api/auth/login',{email:id,password:pw,remember});AUTH.email='';await mpLoggedIn(r,remember)}
  catch(e){e.status===401?needAll(f,[['l_pw',false,e.message]]):toast(e.message,'bad')}finally{un()}};

ACT.logout=async()=>{log(null,'Logged out',me.name);save();clearTimeout(MPS.timer);await mpPush().catch(()=>{});try{await mpApi('/api/auth/logout',{})}catch(_){}
  /* a shared phone must not keep this account's data */
  try{[K,K+'-ts',MP_BASE_KEY,SK,'mp-lastuser'].forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem(SK);sessionStorage.removeItem('mp-imp')}catch(_){}
  location.hash='home';location.reload()};

sendOtp=async function(via){AUTH.via=via;try{const r=await mpApi('/api/auth/signup/otp',{mobile:AUTH.mobile});AUTH.code=r.devCode||'';AUTH.sent=Date.now();AUTH.step='otp';AUTH.sends++;toast('Code sent by SMS');render()}
  catch(e){if(e.data&&e.data.login){AUTH.email='';toast(e.message,'bad');return go('login')}toast(e.message,'bad')}};
FORMS.otpVerify=async f=>{const c=f.querySelector('#otp_code').value.replace(/\D/g,'');if(!needAll(f,[['otp_code',c.length===6,'Enter the 6-digit code']]))return;
  try{const r=await mpApi('/api/auth/signup/verify',{mobile:AUTH.mobile,code:c});AUTH.ticket=r.ticket;AUTH.step='profile';AUTH.verified=AUTH.mobile;imgBuf.su_photo=null;AUTH.state='Tamil Nadu';render()}
  catch(e){needAll(f,[['otp_code',false,e.message]])}};
FORMS.signup=async f=>{const v=id=>{const el=f.querySelector('#'+id);return el?el.value.trim():''};const name=v('su_name'),email=v('su_email').toLowerCase(),mob=AUTH.mobile,pw=(f.querySelector('#su_pw')||{}).value||'',pw2=(f.querySelector('#su_pw2')||{}).value||'';
  if(!mob||AUTH.verified!==mob||!AUTH.ticket){AUTH.step='mobile';return render()}
  const emOk=/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
  if(!needAll(f,[['su_name',!!name,'Enter your name'],['su_email',emOk,!email?'Enter your email':'Enter a valid email, e.g. name@gmail.com'],['su_pw',pwOk(pw),'Use 8 or more characters with letters and numbers'],['su_pw2',!!pw2&&pw2===pw,!pw2?'Type the password again':'The two passwords are not the same'],['su_dist',!!v('su_dist'),'Add your district'],['su_city',!!v('su_city'),'Add your city or town'],['su_terms',f.querySelector('#su_terms').checked,'Please agree to the terms to continue']]))return;
  const un=mpLock(f);
  try{const r=await mpApi('/api/auth/signup',{mobile:mob,ticket:AUTH.ticket,name,email,password:pw,kind:v('su_kind'),biz:v('su_biz'),state:v('su_state'),district:v('su_dist'),city:v('su_city'),source:v('su_src'),photo:imgBuf.su_photo||null,lang:UIL==='ta'?'ta':'en'});
    mpApplyState(r);try{localStorage.setItem(SK,me.id)}catch(_){}AUTH.step='mobile';AUTH.mobile='';AUTH.verified='';AUTH.ticket='';AUTH.sends=0;imgBuf.su_photo=null;
    log(null,'Account created',`${myAcc().name} · ${v('su_city')}, ${v('su_dist')}, ${v('su_state')} · via ${myAcc().source}`);log(null,'Logged in',me.name);save();mpStream();toast(`Welcome, ${first(name)}! From next time, log in with ${email}.`);go('dashboard')}
  catch(e){if(e.status===401){AUTH.step='mobile';toast(e.message,'bad');return render()}mpFormError(f,/email/i.test(e.message)?'su_email':null,e)}finally{un()}};

/* ---------- forgot password ---------- */
FORMS.fpFind=async f=>{const e=f.querySelector('#fp_email').value.trim().toLowerCase(),ok=/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e);
  if(!needAll(f,[['fp_email',ok,!e?'Enter your email':'Enter a valid email']]))return;
  try{const u=await mpApi('/api/auth/forgot/find',{email:e});fpClear(u);render();fpFocus('fp_mob')}catch(err){needAll(f,[['fp_email',false,err.message]])}};
FORMS.fpMob=async f=>{const u=fp.u,m=normMob(f.querySelector('#fp_mob').value);if(!u)return render();if(!needAll(f,[['fp_mob',mobOk(m),MOBERR]]))return;fp.mob=m;
  const ok=await fpOtpSend(f);if(!ok)return};
fpOtpSend=async function(f){try{const r=await mpApi('/api/auth/forgot/send',{email:fp.u.email,mobile:fp.mob});fp.code=r.devCode||'';fp.sends++;fp.tries=0;fp.at=Date.now();fp.next=fp.at+30000;fp.step='otp';toast('Code sent by SMS');render();fpFocus('fp_code');return true}
  catch(e){if(f&&f.querySelector('#fp_mob'))needAll(f,[['fp_mob',false,e.message]]);else toast(e.message,'bad');return false}};
FORMS.fpOtp=async f=>{const c=f.querySelector('#fp_code').value.replace(/\D/g,'');if(!needAll(f,[['fp_code',c.length===6,'Enter the 6-digit code']]))return;
  try{const r=await mpApi('/api/auth/forgot/verify',{email:fp.u.email,code:c});fp.ticket=r.ticket;fp.resetTok=tok_();fp.email=fp.u.email;fp.code='';go('reset-'+fp.resetTok)}
  catch(e){needAll(f,[['fp_code',false,e.message]])}};
{const _vr=vReset;vReset=function(t){const ok=t===fp.resetTok&&fp.ticket;const was=S.users,wr=P().resets;
  /* the page only needs to know this step is open and whose address to show */
  P().resets=ok?{[t]:{uid:'_reset',exp:Date.now()+6e5}}:{};S.users=ok?[{id:'_reset',email:fp.email}]:[];try{return _vr(t)}finally{S.users=was;P().resets=wr}}}
FORMS.resetPw=async f=>{const pw=f.querySelector('#rp_pw').value,pw2=f.querySelector('#rp_pw2').value;
  if(!needAll(f,[['rp_pw',pwOk(pw),'Use 8 or more characters with letters and numbers'],['rp_pw2',!!pw2&&pw2===pw,!pw2?'Type the password again':'The two passwords are not the same']]))return;
  const un=mpLock(f);
  try{const r=await mpApi('/api/auth/reset',{email:fp.email,ticket:fp.ticket,password:pw});const email=fp.email;fp.resetTok='';fp.ticket='';fpClear();
    if(r.loggedIn){mpApplyState(r);const u=me;me=null;loginAs(u,true);mpStream();log(null,'Password changed',u.name);save();toast('Password changed. You are logged in.','good')}
    else{AUTH.email=email;toast(r.error||'Password saved. Log in with your new password.','bad');go('login')}}
  catch(e){toast(e.message,'bad');if(e.status===401){fp.resetTok='';render()}}finally{un()}};

FORMS.pfPw=async f=>{if(me.role!=='admin'&&me.role!=='platform')return toast('Your event owner manages your password.','bad');const cur=f.querySelector('#pp_cur'),pw=f.querySelector('#su_pw').value,pw2=f.querySelector('#pp_pw2').value;
  if(!needAll(f,[...(cur?[['pp_cur',!!cur.value,'Enter your current password']]:[]),['su_pw',pwOk(pw),'Use 8 or more characters with letters and numbers'],['pp_pw2',!!pw2&&pw2===pw,!pw2?'Type the new password again':'The two passwords are not the same']]))return;
  try{const r=await mpApi('/api/auth/password',{current:cur?cur.value:undefined,password:pw});mpPut('users',me.id,r.user);log(null,'Password changed',me.name);save();toast('Password changed. Use it next time you log in.','good');render()}
  catch(e){mpFormError(f,e.data&&e.data.field==='current'?'pp_cur':null,e)}};

/* typed passwords go to the server once and are never kept here */
setPw=function(u,pw){u.pwHint=pw.slice(0,2)+'\u0001'+pw.slice(-2);u.pwLen=pw.length;u.pwAt=Date.now();MPS.pw[u.id]=pw;delete u.pw};

/* ---------- support view ---------- */
async function mpImpersonate(u){try{const by=me.id;log(null,'Support view opened',u.name);save();await mpPush();const r=await mpApi('/api/admin/impersonate',{userId:u.id});mpApplyState(r);try{sessionStorage.setItem('mp-imp',by);sessionStorage.setItem(SK,u.id);localStorage.removeItem(SK)}catch(_){}mpStream();go('dashboard')}catch(e){toast(e.message,'bad')}}
ACT.impExit=async()=>{try{const A=myAcc();log(null,'Support view closed',A?A.name:'');save();await mpPush();const r=await mpApi('/api/admin/impersonate/exit',{});mpApplyState(r);try{sessionStorage.removeItem('mp-imp');sessionStorage.setItem(SK,me.id);localStorage.removeItem(SK)}catch(_){}mpStream();go('admin-accounts')}catch(e){toast(e.message,'bad')}};

/* ---------- messages: every send says which trigger it is, for the automation team ---------- */
let MP_MSG=null,MP_TRIG=null;
const mpWith=(ctx,fn)=>{const p=MP_MSG;MP_MSG=ctx;try{return fn()}finally{MP_MSG=p}};
{const _sm=sendMsg;sendMsg=function(ch,to,text,eid,owner){const n0=S.notifications.length,r=_sm(ch,to,text,eid,owner);if(MP_MSG&&S.notifications.length>n0)Object.assign(S.notifications[S.notifications.length-1],MP_MSG);return r}}
const mpMoiVars=(ev,m)=>{const lg=evLang(ev);return {guest:nm(m,lg),amount:amtTxt(m,lg),event:ev.name,receipt:m.code}};
{const _n=notify;notify=function(ev,m,kind){return mpWith({trigger:MP_TRIG||(kind==='verified'?'C2':'C1'),mid:m.id,vars:mpMoiVars(ev,m)},()=>_n(ev,m,kind))}}
const mpTrig=(act,t)=>{const f=ACT[act];ACT[act]=(...a)=>{MP_TRIG=t;try{return f(...a)}finally{MP_TRIG=null}}};
mpTrig('collected','C3');mpTrig('wpCash','C4');
{const _po=FORMS.po;FORMS.po=f=>mpWith({trigger:'C9'},()=>_po(f))}
{const _iv=FORMS.invite;FORMS.invite=f=>{const img=inv.img,n0=S.notifications.length;
  const r=mpWith({trigger:'C11',kind:inv.kind},()=>_iv(f));
  const L=S.msgLog[0];if(L&&S.notifications.length>n0){if(img)L.img=img;S.notifications.slice(n0).forEach(n=>{n.logId=L.id});save()}return r}}
rStat=function(L,r){if(r.st==='queue')return {s:'wait',t:0,why:'Waiting for internet'};if(r.st==='credit')return {s:'wait',t:0,why:'Waiting for credits'};
  if(r.ds)return {s:r.ds.s,t:r.ds.t,why:r.ds.s==='fail'?'Number not on '+(r.ch==='wa'?'WhatsApp':'SMS')+' or switched off':undefined};return {s:'sent',t:L.at}};
async function mpCampaign(aud,ch,text,list){if(ch==='app')return;try{const r=await mpApi('/api/admin/campaign',{aud,ch,text,mobiles:list.map(x=>x.mobile).filter(Boolean)});if(r.skipped)toast(`${r.skipped} skipped: they have not agreed to offers`,'bad')}catch(e){toast(e.message,'bad')}}

/* ---------- money: the server works out the price and adds the credits ---------- */
ACT.buySim=async()=>{const q=buyQ,cc=buyCode,ok=document.getElementById('buy_ok');if(ok&&!ok.checked){const l=document.getElementById('buyOkL');if(l){l.classList.add('invalid');l.scrollIntoView({block:'center'});ok.addEventListener('change',()=>l.classList.remove('invalid'),{once:true})}return toast('Tick the box to agree to the no-refund terms','bad')}
  try{const r=await mpApi('/api/credits/purchase',{accountId:curAcc().id,qty:q,code:cc?cc.c.code:null});mpPut('accounts',r.account.id,r.account);walletSync(curAcc().wallet);buyCode=null;log(null,'Credits purchased',`${cr(r.credits)} credits · ${fmt(r.total)}${cc?' · code '+cc.c.code:''}`);save();closeModal();toast(`${cr(r.credits)} credits added. Messages are ready to send.`);render();mpPull()}
  catch(e){if(/available/.test(e.message))stockAlert(q,'pay');toast(e.message,'bad')}};
FORMS.planPay=async f=>{try{const k=f.dataset.k,r=await mpApi('/api/plan/pay',{plan:k});mpPut('accounts',r.account.id,r.account);log(null,'Plan changed',P().plans[k].name);save();closeModal();toast(`You are on the ${P().plans[k].name} plan till ${dfmt(r.account.sub.end)}`);render()}catch(e){toast(e.message,'bad')}};
ACT.bookAgain=async b=>{try{await mpApi('/api/events/'+encodeURIComponent(b.dataset.id)+'/book',{});toast('Moi Book PDF sent again on WhatsApp','good');mpPull()}catch(e){toast(e.message,'bad')}};
ACT.resetDemo=()=>toast('Sample data lives on the server now. Use npm run db:reset on the server to start over.','bad');

/* ---------- guest QR page ---------- */
const mpHasEvent=k=>{const t=decodeURIComponent(k).toUpperCase().replace(/^EV-(\d+)$/,'EV$1');return S.events.some(e=>(e.no&&e.no.toUpperCase()===t)||e.token===k||(e.oldNo&&e.oldNo.toUpperCase()===t))};
const mpSeen=new Set();
function mpAddPublic(r){if(r.account&&!S.accounts.some(a=>a.id===r.account.id)){S.accounts.push(r.account);walletSync(r.account.wallet)}if(r.event&&!S.events.some(e=>e.id===r.event.id))S.events.push(r.event)}
{const _r=render;render=function(){const h=location.hash.slice(1)||'home';
  const k=h.startsWith('pay-')?h.slice(4):/^EV-?\d+$|^EV-\d{4}-\d+$/i.test(h)?h:null;
  if(k&&!mpHasEvent(k)&&!mpSeen.has(k)){mpSeen.add(k);mpApi('/api/public/event/'+encodeURIComponent(k)).then(r=>{mpAddPublic(r)}).catch(()=>{}).finally(()=>render());return}
  if(/^r\//.test(h)){const code=decodeURIComponent(h.slice(2)).trim();if(!S.moi.some(x=>String(x.code).toLowerCase()===code.toLowerCase())&&!mpSeen.has('r/'+code)){mpSeen.add('r/'+code);mpApi('/api/public/receipt?code='+encodeURIComponent(code)).then(r=>{if(r.moi){mpAddPublic(r);S.moi.push(r.moi)}}).catch(()=>{}).finally(()=>render());return}}
  return _r.apply(this,arguments)}}

qrOtpSend=async function(){const o=qo;if(o.sends>=3)return qrOtpView('Too many codes sent. Please give your Moi at the counter.');
  try{const r=await mpApi('/api/public/otp/send',{eventId:o.ev,mobile:o.mobile});o.code=r.devCode||'';o.sends++;o.next=Date.now()+30000;o.tries=0;o.at=Date.now();qrOtpView()}
  catch(e){o.code='';qrOtpView(e.message)}};
qrOtpCheck=async function(f){const o=qo,i=document.getElementById('qo_code');if(!o||!i)return;const v=i.value.replace(/\D/g,'');
  if(v.length!==6)return bad(i.form,'qo_code','Enter the 6-digit code');
  try{const r=await mpApi('/api/public/otp/verify',{eventId:o.ev,mobile:o.mobile,code:v});const fl=flows.public;fl.otpOk=o.mobile;fl.ticket=r.ticket;qrOk.add(o.ev+':'+o.mobile);clearInterval(o.iv);closeModal();toast('Mobile confirmed','good');const form=document.querySelector('form[data-form="pub"]');if(form)submitMoi('public',form)}
  catch(e){bad(i.form,'qo_code',e.message)}};
async function mpGuestMoi(ev,c,amount,mode,meta){const fl=flows.public,{mobile,...who}=c;
  try{const r=await mpApi('/api/public/moi',{eventId:ev.id,mobile,ticket:fl.ticket,mode,amount,c:who,utr:meta.utr||undefined,shot:meta.shot||null,upiAcc:meta.upiAcc,fee:meta.fee,feeBy:meta.feeBy});
    const m=r.moi;S.moi.push(m);try{announce(ev,m)}catch(_){}imgBuf.pshot=null;fl.stage='done';fl.moiId=m.id;lastH='';render();mpWatchGuest(m,fl.ticket)}
  catch(e){if(e.status===401){fl.otpOk=null;qrOk.delete(ev.id+':'+mobile)}toast(e.message,'bad')}}
/* the guest's page updates by itself when the counter accepts their entry */
function mpWatchGuest(m,ticket){if(me||!OK||OK(m))return;const iv=setInterval(async()=>{try{const r=await mpApi(`/api/public/moi/${m.id}?mobile=${m.c.mobile}&ticket=${encodeURIComponent(ticket)}`);if(r.moi.status!==m.status){Object.assign(m,r.moi);render();if(OK(m))clearInterval(iv)}}catch(_){clearInterval(iv)}},8000)}

/* ---------- website enquiry and demo forms ---------- */
lOtpSend=async function(){const o=lo;if(!o)return;if(o.sends>=3)return lOtpView('Too many codes sent. Please call or WhatsApp us instead.');
  try{const r=await mpApi('/api/public/lead/otp',{mobile:o.mobile});o.code=r.devCode||'';o.sends++;o.next=Date.now()+30000;o.tries=0;o.at=Date.now();lOtpView()}catch(e){lOtpView(e.message)}};
{const _lc=lOtpCheck;lOtpCheck=async function(f){const o=lo,i=document.getElementById('lo_code');if(!o||!i)return;const v=i.value.replace(/\D/g,'');if(v.length!==6)return bad(f,'lo_code','Enter the 6-digit code');
  try{const r=await mpApi('/api/public/lead/verify',{mobile:o.mobile,code:v,kind:o.kind,data:o.data});o.code=v;const was=P().leads;P().leads=[];try{_lc(f)}finally{P().leads=was}}catch(e){bad(f,'lo_code',e.message)}}}

/* ---------- finding people beyond this device's own data ---------- */
const mpLooked=new Set();let mpFindT=0;
document.addEventListener('input',e=>{const t=e.target;if(!t||!me)return;const isEm=t.id==='u_user'||/^t_user\d+$/.test(t.id),isMob=t.id==='u_mobile'||/^t_mob\d+$/.test(t.id);if(!isEm&&!isMob)return;
  const v=t.value.trim().toLowerCase(),ok=isEm?/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v):mobOk(normMob(v));if(!ok||mpLooked.has(v))return;
  clearTimeout(mpFindT);mpFindT=setTimeout(async()=>{mpLooked.add(v);try{const r=await mpApi('/api/people/find',isEm?{email:v}:{mobile:normMob(v)});if(r.user&&!S.users.some(u=>u.id===r.user.id)){S.users.push({...r.user,_ext:1});t.dispatchEvent(new Event('input',{bubbles:true}))}}catch(_){}},250)});
{const _lk=lookup;lookup=function(px,raw){_lk(px,raw);const mob=normMob(raw);if(!me||!mobOk(mob)||pplGet(mob)||mpLooked.has(mob))return;mpLooked.add(mob);
  mpApi('/api/people/lookup',{mobile:mob}).then(r=>{if(r.person){S.people[mob]=r.person;MPS.base.set('people/'+mob,hash(JSON.stringify(r.person)));_lk(px,raw)}}).catch(()=>{})}}
