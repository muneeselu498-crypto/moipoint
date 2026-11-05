/* ---------- sample data ---------- */
function makeShot(amount,upi,utr){
  try{const c=document.createElement('canvas');c.width=360;c.height=520;const x=c.getContext('2d');
    x.fillStyle='#ffffff';x.fillRect(0,0,360,520);x.fillStyle='#1a7f4b';x.beginPath();x.arc(180,120,44,0,7);x.fill();
    x.strokeStyle='#fff';x.lineWidth=8;x.beginPath();x.moveTo(158,120);x.lineTo(175,137);x.lineTo(204,104);x.stroke();
    x.fillStyle='#111';x.textAlign='center';x.font='600 22px sans-serif';x.fillText('Payment successful',180,210);
    x.font='700 44px sans-serif';x.fillText('₹'+amount.toLocaleString('en-IN'),180,272);
    x.font='16px sans-serif';x.fillStyle='#555';x.fillText('Paid to '+upi,180,316);x.fillText('UPI Ref No: '+utr,180,346);x.fillText('02 Aug 2026, 7:'+(10+amount%40)+' pm',180,376);
    return c.toDataURL('image/jpeg',.7)}catch(e){return null}
}
function makeBanner(){
  try{const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,1200,630);g.addColorStop(0,'#FFE3EC');g.addColorStop(1,'#E4E1FF');x.fillStyle=g;x.fillRect(0,0,1200,630);
    [['#F7A1C4',150,170,70],['#9C95FF',1040,150,62],['#7EDCEB',980,420,48],['#FFC97A',230,470,54],['#F7A1C4',1110,520,34]].forEach(([col,cx,cy,r])=>{x.fillStyle=col;x.beginPath();x.ellipse(cx,cy,r,r*1.2,0,0,7);x.fill();x.strokeStyle=col;x.lineWidth=3;x.beginPath();x.moveTo(cx,cy+r*1.2);x.quadraticCurveTo(cx+20,cy+r*2,cx-6,cy+r*3);x.stroke()});
    x.textAlign='center';x.fillStyle='#2A2580';x.font='700 150px Georgia,serif';x.fillText('Kavi',600,310);
    x.font='600 54px sans-serif';x.fillStyle='#4A42C8';x.fillText('turns ONE',600,390);
    x.font='500 34px sans-serif';x.fillStyle='#5B5875';x.fillText('02 August 2026 · Sri Murugan Mahal',600,470);
    return c.toDataURL('image/jpeg',.82)}catch(e){return null}
}
function makeItemImg(kind){
  try{const c=document.createElement('canvas');c.width=360;c.height=270;const x=c.getContext('2d');
    const bg=x.createLinearGradient(0,0,360,270);bg.addColorStop(0,'#F6F3EC');bg.addColorStop(1,'#E9E4D8');x.fillStyle=bg;x.fillRect(0,0,360,270);
    if(kind==='gold'){const g=x.createLinearGradient(120,80,240,200);g.addColorStop(0,'#F8D56B');g.addColorStop(.5,'#C9962B');g.addColorStop(1,'#F3C94E');x.strokeStyle=g;x.lineWidth=22;x.beginPath();x.ellipse(180,150,62,52,0,0,7);x.stroke();x.fillStyle='#E23D5A';x.beginPath();x.moveTo(180,70);x.lineTo(198,92);x.lineTo(180,112);x.lineTo(162,92);x.closePath();x.fill()}
    else if(kind==='silver'){const g=x.createLinearGradient(130,40,230,240);g.addColorStop(0,'#F4F6F8');g.addColorStop(.5,'#9AA3AD');g.addColorStop(1,'#DDE2E7');x.fillStyle=g;x.beginPath();x.ellipse(180,225,70,14,0,0,7);x.fill();x.fillRect(172,110,16,115);x.beginPath();x.ellipse(180,105,58,16,0,0,7);x.fill();x.fillStyle='#F2A33A';x.beginPath();x.ellipse(180,70,8,18,0,0,7);x.fill()}
    else{x.fillStyle='#4A42C8';x.fillRect(110,105,140,110);x.fillStyle='#6A63F0';x.fillRect(100,85,160,30);x.fillStyle='#F2B654';x.fillRect(172,85,16,130);x.beginPath();x.ellipse(160,78,22,12,-.5,0,7);x.ellipse(200,78,22,12,.5,0,7);x.fill()}
    x.fillStyle='#8A8578';x.font='13px sans-serif';x.fillText('Sample photo',14,256);return c.toDataURL('image/jpeg',.75)}catch(e){return null}
}
function seed(){
  const S={seq:120,users:[
    {id:'u1',name:'Event Admin',email:'admin@moipoint.in',mobile:'9840012345',username:'admin',pw:hash('admin123'),role:'admin',status:'active'},
    {id:'u2',name:'Raj',email:'',mobile:'9876500011',username:'raj',pw:hash('raj123'),role:'collector',status:'active'},
    {id:'u3',name:'Divya',email:'divya@example.com',mobile:'9876500022',username:'divya',pw:hash('divya123'),role:'manager',status:'active'},
    {id:'u4',name:'Suresh K',email:'',mobile:'9876500033',username:'sureshk',pw:hash('suresh123'),role:'collector',status:'active'}],
  events:[
    {id:'e1',token:'kv7xq2mt9h',name:'Kavi Birthday Function',type:'Birthday',date:'2026-08-02',start:'18:00',end:'22:00',venue:'Sri Murugan Mahal',address:'GST Road, Pallavaram, Chennai 600043',organizer:'Kavitha Ramesh',orgMobile:'9840055501',desc:'First birthday celebration of Kavi with family and friends.',status:'active',created_by:'u1',created_at:'2026-07-10',upi:'kavitharamesh@okaxis',payee:'Kavitha Ramesh',gateway:'none',logo:null,notify:{wa:true,sms:false,email:false}},
    {id:'e2',token:'sv3pw8nb4c',name:'Selvi Valaikappu',type:'Valaikappu',date:'2026-11-15',start:'10:00',end:'14:00',venue:'Annai Thirumana Mandapam',address:'Main Road, Tambaram, Chennai 600045',organizer:'Selvaraj M',orgMobile:'9840055502',desc:'Valaikappu ceremony for Selvi.',status:'active',created_by:'u1',created_at:'2026-10-02',upi:'selvaraj.m@oksbi',payee:'Selvaraj M',gateway:'razorpay',logo:null,notify:{wa:true,sms:true,email:false}},
    {id:'e3',token:'ar9hz2kd7m',name:'Arun Housewarming',type:'Griha Pravesam',date:'2026-12-06',start:'06:00',end:'11:00',venue:'New residence',address:'Ram Nagar, Medavakkam, Chennai 600100',organizer:'Arun Prakash',orgMobile:'9840055503',desc:'Griha pravesam and lunch.',status:'draft',created_by:'u1',created_at:'2026-10-20',upi:'',payee:'',gateway:'none',logo:null,notify:{wa:false,sms:false,email:false}},
    {id:'e4',token:'mw4kt7rq2p',name:'Meena Wedding Reception',type:'Reception',date:'2026-05-24',start:'18:30',end:'22:30',venue:'Kalyana Mahal',address:'Anna Salai, Guindy, Chennai 600032',organizer:'Murugan P',orgMobile:'9840055504',desc:'Wedding reception of Meena and Karthikeyan.',status:'completed',created_by:'u1',created_at:'2026-04-28',upi:'murugan.p@okicici',payee:'Murugan P',gateway:'none',logo:null,notify:{wa:true,sms:false,email:false}}],
  eventUsers:[{id:'a1',event_id:'e1',user_id:'u2',role:'collector'},{id:'a2',event_id:'e2',user_id:'u3',role:'manager'},{id:'a3',event_id:'e2',user_id:'u4',role:'collector'},{id:'a4',event_id:'e4',user_id:'u2',role:'collector'}],
  moi:[],returns:[],expenses:[],audit:[],notifications:[]};
  const add=(eid,name,mobile,rel,place,des,amount,mode,status,date,time,by,x={})=>{S.seq++;S.moi.push({id:'m'+S.seq,code:`MOI-${date.slice(0,4)}-${String(S.seq).padStart(6,'0')}`,event_id:eid,c:{name,mobile,relationship:rel,place,designation:des,address:'',notes:x.notes||''},amount,mode,status,utr:x.utr||'',ref:x.ref||'',gref:x.gref||'',shot:x.shot||null,date,time,collected_by:by,created_at:Date.parse(date+'T'+time)})};
  const d='2026-08-02';
  add('e1','Raj Kumar','9884012301','Friend','Pallavaram','Software Engineer',5000,'upi','verified',d,'18:12','u2',{utr:'423118765201',shot:makeShot(5000,'kavitharamesh@okaxis','423118765201')});
  add('e1','Suresh','9443012302','Uncle (Mama)','Madurai','Teacher',10001,'cash','received',d,'18:20','u2');
  add('e1','Priya','9790012303','Colleague','Tambaram','HR Manager',2001,'online','verified',d,'18:34','qr',{gref:'pay_Rk82JdQ1x'});
  add('e1','Arun','9944012304','Cousin','Kanchipuram','Business',3001,'cash','received',d,'18:41','u2');
  add('e1','Lakshmi Narayanan','9841012305','Neighbour','Pallavaram','Retired',1001,'cash','received',d,'18:55','u1');
  add('e1','Meenakshi S','9500012306','Aunt (Athai / Chithi)','Tiruchirappalli','Homemaker',5001,'upi','verified',d,'19:06','u2',{utr:'423119044318',shot:makeShot(5001,'kavitharamesh@okaxis','423119044318')});
  add('e1','Karthik V','9677012307','Friend','Velachery','Engineer',2000,'upi','pending',d,'19:18','u2',{utr:'423119876540',shot:makeShot(2000,'kavitharamesh@okaxis','423119876540')});
  add('e1','Bharathi','9381012308','Family friend','Chromepet','Doctor',3000,'online','verified',d,'19:27','qr',{gref:'pay_Rk8Ap2Lmz'});
  add('e1','Gopal R','9486012309','Grandparent','Thanjavur','Farmer',11001,'cash','received',d,'19:40','u2');
  add('e1','Sangeetha','9600012310','Colleague','Guindy','Accountant',1501,'upi','rejected',d,'19:52','u2',{utr:'',notes:'Screenshot shows a different payee'});
  add('e1','Venkatesh','9442012311','Uncle (Periyappa / Chithappa)','Salem','Contractor',7001,'cash','received',d,'20:05','u1');
  add('e1','Nithya','9566012312','Friend','Medavakkam','Teacher',1001,'upi','pending',d,'20:22','qr',{utr:'423120334871',shot:makeShot(1001,'kavitharamesh@okaxis','423120334871')});
  /* gold, silver and gift-item Moi (sample photos are simple drawings) */
  const item=(name,mobile,rel,place,des,time,kind,gift,est)=>{add('e1',name,mobile,rel,place,des,0,'item','received',d,time,'u2');Object.assign(S.moi[S.moi.length-1],{kind,gift:{...gift,photo:makeItemImg(kind)},est})};
  item('Kamala','9884012320','Aunt (Athai / Chithi)','Chennai','Teacher','19:12','gold',{grams:8,purity:'22K (916)',item:'Ring',qty:1},52000);
  item('Latha','9884012322','Neighbour','Pallavaram','Homemaker','19:58','silver',{grams:120,purity:'925 Sterling',item:'Kuthuvilakku',qty:1},11000);
  item('Rajesh','9884012321','Friend','Tambaram','Engineer','20:31','gift',{grams:'',purity:'',item:'Mixie',qty:1},3500);
  add('e2','Ramya','9884022301','Cousin','Tambaram','Nurse',2001,'online','verified','2026-10-18','11:02','qr',{gref:'pay_Sv01Kd92a'});
  add('e2','Ganesh','9443022302','Uncle (Mama)','Villupuram','Bank Officer',5001,'online','verified','2026-10-21','20:15','qr',{gref:'pay_Sv01Lm4Qe'});
  add('e2','Kavya','9790022303','Friend','Perungalathur','Designer',1001,'upi','pending','2026-10-25','09:40','u4',{utr:'429812004417',shot:makeShot(1001,'selvaraj.m@oksbi','429812004417')});
  add('e4','Mohan Raj','9884042301','Relative','Vellore','Government Employee',5001,'cash','received','2026-05-24','19:05','u2');
  add('e4','Saranya','9443042302','Friend','Ashok Nagar','Lecturer',2001,'cash','received','2026-05-24','19:20','u2');
  add('e4','Prakash','9790042303','Colleague','Guindy','Engineer',3001,'upi','verified','2026-05-24','19:44','u2',{utr:'414402881020'});
  add('e4','Devi','9944042304','Neighbour','Saidapet','Homemaker',1001,'cash','received','2026-05-24','20:10','u2');
  const ex=(eid,cat,desc,amount,mode,date,vendor,by)=>S.expenses.push({id:uid('x'),event_id:eid,category:cat,desc,amount,mode,date,vendor,receipt:null,notes:'',created_by:by});
  ex('e1','Hall','Hall rent for evening','9000','Bank Transfer','2026-07-28','Sri Murugan Mahal','u1');
  ex('e1','Catering','Dinner for 180 guests','14000','UPI','2026-08-02','Annapoorna Caterers','u1');
  ex('e1','Decoration','Balloon arch and stage flowers','3500','Cash','2026-08-02','Malar Decorators','u1');
  ex('e1','Photography','Photo and video coverage','5000','UPI','2026-08-03','Click Studio','u1');
  S.expenses.find(x=>x.vendor==='Click Studio').billTotal=8000;S.expenses.find(x=>x.vendor==='Annapoorna Caterers').billTotal=18000;
  ex('e1','Printing','Invitation cards (150)','800','Cash','2026-07-20','Sakthi Printers','u1');
  ex('e1','Gifts','Return gift bags','2400','UPI','2026-07-30','Chennai Gift House','u1');
  ex('e4','Hall','Reception hall','6000','Bank Transfer','2026-05-20','Kalyana Mahal','u1');
  ex('e4','Catering','Dinner buffet','3000','Cash','2026-05-24','Saravana Caterers','u1');
  ex('e2','Printing','Valaikappu invitation cards','1200','UPI','2026-10-05','Sakthi Printers','u3');
  S.moi.find(m=>m.id==='m126').ret={amount:5001,date:'2026-09-20',note:'Meenakshi athai’s 60th birthday',by:'u1',at:Date.parse('2026-09-20T19:00:00')};
  S.moi.find(m=>m.id==='m129').ret={amount:11001,date:'2026-10-05',note:'Gopal thatha’s sathabhishekam',by:'u1',at:Date.parse('2026-10-05T12:00:00')};
  const au=(at,user,role,eid,action,detail)=>S.audit.push({id:uid('l'),at,user,role,eid,action,detail});
  au('2026-07-10T10:12:00','Event Admin','Admin','e1','Event created','Kavi Birthday Function');
  au('2026-07-10T10:20:00','Event Admin','Admin','e1','User created','Raj · Moi Collector');
  au('2026-08-02T18:12:00','Raj','Moi Collector','e1','Moi added','₹5,000 from Raj Kumar · Offline UPI');
  au('2026-08-02T18:30:00','Event Admin','Admin','e1','Payment verified','₹5,000 from Raj Kumar');
  au('2026-08-02T19:40:00','Raj','Moi Collector','e1','Moi added','₹11,001 from Gopal R · Cash');
  au('2026-08-02T20:40:00','Event Admin','Admin','e1','Payment rejected','₹1,501 from Sangeetha · Screenshot shows a different payee');
  au('2026-08-03T11:00:00','Event Admin','Admin','e1','Expense added','₹5,000 · Photography · Click Studio');
  au('2026-09-14T17:05:00','Event Admin','Admin','e1','Return added','₹2,000 to Raj Kumar · UPI');
  au('2026-10-02T09:30:00','Event Admin','Admin','e2','Event created','Selvi Valaikappu');
  S.notifications.push({id:uid('n'),eid:'e1',channel:'WhatsApp',to:'9566012312',text:'₹1,001 Moi received from Nithya for Kavi Birthday Function.',status:'Sent',at:Date.parse('2026-08-02T20:22:00')});
  S.notifications.push({id:uid('n'),eid:'e2',channel:'WhatsApp',to:'9790022303',text:'₹1,001 Moi received from Kavya for Selvi Valaikappu.',status:'Sent',at:Date.parse('2026-10-25T09:40:00')});
  S.notifications.push({id:uid('n'),eid:'e2',channel:'SMS',to:'9790022303',text:'₹1,001 Moi received from Kavya for Selvi Valaikappu.',status:'Sent',at:Date.parse('2026-10-25T09:40:05')});
  S.payouts=[
    {id:'p1',event_id:'e1',amount:5000,to:'Kavitha Ramesh',toRole:'Organizer',toMobile:'9840055501',purpose:'Urgent vendor payment',mode:'cash',date:'2026-08-02',time:'20:30',ref:'',notes:'Balloon decorator asked for balance before leaving',proof:null,ack:true,by:'u2',created_at:Date.parse('2026-08-02T20:30:00')},
    {id:'p2',event_id:'e1',amount:3000,to:'Ramesh K',toRole:'Family member',toMobile:'9840055509',purpose:'Transport',mode:'upi',date:'2026-08-03',time:'09:15',ref:'424105512983',notes:'Van rent for returning guests',proof:null,ack:true,by:'u1',created_at:Date.parse('2026-08-03T09:15:00')}];
  S.audit.push({id:uid('l'),at:'2026-08-02T20:30:00',user:'Raj',role:'Moi Collector',eid:'e1',action:'Payout recorded',detail:'₹5,000 to Kavitha Ramesh · Cash from Moi counter · Urgent vendor payment'});
  S.wallet={credits:38,used:62,usage:{e1:58,e2:4},purchases:[{at:'2026-07-25',qty:100,amount:100,ref:'MP-PAY-100231'}]};
  const ban=makeBanner();if(ban){S.events[0].logo=ban;S.events[0].logoW=1200;S.events[0].logoH=630}
  const rm=(id,title,person,mobile,rel,type,place,date,time,amount,moi,before,via,desc,status)=>S.reminders.push({id,owner:'u1',title,person,mobile,relationship:rel,type,place,date,time,amount,moi,before,at:'09:00',via,desc,status:status||'upcoming',sent:status==='done',created:Date.parse('2026-10-01')});
  S.reminders=[];
  rm('rm1','Raj Kumar’s son’s wedding','Raj Kumar','9884012301','Friend','Wedding','Pallavaram','2026-11-08','10:00',5000,'m121','1',{wa:true,sms:false},'Give back at least what he gave at Kavi’s birthday.');
  rm('rm2','Suresh mama’s housewarming','Suresh','9443012302','Uncle (Mama)','Griha Pravesam','Madurai','2026-11-01','07:00',10001,'m122','7',{wa:false,sms:false},'Book bus tickets to Madurai.');
  rm('rm3','Priya’s sister’s valaikappu','Priya','9790012303','Colleague','Valaikappu','Tambaram','2026-12-14','11:00',2001,'m123','2',{wa:false,sms:true},'');
  rm('rm4','Meenakshi athai’s 60th birthday','Meenakshi S','9500012306','Aunt (Athai / Chithi)','Birthday','Tiruchirappalli','2026-09-20','18:00',5001,'m126','1',{wa:true,sms:false},'','done');
  return S;
}
let S;try{S=JSON.parse(localStorage.getItem(K)||'null')}catch(e){S=null}
if(!S||!S.events)S=window.MP_SERVER?mpShell():seed();
/* ---------- SaaS layer: accounts (one per family or business) + platform settings set by the Master Admin ---------- */
const PLAN_KEYS=['free'];
const FEATS=[['voice','Voice announcement after each Moi'],['book','Moi Book export'],['online','Online payment gateway'],['upi2','Second UPI account'],['logo','Event photo on receipts'],['brand','Remove Moi Point branding on receipts'],['support','Priority phone support']];
const PLANS0={
 free:{name:'Free',price:0,yearly:0,charge:false,events:0,entries:0,helpers:0,credits:0,feat:{voice:true,book:true,online:true,upi2:true,logo:true,brand:false,support:true}},
 basic:{name:'Basic',price:0,yearly:0,charge:false,events:5,entries:1000,helpers:3,credits:50,feat:{voice:true,book:true,online:true,upi2:true,logo:true,brand:false,support:false}},
 silver:{name:'Silver',price:0,yearly:0,charge:false,events:15,entries:3000,helpers:8,credits:200,feat:{voice:true,book:true,online:true,upi2:true,logo:true,brand:false,support:true}},
 gold:{name:'Gold',price:0,yearly:0,charge:false,events:0,entries:0,helpers:0,credits:500,feat:{voice:true,book:true,online:true,upi2:true,logo:true,brand:true,support:true}}};
