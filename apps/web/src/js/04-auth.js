/* ---------- login ---------- */

/* ---------- sign up and log in with a one-time code (OTP) on the mobile, email as backup ---------- */
const STATES=['Tamil Nadu','Puducherry','Karnataka','Kerala','Andhra Pradesh','Telangana','Maharashtra','Delhi','Gujarat','West Bengal','Odisha','Punjab','Rajasthan','Uttar Pradesh','Madhya Pradesh','Bihar','Assam','Goa','Haryana','Jharkhand','Chhattisgarh','Uttarakhand','Himachal Pradesh','Jammu and Kashmir','Other'];
const TN_DIST=['Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri','Dindigul','Erode','Kallakurichi','Kancheepuram','Kanniyakumari','Karur','Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam','Namakkal','Nilgiris','Perambalur','Pudukkottai','Ramanathapuram','Ranipet','Salem','Sivaganga','Tenkasi','Thanjavur','Theni','Thoothukudi','Tiruchirappalli','Tirunelveli','Tirupathur','Tiruppur','Tiruvallur','Tiruvannamalai','Tiruvarur','Vellore','Viluppuram','Virudhunagar'];
/* ---------- V42: sign up once with mobile OTP, then log in with email + password ---------- */
const AUTH={mode:'login',step:'mobile',mobile:'',via:'sms',code:'',sent:0,tab:'pw',sends:0};
const maskMail=e=>{const [a,b]=String(e).split('@');return a.slice(0,2)+'•••@'+b};
const userByMobile=m=>S.users.find(u=>u.mobile===m&&u.status!=='deleted');
const userByEmail=e=>S.users.find(u=>u.email&&u.email.toLowerCase()===String(e).toLowerCase().trim()&&u.status!=='deleted');
/* messages Moi Point pays for itself (sign-up codes, website codes, campaigns, Moi Book PDFs) */
function platMsg(kind,n=1,ref=''){const p=P();(p.platLog=p.platLog||[]).push({at:Date.now(),kind,n,ref});if(p.provBal!=null)p.provBal=Math.max(0,p.provBal-n);if(p.platLog.length>3000)p.platLog.splice(0,p.platLog.length-3000)}
function setPw(u,pw){u.pw=hash(pw);u.pwHint=pw.slice(0,2)+'\u0001'+pw.slice(-2);u.pwLen=pw.length;u.pwAt=Date.now()}
const pwHintTxt=u=>{if(!u||!u.pwHint)return '';const [a,b]=u.pwHint.split('\u0001');return a+'*'.repeat(Math.max(3,(u.pwLen||8)-4))+b};
const pwOk=p=>p.length>=8&&/[A-Za-z]/.test(p)&&/\d/.test(p);
function sendOtp(via){if(AUTH.sends>=5){toast('Too many codes. Please try again after some time.','bad');return}AUTH.via=via;AUTH.code=String(Math.floor(100000+Math.random()*900000));AUTH.sent=Date.now();AUTH.step='otp';AUTH.sends++;
  platMsg('signup-otp',1,'+91'+AUTH.mobile);save();toast('Code sent by SMS');render()}
const FN_ART=[['wedding','Wedding'],['ear','Ear piercing'],['house','Housewarming'],['cake','Birthday'],['bangles','Valaikappu'],['baby','Naming ceremony'],['sixty','Manivizha'],['temple','Temple festival']];
const MPW=()=>`Moi Poin<span class="rt">t<sup class="reg" aria-label="registered">®</sup></span>`;
function authArt(h,p){const C=SH('couple');return `<aside class="auth-art"><button class="brand" data-go="#home">${logo()}<span class="bw"><span class="bw-n">${MPW()}</span><small class="tagl">Grow Together</small></span></button>
  <div class="art-copy"><h2>${h}</h2><p>${p}</p></div>
  <div class="art-fns"><p class="art-k">One app for every function</p><div class="art-grid">${FN_ART.map(([i,l])=>`<span>${wic(i,22)}<b>${l}</b></span>`).join('')}</div></div>
  ${C?`<img class="art-couple" src="${C}" alt="">`:''}</aside>`}
