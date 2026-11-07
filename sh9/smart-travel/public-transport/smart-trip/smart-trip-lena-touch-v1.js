/* SHO Smart Trip · Léna Touch v1.
 * Read-only, deterministic human-friendly presentation of FIRST-PARTY/LICENSED
 * verified timetable results. No Google Maps Content, LLM, network or storage.
 * Provider checks are mandatory; unknown and Google routes fail closed.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_SMART_TRIP_LENA_TOUCH_V1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const choices=Object.freeze({
  balanced:'a kényelmes, ésszerű utazás',
  wait:'a rövid várakozás',
  walk:'a kevés gyaloglás',
  transfers:'a kevés átszállás'
 });
 const time=value=>{
  const millis=typeof value==='number'?value:Date.parse(value||'');
  return Number.isFinite(millis)?new Intl.DateTimeFormat('hu-HU',{
   timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).format(new Date(millis)):'';
 };
 const profileName=p=>p==='m'?'Mónika':'Zsolt';
 const count=n=>n===0?'átszállás nélkül':n===1?'egy átszállással':n+' átszállással';
 const risk=mins=>Number.isFinite(mins)&&mins<8;
 const label=(priority)=>Object.prototype.hasOwnProperty.call(choices,priority)?
  choices[priority]:choices.balanced;
 function explainJourney(j,source,opts={}){
  // A `verified-multimodal` route could later be Google-derived; NEVER use it.
  if(source?.kind!=='local-private-gtfs'||source?.verified!==true||
     source?.coverage!=='station-to-station'||source?.live!==false||
     !j||!Array.isArray(j.segments)||!j.segments.length||
     !Number.isInteger(j.transfers)||j.transfers<0||
     !Number.isFinite(j.startMs)||!Number.isFinite(j.endMs)||
     j.endMs<=j.startMs||!Number.isFinite(j.durationMinutes)||
     j.durationMinutes<=0)return null;
  const depart=time(j.startMs),arrive=time(j.endMs);
  if(!depart||!arrive)return null;
  const who=profileName(opts.profile),isFirst=opts.index===0;
  const lines=[
   who+', ezt az ellenőrzött menetrendi lehetőséget mutatom '+
    (isFirst?'A tervként: ':'alternatívaként: ')+depart+'–'+arrive+
    ', '+Math.round(j.durationMinutes)+' perc, '+count(j.transfers)+'.',
   'Az általad megadott fő szempont: '+label(opts.priority)+
    '. Az ajánlás a jelenleg elérhető, ellenőrzött útvonalak körére vonatkozik.'
  ];
  if(risk(j.interchangeWait)&&j.transfers>0)
   lines.push('Figyelem: az összes menetrendi várakozás csak '+
    Math.max(0,Math.round(j.interchangeWait))+' perc. A csatlakozás biztonságát és az élő késéseket külön ellenőrizni kell.');
  else if(j.transfers>0)
   lines.push('Átszállásnál számolj tartalékidővel: a menetrend nem garantálja a csatlakozást.');
  if(j.walkingMeters!==null&&Number.isFinite(j.walkingMeters))
   lines.push('Az igazolt gyalogos szakaszok összesen '+Math.round(j.walkingMeters)+' métert tesznek ki.');
  lines.push('Fontos: ez állomástól állomásig ellenőrzött út, nem teljes ajtótól ajtóig terv és nem élő késésinformáció.');
  return {title:isFirst?'✨ Léna ajánlása · A terv':'✨ Léna megjegyzése',
   lines,provenance:'Ellenőrzött saját menetrend · nem élő'};
 }
 function explainBkk(item,feed,opts={}){
  if(feed?.status!=='ok'||feed?.source!=='BKK Zrt., CC BY 4.0'||
     feed?.coverage!=='stop-to-stop'||feed?.live!==false||
     !Array.isArray(feed.results)||!feed.results.includes(item)||
     !item||typeof item!=='object')return null;
  const legs=Array.isArray(item.legs)?item.legs:[item];
  if(!legs.length||legs.length>2||legs.some(l=>!l||typeof l.line!=='string'||
    !l.line.trim()||!time(l.departure)||!time(l.arrival)))return null;
  const transfers=legs.length-1,depart=time(item.departure),arrive=time(item.arrival);
  if(!depart||!arrive)return null;
  const who=profileName(opts.profile),isFirst=opts.index===0;
  const connections=legs.map(l=>l.line.slice(0,28)).join(' → ');
  const lines=[
   who+', ez a BKK-menetrendben szereplő '+connections+' járatkapcsolat '+
     depart+'–'+arrive+' között közlekedik, '+count(transfers)+'.',
   'A választott szempontod: '+label(opts.priority)+
     '. Ez csak a jelenleg ellenőrzött BKK-próbajáratok közül ajánlás.'
  ];
  if(transfers>0){
   const wait=Number(item.transfer?.waitMinutes);
   if(Number.isFinite(wait)&&wait>=0)
    lines.push((risk(wait)?'Szoros lehet a csatlakozás: ':'Menetrendi átszállási idő: ')+
      Math.round(wait)+' perc. A gyalogos út és a késés nincs ellenőrizve.');
   else lines.push('Az átszállási tartalék és a gyalogos út nincs ellenőrizve.');
  }
  lines.push('Megállótól megállóig tervezett, nem élő menetrendi adat; a teljes ajtótól ajtóig út nem igazolt.');
  return {title:isFirst?'✨ Léna ajánlása · A terv':'✨ Léna megjegyzése',
   lines,provenance:'BKK Zrt. · CC BY 4.0 · nem élő'};
 }
 return Object.freeze({explainJourney,explainBkk});
});