const CITIES=['Chennai','Madurai','Coimbatore','Tiruchirappalli','Salem','Tirunelveli','Vellore','Thanjavur','Puducherry','Bengaluru','Hyderabad','Kochi','Mumbai','Other'];
const STATE_OF={Chennai:'Tamil Nadu',Madurai:'Tamil Nadu',Coimbatore:'Tamil Nadu',Tiruchirappalli:'Tamil Nadu',Salem:'Tamil Nadu',Tirunelveli:'Tamil Nadu',Vellore:'Tamil Nadu',Thanjavur:'Tamil Nadu',Puducherry:'Puducherry',Bengaluru:'Karnataka',Hyderabad:'Telangana',Kochi:'Kerala',Mumbai:'Maharashtra'};
const SOURCES=['Saw it as a guest','WhatsApp share','Instagram','Mandapam partner','Google search','Friend referral','Receipt footer'];
const clone=o=>JSON.parse(JSON.stringify(o));
function platformDefaults(){return {plans:clone(PLANS0),pricing:{perMsg:2,gst:18,incl:true,low:50,packs:[100,500,1000,2500],popular:500,trial:20,validDays:365},stock:50000,freeDays:365,defaultPlan:'free',
  consent:{on:true,text:'Send me Moi Point offers on WhatsApp. I can stop them any time by replying STOP.'},
  announcements:[{id:'an1',title:'Muhurtham season',text:'Top up message credits before your function so every guest gets a WhatsApp receipt. Code MUHURTHAM20 gives 20% off till 30 Nov.',aud:'all',tone:'info',on:true,at:'2026-10-20'}],
  coupons:[{code:'WELCOME50',type:'bonus',value:50,max:500,used:3,until:'2026-12-31',on:true,note:'50 extra credits on any pack'},{code:'MUHURTHAM20',type:'discount',value:20,max:200,used:12,until:'2026-11-30',on:true,note:'20% off any credit pack'}],
  tickets:[{id:'TK1001',acc:'A1001',user:'u1',subject:'Can I print the Moi Book in Telugu for my sister?',cat:'How to',status:'answered',at:Date.parse('2026-10-22T11:05:00'),msgs:[{from:'customer',name:'Event Admin',text:'My sister lives in Hyderabad. Can the Moi Book print in Telugu?',at:Date.parse('2026-10-22T11:05:00')},{from:'support',name:'Moi Point Support',text:'Yes. Open the event, tap Moi Book and choose తెలుగు under Language. Names are written in Telugu letters too.',at:Date.parse('2026-10-22T12:40:00')}]}],
  campaigns:[],over:{},crm:{},adminLog:[],subs:[]}}
