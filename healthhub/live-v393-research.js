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
 var medical=/(korhaz|intenziv|mento|mentes|betegseg|diagn|sziv|kardio|fibrill|ujraeleszt|eszmelet|koma|szedal|neurolog|emlekezet|amnezi|lelet|mutet|beavatkozas|gyogyszer|kognitiv|orvos)/.test(q);
 var sequence=/(mikor|hany perc|hany ora|idosor|idovonal|kronolog|torten|esemeny|elso nap|kezdete|vege|elozmeny)/.test(q);
 var detailed=/(reszlet|mely|alapos|osszes|teljes|osszevet|magyara|kovetkeztet|miert|hogyan|rekonstru|elemzes|egesz nap|allapotban)/.test(q);
 var asksMechanism=/(miert|hogyan|mechanizm|okozhat|kovetkezmen|folyamat|tortenik|hatasa|kepesseg)/.test(q);
 var docs=medical||sequence||/(lelet|dokumentum|adat|forras)/.test(q);
 var deep=(sequence&&medical)||(medical&&(detailed||long))||(long&&detailed);
 var mode=deep?'deep':'standard';
 return {mode:mode,clinical:medical,chronology:medical&&sequence,physiology:medical&&asksMechanism,
  documents:docs,maxDocs:deep?8:5,maxOriginalDocs:deep?6:3,pagesPerDocument:deep?24:12,
  excerptMax:deep?2100:1750,profileRequirements:['active-profile','explicit-pdf-consent','cited-evidence']};
}
function instruction(plan,coverage){
 var full=plan.mode==='deep';
 var c=coverage||{},originals=Number(c.originals)||0;
 var out='\n\n[KUTATÁSI UTASÍTÁS: HealthHub, személyre szabott válasz] ';
 out+='Ne általános közhelyet adj. A rendelkezésre bocsátott egyedi leletek pontos dátumait és PDF-oldalait nevezd meg CSAK ha ténylegesen jelen vannak. ';
 out+='Tagold: (1) dokumentált tények és időrend; (2) részletes, közérthető élettani összefüggések; (3) az adott személyre alkalmazhatóság és korlátok; (4) hiányzó bizonyítékok; (5) biztonságos gyakorlati következő lépések. ';
 out+='Jelöld külön az [IGAZOLT LELET], [ÁLTALÁNOS ORVOSTUDOMÁNY], [LEHETSÉGES MAGYARÁZAT], [NEM TUDHATÓ] részeket. ';
 if(full)out+='A fenti részeket több bekezdésben, alapos érveléssel fejtsd ki, ne adj 3 mondatos összefoglalót. ';
 if(plan.chronology)out+='Időrend: eseményenként forrás, dátum és a pontos perc CSAK ha dokumentált; mentőkiérkezést vagy eszméletlenség hosszát SOHA ne tippeld. ';
 if(plan.physiology)out+='A mechanizmusokat lépésenként magyarázd, de ne állítsd, hogy egy általános mechanizmus bizonyítottan e beteggel is megtörtént. ';
 if(originals===0&&plan.documents)out+='NINCS eredeti PDF-oldalkivonat: kizárólag korábbi értelmezések és megadott adatok állnak rendelkezésre, ezért a klinikai rekonstrukció NEM lehet teljes. ';
 out+='Érvénytelen személyes diagnózis, gyógyszermódosítás és emlék-visszaállítási ígéret tilos.';
 return out.slice(0,1480);
}
function apply(data,question,coverage){
 if(!data||!['monika','zsolt'].includes(data.profile)||data.consent!==true)
  throw Error('Mélyelemzés: profil vagy hozzájárulás hiányzik.');
 var plan=decide(question),q=trimmed(question,1600);
 // Preserve original question in UI and history; a compact research
 // instruction is deliberately part of the model-facing question.
 var guide=instruction(plan,coverage);
 var effective=q.slice(0,Math.max(150,1900-guide.length))+guide;
 var extra=Array.isArray(data.extra)?data.extra:[];
 var next=Object.assign({},data,{
  question:effective,depth:plan.mode==='deep'?'detailed':'standard',
  extra:extra.concat([{domain:'documents',label:'I-04 · kutatási fókusz',
   value:plan.mode==='deep'?'Mély, időrendi és forrásalapú elemzés; bizonyítékok és hiányok külön.':
    'Személyre szabott, releváns forrású válasz, konkrét tényekkel.'}])
 });
 return {payload:next,plan:plan,modelPromptAdded:guide.length,questionOriginal:q};
}
window.HH_DEEP_RESEARCH_V393={decide:decide,apply:apply,instruction:instruction,version:'393'};
})();