const eyeBtn=id=>`<button type="button" class="pw-eye" data-act="pwEye" data-for="${id}" aria-label="Show password">${ic('eye',18)}</button>`;
const pwFld=(label,id,ac,ph='')=>`<label class="field full" for="${id}"><span>${label} <i>*</i></span><div class="pw-wrap"><input id="${id}" type="password" autocomplete="${ac}" ${ph?`placeholder="${ph}"`:''}>${eyeBtn(id)}</div></label>`;
function authTop(kind){return kind==='login'?`<div class="auth-switch"><span>New to Moi Point?</span><button type="button" class="btn btn-ghost btn-sm" data-go="#signup">Create account</button></div>`
  :`<div class="auth-switch"><span>Already have an account?</span><button type="button" class="btn btn-ghost btn-sm" data-go="#login">Log in</button></div>`}
function vLogin(){AUTH.mode='login';
  return `<div class="auth auth2">${authArt('Every Moi, accounted for.','Log in with your email and password to open your functions, receive Moi at the counter and close the accounts the same night.')}
  <div class="auth-form"><div class="auth-top">${authTop('login')}${langChip()}</div><div class="auth-card">
    <div class="auth-head"><span class="auth-ic">${ic('lock',24)}</span><div><p class="eyebrow">Welcome back</p><h1>Log in</h1></div></div><hr class="auth-hr">
    <form class="stack" style="gap:14px" data-form="login" novalidate>
      ${fld('Email','l_user','email',true,AUTH.email||'','autocomplete="email" inputmode="email" autocapitalize="none" placeholder="Enter your email"','full')}
      ${pwFld('Password','l_pw','current-password')}
      <div class="row-between"><label class="check"><input type="checkbox" id="l_rem" checked> Remember me</label><button type="button" class="link" data-go="#forgot">Forgot password?</button></div>
      <button class="btn btn-primary btn-block" style="min-height:52px">Log in ${ic('arrow',18)}</button></form>
    <hr class="auth-hr"><p class="small muted center">Helpers log in with the email and password their event owner gave them.</p>
    <div><p class="small muted" style="margin-bottom:8px">Demo accounts: tap to fill</p>
    <div class="demo"><button type="button" data-act="demo" data-u="ramesh.kumar@gmail.com" data-p="admin123"><b>Ramesh Kumar</b><small>Owner · all events</small></button><button type="button" data-act="demo" data-u="divya.sankar@gmail.com" data-p="divya123"><b>Divya</b><small>Event Admin</small></button><button type="button" data-act="demo" data-u="raj.moi@gmail.com" data-p="raj123"><b>Raj</b><small>Moi Collector</small></button><button type="button" data-act="demo" data-u="master@moipoint.in" data-p="master123"><b>Master Admin</b><small>Runs Moi Point</small></button></div></div>
  </div><button type="button" class="link" data-go="#home" style="align-self:center">← Back to website</button></div></div>`}
function otpBox(){const left=Math.max(0,Math.ceil((AUTH.sent+30000-Date.now())/1000));
  return `<form class="stack" style="gap:16px" data-form="otpVerify" novalidate>
    <div class="otp-head"><span class="otp-ring">${ic('shield',30)}</span><h2>Verify your mobile</h2><p class="muted">Enter the 6-digit code sent by SMS to <b>+91 ${esc(AUTH.mobile.slice(0,5)+' '+AUTH.mobile.slice(5))}</b></p></div>
    <hr class="auth-hr">
    <div class="note info" style="padding:10px 12px">${ic('msg',18)}<div><b>Demo code: ${AUTH.code}</b><p>In the live app this arrives by SMS.</p></div></div>
    <label class="field" for="otp_code"><span>One-time code <i>*</i></span><input id="otp_code" class="otp-in otp-big" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></label>
    <button class="btn btn-primary btn-block" style="min-height:52px">Verify and continue ${ic('arrow',18)}</button>
    <hr class="auth-hr"><div class="row-between small" style="flex-wrap:wrap;gap:8px"><button type="button" class="link" data-act="otpBack">${ic('back',14)} Change number</button><button type="button" class="link" data-act="otpResend" ${left?'disabled':''} id="otpRe">${left?`Resend in ${left}s`:'Resend code'}</button></div>
  </form>`}