const evNo=n=>`EV${String(n).padStart(3,'0')}`;
/* every Moi gets the event number plus its own running number: EV002/001, /002 … */
const moiNo=(ev,n)=>`${ev.no||ev.id}/${String(n).padStart(3,'0')}`;
function initState(){
  if(!S.accounts){const w=S.wallet||{credits:0,used:0,usage:{},purchases:[]};
    S.accounts=[{id:'A1001',name:'Ramesh Family',kind:'Family',owner:'u1',city:'Chennai',state:'Tamil Nadu',signup:'2026-07-05',source:'Friend referral',plan:'free',status:'active',lang:'ta',wallet:w,grants:{}}];
    S.users.forEach(u=>{if(!u.acc&&u.role!=='platform')u.acc='A1001'});S.events.forEach(e=>{if(!e.acc)e.acc='A1001'})}
  if(Object.prototype.hasOwnProperty.call(S,'wallet')&&Object.getOwnPropertyDescriptor(S,'wallet').value!==undefined)delete S.wallet;
  const d=platformDefaults();S.platform=S.platform||{};for(const k in d)if(S.platform[k]==null)S.platform[k]=d[k];
  PLAN_KEYS.forEach(k=>{const p=S.platform.plans[k]=S.platform.plans[k]||clone(PLANS0[k]);p.feat={...PLANS0[k].feat,...(p.feat||{})}});
  if(!window.MP_SERVER)[['p1','Muneeswaran','master','master123','owner','9840012345'],['p2','Finance desk','finance','finance123','finance','9840022311'],['p3','Karthik (Support)','support','support123','support','9840033190'],['p4','Divya (Marketing)','marketing','marketing123','marketing','9840044207']].forEach(([id,name,un,pw,pr,mob])=>{
    if(!S.users.some(u=>u.id===id))S.users.push({id,name,email:'',mobile:mob,username:un,pw:hash(pw),role:'platform',prole:pr,status:'active'})});
  if(S.evSeq==null){S.evSeq=0;S.events.slice().sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))).forEach(e=>{if(!e.no){S.evSeq++;e.no=evNo(S.evSeq,e.created_at)}})}
  if(!S.evNo3){const old=new Map();S.events.forEach(e=>{const m=String(e.no||'').match(/^EV-\d{4}-(\d+)$/i);if(m){const nn=evNo(+m[1]);old.set(e.id,[e.no,nn]);e.oldNo=e.no;e.no=nn}});
    S.moi.forEach(m=>{const o=old.get(m.event_id);if(o&&String(m.code).startsWith(o[0]+'/'))m.code=o[1]+m.code.slice(o[0].length)});
    const nums=S.events.map(e=>+(String(e.no||'').match(/^EV(\d+)$/)||[0,0])[1]);S.evSeq=Math.max(S.evSeq||0,...nums,0);S.evNo3=1}
  if(!S.moiNo2){S.events.forEach(ev=>{if(!ev.no){S.evSeq=(S.evSeq||0)+1;ev.no=evNo(S.evSeq,ev.created_at)}let n=0;S.moi.filter(m=>m.event_id===ev.id).sort((a,b)=>(a.created_at||0)-(b.created_at||0)).forEach(m=>{n++;m.code=moiNo(ev,n)});ev.moiSeq=n});S.moiNo2=1}
  if(P().pricing.validDays==null)P().pricing.validDays=365;if(P().stock==null)P().stock=50000;if(P().freeDays==null)P().freeDays=365;
  S.accounts.forEach(a=>{a.wallet=a.wallet||{credits:0,used:0,usage:{},purchases:[]};a.wallet.purchases=a.wallet.purchases||[];a.grants=a.grants||{};a.onboard=a.onboard||{};
    if(!a.sub){const per=a.plan==='free'?'free':'year';a.sub={plan:a.plan,start:a.signup,end:addDays(a.signup,per==='free'?+P().freeDays||365:365),period:per,amount:0}}walletSync(a.wallet)});
  if(!P().v22){const f=P().plans.free;Object.assign(f,{name:'Free',events:0,entries:0,helpers:0,credits:0,price:0,yearly:0,charge:false});Object.keys(f.feat).forEach(k=>f.feat[k]=k!=='brand');
    Object.assign(P().pricing,{perMsg:2,gst:18,incl:true});P().defaultPlan='free';
    S.accounts.forEach(a=>{if(a.plan!=='free'||!a.sub||a.sub.plan!=='free'){a.plan='free';a.sub={plan:'free',start:a.signup,end:addDays(a.signup,+P().freeDays||365),period:'free',amount:0}}});P().v22=1}
  if(!P().v24){P().plans.free.name='Free';P().v24=1}
  if(!P().v23){P().plans.free.feat.brand=false;P().priceLog=P().priceLog||[];P().v23=1}
  Object.defineProperty(S,'wallet',{get:()=>curAcc().wallet,configurable:true,enumerable:false});
}
const P=()=>S.platform;
const accById=id=>S.accounts.find(a=>a.id===id);
const accOfEv=e=>e&&accById(e.acc);
let pubEv=null;
function curAcc(){const id=(curEv&&curEv.acc)||(me&&me.acc)||(pubEv&&pubEv.acc);return accById(id)||S.accounts[0]}
const myAcc=()=>me&&accById(me.acc);
const accEvents=()=>S.events.filter(e=>me&&e.acc===me.acc);
const accUsers=()=>S.users.filter(u=>me&&u.acc===me.acc&&u.status!=='deleted');
function walletFor(eid,owner){const e=eid&&S.events.find(x=>x.id===eid);if(e)return accOfEv(e).wallet;const u=S.users.find(x=>x.id===owner);return (u&&accById(u.acc)||curAcc()).wallet}
/* plan of an account and its rules */
const planOf=a=>P().plans[(a&&a.plan)||'free']||P().plans.free;
const planOfEv=ev=>planOf(accOfEv(ev)||curAcc());
const feat=(k,ev)=>!!planOf(ev?accOfEv(ev):curAcc()).feat[k];
const monthKey=(d)=>(d||today()).slice(0,7);
function grantMonthly(a){if(!a)return;const p=planOf(a),k=monthKey();if(!p.credits||a.grants[k])return;a.grants[k]=p.credits;addCredits(a,p.credits,0,`${p.name} plan · monthly credits`,'PLAN-'+k);
  S.notifications.push({id:uid('n'),owner:a.owner,channel:'In app',to:'You',text:`${p.name} plan: ${p.credits} free message credits added for this month.`,status:'Sent',at:Date.now()})}
