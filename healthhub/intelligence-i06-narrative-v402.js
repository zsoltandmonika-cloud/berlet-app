(function(){
'use strict';
/* I-06 v402 Narrative Intelligence: a bounded instruction, not a rewrite
 * of personal facts or history. The user's original question is preserved
 * in the visible input/history. No UI changes or data persistence. */
function bounded(x,max){return String(x==null?'':x).replace(/\s+/g,' ').trim().slice(0,max)}
function guide(plan,clinical){
 var p=plan||{},details=p.mode==='deep',history=!!p.chronology;
 var text='A válasz legyen magyarul, természetes, részletes és emberséges. Elsőként a felhasználó tényleges kérdésére válaszolj, ne technikai státuszokkal kezdj. ';
 if(history)text+='A bizonyított személyes eseményeket időrendben, folyamatos történetként meséld el; a lelet keltezése nem bizonyított eseményidőpont. ';
 else text+='A lényeg rögtön derüljön ki, majd közérthető magyarázat következzen. ';
 if(details)text+='Érdemi részletességet adj, ne tömör vázlatot. ';
 text+='A személyes adatot és az általános orvosi magyarázatot különböztesd meg; következtetés ne hangozzon igazolt tényként. ';
 if(clinical&&clinical.quality&&clinical.quality.originals>0)text+='Csak létező PDF-oldalhoz rendelj konkrét személyes klinikai állítást. ';
 text+='Ne találj ki orvosnevet, percet, gyógyszerdózist, okot vagy leletet. Kerüld az egymondatos csempéket, a sablonos státuszfejezeteket és a hosszú hiánylistát.';
 return bounded(text,790);
}
function apply(request,question,plan,clinical){
 if(!request||request.consent!==true||!['zsolt','monika'].includes(request.profile))
  throw Error('I-06: nincs profilhoz kötött hozzájárulás.');
 if(typeof question!=='string'||question.trim().length<3)throw Error('I-06: hiányzó kérdés.');
 var prefix=String(request.question||question).slice(0,2060);
 var ins='\n\n[I-06 · Válaszstílus] '+guide(plan,clinical);
 var remaining=2400-prefix.length;
 if(remaining<110){
  // Never truncate the user's own question to make room for styling.
  return {payload:request,applied:false,reason:'question_length'};
 }
 var full=prefix+ins.slice(0,remaining);
 return {payload:Object.assign({},request,{question:full}),applied:true,characters:full.length};
}
window.HH_NARRATIVE_INTELLIGENCE_I06_V402={guide:guide,apply:apply,version:'402'};
})();
