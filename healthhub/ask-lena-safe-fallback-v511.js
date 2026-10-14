(function(){
'use strict';
/* HH Ask Léna v511 · fail-safe answer pathway.
 * No extra cloud storage, no automatic sharing, no unauthenticated AI calls.
 * A failed personal AI request may receive ONE simplified attempt with the
 * ORIGINAL question through the SAME authorized, consented AI endpoint.
 * The final offline reply is a clearly-labelled NON-generative local summary.
 */
function eligibleRetry(code,status,payload,original,profile){
 return status===400&&code==='invalid_or_no_consent'&&
  payload&&payload.consent===true&&payload.profile===profile&&
  (profile==='zsolt'||profile==='monika')&&!payload.photo&&
  typeof original==='string'&&original.trim().length>=3&&original.length<=1200&&
  Array.isArray(payload.sources)&&payload.sources.some(function(x){return Array.isArray(x.entries)&&x.entries.length});
}
function compact(payload,original,profile){
 if(!payload||payload.consent!==true||payload.profile!==profile||
  !['zsolt','monika'].includes(profile)||typeof original!=='string'||
  original.trim().length<3||original.length>1200||payload.photo)
  throw Error('Safe Fallback: profil, adatküldési hozzájárulás vagy kérdés nem megfelelő.');
 var allowed=['symptoms','vitals','sleep','activity','environment','medication','records','infection'];
 var sources=(payload.sources||[]).filter(function(x){return x&&allowed.includes(x.id)&&Array.isArray(x.entries)&&x.entries.length})
  .slice(0,8).map(function(s){return {id:s.id,title:String(s.title||s.id).slice(0,70),
   status:String(s.status||'available').slice(0,20),
   entries:s.entries.slice(0,8).filter(function(e){return e&&e.name&&e.value}).map(function(e){
    return {name:String(e.name).slice(0,90),value:String(e.value).slice(0,180),
     unit:String(e.unit||'').slice(0,24),observedAt:String(e.observedAt||'').slice(0,35)};
   })}});
 if(!sources.some(function(x){return x.entries.length}))throw Error('Safe Fallback: nincs engedélyezett, ellenőrizhető adatforrás.');
 // Do not carry over document excerpts, photos, clinical-v395 or style prompts.
 return {schema:'healthhub.ask-lena/1',profile:profile,consent:true,
  question:original.trim(),sources:sources,extra:[]};
}
function isFatigue(q){return /fárad|farad|kimer|álmos|almos|energiahiány|energiahi|alvás|alvas|alud|alsz/i.test(q||'')}
function localAnswer(report,question,p,localApi){
 if(!['zsolt','monika'].includes(p)||typeof question!=='string'||question.trim().length<3)return null;
 if(report&&(report.profile!==p||report.schema!=='healthhub.intelligence.context/1'))return null;
 var preview=null;
 try{if(report&&localApi&&typeof localApi.compose==='function')preview=localApi.compose(report,question)}catch(e){}
 var fatigue=isFatigue(question);
 var answer=fatigue?
  'A mostanában jelentkező fáradtságodat nem lehet egyetlen okkal megmagyarázni. Gyakori lehetőség a kevés vagy töredezett alvás, stressz, fertőzés utáni állapot, egyes gyógyszerek hatása, illetve például vérszegénység vagy pajzsmirigyprobléma. Ezek lehetőségek, nem a te diagnózisaid.':
  'A kérdésedre most nem készült ellenőrzött személyes AI-válasz. Az alábbiak csak a rendelkezésre álló helyi megfigyelések és általános tudnivalók; biztos következtetéshez több ellenőrzött információ kell.';
 var parts=[answer],facts=preview&&Array.isArray(preview.facts)?preview.facts:[];
 if(facts.length){
  parts.push('### 📊 HealthHubban ténylegesen rögzített adatok');
  facts.slice(0,5).forEach(function(x){
   parts.push('- '+String(x.text||'').slice(0,240)+(x.at?' (mérési idő: '+String(x.at).slice(0,35)+')':''));
  });
 }
 var assess=preview&&Array.isArray(preview.assessment)?preview.assessment.slice(0,3):[];
 if(assess.length)parts.push('### 🔎 Mit jelezhetnek ezek az adatok?',assess.join('\n\n'));
 var suggestions=preview&&Array.isArray(preview.suggestions)?preview.suggestions.slice(0,3):[];
 if(fatigue){
  parts.push('### 💙 Mi lenne most hasznos?','Figyeld meg, mióta tart a fáradtság, mennyit és milyen minőségben alszol, illetve van-e más panaszod. Ha tartós, romlik, vagy a napi tevékenységedet zavarja, érdemes háziorvossal egyeztetni az okok kivizsgálásáról.');
  parts.push('Mellkasi fájdalom, súlyos nehézlégzés, ájulás vagy hirtelen zavartság esetén sürgős segítség kell (112).');
 }else if(suggestions.length)parts.push('### 💙 Következő lépések',suggestions.join('\n\n'));
 var warnings=preview&&Array.isArray(preview.warnings)?preview.warnings.slice(0,2):[];
 if(warnings.length)parts.push('### ⚠️ Fontos óvatosság',warnings.join('\n\n'));
 return {profile:p,text:parts.join('\n\n'),measuredFacts:facts.length,
  mode:'local-non-generative',disclaimer:'🛟 Safe Fallback · Helyi, szabályalapú tájékoztatás. NEM ChatGPT-től érkezett AI-válasz, nem történt webes kutatás. Nem diagnózis.'};
}
function provenance(payload,generated,kind){
 var sourceNames=(payload&&payload.sources||[]).filter(function(x){return x&&Array.isArray(x.entries)&&x.entries.length})
  .map(function(x){return String(x.title||x.id).slice(0,70)}).slice(0,5);
 var hasPersonal=sourceNames.length>0;
 return (kind==='simplified'?'🛟 Egyszerűsített, valódi AI-válasz; a részletes kutatás sikertelen volt. ':'')+
  (hasPersonal?'📊 Személyes többlet egy általános webes válaszhoz képest: '+sourceNames.join(', ')+'. ':'')+
  (generated?'🧠 AI hozzáadott érték: magyarázat, lehetséges kapcsolatok és közérthető történetmesélés; nem önállóan igazolt orvosi tény. ':'')+
  '🌐 Élő webkeresés: nem történt.';
}
window.HH_ASK_LENA_SAFE_FALLBACK_V511=Object.freeze({
 eligibleRetry:eligibleRetry,compact:compact,localAnswer:localAnswer,provenance:provenance,version:'511'
});
})();