/* upgrade prompt shared by every limit */
function limitHit(title,text){openModal(`${mh(title)}<div class="md-b"><div class="note warn">${ic('alert',20)}<div><b>${esc(planOf(curAcc()).name)} plan limit</b><p>${text}</p></div></div></div><div class="md-f"><button type="button" class="btn btn-ghost" data-act="close">Not now</button><button type="button" class="btn btn-primary" data-go="#plan">See plans</button></div>`)}
const lim=n=>+n>0?+n:Infinity;
function eventsThisMonth(acc){const k=monthKey();return S.events.filter(e=>e.acc===acc.id&&String(e.created_at||'').slice(0,7)===k).length}
const helpersOf=eid=>S.eventUsers.filter(a=>a.event_id===eid).length;
const entriesOf=eid=>S.moi.filter(m=>m.event_id===eid&&m.status!=='void').length;
/* ---------- plan periods: Free is free for a set time (1 year), paid plans run month by month or year by year ---------- */
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())};
const daysLeft=d=>Math.round((new Date(d+'T12:00:00')-new Date(today()+'T12:00:00'))/864e5);
function startPlan(A,plan,amount,by,period,from){const p=P().plans[plan]||P().plans.free,prev=A.sub,start=from||today();
  const per=period||(plan==='free'?'free':'year'),days=per==='free'?(+P().freeDays||365):per==='month'?30:365;
  A.plan=plan;A.sub={plan,start,end:addDays(start,days),period:per,amount:amount||0};
  const kind=!prev?'Started':prev.plan===plan?'Renewed':PLAN_KEYS.indexOf(plan)>PLAN_KEYS.indexOf(prev.plan)?'Upgraded':'Downgraded';
  P().subs.push({id:uid('s'),acc:A.id,from:prev?prev.plan:plan,to:plan,amount:amount||0,at:Date.now(),by:by||(me?me.name:''),start,end:A.sub.end,period:per,kind})}
