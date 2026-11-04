/* ================= V62: Invitation card maker inside every event — 20 designs, customise, preview, download ================= */
const IVT=[
 ['temple','Temple Gold','trad','arch','#C9A04F'],['royal','Royal Maroon','trad','none','#D9AE5B'],['kolam','Kolam White','trad','circle','#C2410C'],['banana','Banana Leaf','trad','circle','#2E7D32'],
 ['silk','Silk Saree Border','trad','none','#E6B34A'],['marigold','Marigold Festive','trad','polaroid','#F59E0B'],['peacock','Peacock Teal','trad','circle','#D9A93E'],['rangoli','Rangoli Purple','trad','none','#F5B83D'],
 ['lotus','Lotus Pink','family','circle','#C2185B'],['valaikappu','Bangles & Blessings','family','circle','#B8336A'],['griha','House Warming','family','top','#C2410C'],['floral','Floral Pastel','family','circle','#D9668A'],
 ['ivory','Ivory Elegant','modern','circle','#B08A3C'],['midnight','Midnight Gold','modern','none','#E2B65A'],['minimal','Modern Minimal','modern','top','#17734A'],['navy','Classic Navy','modern','none','#C9A04F'],
 ['photo','Full Photo','photo','full','#FFD27A'],['split','Photo on Top','photo','top','#3B33B5'],['balloons','Sky Balloons','kids','circle','#2563EB'],['confetti','Confetti Pop','kids','polaroid','#E11D48']];
