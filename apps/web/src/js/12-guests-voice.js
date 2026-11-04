/* ---------- guest book: every person who gave Moi to this account, latest details first ---------- */
function guestBook(accId){const evs=new Set(S.events.filter(e=>e.acc===accId).map(e=>e.id)),map=new Map();
  S.moi.filter(m=>evs.has(m.event_id)).sort((a,b)=>(a.c.updatedAt||a.created_at)-(b.c.updatedAt||b.created_at)).forEach(m=>{const key=m.c.mobile||'n:'+String(m.c.name||'').trim().toLowerCase();let g=map.get(key);
    if(!g){g={key,name:m.c.name,mobile:m.c.mobile||'',place:'',des:'',rel:'',address:'',alt:null,entries:[],given:0,returned:0,last:0,lastEv:''};map.set(key,g)}
    g.name=m.c.name||g.name;['place','designation','relationship','address'].forEach(k=>{if(m.c[k])g[{place:'place',designation:'des',relationship:'rel',address:'address'}[k]]=m.c[k]});if(m.c.alt)g.alt=m.c.alt;
    g.entries.push(m);if(OK(m)&&!isItem(m))g.given+=+m.amount||0;if(m.ret)g.returned+=+m.ret.amount||0;const t=m.c.updatedAt||m.created_at||0;if(t>=g.last){g.last=t;g.lastEv=m.event_id}});
  (S.guests||[]).filter(r=>r.acc===accId&&r.merge).forEach(r=>{const key=r.mobile||'n:'+String(r.name||'').trim().toLowerCase();r.merge.forEach(mk=>{const o=map.get(mk);if(!o||mk===key)return;map.delete(mk);const t=map.get(key);
    if(!t){o.key=key;o.mobile=r.mobile||o.mobile;map.set(key,o);return}t.entries.push(...o.entries);t.given+=o.given;t.returned+=o.returned;if(o.last>t.last){t.last=o.last;t.lastEv=o.lastEv}['place','des','rel','address'].forEach(k=>{if(!t[k]&&o[k])t[k]=o[k]})})});
  (S.guests||[]).filter(r=>r.acc===accId).forEach(r=>{const key=r.mobile||'n:'+String(r.name||'').trim().toLowerCase();let g=map.get(key);
    if(!g){g={key,name:r.name||'',mobile:r.mobile||'',place:'',des:'',rel:'',address:'',alt:null,entries:[],given:0,returned:0,last:r.at||0,lastEv:''};map.set(key,g)}
    const newer=(r.at||0)>=g.last;[['name','name'],['place','place'],['des','des'],['rel','rel'],['address','address']].forEach(([a,b])=>{if(r[a]&&(newer||!g[b]))g[b]=r[a]});
    g.notes=r.notes||'';g.gid=r.id;g.added=(r.evs||[]).filter(id=>evs.has(id));g.hiddenAt=r.hidden?(r.hiddenAt||1):0;g.hideEvs=r.hideEvs||{}});
  return [...map.values()].map(g=>{{const pp=g.mobile&&pplGet(g.mobile);if(pp&&pp.at>=(g.last||0)){g.name=pp.name;if(pp.alt)g.alt=pp.alt;['place','des','address'].forEach(k=>{if(pp[k])g[k]=pp[k]})}}const tOf=m=>m.created_at||0,hv=g.hideEvs||{};
    g.hidden=!!g.hiddenAt&&!g.entries.some(m=>tOf(m)>g.hiddenAt);
    g.evs=[...new Set([...g.entries.filter(m=>!hv[m.event_id]||tOf(m)>hv[m.event_id]).map(m=>m.event_id),...(g.added||[])])];return g})}
const hlDigits=(m,q)=>{const i=m.indexOf(q);const f=m.slice(0,5)+' '+m.slice(5);if(i<0)return esc(f);const s=i+(i>=5?1:0),e=i+q.length+(i+q.length>5?1:0);return esc(f.slice(0,s))+'<mark>'+esc(f.slice(s,e))+'</mark>'+esc(f.slice(e))};
function sugRow(g,q){return `<button type="button" class="sug" data-act="sugPick" data-mob="${esc(g.mobile)}" data-key="${esc(g.key)}"><span class="avatar ${avc(g.name)}">${esc(ini(g.name))}</span><span class="sug-t"><b>${esc(g.name)}</b><small>${g.mobile?hlDigits(g.mobile,q||''):'No mobile'}${g.place?' · '+esc(g.place):''}</small></span><span class="sug-r">${g.given?fmt(g.given):''}<small>${g.entries.length} Moi</small></span></button>`}
/* suggestions for place, designation and guest name, from this account's earlier Moi */
const PLACES0=['Chennai','Madurai','Coimbatore','Tiruchirappalli','Salem','Tirunelveli','Thoothukudi','Vellore','Erode','Thanjavur','Dindigul','Kanchipuram','Tambaram','Pallavaram','Chengalpattu','Tiruppur','Karur','Namakkal','Sivaganga','Ramanathapuram','Virudhunagar','Theni','Pudukkottai','Kumbakonam','Nagercoil','Hosur','Krishnagiri','Villupuram','Cuddalore','Puducherry','Bengaluru','Hyderabad','Kochi','Mumbai'];
const DES0=['Teacher','Farmer','Engineer','Software Engineer','Business','Shop owner','Doctor','Nurse','Driver','Carpenter','Electrician','Plumber','Mason','Tailor','Contractor','Accountant','Government employee','Police','Bank employee','Lawyer','Homemaker','Retired','Student','Self employed','Professor','Manager'];
function acSource(kind){const acc=curAcc(),gb=guestBook(acc.id);
  if(kind==='place')return [...new Set([...gb.map(g=>g.place).filter(Boolean),acc.city,...PLACES0].filter(Boolean))];
  if(kind==='des')return [...new Set([...gb.map(g=>g.des).filter(Boolean),...DES0])];return gb}
function acFld(label,id,kind,ph,cls='',req=false){return `<label class="field ac-field ${cls}" for="${id}"><span>${label}${req?' <i>*</i>':''}</span><input id="${id}" name="${id}" type="text" autocomplete="off" data-ac="${kind}" placeholder="${esc(ph)}" ${req?'required':''}><div class="ac-list" id="ac-${id}" role="listbox" hidden></div></label>`}
function acShow(t){const box=document.getElementById('ac-'+t.id);if(!box)return;const q=t.value.trim().toLowerCase(),kind=t.dataset.ac;if(!q){box.hidden=true;box.innerHTML='';return}
  if(kind==='guest'){const hits=acSource('guest').filter(g=>String(g.name).toLowerCase().includes(q)).sort((a,b)=>(String(b.name).toLowerCase().startsWith(q)-String(a.name).toLowerCase().startsWith(q))||(b.last-a.last)).slice(0,6);
    box.innerHTML=hits.map(g=>sugRow(g,'')).join('');box.hidden=!hits.length;return}
  const list=acSource(kind),st=list.filter(x=>x.toLowerCase().startsWith(q)),inc=list.filter(x=>!x.toLowerCase().startsWith(q)&&x.toLowerCase().includes(q)),hits=[...st,...inc].filter(x=>x.toLowerCase()!==q).slice(0,8);
  box.innerHTML=hits.map((x,i)=>`<button type="button" class="ac-i ${i?'':'hi'}" data-act="acPick" data-for="${t.id}" data-v="${esc(x)}">${esc(x.slice(0,x.toLowerCase().indexOf(q)))}<b>${esc(x.substr(x.toLowerCase().indexOf(q),q.length))}</b>${esc(x.slice(x.toLowerCase().indexOf(q)+q.length))}</button>`).join('');box.hidden=!hits.length}
function fillGuest(px,key){const g=guestBook(curAcc().id).find(x=>x.key===key);if(!g)return;const f=$('#'+px+'_mobile')&&$('#'+px+'_mobile').form;if(!f)return;const set=(id,v)=>{const el=f.querySelector('#'+px+'_'+id);if(el&&v!=null){el.value=v;el.classList.remove('invalid')}};
  set('mobile',g.mobile);set('name',g.name);set('place',g.place);set('des',g.des);set('rel','Relative');set('addr',g.address);
  const al=f.querySelector('#m_alt');if(al){const lg=al.dataset.lg;al.value=translit((g.alt&&g.alt[lg])||g.name,lg);al.dataset.touched=g.alt&&g.alt[lg]?'1':''}
  document.querySelectorAll('.ac-list').forEach(b=>{b.hidden=true});if(g.mobile)lookup(px,g.mobile);else{const box=$('#found-'+px);if(box)box.innerHTML=`<div class="found">${ic('check',18)}<div><b>${esc(g.name)}</b><br><small>Filled in from their latest Moi. Add their mobile number if you have it.</small></div></div>`}
  const amt=f.querySelector('#'+px+'_amount');setTimeout(()=>{const n=f.querySelector('#'+px+'_rel');if(n)n.focus()},0)}

/* ---------- voice typing on Receive Moi: speak the whole entry or one field, check it, then fill the form ---------- */
const VX_SR=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
/* every Indian language the app speaks: [code, name, browser speech code, what to say, keywords hint] */
const VXL=[
 ['ta','தமிழ்','ta-IN','98840 12345, முருகன், தாம்பரம், மாமா, 5001 ரூபாய், கேஷ்','பெயர் … ஊர் … உறவு … தொகை … கேஷ் / ஜிபே','கமா'],
 ['en','English','en-IN','98840 12345, Murugan, from Tambaram, uncle, 5001 rupees, cash','name … from … relation … amount … cash / UPI','comma'],
 ['hi','हिन्दी','hi-IN','98840 12345, राजेश, मदुरै से, दोस्त, 5001 रुपये, कैश','नाम … से … रिश्ता … रुपये … कैश / यूपीआई','कॉमा'],
 ['te','తెలుగు','te-IN','98840 12345, రమేష్, మదురై నుండి, స్నేహితుడు, 5001 రూపాయలు, క్యాష్','పేరు … నుండి … బంధం … రూపాయలు … క్యాష్ / యూపీఐ','కామా'],
 ['ml','മലയാളം','ml-IN','98840 12345, രമേഷ്, മധുര നിന്ന്, സുഹൃത്ത്, 5001 രൂപ, ക്യാഷ്','പേര് … നിന്ന് … ബന്ധം … രൂപ … ക്യാഷ് / യുപിഐ','കോമ'],
 ['kn','ಕನ್ನಡ','kn-IN','98840 12345, ರಮೇಶ್, ಮಧುರೈ ಇಂದ, ಸ್ನೇಹಿತ, 5001 ರೂಪಾಯಿ, ಕ್ಯಾಶ್','ಹೆಸರು … ಇಂದ … ಸಂಬಂಧ … ರೂಪಾಯಿ … ಕ್ಯಾಶ್ / ಯುಪಿಐ','ಕಾಮಾ'],
 ['mr','मराठी','mr-IN','98840 12345, रमेश, मदुराई हून, मित्र, 5001 रुपये, कॅश','नाव … हून … नाते … रुपये … कॅश / यूपीआय','कॉमा'],
 ['gu','ગુજરાતી','gu-IN','98840 12345, રમેશ, મદુરાઈ થી, મિત્ર, 5001 રૂપિયા, કેશ','નામ … થી … સંબંધ … રૂપિયા … કેશ / યુપીઆઈ','કોમા'],
 ['bn','বাংলা','bn-IN','98840 12345, রমেশ, মাদুরাই থেকে, বন্ধু, 5001 টাকা, ক্যাশ','নাম … থেকে … সম্পর্ক … টাকা … ক্যাশ / ইউপিআই','কমা'],
 ['pa','ਪੰਜਾਬੀ','pa-IN','98840 12345, ਰਮੇਸ਼, ਮਦੁਰੈ ਤੋਂ, ਦੋਸਤ, 5001 ਰੁਪਏ, ਕੈਸ਼','ਨਾਮ … ਤੋਂ … ਰਿਸ਼ਤਾ … ਰੁਪਏ … ਕੈਸ਼ / ਯੂਪੀਆਈ','ਕੌਮਾ'],
 ['or','ଓଡ଼ିଆ','or-IN','98840 12345, ରମେଶ, ମଦୁରାଇ ରୁ, ସାଙ୍ଗ, 5001 ଟଙ୍କା, କ୍ୟାଶ','ନାମ … ରୁ … ସମ୍ପର୍କ … ଟଙ୍କା … କ୍ୟାଶ / ୟୁପିଆଇ','କମା']];