/* after the free year: if Moi Point has set a yearly price, the account must pay; if not, it simply continues free */
const planCharges=()=>{const p=P().plans.free;return !!(p&&p.charge&&+p.yearly>0)};
const subState=A=>{const s=A&&A.sub;if(!s)return 'active';const d=daysLeft(s.end);if(d<0)return planCharges()?'expired':'active';return d<=15&&planCharges()?'expiring':'active'};
const isExpired=A=>subState(A)==='expired';
/* a scheduled gateway fee change takes effect on its date */
function gwApply(){const g=P().gwPlan;if(g&&g.from<=today()){P().gwFee=g.fee;P().gwGst=g.gst;(P().gwLog=P().gwLog||[]).push({fee:g.fee,gst:g.gst,from:g.from,by:g.by});P().gwPlan=null;return true}return false}
function setFreeDays(n){P().freeDays=n;S.accounts.forEach(A=>{if(A.sub&&A.sub.period==='free')A.sub.end=addDays(A.sub.start,n)})}
/* ---------- message credits come in batches that expire after the validity Moi Point sets ---------- */
function walletSync(w){if(!w)return w;w.batches=w.batches||[];
  w.batches.forEach(b=>{if(b.paid===undefined)b.paid=!/Welcome|Free credits|by Moi Point|plan ·|test/i.test(b.kind||'')});
  if(!w._mig){if(w.credits>0&&!w.batches.length)w.batches.push({id:uid('b'),qty:w.credits,left:w.credits,at:today(),exp:addDays(today(),+P().pricing.validDays||365),kind:'Earlier balance'});w._mig=1}
  walletRenew(w);const t=today();w.batches.forEach(b=>{if(b.left>0&&b.exp<t){w.expired=(w.expired||0)+b.left;b.expiredN=b.left;b.left=0}});
  w.credits=w.batches.reduce((s,b)=>s+b.left,0);return w}
