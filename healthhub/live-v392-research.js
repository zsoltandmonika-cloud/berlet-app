(function(){
'use strict';
/* Ask Lena Adaptive Research v392.
 * General clinical and wellness research strategy, not a fixed patient story.
 * No network calls, state, private data capture or client-side diagnosis.
 * Existing authenticated/consented server requests remain the only AI path.
 */
function str(x,n){return String(x==null?'':x).replace(/\s+/g,' ').trim().slice(0,n||350)}
function norm(s){return str(s,3000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function choose(question,context){
 var q=norm(question),dateMatch=q.match(/\b(?:19|20)\d{2}\b/g)||[];
 var themes=[];
 function find(re,code){if(re.test(q))themes.push(code)}
 find(/sziv|kardi|ritmus|kamrafibr|szivmegall|cpr|ujraeleszt|crt|defibr|pacemaker|vf\b|szivizom/,'cardiac');
 find(/kom[aá]|eszmelet|szedal|intenziv|lelegezt|eleszt|hipoxi|agyk|emlekez|amnezi|kognitiv|tudat|neurolog/,'neurologic');
 find(/lelet|zarojelent|korhaz|ambul|omsz|mento|kezeles|beavatkozas|mutet|diagn|ellatas|torten|esemeny|idosor|kronolog/,'history');
 find(/gyogysz|adag|mellekhat|tabletta|interak|terapia/,'medication');
 find(/alvas|pulzus|vernyomas|suly|lepes|mozgas|aktivitas|kaloria|trend|szakasz/,'measurements');
 var why=/miert|hogyan|mi tort|mechaniz|okok|milyen folyamat|kovetkezmeny|pontosan|reszletes|mely|mennyi id|hany perc/.test(q);
 var clinical=themes.some(function(t){return ['cardiac','neurologic','history','medication'].includes(t)});
 var timeline=themes.includes('history')||(/(?:\b202[0-9]\b|idosor|kronolog|kezdetetol|elso nap|eltelt|hany perc)/.test(q)&&why);
 var extensive=timeline||(/mindent|osszes|teljes|reszletes|osszevet|ertekel|elemez|kutass|magyarazd|milyen ok/.test(q))||
  (clinical&&(q.length>95||why||dateMatch.length>0));
 var mode=extensive?'deep':'focused';
 var evidenceNeeded=clinical||timeline;
 return {mode:mode,clinical:clinical,timeline:timeline,evidenceNeeded:evidenceNeeded,
  themes:themes,years:Array.from(new Set(dateMatch)).slice(0,4),
  question:str(question,1600),guide:guide(mode,clinical,timeline),
  minDocSections:timeline?4:clinical?2:0};
}
function guide(mode,clinical,timeline){
 var base='Válaszolj az adott személy ténylegesen rendelkezésre álló adataiból. Válaszd szét: [FORRÁSSAL IGAZOLT TÉNY], [ÉLETTANI/ÁLTALÁNOS MAGYARÁZAT], [LEHETSÉGES ÉRTELMEZÉS], [NEM IGAZOLHATÓ ADAT]. Ne találj ki orvost, dátumot, mentő-kiérkezési vagy újraélesztési percet. Hivatkozz a dokumentum címére, dátumára, PDF-oldalára csak ha tényleges kivonat támasztja alá. A hiányzó PDF miatt a teljesség nem bizonyított.';
 if(mode==='focused')return base+' Röviden, de személyre szabottan, a kérdéshez szükséges mélységgel válaszolj.';
 var deep=' Ne csak felsorolj: magyarázd el az ok-okozati mechanizmust érthetően, lépésről lépésre, és kösd vissza a személyes leletekhez. A kérdés releváns részeinél fejtsd ki a bizonyítékokat, alternatívákat és bizonytalanságot. Mutasd be a célzott további vizsgálatok és biztonságos rehabilitáció lehetőségeit, ahol releváns.';
 var history=timeline?' Készíts időrendi táblázatot igazolt dátumokkal, személyes eseményenként; különítsd el az ismert és ismeretlen perceket, a mentési eseményeket, intenzív ellátást, gyógyszeres szedálást és ébredést csak akkor, ha ezek a forrásban ténylegesen megtalálhatók. A nem látott OMSZ/ICU dokumentumot hiányzó bizonyítékként nevezd meg.':'';
 return base+deep+history;
}
function compose(question,context,clinicalReport,options){
 var plan=choose(question,context),quality=clinicalReport&&clinicalReport.quality||{};
 var originals=Number(quality.originals)||0, summaries=Number(quality.summaries)||0;
 var warnings=clinicalReport&&clinicalReport.warnings||[];
 var docs=(clinicalReport&&clinicalReport.manifest||[]).slice(0,6).map(function(m){
  return '['+m.id+'] '+str(m.title,75)+(m.date?' · '+m.date:' · klinikai dátum nincs')+
   (m.page?' p.'+m.page:'')+' · '+(m.type==='json_summary'?'másodlagos magyarázat':'eredeti kivonat');
 });
 var missing=plan.evidenceNeeded&&originals===0;
 var guideText=plan.guide;
 // Endpoint contract may bound question length; use compact, explicit
 // high priority instruction, while preserving the entire user question.
 var suffix='\n\n[SZEMÉLYRE SZABOTT KUTATÁSI ELVÁRÁS] '+guideText;
 var q=plan.question;
 if(q.length+suffix.length<=2500)q+=suffix;
 var brief=[
  {domain:'documents',label:'Kutatási terv v392 · módszer',
   value:(plan.mode==='deep'?'RÉSZLETES':'FÓKUSZÁLT')+'; '+(plan.themes.join(', ')||'általános')+
    '; az állítások igazoltsága elkülönítendő; nem elegendő a generikus betegoktatás.'},
  {domain:'documents',label:'Kutatási terv v392 · forrásfedezet',
   value:originals+' eredeti PDF-oldalkivonat, '+summaries+' korábbi magyarázat. '+
   (missing?'FIGYELEM: eredeti lelet NEM volt elérhető; személyre szabott eseményrekonstrukció hiányos!':
    'Leletdátum és oldalszám csak ellenőrzött kivonathoz köthető.')},
  {domain:'documents',label:'Kutatási terv v392 · kötelező hiánylista',
   value:'A kérdéshez szükséges, de hiányzó pontos eseményidőt, forrásdokumentumot és vizsgálati eredményt külön sorold fel; bizonyíték híján ne becsüld meg.'}
 ];
 if(plan.mode==='deep')brief.push({domain:'documents',label:'Kutatási terv v392 · elemzési mélység',
  value:plan.guide.slice(0,235)});
 return {plan:plan,question:q,brief:brief,
  coverage:{originals:originals,summaries:summaries,missingOriginalEvidence:missing,
   namedSources:docs,knownWarnings:warnings.slice(0,4)}};
}
window.HH_ADAPTIVE_RESEARCH_V392={choose:choose,compose:compose,version:'392'};
})();
