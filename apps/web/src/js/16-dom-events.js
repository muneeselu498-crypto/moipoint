/* ---------- events ---------- */
document.addEventListener('click',e=>{
  if(!e.target.closest('.ac-field'))document.querySelectorAll('.ac-list:not([hidden])').forEach(b=>{b.hidden=true});
  if(e.target.id==='vxSheet'){if(vx.state!=='review')vxClose();return}
  if(e.target.classList&&e.target.classList.contains('mb'))return closeModal();
  const g=e.target.closest('[data-go]');if(g){e.preventDefault();closeModal();go(g.dataset.go.slice(1));return}
  const a=e.target.closest('[data-act]');if(a&&ACT[a.dataset.act]){e.preventDefault();if(voidBlocked('a',a.dataset.act,a))return;ACT[a.dataset.act](a,e)}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&vx.state){vxClose();return}const t=e.target;if(!t.dataset||!t.dataset.ac)return;const box=document.getElementById('ac-'+t.id);if(!box||box.hidden)return;const items=[...box.querySelectorAll('.ac-i,.sug')];if(!items.length)return;let i=items.findIndex(x=>x.classList.contains('hi'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items.forEach(x=>x.classList.remove('hi'));i=e.key==='ArrowDown'?Math.min(items.length-1,i+1):Math.max(0,i-1);items[i].classList.add('hi');items[i].scrollIntoView({block:'nearest'})}
  else if(e.key==='Enter'){e.preventDefault();(items[i>=0?i:0]).click()}else if(e.key==='Escape'){box.hidden=true}});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target;if(FORMS[f.dataset.form]&&!voidBlocked('f',f.dataset.form,f))FORMS[f.dataset.form](f)});