function addCredits(A,qty,amount,kind,ref,code){const w=walletSync(A.wallet);if(qty>0){w.batches.push({id:uid('b'),qty,left:qty,at:today(),exp:addDays(today(),+P().pricing.validDays||365),kind,paid:amount>0});}
  else{let r=-qty;w.batches.slice().sort((a,b)=>a.exp.localeCompare(b.exp)).forEach(b=>{const k=Math.min(b.left,r);b.left-=k;r-=k})}
  w.purchases.push({at:today(),qty,amount:amount||0,ref:ref||'',kind:kind||'',code:code||null,exp:qty>0?addDays(today(),+P().pricing.validDays||365):null});walletSync(w)}
function spendCredit(w){walletSync(w);const b=w.batches.filter(x=>x.left>0).sort((a,c)=>a.exp.localeCompare(c.exp))[0];if(!b)return false;b.left--;w.credits--;w.used=(w.used||0)+1;if(b.paid)w.usedPaid=(w.usedPaid||0)+1;else w.usedFree=(w.usedFree||0)+1;w.lastUse=today();const p=P();if(p.provBal!=null)p.provBal=Math.max(0,p.provBal-1);walletRenew(w);return true}
const nextExpiry=w=>{const b=(w.batches||[]).filter(x=>x.left>0).sort((a,c)=>a.exp.localeCompare(c.exp))[0];return b?{date:b.exp,n:b.left}:null};
/* ---------- helper access windows: function day only, two days, custom dates or always ---------- */
const ACCESS=[['always','All days (no limit)'],['day','Function day only'],['day2','Function day + next day'],['around','Day before to day after'],['custom','Choose dates']];
function accessWin(a){const ac=a.access||{mode:'always'},ev=S.events.find(e=>e.id===a.event_id);if(!ev||ac.mode==='always')return null;
  const d=ev.date;return ac.mode==='day'?[d,d]:ac.mode==='day2'?[d,addDays(d,1)]:ac.mode==='around'?[addDays(d,-1),addDays(d,1)]:[ac.from||d,ac.to||ac.from||d]}
const inAccess=a=>{const w=accessWin(a),t=today();return !w||(t>=w[0]&&t<=w[1])};
const accessTxt=a=>{const w=accessWin(a);if(!w)return 'All days';return w[0]===w[1]?dfmt(w[0])+' only':dfmt(w[0])+' – '+dfmt(w[1])};
function accessOk(u){const as=S.eventUsers.filter(a=>a.user_id===u.id);return !as.length||as.some(inAccess)}
function accessFields(px,ac){ac=ac||{mode:'always'};return `${sel('Access',px+'_acc',ACCESS,ac.mode)}<div class="acc-custom fields" id="${px}_accc" ${ac.mode==='custom'?'':'hidden'}>${fld('From',px+'_from','date',false,ac.from||'')}${fld('To',px+'_to','date',false,ac.to||'')}</div>`}
function readAccess(f,px){const q=id=>f.querySelector('#'+px+id);const m=q('_acc')?q('_acc').value:'always';if(m!=='custom')return {mode:m};const from=q('_from').value,to=q('_to').value||from;if(!from)return {err:[px+'_from','Pick the first day of access']};if(to<from)return {err:[px+'_to','The last day is before the first day']};return {mode:'custom',from,to}}

/* live sync: another tab (for example the Master Admin) saved new data */
let syncDefer=null;
window./* cross-tab sync: see syncFromStore() */