const IVCAT=[['all','All 20'],['trad','Traditional'],['family','Family functions'],['modern','Modern'],['photo','Big photo'],['kids','Birthday & kids']];
const IVACC=['#C9A04F','#D9AE5B','#C2410C','#B8336A','#2E7D32','#0E7C7B','#2563EB','#3B33B5','#111827','#E11D48'];
const ivTpl=k=>IVT.find(t=>t[0]===k)||IVT[0];
function ivDefaults(ev,lg){lg=lg||'en';const TN=s=>s&&lg!=='en'&&IBASE[lg]?locPhrase(String(s),lg,false):(s||'');const d=new Date(ev.date+'T00:00');
  const dl=isNaN(d)?dfmt(ev.date):d.toLocaleDateString(lg==='ta'?'ta-IN':'en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const org=ev.organizer||(me&&me.name)||'';const mob=ev.orgMobile?String(ev.orgMobile).replace(/(\d{5})(\d{5})/,'$1 $2'):'';
  const T={en:{top:'With the blessings of the Almighty',host:org?`${org} & Family`:'Our family',lead:'cordially invite you to',msg:'Your presence with family and friends will make the occasion complete.',rsvp:org?`Contact: ${org}${mob?' · '+mob:''}`:''},
    ta:{top:'இறைவன் அருளால்',host:org?`${TN(org)} குடும்பத்தினர்`:'எங்கள் குடும்பத்தினர்',lead:'அன்புடன் அழைக்கிறோம்',msg:'தாங்கள் குடும்பத்துடன் வருகை தந்து விழாவைச் சிறப்பிக்குமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.',rsvp:org?`தொடர்புக்கு: ${TN(org)}${mob?' · '+mob:''}`:''}}[lg==='ta'?'ta':'en'];
  return {top:T.top,host:T.host,lead:T.lead,title:TN(ev.name),sub:TN(ev.type||''),date:dl,time:`${tfmt(ev.start)} – ${tfmt(ev.end)}`,venue:TN(ev.venue||''),addr:TN(ev.address||''),msg:T.msg,rsvp:T.rsvp}}
function ivState(ev){if(!ev.invCard){const lg=evLang(ev)==='ta'?'ta':'en';ev.invCard={tpl:'temple',lg,acc:'',photo:true,qr:true,size:'card',img:'',f:ivDefaults(ev,lg)}}const c=ev.invCard;c.f=c.f||ivDefaults(ev,c.lg);return c}
function ivcHtml(ev,c,o){o=o||{};const t=ivTpl(o.tpl||c.tpl),k=t[0],f=c.f,ph=c.img||(ev.logo||''),showPh=c.photo&&ph&&t[3]!=='none',acc=c.acc||t[4],story=(o.size||c.size)==='story';
  const P=s=>esc(s||'').replace(/\n/g,'<br>');
  const photo=showPh?`<figure class="iv-ph iv-ph-${t[3]}"><span class="iv-phi" role="img" aria-label="Event photo" style="background-image:url('${ph}')"></span></figure>`:'';
  return `<div class="ivc iv-${k} ${story?'story':''} ${showPh?'has-ph':'no-ph'} ${t[3]==='full'&&showPh?'ph-full':''}" style="--ac:${acc}" data-ivc="${k}" lang="${c.lg==='ta'?'ta':'en'}">
   ${t[3]==='full'&&showPh?`<div class="iv-bg" style="background-image:url('${ph}')"></div><div class="iv-shade"></div>`:''}
   <div class="iv-deco" aria-hidden="true"><i class="d1"></i><i class="d2"></i><i class="d3"></i><i class="d4"></i><i class="d5"></i><i class="d6"></i></div>
   ${t[3]==='top'&&showPh?photo:''}
   <div class="iv-in">
     ${f.top?`<p class="iv-top">${P(f.top)}</p>`:''}
     ${t[3]!=='top'&&t[3]!=='full'?photo:''}
     ${f.host?`<p class="iv-host">${P(f.host)}</p>`:''}${f.lead?`<p class="iv-lead">${P(f.lead)}</p>`:''}
     <h1 class="iv-title">${P(f.title)}</h1>${f.sub?`<p class="iv-sub">${P(f.sub)}</p>`:''}
     <div class="iv-orn"><i></i><span>${{temple:'✦',royal:'❖',kolam:'✿',banana:'❦',silk:'◆',marigold:'❀',peacock:'✺',rangoli:'✹',lotus:'❁',valaikappu:'◯',griha:'⌂',floral:'✿',ivory:'❦',midnight:'◆',minimal:'',navy:'◆',photo:'✦',split:'●',balloons:'★',confetti:'✱'}[k]}</span><i></i></div>
     <div class="iv-when"><b>${P(f.date)}</b>${f.time?`<span>${P(f.time)}</span>`:''}</div>
     <div class="iv-where"><b>${P(f.venue)}</b>${f.addr?`<span>${P(f.addr)}</span>`:''}</div>
     ${f.msg?`<p class="iv-msg">${P(f.msg)}</p>`:''}
     ${f.rsvp?`<p class="iv-rsvp">${P(f.rsvp)}</p>`:''}
     ${c.qr&&!o.mini?`<div class="iv-qr"><span class="iv-qrb"><span class="qr-box" data-qr="${payUrl(ev)}" data-size="${story?84:70}"></span></span><span>${c.lg==='ta'?'மொய் செய்ய ஸ்கேன் செய்யுங்கள்':'Scan to give Moi'}<small>${esc(payUrl(ev).replace('https://',''))}</small></span></div>`:''}
   </div>
   ${feat('brand',ev)?'':`<p class="iv-brand">Made with Moi Point · moipoint.in</p>`}
  </div>`}
/* fit long text inside the card */
function ivFit(root){(root||document).querySelectorAll('.ivc').forEach(card=>{const inn=card.querySelector('.iv-in');if(!inn)return;const need=()=>{const k=[...inn.children].filter(x=>x.offsetHeight);if(!k.length)return 0;const cs=getComputedStyle(inn);return k[k.length-1].offsetTop+k[k.length-1].offsetHeight-k[0].offsetTop+parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)};
  let fs=1;card.style.setProperty('--fs',fs);let n=0;while(n++<16&&need()>inn.clientHeight-2&&fs>.56){fs-=.04;card.style.setProperty('--fs',fs.toFixed(2))}})}