function vSignup(){AUTH.mode='signup';const tr=+P().pricing.trial||0,ef=EVFREE();
  const steps=[['mobile','Mobile'],['otp','Verify'],['profile','Your details']],si=steps.findIndex(s=>s[0]===AUTH.step);
  return `<div class="auth auth2">${authArt('Start free in two minutes.',`Verify your mobile once, set your email and password, and add your first function. Every new function gets ${ef} free message credits.`)}
  <div class="auth-form"><div class="auth-top">${authTop('signup')}${langChip()}</div><div class="auth-card ${AUTH.step==='otp'?'otp-card':''}">
    ${AUTH.step==='otp'?'':`<div class="auth-head"><span class="auth-ic">${ic('user',24)}</span><div><p class="eyebrow">New account</p><h1>Create your account</h1></div></div>`}
    <ol class="wz-steps su-steps">${steps.map(([k,l],i)=>`<li class="${i<si?'done':i===si?'on':''}"><span>${i<si?ic('check',14):i+1}</span>${l}</li>`).join('')}</ol><hr class="auth-hr">
    ${AUTH.step==='otp'?otpBox():AUTH.step==='profile'?`<form class="stack" style="gap:14px" data-form="signup" novalidate>
      <p class="small muted">All fields marked <i class="req">*</i> are needed. Mobile <b>+91 ${esc(AUTH.mobile.slice(0,5)+' '+AUTH.mobile.slice(5))}</b> is verified.</p>
      <div class="ph-pick"><label class="avatar big ph-av" id="prev-su_photo" for="su_photo">${imgBuf.su_photo?`<img src="${imgBuf.su_photo}" alt="Profile photo">`:ic('user',26)}</label><div><b>Profile photo</b><p class="small muted">Optional. Shown on your account.</p><label class="btn btn-ghost btn-sm" for="su_photo">${imgBuf.su_photo?'Change photo':'Add photo'}</label><input type="file" id="su_photo" accept="image/*" data-img="su_photo" hidden></div></div>
      <div class="fields">
        ${fld('Your name','su_name','text',true,'','autocomplete="name"','full')}
        ${fld('Email','su_email','email',true,'','autocomplete="email" placeholder="you@example.com"','full')}
        <p class="small muted full" style="margin-top:-6px">You will log in with this email from next time.</p>
        ${pwFld('Password','su_pw','new-password','8+ letters with a number')}
        ${pwFld('Confirm password','su_pw2','new-password')}
        <div class="pw-meter full" id="pwMeter"><i></i><span>Use 8 or more characters with letters and numbers</span></div>
        ${sel('State','su_state',STATES,'Tamil Nadu')}
        <label class="field" for="su_dist"><span>District <i>*</i></span>${AUTH.state==='Tamil Nadu'||!AUTH.state?`<select id="su_dist">${TN_DIST.map(d=>`<option ${d==='Chennai'?'selected':''}>${d}</option>`).join('')}</select>`:`<input id="su_dist" type="text" placeholder="District">`}</label>
        ${fld('City / town','su_city','text',true,'','placeholder="e.g. Pallavaram"','full')}
        ${sel('What will you use it for?','su_kind',[['Family','Our family function'],['Event business','My event business (mandapam, planner, caterer)']],'Family','full')}
        ${fld('Business name (if any)','su_biz','text',false,'','placeholder="Leave empty for a family account"','full')}
        ${sel('How did you hear about Moi Point?','su_src',SOURCES,'Saw it as a guest','full')}
      </div>
      <label class="check"><input type="checkbox" id="su_terms"> I agree to the Moi Point terms and privacy policy <i class="req">*</i></label>
      <button class="btn btn-primary btn-block" style="min-height:52px">Create free account ${ic('arrow',18)}</button></form>`
    :`<form class="stack" style="gap:14px" data-form="otpSend" novalidate>
      <label class="field" for="o_mobile"><span>Mobile number <i>*</i></span>${mobIn('o_mobile',AUTH.mobile,'placeholder="10-digit mobile" required')}</label>
      <p class="small muted">We send a 6-digit code once to confirm the number. After that you log in with your email and password.</p>
      <button class="btn btn-primary btn-block" style="min-height:52px">Send OTP ${ic('arrow',18)}</button>
      <div class="auth-perks">${[['gift',`${ef} free message credits for every new function`],['globe','Receipts in 11 languages'],['cloudoff','Works even without internet']].map(([i,t])=>`<span>${ic(i,16)}${t}</span>`).join('')}</div></form>`}
  </div><button type="button" class="link" data-go="#home" style="align-self:center">← Back to website</button></div></div>`}