const vx={lg:(()=>{try{return localStorage.getItem('moipoint-vxlg')||''}catch(_){return ''}})(),rec:null,target:'all',px:'m',text:'',fin:'',timer:null,wd:null,heard:false,state:''};
const vxLang=()=>VXL.some(l=>l[0]===vx.lg)?vx.lg:(VXL.some(l=>l[0]===UIL)?UIL:'ta');
const vxL=()=>VXL.find(l=>l[0]===vxLang());
const IND=/[\u0900-\u0DFF]/;
/* Tamil script → Latin (names and places spoken in Tamil) */
const TL_V={'அ':'a','ஆ':'aa','இ':'i','ஈ':'ee','உ':'u','ஊ':'oo','எ':'e','ஏ':'e','ஐ':'ai','ஒ':'o','ஓ':'o','ஔ':'au'};
const TL_S={'ா':'a','ி':'i','ீ':'ee','ு':'u','ூ':'oo','ெ':'e','ே':'e','ை':'ai','ொ':'o','ோ':'o','ௌ':'au','்':''};
const TL_C={'க':'k','ங':'ng','ச':'s','ஞ':'nj','ட':'t','ண':'n','த':'th','ந':'n','ப':'p','ம':'m','ய':'y','ர':'r','ல':'l','வ':'v','ழ':'zh','ள':'l','ற':'r','ன':'n','ஜ':'j','ஷ':'sh','ஸ':'s','ஹ':'h'};
function ta2en(s){return String(s||'').split(/(\s+)/).map(w=>{if(!/[\u0B80-\u0BFF]/.test(w))return w;let o='',prev='';const ch=[...w];
  for(let i=0;i<ch.length;i++){const c=ch[i],n=ch[i+1];
    if(TL_V[c]){o+=TL_V[c];prev='v';continue}
    if(TL_C[c]){if(n==='்'&&ch[i+2]===c){i++;continue}let r=TL_C[c];const mid=(prev==='v'||prev==='n')&&n!=='்';
      if(c==='க'&&mid)r='g';if(c==='ட'&&mid)r='d';if(c==='ப'&&prev==='n')r='b';if(c==='ச'&&(prev==='c'||ch[i-1]==='்'&&ch[i-2]==='ச'))r='ch';if(c==='ச'&&ch[i-1]==='்'&&ch[i-2]==='ட'){o=o.replace(/t$/,'');r='ksh'}if(c==='ச'&&prev==='n')r='j';if(c==='ற'&&n==='்'&&ch[i+2]==='ற')r='t';
      if(c==='ன'||c==='ண'||c==='ந'||c==='ம'||c==='ங'||c==='ஞ')prev='n';else prev=n==='்'?'c':'v';
      o+=r;if(TL_S[n]!=null){o+=TL_S[n];i++;if(n==='்')continue}else o+='a';continue}
    if(TL_S[c]!=null){o+=TL_S[c];continue}o+=c}
  return o.replace(/aa(?=[^aeiou]*$)/,'a').replace(/^./,x=>x.toUpperCase())}).join('')}
/* other Indian scripts → Latin. Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Telugu, Kannada and Malayalam share one layout */
const IX_V={5:'a',6:'a',7:'i',8:'ee',9:'u',10:'oo',11:'ri',14:'e',15:'e',16:'ai',18:'o',19:'o',20:'au'};
const IX_C={21:'k',22:'kh',23:'g',24:'gh',25:'ng',26:'ch',27:'chh',28:'j',29:'jh',30:'ny',31:'t',32:'th',33:'d',34:'dh',35:'n',36:'t',37:'th',38:'d',39:'dh',40:'n',41:'n',42:'p',43:'ph',44:'b',45:'bh',46:'m',47:'y',48:'r',49:'r',50:'l',51:'l',52:'zh',53:'v',54:'sh',55:'sh',56:'s',57:'h',88:'q',89:'kh',90:'g',91:'z',92:'d',93:'rh',94:'f',95:'y'};
const IX_M={62:'a',63:'i',64:'ee',65:'u',66:'oo',67:'ri',70:'e',71:'e',72:'ai',74:'o',75:'o',76:'au',77:''};
function ix2en(s){return String(s||'').split(/(\s+)/).map(w=>{if(!IND.test(w))return w;if(/[\u0B80-\u0BFF]/.test(w))return ta2en(w);const ch=[...w];let o='';
  const base=ch.map(c=>c.codePointAt(0)).find(x=>x>=0x900&&x<0xE00)&0xFF80,south=base>=0xC00,drop=!south;
  for(let i=0;i<ch.length;i++){const cp=ch[i].codePointAt(0);if(cp<0x900||cp>=0xE00){o+=ch[i];continue}const off=cp-base;
    if(IX_V[off]!=null){o+=IX_V[off];continue}
    if(IX_C[off]!=null){let r=IX_C[off];if(south&&off===36)r='th';let j=i+1;if(j<ch.length&&ch[j].codePointAt(0)-base===60){r=({56:'sh',21:'q',22:'kh',28:'z',33:'d',34:'rh',43:'f'})[off]||r;while(j<ch.length&&ch[j].codePointAt(0)-base===60)j++}o+=r;const nx=j<ch.length?ch[j].codePointAt(0)-base:-1;
      if(IX_M[nx]!=null){o+=IX_M[nx];i=j;continue}i=j-1;const last=j>=ch.length;if(!(drop&&last))o+='a';continue}
    if(IX_M[off]!=null){o+=IX_M[off];continue}
    if(off===2||off===1||off===112){const nx=ch[i+1]?ch[i+1].codePointAt(0)-base:-1;o+=(nx===42||nx===43||nx===44||nx===45||nx===46)?'m':'n'}else if(off===3)o+='h';else if(base===0xD00&&off>=122&&off<=127)o+=({122:'n',123:'n',124:'r',125:'l',126:'l',127:'k'})[off];else if(off>=102&&off<=111)o+=String(off-102)}
  return o.replace(/aa+/g,'a').replace(/^./,x=>x.toUpperCase())}).join('')}
const any2en=s=>/[\u0B80-\u0BFF]/.test(s)?ta2en(s):ix2en(s);
const vxDigits=s=>String(s).replace(/[\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F]/g,c=>String((c.codePointAt(0)&0xF)-6));
const vxNorm=s=>String(s).toLowerCase().replace(/[^a-z]/g,'').replace(/th|dh/g,'t').replace(/d/g,'t').replace(/g/g,'k').replace(/b/g,'p').replace(/zh/g,'l').replace(/sh|ch/g,'s').replace(/ee/g,'i').replace(/oo/g,'u').replace(/aa/g,'a').replace(/y/g,'i').replace(/h/g,'').replace(/(.)\1+/g,'$1');
/* spoken punctuation → symbols: “comma” / “கமா” becomes , so each detail stays separate */
const VX_PUNCT=/(^|\s)(?:comma|koma|கமா|காமா|கோமா|கம்மா|கமோ|कॉमा|कोमा|कौमा|కామా|కోమా|കോമ|ಕಾಮಾ|ಕಾಮ|કોમા|কমা|ਕੌਮਾ|କମା|full ?stop|புல் ?ஸ்டாப்|फुल ?स्टॉप)(?=\s|$|[,.])/gi;
const vxClean=s=>String(s||'').replace(VX_PUNCT,'$1, ').replace(/\s+,/g,',').replace(/,\s*,+/g,',').replace(/\s{2,}/g,' ').trim();
/* numbers said in pieces: “5 thousand 2”, “5000 2”, “5 002”, “5 ஆயிரத்து 2” → 5002 */
const VX_THOU='ஆயிரத்து|ஆயிரத்தி|ஆயிரம்|thousand|हज़ार|हजार|వేలు|వేల|వేయి|ಸಾವಿರ|ആയിരം|ആയിരത്തി|હજાર|হাজার|ਹਜ਼ਾਰ|ਹਜਾਰ|ହଜାର',VX_LAKH='லட்சத்து|லட்சம்|lakhs?|लाख|లక్ష|ಲಕ್ಷ|ലക്ഷം|લાખ|লাখ|ਲੱਖ|ଲକ୍ଷ',VX_HUND='நூற்று|நூறு|hundred|सौ|వందల|వంద|ನೂರು|നൂറ്|સો|শো|ਸੌ|ଶହ';
function vxNum(s){s=String(s);
  s=s.replace(new RegExp(`(\\d+)\\s*(?:${VX_LAKH})`,'gi'),(m,n)=>' '+(+n*100000)+' ').replace(new RegExp(`(\\d+)\\s*(?:${VX_THOU})`,'gi'),(m,n)=>' '+(+n*1000)+' ').replace(new RegExp(`(\\d+)\\s*(?:${VX_HUND})`,'gi'),(m,n)=>' '+(+n*100)+' ');
  s=s.replace(/(^|[^\d,])(\d{1,3})\s+(0\d{2})(?!\d)/g,(m,a,b,c)=>a+b+c);
  for(let k=0;k<3;k++)s=s.replace(/(^|[^\d])(\d+)\s+(\d{1,3})(?![\d,])/g,(m,a,x,y)=>{const X=+x,Y=+y;return (X>=1000&&X%1000===0&&Y<1000)||(X>=100&&X<1000&&X%100===0&&Y<100)?a+String(X+Y):m});
  return s.replace(/\s{2,}/g,' ')}
const tCase=s=>String(s).replace(/\s+/g,' ').trim().replace(/(^|\s)(\p{Ll})/gu,(m,a,b)=>a+b.toUpperCase());
const VX_PL={'சென்னை':'Chennai','மதுரை':'Madurai','சேலம்':'Salem','திருச்சி':'Tiruchirappalli','கோவை':'Coimbatore','கோயம்புத்தூர்':'Coimbatore','நெல்லை':'Tirunelveli','திருநெல்வேலி':'Tirunelveli','தூத்துக்குடி':'Thoothukudi','ஈரோடு':'Erode','வேலூர்':'Vellore','தஞ்சாவூர்':'Thanjavur','தஞ்சை':'Thanjavur','காஞ்சிபுரம்':'Kanchipuram','புதுச்சேரி':'Puducherry','பாண்டிச்சேரி':'Puducherry','பெங்களூர்':'Bengaluru','பெங்களூரு':'Bengaluru','திண்டுக்கல்':'Dindigul','கரூர்':'Karur','நாகர்கோவில்':'Nagercoil','கும்பகோணம்':'Kumbakonam','ஓசூர்':'Hosur','திருப்பூர்':'Tiruppur','தாம்பரம்':'Tambaram','selam':'Salem','trichy':'Tiruchirappalli','thiruchi':'Tiruchirappalli','सेलम':'Salem','चेन्नई':'Chennai','मदुरै':'Madurai','बेंगलुरु':'Bengaluru','मुंबई':'Mumbai','हैदराबाद':'Hyderabad'};
function vxPlace(v){v=String(v).trim();if(VX_PL[v]||VX_PL[v.toLowerCase()])return VX_PL[v]||VX_PL[v.toLowerCase()];const r=IND.test(v)?any2en(v):v,n=vxNorm(r);let known=[];try{known=acSource('place')}catch(_){known=PLACES0}const hit=known.find(p=>vxNorm(p)===n)||(n.length>=5?known.find(p=>vxNorm(p).startsWith(n.slice(0,5))):null);return hit||tCase(r)}
/* spoken Tamil numbers → digits */
const TN_U={'ஒன்று':1,'ஒண்ணு':1,'ஒரு':1,'இரண்டு':2,'ரெண்டு':2,'மூன்று':3,'மூணு':3,'நான்கு':4,'நாலு':4,'ஐந்து':5,'அஞ்சு':5,'ஆறு':6,'ஏழு':7,'எட்டு':8,'ஒன்பது':9,'பத்து':10,'பதினொன்று':11,'பன்னிரண்டு':12,'பதினைந்து':15,'இருபது':20,'இருபத்தி':20,'இருபத்து':20,'முப்பது':30,'நாற்பது':40,'ஐம்பது':50,'அம்பது':50,'அறுபது':60,'எழுபது':70,'எண்பது':80,'தொண்ணூறு':90,
  'நூறு':100,'நூற்று':100,'இருநூறு':200,'இருநூற்று':200,'முந்நூறு':300,'முன்னூறு':300,'நானூறு':400,'ஐநூறு':500,'ஐந்நூறு':500,'ஐநூற்று':500,'அறுநூறு':600,'எழுநூறு':700,'எண்ணூறு':800,'தொள்ளாயிரம்':900};