/* ---------- the page ---------- */
const ivUi={tab:'designs',cat:'all'};
function vInvite(ev){const c=ivState(ev),t=ivTpl(c.tpl);
  return `<div class="page-head"><div><h1>Invitation card</h1><p class="sub">Pick one of 20 designs, change the words and colours, see the preview, then download or send it to guests.</p></div></div>
  <div class="iv-page">
    <section class="iv-left card pad">
      <div class="iv-tabs" role="tablist">${[['designs','Designs','grid'],['words','Words','edit'],['style','Photo & style','sliders']].map(([k,l,i])=>`<button type="button" role="tab" aria-selected="${ivUi.tab===k}" class="${ivUi.tab===k?'on':''}" data-act="ivTab" data-k="${k}">${ic(i,16)}${l}</button>`).join('')}</div>
      <div id="ivPanel">${ivPanel(ev)}</div>
    </section>
    <section class="iv-right"><div class="iv-sticky">
      <div class="iv-ph-head"><b>Preview</b><span class="muted small" id="ivName">${esc(t[1])} · ${c.size==='story'?'Status 9:16':'Card 5:7'}</span></div>
      <div class="iv-stage ${c.size==='story'?'story':''}" id="ivStage"><div class="iv-scale">${ivcHtml(ev,c)}</div></div>
      <div class="iv-acts">
        <button class="btn btn-primary" data-act="ivDl" data-size="card">${ic('down',18)}Download card (PNG)</button>
        <button class="btn btn-soft" data-act="ivDl" data-size="story">${ic('down',18)}Status size 9:16</button>
        <button class="btn btn-wa" data-act="ivSend">${ic('msg',18)}Send to guests</button>
        <button class="btn btn-ghost" data-act="ivPdf">${ic('bill',18)}Print / PDF</button>
      </div>
      <p class="small muted iv-note">${ic('check',14)} Changes save automatically for this event / function.</p>
    </div></section>
  </div>`}
