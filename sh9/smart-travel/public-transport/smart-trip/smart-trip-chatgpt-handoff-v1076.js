/* SH9 Smart Trip AI v1076: one user search -> ChatGPT (zero OpenAI API calls).
 * Sends only the selected trip, timestamp, and when the user explicitly chose
 * a matching favorite, its coordinates. Never sends family GPS or health data.
 * ChatGPT website URL parameters are not a stable API; prompt may require Send.
 * This is an outbound handoff, NOT SH9-native AI or reply synchronization.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_SMART_TRIP_CHATGPT_V1076=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const LIMIT=1600;
 const PRIORITY={
  balanced:'Léna ajánlása: kevés várakozás és gyaloglás, kevés átszállás, jó csatlakozási biztonság',
  wait:'Elsődleges szempont a lehető legkevesebb várakozás; másodlagosan kevés átszállás és gyaloglás, biztonságos csatlakozásokkal',
  transfers:'Elsődleges szempont a lehető legkevesebb átszállás; másodlagosan rövid gyaloglás és várakozás, biztonságos csatlakozásokkal',
  walk:'Elsődleges szempont a lehető legkevesebb gyaloglás; másodlagosan kevés átszállás és várakozás, biztonságos csatlakozásokkal',
  duration:'Legrövidebb teljes menetidő',
  departure:'A legkorábbi megfelelő indulás'
 };
 const safe=s=>String(s||'').trim().replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').slice(0,120);
 // v1111: static location preference is stored in SH9 context, not
 // assumed to be recalled from ChatGPT memory in a fresh external chat.
 const MOM_ALIAS='Mónika · Anyuka';
 function specificPreference(q,points){
  const selected=[['from','origin'],['to','destination']].some(([key,side])=>
   safe(q?.[key])===MOM_ALIAS&&safe(points?.[side]?.name)===MOM_ALIAS&&
   Boolean(point(q[key],points[side])));
  return selected?'Helyi preferencia: Anyuka otthona kb. 50 m a kazincbarcikai Volán-állomástól. Ellenőrizd először a megfelelő közvetlen Volán-járatot; csak igazolt menetrend esetén ajánld.':'';
 }

 function point(q,p){
  if(!p||safe(p.name)!==safe(q)||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||
    p.lat<45||p.lat>49||p.lng<16||p.lng>23)return '';
  // Share only the explicitly selected favorite coordinates, not household GPS.
  return ' (kijelölt hely koordinátája: '+p.lat.toFixed(5)+', '+p.lng.toFixed(5)+')';
 }
 function valid(q){
  if(!q||!['now','depart','arrive'].includes(q.mode)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(q.time||'')||
   !/^\d{4}-\d{2}-\d{2}$/.test(q.date||''))return false;
  const d=new Date(q.date+'T12:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===q.date&&
   safe(q.from).length>=2&&safe(q.to).length>=2&&
   safe(q.from).toLocaleLowerCase('hu-HU')!==safe(q.to).toLocaleLowerCase('hu-HU');
 }
 function prompt(q,points,priority){
  if(!valid(q))return null;
  const departure=safe(q.from)+point(q.from,points?.origin);
  const destination=safe(q.to)+point(q.to,points?.destination);
  const timing=q.mode==='arrive'?'Legkésőbb érkezés: ':q.mode==='depart'?'Indulás időpontja: ':'Indulás most, referenciaidő: ';
  const requested=PRIORITY[priority]||PRIORITY.balanced;
  // GPT already understands routing. Supply only the user's context and
  // safety-critical verification criteria; avoid overconstraining research.
  const body=[
   'Léna, tervezz egy jó, ajtótól ajtóig tartó tömegközlekedési utat.',
   'Honnan: '+departure,
   'Hová: '+destination,
   timing+q.date+' '+q.time+' (Budapest)',
   'Fontos: '+requested,
   specificPreference(q,points),
   'Adj pontosan egy legjobb útvonalat konkrét járatokkal, átszállásokkal és gyaloglással. Alternatív útvonalakat ne keress és ne adj meg.',
   'Ellenőrizd az adott nap menetrendjét és az útvonalat érintő ünnepi vagy forgalmi eltéréseket. A bizonytalan időpontokat jelöld becsültnek, adj forráslinket.',
   'Az útiterv UTÁN automatikusan készíts letölthető SH9_TripPack.json-t (schema: sh9.trip-pack/1); ha nem tudsz fájlt adni, egyetlen tiszta JSON-kódblokkot. Mezők: title,travelDate,from,to,departure,arrival,arrivalStatus,summary,segments[{mode,line,from,to,departure,arrival,status,note}],alerts[{title,text}],alternatives:[],sources[{name,url}]. A mode walk/bus/tram/metro/train/hev/other; a status timetable/estimated/unknown. MINDEN departure/arrival HH:mm (pl. 15:18) vagy null; az ismeretlen idő null, ISO-időpont tilos. A séma kulcsa kötelező. Csak megalapozott adatot használj.'
  ].filter(Boolean).join('\n');
  return body.length<=LIMIT?body:null;
 }
 function url(q,points,priority){
  const message=prompt(q,points,priority);
  if(!message)return null;
  const u=new URL('https://chatgpt.com/');
  u.searchParams.set('q',message);
  return u.toString();
 }
 function go(q,points,priority,location){
  const target=url(q,points,priority);
  if(!target||typeof location?.assign!=='function')return false;
  try{location.assign(target);return true}catch(_){return false}
 }
 return Object.freeze({valid,prompt,url,go});
});