const TN_K={'ஆயிரம்':1,'ஆயிரத்து':1,'ஆயிரத்தி':1,'இரண்டாயிரம்':2,'ரெண்டாயிரம்':2,'இரண்டாயிரத்து':2,'மூவாயிரம்':3,'மூணாயிரம்':3,'மூன்றாயிரம்':3,'நாலாயிரம்':4,'நான்காயிரம்':4,'ஐயாயிரம்':5,'ஐந்தாயிரம்':5,'அஞ்சாயிரம்':5,'ஐயாயிரத்து':5,'ஐந்தாயிரத்து':5,'ஆறாயிரம்':6,'ஏழாயிரம்':7,'எட்டாயிரம்':8,'ஒன்பதாயிரம்':9,'பத்தாயிரம்':10,'பத்தாயிரத்து':10,'இருபதாயிரம்':20,'இருபத்தைந்தாயிரம்':25,'ஐம்பதாயிரம்':50};
function taNums(s){const ws=String(s).split(/\s+/);let out=[],acc=null;const flush=()=>{if(acc!=null){out.push(String(acc));acc=null}};
  ws.forEach(w=>{const b=w.replace(/(ரூபாய்|ரூ)$/,''),tail=w.slice(b.length);let v=null,mul=0;
    const bb=b.replace(/த்தி$/,'த்து');for(const k of Object.keys(TN_K))if(bb===k||bb===k.replace(/ம்$/,'த்து')){v=TN_K[k]*1000;mul=1;break}
    if(v==null&&/^லட்ச(ம்|த்து)?$/.test(b)){acc=(acc||1)*100000;if(tail){flush();out.push(tail)}return}
    if(v==null&&TN_U[b]!=null)v=TN_U[b];if(v==null&&TN_U[b.replace(/த்தி$/,'த்து')]!=null)v=TN_U[b.replace(/த்தி$/,'த்து')];
    if(v==null){flush();out.push(w);return}
    if(mul&&acc!=null&&acc<1000&&b.startsWith('ஆயிர'))acc=acc*1000;else acc=(acc||0)+v;if(tail){flush();out.push(tail)}});flush();return out.join(' ')}
/* words for relations, payment modes, rupees, “from”, in every language */
const VX_REL=[[/family friend|குடும்ப நண்ப|पारिवारिक मित्र/i,'Family friend'],[/friend|நண்ப|பிரண்ட்|ஃப்ரெண்ட்|दोस्त|मित्र|స్నేహిత|సుహృత|സുഹൃത്ത|ಸ್ನೇಹಿತ|મિત્ર|দোস্ত|বন্ধু|ਦੋਸਤ|ମିତ୍ର|ସାଙ୍ଗ/i,'Friend'],[/மாமா|\bmama\b|uncle|मामा|మామ|മാമൻ|ಮಾವ|मामा|મામા|মামা|ਮਾਮਾ|ମାମୁଁ/i,'Uncle (Mama)'],[/பெரியப்பா|சித்தப்பா|periyappa|chithappa|चाचा|ताऊ|బాబాయ్|పెదనాన్న|ചിറ്റപ്പൻ|ಚಿಕ್ಕಪ್ಪ|काका|કાકા|কাকা|ਚਾਚਾ|ଦାଦା/i,'Uncle (Periyappa / Chithappa)'],[/அத்தை|சித்தி|பெரியம்மா|athai|chithi|aunt|चाची|बुआ|मौसी|అత్త|పిన్ని|അമ്മായി|ಅತ್ತೆ|आत्या|માસી|ফুফু|মাসি|ਮਾਸੀ|ମାଉସୀ/i,'Aunt (Athai / Chithi)'],[/cousin|மச்சான்|மச்சினி|கசின்|चचेरा|कज़िन/i,'Cousin'],[/தாத்தா|பாட்டி|grand|दादा|दादी|नाना|नानी|తాత|అమ్మమ్మ|മുത്തച്ഛൻ|ಅಜ್ಜ|आजोबा|દાદા|দাদু|ਦਾਦਾ|ଜେଜେ/i,'Grandparent'],[/colleague|office|சக ஊழியர்|ஆபீஸ்|ஆஃபீஸ்|கூட வேலை|सहकर्मी|ऑफिस|సహోద్యోగి|സഹപ്രവർത്തക|ಸಹೋದ್ಯೋಗಿ|सहकारी|સહકર્મી|সহকর্মী|ਸਹਿਕਰਮੀ|ସହକର୍ମୀ/i,'Colleague'],[/neighbou?r|பக்கத்து வீ|அண்டை|पड़ोसी|पडोसी|పొరుగు|അയൽ|ನೆರೆ|शेजारी|પડોશી|প্রতিবেশী|ਗੁਆਂਢੀ|ପଡ଼ୋଶୀ/i,'Neighbour'],[/relative|உறவினர்|சொந்தம்|சொந்தக்கார|रिश्तेदार|బంధువు|ബന്ധു|ಸಂಬಂಧಿ|नातेवाईक|સંબંધી|আত্মীয়|ਰਿਸ਼ਤੇਦਾਰ|ସମ୍ପର୍କୀୟ/i,'Relative']];
const VX_MODE=[[/\bupi\b|g ?pay|google pay|phone ?pe|paytm|ஜிபே|ஜி பே|போன் ?பே|யுபிஐ|கூகுள் பே|यूपीआई|यूपीआय|जीपे|फोन ?पे|फ़ोन ?पे|गूगल पे|పేటీఎం|యూపీఐ|జీపే|ఫోన్ ?పే|യുപിഐ|ಯುಪಿಐ|ಫೋನ್ ?ಪೇ|યુપીઆઈ|ইউপিআই|ਯੂਪੀਆਈ|ୟୁପିଆଇ/i,'upi'],[/online|ஆன்லைன்|ऑनलाइन|ఆన్‌?లైన్|ഓൺലൈൻ|ಆನ್‌?ಲೈನ್|ઓનલાઇન|অনলাইন|ਔਨਲਾਈਨ|ଅନଲାଇନ/i,'online'],[/cash|கேஷ்|ரொக்க|காசு|பணமாக|नकद|कैश|कॅश|रोख|నగదు|క్యాష్|ക്യാഷ്|പണമായി|ನಗದು|ಕ್ಯಾಶ್|રોકડ|કેશ|নগদ|ক্যাশ|ਨਕਦ|ਕੈਸ਼|ନଗଦ|କ୍ୟାଶ/i,'cash']];
const VX_RS='rupees|rupee|rs\\.?|ரூபாய்|ரூபா|ரூ\\.?|रुपये|रुपए|रुपया|रूपये|రూపాయలు|రూపాయి|രൂപ|ರೂಪಾಯಿ|રૂપિયા|টাকা|ਰੁਪਏ|ଟଙ୍କା';
const VX_FROM='से|हून|पासून|నుండి|నుంచి|നിന്ന്|ഇൽ നിന്ന്|ಇಂದ|ನಿಂದ|થી|থেকে|ਤੋਂ|ରୁ|இருந்து';
const VX_NAMEK='பெயர்|name(?: is)?|my name is|नाम|नाव|పేరు|പേര്|ಹೆಸರು|નામ|নাম|ਨਾਮ|ନାମ';
const VX_PLACEK='ஊர்|place|from|town|village|गांव|गाँव|शहर|गाव|ఊరు|స్థలం|സ്ഥലം|ಊರು|ગામ|গ্রাম|ਪਿੰਡ|ଗାଁ';
const VX_WORKK='வேலை|பணி|designation|work(?:s| as)?|job|काम|पेशा|व्यवसाय|ఉద్యోగం|ജോലി|ಕೆಲಸ|नोकरी|કામ|কাজ|ਕੰਮ|କାମ';
const VX_RELK='உறவு|relation|रिश्ता|नाते|బంధం|ബന്ധം|ಸಂಬಂಧ|સંબંધ|সম্পর্ক|ਰਿਸ਼ਤਾ|ସମ୍ପର୍କ';
const VX_AMTK='amount|தொகை|மொய்|राशि|रकम|మొత్తం|തുക|ಮೊತ್ತ|रक्कम|રકમ|পরিমাণ|ਰਕਮ|ରାଶି';
/* one sentence → fields */
function vxParse(raw){let s=' '+vxNum(taNums(vxNum(vxClean(vxDigits(String(raw)))).replace(/(?<!\d)[,;।]|[,;](?!\d)|\.(?!\d)/g,' , ')))+' ';const r={};const take=re=>{const m=s.match(re);if(m){s=s.replace(m[0],' , ');return m}return null};
  const KS=[VX_NAMEK,VX_PLACEK,VX_WORKK,VX_RELK,VX_AMTK].join('|'),stop=`(?=\\s,|\\s(?:${KS})(?:\\s|$)|$)`;
  let m=take(/(?:mobile|number|phone|மொபைல்|நம்பர்|போன்|मोबाइल|नंबर)?\s*((?:\d[\s-]*){10,12})(?=\D)/i);if(m){let d=m[1].replace(/\D/g,'');if(d.length>10)d=d.replace(/^(91|0)/,'').slice(0,10);if(/^[6-9]\d{9}$/.test(d))r.mobile=d;else s+=' '+m[1]}
  m=take(new RegExp(`(?:₹\\s*(\\d[\\d,]*))|(\\d[\\d,]*)\\s*(?:${VX_RS})`,'i'))||take(new RegExp(`(?:${VX_AMTK})\\s*(\\d[\\d,]*)`,'i'));if(m)r.amount=+(m[1]||m[2]).replace(/,/g,'');
  if(!r.amount){const n=s.match(/\b(\d{2,7})\b/);if(n){r.amount=+n[1];s=s.replace(n[0],' , ')}}
  for(const [re,k] of VX_MODE)if(re.test(s)){r.mode=k;s=s.replace(new RegExp('\\S*(?:'+re.source+')\\S*','i'),' , ');break}
  m=take(new RegExp(`(?:${VX_RELK})\\s+(\\S+(?:\\s\\S+)?)`,'i'));for(const [re,k] of VX_REL)if(re.test(m?m[1]:s)){r.rel=k;if(!m)s=s.replace(new RegExp('\\S*(?:'+re.source+')\\S*','i'),' , ');break}
  m=take(new RegExp(`(?:${VX_WORKK})\\s+([^,\\d]+?)${stop}`,'i'));if(m)r.des=m[1].trim();
  m=take(new RegExp(`(?:${VX_PLACEK})\\s+([^,\\d]+?)${stop}`,'i'))||take(/([^\s,\d]+?)(?:யிலிருந்து|விலிருந்து|லிருந்து|ல\s?இருந்து|ல்\s?இருந்து|லேருந்து)(?=\s)/)||take(new RegExp(`([^\\s,\\d]+)\\s*(?:${VX_FROM})(?=\\s)`))||take(/([^\s,\d]+?)(?:ಯಿಂದ|ನಿಂದ|ಇಂದ|થી|ରୁ|യിൽ നിന്ന്)(?=\s)/);
  if(m)r.place=m[1].trim().replace(/த்தி$/,'ம்').replace(/(யி|வி|ில்|ல்)$/,'');
  m=take(new RegExp(`(?:${VX_NAMEK})\\s+([^,\\d]+?)${stop}`,'i'));
  if(m)r.name=m[1].trim();else{const seg=s.split(',').map(x=>x.trim()).filter(x=>x&&!/^(and|மற்றும்|அவர்|அவங்க|கொடுத்தார்|கொடுத்தாங்க|மொய்|gave|moi|of|rupees|ने|और|दिया|दिए)$/i.test(x));if(seg[0])r.name=seg[0].split(/\s+/).slice(0,3).join(' ');if(!r.place&&seg[1]&&!/\d/.test(seg[1]))r.place=seg[1].split(/\s+/).slice(0,2).join(' ');
    if(!r.place&&r.name&&r.name.includes(' ')){const ws=r.name.split(' '),lw=ws[ws.length-1],ln=vxNorm(VX_PL[lw]||(IND.test(lw)?any2en(lw):lw));let known=[];try{known=acSource('place')}catch(_){known=PLACES0}if(ln.length>=4&&known.some(p=>vxNorm(p)===ln||vxNorm(p).startsWith(ln.slice(0,5)))){r.place=lw;r.name=ws.slice(0,-1).join(' ')}}}
  ['name','place','des'].forEach(k=>{if(r[k])r[k]=r[k].replace(/\s*(அவர்கள்|அவர்|கொடுத்தார்|கொடுத்தாங்க|gave|has given|ने|दिया)\s*$/i,'').trim();if(!r[k])delete r[k]});return r}