const fp={u:null,step:'mobile',mob:'',code:'',at:0,next:0,sends:0,tries:0};
const fpClear=u=>Object.assign(fp,{u:u||null,step:'mobile',mob:'',code:'',at:0,next:0,sends:0,tries:0});
const fpFocus=id=>setTimeout(()=>{const i=document.getElementById(id);if(i)i.focus()},40);
/* forgot password: email, then the registered mobile, then a code by SMS. Moi Point pays for this SMS */
function fpOtpSend(){if(fp.sends>=3){toast('Too many codes. Please try again after some time.','bad');return}
  fp.code=String(Math.floor(100000+Math.random()*900000));fp.sends++;fp.tries=0;fp.at=Date.now();fp.next=fp.at+30000;fp.step='otp';platMsg('reset-otp',1,'+91'+fp.mob);save();toast('Code sent by SMS');render();fpFocus('fp_code')}
function fpOtpBox(){const left=Math.max(0,Math.ceil((fp.next-Date.now())/1000));
  return `<form class="stack" style="gap:14px" data-form="fpOtp" novalidate>
    <div class="note good">${ic('check',20)}<div><b>Verification code sent to your mobile number</b><p><span data-noi18n>+91 ${esc(maskMob(fp.mob))}</span> · <span>It works for 10 minutes.</span></p></div></div>
    <div class="note info" style="padding:10px 12px">${ic('msg',18)}<div><b>Demo code: ${fp.code}</b><p>In the live app this arrives by SMS.</p></div></div>
    <label class="field" for="fp_code"><span>Verification code <i>*</i></span><input id="fp_code" class="otp-in otp-big" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></label>
    <button class="btn btn-primary btn-block" style="min-height:52px">Verify and continue ${ic('arrow',18)}</button>
    <div class="row-between small" style="flex-wrap:wrap;gap:8px"><button type="button" class="link" data-act="fpMobBack">${ic('back',14)} Change number</button><button type="button" class="link" data-act="fpResend" ${left?'disabled':''} id="fpRe">${left?`Resend in ${left}s`:'Resend code'}</button></div></form>`}
