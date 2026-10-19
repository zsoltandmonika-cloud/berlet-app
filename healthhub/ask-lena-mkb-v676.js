(function(){
'use strict';
/* HealthHub v676: opt-in, read-only MKB evidence lens inside Ask Léna.
 * Does NOT append pending facts or quotes to AI requests. No network except
 * patient-authorized Vault reads; no background scan, telemetry or persistence.
 */
var ID='hhAskMkb676',busy=false,version=0,prepared=null;
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
 version++;prepared=null;
 var host=el('hhAskMkbBody676'),btn=el('hhAskMkbBtn676');
 if(host){host.textContent='';host.hidden=true}
 if(btn){btn.disabled=false;btn.textContent='📚 Forrásolt orvosi tudás'}
 var opt=el('hhAskMkbUse677');if(opt){opt.checked=false;opt.disabled=true}
 var pick=el('hhAskMkbConsent677');if(pick)pick.hidden=true;
 busy=false;
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
 '#'+ID+' label{display:flex;align-items:flex-start;gap:9px;line-height:1.5;cursor:pointer;margin:10px 0 3px}'+
 '#'+ID+' label input{min-width:19px;min-height:19px;accent-color:#2d8dbe;flex:0 0 19px}';
 document.head.appendChild(css);
 var box=document.createElement('section');box.id=ID;
 var button=document.createElement('button');button.type='button';button.id='hhAskMkbBtn676';
 button.textContent='📚 Forrásolt orvosi tudás';
 var note=document.createElement('div');note.className='note';
 note.textContent='Privát Health Vault · csak megtekintés · az ellenőrzésre váró tényeket nem küldöm automatikusan az AI-nak.';
 var host=document.createElement('div');host.id='hhAskMkbBody676';host.hidden=true;host.setAttribute('role','status');
 var optLabel=document.createElement('label');optLabel.id='hhAskMkbConsent677';optLabel.hidden=true;
 var opt=document.createElement('input');opt.id='hhAskMkbUse677';opt.type='checkbox';opt.disabled=true;
 var optText=document.createElement('span');optText.textContent='🔐 Engedélyezem, hogy a KÖVETKEZŐ Ask Léna-kutatás során rövid, ellenőrzésre váró forrásolt tényeket továbbítson a már engedélyezett AI-kiszolgálónak. A teljes PDF-eket nem küldi el. Az engedély csak egyszer használható.';
 optLabel.append(opt,optText);
 box.append(button,note,host,optLabel);actions.insertAdjacentElement('afterend',box);
 button.addEventListener('click',read);
}
async function read(){
 if(busy)return;
 var p=profile(),v=++version,host=el('hhAskMkbBody676'),btn=el('hhAskMkbBtn676');
 if(!host||!btn)return;
 host.hidden=false;host.textContent='';
 if(!allowed(p)){host.textContent='🔒 Az adott profilhoz érvényes Health Vault-belépés kell.';return}
 var timeline=window.HH_MKB_TIMELINE_V674,auditor=window.HH_MKB_EVIDENCE_AUDIT_V675;
 if(!timeline||!auditor||typeof timeline.groups!=='function'||typeof auditor.audit!=='function'){
  host.textContent='⚠ Forrásellenőrző modul hiányzik. Frissítsd a HealthHubot.';return;
 }
 prepared=null;
 var opt=el('hhAskMkbUse677'),pick=el('hhAskMkbConsent677');
 if(opt){opt.checked=false;opt.disabled=true}
 if(pick)pick.hidden=true;
 busy=true;btn.disabled=true;host.textContent='⏳ '+name(p)+' · bizonyítékok független ellenőrzése…';
 try{
  var filter='&profile_key=eq.'+encodeURIComponent(p);
  var [facts,ev]=await Promise.all([
   fetchPages(p,v,'hh_mkb_facts','id,profile_key,source_id,observed_date,label,fact_type,review_status,value_number,original_unit',filter),
   fetchPages(p,v,'hh_mkb_evidence','id,profile_key,fact_id,source_id,page_no,excerpt,evidence_role,review_status',filter)
  ]);
  var sid=[...new Set(facts.map(x=>x.source_id).filter(goodUUID))];
  var sources=sid.length?await fetchPages(p,v,'hh_mkb_sources',
   'id,profile_key,original_name,sha256,parse_status,source_metadata,origin,source_kind',
   filter+'&id=in.('+sid.join(',')+')'):[];
  var docs=sid.length?await fetchPages(p,v,'hh_kb_documents',
   'id,profile_key,mkb_source_id,status,text_integrity_status,total_pages,pages_verified,duplicate_of,sha256',
   filter+'&mkb_source_id=in.('+sid.join(',')+')'):[];
  var pages=[],docIds=[...new Set(docs.map(d=>d.id).filter(goodUUID))];
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
  h.textContent=name(p)+' · '+groups.length+' idővonalcsoport · '+verified+'/'+ev.length+
   ' technikailag visszaellenőrzött bizonyíték. Ez nem klinikai jóváhagyás, és nem automatikusan elküldött AI-kontextus.';
  host.appendChild(h);
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
  // Explicit, ephemeral approval for ONE future query. No PDF body is cached
  // and no unverified evidence is eligible for forwarding.
  // For older imports several exact quotes may cover the same event,
  // including much longer administrative text. Prefer the SHORTEST
  // independently verified excerpt with meaningful actual result content.
  var selected=groups.filter(g=>g.records.length>0&&g.evidences.length>0&&
    g.evidences.every(e=>qa.get(e.id)?.verified)).slice(0,5).map(g=>{
     var e=g.evidences.filter(x=>qa.get(x.id)?.verified)
      .sort((a,b)=>String(a.excerpt||'').length-String(b.excerpt||'').length)[0];
     return {
      date:g.date,title:g.title,
      source:String(names.get(e.source_id)||'Eredeti PDF').slice(0,90),
      sourceId:e.source_id,page:e.page_no,
      quote:String(e.excerpt||'').slice(0,400),
      review:g.statuses.length===1&&g.statuses[0]==='verified'?'verified':'pending'
     };
  });
  if(selected.length&&opt&&pick){
   prepared={profile:p,items:selected,at:Date.now(),generation:v};
   opt.disabled=false;pick.hidden=false;
  }
 }catch(_){
  if(version===v&&profile()===p)host.textContent='⚠ Az eredeti források nem ellenőrizhetők. Kérlek, ellenőrizd a Health Vault kapcsolatát.';
 }finally{if(version===v){busy=false;btn.disabled=false}}
}
window.HH_MKB_CONSENT_V677=Object.freeze({
 consume:function(p){
  var opt=el('hhAskMkbUse677'),cache=prepared,granted=!!(opt&&opt.checked);
  if(opt)opt.checked=false;
  prepared=null;
  if(!granted||!cache||!opt||!cache.items.length||!allowed(p)||busy||
    cache.profile!==p||cache.generation!==version||
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