/* the parsed result as form values: English spelling + the spoken script for the receipt */
function vxFields(r){const o={mobile:r.mobile||'',amount:r.amount||'',mode:r.mode||'',rel:r.rel||'',name:'',native:'',place:'',des:''};
  if(r.name){if(IND.test(r.name)){o.native=r.name.trim();o.name=tCase(any2en(r.name))}else o.name=tCase(r.name)}
  if(r.place)o.place=vxPlace(r.place);if(r.des)o.des=IND.test(r.des)?tCase(any2en(r.des)):tCase(r.des);return o}
function vxSet(id,v){const el=document.getElementById(id);if(!el||v==null||v==='')return false;el.value=v;el.classList.remove('invalid');el.classList.add('vx-flash');setTimeout(()=>el.classList.remove('vx-flash'),1400);el.dispatchEvent(new Event('input',{bubbles:true}));return true}
function vxApply(px,o){if(o.mobile)vxSet(px+'_mobile',normMob(o.mobile));
  if(o.name){vxSet(px+'_name',o.name);const al=px==='m'&&document.getElementById('m_alt');if(al){if(o.native&&IND.test(o.native)&&al.dataset.lg===vxLang()){al.value=o.native;al.dataset.touched='1'}else if(!al.dataset.touched)al.value=translit(o.name,al.dataset.lg)}}
  if(o.place)vxSet(px+'_place',o.place);if(o.des)vxSet(px+'_des',o.des);if(o.rel)vxSet(px+'_rel',o.rel);
  if(o.amount){const fl=flows[px==='p'?'public':'staff'];if(px==='m'&&fl&&fl.kind&&fl.kind!=='cash'){const b=document.querySelector('[data-act="kind"][data-k="cash"]');if(b)b.click()}if(vxSet(px+'_amount',+o.amount))updSum(px)}
  if(o.mode){const b=document.querySelector(`[data-act="mode"][data-px="${px}"][data-mode="${o.mode}"]`);if(b&&!b.disabled)b.click()}
  document.querySelectorAll('.ac-list').forEach(b=>{b.hidden=true})}
const vxLangSel=(id,cls)=>`<label class="vx-lsel ${cls||''}"><span class="sr-only">Voice language</span>${ic('globe',16)}<select id="${id}" data-vxlg aria-label="Voice language">${VXL.map(([k,l])=>`<option value="${k}" ${vxLang()===k?'selected':''}>${l}</option>`).join('')}</select></label>`;
function vxBar(px){const L=vxL();return `<div class="vx-bar" id="vx-${px}"><button type="button" class="vx-big" data-act="vxGo" data-px="${px}" data-t="all"><span class="vx-mic">${ic('mic',22)}</span><span><b>Speak the entry</b><small>Say name, place, amount and how they paid</small></span></button>
  <div class="vx-side">${vxLangSel('vx_lg_'+px)}<small class="vx-eg" data-noi18n>“${esc(L[3])}”</small></div></div>`}
/* small mic buttons on single fields */
const VX_FIELDS=['mobile','name','place','des','amount'];
function vxDecorate(){['m','p'].forEach(px=>{if(!document.getElementById(px+'_name'))return;VX_FIELDS.forEach(k=>{const el=document.getElementById(px+'_'+k);if(!el||el.dataset.vx)return;el.dataset.vx=1;
  const host=el.closest('.mob-in,.amount-in')||el;const b=document.createElement('button');b.type='button';b.className='vx-f';b.dataset.act='vxGo';b.dataset.px=px;b.dataset.t=k;b.setAttribute('aria-label','Speak '+({mobile:'mobile number',name:'name',place:'place',des:'designation',amount:'amount'})[k]);b.innerHTML=ic('mic',18);
  const wrap=document.createElement('span');wrap.className='vx-wrap';host.parentNode.insertBefore(wrap,host);wrap.appendChild(host);wrap.appendChild(b)})});
  /* the guest's own QR page gets the same "speak the entry" bar */
  const pf=document.querySelector('form[data-form="pub"]');if(pf&&!pf.querySelector('.vx-bar')){const h=pf.querySelector('h2');const d=document.createElement('div');d.innerHTML=vxBar('p');const bar=d.firstElementChild;if(h)h.after(bar);else pf.prepend(bar);if(UIL!=='en'&&typeof l10n==='function')l10n(bar)}
  /* every other entry form: speak field by field */
  document.querySelectorAll('form[data-form]').forEach(f=>{const k=f.dataset.form;if(!VXG_FORMS[k]||f.querySelector('.vxg-bar'))return;const d=document.createElement('div');d.className='vxg-bar';
    d.innerHTML=`<button type="button" class="vxg-btn" data-act="vxgGo">${ic('mic',18)}<span><b>Speak to fill</b><small>Say each detail; tap Next to go on</small></span></button>`;
    const host=f.querySelector('.md-b')||f;host.prepend(d);if(UIL!=='en'&&typeof l10n==='function')l10n(d)})}
/* ---------- speak field by field: event, reminder, payout, expense, guest ---------- */
const VXG_FORMS={evSave:1,rem:1,po:1,exp:1,guestAdd:1,moiEdit:1,user:1,group:1};
const VX_SYN=[[/திருமண|கல்யாண|wedding|marriage|शादी|विवाह|పెళ్లి|వివాహ|വിവാഹ|ಮದುವೆ|लग्न|લગ્ન|বিয়ে|ਵਿਆਹ|ବିବାହ/i,'wedding'],[/நிச்சயதார்த்த|நிச்சயம்|engagement|सगाई|साखरपुडा|నిశ్చితార్థ|നിശ്ചയ|ನಿಶ್ಚಿತಾರ್ಥ/i,'engage'],[/பிறந்த ?நாள்|birthday|जन्मदिन|పుట్టినరోజు|ജന്മദിന|ಹುಟ್ಟುಹಬ್ಬ|वाढदिवस|જન્મદિવસ|জন্মদিন|ਜਨਮਦਿਨ|ଜନ୍ମଦିନ/i,'birth'],[/புதுமனை|கிரகப்பிரவேச|கிரகப்பிரவேசம்|house ?warming|गृह ?प्रवेश|గృహప్రవేశ|ಗೃಹಪ್ರವೇಶ/i,'griha'],[/வரவேற்பு|reception|रिसेप्शन|స్వాగత/i,'reception'],[/பெயர் ?சூட்டு|naming|नामकरण|నామకరణ|ನಾಮಕರಣ/i,'naming'],[/வளைகாப்பு|சீமந்த|baby ?shower|valaikappu|seemantham|गोद ?भराई|సీమంతం|ಸೀಮಂತ/i,'valai'],[/காது ?குத்து|ear ?piercing|कर्ण/i,'ear'],[/மஞ்சள் ?நீராட்டு|puberty|பூப்பு/i,'pub'],[/சஷ்டியப்த|மணிவிழா|60th|sashti|shashti/i,'60'],[/நினைவு|death|funeral|கருமாதி|காரியம்|श्राद्ध/i,'memor'],[/கோவில்|கோயில்|temple|मंदिर|திருவிழா/i,'temple']];
const vxg={form:null,fields:[],i:0,vals:[]};
const VX_MON={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12,
  'ஜனவரி':1,'பிப்ரவரி':2,'மார்ச்':3,'ஏப்ரல்':4,'மே':5,'ஜூன்':6,'ஜூலை':7,'ஆகஸ்ட்':8,'ஆகஸ்டு':8,'செப்டம்பர்':9,'அக்டோபர்':10,'நவம்பர்':11,'டிசம்பர்':12,
  'जनवरी':1,'फरवरी':2,'फ़रवरी':2,'मार्च':3,'अप्रैल':4,'मई':5,'जून':6,'जुलाई':7,'अगस्त':8,'सितंबर':9,'सितम्बर':9,'अक्टूबर':10,'नवंबर':11,'नवम्बर':11,'दिसंबर':12,'दिसम्बर':12};