function vForgot(){SITE();const u=fp.u,cfg=P().authCfg||{};
  return `<div class="auth auth2">${authArt('Forgot your password?','Confirm your registered mobile with a one-time code, then set a new password right here.')}
  <div class="auth-form"><div class="auth-top">${authTop('login')}${langChip()}</div><div class="auth-card">
    <div class="auth-head"><span class="auth-ic">${ic('lock',24)}</span><div><p class="eyebrow">Password help</p><h1>Reset password</h1></div></div><hr class="auth-hr">
    <form class="stack" style="gap:14px" data-form="fpFind" novalidate>${fld('Your email','fp_email','email',true,u?u.email:'','autocomplete="email" placeholder="you@example.com"','full')}
      ${u?'':`<button class="btn btn-primary btn-block" style="min-height:52px">Continue ${ic('arrow',18)}</button>`}</form>
    ${u?`${cfg.hint!==false&&pwHintTxt(u)?`<div class="pw-hint"><span>${ic('lock',18)}</span><div><small>Your password looks like</small><b data-noi18n>${esc(pwHintTxt(u))}</b><p class="small muted">Remember it now? Go back and log in.</p></div></div>`:''}
      ${fp.step==='otp'?fpOtpBox():`<form class="stack" style="gap:14px" data-form="fpMob" novalidate><label class="field" for="fp_mob"><span>Registered mobile number <i>*</i></span>${mobIn('fp_mob',fp.mob,'placeholder="10-digit mobile" required')}</label>
        <p class="small muted">Enter the mobile number you registered with this app. We send a verification code to it.</p>
        <button class="btn btn-primary btn-block" style="min-height:52px">${ic('shield',18)}Reset password</button></form>`}
      <div class="row-between small"><button type="button" class="link" data-act="fpOther">Use another email</button><button type="button" class="link" data-act="fpLogin">Back to log in</button></div>`:''}
  </div></div></div>`}
function vReset(tok){const r=(P().resets||{})[tok],u=r&&S.users.find(x=>x.id===r.uid),ok=r&&u&&Date.now()<r.exp;
  return `<div class="auth auth2">${authArt('Set a new password.','Choose a password you will remember. Use 8 or more characters with letters and numbers.')}
  <div class="auth-form"><div class="auth-top">${authTop('login')}${langChip()}</div><div class="auth-card">
    <div class="auth-head"><span class="auth-ic">${ic('lock',24)}</span><div><p class="eyebrow">${ok?esc(maskMail(u.email)):'Password help'}</p><h1>${ok?'Confirm your new password':'New password'}</h1></div></div><hr class="auth-hr">
    ${ok?`<form class="stack" style="gap:14px" data-form="resetPw" data-tok="${esc(tok)}" novalidate>${pwFld('Enter your new password','rp_pw','new-password','8+ letters with a number')}${pwFld('Re-enter your new password','rp_pw2','new-password')}<div class="pw-meter full" id="pwMeter"><i></i><span>Use 8 or more characters with letters and numbers</span></div>
      <button class="btn btn-primary btn-block" style="min-height:52px">Save and log in</button></form>`
    :`<div class="note bad">${ic('alert',20)}<div><b>This page has expired</b><p>Start again and confirm your mobile with a new code.</p></div></div><button class="btn btn-primary btn-block" data-go="#forgot">Start again</button>`}
  </div></div></div>`}
/* every required field is checked together; each missing one gets its own message */
function needAll(f,list){f.querySelectorAll('.ferr').forEach(x=>x.remove());f.querySelectorAll('.invalid').forEach(x=>x.classList.remove('invalid'));let first=null,n=0;
  list.forEach(([id,ok,msg])=>{if(ok)return;n++;const el=f.querySelector('#'+id);if(!el)return;el.classList.add('invalid');const host=el.closest('.field')||el.closest('label')||el.parentElement;const s=document.createElement('small');s.className='ferr';s.textContent=msg;host.appendChild(s);
    el.addEventListener('input',()=>{el.classList.remove('invalid');const e=host.querySelector('.ferr');if(e)e.remove()},{once:true});if(!first)first=el});
  if(first){first.focus();if(first.scrollIntoView)first.scrollIntoView({block:'center',behavior:'smooth'});toast(n===1?'Please fill the marked field':`Please fill the ${n} marked fields`,'bad');return false}return true}
function pwMeterUpd(v){const m=document.getElementById('pwMeter');if(!m)return;const s=(v.length>=8)+(/[A-Za-z]/.test(v)&&/\d/.test(v))+(/[^A-Za-z0-9]/.test(v)||v.length>=12);m.className='pw-meter full s'+(v?s:0);m.querySelector('span').textContent=!v?'Use 8 or more characters with letters and numbers':s>=3?'Strong password':s===2?'Good password':'Too weak: use 8+ characters with letters and numbers'}