document.addEventListener('change',e=>{const t=e.target;if(t.tagName!=='SELECT'||!t.id)return;const b=document.getElementById(t.id+'_ow');if(!b)return;const on=t.value==='Other';b.hidden=!on;if(on){const i=b.querySelector('input');if(i)setTimeout(()=>i.focus(),20)}});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='su_pw'||t.id==='rp_pw')pwMeterUpd(t.value)});
setInterval(()=>{const b=document.getElementById('otpRe');if(b&&AUTH.sent){const l=Math.max(0,Math.ceil((AUTH.sent+30000-Date.now())/1000));b.disabled=!!l;b.textContent=l?`Resend in ${l}s`:'Resend code'}},1000);
setInterval(()=>{try{if(me&&me.role!=='platform'){const n=S.events.filter(e=>!e.bookSent).length;autoBooks();if(S.events.filter(e=>!e.bookSent).length!==n){save();if(/overview/.test(location.hash))render()}}}catch(e){}},30000);
/* works offline: when this page is hosted on its own site, a service worker keeps the app available without internet */
try{if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!/claude|anthropic|usercontent/.test(location.host))navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(e){}
document.addEventListener('input',e=>{const t=e.target;
  if(t.dataset&&t.dataset.gq!==undefined){gst.q=t.value;const pos=t.selectionStart;render();const n=document.querySelector('[data-gq]');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}}return}
  if(t.id==='inv_text'||t.id==='inv_where'||t.id==='inv_when'){inv[t.id.slice(4)]=t.value;const p=$('#inv_prev'),gs=msgGuests();if(p&&inv._fill)p.textContent=inv._fill(($('#inv_text')||t).value,gs[0]);return}
  if(t.id==='inv_link'||t.id==='inv_vlink'){inv[t.id.slice(4)]=t.value.trim();const b=$('#inv_lnks');if(b)b.innerHTML=cmLinks();return}
  if(t.id==='vxr_mobile'){vxLookupR(true);return}
  if(t.dataset&&t.dataset.lstQ!==undefined){const q=t.value.toLowerCase(),g=document.getElementById('lstGrid');if(g)g.innerHTML=lStateList(LSTATES.filter(([n])=>!q||n.toLowerCase().includes(q)));return}
  if(t.id==='lo_code'){const v=t.value.replace(/\D/g,'').slice(0,6);if(v!==t.value)t.value=v;if(v.length===6&&lo&&!lo.auto){lo.auto=1;setTimeout(()=>{const f=t.form;if(f&&document.body.contains(f))lOtpCheck(f);if(lo)lo.auto=0},150)}return}
  if(t.dataset&&t.dataset.wq!==undefined){wq.q=t.value;const pos=t.selectionStart;render();const n=document.querySelector('[data-wq]');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}}return}
  if(t.id==='qo_code'){const v=t.value.replace(/\D/g,'').slice(0,6);if(v!==t.value)t.value=v;if(v.length===6)qrOtpCheck();return}
  if(/^ga_(name|place|des|addr)$/.test(t.id)&&t.dataset.auto)delete t.dataset.auto;
  if(t.id==='ga_mobile'){const n=normMob(t.value);if(n!==t.value)t.value=n;gaLookup(n);return}
  if(t.dataset&&t.dataset.mob!==undefined&&t.tagName==='INPUT'){const n=normMob(t.value);if(n!==t.value){t.value=n}}
  if(t.dataset&&t.dataset.ac){acShow(t)}
  if(t.name==='n_team'){const b=$('#teamBox');if(b){b.hidden=t.value!=='team';if(t.value==='team'&&!$('#teamRows').children.length)ACT.teamAdd()}return}
  {const mm=t.id&&t.id.match(/^(n_|s_|ps_)(pm|qr)_(cash|upi|online)$/);if(mm){pmSync(mm[1],mm[3],mm[2],t.checked);return}}
  {const mm=t.id&&t.id.match(/^(n_|s_|ps_)(gwwho)$/);if(mm){const px=mm[1],f=t.form;
    const box=document.getElementById(px+'feeEg');if(box)box.innerHTML=feeExample({gwWho:f.querySelector('#'+px+'gwwho').value});return}}
  if(t.dataset.tn!=null){const i=t.dataset.tn,u=document.getElementById('t_user'+i);if(u&&!u.dataset.touched)u.value=t.value.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'').slice(0,20);return}
  if(/^t_user\d+$/.test(t.id)){t.dataset.touched=1}
  if(t.dataset.lq!==undefined){ui.lq[t.dataset.lq]=t.value;const b=$('#moiRows');if(b&&curEv)b.innerHTML=listBody(curEv,manages(curEv.id))}
  else if(t.dataset.rq!==undefined){ui.rq[t.dataset.rq]=t.value;const b=$('#repBody');if(b&&curEv)b.innerHTML=repBody(curEv)}
  else if(t.dataset.dq!==undefined){ui.dq[t.dataset.dq]=t.value;const b=$('#dashRows');if(b)b.innerHTML=dashRows()}
  else if(t.id==='m_amount'||t.id==='p_amount')updSum(t.id[0]);
  else if(['m_grams','m_item','m_qty','m_est','m_purity'].includes(t.id))updSum('m');
  else if(t.id==='m_mobile'||t.id==='p_mobile')lookup(t.id[0],t.value);
  else if(t.id==='m_name'||t.id==='e_name'){const a=t.form&&t.form.querySelector(t.id==='m_name'?'#m_alt':'#e_alt');if(a&&!a.dataset.touched)a.value=translit(t.value,a.dataset.lg)}
  else if(t.id==='m_alt'||t.id==='e_alt'){t.dataset.touched=t.value?'1':''}
  else if(t.dataset.printlang)printModal(t.dataset.printlang,t.value,t.dataset.s);
  else if(t.dataset.bk){book[t.dataset.bk]=t.value;bookRefresh()}
  else if(t.dataset.bksec){book.secs[t.dataset.bksec]=t.checked?1:0;bookRefresh()}
  else if(t.id==='bk_group'){book.group=t.checked;bookRefresh()}
  else if(t.id==='bk_pend'||t.id==='bk_void'){book[t.id==='bk_pend'?'pend':'voids']=t.checked;bookRefresh()}
  else if(t.id==='x_amount'||t.id==='x_total'){const f=t.form,p=+f.querySelector('#x_amount').value||0,tt=+f.querySelector('#x_total').value||0;f.querySelector('#x_due b').textContent=tt>p?fmt(tt-p):'₹0 · settled'}
  else if(t.id==='r_moi'){$('#retInfo').innerHTML=retInfo(t.value)}
  else if(t.id==='rm_moi'){$('#rm_hint').innerHTML=remHint(t.value);const m=S.moi.find(x=>x.id===t.value),f=t.form;
    if(m){[['rm_person',m.c.name],['rm_mobile',m.c.mobile],['rm_place',m.c.place],['rm_amount',m.amount]].forEach(([id,val])=>{const el=f.querySelector('#'+id);if(el&&!el.value)el.value=val});const rel=f.querySelector('#rm_rel');if(rel&&!rel.value)rel.value=m.c.relationship||''}}
});
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.gf){gst[t.dataset.gf]=t.value;render();return}
  if(t.dataset.gsel!==undefined){t.checked?gst.sel.add(t.dataset.gsel):gst.sel.delete(t.dataset.gsel);render();return}
  if(t.dataset.gall!==undefined){const m=location.hash.match(/^#ev-([^-]+)-guests/),evId=m&&m[1];gFiltered(evId).forEach(g=>t.checked?gst.sel.add(g.key):gst.sel.delete(g.key));render();return}
  if(t.id==='inv_ev'||t.id==='inv_wa'||t.id==='inv_sms'||t.id==='inv_grp'){const evCh=t.id==='inv_ev'&&t.value!==inv.ev;msgSave();if(evCh){inv.when='';inv.where='';inv.text=''}inviteModal();return}
  if(t.id==='inv_imgf'&&t.files[0]){msgSave();return readImg(t.files[0],url=>{inv.img=url;inviteModal()})}
  if(t.id==='inv_vidf'&&t.files[0]){msgSave();const fl=t.files[0];if(fl.size>16*1024*1024){toast('Video is over 16 MB. WhatsApp takes up to 16 MB; share a link instead','bad');return}if(inv.video)try{URL.revokeObjectURL(inv.video)}catch(_){}inv.video=URL.createObjectURL(fl);inv.vname=fl.name;inviteModal();return}
  if(t.dataset&&t.dataset.vxlg!==undefined){vx.lg=t.value;try{localStorage.setItem('moipoint-vxlg',vx.lg)}catch(_){}['m','p'].forEach(px=>{const bar=document.getElementById('vx-'+px);if(bar){bar.outerHTML=vxBar(px);const nb=document.getElementById('vx-'+px);if(nb&&UIL!=='en'&&typeof l10n==='function')l10n(nb)}});if(t.id==='vxg_lg'&&vx.state==='on'){vxgSave();vxStopEngine();vxgStep()}return}
  if(t.id==='gpu_grp'){const b=$('#gpu_newbox');if(b)b.hidden=t.value!=='new';return}
  if(t.name&&/vmode$/.test(t.name)){t.closest('.vmode').querySelectorAll('label').forEach(l=>l.classList.toggle('on',l.contains(t)));const h2=t.form&&t.form.querySelector('#'+t.name.replace('vmode','voice'));if(h2)h2.checked=t.value==='on';return}
  if(t.name&&/rformat$/.test(t.name)){t.closest('.rfmt-grid').querySelectorAll('.rfmt').forEach(l=>l.classList.toggle('on',l.contains(t)));return}
  if(t.id&&/vtone$/.test(t.id)){const f=t.form;f.querySelectorAll('.tone').forEach(x=>x.classList.toggle('on',x.dataset.tone===t.value));return}
  if(t.id&&/_acc$/.test(t.id)){const c=document.getElementById(t.id+'c');if(c)c.hidden=t.value!=='custom';return}
  if(t.id==='su_state'){AUTH.state=t.value;const d=$('#su_dist');if(d){const tn=t.value==='Tamil Nadu';d.outerHTML=tn?`<select id="su_dist">${TN_DIST.map(x=>`<option>${x}</option>`).join('')}</select>`:'<input id="su_dist" type="text" placeholder="District">'}return}
  if(t.id==='al_who'||t.id==='al_ev'){ui.al[t.id==='al_who'?'who':'ev']=t.value;ui.al.n=40;return render()}
  if(t.matches('[data-tph],[data-tpm]'))return tpSync(t.closest('.tpick'));
  if((t.id==='m_alt'||t.id==='e_alt')&&/[A-Za-z]/.test(t.value)){t.value=translit(t.value,t.dataset.lg);return}if(t.type==='file'&&t.dataset.img&&t.files[0]){const k=t.dataset.img;
  if(k==='eshot'||k==='eitem')return readImg(t.files[0],url=>{imgBuf[k]=url;const w=$('#phw-'+k);if(w){const lbl=w.parentElement.querySelector('.lbl').textContent;w.parentElement.outerHTML=photoField(k,lbl,url)}toast('Photo updated')});
  if(k==='logo')return readImgFull(t.files[0],o=>{imgBuf.logo=o;const p=$('#prev-logo');if(p)p.innerHTML=logoPreview(o);toast('Image added at full size')});
  readImg(t.files[0],url=>{imgBuf[k]=url;const p=document.getElementById('prev-'+k);if(p)p.innerHTML=`<img src="${url}" alt="Uploaded image preview">`;toast('Image attached')})}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#modal').innerHTML)closeModal()});