const VX_DAYW=[[/today|இன்று|இன்னைக்கு|आज/i,0],[/day after tomorrow|நாளை மறுநாள்|परसों/i,2],[/tomorrow|நாளை|நாளைக்கு|कल/i,1]];
const vxDk=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function vxDate(raw){const s=vxNum(taNums(vxDigits(String(raw)))).toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g,'$1'),d0=new Date();
  for(const [re,n] of VX_DAYW)if(re.test(s)){const d=new Date(d0);d.setDate(d.getDate()+n);return vxDk(d)}
  let m=s.match(/(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`}
  let mon=0;for(const [k,v] of Object.entries(VX_MON))if(new RegExp('(^|[^\\p{L}])'+k+'(?=[^\\p{L}]|$)','u').test(s)){mon=v;break}
  const nums=(s.match(/\d+/g)||[]).map(Number),day=nums.find(n=>n>=1&&n<=31),yr=nums.find(n=>n>=2000&&n<2100);
  if(mon&&day){let y=yr||d0.getFullYear();const c=`${y}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;if(!yr&&c<vxDk(d0))y++;return `${y}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
  return ''}
function vxTime(raw){const s=vxNum(taNums(vxDigits(String(raw)))).toLowerCase();let m=s.match(/(\d{1,2})(?:[:.\s]+(\d{1,2}))?/);if(!m)return '';let h=+m[1],mi=m[2]?+m[2]:0;if(/அரை|half|साढ़े/.test(s))mi=30;if(/கால்|quarter|सवा/.test(s)&&!m[2])mi=15;
  const pm=/\bpm\b|p\.m|evening|night|afternoon|மாலை|சாயங்காலம்|இரவு|ராத்திரி|மதியம்|शाम|रात|दोपहर|సాయంత్రం|రాత్రి|വൈകുന്നേരം|രാത്രി|ಸಂಜೆ|ರಾತ್ರಿ|सायंकाळ|સાંજ|সন্ধ্যা|ਸ਼ਾਮ|ସନ୍ଧ୍ୟା/.test(s),am=/\bam\b|a\.m|morning|காலை|सुबह|ఉదయం|രാവിലെ|ಬೆಳಿಗ್ಗೆ|सकाळ|સવાર|সকাল|ਸਵੇਰ|ସକାଳ/.test(s);
  if(pm&&h<12)h+=12;if(am&&h===12)h=0;if(!pm&&!am&&h>=1&&h<=6)h+=12;if(h>23||mi>59)return '';return `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`}
function vxgLabel(el){const tp=el.classList&&el.classList.contains('tpick');const host=tp?el.closest('.field'):el.closest('label,.field');let t=host?((host.querySelector(':scope>span')||{}).textContent||''):'';
  t=t.replace(/\*/g,'').trim()||el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.name||'';return t.replace(/\s+/g,' ').trim()}
function vxgFields(f){const vis=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)&&!e.closest('[hidden],.vxg-bar,details:not([open])');
  const out=[];f.querySelectorAll('input,select,textarea,.tpick').forEach(e=>{if(!vis(e))return;if(e.closest('.tpick')&&!e.classList.contains('tpick'))return;
    if(e.tagName==='INPUT'&&/^(hidden|file|checkbox|radio|password|submit|button|color|range)$/.test(e.type))return;if(e.readOnly||e.disabled||e.dataset.gq!=null)return;
    const kind=e.classList.contains('tpick')?'tpick':e.tagName==='SELECT'?'select':e.tagName==='TEXTAREA'?'text':e.dataset.mob!=null||e.type==='tel'?'tel':e.type==='number'?'number':e.type==='date'?'date':e.type==='time'?'time':e.type==='email'?'email':'text';
    const label=vxgLabel(e);if(!label)return;out.push({el:e,kind,label,ex:e.getAttribute&&e.getAttribute('placeholder')||''})});return out}
function vxgStart(f){vxClose();const fields=vxgFields(f);if(!fields.length)return toast('Nothing to fill here','bad');vxg.form=f;vxg.fields=fields;vxg.i=0;vxg.vals=fields.map(()=>'');vxgStep()}
function vxgStep(){const F=vxg.fields[vxg.i];if(!F)return vxgReview();vx.state='on';vx.text='';const n=vxg.fields.length,cur=vxgCur(F);
  const ex=F.kind==='date'?'e.g. 14 December 2026':F.kind==='time'||F.kind==='tpick'?'e.g. 6:30 in the evening':F.kind==='tel'?'e.g. 98840 12345':F.kind==='number'?'e.g. 5000':F.kind==='select'?[...F.el.options].filter(o=>o.value).slice(0,4).map(o=>o.textContent.trim()).join(' / '):F.ex?F.ex:'';
  vxPaint(`<div class="vx-card vxg" role="dialog" aria-modal="true" aria-label="Speak to fill"><button type="button" class="icon-btn icon-sm vx-x" data-act="vxCancel" aria-label="Close">${ic('x',18)}</button>
    <div class="vxg-top"><small class="vxg-step">Step ${vxg.i+1} of ${n}</small>${vxLangSel('vxg_lg','sm')}</div>
    <div class="vxg-dots" aria-hidden="true">${vxg.fields.map((x,i)=>`<i class="${i<vxg.i?'d':i===vxg.i?'c':''}"></i>`).join('')}</div>
    <div class="vx-orb on" id="vxOrb">${ic('mic',28)}</div><b class="vx-ttl vxg-lab" data-noi18n>${esc(F.label)}</b>
    ${ex?`<div class="vx-hint"><small><span>For example</span></small><b data-noi18n>${esc(ex)}</b></div>`:''}
    ${cur?`<small class="muted vxg-now"><span>Now</span>: <span data-noi18n>${esc(cur)}</span></small>`:''}
    <p class="vx-txt" id="vxTxt" aria-live="polite">${vxg.vals[vxg.i]?esc(vxg.vals[vxg.i]):'<span class="muted">Listening…</span>'}</p>
    <small class="muted">No time limit. Tap Next when you finish this one.</small>
    <div class="vx-acts"><button type="button" class="btn btn-ghost btn-sm" data-act="vxgBack" ${vxg.i?'':'disabled'}>${ic('back',16)}Back</button><button type="button" class="btn btn-ghost btn-sm" data-act="vxgSkip">Skip</button><button type="button" class="btn btn-ghost btn-sm" data-act="vxgReview">${ic('edit',16)}Review</button><button type="button" class="btn btn-primary btn-sm" data-act="vxgNext">${vxg.i===n-1?'Finish':'Next'} ${ic('arrow',16)}</button></div></div>`);
  vxEngine(t=>{vx.text=t;const p=document.getElementById('vxTxt');if(p)p.textContent=t||'…'})}
function vxgCur(F){if(F.kind==='tpick'){const h=F.el.querySelector('input[type=hidden]');return h?tfmt(h.value):''}if(F.kind==='select'){const o=F.el.options[F.el.selectedIndex];return o?o.textContent.trim():''}return F.el.value||''}
/* the listening engine shared by the field-by-field mode: restarts after every pause, no time limit */
function vxEngine(onText){const SR=VX_SR();vxStopEngine();if(!SR){vxErr('This browser has no voice typing. Use Chrome or Edge on Android or a computer. On iPhone, type the entry here; the keyboard’s mic key works too.');return}
  const done=[];vx.heard=false;vx.err='';const t0=Date.now();
  const run=()=>{let rec;try{rec=new SR()}catch(e){return vxErr('Voice typing could not start on this browser. Type the entry instead.')}vx.rec=rec;rec.lang=vxL()[2];rec.interimResults=true;rec.continuous=true;let fin=[],mid='';
    const show=()=>{const all=[...done];fin.forEach(x=>vxMerge(all,x));onText(vxClean((all.join(' ')+' '+mid).replace(/\s+/g,' ')))};
    rec.onaudiostart=()=>{vx.heard=true;const o=document.getElementById('vxOrb');if(o)o.classList.add('live')};
    rec.onresult=e=>{fin=[];mid='';for(let i=0;i<e.results.length;i++){const tr=e.results[i][0].transcript;if(e.results[i].isFinal)vxMerge(fin,tr);else mid+=tr+' '}vx.heard=true;show()};
    rec.onerror=e=>{vx.err=e.error};
    rec.onend=()=>{if(vx.rec!==rec)return;fin.forEach(x=>vxMerge(done,x));if(mid.trim())vxMerge(done,mid);fin=[];mid='';
      if(['not-allowed','service-not-allowed','language-not-supported','audio-capture'].includes(vx.err)||(!vx.heard&&Date.now()-t0>7000)){vx.rec=null;return vxgFail()}
      vx.err='';setTimeout(()=>{if(vx.rec!==rec)return;try{rec.start()}catch(_){run()}},150)};
    try{rec.start()}catch(e){vx.rec=null;vxgFail()}};
  vxMic(()=>{if(vx.state==='on')run()});vx.wd=setTimeout(()=>{if(vx.rec&&!vx.heard){const r=vx.rec;vx.rec=null;r.onend=null;try{r.abort()}catch(_){}vxgFail()}},7000)}
function vxStopEngine(){clearTimeout(vx.wd);const r=vx.rec;vx.rec=null;if(r){r.onresult=r.onerror=r.onend=null;try{r.stop()}catch(_){}}}
function vxgFail(){if(vxg.fields.length&&vx.state==='on'){const msg=vx.err==='not-allowed'||vx.err==='service-not-allowed'?'The microphone is blocked here. Allow the microphone for this site in the browser settings and try again, or type the entry.':'The microphone did not start. On some phones voice typing is blocked inside apps or previews. Open Moi Point in Chrome, or type the entry.';
  vx.state='err';vxPaint(`<div class="vx-card" role="dialog" aria-modal="true"><button type="button" class="icon-btn icon-sm vx-x" data-act="vxCancel" aria-label="Close">${ic('x',18)}</button><div class="vx-orb err">${ic('alert',30)}</div><b class="vx-ttl">Voice typing didn’t work</b><p class="vx-msg">${esc(msg)}</p>
    <div class="vx-acts"><button type="button" class="btn btn-ghost btn-sm" data-act="vxCancel">Close</button><button type="button" class="btn btn-ghost btn-sm" data-act="vxgReview">${ic('edit',16)}Type instead</button><button type="button" class="btn btn-primary btn-sm" data-act="vxgRetry">${ic('refresh',16)}Try again</button></div></div>`)}}
function vxgSave(){if(vx.state==='on')vxg.vals[vxg.i]=(vx.text||vxg.vals[vxg.i]||'').replace(/[,.]\s*$/,'').trim()}
/* turn what was said into the value each kind of field wants */
function vxgConv(F,raw){raw=String(raw||'').trim();if(!raw)return '';const k=F.kind;
  if(k==='tel'){let d=vxNum(taNums(vxDigits(raw))).replace(/\D/g,'');if(d.length>10)d=d.replace(/^(91|0)/,'');return d.slice(0,10)}
  if(k==='number'){const m=vxNum(taNums(vxNum(vxDigits(raw)))).replace(/,/g,'').match(/\d+(?:\.\d+)?/);return m?m[0]:''}
  if(k==='date')return vxDate(raw);if(k==='time'||k==='tpick')return vxTime(raw);
  if(k==='email')return raw.toLowerCase().replace(/\s+at\s+|\s*@\s*/g,'@').replace(/\s+dot\s+/g,'.').replace(/\s+/g,'');
  if(k==='select'){const opts=[...F.el.options].filter(o=>o.value!==''),n=s=>vxNorm(IND.test(s)?any2en(s):s);const r=n(raw),rl=raw.toLowerCase();
    let hit=opts.find(o=>o.textContent.trim().toLowerCase()===rl||o.value.toLowerCase()===rl)||opts.find(o=>{const t=o.textContent.trim().toLowerCase();return t.includes(rl)||rl.includes(t)})||opts.find(o=>{const t=n(o.textContent);return t&&r&&(t.startsWith(r.slice(0,4))||r.includes(t))});
    if(!hit){for(const [re,v] of VX_REL)if(re.test(raw)){hit=opts.find(o=>o.value===v);break}}
    if(!hit){for(const [re,kw] of VX_SYN)if(re.test(raw)){hit=opts.find(o=>(o.value+' '+o.textContent).toLowerCase().includes(kw));if(hit)break}}return hit?hit.value:''}
  const id=(F.el.id||'').toLowerCase();if(/place|city/.test(id))return vxPlace(raw);
  if(IND.test(raw)&&/^(ga_name|rm_person|po_to|x_vendor|u_name|e_name|m_name|p_name)$|_org$|holder|payee|bk_name|upn\d/.test(id))return tCase(any2en(raw));return raw}
function vxgReview(){vxgSave();vxStopEngine();vx.state='review';const rows=vxg.fields.map((F,i)=>{const v=vxg.vals[i]?vxgConv(F,vxg.vals[i]):'',cur=F.kind==='tpick'?(F.el.querySelector('input[type=hidden]')||{}).value||'':F.kind==='select'?F.el.value:F.el.value,val=v||cur,id='vxg_'+i;
    const said=vxg.vals[i]?`<small class="vxg-said" data-noi18n>“${esc(vxg.vals[i])}”</small>`:'';
    if(F.kind==='select')return `<label class="field" for="${id}"><span data-noi18n>${esc(F.label)}</span><select id="${id}">${[...F.el.options].map(o=>`<option value="${esc(o.value)}" ${o.value===val?'selected':''}>${esc(o.textContent.trim())}</option>`).join('')}</select>${said}</label>`;
    if(F.kind==='tel')return `<label class="field vx-full" for="${id}"><span data-noi18n>${esc(F.label)}</span>${mobIn(id,val,'inputmode="numeric" maxlength="10"')}${said}</label>`;
    const type=F.kind==='date'?'date':F.kind==='time'||F.kind==='tpick'?'time':F.kind==='number'?'number':'text',full=F.kind==='text'&&F.el.tagName==='TEXTAREA';
    return `<label class="field ${full?'vx-full':''}" for="${id}"><span data-noi18n>${esc(F.label)}</span>${full?`<textarea id="${id}" rows="2">${esc(val)}</textarea>`:`<input id="${id}" type="${type}" value="${esc(val)}" ${type==='number'?'inputmode="decimal"':''}>`}${said}</label>`}).join('');
  vxPaint(`<form class="vx-card vx-rev" data-form="vxgFill" role="dialog" aria-modal="true" aria-label="Check and fill" novalidate><button type="button" class="icon-btn icon-sm vx-x" data-act="vxCancel" aria-label="Close">${ic('x',18)}</button>
    <div class="vx-rh"><span class="vx-orb sm ok">${ic('check',18)}</span><div><b class="vx-ttl">Check and fill</b><small class="muted">Correct anything here, then fill the form.</small></div></div>
    <div class="vx-grid">${rows}</div>
    <div class="vx-acts"><button type="button" class="btn btn-ghost btn-sm" data-act="vxCancel">Cancel</button><button type="button" class="btn btn-ghost btn-sm" data-act="vxgRetry">${ic('mic',16)}Speak again</button><button class="btn btn-primary btn-sm">${ic('check',16)}Fill the form</button></div></form>`)}
function vxgFill(){const f=vxg.form;vxg.fields.forEach((F,i)=>{const el=document.getElementById('vxg_'+i);if(!el)return;let v=el.value;if(F.kind==='tel')v=normMob(v);
  if(F.kind==='tpick'){if(!v)return;const [H,M]=v.split(':').map(Number),w=F.el;const hs=w.querySelector('[data-tph]'),ms=w.querySelector('[data-tpm]');hs.value=String((H%12)||12);ms.value=String(M);w.querySelectorAll('.ampm button').forEach(b=>{const on=b.dataset.v===(H>=12?'PM':'AM');b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});tpSync(w);return}
  if(F.el.value===v)return;F.el.value=v;F.el.classList.remove('invalid');F.el.classList.add('vx-flash');setTimeout(()=>F.el.classList.remove('vx-flash'),1400);F.el.dispatchEvent(new Event('input',{bubbles:true}));F.el.dispatchEvent(new Event('change',{bubbles:true}))});
  vxClose();document.querySelectorAll('.ac-list').forEach(b=>{b.hidden=true});toast('Filled in. Check and save.','good')}

/* the sheet: listening → check and edit → fill the form */
function vxSheet(){let s=document.getElementById('vxSheet');if(!s){s=document.createElement('div');s.id='vxSheet';s.className='vx-sheet';s.hidden=true;document.body.appendChild(s)}return s}
const VX_T={all:'Speak the whole entry',mobile:'Say the mobile number',name:'Say the name',place:'Say the place',des:'Say the designation',amount:'Say the amount'};
const VX_EG={mobile:'98840 12345',amount:'5001',name:'',place:'',des:''};
function vxPaint(html){const s=vxSheet();s.hidden=false;s.innerHTML=html;document.body.classList.add('vx-open');if(UIL!=='en'&&typeof l10n==='function')l10n(s)}
function vxListen(){const L=vxL(),t=vx.target;vx.state='on';
  vxPaint(`<div class="vx-card" role="dialog" aria-modal="true" aria-label="${esc(VX_T[t])}"><button type="button" class="icon-btn icon-sm vx-x" data-act="vxCancel" aria-label="Close">${ic('x',18)}</button>
    <div class="vx-orb on" id="vxOrb">${ic('mic',30)}</div><b class="vx-ttl">${esc(VX_T[t])}</b>
    <div class="vx-hint"><small><span>${t==='all'?'Say it like this':'For example'}</span> · <span data-noi18n>${esc(L[1])}</span></small><b data-noi18n>“${esc(t==='all'?L[3]:VX_EG[t]||L[3].split(/[,،]/)[t==='place'?1:0].trim())}”</b>${t==='all'?`<small data-noi18n class="muted">${esc(L[4])}</small>`:''}</div>
    <p class="vx-txt" id="vxTxt" aria-live="polite"><span class="muted">Listening…</span></p>
    <div class="vx-time"><div class="vx-tbar"><i id="vxBar"></i></div><small><span>Keep talking. Pauses are fine. Tap Done when you finish.</span> <b id="vxLeft">1:00</b></small></div>
    <div class="vx-acts"><button type="button" class="btn btn-ghost btn-sm" data-act="vxCancel">Cancel</button><button type="button" class="btn btn-ghost btn-sm" data-act="vxType">${ic('edit',16)}Type instead</button><button type="button" class="btn btn-primary btn-sm" data-act="vxDone">${ic('check',16)}Done</button></div></div>`)}
function vxErr(msg){vx.state='err';vxPaint(`<div class="vx-card" role="dialog" aria-modal="true"><button type="button" class="icon-btn icon-sm vx-x" data-act="vxCancel" aria-label="Close">${ic('x',18)}</button>
  <div class="vx-orb err">${ic('alert',30)}</div><b class="vx-ttl">Voice typing didn’t work</b><p class="vx-msg">${esc(msg)}</p>
  <div class="vx-acts"><button type="button" class="btn btn-ghost btn-sm" data-act="vxCancel">Close</button><button type="button" class="btn btn-ghost btn-sm" data-act="vxType">${ic('edit',16)}Type instead</button>${VX_SR()?`<button type="button" class="btn btn-primary btn-sm" data-act="vxGo" data-px="${vx.px}" data-t="${vx.target}">${ic('refresh',16)}Try again</button>`:''}</div></div>`)}
function vxReview(said){vx.state='review';const t=vx.target,o=t==='all'?vxFields(vxParse(said)):vxOne(t,said),al=document.getElementById('m_alt'),evM=(()=>{const fl=flows[vx.px==='p'?'public':'staff'],ev=fl&&S.events.find(e=>e.id===fl.eid);return ev?(vx.px==='p'?qrModes(ev):evModes(ev)):['cash','upi']})();
  const f=(k,l,v,a='')=>`<label class="field" for="vxr_${k}"><span>${l}</span><input id="vxr_${k}" value="${esc(v)}" ${a}></label>`;
  const mob=`<label class="field vx-full" for="vxr_mobile"><span>Mobile number</span>${mobIn('vxr_mobile',o.mobile||'','inputmode="numeric" maxlength="10" placeholder="10-digit mobile"')}</label><div class="vx-full vx-found" id="vxr_found"></div>`;
  const rows=t==='all'?`${mob}${f('name','Name',o.name,'autocomplete="off"')}
      ${vx.px==='m'&&(o.native||al)?f('native','Name on receipt',o.native||'','autocomplete="off" lang="'+vxLang()+'"'):''}${f('place','Place',o.place,'autocomplete="off"')}
      <label class="field" for="vxr_rel"><span>Relationship</span><select id="vxr_rel"><option value="">—</option>${RELS.map(x=>`<option value="${esc(x)}" ${o.rel===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>${f('des','Designation',o.des,'autocomplete="off"')}
      ${f('amount','Amount (₹)',o.amount,'inputmode="numeric"')}<label class="field" for="vxr_mode"><span>Payment mode</span><select id="vxr_mode"><option value="">—</option>${evM.map(k=>`<option value="${k}" ${o.mode===k?'selected':''}>${esc(MODE[k]||k)}</option>`).join('')}</select></label>`
    :t==='mobile'?mob:f(t,{name:'Name',place:'Place',des:'Designation',amount:'Amount (₹)'}[t],o[t]||'',t==='mobile'||t==='amount'?'inputmode="numeric"':'autocomplete="off"')+(t==='name'&&vx.px==='m'&&(o.native||al)?f('native','Name on receipt',o.native||'','autocomplete="off"'):'');
  vxPaint(`<form class="vx-card vx-rev" data-form="vxFill" role="dialog" aria-modal="true" aria-label="Check and fill" novalidate><button type="button" class="icon-btn icon-sm vx-x" data-act="vxCancel" aria-label="Close">${ic('x',18)}</button>
    <div class="vx-rh"><span class="vx-orb sm ok">${ic('check',18)}</span><div><b class="vx-ttl">Check and fill</b><small class="muted">Correct anything here, then fill the form.</small></div></div>
    <label class="field vx-heard-f" for="vxr_said"><span>What we heard</span><textarea id="vxr_said" rows="2" placeholder="Type the entry here, e.g. ${esc(vxL()[3])}">${esc(said)}</textarea></label>
    ${t==='all'?`<button type="button" class="link vx-reread" data-act="vxReparse">${ic('refresh',14)} Read the text again</button>`:''}
    <div class="vx-grid">${rows}</div>
    <div class="vx-acts"><button type="button" class="btn btn-ghost btn-sm" data-act="vxCancel">Cancel</button><button type="button" class="btn btn-ghost btn-sm" data-act="vxGo" data-px="${vx.px}" data-t="${t}">${ic('mic',16)}Speak again</button><button class="btn btn-primary btn-sm">${ic('check',16)}Fill the form</button></div></form>`);vxLookupR(true)}
/* a known number brings back the guest's details (this family's guests first, then anyone on Moi Point) */
function vxFindMob(mob){if(!mobOk(mob))return null;let A=null;try{A=curAcc()}catch(_){}const own=A?guestBook(A.id).find(g=>g.mobile===mob&&(g.entries.length||g.gid)):null;
  if(own)return {own:true,name:own.name,place:own.place,des:own.des,rel:own.rel,alt:own.alt,n:own.entries.length};
  const ms=S.moi.filter(m=>m.c.mobile===mob).sort((a,b)=>(b.c.updatedAt||b.created_at)-(a.c.updatedAt||a.created_at));if(ms.length){const c=ms[0].c;return {own:false,name:c.name,place:c.place||'',des:c.designation||'',rel:'',alt:c.alt,n:ms.length}}
  const r=(S.guests||[]).find(x=>x.mobile===mob);return r?{own:false,name:r.name,place:r.place||'',des:r.des||'',rel:'',n:0}:null}
function vxLookupR(auto){const i=document.getElementById('vxr_mobile'),box=document.getElementById('vxr_found');if(!i||!box)return;const mob=normMob(i.value);
  if(!mob){box.innerHTML='';return}if(!mobOk(mob)){box.innerHTML=mob.length>=10?`<p class="small" style="color:var(--bad,#C62828)">${MOBERR}</p>`:'';return}
  const g=vxFindMob(mob);if(!g){box.innerHTML=`<div class="found new">${ic('user',16)}<div><b>New guest</b><br><small>This number is not on Moi Point yet.</small></div></div>`;return}
  vx.found=g;const al=document.getElementById('m_alt'),lg=al&&al.dataset.lg,native=g.alt&&lg&&g.alt[lg]||'';
  if(auto!==false){[['name',g.name],['place',g.place],['des',g.des],['native',native]].forEach(([k,v])=>{const el=document.getElementById('vxr_'+k);if(el&&v&&!el.value.trim())el.value=v});if(g.rel){const r=document.getElementById('vxr_rel');if(r&&!r.value)r.value=g.rel}}
  box.innerHTML=`<div class="found">${ic('check',16)}<div><b>${esc(g.name)}</b>${g.place?' · '+esc(g.place):''}${g.rel?' · '+esc(g.rel):''}<br><small>${g.own?'Already in your guest list':'Found on Moi Point'}${g.n?` · gave Moi at ${g.n} function${g.n>1?'s':''}`:''}. Empty boxes are filled from it.</small><div style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" data-act="vxUseFound">${ic('refresh',14)}Use all their saved details</button></div></div></div>`}
function vxOne(t,said){said=vxClean(said).replace(/,\s*$/,'');const s=vxNum(taNums(vxNum(vxDigits(said)))),o={};
  if(t==='mobile'){let d=s.replace(/\D/g,'');if(d.length>10)d=d.replace(/^(91|0)/,'');o.mobile=d.slice(0,10)}
  else if(t==='amount')o.amount=+((s.match(/\d[\d,]*/)||[''])[0].replace(/,/g,''))||'';
  else if(t==='place')o.place=vxPlace(said.trim());
  else if(t==='name'){if(IND.test(said)){o.native=said.trim();o.name=tCase(any2en(said))}else o.name=tCase(said)}
  else o[t]=IND.test(said)?tCase(any2en(said)):tCase(said);return o}
function vxClose(){clearTimeout(vx.timer);clearTimeout(vx.wd);clearInterval(vx.iv);const r=vx.rec;vx.rec=null;if(r){r.onresult=r.onerror=r.onend=null;try{r.abort()}catch(_){}}vx.state='';const s=vxSheet();s.hidden=true;s.innerHTML='';document.body.classList.remove('vx-open')}
function vxFinish(){const r=vx.rec;clearTimeout(vx.timer);clearTimeout(vx.wd);clearInterval(vx.iv);vx.rec=null;if(r){r.onresult=r.onerror=r.onend=null;try{r.stop()}catch(_){}}const said=(vx.text||'').trim();
  if(said)return vxReview(said);vxErr(vx.err==='not-allowed'||vx.err==='service-not-allowed'?'The microphone is blocked here. Allow the microphone for this site in the browser settings and try again, or type the entry.':vx.err==='network'?'Voice typing needs the internet. Check the connection and try again, or type the entry.':vx.err==='language-not-supported'?'This phone can’t do voice typing in this language yet. Pick another language, or type the entry.':vx.heard?'Nothing clear was heard. Speak close to the phone and try again.':'The microphone did not start. On some phones voice typing is blocked inside apps or previews. Open Moi Point in Chrome, or type the entry.')}
/* keeps listening for up to a minute: pauses don't stop it; Done (or the minute running out) does */
const VX_MAX=60;
/* ask for the microphone once; after “Allow” the browser remembers it, so listening restarts don't ask again */
let vxMicOk=(()=>{try{return localStorage.getItem('moipoint-mic')==='1'}catch(_){return false}})();
function vxMic(go){const md=navigator.mediaDevices;if(vxMicOk||!md||!md.getUserMedia)return go();
  const ask=()=>md.getUserMedia({audio:true}).then(s=>{s.getTracks().forEach(t=>t.stop());vxMicOk=true;try{localStorage.setItem('moipoint-mic','1')}catch(_){}go()}).catch(()=>go());
  if(navigator.permissions&&navigator.permissions.query)navigator.permissions.query({name:'microphone'}).then(p=>{if(p.state==='granted'){vxMicOk=true;go()}else ask()}).catch(ask);else ask()}
function vxMerge(parts,t){t=t.trim();if(!t)return;const l=parts[parts.length-1];if(l!=null&&(t.startsWith(l)||l===t)){parts[parts.length-1]=t;return}if(l!=null&&l.startsWith(t))return;parts.push(t)}
function vxTick(){const left=Math.max(0,Math.ceil((vx.until-Date.now())/1000)),el=document.getElementById('vxLeft'),bar=document.getElementById('vxBar');if(el)el.textContent=`0:${String(left).padStart(2,'0')}`;if(bar)bar.style.width=(left/VX_MAX*100)+'%';if(left<=0)vxFinish()}
function vxStart(px,target){vxClose();vx.px=px;vx.target=target;vx.text='';vx.err='';vx.heard=false;vx.done=[];vx.until=Date.now()+VX_MAX*1000;const SR=VX_SR();
  if(!SR)return vxErr('This browser has no voice typing. Use Chrome or Edge on Android or a computer. On iPhone, type the entry here; the keyboard’s mic key works too.');
  vxListen();
  const live=()=>{const p=document.getElementById('vxTxt');if(p)p.textContent=vx.text||'…'};
  const run=first=>{let rec;try{rec=new SR()}catch(e){return vxErr('Voice typing could not start on this browser. Type the entry instead.')}
    vx.rec=rec;rec.lang=vxL()[2];rec.interimResults=true;rec.continuous=true;rec.maxAlternatives=1;let fin=[],mid='';
    const show=()=>{const all=[...vx.done];fin.forEach(x=>vxMerge(all,x));vx.text=vxClean((all.join(' ')+' '+mid).replace(/\s+/g,' '));live()};
    rec.onaudiostart=()=>{vx.heard=true;clearTimeout(vx.wd);const o=document.getElementById('vxOrb');if(o)o.classList.add('live')};
    rec.onspeechstart=()=>{vx.heard=true};
    rec.onresult=e=>{fin=[];mid='';for(let i=0;i<e.results.length;i++){const tr=e.results[i][0].transcript;if(e.results[i].isFinal)vxMerge(fin,tr);else mid+=tr+' '}vx.heard=true;clearTimeout(vx.wd);show()};
    rec.onerror=e=>{vx.err=e.error};
    rec.onend=()=>{if(vx.rec!==rec)return;fin.forEach(x=>vxMerge(vx.done,x));if(mid.trim())vxMerge(vx.done,mid);fin=[];mid='';
      const fatal=['not-allowed','service-not-allowed','language-not-supported','audio-capture'].includes(vx.err);
      if(fatal||Date.now()>=vx.until||(!vx.heard&&!vx.text&&Date.now()-vx.until+VX_MAX*1000>7000))return vxFinish();
      vx.err='';setTimeout(()=>{if(vx.rec!==rec)return;try{rec.start()}catch(_){run(false)}},150)};
    try{rec.start()}catch(e){vx.rec=null;return vxErr('Voice typing could not start: '+e.message)}};
  vxMic(()=>{if(vx.state==='on')run(true)});
  vx.wd=setTimeout(()=>{if(vx.rec&&!vx.heard&&!vx.text)vxFinish()},7000);
  clearInterval(vx.iv);vx.iv=setInterval(()=>{if(!vx.rec||vx.state!=='on'){clearInterval(vx.iv);return}vxTick()},500)}

/* ---------- mobile number lookup ---------- */
function lookup(px,raw){
  const box=$('#found-'+px);if(!box)return;const mob=normMob(raw);
  if(!mobOk(mob)){box.dataset.mob='';
    if(px==='m'&&mob.length>=2){const hits=guestBook(curAcc().id).filter(g=>g.mobile&&g.mobile.includes(mob)).sort((a,b)=>(b.mobile.startsWith(mob)-a.mobile.startsWith(mob))||(b.last-a.last)).slice(0,6);
      box.innerHTML=hits.length?`<div class="sug-list" role="listbox" aria-label="Matching guests">${hits.map(g=>sugRow(g,mob)).join('')}</div>`:(mob.length>=6?`<p class="small muted">No guest with these digits yet.</p>`:'');return}
    box.innerHTML='';return}
  const ctx=px==='m'?'staff':'public',eid=flows[ctx]&&flows[ctx].eid;
  const hits=S.moi.filter(m=>m.c.mobile===mob).sort((a,b)=>(b.c.updatedAt||b.created_at)-(a.c.updatedAt||a.created_at)),pp=px==='m'?masterFind(mob):null;
  if(!hits.length&&pp){const f=$('#m_mobile').form;if(box.dataset.mob!==mob){pplFill(f,'m',pp);const own=guestBook(curAcc().id).find(g=>g.mobile===mob),rl=f.querySelector('#m_rel');if(rl)rl.value='Relative';box.dataset.mob=mob}
    box.innerHTML=`<div class="found master">${ic('check',18)}<div><b>${esc(pp.name)}</b>${pp.place?' · '+esc(pp.place):''}<br><small>From ${pplSrcTxt2(pp)}. First Moi from this guest here. Latest details are filled in. Change anything that’s different.</small></div></div>`;return}
  if(!hits.length&&px==='m'){const r=guestBook(curAcc().id).find(g=>g.mobile===mob&&g.gid);if(r){const f=$('#'+px+'_mobile').form;if(box.dataset.mob!==mob){[['name',r.name],['place',r.place],['des',r.des]].forEach(([id,v])=>{const el=f.querySelector('#m_'+id);if(el&&v){el.value=v;el.classList.remove('invalid')}});const rl=f.querySelector('#m_rel');if(rl)rl.value='Relative';const a=f.querySelector('#m_addr');if(a&&r.address&&!a.value)a.value=r.address;const al=f.querySelector('#m_alt');if(al)al.value=translit(r.name,al.dataset.lg);box.dataset.mob=mob}
    box.innerHTML=`<div class="found">${ic('check',18)}<div><b>${esc(r.name)}</b>${r.place?' · '+esc(r.place):''}<br><small>From your guest list. First Moi from this guest.</small></div></div>`;return}}
  if(!hits.length){box.innerHTML=`<div class="found new">${ic('user',18)}<div><b>New contributor</b><br><small>Fill in the details below. Next time, this number fills them in.</small></div></div>`;return}
  const c0=hits[0].c,c=pp&&pp.at>=(c0.updatedAt||hits[0].created_at||0)?{...c0,name:pp.name,place:pp.place||c0.place,designation:pp.des||c0.designation,address:pp.address||c0.address,alt:pp.alt||(pp.name===c0.name?c0.alt:null)}:c0,f=$('#'+px+'_mobile').form;
  if(box.dataset.mob!==mob){[['name','name'],['place','place'],['des','designation']].forEach(([id,k])=>{const el=f.querySelector('#'+px+'_'+id);if(el&&c[k]){el.value=c[k];el.classList.remove('invalid')}});{const r=f.querySelector('#'+px+'_rel');if(r)r.value='Relative'}{const a=f.querySelector('#'+px+'_addr');if(a&&c.address&&!a.value)a.value=c.address}const al=f.querySelector('#m_alt');if(al){const lg=al.dataset.lg;al.value=translit((c.alt&&c.alt[lg])||c.name,lg);al.dataset.touched=c.alt&&c.alt[lg]?'1':''}box.dataset.mob=mob}
  if(px==='p'){box.innerHTML=`<div class="found">${ic('check',18)}<div><b>Welcome back, ${esc(c.name)}</b><br><small>Your details are filled in. Change anything that’s different.</small></div></div>`;return}
  const evn=new Set(hits.map(m=>m.event_id)).size,seen=hits.filter(m=>roleIn(m.event_id)).slice(0,3),same=hits.filter(m=>m.event_id===eid);
  box.innerHTML=`<div class="found">${ic('check',18)}<div><b>${esc(c.name)}</b>${c.place?' · '+esc(c.place):''}<br><small>Filled in with their latest details on Moi Point. Relation is set to Relative; change it for this family. Gave Moi at ${evn} event${evn>1?'s':''} on Moi Point.${seen.length?'<br>'+seen.map(m=>`${esc((S.events.find(e=>e.id===m.event_id)||{}).name)}: ${fmt(m.amount)}`).join(' · '):''}</small></div></div>
  ${same.length?`<div class="found warn">${ic('alert',18)}<div><b>Already has an entry in this event</b><br><small>${same.map(m=>`${m.code} · ${fmt(m.amount)} · ${STATUS[m.status][0]}`).join('<br>')}<br>Add only if this is a separate Moi.</small></div></div>`:''}`;
}

/* ---------- guest list: everyone who gave Moi plus guests added by hand, groups, and messages ---------- */
const gst={q:'',ev:'',rel:'',place:'',sort:'last',grp:'',sel:new Set()};
const gKey=(mob,name)=>mob||'n:'+String(name||'').trim().toLowerCase();
function myGuests(evId){const A=myAcc()||curAcc();if(!A)return [];const ok=new Set(S.events.filter(e=>e.acc===A.id&&(me.role==='admin'||['admin','manager'].includes(roleIn(e.id)))).map(e=>e.id));
  return guestBook(A.id).map(g=>({...g,entries:g.entries.filter(m=>ok.has(m.event_id)),evs:g.evs.filter(id=>ok.has(id))})).filter(g=>!g.hidden&&(g.entries.length||g.gid)&&(!evId||g.evs.includes(evId)))}
const myGroups=evId=>(S.ggroups||[]).filter(x=>x.acc===me.acc&&(!evId||x.ev===evId));
function gRem(g){return g.mobile?S.reminders.filter(r=>r.owner===me.id&&r.mobile===g.mobile):S.reminders.filter(r=>r.owner===me.id&&r.person&&r.person.toLowerCase()===String(g.name).toLowerCase())}
function guestRows(list){if(!list.length)return `<div class="empty">${ic('users',28)}<b>No guests match</b><p class="muted">Guests appear here after they give Moi, or add them with Add guest.</p></div>`;
  const grp=(S.ggroups||[]).filter(x=>x.acc===me.acc);
  return `<div class="g-list">${list.map(g=>{const on=gst.sel.has(g.key),gs=grp.filter(x=>x.keys.includes(g.key));return `<div class="g-row ${on?'on':''}"><label class="g-ck"><input type="checkbox" data-gsel="${esc(g.key)}" ${on?'checked':''} aria-label="Select ${esc(g.name)}"></label>
    <button class="g-main" data-act="guestOpen" data-key="${esc(g.key)}"><span class="avatar ${avc(g.name)}">${esc(ini(g.name))}</span><span class="g-t"><b>${esc(UN(g.name))}${!g.entries.length?` <span class="g-tag">Added</span>`:''}</b><small>${g.mobile?fmtMob(g.mobile):'No mobile'}${g.place?' · '+esc(UP(g.place)):''}${g.rel?' · '+esc(g.rel):''}${gs.length?' · '+gs.map(x=>esc(x.name)).join(', '):''}</small></span>
    <span class="g-n">${g.entries.length?`<b>${fmt(g.given)}</b><small>${g.entries.length} Moi${g.returned?` · returned ${fmt(g.returned)}`:''}</small>`:`<small>No Moi yet</small><small>${g.evs.length} event${g.evs.length===1?'':'s'}</small>`}</span></button></div>`}).join('')}</div>`}
const fmtMob=m=>m?m.slice(0,5)+' '+m.slice(5):'';
function gFiltered(evId){const all=myGuests(evId),q=gst.q.trim().toLowerCase(),qd=q.replace(/\D/g,''),grp=myGroups().find(x=>x.id===gst.grp);
  let list=all.filter(g=>(!q||String(g.name).toLowerCase().includes(q)||(qd.length>=2&&g.mobile.includes(qd))||String(g.place).toLowerCase().includes(q))&&(evId||!gst.ev||g.evs.includes(gst.ev))&&(!gst.rel||g.rel===gst.rel)&&(!gst.place||g.place===gst.place)&&(!grp||grp.keys.includes(g.key)));
  list.sort({last:(a,b)=>b.last-a.last,name:(a,b)=>String(a.name).localeCompare(String(b.name)),given:(a,b)=>b.given-a.given,count:(a,b)=>b.entries.length-a.entries.length}[gst.sort]);return list}
function vGuests(evId){const all=myGuests(evId),evs=S.events.filter(e=>e.acc===me.acc&&manages(e.id));
  const grps=evId?myGroups().filter(x=>x.ev===evId||x.keys.some(k=>all.some(g=>g.key===k))):myGroups();if(gst.grp&&!grps.some(x=>x.id===gst.grp))gst.grp='';
  const grp=grps.find(x=>x.id===gst.grp),list=gFiltered(evId);
  const places=[...new Set(all.map(g=>g.place).filter(Boolean))].sort(),sel=[...gst.sel].filter(k=>all.some(g=>g.key===k)),tot=all.reduce((s,g)=>s+g.given,0),ret=all.reduce((s,g)=>s+g.returned,0),ev=evId&&S.events.find(e=>e.id===evId);
  const logs=(S.msgLog||[]).filter(x=>x.acc===me.acc&&(!evId||x.ev===evId)).slice(0,4);
  return `<div class="page-head"><div><h1>${ev?'Guests of this event':'Guest list'}</h1><p class="sub">${ev?`Everyone who gave Moi at ${esc(ev.name)}, and guests you added to this event.`:'Everyone who gave Moi at your functions, and guests you added. Make groups, and send invitations, updates or thank-you messages.'}</p></div>
    <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="gAdd" data-ev="${evId||''}">${ic('plus',16)}Add guest</button><button class="btn btn-primary btn-sm" data-act="msgNew" data-ev="${evId||''}">${ic('msg',16)}Send message</button><button class="btn btn-ghost btn-sm" data-act="copyGuests" data-ev="${evId||''}">${ic('copy',16)}Copy as CSV</button></div></div>
  <div class="g-stats"><div><span class="lbl">Guests</span><b>${all.length}</b><small>${all.filter(g=>g.mobile).length} with mobile</small></div><div><span class="lbl">Moi given to you</span><b>${fmt(tot)}</b><small>${all.reduce((s,g)=>s+g.entries.length,0)} entries</small></div><div><span class="lbl">You returned</span><b>${fmt(ret)}</b><small>${all.filter(g=>g.returned).length} guests</small></div></div>
  <section class="card pad stack g-grps" style="gap:10px"><div class="row-between"><h3>${ic('users',18)} Groups</h3><button class="btn btn-ghost btn-sm" data-act="grpNew" data-ev="${evId||''}">${ic('plus',16)}New group</button></div>
    <div class="g-chips"><button class="g-chip ${!grp?'on':''}" data-act="grpPick" data-id=""><b>${ev?'All guests of this event':'All guests'}</b><small>${all.length}</small></button>${grps.map(x=>{const xe=x.ev&&S.events.find(e=>e.id===x.ev);return `<button class="g-chip ${grp&&grp.id===x.id?'on':''}" data-act="grpPick" data-id="${x.id}"><b>${esc(x.name)}</b><small>${x.keys.length}${xe&&!evId?' · '+esc(xe.name):''}</small></button>`}).join('')}</div>
    ${grp?`<div class="g-grpbar"><span class="small muted">${grp.ev?`Group for ${esc((S.events.find(e=>e.id===grp.ev)||{}).name||'')}. Guests added here join that event’s guest list.`:'A group of your own. Use it for any function.'}</span><div class="btn-row"><button class="btn btn-primary btn-sm" data-act="msgNew" data-grp="${grp.id}">${ic('msg',16)}Message this group</button><button class="btn btn-ghost btn-sm" data-act="grpEdit" data-id="${grp.id}">${ic('edit',16)}Rename</button><button class="btn btn-ghost btn-sm" data-act="grpDel" data-id="${grp.id}">${ic('trash',16)}Delete group</button></div></div>`:grps.length?'':`<p class="small muted">Make a group, for example “Bride’s side”, “Office friends” or “Village relatives”, then send them one message.</p>`}</section>
  <section class="card pad stack" style="gap:12px"><div class="g-flt"><div class="search">${ic('search',18)}<input class="inp" type="search" data-gq placeholder="Name, mobile or place" value="${esc(gst.q)}" aria-label="Search guests"></div>
    ${evId?'':`<select data-gf="ev" aria-label="Event"><option value="">All events</option>${evs.map(e=>`<option value="${e.id}" ${gst.ev===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select>`}
    <select data-gf="rel" aria-label="Relation"><option value="">Any relation</option>${RELS.map(r=>`<option ${gst.rel===r?'selected':''}>${esc(r)}</option>`).join('')}</select>
    <select data-gf="place" aria-label="Place"><option value="">Any place</option>${places.map(p=>`<option ${gst.place===p?'selected':''}>${esc(p)}</option>`).join('')}</select>
    <select data-gf="sort" aria-label="Sort"><option value="last" ${gst.sort==='last'?'selected':''}>Latest first</option><option value="name" ${gst.sort==='name'?'selected':''}>Name A–Z</option><option value="given" ${gst.sort==='given'?'selected':''}>Gave most</option><option value="count" ${gst.sort==='count'?'selected':''}>Most functions</option></select></div>
    <div class="row-between g-selbar"><label class="check"><input type="checkbox" data-gall ${list.length&&list.every(g=>gst.sel.has(g.key))?'checked':''}> Select all ${list.length} shown</label>${sel.length?`<button class="link" data-act="gClear">Clear selection</button>`:''}</div>
    ${sel.length?`<div class="g-actbar"><b>${sel.length} selected</b><div class="btn-row"><button class="btn btn-primary btn-sm" data-act="invite" data-scope="sel">${ic('msg',16)}Send message (${sel.length})</button><button class="btn btn-ghost btn-sm" data-act="gPush" data-to="grp">${ic('users',16)}Add to group</button><button class="btn btn-ghost btn-sm" data-act="gPush" data-to="ev">${ic('cal',16)}Add to event</button>${grp?`<button class="btn btn-ghost btn-sm" data-act="grpOut" data-id="${grp.id}">${ic('x',16)}Remove from group</button>`:''}<button class="btn btn-ghost btn-sm g-del" data-act="gDel" data-ev="${evId||''}">${ic('trash',16)}${evId?'Remove':'Remove guest'}</button></div></div>`:''}
    <div id="gRows">${guestRows(list)}</div></section>
  ${logs.length?`<section class="card pad stack" style="gap:10px"><div class="row-between"><h3>${ic('msg',18)} Messages sent</h3><a class="btn btn-ghost btn-sm" href="#messages${evId?'-'+evId:''}">See all</a></div><div class="rows">${logs.map(msgRow).join('')}</div></section>`:''}`}
function guestModal(key){const evC=gEvCtx(),g=myGuests().find(x=>x.key===key);if(!g)return;const rems=gRem(g),grps=myGroups().filter(x=>x.keys.includes(g.key)),evn=g.evs.map(id=>S.events.find(e=>e.id===id)).filter(Boolean);
  const rows=g.entries.slice().sort((a,b)=>(b.created_at||0)-(a.created_at||0)).map(m=>{const e=S.events.find(x=>x.id===m.event_id)||{};return `<div class="tl-i"><span class="tl-dot in"></span><div class="tl-b"><b>${esc(amtTxt(m))} <small class="muted">${esc(MODE[m.mode]||m.mode)}</small></b><small>${esc(e.name||'')} · ${dfmt(m.date)} · <span class="code">${esc(m.code)}</span> · ${pill(m.status)}</small>${m.ret?`<div class="tl-ret">${ic('undo',14)} You returned <b>${fmt(m.ret.amount)}</b> on ${dfmt(m.ret.date)}${m.ret.note?' · '+esc(m.ret.note):''}</div>`:''}</div><button class="icon-btn icon-sm" data-act="moiView" data-id="${m.id}" aria-label="Open receipt">${ic('eye',16)}</button></div>`}).join('');
  openModal(`${mh(esc(g.name),[g.mobile?'+91 '+fmtMob(g.mobile):'No mobile',g.place,g.rel].filter(Boolean).map(esc).join(' · '))}<div class="md-b stack" style="gap:16px">
    <div class="g-stats"><div><span class="lbl">They gave you</span><b>${fmt(g.given)}</b><small>${g.entries.length} Moi</small></div><div><span class="lbl">You returned</span><b>${fmt(g.returned)}</b><small>${g.entries.filter(m=>m.ret).length} times</small></div><div><span class="lbl">${g.given-g.returned>=0?'Still to return':'You gave more'}</span><b>${fmt(Math.abs(g.given-g.returned))}</b><small>given − returned</small></div></div>
    <dl class="kvlist">${[['Mobile',g.mobile?`+91 ${fmtMob(g.mobile)}`:'—'],['Relation',g.rel],['Place',g.place],['Work',g.des],['Address',g.address],['Notes',g.notes],['Events',evn.map(e=>e.name).join(', ')],['Groups',grps.map(x=>x.name).join(', ')]].filter(x=>x[1]).map(([l,v])=>`<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <div class="btn-row">${g.mobile?`<a class="btn btn-ghost btn-sm" href="tel:+91${g.mobile}">${ic('phone',16)}Call</a><a class="btn btn-ghost btn-sm" href="https://wa.me/91${g.mobile}" target="_blank" rel="noopener">${ic('msg',16)}WhatsApp chat</a><button class="btn btn-primary btn-sm" data-act="invite" data-scope="one" data-key="${esc(g.key)}">${ic('msg',16)}Send message</button>`:''}<button class="btn btn-ghost btn-sm" data-act="gAdd" data-key="${esc(g.key)}">${ic('edit',16)}Edit details</button><button class="btn btn-ghost btn-sm g-del" data-act="gDel" data-key="${esc(g.key)}" data-ev="${evC}">${ic('trash',16)}Remove</button>${g.entries.length&&g.mobile?`<button class="btn btn-ghost btn-sm" data-act="gRemNew" data-key="${esc(g.key)}">${ic('cal',16)}Add return reminder</button>`:''}</div>
    ${rows?`<div><h3 style="margin-bottom:8px">Moi history</h3><div class="tl">${rows}</div></div>`:`<p class="small muted">No Moi from this guest yet. When they give Moi with this mobile number, it joins here by itself.</p>`}
    ${rems.length?`<div><h3 style="margin-bottom:8px">Their functions you will attend</h3><div class="rows">${rems.map(r=>`<div class="row-card" style="cursor:default"><span class="tile-ic" style="margin:0">${ic('cal',18)}</span><div class="rc-main"><b>${esc(r.title)}</b><small>${dfmt(r.date)}${r.amount?' · plan to give '+fmt(r.amount):''} · ${remState(r)[0]}</small></div></div>`).join('')}</div></div>`:''}
  </div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Close</button></div>`)}