initState();
S.reminders=S.reminders||[];S.queue=S.queue||[];S.payouts=S.payouts||[];S.guests=S.guests||[];S.ggroups=S.ggroups||[];S.msgLog=S.msgLog||[];if(!S.v31msg){S.v31msg=1;const e=S.events.find(x=>x.id==='e1');if(e&&!S.msgLog.some(x=>x.acc===e.acc)){const seen=new Set(),ps=S.moi.filter(m=>m.event_id==='e1'&&m.c.mobile&&!seen.has(m.c.mobile)&&seen.add(m.c.mobile)).map(m=>({k:m.c.mobile,nm:m.c.name,mob:m.c.mobile}));const now=Date.now();
  S.msgLog.push({id:'mlDemo2',acc:e.acc,ev:'e1',kind:'thanks',text:'வணக்கம் {name}! எங்கள் {event} விழாவுக்கு வந்து வாழ்த்தியதற்கும் உங்கள் அன்புக்கும் மனமார்ந்த நன்றி. — {org}'.replace('{event}',e.name).replace('{org}',e.organizer||'Ramesh'),img:0,video:'',vlink:'',link:'',n:ps.length,recips:ps.map(p=>({...p,ch:'wa',st:'sent'})),lg:'ta',ch:'WhatsApp',at:now-26*3600e3,by:'Event Admin'});
  S.msgLog.push({id:'mlDemo1',acc:e.acc,ev:'e1',kind:'invite',text:'வணக்கம் {name}! எங்கள் {event} விழாவுக்கு உங்களை அன்புடன் அழைக்கிறோம். உங்கள் வருகையை எதிர்பார்க்கிறோம். — {org}'.replace('{event}',e.name).replace('{org}',e.organizer||'Ramesh'),img:0,video:'',vlink:'',link:'https://maps.app.goo.gl/sri-murugan-mahal',n:ps.length,recips:ps.flatMap((p,i)=>[{...p,ch:'wa',st:i===3?'credit':'sent'},...(i<3?[{...p,ch:'sms',st:'sent'}]:[])]),lg:'ta',ch:'WhatsApp + SMS',at:now-9*86400e3,by:'Event Admin'})}}

/* ---------- offline-first: connectivity, device code, sync queue ---------- */
let simOffline=false,syncing=false;try{simOffline=sessionStorage.getItem('moipoint-simoff')==='1'}catch(e){}
const online=()=>navigator.onLine!==false&&!simOffline;
let DEV='';try{DEV=localStorage.getItem('moipoint-device')||''}catch(e){}
if(!DEV){DEV='D'+tok().slice(0,2).toUpperCase().replace(/[^A-Z0-9]/g,'7');try{localStorage.setItem('moipoint-device',DEV)}catch(e){}}
const WAITING='Waiting for internet';
function pendingMsgs(){return S.notifications.filter(n=>n.status===WAITING)}
function flushMsgs(){let sent=0,failed=0;
  pendingMsgs().forEach(n=>{const w=walletFor(n.eid,n.owner);w.usage=w.usage||{};if(spendCredit(w)){const k=n.eid||'rem';w.usage[k]=(w.usage[k]||0)+1;n.status='Sent';sent++}else{n.status='Not sent · no credits';failed++}
    n.at=Date.now();if(n.mid){const m=S.moi.find(x=>x.id===n.mid);const r=m&&m.notified&&m.notified.find(r=>r.channel===n.channel&&r.status==='Queued');if(r)r.status=n.status}});
  return {sent,failed}}
function syncNow(){if(!online())return toast('No internet. Your entries are safe on this phone.','bad');
  const q=S.queue.length,f=flushMsgs();S.queue=[];S.moi.forEach(m=>{delete m.pending});syncing=false;save();
  toast(q||f.sent||f.failed?`Synced ${q} change${q===1?'':'s'}${f.sent?` · ${f.sent} message${f.sent>1?'s':''} sent`:''}${f.failed?` · ${f.failed} not sent (no credits)`:''}`:'Everything is already synced');render();
  if($('#syncPanel'))syncPanel()}
function autoSync(){if(!online()){render();return}if(!S.queue.length&&!pendingMsgs().length){render();return}syncing=true;render();setTimeout(syncNow,1400)}
window.addEventListener('online',()=>{if(simOffline)return;toast('Back online. Syncing…');autoSync()});
window.addEventListener('offline',()=>{toast('You are offline. Keep recording, Moi is saved on this phone.','bad');render()});
let pendSync=0;
function syncFromStore(){try{myTs=localStorage.getItem(K+'-ts')||myTs;const n=JSON.parse(localStorage.getItem(K)||'null');if(!n||!n.events)return;S=n;try{initState()}catch(_){}if(me){const u=S.users.find(x=>x.id===me.id);if(u)me=u;try{ctxApply()}catch(_){}}}catch(_){}}
addEventListener('storage',e=>{if(e.key!==K+'-ts'||!e.newValue||e.newValue===myTs)return;const busy=document.querySelector('#modal .md')||(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&document.activeElement.closest('form'));syncFromStore();if(busy){pendSync=1;return}render()});
addEventListener('focus',()=>{if(pendSync&&!document.querySelector('#modal .md')){pendSync=0;render()}});
let myTs='';try{myTs=localStorage.getItem(K+'-ts')||''}catch(_){}
function save(){try{localStorage.setItem(K,JSON.stringify(S));myTs=String(Date.now())+Math.random().toString(36).slice(2,6);localStorage.setItem(K+'-ts',myTs)}catch(e){toast('Storage is full on this device. New screenshots are kept for this session only.','bad')}}

/* ---------- session & permissions ---------- */
let me=null;
try{const id=localStorage.getItem(SK)||sessionStorage.getItem(SK);if(id)me=S.users.find(u=>u.id===id&&u.status==='active')||null}catch(e){}
const TABS=[['overview','Overview','home'],['receive','Receive Moi','plus'],['list','Moi List','list'],['guests','Guests','users'],['expenses','Expenses','bill'],['payouts','Payouts','wallet'],['payments','Payment Collection','card'],['users','Event Users','users'],['qr','QR Code','qr'],['reports','Reports','chart'],['settings','Settings','sliders']];
const ALLOWED={admin:'*',manager:['overview','receive','list','guests','expenses','payouts','payments','users','qr','reports','settings'],collector:['overview','receive','list','payouts','qr']};
function roleIn(eid){if(!me||me.role==='platform')return null;if(me.role==='admin'){const e=S.events.find(x=>x.id===eid);return e&&e.acc===me.acc?'admin':null}const a=S.eventUsers.find(x=>x.event_id===eid&&x.user_id===me.id);return a&&inAccess(a)?a.role:null}
const can=(eid,tab)=>{const r=roleIn(eid);if(!r)return false;const a=ALLOWED[r];if(r!=='admin'&&typeof permOf==='function'){const p=permOf(eid);if((tab==='list'&&!p.list)||(tab==='expenses'&&!p.exp)||(tab==='payouts'&&!p.pay)||(tab==='reports'&&!p.rep)||(tab==='payments'&&!p.verify))return false;if(tab==='reports'&&p.rep)return true}return a==='*'||a.includes(tab)};
const manages=eid=>['admin','manager'].includes(roleIn(eid));
const myEvents=()=>S.events.filter(e=>roleIn(e.id)).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
const uname=id=>id==='qr'?'Event QR page':(S.users.find(u=>u.id===id)||{name:'Unknown'}).name;

