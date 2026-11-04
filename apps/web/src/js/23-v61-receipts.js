/* ================= V61: 10 truly different receipt designs (default "Ticket · Premium" unchanged) ================= */
function rzD(m,lg){const ev=S.events.find(e=>e.id===m.event_id);lg=lg||evLang(ev);const H=k=>trH(lg,k),T=k=>trT(lg,k),TN=s=>s&&IBASE[lg]?locPhrase(String(s),lg,false):(s||'');const item=isItem(m),st=STATUS[m.status]||['',''];
  const rel=m.c.relationship?relT(m.c.relationship,lg):'',place=m.c.place?plc(m.c.place,lg):'',des=m.c.designation?locDes(m.c.designation,lg):'';
  const rows=[['mobile',esc(m.c.mobile||'')]];
  if(item)rows.push(['weight',m.gift&&m.gift.grams?esc(m.gift.grams)+' g':''],['purity',m.gift&&m.gift.purity&&m.gift.purity!=='Other'?esc(m.gift.purity):''],['item',esc((m.gift&&m.gift.item)||'')],['qty',m.gift&&(+m.gift.qty||1)>1?esc(m.gift.qty):'']);
  else rows.push(['payment',esc(modeT(lg,m.mode))],['utr',m.utr?esc(m.utr):''],['gref',m.gref?esc(m.gref):''],['ref',esc(m.ref||'')]);
  rows.push(['received',`${dfmt(m.date)}, ${tfmt(m.time)}`],['by',esc(TN(byWho(m)))],['organizer',ev.organizer?esc(TN(ev.organizer)):'']);
  return {m,ev,lg,H,T,item,lang:lg==='en'?'en':lg.slice(0,2),evn:esc(TN(ev.name)),type:esc(TN(ev.type)),date:dfmt(ev.date),time:`${tfmt(ev.start)} – ${tfmt(ev.end)}`,venue:esc(TN(ev.venue)),addr:ev.address?esc(TN(ev.address)):'',
    photo:ev.logo&&feat('logo',ev)?ev.logo:'',cut:!!ev.logoT,mono:esc(monoOf(TN(ev.name))),amt:item?esc(itemTxt(m,lg)):fmt(m.amount),words:!item&&lg==='en'&&+m.amount>0?`Rupees ${inWords(m.amount)} only`:'',est:item&&m.est?fmt(m.est):'',
    st:esc(statT(lg,m.status)),stc:st[1],mode:esc(modeT(lg,m.mode)),modeIc:MODEI[m.mode]||'cash',name:esc(nm(m,lg)),rel:esc(rel),place:esc(place),des:esc(des),sub:[rel,place,des].filter(Boolean).map(esc).join(' · '),
    rows:rows.filter(r=>r[1]),code:esc(m.code),scan:esc(T('scan')),thanks:tr(lg,'thanks').map(esc).join('<br>'),brand:!feat('brand',ev),
    qr:n=>`<div class="qr-box" data-qr="https://moipoint.in/r/${m.code}" data-size="${n}"></div>`}}
