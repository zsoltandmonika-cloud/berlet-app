/* HHSP1 · v594 | Records + Medications Premium scroll-select DEFAULT.
 * The normal HealthHub link now shows the approved UI. Explicit
 * ?hhscrollselect=0 or ?hhpremium=0 keeps the previous safe fallback.
 * Existing records, PDF, Léna, privacy, cloud and medicine actions remain authoritative.
 */
(function(root){
 'use strict';
 var params;
 try{params=new URLSearchParams(root.location.search)}catch(_){return}
 if(params.get('hhscrollselect')==='0'||params.get('hhpremium')==='0')return;
 var F={records:'all',medications:'all'},refreshing=false;
 var FILTERS={
  records:[['all','✦ Összes'],['omsz','🚑 OMSZ'],['cardio','🫀 Kardiológia'],['labor','🧪 Labor'],['urgent','🏥 Sürgősségi'],['hospital','📄 Kórházi'],['other','📁 Egyéb']],
  medications:[['all','✦ Összes'],['current','💊 Aktuális'],['past','🕘 Korábbi'],['seasonal','🌿 Szezonális']]
 };
 function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu')}
 function contains(s,re){return re.test(norm(s))}
 function docGroup(d){
  var n=norm(d.title),m=norm(d.meta),all=n+' '+m;
  if(contains(all,/omsz|orszagos mentoszolgalat|mentoszolgalat|mento(?:auto|szolgalat|lap|k)?|esetlap/))return 'omsz';
  if(contains(all,/kardiol|sziv|szivultra|ekg|echokardiogr|crt[- ]?d|pacemaker/))return 'cardio';
  if(contains(all,/labor|vervetel|laboratorium|verke?p/))return 'labor';
  if(contains(all,/surgossegi|mentes|urgent|trauma/))return 'urgent';
  if(contains(all,/korhaz|klinika|zarojelentes|epikrizis|osztalyos/))return 'hospital';
  return 'other';
 }
 function matchDoc(d,key){
  if(key==='all')return true;
  if(key==='urgent')return docGroup(d)==='urgent'||contains(d.meta,/surgossegi ellatas|mentes/);
  return docGroup(d)===key;
 }
 function matchMed(m,key){
  var t=norm(m.status+' '+m.detail);
  if(key==='all')return true;
  if(key==='seasonal')return contains(t,/szezon|allergiaszezon|alkalmi/);
  if(key==='past')return contains(t,/korabbi|elhagyott|megszunt|leallitott|inaktiv|nem szedi/);
  if(key==='current')return contains(m.status,/aktualis|aktiv/);
  return false;
 }
 function txt(el,selector){var n=el.querySelector(selector);return n?n.textContent||'':''}
 function itemData(row,kind){
  return kind==='records'
   ?{title:txt(row,'b'),meta:txt(row,'small')}
   :{status:txt(row,'.hrTag'),detail:txt(row,'small')};
 }
 function currentProfile(){
  try{return root.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}
 }
 function make(tag,cls,text){
  var el=document.createElement(tag);el.className=cls||'';
  if(text!=null)el.textContent=text;return el;
 }
 function hasDocId(row){
  var on=row.getAttribute('onclick')||'';
  var m=on.match(/(?:hhOpenDocumentDetail|openHrDocument)\('([^']+)'\)/);
  return m?m[1]:null;
 }
 function hasMedicationId(row){
  if(row.dataset&&row.dataset.hhPrivateMed==='1')return row.dataset.hhMedId||null;
  var on=row.getAttribute('onclick')||'';
  var m=on.match(/openHrDetail\('medication','([^']+)'\)/);
  return m?m[1]:null;
 }
 function button(label,fn){
  var b=make('button','hhRsmAction',label);b.type='button';
  b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();fn()});
  return b;
 }
 function decorateRow(row,kind){
  row.classList.add('hhRsmCard');
  var foot=make('div','hhRsmActions');
  if(kind==='records'){
   var id=hasDocId(row);
   if(id){
    foot.appendChild(button('📄 Open PDF',function(){if(typeof root.openHrDocument==='function')root.openHrDocument(id)}));
    foot.appendChild(button('Részletek',function(){
     if(typeof root.hhOpenDocumentDetail==='function')root.hhOpenDocumentDetail(id);
     else row.click();
    }));
    var lena=row.querySelector('.hhLenaExplainBtn');
    if(lena){foot.appendChild(lena);lena.textContent='✨ Léna magyarázata';}
    else if(typeof root.hhOpenLenaExplanation==='function')
      foot.appendChild(button('✨ Léna magyarázata',function(){root.hhOpenLenaExplanation(id)}));
   }
  }else{
   var mid=hasMedicationId(row);
   if(mid)foot.appendChild(button('Részletek',function(){
    if(row.dataset&&row.dataset.hhPrivateMed==='1'&&root.HH_PRIVATE_MEDICATIONS_V593)
      root.HH_PRIVATE_MEDICATIONS_V593.open(mid);
    else if(typeof root.openHrDetail==='function')root.openHrDetail('medication',mid);
   }));
   var purpose=row.querySelector('.hhMedPurposeBtn');
   if(purpose)foot.appendChild(purpose);
   else if(row.dataset&&row.dataset.hhPrivateMed==='1'&&typeof root.hhMedicationPurpose==='function'){
    var title=row.querySelector('b');
    if(title)foot.appendChild(button('Mire való?',function(){root.hhMedicationPurpose(title.textContent||'')}));
   }
  }
  if(foot.children.length)row.appendChild(foot);
 }
 function apply(kind,bar,rows){
  var selected=F[kind],fn=kind==='records'?matchDoc:matchMed,visible=0;
  // The canonical documents renderer initially limits to the newest ten.
  // A zero count within that subset must NOT disable an OMSZ chip that could
  // match an older document. Clicking expands the original results first.
  var truncated=kind==='records'&&root.hhDocState&&!root.hhDocState.showAll&&
    !!bar.parentNode.querySelector('button[onclick*="hhShowAllDocs"]');
  rows.forEach(function(row){
   var show=fn(itemData(row,kind),selected);row.hidden=!show;if(show)visible++;
  });
  bar.querySelectorAll('.hhRsmChip').forEach(function(b){
   var key=b.dataset.hhKey,count=rows.filter(function(row){return fn(itemData(row,kind),key)}).length;
   b.setAttribute('aria-pressed',String(key===selected));
   b.disabled=key!=='all'&&count===0&&!truncated;
   var name=(FILTERS[kind].find(function(x){return x[0]===key})||[])[1]||key;
   b.textContent=name+(truncated&&key!=='all'?' · keresés':' · '+count);
  });
  var status=bar.querySelector('.hhRsmCount');
  if(status)status.textContent=visible+' találat'+(truncated?' · első 10 megjelenítve':kind==='medications'?' · rögzített státusz':'');
  var empty=bar.parentNode.querySelector('.hhRsmEmpty');
  if(empty)empty.hidden=visible!==0;
 }
 function decorate(kind,container){
  var card=Array.from(container.querySelectorAll('.hrSectionCard')).find(function(x){
   return !!x.querySelector(kind==='records'?'.hrRow[onclick*="Document"],.hrRow[onclick*="openHrDocument"]':'.hrRow[onclick*="medication"],.hrRow[data-hh-private-med]');
  });
  if(!card)return;
  var selector=kind==='records'?'.hrRow[onclick*="hhOpenDocumentDetail"],.hrRow[onclick*="openHrDocument"]':'.hrRow[onclick*="openHrDetail"],.hrRow[data-hh-private-med]';
  var rows=Array.from(card.querySelectorAll(selector)).filter(function(row){
   return row.parentNode===card&&(kind!=='medications'||hasMedicationId(row));
  });
  if(!rows.length)return;
  var tool=make('section','hhRsmToolbar');
  tool.setAttribute('aria-label',kind==='records'?'Leletek gyorsszűrők':'Gyógyszerek gyorsszűrők');
  var heading=make('div','hhRsmHeading');
  heading.appendChild(make('b','',kind==='records'?'Görgethető leletszűrők':'Görgethető gyógyszerszűrők'));
  heading.appendChild(make('span','hhRsmCount',''));
  tool.appendChild(heading);
  var chips=make('div','hhRsmChips');chips.setAttribute('role','group');
  FILTERS[kind].forEach(function(f){
   var b=make('button','hhRsmChip',f[1]);b.type='button';b.dataset.hhKey=f[0];
   b.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();F[kind]=f[0];
    // Existing renderer defaults to 10 records. Expand BEFORE filtering, so
    // an OMSZ hit outside the newest ten is never silently omitted.
    if(kind==='records'&&f[0]!=='all'&&root.hhDocState&&!root.hhDocState.showAll&&
       typeof root.hhShowAllDocs==='function'&&card.querySelector('button[onclick*="hhShowAllDocs"]')){
      root.hhShowAllDocs();return;
    }
    apply(kind,tool,rows);
   });
   chips.appendChild(b);
  });
  tool.appendChild(chips);
  var note=make('small','hhRsmNote',kind==='records'
    ?'OMSZ: a névben vagy leletadatban azonosítható mentőszolgálati iratok. A részletes szűrés továbbra is elérhető.'
    :'A státusz a nyilvántartásból származik, nem igazolja az aktuális gyógyszerszedést.');
  tool.appendChild(note);
  var track=make('div','hhRsmTrack');track.setAttribute('aria-label',kind==='records'?'Leletek':'Gyógyszerek');
  track.setAttribute('role','region');track.tabIndex=0;
  card.insertBefore(tool,rows[0]);card.insertBefore(track,rows[0]);
  rows.forEach(function(row){decorateRow(row,kind);track.appendChild(row)});
  var empty=make('p','hhRsmEmpty','Ehhez a szűrőhöz nincs találat.');
  empty.hidden=true;card.insertBefore(empty,track.nextSibling);
  card.classList.add('hhRsmSection');
  apply(kind,tool,rows);
 }
 var old=root.renderHealthSection;
 if(typeof old!=='function')return;
 root.renderHealthSection=async function(){
  var result=await old.apply(this,arguments);
  var kind=root.healthSectionKind;
  if(kind!=='records'&&kind!=='medications')return result;
  var content=document.getElementById('healthSubContent');
  if(!content)return result;
  try{decorate(kind,content)}catch(e){console.warn('HealthHub scroll-select preview fallback',e)}
  return result;
 };
 root.addEventListener('healthhub:profile-changed',function(){F.records='all';F.medications='all'});
 root.addEventListener('storage',function(e){if(e.key==='hh-profile'){F.records='all';F.medications='all'}});
 var css=document.createElement('link');css.rel='stylesheet';
 css.href='./health-scroll-select-v592.css?v=592-preview-omsz-meds';
 document.head.appendChild(css);
 document.documentElement.dataset.hhScrollSelect='preview';
 root.HH_HEALTH_SCROLL_SELECT_V592=Object.freeze({version:'592-preview',matchDoc:matchDoc,matchMed:matchMed,docGroup:docGroup});
})(window);
