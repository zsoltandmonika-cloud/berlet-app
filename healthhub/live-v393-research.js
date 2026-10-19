(function(){
'use strict';
/* HealthHub I-04 Deep Research v393: universal question-aware evidence plan.
 * Client-side preparation only, not a claim-verification engine or extra AI
 * model call. This keeps the user's question unchanged in the UI/history.
 */
function norm(v){return String(v||'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function trimmed(v,n){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n||220)}
function decide(question){
 var q=norm(question),long=q.length>=90;
 // A personal question with an explicit historic date belongs to the
 // clinical-history workflow even when it says only "Mi történt velem?".
 // Do NOT require keywords such as "szív" or "kórház".
 var yearOrDate=/(?:19|20)\d{2}/.test(q);
 var firstPerson=/(?:\bvelem\b|\bnekem\b|\bvelem\s+tortent\b|\baznap\b|\bmi\s+tortent\b|\bmi\s+volt\b|\bemlekszem\b)/.test(q);
 var personalHistoricEvent=yearOrDate&&firstPerson;

 var medical=/(korhaz|intenziv|mento|mentes|betegseg|diagn|sziv|kardio|fibrill|ujraeleszt|eszmelet|koma|szedal|neurolog|emlekezet|amnezi|lelet|mutet|beavatkozas|gyogyszer|kognitiv|orvos|vizelet|labor|tenyeszt|bakterium|vervizsgalat|hormon)/.test(q);
 var sequence=/(mikor|hany perc|hany ora|idosor|idovonal|kronolog|torten|esemeny|elso nap|kezdete|vege|elozmeny)/.test(q);
 var detailed=/(reszlet|mely|alapos|osszes|teljes|osszevet|magyara|kovetkeztet|miert|hogyan|rekonstru|elemzes|egesz nap|allapotban)/.test(q);
 var asksMechanism=/(miert|hogyan|mechanizm|okozhat|kovetkezmen|folyamat|tortenik|hatasa|kepesseg)/.test(q);
 var docs=medical||sequence||personalHistoricEvent||/(lelet|dokumentum|adat|forras)/.test(q);
 var deep=personalHistoricEvent||(sequence&&medical)||(medical&&(detailed||long))||(long&&detailed);
 var mode=deep?'deep':'standard';
 return {mode:mode,clinical:medical||personalHistoricEvent,chronology:personalHistoricEvent||(medical&&sequence),
  historicalDateQuery:personalHistoricEvent,physiology:medical&&asksMechanism,
  documents:docs,maxDocs:deep?16:5,maxOriginalDocs:deep?12:3,pagesPerDocument:deep?24:12,
  excerptMax:deep?2100:1750,profileRequirements:['active-profile','explicit-pdf-consent','cited-evidence']};
}
function instruction(plan,coverage){
 var full=plan.mode==='deep';
 var c=coverage||{},originals=Number(c.originals)||0;
 var out='\n\n[KUTATÁSI ELV: HealthHub · személyre szabott történet] ';
 out+='A személyes leletválasz alapértelmezett, külön nem kérendő sorrendje: először természetes, forrásolt storytelling A leletek története címmel; alatta Dokumentált tények, végül Orvosi értelmezés, külön jelölt bizonytalanságokkal. A történet csak az alatta ellenőrizhető forrásadatokból épülhet. ';
 out+='Utána részletesen magyarázd el az élettani mechanizmusokat és az igazolt személyes összefüggéseket. ';
 out+='A storytelling fejezetben kerüld a felesleges címkézést, de az alatta következő Dokumentált tények és Orvosi értelmezés szakaszok KÖTELEZŐK a személyes orvosi leletválasznál. ';
 out+='A releváns eredeti leletek címét, dátumát és PDF-oldalát a történet megfelelő pontjához kösd. ';
 if(full)out+='A részletesség minimum egy gondosan megírt, kronológiai ChatGPT-válaszé, érdemi orvosi magyarázattal és következtetésekkel. ';
 if(plan.chronology)out+='Múltbeli személyes eseménynél a hiteles időrend a fő törzs: előzmény, rosszullét, mentés, ellátás, felépülés csak a ténylegesen alátámasztott részletekkel. ';
 if(plan.physiology)out+='Az okok, következmények és kognitív hatások mechanizmusát érthetően indokold. ';
 if(originals===0&&plan.documents)out+='Az eredeti kivonatok hiánya nem azonos az esemény dokumentálatlanságával; a nem bizonyítható részleteket egyszerűen ne állítsd tényként. ';
 out+='Ne találj ki percszámot, orvosnevet, diagnózist vagy gyógyszermódosítást. Nem kell külön hiánylistát írnod, kivéve ha a felhasználó egyenesen erre kérdez.';
 return out.slice(0,1650);
}
function apply(data,question,coverage,chosenPlan){
 if(!data||!['monika','zsolt'].includes(data.profile)||data.consent!==true)
  throw Error('Mélyelemzés: profil vagy hozzájárulás hiányzik.');
 var plan=chosenPlan||decide(question),q=trimmed(question,1600);
 // The authorized AI service rejects question strings longer than 1200 chars.
 // Research policy is already provided by the server; NEVER append it to the user's question.
 if(q.length>1200)throw Error('A kérdés 1200 karakternél hosszabb. Kérlek rövidítsd a kérdést, a részletes adatokat a HealthHub külön kezeli.');
 var extra=Array.isArray(data.extra)?data.extra:[];
 var next=Object.assign({},data,{
  question:q,depth:plan.mode==='deep'?'detailed':'standard',
  extra:extra.concat([{domain:'documents',label:'I-04 · kutatási fókusz',
   value:plan.mode==='deep'?'Mély, időrendi és forrásalapú elemzés; bizonyítékok és hiányok külön.':
    'Személyre szabott, releváns forrású válasz, konkrét tényekkel.'}])
 });
 return {payload:next,plan:plan,modelPromptAdded:0,questionOriginal:q};
}
window.HH_DEEP_RESEARCH_V393={decide:decide,apply:apply,instruction:instruction,version:'393'};
})();