const rzBrand=(d,cls)=>d.brand?`<a class="rz-brand ${cls||''}" href="https://moipoint.in" target="_blank" rel="noopener" aria-label="Moi Point, free Moi and event app"><span class="rz-bm">${mpMark()}</span><span><b>${MPW()}</b> · Grow Together</span><em>moipoint.in</em></a>`:'';
const rzTag=d=>`<span class="pill ${d.stc}">${d.st}</span><span class="rz-mode">${ic(d.modeIc,13)}${d.mode}</span>`;
const rzWords=d=>`${d.words?`<p class="rz-words">${d.words}</p>`:''}${d.est?`<p class="rz-words">${d.H('est')} · ${d.est}</p>`:''}`;
const rzArt=(d,k,body)=>`<article class="rz rz-${k}" lang="${d.lang}" data-rz="${k}">${body}</article>`;
const RZ={
/* 1 Royal: maroon + gold frame, monogram, no photo */
royal:d=>rzArt(d,'royal',`<div class="ry-fr"><div class="ry-in">
  <div class="ry-top"><span class="ry-mono">${d.mono}</span></div>
  <p class="ry-kind"><i></i>${d.H('title')}<i></i></p>
  <h2 class="ry-ev">${d.evn}</h2><p class="ry-type">${d.type}</p><p class="ry-when">${d.date} · ${d.time}<br>${d.venue}</p>
  <div class="ry-orn" aria-hidden="true">❖</div>
  <p class="ry-lbl">${d.H('from')}</p><b class="ry-name">${d.name}</b>${d.sub?`<p class="ry-sub">${d.sub}</p>`:''}
  <div class="ry-amt"><span class="ry-lbl">${d.item?d.H('kind'):d.H('amount')}</span><strong class="${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}<div class="rz-tags">${rzTag(d)}</div></div>
  <table class="ry-tbl">${d.rows.map(([k,v])=>`<tr><th>${d.H(k)}</th><td>${v}</td></tr>`).join('')}</table>
  <div class="ry-foot"><div class="ry-qr">${d.qr(104)}</div><div class="ry-seal"><span>✓</span><small>${d.code}</small></div></div>
  <p class="ry-scan">${d.H('no')} <b>${d.code}</b> · ${d.scan}</p><p class="ry-thx">${d.thanks}</p></div></div>${rzBrand(d)}`),
/* 2 Golden: gold-foil certificate, art-deco corners, no photo */
golden:d=>rzArt(d,'golden',`<div class="gd-in"><span class="gd-c tl"></span><span class="gd-c tr"></span><span class="gd-c bl"></span><span class="gd-c br"></span>
  <p class="gd-brand">${mpMark()}<b>${MPW()}</b></p>
  <h2 class="gd-kind">${d.H('title')}</h2><div class="gd-rule"><i></i><span>◆</span><i></i></div>
  <p class="gd-lbl">${d.H('from')}</p><b class="gd-name">${d.name}</b>${d.sub?`<p class="gd-sub">${d.sub}</p>`:''}
  <div class="gd-amt"><strong class="${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}</div>
  <p class="gd-for">${d.evn}<small>${d.type} · ${d.date} · ${d.venue}</small></p>
  <div class="rz-tags">${rzTag(d)}</div>
  <div class="gd-grid">${d.rows.map(([k,v])=>`<div><span>${d.H(k)}</span><b>${v}</b></div>`).join('')}</div>
  <div class="gd-foot"><div class="gd-qr">${d.qr(104)}</div><div class="gd-no"><span>${d.H('no')}</span><b>${d.code}</b><small>${d.scan}</small></div></div>
  <p class="gd-thx">${d.thanks}</p></div>${rzBrand(d)}`),
/* 3 Kolam: temple tower, photo in an arch window, kolam dots */
temple:d=>rzArt(d,'temple',`<div class="tp-gopuram" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="tp-body"><p class="tp-kind">${d.H('title')}</p>
  ${d.photo?`<figure class="tp-arch ${d.cut?'cut':''}"><img src="${d.photo}" alt=""></figure>`:`<div class="tp-arch tp-mono"><span>${d.mono}</span></div>`}
  <h2 class="tp-ev">${d.evn}</h2><p class="tp-meta">${d.type} · ${d.date}<br>${d.time} · ${d.venue}</p>
  <div class="tp-kolam" aria-hidden="true"></div>
  <p class="tp-lbl">${d.H('from')}</p><b class="tp-name">${d.name}</b>${d.sub?`<p class="tp-sub">${d.sub}</p>`:''}
  <div class="tp-lamp"><span class="tp-lbl">${d.item?d.H('kind'):d.H('amount')}</span><strong class="${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}</div>
  <div class="rz-tags">${rzTag(d)}</div>
  <div class="tp-list">${d.rows.map(([k,v])=>`<p><span>${d.H(k)}</span><b>${v}</b></p>`).join('')}</div>
  <div class="tp-kolam" aria-hidden="true"></div>
  <div class="tp-rangoli"><div class="tp-qr">${d.qr(104)}</div></div><p class="tp-no">${d.H('no')} <b>${d.code}</b></p><p class="tp-scan">${d.scan}</p>
  <p class="tp-thx">${d.thanks}</p></div>${rzBrand(d)}`),
/* 4 Heritage bill: receipt-book page with counterfoil, ruled lines, stamp, signature; no photo */
classic:d=>rzArt(d,'classic',`<div class="hb-wrap"><aside class="hb-foil"><b>${d.code}</b><span>${d.date}</span><span class="hb-fa">${d.amt}</span><span>${d.name}</span></aside>
  <div class="hb-main"><div class="hb-head"><div><p class="hb-kind">${d.H('title')}</p><h2 class="hb-ev">${d.evn}</h2><p class="hb-meta">${d.type} · ${d.venue}</p></div><span class="hb-logo">${mpMark()}</span></div>
  <div class="hb-nd"><span>${d.H('no')} <b>${d.code}</b></span><span>${d.date}</span></div>
  <div class="hb-lines"><p><span>${d.H('from')}</span><b>${d.name}</b></p>${d.rel?`<p><span>${d.H('rel')}</span><b>${d.rel}</b></p>`:''}${d.place?`<p><span>${d.H('place')}</span><b>${d.place}</b></p>`:''}${d.des?`<p><span>${d.H('des')}</span><b>${d.des}</b></p>`:''}
   ${d.words?`<p><span>${d.H('amount')}</span><b>${d.words}</b></p>`:''}${d.rows.map(([k,v])=>`<p><span>${d.H(k)}</span><b>${v}</b></p>`).join('')}</div>
  <div class="hb-bot"><div class="hb-box"><small>${d.item?d.H('kind'):d.H('amount')}</small><strong class="${d.item?'item':''}">${d.amt}${d.item?'':'/-'}</strong></div><div class="hb-stamp"><span>${d.st}</span></div><div class="hb-qr">${d.qr(110)}</div></div>
  <div class="hb-sign"><span>${d.thanks}</span><span class="hb-sl">${d.H('by')}<b>${((d.rows.find(r=>r[0]==='by')||['',''])[1]).split(' · ')[0]}</b></span></div></div></div>${rzBrand(d)}`),
/* 5 Elegant: ivory wedding card, round photo medallion, serif italics */
elegant:d=>rzArt(d,'elegant',`<div class="el-in">
  ${d.photo?`<figure class="el-med ${d.cut?'cut':''}"><img src="${d.photo}" alt=""></figure>`:`<div class="el-med el-mono"><span>${d.mono}</span></div>`}
  <p class="el-kind">${d.H('title')}</p><h2 class="el-ev">${d.evn}</h2><p class="el-meta">${d.date} &nbsp;·&nbsp; ${d.time}<br>${d.venue}</p>
  <div class="el-div" aria-hidden="true"><i></i>✿<i></i></div>
  <p class="el-lbl">${d.H('from')}</p><b class="el-name">${d.name}</b>${d.sub?`<p class="el-sub">${d.sub}</p>`:''}
  <strong class="el-amt ${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}<div class="rz-tags">${rzTag(d)}</div>
  <dl class="el-dl">${d.rows.map(([k,v])=>`<div><dt>${d.H(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  <div class="el-qr">${d.qr(104)}</div><p class="el-no">${d.code}</p><p class="el-scan">${d.scan}</p>
  <p class="el-thx">${d.thanks}</p></div>${rzBrand(d)}`),
/* 6 Festive: marigold garland, thoranam, polaroid photo, gift-tag amount */
festive:d=>rzArt(d,'festive',`<div class="fs-garland" aria-hidden="true"></div><div class="fs-leaves" aria-hidden="true"></div>
  <header class="fs-head"><p class="fs-kind">${d.H('title')}</p><h2 class="fs-ev">${d.evn}</h2><p class="fs-meta">${d.type} · ${d.date} · ${d.time}<br>${d.venue}</p>
  ${d.photo?`<figure class="fs-pol ${d.cut?'cut':''}"><img src="${d.photo}" alt=""></figure>`:''}</header>
  <div class="fs-body"><div class="fs-tag"><span class="fs-hole"></span><small>${d.item?d.H('kind'):d.H('amount')}</small><strong class="${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}</div>
  <div class="rz-tags">${rzTag(d)}</div>
  <div class="fs-from"><small>${d.H('from')}</small><b>${d.name}</b>${d.sub?`<span>${d.sub}</span>`:''}</div>
  <div class="fs-chips">${d.rows.map(([k,v])=>`<div><small>${d.H(k)}</small><b>${v}</b></div>`).join('')}</div>
  <div class="fs-qrw"><div class="fs-qr">${d.qr(100)}</div><div><small>${d.H('no')}</small><b>${d.code}</b><span>${d.scan}</span></div></div>
  <p class="fs-thx">${d.thanks}</p></div>${rzBrand(d)}`),
/* 7 Peacock: full-bleed photo header with teal overlay, feather accents */
peacock:d=>rzArt(d,'peacock',`<header class="pk-hero" ${d.photo?`style="--pk-img:url('${d.photo}')"`:''}><div class="pk-shade"></div><span class="pk-eye" aria-hidden="true"></span>
  <div class="pk-ht"><p class="pk-kind">${d.H('title')}</p><h2 class="pk-ev">${d.evn}</h2><p class="pk-meta">${d.type} · ${d.date} · ${d.time}</p><p class="pk-meta">${d.venue}</p></div></header>
  <div class="pk-body"><div class="pk-amt"><div><small>${d.item?d.H('kind'):d.H('amount')}</small><strong class="${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}</div><div class="rz-tags">${rzTag(d)}</div></div>
  <div class="pk-from"><small>${d.H('from')}</small><b>${d.name}</b>${d.sub?`<span>${d.sub}</span>`:''}</div>
  <ul class="pk-list">${d.rows.map(([k,v])=>`<li><span>${d.H(k)}</span><b>${v}</b></li>`).join('')}</ul>
  <div class="pk-stub"><div class="pk-qr">${d.qr(104)}</div><div><small>${d.H('no')}</small><b>${d.code}</b><span>${d.scan}</span><p>${d.thanks}</p></div></div></div>${rzBrand(d)}`),
/* 8 Modern dark card: left aligned, compact, no photo */
compact:d=>rzArt(d,'compact',`<div class="md-c"><div class="mc-top"><span class="mc-b">${mpMark()}<b>${MPW()}</b></span><span class="pill ${d.stc}">${d.st}</span></div>
  <p class="mc-k">${d.H('title')}</p><strong class="mc-amt ${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}
  <p class="mc-name">${d.name}</p>${d.sub?`<p class="mc-sub">${d.sub}</p>`:''}
  <div class="mc-ev"><span>${ic('cal',14)}</span><div><b>${d.evn}</b><small>${d.date} · ${d.time} · ${d.venue}</small></div></div>
  <div class="mc-grid">${d.rows.map(([k,v])=>`<div><small>${d.H(k)}</small><b>${v}</b></div>`).join('')}</div>
  <div class="mc-bot"><div class="mc-qr">${d.qr(100)}</div><div><small>${d.H('no')}</small><b>${d.code}</b><span>${d.scan}</span><p>${d.thanks}</p></div></div></div>${rzBrand(d)}`),
/* 9 Minimal: white Swiss layout, big type, thin rules, no photo */
jasmine:d=>rzArt(d,'jasmine',`<div class="mn-in"><div class="mn-top"><span class="mn-b">${mpMark()}<b>${MPW()}</b></span><span class="mn-no">${d.H('no')}<b>${d.code}</b></span></div>
  <p class="mn-k">${d.H('title')}</p><strong class="mn-amt ${d.item?'item':''}">${d.amt}</strong>${rzWords(d)}<div class="rz-tags">${rzTag(d)}</div>
  <hr><div class="mn-two"><div><small>${d.H('from')}</small><b>${d.name}</b>${d.sub?`<span>${d.sub}</span>`:''}</div><div><small>${d.H('event')}</small><b>${d.evn}</b><span>${d.type} · ${d.date}<br>${d.time}<br>${d.venue}</span></div></div>
  <hr><dl class="mn-dl">${d.rows.map(([k,v])=>`<div><dt>${d.H(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  <hr><div class="mn-bot"><p>${d.thanks}</p><div class="mn-qr">${d.qr(100)}<small>${d.scan}</small></div></div></div>${rzBrand(d)}`)
};
(function(){const D={ticket:['Ticket · Premium','Default. Indigo and gold ticket with photo, QR and every detail'],royal:['Royal','Maroon and gold frame, event monogram, gold seal. No photo'],golden:['Golden','Gold-foil certificate with art-deco corners. No photo'],temple:['Kolam','Temple tower on top, photo in a temple arch, kolam dots'],classic:['Heritage bill','Old receipt-book page with counterfoil, ruled lines and stamp'],elegant:['Elegant','Ivory wedding card with a round photo and serif letters'],festive:['Festive','Marigold garland, mango-leaf thoranam, photo as a polaroid'],peacock:['Peacock','Big event photo on top with teal and gold'],compact:['Modern dark','Dark phone card, big amount, left-aligned. No photo'],jasmine:['Minimal','Clean white page, large numbers, thin lines. No photo'],slip:['Counter slip','Narrow black-and-white slip for a thermal printer']};
  if(!RFORMATS.some(r=>r[0]==='golden')){const i=RFORMATS.findIndex(r=>r[0]==='royal');RFORMATS.splice(i+1,0,['golden','',''])}
  const order=['ticket','royal','golden','temple','classic','elegant','festive','peacock','compact','jasmine','slip'];RFORMATS.sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
  RFORMATS.forEach(r=>{if(D[r[0]]){r[1]=D[r[0]][0];r[2]=D[r[0]][1]}})})();
{const _rc=rcptHtml;rcptHtml=function(m,lg,fk,notch){const ev=S.events.find(e=>e.id===m.event_id);fk=fk||rfmtOf(ev);if(RZ[fk]){lg=lg||evLang(ev);try{return RZ[fk](rzD(m,lg))}catch(e){console.error(e)}}return _rc(m,lg,fk==='golden'?'ticket':fk,notch)}}
/* printing on A4 follows the chosen design */
let rzPrintFk=null;
{const _pb=printBody;printBody=function(m,lg,size){if(size!=='a4')return _pb(m,lg,size);const ev=S.events.find(e=>e.id===m.event_id),fk=rzPrintFk||rfmtOf(ev);return fk&&RZ[fk]?`<div class="pr-a4">${rcptHtml(m,lg,fk)}</div>`:_pb(m,lg,size)}}
{const _rm=receiptModal;receiptModal=function(id,lg,fk){rzPrintFk=fk||null;return _rm(id,lg,fk)}}
Object.assign(TA,{'Golden':'தங்கம்','Minimal':'மினிமல்','Default. Indigo and gold ticket with photo, QR and every detail':'இயல்புநிலை. புகைப்படம், QR, முழு விவரங்களுடன் இண்டிகோ-தங்க டிக்கெட்','Maroon and gold frame, event monogram, gold seal. No photo':'மெரூன்-தங்கச் சட்டம், நிகழ்வு முதலெழுத்து, தங்க முத்திரை. புகைப்படம் இல்லை','Gold-foil certificate with art-deco corners. No photo':'தங்க ஃபாயில் சான்றிதழ் வடிவம். புகைப்படம் இல்லை','Temple tower on top, photo in a temple arch, kolam dots':'மேலே கோபுரம், கோயில் வளைவில் புகைப்படம், கோலப் புள்ளிகள்','Old receipt-book page with counterfoil, ruled lines and stamp':'அடிச்சீட்டுடன் பழைய ரசீது புத்தகப் பக்கம், கோடுகள், முத்திரை','Ivory wedding card with a round photo and serif letters':'வட்டப் புகைப்படத்துடன் திருமண அழைப்பிதழ் தோற்றம்','Marigold garland, mango-leaf thoranam, photo as a polaroid':'சாமந்தி மாலை, மாவிலைத் தோரணம், போலராய்டு புகைப்படம்','Big event photo on top with teal and gold':'மேலே பெரிய நிகழ்வுப் புகைப்படம், டீல்-தங்க நிறம்','Dark phone card, big amount, left-aligned. No photo':'கைபேசிக்கான அடர் நிற அட்டை, பெரிய தொகை. புகைப்படம் இல்லை','Clean white page, large numbers, thin lines. No photo':'சுத்தமான வெள்ளைப் பக்கம், பெரிய எண்கள். புகைப்படம் இல்லை'});