function ivPanel(ev){const c=ivState(ev);
  if(ivUi.tab==='designs'){const list=IVT.filter(t=>ivUi.cat==='all'||t[2]===ivUi.cat);
    return `<div class="chips iv-cats">${IVCAT.map(([k,l])=>`<button type="button" class="chip ${ivUi.cat===k?'on':''}" data-act="ivCat" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="iv-grid">${list.map(t=>`<button type="button" class="iv-tile ${c.tpl===t[0]?'on':''}" data-act="ivTpl" data-k="${t[0]}" aria-pressed="${c.tpl===t[0]}"><span class="iv-mini"><span class="iv-mini-in">${ivcHtml(ev,c,{tpl:t[0],size:'card',mini:1})}</span></span><b>${t[1]}</b><small>${t[3]==='none'?'No photo':t[3]==='full'?'Full photo':'With photo'}</small></button>`).join('')}</div>`}
  if(ivUi.tab==='words'){const f=c.f,F=(k,l,area)=>`<label class="field ${area?'full':''}" for="iv_${k}"><span>${l}</span>${area?`<textarea id="iv_${k}" data-ivf="${k}" rows="2">${esc(f[k]||'')}</textarea>`:`<input id="iv_${k}" data-ivf="${k}" value="${esc(f[k]||'')}">`}</label>`;
    return `<div class="iv-lang"><span class="lbl">Fill the card in</span><div class="chips">${[['en','English'],['ta','தமிழ்']].map(([k,l])=>`<button type="button" class="chip ${c.lg===k?'on':''}" data-act="ivLang" data-k="${k}">${l}</button>`).join('')}</div><button type="button" class="btn btn-ghost btn-sm" data-act="ivReset">${ic('undo',16)}Reset words</button></div>
     <div class="fields">${F('top','Top line (blessing)')}${F('host','Who is inviting')}${F('lead','Invite line')}${F('title','Function name')}${F('sub','Function type / small line')}${F('date','Date')}${F('time','Time')}${F('venue','Venue')}${F('addr','Address',1)}${F('msg','Message',1)}${F('rsvp','Contact line',1)}</div>
     <p class="small muted">Leave a box empty to hide that line. Long words shrink to fit the card.</p>`}
  return `<div class="stack" style="gap:14px">
    <div><span class="lbl">Main colour</span><div class="iv-sw">${['',...IVACC].map(a=>`<button type="button" class="iv-swb ${(c.acc||'')===a?'on':''}" data-act="ivAcc" data-v="${a}" style="--sw:${a||ivTpl(c.tpl)[4]}" aria-label="${a?'Colour '+a:'Design colour'}">${a?'':ic('refresh',14)}</button>`).join('')}<label class="iv-swc" title="Any colour"><input type="color" id="iv_acc" value="${c.acc||ivTpl(c.tpl)[4]}">${ic('plus',14)}</label></div><small class="muted">The round arrow keeps the design’s own colour.</small></div>
    <div><span class="lbl">Photo</span><div class="iv-phrow">
      <label class="check"><input type="checkbox" id="iv_photo" ${c.photo?'checked':''}> Show a photo (on designs that have one)</label>
      <div class="btn-row"><label class="btn btn-soft btn-sm" for="iv_img">${ic('upload',16)}${c.img?'Change photo':'Use another photo'}<input type="file" id="iv_img" accept="image/png,image/jpeg,image/webp" hidden></label>${c.img?`<button type="button" class="btn btn-ghost btn-sm" data-act="ivImgDel">${ic('x',16)}Use event photo</button>`:''}</div>
      <small class="muted">${ev.logo||c.img?'The event / function photo is used unless you choose another.':'This event / function has no photo yet. Add one here or in Settings.'}</small></div></div>
    <label class="check"><input type="checkbox" id="iv_qr" ${c.qr?'checked':''}> Add the Moi QR code (guests who can’t come can scan and give Moi)</label>
    <div><span class="lbl">Size</span><div class="chips">${[['card','Card 5:7 · print & WhatsApp'],['story','Status 9:16 · WhatsApp / Instagram status']].map(([k,l])=>`<button type="button" class="chip ${c.size===k?'on':''}" data-act="ivSize" data-k="${k}">${l}</button>`).join('')}</div></div>
  </div>`}
function ivPaint(ev,all){const c=ivState(ev),st=document.getElementById('ivStage');if(st){st.classList.toggle('story',c.size==='story');st.querySelector('.iv-scale').innerHTML=ivcHtml(ev,c);try{mountQR(st)}catch(_){}ivFit(st);ivScale()}
  const nm=document.getElementById('ivName');if(nm)nm.textContent=`${ivTpl(c.tpl)[1]} · ${c.size==='story'?'Status 9:16':'Card 5:7'}`;
  if(all){const p=document.getElementById('ivPanel');if(p){p.innerHTML=ivPanel(ev);try{mountQR(p)}catch(_){}ivFit(p)}}}
function ivMini(){document.querySelectorAll('.iv-mini').forEach(m=>{if(m.clientWidth)m.style.setProperty('--ms',(m.clientWidth/540).toFixed(4))})}
function ivScale(){ivMini();document.querySelectorAll('#ivStage').forEach(st=>{const card=st.querySelector('.ivc');if(!card)return;const w=st.clientWidth-24,z=Math.min(1,w/540);const sc=st.querySelector('.iv-scale');sc.style.transform=`scale(${z})`;sc.style.left=Math.max(12,(st.clientWidth-540*z)/2)+'px';st.style.height=(card.offsetHeight*z+24)+'px'})}
let ivSaveT=0;const ivSave=ev=>{clearTimeout(ivSaveT);ivSaveT=setTimeout(()=>{save()},500)};
Object.assign(ACT,{
  ivTab:b=>{ivUi.tab=b.dataset.k;document.querySelectorAll('.iv-tabs button').forEach(x=>{const on=x.dataset.k===ivUi.tab;x.classList.toggle('on',on);x.setAttribute('aria-selected',on)});ivPaint(curEv,true)},
  ivCat:b=>{ivUi.cat=b.dataset.k;ivPaint(curEv,true)},
  ivTpl:b=>{const c=ivState(curEv);c.tpl=b.dataset.k;c.acc='';ivSave(curEv);document.querySelectorAll('.iv-tile').forEach(x=>{const on=x.dataset.k===c.tpl;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});ivPaint(curEv);if(matchMedia('(max-width:900px)').matches){const s=document.getElementById('ivStage');s&&s.scrollIntoView({behavior:'smooth',block:'center'})}},
  ivLang:b=>{const c=ivState(curEv);c.lg=b.dataset.k;c.f=ivDefaults(curEv,c.lg);ivSave(curEv);ivPaint(curEv,true);toast(c.lg==='ta'?'Card words filled in Tamil':'Card words filled in English')},
  ivReset:()=>{const c=ivState(curEv);c.f=ivDefaults(curEv,c.lg);ivSave(curEv);ivPaint(curEv,true);toast('Words reset')},
  ivAcc:b=>{const c=ivState(curEv);c.acc=b.dataset.v;ivSave(curEv);ivPaint(curEv,true)},
  ivSize:b=>{const c=ivState(curEv);c.size=b.dataset.k;ivSave(curEv);ivPaint(curEv,true)},
  ivImgDel:()=>{const c=ivState(curEv);c.img='';ivSave(curEv);ivPaint(curEv,true)},
  ivDl:async b=>{const ev=curEv,c=ivState(ev),size=b.dataset.size;b.disabled=true;const old=b.innerHTML;b.innerHTML=`${ic('refresh',18)}Preparing…`;
    try{const url=await ivPng(ev,size);const nm=`invitation-${(ev.no||ev.id)}-${c.tpl}${size==='story'?'-status':''}.png`;await saveOut(nm,url,'image/png')}catch(e){console.error(e);toast('Could not make the picture here. Check the internet once and try again.','bad')}
    b.disabled=false;b.innerHTML=old},
  ivSend:async b=>{const ev=curEv;b.disabled=true;try{const url=await ivPng(ev,ivState(ev).size);msgOpen({kind:'invite',ev:ev.id,img:url,aud:'ev'})}catch(e){console.error(e);msgOpen({kind:'invite',ev:ev.id})}b.disabled=false},
  ivPdf:async()=>{const ev=curEv,c=ivState(ev);let url='';try{url=await ivPng(ev,c.size)}catch(e){return toast('Could not make the picture here.','bad')}
    let pa=document.getElementById('printArea');if(!pa){pa=document.createElement('div');pa.id='printArea';document.body.appendChild(pa)}pa.innerHTML=`<div class="iv-print"><img src="${url}" alt="Invitation"></div>`;
    let ps=document.getElementById('printPage');if(!ps){ps=document.createElement('style');ps.id='printPage';document.head.appendChild(ps)}ps.textContent=`@page{size:${c.size==='story'?'108mm 192mm':'A5 portrait'};margin:0}`;
    if(framed){toast('Printing is blocked in this preview. Use Download card instead.','bad');return}setTimeout(()=>{try{window.print()}catch(e){}},200)}
});
document.addEventListener('input',e=>{const t=e.target;if(!t||!curEv)return;if(t.dataset&&t.dataset.ivf){const c=ivState(curEv);c.f[t.dataset.ivf]=t.value;ivSave(curEv);ivPaint(curEv);return}
  if(t.id==='iv_acc'){const c=ivState(curEv);c.acc=t.value;ivSave(curEv);ivPaint(curEv)}});
document.addEventListener('change',e=>{const t=e.target;if(!t||!curEv||!/^iv_(photo|qr|img|acc)$/.test(t.id))return;const c=ivState(curEv);
  if(t.id==='iv_photo'){c.photo=t.checked;ivSave(curEv);ivPaint(curEv,true)}
  else if(t.id==='iv_qr'){c.qr=t.checked;ivSave(curEv);ivPaint(curEv,true)}
  else if(t.id==='iv_acc'){ivPaint(curEv,true)}
  else if(t.id==='iv_img'&&t.files&&t.files[0]){const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const m=Math.min(1,1400/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*m);cv.height=Math.round(im.height*m);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);c.img=cv.toDataURL('image/jpeg',.86);c.photo=true;ivSave(curEv);ivPaint(curEv,true)};im.src=fr.result};fr.readAsDataURL(t.files[0])}});
window.addEventListener('resize',()=>{try{ivScale()}catch(_){}});
/* ---------- picture export ---------- */
let _h2c=null;
function ivLoadH2C(){if(window.html2canvas)return Promise.resolve(window.html2canvas);if(_h2c)return _h2c;
  _h2c=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.onload=()=>window.html2canvas?res(window.html2canvas):rej(new Error('no html2canvas'));s.onerror=()=>{_h2c=null;rej(new Error('load failed'))};document.head.appendChild(s)});return _h2c}
async function ivPng(ev,size){const c=ivState(ev),h2c=await ivLoadH2C();const host=document.createElement('div');host.className='iv-export';host.innerHTML=ivcHtml(ev,c,{size});document.body.appendChild(host);
  try{mountQR(host)}catch(_){}ivFit(host);try{await document.fonts.ready}catch(_){}await Promise.all([...host.querySelectorAll('img')].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r})));await new Promise(r=>setTimeout(r,120));
  const cv=await h2c(host.firstElementChild,{scale:2,backgroundColor:null,useCORS:true,logging:false});host.remove();return cv.toDataURL('image/png')}
/* ---------- add it to every event ---------- */
if(!TABS.some(t=>t[0]==='invite')){const i=TABS.findIndex(t=>t[0]==='qr');TABS.splice(i+1,0,['invite','Invitation card','mail'])}
if(Array.isArray(ALLOWED.manager)&&!ALLOWED.manager.includes('invite'))ALLOWED.manager.push('invite');
VIEWS.invite=vInvite;
{const _af=after;after=function(h){_af(h);if(/^ev-[^-]+-invite$/.test(h)){try{mountQR(document.getElementById('ivPanel'));ivFit(document)}catch(_){}ivScale()}}}
Object.assign(TA,{'Invitation card':'அழைப்பிதழ் அட்டை','Designs':'டிசைன்கள்','Words':'வார்த்தைகள்','Photo & style':'புகைப்படம் & ஸ்டைல்','Preview':'முன்னோட்டம்','Download card (PNG)':'அட்டையைப் பதிவிறக்கு (PNG)','Status size 9:16':'ஸ்டேட்டஸ் அளவு 9:16','Send to guests':'விருந்தினர்களுக்கு அனுப்பு','Print / PDF':'அச்சு / PDF',
 'Pick one of 20 designs, change the words and colours, see the preview, then download or send it to guests.':'20 டிசைன்களில் ஒன்றைத் தேர்வு செய்து, வார்த்தைகளையும் நிறங்களையும் மாற்றி, முன்னோட்டம் பார்த்து, பதிவிறக்கவும் அல்லது விருந்தினர்களுக்கு அனுப்பவும்.',
 'All 20':'அனைத்தும் 20','Traditional':'பாரம்பரியம்','Family functions':'குடும்ப விழாக்கள்','Modern':'நவீனம்','Big photo':'பெரிய புகைப்படம்','Birthday & kids':'பிறந்தநாள் & குழந்தைகள்','No photo':'புகைப்படம் இல்லை','With photo':'புகைப்படத்துடன்','Full photo':'முழுப் புகைப்படம்',
 'Fill the card in':'அட்டையை நிரப்ப','Reset words':'வார்த்தைகளை மீட்டமை','Top line (blessing)':'மேல் வரி (ஆசி)','Who is inviting':'அழைப்பவர்','Invite line':'அழைப்பு வரி','Function name':'விழாவின் பெயர்','Function type / small line':'விழா வகை / சிறு வரி','Date':'தேதி','Time':'நேரம்','Venue':'இடம்','Address':'முகவரி','Message':'செய்தி','Contact line':'தொடர்பு வரி',
 'Main colour':'முக்கிய நிறம்','Photo':'புகைப்படம்','Size':'அளவு','Changes save automatically for this event / function.':'மாற்றங்கள் இந்த நிகழ்வுக்கு தானாகச் சேமிக்கப்படும்.'});

