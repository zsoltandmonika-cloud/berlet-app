(function(){
'use strict';
/* HealthHub v676: opt-in, read-only MKB evidence lens inside Ask Léna.
 * Does NOT append pending facts or quotes to AI requests. No network except
 * patient-authorized Vault reads; no background scan, telemetry or persistence.
 */
var ID='hhAskMkb676',busy=false,version=0,prepared=null,approved=null;
function el(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function name(p){return p==='monika'?'Mónika':'Zsolt'}
function service(){return window.HH_DAILY_HEALTH_SYNC_V319}
function allowed(p){
 var s=service(),auth=s&&s.getStatus?s.getStatus():null;
 return !!(s&&auth&&auth.authenticated&&Array.isArray(auth.authorizedProfiles)&&
  auth.authorizedProfiles.includes(p)&&profile()===p);
}
function check(p,v){if(version!==v||!allowed(p))throw Error('Profil vagy Vault jogosultság megváltozott.')}
function goodUUID(v){return /^[a-f0-9-]{36}$/i.test(String(v||''))}
async function fetchPages(p,v,table,fields,filter){
 var out=[];
 for(var offset=0;offset<15000;offset+=500){
  check(p,v);
  var uri='/rest/v1/'+table+'?select='+fields+filter+'&limit=500&offset='+offset;
  var part=await service().request(uri,{method:'GET'});
  check(p,v);
  if(!Array.isArray(part))throw Error('Nem ellenőrizhető Vault válasz.');
  out.push(...part);
  if(part.length<500)return out;
 }
 throw Error('Túl sok adat, a részletek betöltése leállt.');
}
async function digest(text){
 var bytes=new TextEncoder().encode(String(text));
 var hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return [...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function reset(){
 version++;prepared=null;approved=null;
 var host=el('hhAskMkbBody676'),btn=el('hhAskMkbBtn676');
 if(host){host.textContent='';host.hidden=true}
 if(btn){btn.disabled=false;btn.textContent='📚 Forrásolt orvosi tudás'}
 var approve=el('hhAskMkbConsentButton699');if(approve)approve.hidden=true;
 busy=false;
}
/* v699: fresh question without deleting the 164/43 private PDF catalog,
   clearing chat history, refreshing authentication or submitting AI data. */
function clearForNewResearch(){
 // A running AI request owns its question; never disturb a live generation.
 var run=el('hhRun299');
 if(run&&run.disabled)return;
 // Invalidate any pending read and the previously selected one-use excerpts.
 version++;prepared=null;approved=null;busy=false;
 var original=el('hhAskMkbBtn676');if(original)original.disabled=false;
 var approve=el('hhAskMkbConsentButton699');if(approve)approve.hidden=true;
 var question=el('hhSQ299');
 if(question){question.value='';question.dispatchEvent(new Event('input',{bubbles:true}))}
 var search=el('hhMkbCatalogSearch699');
 if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
 var section=el('hhAskMkbAnalysis699');
 if(section){
  section.textContent='';
  var instruction=document.createElement('div');instruction.className='note';
  instruction.textContent='✅ Új kutatásra kész. A teljes ellenőrzött PDF-katalógus megmaradt. Írj új kérdést, majd frissítsd a forrásválasztást.';
  section.appendChild(instruction);
 }else{
  var host=el('hhAskMkbBody676');
  if(host&&host.hidden===false){
   host.textContent='✅ Új kutatásra kész. Írj új kérdést, majd koppints a Forrásolt orvosi tudás gombra.';
  }
 }
 if(question&&typeof question.focus==='function')question.focus();
}
function mount(){
 var ask=el('hhLenaSmart299'),actions=ask&&ask.querySelector('.askActions');
 if(!actions||el(ID))return;
 var css=document.createElement('style');css.id='hhAskMkbCss676';
 css.textContent='#'+ID+'{margin:10px 0 6px;border:1px solid rgba(143,185,209,.4);border-radius:14px;background:rgba(16,43,66,.08);padding:9px;color:inherit;font:12px/1.55 system-ui}'+
 '#'+ID+' button{padding:10px 12px;border-radius:11px;background:#194768;color:#fff;font-weight:750;border:1px solid #5593aa;min-height:44px;max-width:100%;cursor:pointer}'+
 '#'+ID+' button:disabled{opacity:.55}#'+ID+' [hidden]{display:none!important}'+
 '#'+ID+' .note{font-size:11px;line-height:1.6;opacity:.85;margin-top:5px}'+
 '#'+ID+' details{margin-top:9px;padding:9px;border:1px solid rgba(127,173,199,.4);border-radius:10px;background:rgba(157,188,212,.08)}'+
 '#'+ID+' summary{cursor:pointer;font-weight:750;min-height:28px}'+
 '#'+ID+' small{display:block;font-size:11px;line-height:1.65;margin:6px 0;overflow-wrap:anywhere}'+
 '#'+ID+' .catalog{max-height:310px;overflow:auto;margin-top:6px;border:1px solid rgba(143,185,209,.3);border-radius:11px;padding:5px}'+
 '#'+ID+' .catalog small{padding:6px 7px;border-bottom:1px solid rgba(143,185,209,.18)}'+
 '#'+ID+' input[type=search]{box-sizing:border-box;width:100%;min-height:44px;border:1px solid rgba(143,185,209,.45);border-radius:9px;padding:10px;background:rgba(16,43,66,.12);color:inherit}';
 document.head.appendChild(css);
 var box=document.createElement('section');box.id=ID;
 var button=document.createElement('button');button.type='button';button.id='hhAskMkbBtn676';
 button.textContent='📚 Forrásolt orvosi tudás';
 var clear=document.createElement('button');clear.type='button';clear.id='hhAskMkbClear699';
 clear.textContent='🔄 Új kutatás';
 clear.title='Az előző kérdés, kiválasztás és egyszeri AI-jóváhagyás törlése, az orvosi leletek megőrzésével.';
 clear.setAttribute('aria-label','Új kutatás: kérdés és ideiglenes forráskijelölés törlése');
 var note=document.createElement('div');note.className='note';
 note.textContent='Privát Health Vault · csak megtekintés · az ellenőrzésre váró tényeket nem küldöm automatikusan az AI-nak.';
 var host=document.createElement('div');host.id='hhAskMkbBody676';host.hidden=true;host.setAttribute('role','status');
 var approve=document.createElement('button');approve.id='hhAskMkbConsentButton699';
 approve.type='button';approve.hidden=true;
 approve.textContent='🔐 Kutatás indítása a kiválasztott forrásokkal';
 approve.title='Egyszeri jóváhagyás a megjelenített idézetek továbbítására az AI-nak, és a kutatás indítása.';
 box.append(button,clear,note,host,approve);actions.insertAdjacentElement('afterend',box);
 button.addEventListener('click',read);
 clear.addEventListener('click',clearForNewResearch);
 approve.addEventListener('click',function(){
  var run=el('hhRun299'),question=String(el('hhSQ299')?.value||'').trim();
  if(busy||!prepared||!allowed(profile())||prepared.profile!==profile()||
     prepared.question!==question||Date.now()-prepared.at>5*60*1000||
     !run||run.disabled)return;
  approved=prepared;run.click();
 });
}
async function read(){
 if(busy)return;
 var p=profile(),v=++version,host=el('hhAskMkbBody676'),btn=el('hhAskMkbBtn676');
 if(!host||!btn)return;
 host.hidden=false;host.textContent='';
 if(!allowed(p)){host.textContent='🔒 Az adott profilhoz érvényes Health Vault-belépés kell.';return}
 var timeline=window.HH_MKB_TIMELINE_V674,auditor=window.HH_MKB_EVIDENCE_AUDIT_V675,ranker=window.HH_MKB_EVIDENCE_I10_V698,fullIndex=window.HH_MKB_FULL_INDEX_V699;
 if(!timeline||!auditor||!ranker||!fullIndex||typeof timeline.groups!=='function'||typeof auditor.audit!=='function'||typeof ranker.rank!=='function'||typeof fullIndex.catalog!=='function'||typeof fullIndex.rankPages!=='function'){
  host.textContent='⚠ Forrásellenőrző modul hiányzik. Frissítsd a HealthHubot.';return;
 }
 prepared=null;approved=null;
 var approve=el('hhAskMkbConsentButton699');
 if(approve)approve.hidden=true;
 busy=true;btn.disabled=true;host.textContent='⏳ '+name(p)+' · bizonyítékok független ellenőrzése…';
 try{
  var filter='&profile_key=eq.'+encodeURIComponent(p);
  // Independent full, authorized PDF catalog, NOT limited to seven curated
  // MKB facts. Metadata only until the user clicks the source lens.
  var [facts,ev,sources,docs]=await Promise.all([
   fetchPages(p,v,'hh_mkb_facts','id,profile_key,source_id,observed_date,label,fact_type,review_status,value_number,original_unit',filter),
   fetchPages(p,v,'hh_mkb_evidence','id,profile_key,fact_id,source_id,page_no,excerpt,evidence_role,review_status',filter),
   fetchPages(p,v,'hh_mkb_sources','id,profile_key,original_name,sha256,parse_status,source_metadata,origin,source_kind,original_observed_at,duplicate_of',filter),
   fetchPages(p,v,'hh_kb_documents','id,profile_key,mkb_source_id,original_name,status,text_integrity_status,total_pages,pages_verified,duplicate_of,sha256',filter),
  ]);
  check(p,v);
  var catalog=fullIndex.catalog(docs,sources,p);
  // Page text is queried solely inside this user-invoked lens, using patient
  // RLS. Each excerpt is independently SHA checked before eligible for AI.
  var pages=[],docIds=catalog.map(d=>d.id);
  for(var j=0;j<docIds.length;j+=15){
   var part=await fetchPages(p,v,'hh_kb_pages','document_id,page_no,page_text,text_sha256',
    '&document_id=in.('+docIds.slice(j,j+15).join(',')+')');
   pages.push(...part);
  }
  var qa=await auditor.audit(facts,ev,sources,docs,pages,digest);
  check(p,v);
  var groups=timeline.groups(facts,ev),names=new Map(sources.map(x=>[x.id,x.original_name]));
  host.textContent='';
  var h=document.createElement('div');h.className='note';
  var verified=ev.filter(x=>qa.get(x.id)?.verified).length;
  h.textContent=name(p)+' · '+catalog.length+' ellenőrzött PDF · '+verified+'/'+ev.length+
   ' külön strukturált forrásidézet. A teljes katalógus megtekinthető, de a technikai integritás nem jelent orvosi jóváhagyást.';
  host.appendChild(h);
  var browser=document.createElement('details');browser.open=true;
  var heading=document.createElement('summary');heading.textContent='📚 Teljes ellenőrzött dokumentumtár · '+catalog.length+' PDF';
  browser.appendChild(heading);
  var search=document.createElement('input');search.type='search';search.id='hhMkbCatalogSearch699';
  search.placeholder='Keresés a '+catalog.length+' lelet címében vagy forrásdátumában…';
  search.setAttribute('aria-label','Egészségügyi dokumentum keresése');
  browser.appendChild(search);
  var listing=document.createElement('div');listing.className='catalog';
  listing.setAttribute('role','list');browser.appendChild(listing);
  function showCatalog(){
   listing.textContent='';
   var found=fullIndex.filterCatalog(catalog,search.value);
   if(!found.length){var empty=document.createElement('small');empty.textContent='Nincs ilyen című indexelt PDF.';listing.appendChild(empty)}
   for(const d of found){
    var line=document.createElement('small');line.setAttribute('role','listitem');
    line.textContent='📄 '+d.title+' · '+d.pageCount+' oldal'+
     (d.date?' · forrásdátum: '+d.date:'')+
     ' · szövegintegritás igazolt (nem klinikai minősítés)';
    listing.appendChild(line);
   }
  }
  search.addEventListener('input',showCatalog);
  showCatalog();host.appendChild(browser);
  if(!groups.length){
   var empty=document.createElement('small');
   empty.textContent='Még nincs rögzített, forrásolt idővonalesemény.';
   host.appendChild(empty);
  }
  for(const g of groups.slice(0,20)){
   check(p,v);
   var verifiedRows=g.evidences.filter(x=>qa.get(x.id)?.verified);
   var details=document.createElement('details');
   var title=document.createElement('summary');
   title.textContent='📅 '+g.date+' · '+g.title+' · '+verifiedRows.length+'/'+g.evidences.length+' forrás';
   details.appendChild(title);
   var warning=document.createElement('small');
   warning.textContent='⏳ Szakmai ellenőrzésre vár. A források egyezése nem igazolja a klinikai értelmezést.';
   details.appendChild(warning);
   for(const fact of g.records){
    var label=document.createElement('small');label.textContent='• '+fact.label+
     (fact.review_status==='verified'?' · szakmailag ellenőrzött':' · ellenőrzésre vár');
    details.appendChild(label);
   }
   for(const evidence of g.evidences){
    var a=qa.get(evidence.id),small=document.createElement('small');
    small.textContent=(a?.verified?'✅':'⚠️')+' '+String(names.get(evidence.source_id)||'Ismeretlen eredeti PDF')+
     ' · '+evidence.page_no+'. oldal'+
     (a?.verified?' · eredeti SHA-256 és idézet egyezik · ':' · a forrás nem ellenőrizhető: '+
      String(a?.reason||'ismeretlen')+' · ')+String(evidence.excerpt||'').slice(0,320);
    details.appendChild(small);
   }
   host.appendChild(details);
  }
  if(groups.length>20){
   var more=document.createElement('small');more.textContent='További események az Admin orvosi idővonalon találhatók.';
   host.appendChild(more);
  }
  // I-10: rank only SOURCE-ATTESTED excerpts against the question before
  // previewing the exact set approved for this ONE future AI request.
  // No new source access, no medical judgment based on lexical similarity.
  var qe=el('hhSQ299'),question=String(qe&&qe.value||'').trim();
  var retrieved=await fullIndex.rankPages(catalog,pages,question,digest,ranker);
  check(p,v);
  var selected=retrieved.selected;
  var analysis=document.createElement('section');analysis.id='hhAskMkbAnalysis699';
  host.appendChild(analysis);
  var preview=document.createElement('div');preview.className='note';
  preview.textContent='🧠 I-11 · '+catalog.length+' PDF / '+retrieved.eligiblePages+
    ' feldolgozott oldal · '+selected.length+
    ' releváns, bájtszinten ellenőrzött rövid idézet. '+retrieved.integrityRejected+
    ' sikertelen oldalellenőrzés. A forrásdátum nem feltétlenül az orvosi esemény időpontja.';
  analysis.appendChild(preview);
  if(selected.length){
   var consentPreview=document.createElement('div');consentPreview.className='note';
   consentPreview.textContent='A következő kutatáshoz előkészített idézetek (jóváhagyás nélkül semmi nem kerül az AI-hoz): '+
    selected.map(x=>x.date+' · '+x.title+' · '+x.source+' ('+x.page+'. oldal) · „'+x.quote.slice(0,160)+'”'+(x.caution?' [⚠️ méréseltérés]':'')).join(' | ');
   analysis.appendChild(consentPreview);
  }
  if(question.length<3){
   var help=document.createElement('small');
   help.textContent='Az AI-átadáshoz előbb írj konkrét kérdést, majd kattints ismét a Forrásolt orvosi tudásra. A megtekintés önmagában nem engedély.';
   analysis.appendChild(help);
  }
  if(selected.length&&question.length>=3&&approve){
   prepared={profile:p,items:selected,question:question,at:Date.now(),generation:v};
   approve.hidden=false;
  }
 }catch(_){
  if(version===v&&profile()===p)host.textContent='⚠ Az eredeti források nem ellenőrizhetők. Kérlek, ellenőrizd a Health Vault kapcsolatát.';
 }finally{if(version===v){busy=false;btn.disabled=false}}
}
window.HH_MKB_CONSENT_V677=Object.freeze({
 /* v700: Ordinary Ask may PREPARE the patient-owned original excerpts.
    This does not grant consent, transmit source text to AI or alter records. */
 prepare:async function(p,question){
  var q=el('hhSQ299'),text=String(question||'').trim();
  if(!text||!q||q.value.trim()!==text||!allowed(p))return {ready:false,reason:'profile_or_question'};
  mount();
  if(busy)return {ready:false,reason:'source_review_busy'};
  if(prepared&&prepared.profile===p&&prepared.question===text&&
    Date.now()-prepared.at<5*60*1000&&prepared.items.length)
   return {ready:true,count:prepared.items.length,source:'already_prepared'};
  await read();
  if(!allowed(p)||q.value.trim()!==text||!prepared||
     prepared.profile!==p||prepared.question!==text||!prepared.items.length)
   return {ready:false,reason:'no_verified_excerpts'};
  return {ready:true,count:prepared.items.length,source:'verified_preview'};
 },
 consume:function(p,question){
  var cache=prepared,granted=!!(cache&&approved===cache);
  approved=null;prepared=null;
  if(!granted||!cache||!cache.items.length||!allowed(p)||busy||
    cache.profile!==p||cache.generation!==version||
   cache.question!==String(question||'').trim()||
    Date.now()-cache.at>5*60*1000||!cache.items.every(x=>x.date&&x.title&&x.quote&&/^[a-f0-9-]{36}$/i.test(x.sourceId)))
   return null;
  if(cache.items.some(x=>!/^20\d{2}-\d{2}-\d{2}$/.test(x.date)))return null;
  return cache.items.map(x=>Object.assign({},x));
 }
});
window.addEventListener('healthhub:ask-lena-open',mount);
window.addEventListener('healthhub:profile-changed',reset);
window.addEventListener('healthhub:central-auth-changed',reset);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
})();