/* online Moi: amount given, gateway fee and what reaches the family */
function feeOf(m){if(!m||m.mode!=='online')return {fee:0,by:'family',net:+m.amount||0,paid:+m.amount||0};const ev=S.events.find(e=>e.id===m.event_id);const g=m.fee!=null?{fee:+m.fee,guest:m.feeBy==='guest'}:gwCalc(ev,+m.amount);
  const by=g.guest||m.feeBy==='guest'?'guest':'family',fee=+g.fee||0,amt=+m.amount||0;return {fee,by,net:by==='guest'?amt:Math.round((amt-fee)*100)/100,paid:by==='guest'?Math.round((amt+fee)*100)/100:amt}}
const feeLine=m=>{if(m.mode!=='online'||!OK(m))return '';const f=feeOf(m);return f.by==='guest'?`<small class="fee-l">Guest paid ${fmt2(f.paid)} incl. ${fmt2(f.fee)} fee</small>`:`<small class="fee-l">Fee ${fmt2(f.fee)} · you get ${fmt2(f.net)}</small>`};
function calc(eid){
  const m=S.moi.filter(x=>x.event_id===eid),ok=m.filter(OK),sum=a=>a.reduce((s,x)=>s+(+x.amount||0),0);
  const ex=S.expenses.filter(x=>x.event_id===eid),rt=m.filter(x=>x.ret);
  const pend=m.filter(x=>x.status==='pending'||x.status==='tocollect');
  /* returns are our own money given at their functions: shown for reference, never deducted */
  const t={total:sum(ok),cash:sum(ok.filter(x=>x.mode==='cash')),upi:sum(ok.filter(x=>x.mode==='upi')),online:sum(ok.filter(x=>x.mode==='online')),returns:rt.reduce((s,x)=>s+retAmt(x),0),returnedN:rt.length,expenses:sum(ex),pendingN:pend.length,pendingAmt:sum(pend),contributors:new Set(ok.map(x=>(x.c.mobile||x.c.name).toLowerCase())).size,entries:m.length,okN:ok.length};
  const po=(S.payouts||[]).filter(x=>x.event_id===eid);t.payouts=sum(po);t.payoutN=po.length;
  /* cash physically left at the Moi counter */
  t.cashAtCounter=t.cash-sum(po.filter(x=>x.mode==='cash'))-sum(ex.filter(x=>x.mode==='Cash'));
  {const on=ok.filter(x=>x.mode==='online').map(feeOf);t.gwFees=Math.round(on.filter(f=>f.by==='family').reduce((a,f)=>a+f.fee,0)*100)/100;t.gwFeesAll=Math.round(on.reduce((a,f)=>a+f.fee,0)*100)/100;t.onlineNet=Math.round(on.reduce((a,f)=>a+f.net,0)*100)/100;t.onlineN=on.length}
  t.net=t.total-t.expenses-t.payouts-t.gwFees;
  const it=ok.filter(isItem),gsum=k=>it.filter(x=>x.kind===k).reduce((s2,x)=>s2+(+(x.gift||{}).grams||0),0);
  t.itemN=it.length;t.goldG=gsum('gold');t.silverG=gsum('silver');t.giftN=it.filter(x=>x.kind==='gift').length;t.otherN=it.filter(x=>x.kind==='other').length;t.itemEst=it.reduce((s2,x)=>s2+(+x.est||0),0);
  t.billTotal=ex.reduce((s,x)=>s+Math.max(+x.billTotal||0,+x.amount||0),0);t.vendorDue=t.billTotal-t.expenses;t.netAfterDue=t.net-t.vendorDue;return t;
}
function log(eid,action,detail){const ev=eid&&S.events.find(e=>e.id===eid);S.audit.push({id:uid('l'),acc:ev?ev.acc:(me&&me.acc)||null,uid:me?me.id:null,at:new Date().toISOString(),user:me?me.name:'Guest (QR page)',role:me?ROLE[roleIn(eid)||me.role]||'':'Guest',eid,action,detail});
  if(!online()&&!/^Logged|^Receipt printed/.test(action))S.queue.push({id:uid('q'),eid,label:action+' · '+detail,by:me?me.name:'Guest',at:Date.now()})}
function notify(ev,m,kind){
  const text=msgText(ev,m,kind);
  const ch=ev.notify||{},res=[];[['wa','WhatsApp'],['sms','SMS']].forEach(([k,n])=>{if(ch[k]&&m.c.mobile){res.push({channel:n,status:sendMsg(n,m.c.mobile,text,ev.id)});S.notifications[S.notifications.length-1].mid=m.id}});
  m.notified=res;
}
/* every WhatsApp / SMS costs 1 credit (₹1); in-app is free */
function sendMsg(channel,to,text,eid,owner){
  const w=walletFor(eid,owner);let status;
  if(!to)status='No mobile';
  else if(!online()){S.notifications.push({id:uid('n'),eid:eid||null,owner:owner||null,channel,to,text,status:WAITING,at:Date.now()});return 'Queued'}
  else if(spendCredit(w)){w.usage=w.usage||{};const k=eid||'rem';w.usage[k]=(w.usage[k]||0)+1;status='Sent'}
  else status='Not sent · no credits';
  S.notifications.push({id:uid('n'),eid:eid||null,owner:owner||null,channel,to:to||'—',text,status,at:Date.now()});
  if(to)credNote(eid,owner);
  return status;
}
const myNotifs=()=>S.notifications.filter(n=>n.eid?roleIn(n.eid):n.owner===me.id);
