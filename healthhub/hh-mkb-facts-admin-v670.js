(function(){
'use strict';
/* v670: read-only preview + explicit, idempotent fact/evidence ingestion.
 * All medical text stays in authenticated per-profile Health Vault APIs.
 * Rule output is ALWAYS pending review; never clinician-verified by ingestion.
 */
var ID='hhMkbFacts670',CSS='hhMkbFactsCss670',busy=false,preview=null,started=false;
function el(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function svc(){return window.HH_DAILY_HEALTH_SYNC_V319}
function allowed(p){
 var x=svc(),a=x&&x.getStatus&&x.getStatus();
 return !!(x&&a&&a.authenticated&&Array.isArray(a.authorizedProfiles)&&a.authorizedProfiles.includes(p)&&profile()===p);
}
function guard(p){if(!allowed(p))throw Error('A Health Vault profiljogosultsága megszűnt vagy másik profil aktív.')}
function msg(text){var n=el('hhMkbFactsMsg670');if(n)n.textContent=text}
function css(){
 if(el(CSS))return;
 var n=document.createElement('style');n.id=CSS;
 n.textContent='#'+ID+'{border:1px solid rgba(141,191,218,.3);border-radius:18px;background:linear-gradient(145deg,#0e253b,#204158);padding:14px;margin:0 0 13px;color:#e5f2fa;font:12px/1.52 system-ui}'+
  '#'+ID+' h3{font-size:15px;margin:0 0 6px;color:white}#'+ID+' p{margin:6px 0 10px;color:#c6dae9;font-size:11px}'+
  '#'+ID+' .actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}'+
  '#'+ID+' button{min-height:39px;padding:8px 11px;border:1px solid #6491a8;border-radius:11px;background:#276d89;color:white;font-weight:800;font-size:11px;cursor:pointer}'+
  '#'+ID+' button:disabled{opacity:.45;cursor:default}'+
  '#'+ID+' .result{padding:10px;border:1px solid rgba(173,211,231,.23);border-radius:12px;background:rgba(4,18,31,.28);white-space:pre-line;overflow-wrap:anywhere}'+
  '#'+ID+' .fact{margin:7px 0;padding:9px;border:1px solid rgba(188,222,242,.22);border-radius:10px;background:rgba(255,255,255,.04)}'+
  '#'+ID+' .fact strong{display:block;font-size:12px}#'+ID+' .fact small{display:block;color:#b2c8d8;margin-top:5px;font-size:10px}'+
  '#'+ID+' .facts{max-height:340px;overflow:auto}';
 document.head.appendChild(n);
}
function mount(){
 var ov=el('haOv'),body=el('haBody');
 if(!ov||!body||!ov.classList.contains('on')||el(ID))return;
 css();
 var div=document.createElement('section');div.id=ID;
 div.innerHTML='<h3>🧠 Medical Intelligence · Tények és bizonyítékok</h3>'+
  '<p>1. Forrásellenőrzött tényjelöltek előnézete. 2. Külön jóváhagyással privát rögzítés, kizárólag „ellenőrzésre vár” státusszal. Semmilyen AI-következtetés nem minősül orvosilag igazoltnak.</p>'+
  '<div class="actions"><button id="hhMkbPreview670" type="button">🔍 Tényjelöltek előnézete</button>'+
  '<button id="hhMkbSave670" type="button" disabled>📚 Tényjelöltek rögzítése</button></div>'+
  '<div class="result" id="hhMkbFactsMsg670" role="status" aria-live="polite">Aktív profil: '+pname(profile())+'. Az előnézet nem módosít adatot.</div>'+
  '<div class="facts" id="hhMkbFactsRows670"></div>';
 var base=el('hhMkbBatch662');
 if(base&&base.parentNode===body)base.insertAdjacentElement('afterend',div);
 else body.insertBefore(div,body.firstChild);
 el('hhMkbPreview670').onclick=scan;
 el('hhMkbSave670').onclick=save;
}
function reset(){
 preview=null;var rows=el('hhMkbFactsRows670');if(rows)rows.textContent='';
 var btn=el('hhMkbSave670');if(btn)btn.disabled=true;
 if(!busy)msg('Aktív profil: '+pname(profile())+'. Az előnézet nem módosít adatot.');
}
function buttons(){
 var a=el('hhMkbPreview670'),b=el('hhMkbSave670');
 if(a)a.disabled=busy;
 if(b)b.disabled=busy||!preview||preview.profile!==profile()||!preview.candidates.length;
}
function uuidOK(v){return /^[a-f0-9-]{36}$/i.test(String(v||''))}
async function all(p,table,fields,filter,ordering){
 var items=[],offset=0;
 for(var k=0;k<40;k++){
  guard(p);
  var uri='/rest/v1/'+table+'?select='+fields+filter+
   (ordering?'&order='+ordering:'')+'&limit=500&offset='+offset;
  var part=await svc().request(uri,{method:'GET'});
  guard(p);
  if(!Array.isArray(part))throw Error('Nem ellenőrizhető privát dokumentumlista.');
  items.push(...part);
  if(part.length<500)return items;
  offset+=500;
 }
 throw Error('A tudásbázis túl nagy a böngészős feldolgozáshoz.');
}
async function digest(v){
 var bytes=new TextEncoder().encode(String(v));
 var h=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return [...h].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function uuid(v){
 var bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 var s=[...bytes.slice(0,16)].map(x=>x.toString(16).padStart(2,'0')).join('');
 return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);
}
async function enumerate(p){
 guard(p);
 var rules=window.HH_MKB_FACT_RULES_V670;
 if(!rules||typeof rules.candidates!=='function')throw Error('A ténykinyerési szabályok még nem töltődtek be.');
 if(!crypto||!crypto.subtle)throw Error('A SHA-256 integritásellenőrzéshez HTTPS szükséges.');
 var base='&profile_key=eq.'+encodeURIComponent(p);
 var [sources,docs]=await Promise.all([
  all(p,'hh_mkb_sources','id,source_metadata,origin,source_kind,sha256,parse_status',
   base+'&origin=eq.google_drive&source_kind=eq.pdf','id.asc'),
  all(p,'hh_kb_documents',
   'id,mkb_source_id,original_name,status,text_integrity_status,total_pages,pages_verified,duplicate_of,source_class,sha256',
   base,'id.asc')
 ]);
 var available=new Map(sources.filter(s=>s&&uuidOK(s.id)&&
   s.parse_status==='complete'&&/^[a-f0-9]{64}$/i.test(s.sha256||'')&&
   !(s.source_metadata&&s.source_metadata.ingest_scope==='excluded')).map(s=>[s.id,s]));
 var eligible=docs.filter(d=>uuidOK(d.id)&&available.has(d.mkb_source_id)&&
   d.sha256===available.get(d.mkb_source_id).sha256&&
   d.status==='complete'&&d.text_integrity_status==='verified'&&
   !d.duplicate_of&&d.source_class!=='device'&&d.source_class!=='secondary_summary'&&
   Number(d.total_pages)>0&&Number(d.pages_verified)===Number(d.total_pages));
 var docMap=new Map(eligible.map(x=>[x.id,x])),out=[],count=0,examined=0;
 for(var i=0;i<eligible.length;i+=20){
  guard(p);
  var chunk=eligible.slice(i,i+20),ids=chunk.map(x=>x.id);
  var pages=await all(p,'hh_kb_pages',
   'document_id,page_no,page_text,text_sha256,needs_review,extraction_method',
   '&document_id=in.('+ids.join(',')+')','document_id.asc,page_no.asc');
  for(var page of pages){
   var d=docMap.get(page.document_id);
   if(!d||page.needs_review||page.extraction_method!=='embedded'||!page.page_text)continue;
   examined++;
   if(!/^[a-f0-9]{64}$/i.test(page.text_sha256||'')||
      await digest(page.page_text)!==page.text_sha256)
    throw Error('Oldalszintű SHA-256 eltérés: a tényfeldolgozás leállt.');
   var candidates=rules.candidates(page.page_text);
   for(var candidate of candidates){
    if(!page.page_text.includes(candidate.excerpt))throw Error('A jelölt nem vezethető vissza az eredeti oldalszövegre.');
    out.push({...candidate,profile_key:p,source_id:d.mkb_source_id,
     document_id:d.id,page_no:page.page_no,source_name:d.original_name,
     page_sha256:page.text_sha256});
   }
   count++;
  }
  msg('⏳ '+pname(p)+' · '+Math.min(i+20,eligible.length)+'/'+eligible.length+
   ' ellenőrzött forrás átnézve. A PDF-ek tartalma kizárólag a privát Vaultban van.');
 }
 var uniq=new Map();
 for(const c of out){
  var key=c.source_id+'|'+c.rule+'|'+c.observed_date+'|'+(c.value_number??'');
  if(!uniq.has(key))uniq.set(key,c);
 }
 return {profile:p,candidates:[...uniq.values()],documents:eligible.length,pages:examined,
  sourceIds:[...available.keys()],time:Date.now()};
}
function display(result){
 var host=el('hhMkbFactsRows670');if(!host)return;
 host.textContent='';
 var top=document.createElement('p');
 top.textContent='Első '+Math.min(result.candidates.length,30)+' jelölt a '+result.candidates.length+
  ' közül. Ezek NEM klinikailag igazolt tények, hanem forráshoz kötött, ellenőrizendő állítások.';
 host.appendChild(top);
 for(const c of result.candidates.slice(0,30)){
  var card=document.createElement('div');card.className='fact';
  var title=document.createElement('strong');title.textContent=c.label;
  var link=document.createElement('small');
  link.textContent='📄 '+c.source_name+' · '+c.page_no+'. oldal · SHA-256: ellenőrzött';
  var quote=document.createElement('small');quote.textContent='Idézet: '+c.excerpt.slice(0,350);
  card.append(title,link,quote);host.appendChild(card);
 }
}
async function scan(){
 if(busy)return;
 var p=profile();
 if(!allowed(p)){msg('🔒 Előbb jelentkezz be az aktív profil Health Vaultjába.');return}
 busy=true;reset();buttons();
 try{
  msg('🔎 Az ellenőrzött források átvizsgálása…');
  var found=await enumerate(p);
  guard(p);preview=found;display(found);
  msg('✅ '+pname(p)+' · Forrásellenőrzés kész. '+found.documents+
   ' jogosult PDF, '+found.pages+' beágyazott szöveges oldal, '+found.candidates.length+
   ' szigorú dátum- és idézetellenőrzéssel azonosított tényjelölt.\n'+
   (found.candidates.length?
    'A rögzítés külön kattintás, minden új rekord ellenőrzésre vár státuszt kap.':
    'A nem egyértelmű vagy képi adatokhoz nem gyártunk találgatott tényeket.'));
 }catch(_){preview=null;msg('⚠ A biztonságos előnézet megszakadt. Ellenőrizd a Health Vault-engedélyt és próbáld újra.')}
 finally{busy=false;buttons()}
}
function factKey(source,label,day){
 var compact=String(label||'').replace(/\s*\(20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}\.?\)\s*$/,'')
  .trim().toLocaleLowerCase('hu-HU');
 return source+'|'+compact+'|'+day;
}
async function existing(p){
 var rows=await all(p,'hh_mkb_facts','id,source_id,label,observed_date,review_status',
  '&profile_key=eq.'+encodeURIComponent(p),'entered_at.desc');
 return new Map(rows.map(r=>[factKey(r.source_id,r.label,r.observed_date),{id:r.id,status:r.review_status}]));
}
async function ensureSourceValid(p,ids){
 // The original source/document trust gate must still hold after preview.
 var docs=await all(p,'hh_kb_documents',
 'id,mkb_source_id,status,text_integrity_status,total_pages,pages_verified,duplicate_of,source_class,sha256',
 '&profile_key=eq.'+encodeURIComponent(p),'id.asc');
 var by=new Map(docs.map(d=>[d.id,d]));
 for(const item of preview.candidates){
  var d=by.get(item.document_id);
  if(!d||d.mkb_source_id!==item.source_id||
     d.sha256!==ids.get(item.source_id)||
     d.status!=='complete'||d.text_integrity_status!=='verified'||
     d.duplicate_of||d.source_class==='device'||d.source_class==='secondary_summary'||
     Number(d.total_pages)!==Number(d.pages_verified))
   throw Error('A forrás időközben megváltozott: készíts friss előnézetet.');
 }
}
async function independentReadback(p,candidates){
 // Fresh independent RLS reads. Check fact foreign-key, evidence quote, PDF page text and page SHA.
 guard(p);
 var facts=await all(p,'hh_mkb_facts','id,source_id,label,observed_date,review_status',
  '&profile_key=eq.'+encodeURIComponent(p),'entered_at.desc');
 var ev=await all(p,'hh_mkb_evidence','fact_id,source_id,page_no,excerpt,evidence_role',
  '&profile_key=eq.'+encodeURIComponent(p),'id.asc');
 var keys=new Map(facts.map(f=>[factKey(f.source_id,f.label,f.observed_date),f]));
 var documentIds=[...new Set(candidates.map(c=>c.document_id))];
 var pages=new Map();
 for(var i=0;i<documentIds.length;i+=20){
  var part=await all(p,'hh_kb_pages',
   'document_id,page_no,page_text,text_sha256',
   '&document_id=in.('+documentIds.slice(i,i+20).join(',')+')','document_id.asc,page_no.asc');
  for(var row of part)pages.set(row.document_id+'|'+row.page_no,row);
 }
 var checked=0;
 for(var c of candidates){
  guard(p);
  var f=keys.get(factKey(c.source_id,c.label,c.observed_date));
  var page=pages.get(c.document_id+'|'+c.page_no);
  if(!f||f.source_id!==c.source_id||f.review_status==='rejected'||
     !page||page.text_sha256!==c.page_sha256||
     !page.page_text.includes(c.excerpt)||await digest(page.page_text)!==c.page_sha256||
     !ev.some(e=>e.fact_id===f.id&&e.source_id===c.source_id&&
       Number(e.page_no)===Number(c.page_no)&&e.evidence_role==='supports'&&e.excerpt===c.excerpt))
   throw Error('A független tény–forrás visszaellenőrzés sikertelen.');
  checked++;
 }
 return checked;
}
async function save(){
 if(busy||!preview||preview.profile!==profile())return;
 var p=profile();if(!allowed(p)){msg('🔒 Health Vault-jogosultság szükséges.');return}
 if(Date.now()-preview.time>20*60*1000){msg('⚠ Az előnézet 20 percnél régebbi. Frissítsd.');reset();return}
 if(typeof confirm!=='function'||
  !confirm(preview.candidates.length+' forrásolt orvosi TÉNYJELÖLTET rögzítünk „ellenőrzésre vár” státusszal a privát '+pname(p)+' profilba. Folytatod?'))return;
 busy=true;buttons();var saved=0,already=0,linked=0,skippedRejected=0,errors=0,checkedCandidates=[];
 try{
  guard(p);
  var sRows=await all(p,'hh_mkb_sources','id,source_metadata,parse_status,sha256',
   '&profile_key=eq.'+encodeURIComponent(p)+'&origin=eq.google_drive&source_kind=eq.pdf','id.asc');
  var permittedIds=new Map(sRows.filter(s=>s.parse_status==='complete'&&
   /^[a-f0-9]{64}$/i.test(s.sha256||'')&&
   !(s.source_metadata&&s.source_metadata.ingest_scope==='excluded')).map(s=>[s.id,s.sha256]));
  await ensureSourceValid(p,permittedIds);
  var prior=await existing(p);
  for(const c of preview.candidates){
   guard(p);
   var key=factKey(c.source_id,c.label,c.observed_date);
   var previous=prior.get(key);
    if(previous&&previous.status==='rejected'){skippedRejected++;continue}
    var factId=previous?.id||await uuid('hh-mkb-fact-v670|'+p+'|'+key);
   try{
    if(!prior.has(key)){
     var data={id:factId,profile_key:p,source_id:c.source_id,
      fact_type:c.fact_type,label:c.label,value_text:c.value_text,
      value_number:c.value_number,original_unit:c.original_unit,
      observed_date:c.observed_date,time_precision:c.time_precision,
      polarity:c.polarity,assertion_type:c.assertion_type,review_status:'pending',
      detail:{extraction_pipeline:'deterministic_rules_v670',rule:c.rule,source_page:c.page_no,
       source_text_sha256:c.page_sha256,requires_clinical_review:true}};
     await svc().request('/rest/v1/hh_mkb_facts?on_conflict=id',
      {method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',data});
     saved++;prior.set(key,{id:factId,status:'pending'});
    }else already++;
    guard(p);
    var evId=await uuid('hh-mkb-evidence-v670|'+factId+'|'+c.page_no+'|'+await digest(c.excerpt));
    await svc().request('/rest/v1/hh_mkb_evidence?on_conflict=id',
     {method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',
      data:{id:evId,profile_key:p,fact_id:factId,source_id:c.source_id,
       page_no:c.page_no,excerpt:c.excerpt,extraction_method:'embedded_text',
       evidence_role:'supports',review_status:'pending'}});
    linked++;checkedCandidates.push(c);
   }catch(_){errors++;throw Error('A privát írás megszakadt. A már rögzített sorok újrafuttatáskor nem duplikálódnak.')}
   if((saved+already+skippedRejected)%10===0)msg('⏳ Tényjelöltek rögzítése · '+(saved+already+skippedRejected)+'/'+preview.candidates.length);
  }
  msg('🔎 A tények és forrásidézetek független visszaellenőrzése…');
  var readback=await independentReadback(p,checkedCandidates);
  msg('✅ '+pname(p)+' · Tény–forrás QA: '+readback+'/'+checkedCandidates.length+
   ' egyező pár. Új tényjelöltek: '+saved+', már meglevő tények: '+already+
   ', korábban elvetett (érintetlen): '+skippedRejected+
   '. Az új állítások orvosi ellenőrzésre várnak, nem diagnózisok.');
 }catch(_){
  msg('⚠ A rögzítés vagy a független visszaellenőrzés nem fejeződött be. '+saved+' új tényjelölt és '+linked+
   ' bizonyíték-írás megtörténhetett; ezek nem minősülnek QA-jóváhagyottnak.'+
   ' Friss előnézettel idempotensen újraindítható.');
 }finally{busy=false;buttons()}
}
function init(){
 if(started)return;started=true;
 var n=0;
 (function ready(){
  var ov=el('haOv'),body=el('haBody');
  if(!ov||!body){if(++n<30)setTimeout(ready,350);return}
  new MutationObserver(mount).observe(ov,{attributes:true,attributeFilter:['class']});
  new MutationObserver(mount).observe(body,{childList:true});
  mount();
 })();
}
window.addEventListener('healthhub:profile-changed',()=>{reset()});
window.addEventListener('healthhub:central-auth-changed',()=>{if(preview&&!allowed(preview.profile))reset()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
